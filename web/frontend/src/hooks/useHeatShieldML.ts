/**
 * React hook for HeatShield ML weather forecasting.
 *
 * Manages the lifecycle of loading ONNX models, fetching weather history,
 * running recursive multi-step inference, and exposing predictions to the UI.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  loadModels,
  fetchWeatherHistory,
  runForecast,
  MLPrediction,
} from '../ml-inference';
import { getUgandaDistricts } from '../wasm';

export interface UseHeatShieldMLResult {
  predictions: MLPrediction[];
  isLoading: boolean;
  isModelLoading: boolean;
  error: string | null;
  loadProgress: number; // 0-100
  refresh: () => void;
  inferenceTimeMs: number | null;
}

/**
 * @param districtName  One of the Ugandan district names (e.g. "Kampala")
 * @param forecastHours Number of hours to predict (default 24, max 72)
 */
export function useHeatShieldML(
  districtName: string,
  forecastHours = 24,
): UseHeatShieldMLResult {
  const [predictions, setPredictions] = useState<MLPrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadProgress, setLoadProgress] = useState(0);
  const [inferenceTimeMs, setInferenceTimeMs] = useState<number | null>(null);
  const [trigger, setTrigger] = useState(0);

  const refresh = useCallback(() => setTrigger((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setError(null);
      setIsLoading(true);
      setPredictions([]);
      setInferenceTimeMs(null);

      try {
        // Step 1: Load ONNX models (cached after first load)
        setIsModelLoading(true);
        setLoadProgress(10);
        await loadModels();
        if (cancelled) return;
        setIsModelLoading(false);
        setLoadProgress(40);

        // Step 2: Resolve district coordinates
        const districts = getUgandaDistricts();
        const district = districts.find(
          (d) => d.name.toLowerCase() === districtName.toLowerCase(),
        );
        const lat = district?.lat ?? 0.3476; // Default: Kampala
        const lon = district?.lon ?? 32.5825;

        // Step 3: Fetch weather history from Open-Meteo
        setLoadProgress(50);
        const history = await fetchWeatherHistory(lat, lon);
        if (cancelled) return;

        if (history.length < 6) {
          throw new Error(
            `Insufficient weather history (got ${history.length} hours, need 6+).`,
          );
        }

        setLoadProgress(70);

        // Step 4: Run recursive forecast
        const t0 = performance.now();
        const hours = Math.min(forecastHours, 72);
        const preds = await runForecast(history, hours);
        const elapsed = performance.now() - t0;

        if (cancelled) return;

        setPredictions(preds);
        setInferenceTimeMs(Math.round(elapsed));
        setLoadProgress(100);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'ML forecast failed',
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
          setIsModelLoading(false);
        }
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [districtName, forecastHours, trigger]);

  return {
    predictions,
    isLoading,
    isModelLoading,
    error,
    loadProgress,
    refresh,
    inferenceTimeMs,
  };
}
