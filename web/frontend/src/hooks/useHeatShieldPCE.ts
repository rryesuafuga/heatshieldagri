/**
 * useHeatShieldPCE.ts
 * ===================
 * React hook for browser-side PCE (Polynomial Chaos Expansion) inference.
 * Loads ~20 KB of JSON coefficients instead of ~6 MB of ONNX models.
 * Zero WASM dependencies — pure TypeScript polynomial evaluation.
 *
 * Usage:
 *   const { isReady, predictMultiStep, getSobolIndices } = useHeatShieldPCE();
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { HeatShieldPCE, type PCEForecast, type PCEModelJSON } from '../pce-inference';

interface UseHeatShieldPCEReturn {
  isLoading: boolean;
  loadProgress: number;
  loadingModel: string;
  error: string | null;
  isReady: boolean;
  predictWBGT: (
    tempHistory: number[],
    humHistory: number[],
    windHistory: number[],
    forecastHour: number,
    forecastDOY: number,
  ) => Promise<PCEForecast>;
  predictMultiStep: (
    tempHistory: number[],
    humHistory: number[],
    windHistory: number[],
    steps?: number,
    startTime?: Date,
  ) => Promise<PCEForecast[]>;
  /** Sobol sensitivity indices from PCE coefficients */
  getSobolIndices: (variable: string) => {
    firstOrder: Record<string, number>;
    totalOrder: Record<string, number>;
  } | null;
  /** PCE validation metrics vs full RF */
  getValidation: (variable: string) => PCEModelJSON['validation_vs_full_rf'] | null;
  /** Sparsity info: active terms / candidates per model */
  getSparsityInfo: () => Record<string, { active: number; candidates: number; sparsity: number }>;
  /** Approximate total model size in KB */
  modelSizeKB: number;
}

// Module-level singleton — survives React StrictMode double-mount
let singletonPCE: HeatShieldPCE | null = null;

function getPCEInstance(modelPath: string): HeatShieldPCE {
  if (!singletonPCE) {
    singletonPCE = new HeatShieldPCE(modelPath);
  }
  return singletonPCE;
}

export function useHeatShieldPCE(modelPath = '/models'): UseHeatShieldPCEReturn {
  const pceRef = useRef<HeatShieldPCE | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [loadingModel, setLoadingModel] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const pce = getPCEInstance(modelPath);
    pceRef.current = pce;

    if (pce.isLoaded) {
      setIsLoading(false);
      setIsReady(true);
      return;
    }

    pce.loadModels((loaded, total, name) => {
      setLoadProgress(Math.round((loaded / total) * 100));
      setLoadingModel(name);
    })
      .then(() => {
        setIsLoading(false);
        setIsReady(true);
        console.log('[HeatShieldPCE] All 3 PCE models loaded successfully (~20 KB, zero WASM)');
      })
      .catch((err) => {
        setIsLoading(false);
        setError(err.message || 'Failed to load PCE models');
        console.error('[HeatShieldPCE] Load error:', err);
      });
  }, [modelPath]);

  const predictWBGT = useCallback(
    async (
      temps: number[], hums: number[], winds: number[],
      hour: number, doy: number,
    ) => {
      if (!pceRef.current?.isLoaded) throw new Error('PCE models not ready');
      return pceRef.current.predictWBGT(temps, hums, winds, hour, doy);
    },
    [],
  );

  const predictMultiStep = useCallback(
    async (
      temps: number[], hums: number[], winds: number[],
      steps = 24, startTime = new Date(),
    ) => {
      if (!pceRef.current?.isLoaded) throw new Error('PCE models not ready');
      return pceRef.current.predictMultiStep(temps, hums, winds, steps, startTime);
    },
    [],
  );

  const getSobolIndices = useCallback(
    (variable: string) => pceRef.current?.getSobolIndices(variable) ?? null,
    [],
  );

  const getValidation = useCallback(
    (variable: string) => pceRef.current?.getValidation(variable) ?? null,
    [],
  );

  const getSparsityInfo = useCallback(
    () => pceRef.current?.getSparsityInfo() ?? {},
    [],
  );

  return {
    isLoading,
    loadProgress,
    loadingModel,
    error,
    isReady,
    predictWBGT,
    predictMultiStep,
    getSobolIndices,
    getValidation,
    getSparsityInfo,
    modelSizeKB: pceRef.current?.modelSizeKB ?? 20,
  };
}
