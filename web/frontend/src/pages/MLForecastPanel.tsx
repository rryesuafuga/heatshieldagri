/**
 * MLForecastPanel.tsx
 * ===================
 * Displays ML-enhanced WBGT forecast alongside existing physics-based forecast.
 * Place in: web/frontend/src/pages/MLForecastPanel.tsx
 *
 * This component:
 *  1. Fetches 4 days of recent hourly weather from Open-Meteo (as ML input history)
 *  2. Runs the Random Forest ONNX models in-browser
 *  3. Displays a 24-hour ML forecast with WBGT risk levels
 *  4. Shows model metadata (accuracy metrics, training info)
 *
 * Integration: Import and add to your Forecast page or Dashboard.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useHeatShieldML } from '../hooks/useHeatShieldML';
import type { WBGTForecast } from '../ml-inference';

// ---- Types ----

interface HourlyWeather {
  time: string[];
  temperature_2m: number[];
  relative_humidity_2m: number[];
  wind_speed_10m: number[];
}

interface DistrictCoords {
  lat: number;
  lon: number;
}

// District coordinates (same as your existing dashboard)
const DISTRICTS: Record<string, DistrictCoords> = {
  'Kampala':     { lat: 0.3476,  lon: 32.5825 },
  'Gulu':        { lat: 2.7747,  lon: 32.2990 },
  'Moroto':      { lat: 2.5346,  lon: 34.6713 },
  'Mbale':       { lat: 1.0750,  lon: 34.1750 },
  'Jinja':       { lat: 0.4244,  lon: 33.2041 },
  'Mbarara':     { lat: -0.6133, lon: 30.6545 },
  'Lira':        { lat: 2.2499,  lon: 32.5339 },
  'Soroti':      { lat: 1.7150,  lon: 33.6111 },
  'Arua':        { lat: 3.0200,  lon: 30.9100 },
  'Kabale':      { lat: -1.2508, lon: 29.9894 },
  'Hoima':       { lat: 1.4331,  lon: 31.3525 },
  'Fort Portal': { lat: 0.6710,  lon: 30.2750 },
};

// ---- Helper: Fetch recent weather history from Open-Meteo ----

async function fetchWeatherHistory(
  lat: number, lon: number,
): Promise<{ temps: number[]; hums: number[]; winds: number[]; timestamps: Date[] }> {
  // Need 73+ hours of history for lag features. Fetch 4 days of past data.
  // Use ONLY past_days (not start_date/end_date — combining both causes a 400).
  const url = `https://api.open-meteo.com/v1/forecast?` +
    `latitude=${lat}&longitude=${lon}` +
    `&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m` +
    `&past_days=4&forecast_days=1` +
    `&timezone=Africa/Kampala`;

  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Open-Meteo API error: ${resp.status}`);
  const data = await resp.json();

  const hourly: HourlyWeather = data.hourly;

  // Filter out any null values and align arrays
  const validIndices: number[] = [];
  for (let i = 0; i < hourly.time.length; i++) {
    if (
      hourly.temperature_2m[i] != null &&
      hourly.relative_humidity_2m[i] != null &&
      hourly.wind_speed_10m[i] != null
    ) {
      validIndices.push(i);
    }
  }

  return {
    temps: validIndices.map(i => hourly.temperature_2m[i]),
    hums: validIndices.map(i => hourly.relative_humidity_2m[i]),
    winds: validIndices.map(i => hourly.wind_speed_10m[i]),
    timestamps: validIndices.map(i => new Date(hourly.time[i])),
  };
}

// ---- Risk level colors ----

const RISK_COLORS: Record<string, string> = {
  'Low':       'bg-green-100 text-green-800 border-green-300',
  'Moderate':  'bg-yellow-100 text-yellow-800 border-yellow-300',
  'High':      'bg-orange-100 text-orange-800 border-orange-300',
  'Very High': 'bg-red-100 text-red-800 border-red-300',
  'Extreme':   'bg-red-200 text-red-900 border-red-500',
};

const RISK_BAR_COLORS: Record<string, string> = {
  'Low':       'bg-green-400',
  'Moderate':  'bg-yellow-400',
  'High':      'bg-orange-400',
  'Very High': 'bg-red-500',
  'Extreme':   'bg-red-700',
};

// ---- Component ----

interface MLForecastPanelProps {
  /** Currently selected district name */
  district?: string;
  /** Number of hours to forecast (default 24) */
  forecastHours?: number;
}

