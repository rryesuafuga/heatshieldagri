/**
 * HeatShield Agri — Browser-side ML Inference
 * Runs Random Forest ONNX models in the browser via onnxruntime-web.
 * Predicts temperature, humidity, wind speed → computes WBGT.
 *
 * IMPORTANT: onnxruntime-web is loaded DYNAMICALLY inside loadModels()
 * so that a WASM initialization failure cannot crash the page at import time.
 * If WASM fails, the error is caught and surfaced to the UI — the rest of
 * the application continues to work.
 *
 * Usage:
 *   import { HeatShieldML } from './ml-inference';
 *   const ml = new HeatShieldML();
 *   await ml.loadModels();
 *   const forecast = await ml.predictMultiStep(temps, hums, winds, 24);
 */

// onnxruntime-web is NOT imported at the top level.
// It is loaded dynamically in loadModels() to prevent module-level crashes.

// ---- Types ----

export interface WBGTForecast {
  temperature: number;
  humidity: number;
  windSpeed: number;
  wbgt: number;
  riskLevel: 'Low' | 'Moderate' | 'High' | 'Very High' | 'Extreme';
  workCapacityPercent: number;
  recommendation: string;
  timestamp: Date;
}

// Runtime references populated after dynamic import
interface OrtRuntime {
  InferenceSession: typeof import('onnxruntime-web').InferenceSession;
  Tensor: typeof import('onnxruntime-web').Tensor;
  env: typeof import('onnxruntime-web').env;
}

// ---- Constants (must match Python training pipeline) ----

const REQUIRED_HISTORY = 73; // max lag (72) + 1

const WBGT_THRESHOLDS = {
  low: 26.0, moderate: 28.0, high: 30.0, veryHigh: 32.0,
};

// ---- WBGT Calculation (ISO 7243) ----

function calculateWBGT(tempC: number, humPct: number): number {
  const T = tempC, RH = humPct;
  // Stull (2011) psychrometric wet-bulb approximation
  const Tnwb =
    T * Math.atan(0.151977 * Math.sqrt(RH + 8.313659)) +
    Math.atan(T + RH) - Math.atan(RH - 1.676331) +
    0.00391838 * Math.pow(RH, 1.5) * Math.atan(0.023101 * RH) - 4.686035;
  const Tg = T + 2.0;  // simplified globe temp
  return Math.round((0.7 * Tnwb + 0.2 * Tg + 0.1 * T) * 10) / 10;
}

function getRiskLevel(wbgt: number): WBGTForecast['riskLevel'] {
  if (wbgt < WBGT_THRESHOLDS.low) return 'Low';
  if (wbgt < WBGT_THRESHOLDS.moderate) return 'Moderate';
  if (wbgt < WBGT_THRESHOLDS.high) return 'High';
  if (wbgt < WBGT_THRESHOLDS.veryHigh) return 'Very High';
  return 'Extreme';
}

function getRecommendation(r: WBGTForecast['riskLevel']): string {
  const recs: Record<string, string> = {
    Low:         'Safe for all outdoor work. Stay hydrated.',
    Moderate:    'Limit heavy physical work. Take 15-min breaks each hour.',
    High:        'Reduce work intensity. 30-min rest per hour. Avoid peak sun.',
    'Very High': 'Only light work permitted. 45-min rest per hour minimum.',
    Extreme:     'STOP outdoor work. Dangerously high heat stress risk.',
  };
  return recs[r];
}

function workCapacityPercent(wbgt: number): number {
  if (wbgt <= 18) return 100;
  if (wbgt >= 40) return 22;
  return Math.round(100 - (wbgt - 18) * (78 / 22));
}

// ---- Feature Engineering (must match Python exactly) ----
// 17 features in this exact order:
//   lag_1..lag_72, hour_sin, hour_cos, doy_sin, doy_cos,
//   rolling_mean_24h, rolling_mean_72h, rolling_std_24h,
//   delta_1h, delta_24h

function createFeatureVector(
  history: number[], currentHour: number, dayOfYear: number,
): Float32Array {
  const n = history.length;
  const f = new Float32Array(17);

  f[0]=history[n-1]; f[1]=history[n-2]; f[2]=history[n-3];
  f[3]=history[n-6]; f[4]=history[n-12]; f[5]=history[n-24];
  f[6]=history[n-48]; f[7]=history[n-72];

  f[8] =Math.sin(2*Math.PI*currentHour/24);
  f[9] =Math.cos(2*Math.PI*currentHour/24);
  f[10]=Math.sin(2*Math.PI*dayOfYear/365.25);
  f[11]=Math.cos(2*Math.PI*dayOfYear/365.25);

  const last24=history.slice(n-24), last72=history.slice(n-72);
  const mean24=last24.reduce((a,b)=>a+b,0)/24;
  f[12]=mean24;
  f[13]=last72.reduce((a,b)=>a+b,0)/72;
  f[14]=Math.sqrt(last24.reduce((s,v)=>s+(v-mean24)**2,0)/24);
  f[15]=history[n-1]-history[n-2];
  f[16]=history[n-1]-history[n-24];

  return f;
}

