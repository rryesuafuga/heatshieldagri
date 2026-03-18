/**
 * PCEForecastPanel.tsx
 * ====================
 * Displays PCE (Polynomial Chaos Expansion) surrogate WBGT forecast.
 * ~20 KB JSON models, zero WASM dependencies, pure TypeScript evaluation.
 *
 * Mirrors the MLForecastPanel pattern but uses LARS-selected sparse
 * Legendre polynomials trained on the RF teacher model.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useHeatShieldPCE } from '../hooks/useHeatShieldPCE';
import type { PCEForecast } from '../pce-inference';

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

async function fetchWeatherHistory(
  lat: number, lon: number,
): Promise<{ temps: number[]; hums: number[]; winds: number[] }> {
  const url = `https://api.open-meteo.com/v1/forecast?` +
    `latitude=${lat}&longitude=${lon}` +
    `&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m` +
    `&past_days=4&forecast_days=1` +
    `&timezone=Africa/Kampala`;

  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Open-Meteo API error: ${resp.status}`);
  const data = await resp.json();

  const hourly: HourlyWeather = data.hourly;

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

interface PCEForecastPanelProps {
  district?: string;
  forecastHours?: number;
}

export default function PCEForecastPanel({
  district = 'Kampala',
  forecastHours = 24,
}: PCEForecastPanelProps) {
  const {
    isLoading: pceLoading,
    loadProgress,
    loadingModel,
    error: pceError,
    isReady,
    predictMultiStep,
    getSobolIndices,
    getValidation,
    getSparsityInfo,
    modelSizeKB,
  } = useHeatShieldPCE();

  const [forecasts, setForecasts] = useState<PCEForecast[]>([]);
  const [isForecasting, setIsForecasting] = useState(false);
  const [forecastError, setForecastError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
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
      const { temps, hums, winds } = await fetchWeatherHistory(coords.lat, coords.lon);

      if (temps.length < 73) {
        setForecastError(`Insufficient weather history: got ${temps.length} hours, need 73+`);
        return;
      }

      const results = await predictMultiStep(temps, hums, winds, forecastHours);
      setForecasts(results);
      setLastUpdated(new Date());
    } catch (err: any) {
      setForecastError(err.message || 'PCE forecast failed');
      console.error('[PCEForecast] Error:', err);
    } finally {
      isForecastingRef.current = false;
      setIsForecasting(false);
    }
  }, [isReady, district, forecastHours, predictMultiStep]);

  useEffect(() => {
    if (isReady) {
      runForecast();
    }
  }, [isReady, district, runForecast]);

  // ---- Render: Loading state ----
  if (pceLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          PCE Surrogate Forecast
        </h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600" />
            <span className="text-sm text-gray-600">
              Loading {loadingModel} PCE model... {loadProgress}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${loadProgress}%` }}
            />
          </div>
          <p className="text-xs text-gray-500">
            Loading PCE JSON coefficients (~{modelSizeKB} KB total). No WASM needed.
          </p>
        </div>
      </div>
    );
  }

  // ---- Render: Error state ----
  if (pceError) {
    return (
      <div className="bg-red-50 rounded-lg border border-red-200 p-6">
        <h3 className="text-lg font-semibold text-red-900 mb-2">
          PCE Forecast Unavailable
        </h3>
        <p className="text-sm text-red-700">{pceError}</p>
        <p className="text-xs text-red-500 mt-2">
          The physics-based WBGT forecast above remains fully functional.
        </p>
      </div>
    );
  }

  // Peak WBGT
  const peakForecast = forecasts.reduce(
    (max, fc) => (fc.wbgt > max.wbgt ? fc : max),
    forecasts[0] || {
      wbgt: 0, riskLevel: 'Low' as const, temperature: 0, humidity: 0,
      windSpeed: 0, workCapacityPercent: 100, recommendation: '',
      timestamp: new Date(),
    },
  );

  // Sobol indices for temperature (top 5)
  const sobolTemp = getSobolIndices('temperature');
  const sobolSorted = sobolTemp
    ? Object.entries(sobolTemp.totalOrder).sort((a, b) => b[1] - a[1]).slice(0, 5)
    : [];

  // Sparsity info
  const sparsity = getSparsityInfo();

  // Validation metrics
  const valTemp = getValidation('temperature');
  const valHum = getValidation('humidity');
  const valWind = getValidation('windspeed');

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-gray-900">
            PCE Surrogate Forecast
          </h3>
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
            Sparse PCE via LARS
          </span>
        </div>
        <button
          onClick={runForecast}
          disabled={isForecasting}
          className="text-sm text-purple-600 hover:text-purple-800 disabled:text-gray-400"
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
        <span>~{modelSizeKB} KB total</span>
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
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600" />
          Running PCE polynomial evaluation...
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
              Hourly WBGT Forecast (PCE)
            </h4>
            <div className="space-y-1">
              {forecasts.map((fc, i) => {
                const timeStr = fc.timestamp.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                });
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

          {/* Sobol Sensitivity + Sparsity + Compression — side-by-side */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4">
            {/* Sobol Sensitivity */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Sobol Sensitivity — Temperature
              </h4>
              <div className="space-y-1.5">
                {sobolSorted.length > 0 ? (
                  sobolSorted.map(([feat, val]) => (
                    <div key={feat} className="flex items-center gap-2 text-xs">
                      <span className="text-gray-500 w-24 truncate">{feat}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2">
                        <div
                          className="bg-purple-500 h-2 rounded-full"
                          style={{ width: `${Math.min(val * 100, 100)}%` }}
                        />
                      </div>
                      <span className="font-mono text-gray-600 w-10 text-right">
                        {(val * 100).toFixed(1)}%
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-400">Not available</p>
                )}
              </div>
            </div>

            {/* Sparsity */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                LARS Sparsity
              </h4>
              <div className="space-y-2">
                {Object.keys(sparsity).length > 0 ? (
                  Object.entries(sparsity).map(([name, s]) => (
                    <div key={name}>
                      <div className="flex justify-between text-xs mb-0.5">
                        <span className="text-gray-600 capitalize">{name}</span>
                        <span className="font-mono text-purple-700">
                          {s.active}/{s.candidates}
                        </span>
                      </div>
                      <div className="bg-gray-100 rounded-full h-2">
                        <div
                          className="bg-purple-400 h-2 rounded-full"
                          style={{ width: `${(1 - s.sparsity) * 100}%` }}
                        />
                      </div>
                      <div className="text-xs text-gray-400">
                        {(s.sparsity * 100).toFixed(1)}% sparse
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-400">Not available</p>
                )}
              </div>
            </div>

            {/* Compression Stats */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Model Compression
              </h4>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">RF ONNX</span>
                  <span className="font-mono text-gray-700">~6,188 KB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">PCE JSON</span>
                  <span className="font-mono text-purple-700">~{modelSizeKB} KB</span>
                </div>
                <div className="border-t pt-1 flex justify-between font-semibold">
                  <span className="text-gray-600">Ratio</span>
                  <span className="text-purple-700">
                    {(6188 / Math.max(modelSizeKB, 1)).toFixed(0)}×
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">WASM</span>
                  <span className="font-mono text-green-600">None</span>
                </div>
              </div>
            </div>
          </div>

          {/* Model info footer */}
          <div className="border-t pt-3 mt-4">
            <details className="text-xs text-gray-500">
              <summary className="cursor-pointer hover:text-gray-700">
                Model details
              </summary>
              <div className="mt-2 space-y-1 pl-4">
                <p>Algorithm: Sparse PCE via LARS (Legendre basis, hyperbolic truncation q=0.7)</p>
                <p>Features: 17 (8 lags + 4 cyclical + 3 rolling + 2 delta) — same as RF</p>
                <p>Teacher model: Full Random Forest (100 trees, depth 15)</p>
                <p>Inference: Pure TypeScript polynomial evaluation (zero dependencies)</p>
                <p>Models: temperature, humidity, wind speed → ISO 7243 WBGT</p>
                {valTemp && (
                  <p>Temp R²: {valTemp.r2.toFixed(4)}, MAE: {valTemp.mae.toFixed(2)}°C</p>
                )}
                {valHum && (
                  <p>Humidity R²: {valHum.r2.toFixed(4)}, MAE: {valHum.mae.toFixed(2)}%</p>
                )}
                {valWind && (
                  <p>Wind R²: {valWind.r2.toFixed(4)}, MAE: {valWind.mae.toFixed(2)} m/s</p>
                )}
              </div>
            </details>
          </div>
        </>
      )}
    </div>
  );
}
