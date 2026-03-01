/**
 * ML Inference Engine for HeatShield Agri
 *
 * Runs Random Forest ONNX models in the browser via onnxruntime-web (WASM).
 * Predicts temperature, humidity, and wind speed using 17 engineered features,
 * then calculates WBGT via ISO 7243.
 *
 * Features (17):
 *   0-2:   temp_lag1, temp_lag2, temp_lag3
 *   3-5:   humid_lag1, humid_lag2, humid_lag3
 *   6-7:   wind_lag1, wind_lag2
 *   8-11:  hour_sin, hour_cos, month_sin, month_cos
 *   12-14: temp_rolling_mean_6h, humid_rolling_mean_6h, wind_rolling_mean_6h
 *   15-16: temp_delta_1h, humid_delta_1h
 */

import * as ort from 'onnxruntime-web';

// ---------- types ----------

export interface MLPrediction {
  hour: number;
  temperature: number;
  humidity: number;
  windSpeed: number;
  wbgt: number;
  riskLevel: string;
  riskColor: string;
  workCapacity: number;
}

export interface MLModelStatus {
  loaded: boolean;
  loading: boolean;
  error: string | null;
  loadTimeMs: number | null;
}

// ---------- constants ----------

const MODEL_BASE_PATH = '/models';

const WBGT_THRESHOLDS = [
  { max: 26, level: 'Low', color: '#22c55e', capacity: 100 },
  { max: 28, level: 'Moderate', color: '#eab308', capacity: 85 },
  { max: 30, level: 'High', color: '#f97316', capacity: 60 },
  { max: 32, level: 'Very High', color: '#ef4444', capacity: 40 },
  { max: Infinity, level: 'Extreme', color: '#7c2d12', capacity: 0 },
] as const;

// ---------- singleton model sessions ----------

let tempSession: ort.InferenceSession | null = null;
let humidSession: ort.InferenceSession | null = null;
let windSession: ort.InferenceSession | null = null;
let modelsLoaded = false;
let loadError: string | null = null;
let loadPromise: Promise<void> | null = null;

/**
 * Load all three ONNX models into memory. Idempotent — subsequent calls are
 * no-ops unless there was an error, in which case it retries.
 * Safe against concurrent calls (returns the same promise).
 */
export function loadModels(): Promise<void> {
  if (modelsLoaded) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    // Configure ONNX Runtime
    ort.env.wasm.numThreads = 1;

    const urls = {
      temp: `${MODEL_BASE_PATH}/temperature_model.onnx`,
      humid: `${MODEL_BASE_PATH}/humidity_model.onnx`,
      wind: `${MODEL_BASE_PATH}/windspeed_model.onnx`,
    };

    try {
      [tempSession, humidSession, windSession] = await Promise.all([
        ort.InferenceSession.create(urls.temp, { executionProviders: ['wasm'] }),
        ort.InferenceSession.create(urls.humid, { executionProviders: ['wasm'] }),
        ort.InferenceSession.create(urls.wind, { executionProviders: ['wasm'] }),
      ]);
      modelsLoaded = true;
      loadError = null;
    } catch (err) {
      loadError = err instanceof Error ? err.message : 'Failed to load ML models';
      loadPromise = null; // Allow retry on next call
      throw err;
    }
  })();

  return loadPromise;
}

// ---------- feature engineering ----------

interface WeatherRow {
  temperature: number;
  humidity: number;
  windSpeed: number;
  hour: number;
  dayOfYear: number;
}

/**
 * Build the 17-feature vector the models expect.
 *
 * Requires at least 6 consecutive hours of history (`history[0]` = oldest).
 * The prediction target is the *next* hour after `history[history.length - 1]`.
 */
