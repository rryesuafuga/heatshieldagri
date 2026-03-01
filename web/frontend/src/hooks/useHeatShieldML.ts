/**
 * useHeatShieldML.ts
 * ==================
 * React hook for browser-side ML weather forecasting.
 * Place in: web/frontend/src/hooks/useHeatShieldML.ts
 *
 * Usage:
 *   const { isLoading, error, predictWBGT, predictMultiStep } = useHeatShieldML();
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { HeatShieldML, type WBGTForecast } from '../ml-inference';

interface UseHeatShieldMLReturn {
  /** True while ONNX models are being downloaded and initialized */
  isLoading: boolean;
  /** Loading progress 0-100 */
  loadProgress: number;
  /** Which model is currently loading */
  loadingModel: string;
  /** Error message if model loading failed */
  error: string | null;
  /** True once all 3 models are ready for inference */
  isReady: boolean;
  /** Single-step WBGT prediction */
  predictWBGT: (
    tempHistory: number[],
    humHistory: number[],
    windHistory: number[],
    forecastHour: number,
    forecastDOY: number,
  ) => Promise<WBGTForecast>;
  /** Multi-step recursive forecast (up to 72 hours) */
  predictMultiStep: (
    tempHistory: number[],
    humHistory: number[],
    windHistory: number[],
    steps?: number,
    startTime?: Date,
  ) => Promise<WBGTForecast[]>;
  /** Total ONNX model size downloaded (KB) */
  modelSizeKB: number;
}

// Module-level singleton — survives React StrictMode double-mount and
// prevents the ONNX WASM backend from being initialized twice.
let singletonML: HeatShieldML | null = null;

function getMLInstance(modelPath: string): HeatShieldML {
  if (!singletonML) {
    singletonML = new HeatShieldML(modelPath);
  }
  return singletonML;
}

export function useHeatShieldML(modelPath = '/models'): UseHeatShieldMLReturn {
  const mlRef = useRef<HeatShieldML | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [loadingModel, setLoadingModel] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const ml = getMLInstance(modelPath);
    mlRef.current = ml;

    // If already loaded (e.g. StrictMode re-mount), skip straight to ready
    if (ml.isLoaded) {
      setIsLoading(false);
      setIsReady(true);
      return;
    }

    ml.loadModels((loaded, total, name) => {
      setLoadProgress(Math.round((loaded / total) * 100));
      setLoadingModel(name);
    })
      .then(() => {
        setIsLoading(false);
        setIsReady(true);
        console.log('[HeatShieldML] All 3 ONNX models loaded successfully');
      })
      .catch((err) => {
        setIsLoading(false);
        setError(err.message || 'Failed to load ML models');
        console.error('[HeatShieldML] Load error:', err);
      });

    // Do NOT dispose the singleton on cleanup — it must survive re-mounts
  }, [modelPath]);

  const predictWBGT = useCallback(
    async (
      temps: number[], hums: number[], winds: number[],
      hour: number, doy: number,
    ) => {
      if (!mlRef.current?.isLoaded) {
        throw new Error('ML models not ready');
      }
      return mlRef.current.predictWBGT(temps, hums, winds, hour, doy);
    },
    [],
  );

  const predictMultiStep = useCallback(
    async (
      temps: number[], hums: number[], winds: number[],
      steps = 24, startTime = new Date(),
    ) => {
      if (!mlRef.current?.isLoaded) {
        throw new Error('ML models not ready');
      }
      return mlRef.current.predictMultiStep(temps, hums, winds, steps, startTime);
    },
    [],
  );

  // Approximate total model size (3 models × ~2 MB each)
  const modelSizeKB = 6000;

  return {
    isLoading,
    loadProgress,
    loadingModel,
    error,
    isReady,
    predictWBGT,
    predictMultiStep,
    modelSizeKB,
  };
}
