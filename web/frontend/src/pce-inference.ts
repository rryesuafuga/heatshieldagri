/**
 * HeatShield Agri — PCE Inference (Zero Dependencies)
 *
 * Sparse Polynomial Chaos Expansion evaluator using orthonormal Legendre
 * polynomials. Replaces onnxruntime-web (~3 MB + ~6 MB ONNX models) with
 * pure TypeScript evaluated from ~20 KB of JSON coefficients.
 *
 * Each PCE model predicts one weather variable (temperature, humidity, or
 * wind speed) from the same 17-feature vector used by the RF ONNX models.
 * WBGT is then computed via the ISO 7243 physics formula.
 *
 * Mathematical basis:
 *   WBGT = 0.7 × Tw + 0.2 × Tg + 0.1 × Ta
 *   PCE: Y ≈ Σ cα · Πi P̂αi(ξi)  where P̂ are orthonormal Legendre polynomials
 *   LARS selects the sparse active terms from a candidate basis.
 */

// ---- Types ----

export interface PCEModelJSON {
  variable: string;
  algorithm: string;
  teacher_model: string;
  input_features: string[];
  dim: number;
  max_degree: number;
  q_norm: number;
  n_active_terms: number;
  candidate_basis_size: number;
  sparsity: number;
  norm_params: { lo: number; hi: number }[];
  coefficients: number[];
  multi_indices: number[][];
  validation_vs_full_rf: {
    r2: number;
    mae: number;
    rmse: number;
    max_error: number;
  };
  sobol_first_order: Record<string, number>;
  sobol_total_order: Record<string, number>;
}

export interface PCEForecast {
  temperature: number;
  humidity: number;
  windSpeed: number;
  wbgt: number;
  riskLevel: 'Low' | 'Moderate' | 'High' | 'Very High' | 'Extreme';
  workCapacityPercent: number;
  recommendation: string;
  timestamp: Date;
}

// ---- Constants ----

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
  const Tg = T + 2.0; // simplified globe temp
  return Math.round((0.7 * Tnwb + 0.2 * Tg + 0.1 * T) * 10) / 10;
}

function getRiskLevel(wbgt: number): PCEForecast['riskLevel'] {
  if (wbgt < WBGT_THRESHOLDS.low) return 'Low';
  if (wbgt < WBGT_THRESHOLDS.moderate) return 'Moderate';
  if (wbgt < WBGT_THRESHOLDS.high) return 'High';
  if (wbgt < WBGT_THRESHOLDS.veryHigh) return 'Very High';
  return 'Extreme';
}