function buildFeatures(history: WeatherRow[]): Float32Array {
  const n = history.length;
  const cur = history[n - 1];
  const prev = history[n - 2];
  const prev2 = history[n - 3];

  // Rolling 6-hour means
  const slice = history.slice(Math.max(0, n - 6), n);
  const tempMean6 = slice.reduce((s, r) => s + r.temperature, 0) / slice.length;
  const humidMean6 = slice.reduce((s, r) => s + r.humidity, 0) / slice.length;
  const windMean6 = slice.reduce((s, r) => s + r.windSpeed, 0) / slice.length;

  // Cyclical time encodings for the *target* hour
  const nextHour = (cur.hour + 1) % 24;
  const nextDoy = cur.dayOfYear + (cur.hour === 23 ? 1 : 0);

  const features = new Float32Array(17);
  features[0] = cur.temperature;               // temp_lag1
  features[1] = prev.temperature;              // temp_lag2
  features[2] = prev2.temperature;             // temp_lag3
  features[3] = cur.humidity;                   // humid_lag1
  features[4] = prev.humidity;                  // humid_lag2
  features[5] = prev2.humidity;                 // humid_lag3
  features[6] = cur.windSpeed;                  // wind_lag1
  features[7] = prev.windSpeed;                 // wind_lag2
  features[8] = Math.sin((2 * Math.PI * nextHour) / 24);   // hour_sin
  features[9] = Math.cos((2 * Math.PI * nextHour) / 24);   // hour_cos
  features[10] = Math.sin((2 * Math.PI * nextDoy) / 365);  // seasonal_sin (day-of-year cycle)
  features[11] = Math.cos((2 * Math.PI * nextDoy) / 365);  // seasonal_cos (day-of-year cycle)
  features[12] = tempMean6;                     // temp_rolling_mean_6h
  features[13] = humidMean6;                    // humid_rolling_mean_6h
  features[14] = windMean6;                     // wind_rolling_mean_6h
  features[15] = cur.temperature - prev.temperature;  // temp_delta_1h
  features[16] = cur.humidity - prev.humidity;        // humid_delta_1h

  return features;
}

// ---------- inference ----------

async function runModel(
  session: ort.InferenceSession,
  features: Float32Array,
): Promise<number> {
  const inputName = session.inputNames[0];
  const tensor = new ort.Tensor('float32', features, [1, 17]);
  const results = await session.run({ [inputName]: tensor });
  const outputName = session.outputNames[0];
  const output = results[outputName];
  // skl2onnx may emit Float64Array; use Number() for safety
  return Number(output.data[0]);
}

// ---------- WBGT (ISO 7243 simplified outdoor) ----------

function calculateWbgtSimple(temp: number, humidity: number, windSpeed: number): number {
  // Wet-bulb temperature approximation (Stull 2011)
  const tw =
    temp * Math.atan(0.151977 * Math.sqrt(humidity + 8.313659)) +
    Math.atan(temp + humidity) -
    Math.atan(humidity - 1.676331) +
    0.00391838 * Math.pow(humidity, 1.5) * Math.atan(0.023101 * humidity) -
    4.686035;

  // Globe temperature approximation (assuming moderate solar radiation)
  const solarEst = 600; // Average daytime W/m² at equator
  const tg = temp + (1.5 * solarEst) / (100 + 10 * Math.sqrt(Math.max(windSpeed, 0.5)));

  // ISO 7243: WBGT = 0.7·Tnwb + 0.2·Tg + 0.1·Tdb
  return 0.7 * tw + 0.2 * tg + 0.1 * temp;
}

function classifyWbgt(wbgt: number) {
  for (const t of WBGT_THRESHOLDS) {
    if (wbgt < t.max) {
      return { level: t.level, color: t.color, capacity: t.capacity };
    }
  }
  return { level: 'Extreme', color: '#7c2d12', capacity: 0 };
}

// ---------- public API ----------

/**
 * Parse an ISO timestamp string (e.g. "2026-03-01T14:00") into hour-of-day
 * and day-of-year WITHOUT relying on the browser's local timezone.
 * Open-Meteo returns timestamps in the requested timezone (Africa/Kampala).
 */