// ---- Main Class ----

export class HeatShieldML {
  private sessions: Record<string, import('onnxruntime-web').InferenceSession> = {};
  private _isLoaded = false;
  private _ort: OrtRuntime | null = null;
  private _loadPromise: Promise<void> | null = null;
  // GLOBAL lock chain — onnxruntime-web uses a global flag (f.$c) that
  // prevents ANY two session.run() calls from overlapping, even on
  // different sessions. We must serialize ALL inference calls.
  private _runLock: Promise<unknown> = Promise.resolve();

  constructor(private modelBasePath = '/models') {}

  get isLoaded() { return this._isLoaded; }

  async loadModels(
    onProgress?: (loaded: number, total: number, name: string) => void,
  ): Promise<void> {
    // If already loaded, nothing to do
    if (this._isLoaded) {
      onProgress?.(3, 3, 'done');
      return;
    }
    // If a load is already in flight, return the existing promise
    // to prevent the ONNX WASM backend from being initialized twice
    // (which causes "Session already started").
    if (this._loadPromise) return this._loadPromise;

    this._loadPromise = this._doLoad(onProgress);
    return this._loadPromise;
  }

  private async _doLoad(
    onProgress?: (loaded: number, total: number, name: string) => void,
  ): Promise<void> {
    // Dynamically import onnxruntime-web so a WASM init failure
    // cannot crash the page at module-load time.
    const ort = await import('onnxruntime-web');
    this._ort = ort;

    // Configure WASM runtime
    ort.env.wasm.numThreads = 1;

    const names = ['temperature', 'humidity', 'windspeed'];
    for (let i = 0; i < names.length; i++) {
      onProgress?.(i, names.length, names[i]);
      this.sessions[names[i]] = await ort.InferenceSession.create(
        `${this.modelBasePath}/${names[i]}_model.onnx`,
        { executionProviders: ['wasm'] },
      );
    }
    onProgress?.(names.length, names.length, 'done');
    this._isLoaded = true;
  }

  private async predict1(name: string, features: Float32Array): Promise<number> {
    // Serialize ALL session.run() calls globally — onnxruntime-web's
    // WASM backend uses a global flag that forbids concurrent runs
    // even across different sessions ("Session already started").
    const current = this._runLock.then(async () => {
      const ort = this._ort!;
      const s = this.sessions[name];
      const t = new ort.Tensor('float32', features, [1, features.length]);
      const r = await s.run({ [s.inputNames[0]]: t });
      return Number(r[s.outputNames[0]].data[0]);
    });
    // Advance the lock (swallow rejections so the chain doesn't break)
    this._runLock = current.catch(() => {});
    return current;
  }

  async predictWBGT(
    temps: number[], hums: number[], winds: number[],
    hour: number, doy: number,
  ): Promise<WBGTForecast> {
    if (!this._isLoaded) throw new Error('Call loadModels() first');
    const [t, h, w] = await Promise.all([
      this.predict1('temperature', createFeatureVector(temps, hour, doy)),
      this.predict1('humidity',    createFeatureVector(hums, hour, doy)),
      this.predict1('windspeed',   createFeatureVector(winds, hour, doy)),
    ]);
    const ct=Math.max(-10,Math.min(50,t));
    const ch=Math.max(0,Math.min(100,h));
    const cw=Math.max(0,Math.min(30,w));
    const wbgt = calculateWBGT(ct, ch);
    const risk = getRiskLevel(wbgt);
    return {
      temperature: Math.round(ct*10)/10,
      humidity: Math.round(ch*10)/10,
      windSpeed: Math.round(cw*10)/10,
      wbgt, riskLevel: risk,
      workCapacityPercent: workCapacityPercent(wbgt),
      recommendation: getRecommendation(risk),
      timestamp: new Date(),
    };
  }

  async predictMultiStep(
    temps: number[], hums: number[], winds: number[],
    steps = 24, startTime = new Date(),
  ): Promise<WBGTForecast[]> {
    if (!this._isLoaded) throw new Error('Call loadModels() first');
    const ts=[...temps], hs=[...hums], ws=[...winds];
    const forecasts: WBGTForecast[] = [];
    for (let s = 0; s < Math.min(steps, 72); s++) {
      const ft = new Date(startTime.getTime() + (s+1)*3600000);
      const hr = ft.getHours();
      const dy = Math.floor(
        (ft.getTime()-new Date(ft.getFullYear(),0,0).getTime())/86400000
      );
      const fc = await this.predictWBGT(
        ts.slice(-REQUIRED_HISTORY), hs.slice(-REQUIRED_HISTORY),
        ws.slice(-REQUIRED_HISTORY), hr, dy,
      );
      fc.timestamp = ft;
      forecasts.push(fc);
      ts.push(fc.temperature); hs.push(fc.humidity); ws.push(fc.windSpeed);
    }
    return forecasts;
  }

  async dispose() {
    for (const s of Object.values(this.sessions)) await s.release();
    this._isLoaded = false;
  }
}