function getRecommendation(r: PCEForecast['riskLevel']): string {
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

// ---- Feature Engineering (must match Python + ml-inference.ts exactly) ----
// 17 features: lag_1..lag_72, hour_sin, hour_cos, doy_sin, doy_cos,
//              rolling_mean_24h, rolling_mean_72h, rolling_std_24h,
//              delta_1h, delta_24h

function createFeatureVector(
  history: number[], currentHour: number, dayOfYear: number,
): Float64Array {
  const n = history.length;
  const f = new Float64Array(17);

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

// ---- PCE Model Class ----

class PCEModel {
  private dim: number;
  private normParams: { lo: number; hi: number }[];
  private coefficients: number[];
  private multiIndices: number[][];
  private maxDeg: number[];

  constructor(json: PCEModelJSON) {
    this.dim = json.dim;
    this.normParams = json.norm_params;
    this.coefficients = json.coefficients;
    this.multiIndices = json.multi_indices;
    // Precompute max degree needed per dimension
    this.maxDeg = new Array(this.dim).fill(0);
    for (const mi of this.multiIndices) {
      for (let i = 0; i < this.dim; i++) {
        if (mi[i] > this.maxDeg[i]) this.maxDeg[i] = mi[i];
      }
    }
  }

  /**
   * Evaluate orthonormal Legendre polynomials P̂₀(ξ)..P̂_maxK(ξ)
   * via the three-term recurrence:
   *   (k+1)·P_{k+1}(x) = (2k+1)·x·P_k(x) - k·P_{k-1}(x)
   * then normalize: P̂_k = √((2k+1)/2) · P_k
   */
  private legendreAll(xi: number, maxK: number): Float64Array {
    const P = new Float64Array(maxK + 1);
    P[0] = 1.0;
    if (maxK >= 1) P[1] = xi;
    for (let k = 1; k < maxK; k++) {
      P[k + 1] = ((2 * k + 1) * xi * P[k] - k * P[k - 1]) / (k + 1);
    }
    // Normalize to orthonormal Legendre
    for (let k = 0; k <= maxK; k++) {
      P[k] *= Math.sqrt((2 * k + 1) / 2);
    }
    return P;
  }

  /**
   * Evaluate the sparse PCE for a single input vector.
   *
   * Phase 1: Normalize each input to [-1, 1] and compute 1D basis values.
   * Phase 2: Sparse multiply-accumulate over active terms.
   *
   * Cost: O(d·p_max + K·d) ≈ O(17·5 + 77·17) ≈ O(1,400) operations.
   */
  predict(features: Float64Array | number[]): number {
    const d = this.dim;
    const basis: Float64Array[] = new Array(d);

    // Phase 1: Normalize to [-1, 1] and compute 1D Legendre values
    for (let i = 0; i < d; i++) {
      const { lo, hi } = this.normParams[i];
      const xi = Math.max(-1, Math.min(1, 2 * (features[i] - lo) / (hi - lo) - 1));
      basis[i] = this.legendreAll(xi, this.maxDeg[i]);
    }

    // Phase 2: Sparse multiply-accumulate
    let result = 0;
    for (let k = 0; k < this.coefficients.length; k++) {
      let term = this.coefficients[k];
      const mi = this.multiIndices[k];
      for (let i = 0; i < d; i++) {
        term *= basis[i][mi[i]];
      }
      result += term;
    }
    return result;
  }
}

// ---- Main HeatShieldPCE Class ----

export class HeatShieldPCE {
  private models: Record<string, PCEModel> = {};
  private metadata: Record<string, PCEModelJSON> = {};
  private _isLoaded = false;

  constructor(private modelBasePath = '/models') {}

  get isLoaded() { return this._isLoaded; }

  /** Total JSON payload size in KB (approximate) */
  get modelSizeKB(): number {
    let total = 0;
    for (const m of Object.values(this.metadata)) {
      // Rough estimate: 8 bytes per coefficient + 17 bytes per multi-index
      total += m.coefficients.length * (8 + 17);
    }
    return Math.round(total / 1024 * 10) / 10;
  }

  /** Sobol sensitivity indices for each variable */
  getSobolIndices(variable: string): {
    firstOrder: Record<string, number>;
    totalOrder: Record<string, number>;
  } | null {
    const m = this.metadata[variable];
    if (!m) return null;
    return {
      firstOrder: m.sobol_first_order,
      totalOrder: m.sobol_total_order,
    };
  }

  /** Validation metrics against the full RF teacher */
  getValidation(variable: string): PCEModelJSON['validation_vs_full_rf'] | null {
    return this.metadata[variable]?.validation_vs_full_rf ?? null;
  }

  /** Active terms / candidate basis for each variable */
  getSparsityInfo(): Record<string, { active: number; candidates: number; sparsity: number }> {
    const info: Record<string, { active: number; candidates: number; sparsity: number }> = {};
    for (const [name, m] of Object.entries(this.metadata)) {
      info[name] = {
        active: m.n_active_terms,
        candidates: m.candidate_basis_size,
        sparsity: m.sparsity,
      };
    }
    return info;
  }

  async loadModels(
    onProgress?: (loaded: number, total: number, name: string) => void,
  ): Promise<void> {
    if (this._isLoaded) return;

    const names = ['temperature', 'humidity', 'windspeed'];
    for (let i = 0; i < names.length; i++) {
      onProgress?.(i, names.length, names[i]);
      const url = `${this.modelBasePath}/${names[i]}_pce.json`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`Failed to load PCE model: ${url} (${resp.status})`);
      const json: PCEModelJSON = await resp.json();
      this.models[names[i]] = new PCEModel(json);
      this.metadata[names[i]] = json;
    }
    onProgress?.(names.length, names.length, 'done');
    this._isLoaded = true;
    console.log('[HeatShieldPCE] All 3 PCE models loaded (~20 KB total, zero WASM dependencies)');
  }

  /** Single-step prediction for one variable */
  private predict1(variable: string, features: Float64Array): number {
    return this.models[variable].predict(features);
  }

  /** Single-step WBGT prediction from 3 PCE models */
  async predictWBGT(
    temps: number[], hums: number[], winds: number[],
    hour: number, doy: number,
  ): Promise<PCEForecast> {
    if (!this._isLoaded) throw new Error('Call loadModels() first');

    const t = this.predict1('temperature', createFeatureVector(temps, hour, doy));
    const h = this.predict1('humidity', createFeatureVector(hums, hour, doy));
    const w = this.predict1('windspeed', createFeatureVector(winds, hour, doy));

    const ct = Math.max(-10, Math.min(50, t));
    const ch = Math.max(0, Math.min(100, h));
    const cw = Math.max(0, Math.min(30, w));

    const wbgt = calculateWBGT(ct, ch);
    const risk = getRiskLevel(wbgt);

    return {
      temperature: Math.round(ct * 10) / 10,
      humidity: Math.round(ch * 10) / 10,
      windSpeed: Math.round(cw * 10) / 10,
      wbgt,
      riskLevel: risk,
      workCapacityPercent: workCapacityPercent(wbgt),
      recommendation: getRecommendation(risk),
      timestamp: new Date(),
    };
  }

  /** Multi-step recursive forecast (up to 72 hours) */
  async predictMultiStep(
    temps: number[], hums: number[], winds: number[],
    steps = 24, startTime = new Date(),
  ): Promise<PCEForecast[]> {
    if (!this._isLoaded) throw new Error('Call loadModels() first');

    const ts = [...temps], hs = [...hums], ws = [...winds];
    const forecasts: PCEForecast[] = [];

    for (let s = 0; s < Math.min(steps, 72); s++) {
      const ft = new Date(startTime.getTime() + (s + 1) * 3600000);
      const hr = ft.getHours();
      const dy = Math.floor(
        (ft.getTime() - new Date(ft.getFullYear(), 0, 0).getTime()) / 86400000,
      );

      const fc = await this.predictWBGT(
        ts.slice(-REQUIRED_HISTORY), hs.slice(-REQUIRED_HISTORY),
        ws.slice(-REQUIRED_HISTORY), hr, dy,
      );
      fc.timestamp = ft;
      forecasts.push(fc);

      ts.push(fc.temperature);
      hs.push(fc.humidity);
      ws.push(fc.windSpeed);
    }
    return forecasts;
  }
}