function parseTimestamp(iso: string): { hour: number; dayOfYear: number } {
  // Format: "YYYY-MM-DDTHH:MM" — parse directly
  const hour = parseInt(iso.slice(11, 13), 10);
  const month = parseInt(iso.slice(5, 7), 10) - 1; // 0-indexed
  const day = parseInt(iso.slice(8, 10), 10);
  const year = parseInt(iso.slice(0, 4), 10);
  // Day-of-year via UTC Date to avoid DST shifts
  const jan1 = Date.UTC(year, 0, 1);
  const current = Date.UTC(year, month, day);
  const dayOfYear = Math.floor((current - jan1) / 86400000) + 1;
  return { hour, dayOfYear };
}

/**
 * Fetch recent weather history from Open-Meteo for a given location.
 * Uses `past_days` to reliably get ~4 days of historical hourly data.
 */
export async function fetchWeatherHistory(
  lat: number,
  lon: number,
): Promise<WeatherRow[]> {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    hourly: 'temperature_2m,relative_humidity_2m,wind_speed_10m',
    past_days: '4',
    forecast_days: '1',
    timezone: 'Africa/Kampala',
  });

  const resp = await fetch(
    `https://api.open-meteo.com/v1/forecast?${params}`,
  );
  if (!resp.ok) throw new Error(`Open-Meteo error: ${resp.status}`);

  const data = await resp.json();

  if (!data.hourly?.time || !data.hourly?.temperature_2m) {
    throw new Error('Invalid weather data from Open-Meteo');
  }

  const times: string[] = data.hourly.time;
  const temps: (number | null)[] = data.hourly.temperature_2m;
  const humids: (number | null)[] = data.hourly.relative_humidity_2m;
  const winds: (number | null)[] = data.hourly.wind_speed_10m;

  // Filter out rows with null values (gaps in observations)
  const rows: WeatherRow[] = [];
  for (let i = 0; i < times.length; i++) {
    if (temps[i] == null || humids[i] == null || winds[i] == null) continue;
    const { hour, dayOfYear } = parseTimestamp(times[i]);
    rows.push({
      temperature: temps[i] as number,
      humidity: humids[i] as number,
      windSpeed: (winds[i] as number) / 3.6, // km/h → m/s
      hour,
      dayOfYear,
    });
  }

  return rows;
}

/**
 * Run multi-step recursive forecasting.
 *
 * Uses the last `historyWindow` rows of `history` as seed, then predicts
 * `forecastHours` steps ahead, feeding each prediction back as input.
 */
export async function runForecast(
  history: WeatherRow[],
  forecastHours: number,
): Promise<MLPrediction[]> {
  if (!modelsLoaded || !tempSession || !humidSession || !windSession) {
    throw new Error('Models not loaded. Call loadModels() first.');
  }

  if (history.length < 6) {
    throw new Error('Need at least 6 hours of weather history.');
  }

  // Work on a copy so we can append predictions
  const buffer = [...history];
  const predictions: MLPrediction[] = [];

  for (let step = 0; step < forecastHours; step++) {
    const features = buildFeatures(buffer);

    const [predTemp, predHumid, predWind] = await Promise.all([
      runModel(tempSession, features),
      runModel(humidSession, features),
      runModel(windSession, features),
    ]);

    // Clamp to physical ranges (prevents recursive drift)
    const temp = Math.max(-5, Math.min(55, predTemp));
    const humid = Math.max(5, Math.min(100, predHumid));
    const wind = Math.max(0, Math.min(30, predWind));

    const lastRow = buffer[buffer.length - 1];
    const nextHour = (lastRow.hour + 1) % 24;
    const nextDoy = lastRow.dayOfYear + (lastRow.hour === 23 ? 1 : 0);

    const wbgt = calculateWbgtSimple(temp, humid, wind);
    const risk = classifyWbgt(wbgt);

    predictions.push({
      hour: nextHour,
      temperature: temp,
      humidity: humid,
      windSpeed: wind,
      wbgt,
      riskLevel: risk.level,
      riskColor: risk.color,
      workCapacity: risk.capacity,
    });

    // Feed prediction back into history buffer
    buffer.push({
      temperature: temp,
      humidity: humid,
      windSpeed: wind,
      hour: nextHour,
      dayOfYear: nextDoy,
    });
  }

  return predictions;
}