export default function MLForecastPanel({
  district = 'Kampala',
  forecastHours = 24,
}: MLForecastPanelProps) {
  const { isLoading: mlLoading, loadProgress, loadingModel, error: mlError, isReady, predictMultiStep } = useHeatShieldML();

  const [forecasts, setForecasts] = useState<WBGTForecast[]>([]);
  const [isForecasting, setIsForecasting] = useState(false);
  const [forecastError, setForecastError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  // Ref-based guard prevents concurrent forecast runs (e.g. from React
  // StrictMode double-firing the effect or rapid dependency changes).
  const isForecastingRef = useRef(false);

  const runForecast = useCallback(async () => {
    if (!isReady || isForecastingRef.current) return;
    isForecastingRef.current = true;

    const coords = DISTRICTS[district];
    if (!coords) {
      setForecastError(`Unknown district: ${district}`);
      isForecastingRef.current = false;
      return;
    }

    setIsForecasting(true);
    setForecastError(null);

    try {
      // 1. Fetch recent weather history from Open-Meteo
      const { temps, hums, winds } = await fetchWeatherHistory(coords.lat, coords.lon);

      if (temps.length < 73) {
        setForecastError(`Insufficient weather history: got ${temps.length} hours, need 73+`);
        return;
      }

      // 2. Run ML prediction
      const results = await predictMultiStep(temps, hums, winds, forecastHours);
      setForecasts(results);
      setLastUpdated(new Date());
    } catch (err: any) {
      setForecastError(err.message || 'Forecast failed');
      console.error('[MLForecast] Error:', err);
    } finally {
      isForecastingRef.current = false;
      setIsForecasting(false);
    }
  }, [isReady, district, forecastHours, predictMultiStep]);

  // Auto-run forecast when ML is ready or district changes
  useEffect(() => {
    if (isReady) {
      runForecast();
    }
  }, [isReady, district, runForecast]);

  // ---- Render: Loading state ----
  if (mlLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          🤖 ML-Enhanced Forecast
        </h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
            <span className="text-sm text-gray-600">
              Loading {loadingModel} model... {loadProgress}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${loadProgress}%` }}
            />
          </div>
          <p className="text-xs text-gray-500">
            Downloading Random Forest models (~6 MB total). First load only.
          </p>
        </div>
      </div>
    );
  }

  // ---- Render: Error state ----
  if (mlError) {
    return (
      <div className="bg-red-50 rounded-lg border border-red-200 p-6">
        <h3 className="text-lg font-semibold text-red-900 mb-2">
          ML Forecast Unavailable
        </h3>
        <p className="text-sm text-red-700">{mlError}</p>
        <p className="text-xs text-red-500 mt-2">
          The physics-based WBGT forecast above remains fully functional.
        </p>
      </div>
    );
  }

  // ---- Render: Forecast results ----
  // Find the peak WBGT and current risk
  const peakForecast = forecasts.reduce(
    (max, fc) => (fc.wbgt > max.wbgt ? fc : max),
    forecasts[0] || { wbgt: 0, riskLevel: 'Low' as const, temperature: 0, humidity: 0, windSpeed: 0, workCapacityPercent: 100, recommendation: '', timestamp: new Date() },
  );

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-gray-900">
            🤖 ML-Enhanced Forecast
          </h3>
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
            Random Forest
          </span>
        </div>
        <button
          onClick={runForecast}
          disabled={isForecasting}
          className="text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400"
        >
          {isForecasting ? 'Forecasting...' : '↻ Refresh'}
        </button>
      </div>

      {/* District & time info */}
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span>📍 {district}</span>
        {lastUpdated && (
          <span>Updated: {lastUpdated.toLocaleTimeString()}</span>
        )}
        <span>{forecastHours}h forecast</span>
      </div>

      {/* Error */}
      {forecastError && (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-yellow-800">
          {forecastError}
        </div>
      )}

      {/* Loading spinner during forecast */}
      {isForecasting && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
          Running ML inference...
        </div>
      )}

      {/* Results */}
      {forecasts.length > 0 && !isForecasting && (
        <>
          {/* Peak WBGT alert */}
          <div className={`rounded-lg border p-4 ${RISK_COLORS[peakForecast.riskLevel]}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Peak WBGT (next {forecastHours}h)</p>
                <p className="text-3xl font-bold">{peakForecast.wbgt}°C</p>
                <p className="text-sm mt-1">{peakForecast.recommendation}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">Risk Level</p>
                <p className="text-xl font-bold">{peakForecast.riskLevel}</p>
                <p className="text-sm mt-1">
                  Work capacity: {peakForecast.workCapacityPercent}%
                </p>
              </div>
            </div>
          </div>

          {/* Hourly forecast bars */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              Hourly WBGT Forecast
            </h4>
            <div className="space-y-1">
              {forecasts.map((fc, i) => {
                const hour = fc.timestamp.getHours();
                const timeStr = fc.timestamp.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                });
                // Scale bar width: 0°C = 0%, 40°C = 100%
                const barWidth = Math.min(100, Math.max(5, (fc.wbgt / 40) * 100));

                return (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="w-14 text-gray-500 text-right font-mono">
                      {timeStr}
                    </span>
                    <div className="flex-1 bg-gray-100 rounded-full h-4 relative">
                      <div
                        className={`h-4 rounded-full transition-all ${RISK_BAR_COLORS[fc.riskLevel]}`}
                        style={{ width: `${barWidth}%` }}
                      />
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-gray-900">
                        {fc.wbgt}°C
                      </span>
                    </div>
                    <span className="w-8 text-right font-mono text-gray-500">
                      {fc.temperature.toFixed(0)}°
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Model info footer */}
          <div className="border-t pt-3 mt-4">
            <details className="text-xs text-gray-500">
              <summary className="cursor-pointer hover:text-gray-700">
                Model details
              </summary>
              <div className="mt-2 space-y-1 pl-4">
                <p>Algorithm: Random Forest (scikit-learn → ONNX)</p>
                <p>Features: 17 (8 lags + 4 cyclical + 3 rolling + 2 delta)</p>
                <p>Training data: Open-Meteo historical (4 districts, 2021-2025)</p>
                <p>Inference: onnxruntime-web (WASM, runs in your browser)</p>
                <p>Models: temperature, humidity, wind speed → ISO 7243 WBGT</p>
                <p>WBGT formula: 0.7×Tnwb + 0.2×Tg + 0.1×Tdb</p>
              </div>
            </details>
          </div>
        </>
      )}
    </div>
  );
}
