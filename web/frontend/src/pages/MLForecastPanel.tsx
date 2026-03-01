/**
 * MLForecastPanel — ML-enhanced WBGT forecast using Random Forest models.
 *
 * Displays an hourly risk bar chart, summary stats, and work-capacity
 * recommendations powered by browser-side ONNX inference.
 */

import { Loader2, Brain, RefreshCw, AlertTriangle, Clock, Zap } from 'lucide-react';
import { useHeatShieldML } from '../hooks/useHeatShieldML';
import { classifyRisk } from '../wasm';

interface MLForecastPanelProps {
  district: string;
  forecastHours?: number;
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div
        className="bg-green-500 h-2 rounded-full transition-all duration-300"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

function RiskBar({ predictions }: { predictions: ReturnType<typeof useHeatShieldML>['predictions'] }) {
  return (
    <div className="space-y-1">
      <div className="flex gap-0.5">
        {predictions.map((p, i) => (
          <div
            key={i}
            className="flex-1 rounded-sm relative group cursor-pointer"
            style={{ backgroundColor: p.riskColor, height: '32px' }}
            title={`${p.hour}:00 — WBGT ${p.wbgt.toFixed(1)}°C (${p.riskLevel})`}
          >
            {/* Tooltip on hover */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
              <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                {p.hour.toString().padStart(2, '0')}:00 — {p.wbgt.toFixed(1)}°C
                <br />
                {p.riskLevel} Risk
              </div>
            </div>
          </div>
        ))}
      </div>
      {/* Hour labels */}
      <div className="flex gap-0.5 text-xs text-gray-400">
        {predictions.map((p, i) => (
          <div key={i} className="flex-1 text-center">
            {i % 3 === 0 ? `${p.hour.toString().padStart(2, '0')}` : ''}
          </div>
        ))}
      </div>
    </div>
  );
}

function SummaryStats({ predictions }: { predictions: ReturnType<typeof useHeatShieldML>['predictions'] }) {
  if (predictions.length === 0) return null;

  const wbgts = predictions.map((p) => p.wbgt);
  const maxWbgt = Math.max(...wbgts);
  const minWbgt = Math.min(...wbgts);
  const avgWbgt = wbgts.reduce((a, b) => a + b, 0) / wbgts.length;
  const safeHours = predictions.filter((p) => p.wbgt < 28).length;
  const avgCapacity = predictions.reduce((s, p) => s + p.workCapacity, 0) / predictions.length;
  const peakIdx = wbgts.indexOf(maxWbgt);
  const peakRisk = classifyRisk(maxWbgt);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      <div className="bg-white rounded-lg p-3 text-center border border-gray-100">
        <div className="text-xs text-gray-500 mb-1">Peak WBGT</div>
        <div className="text-xl font-bold" style={{ color: peakRisk.color }}>
          {maxWbgt.toFixed(1)}°C
        </div>
        <div className="text-xs text-gray-400">
          at {predictions[peakIdx].hour.toString().padStart(2, '0')}:00
        </div>
      </div>
      <div className="bg-white rounded-lg p-3 text-center border border-gray-100">
        <div className="text-xs text-gray-500 mb-1">Low WBGT</div>
        <div className="text-xl font-bold text-green-600">{minWbgt.toFixed(1)}°C</div>
      </div>
      <div className="bg-white rounded-lg p-3 text-center border border-gray-100">
        <div className="text-xs text-gray-500 mb-1">Average</div>
        <div className="text-xl font-bold text-gray-700">{avgWbgt.toFixed(1)}°C</div>
      </div>
      <div className="bg-white rounded-lg p-3 text-center border border-gray-100">
        <div className="text-xs text-gray-500 mb-1">Safe Hours</div>
        <div className="text-xl font-bold text-blue-600">{safeHours}</div>
        <div className="text-xs text-gray-400">below 28°C</div>
      </div>
      <div className="bg-white rounded-lg p-3 text-center border border-gray-100">
        <div className="text-xs text-gray-500 mb-1">Work Capacity</div>
        <div className="text-xl font-bold text-indigo-600">{avgCapacity.toFixed(0)}%</div>
        <div className="text-xs text-gray-400">Hothaps model</div>
      </div>
    </div>
  );
}

function HourlyTable({ predictions }: { predictions: ReturnType<typeof useHeatShieldML>['predictions'] }) {
  const riskBadge: Record<string, string> = {
    Low: 'bg-green-100 text-green-800',
    Moderate: 'bg-yellow-100 text-yellow-800',
    High: 'bg-orange-100 text-orange-800',
    'Very High': 'bg-red-100 text-red-800',
    Extreme: 'bg-red-900 text-white',
  };

  return (
    <div className="overflow-x-auto max-h-72">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50 sticky top-0">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Hour</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">WBGT</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Risk</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Temp</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Humid</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Wind</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Capacity</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {predictions.map((p, i) => (
            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              <td className="px-3 py-2 font-medium">{p.hour.toString().padStart(2, '0')}:00</td>
              <td className="px-3 py-2">{p.wbgt.toFixed(1)}°C</td>
              <td className="px-3 py-2">
                <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${riskBadge[p.riskLevel] || ''}`}>
                  {p.riskLevel}
                </span>
              </td>
              <td className="px-3 py-2 text-gray-500">{p.temperature.toFixed(1)}°C</td>
              <td className="px-3 py-2 text-gray-500">{p.humidity.toFixed(0)}%</td>
              <td className="px-3 py-2 text-gray-500">{p.windSpeed.toFixed(1)} m/s</td>
              <td className="px-3 py-2">
                <div className="flex items-center space-x-2">
                  <div className="w-16 h-1.5 bg-gray-200 rounded-full">
                    <div
                      className="h-1.5 rounded-full"
                      style={{
                        width: `${p.workCapacity}%`,
                        backgroundColor: p.riskColor,
                      }}
                    />
                  </div>
                  <span className="text-xs text-gray-500">{p.workCapacity}%</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function MLForecastPanel({ district, forecastHours = 24 }: MLForecastPanelProps) {
  const {
    predictions,
    isLoading,
    isModelLoading,
    error,
    loadProgress,
    refresh,
    inferenceTimeMs,
  } = useHeatShieldML(district, forecastHours);

  // Loading state
  if (isLoading) {
    return (
      <div className="card">
        <div className="flex items-center space-x-3 mb-4">
          <Brain className="h-5 w-5 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900">ML Weather Forecast</h3>
        </div>
        <div className="flex flex-col items-center py-8">
          <Loader2 className="h-8 w-8 text-purple-500 animate-spin mb-3" />
          <p className="text-sm text-gray-600 mb-2">
            {isModelLoading ? 'Loading ONNX models...' : 'Running ML inference...'}
          </p>
          <div className="w-64">
            <ProgressBar value={loadProgress} />
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {isModelLoading
              ? 'Downloading Random Forest models (~1 MB)'
              : `Predicting ${forecastHours} hours ahead...`}
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="card">
        <div className="flex items-center space-x-3 mb-4">
          <Brain className="h-5 w-5 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900">ML Weather Forecast</h3>
        </div>
        <div className="flex flex-col items-center py-8">
          <AlertTriangle className="h-8 w-8 text-red-500 mb-3" />
          <p className="text-sm text-gray-900 font-medium mb-1">ML Forecast Unavailable</p>
          <p className="text-xs text-gray-500 mb-4 text-center max-w-sm">{error}</p>
          <button
            onClick={refresh}
            className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Retry</span>
          </button>
        </div>
      </div>
    );
  }

  if (predictions.length === 0) return null;

  // Find high-risk hours for recommendation
  const highRiskHours = predictions.filter((p) => p.wbgt >= 30);
  const safeWorkPeriods = predictions.filter((p) => p.wbgt < 28);

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <Brain className="h-5 w-5 text-purple-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">ML Weather Forecast</h3>
            <p className="text-xs text-gray-400">
              Random Forest ONNX models — {district}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {inferenceTimeMs !== null && (
            <span className="text-xs text-gray-400 flex items-center space-x-1">
              <Zap className="h-3 w-3" />
              <span>{inferenceTimeMs}ms</span>
            </span>
          )}
          <button
            onClick={refresh}
            className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
            title="Re-run ML forecast"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Risk bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            {forecastHours}-Hour WBGT Risk Timeline
          </span>
          <div className="flex items-center space-x-3 text-xs">
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-gray-500">Low</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-yellow-500" />
              <span className="text-gray-500">Mod</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-orange-500" />
              <span className="text-gray-500">High</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-gray-500">V.High</span>
            </span>
          </div>
        </div>
        <RiskBar predictions={predictions} />
      </div>

      {/* Summary stats */}
      <div className="mb-6">
        <SummaryStats predictions={predictions} />
      </div>

      {/* Recommendation */}
      {highRiskHours.length > 0 && (
        <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-orange-900">
                ML model predicts {highRiskHours.length} high-risk hour{highRiskHours.length !== 1 ? 's' : ''}
              </p>
              <p className="text-xs text-orange-700 mt-1">
                Avoid outdoor work during hours:{' '}
                {highRiskHours.map((h) => `${h.hour.toString().padStart(2, '0')}:00`).join(', ')}.
                {safeWorkPeriods.length > 0 && (
                  <> Best work windows: {safeWorkPeriods.slice(0, 4).map((h) => `${h.hour.toString().padStart(2, '0')}:00`).join(', ')}.</>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Hourly table */}
      <details className="group">
        <summary className="flex items-center justify-between cursor-pointer py-2 text-sm font-medium text-gray-700 hover:text-purple-600">
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4" />
            <span>Hourly Breakdown</span>
          </div>
          <span className="text-xs text-gray-400 group-open:hidden">Click to expand</span>
        </summary>
        <div className="mt-2">
          <HourlyTable predictions={predictions} />
        </div>
      </details>

      {/* Attribution */}
      <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-400 text-center">
        Predictions: Random Forest (ONNX) in-browser via WebAssembly
        {' '}&bull;{' '}WBGT: ISO 7243 &bull; Work capacity: Hothaps model
      </div>
    </div>
  );
}
