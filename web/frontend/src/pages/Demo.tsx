import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Thermometer,
  Droplets,
  Wind,
  Sun,
  AlertTriangle,
  Gauge,
  Zap,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { initWasm, wasmReady, wasm } from '../wasm-runtime';
import {
  calculateWbgt as jsCalculateWbgt,
  classifyRisk,
  getUgandaDistricts,
  WbgtResult,
} from '../wasm';

function InputSlider({
  label,
  value,
  onChange,
  min,
  max,
  step,
  unit,
  icon: Icon,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  unit: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Icon className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">{label}</span>
        </div>
        <span className="text-sm font-bold text-gray-900">
          {value.toFixed(1)} {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
      />
      <div className="flex justify-between text-xs text-gray-400">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

function WBGTCalculator() {
  const [temperature, setTemperature] = useState(32);
  const [humidity, setHumidity] = useState(65);
  const [windSpeed, setWindSpeed] = useState(2);
  const [solarRadiation, setSolarRadiation] = useState(700);
  const [result, setResult] = useState<WbgtResult | null>(null);
  const [wetBulb, setWetBulb] = useState(0);
  const [heatIndex, setHeatIndex] = useState(0);

  useEffect(() => {
    if (!wasmReady()) return;
    const wasmResult = wasm.calculate_wbgt(temperature, humidity, windSpeed, solarRadiation);
    setResult({
      wbgt: wasmResult.wbgt,
      risk_level: wasmResult.risk_level,
      risk_code: wasmResult.risk_code,
      recommendation: wasmResult.recommendation,
      color: wasmResult.color,
    });
    setWetBulb(wasm.calculate_wet_bulb(temperature, humidity));
    setHeatIndex(wasm.calculate_heat_index(temperature, humidity));
  }, [temperature, humidity, windSpeed, solarRadiation]);

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          WBGT Calculator
        </h3>
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
          Rust WebAssembly
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Inputs */}
        <div className="space-y-6">
          <InputSlider
            label="Air Temperature"
            value={temperature}
            onChange={setTemperature}
            min={15}
            max={50}
            step={0.5}
            unit="°C"
            icon={Thermometer}
          />
          <InputSlider
            label="Relative Humidity"
            value={humidity}
            onChange={setHumidity}
            min={10}
            max={100}
            step={1}
            unit="%"
            icon={Droplets}
          />
          <InputSlider
            label="Wind Speed"
            value={windSpeed}
            onChange={setWindSpeed}
            min={0}
            max={15}
            step={0.5}
            unit="m/s"
            icon={Wind}
          />
          <InputSlider
            label="Solar Radiation"
            value={solarRadiation}
            onChange={setSolarRadiation}
            min={0}
            max={1200}
            step={50}
            unit="W/m²"
            icon={Sun}
          />
        </div>

        {/* Results */}
        <div>
          {result && (
            <div className="space-y-4">
              <div
                className="p-6 rounded-xl text-center"
                style={{ backgroundColor: `${result.color}20` }}
              >
                <div className="text-sm font-medium mb-1" style={{ color: result.color }}>
                  WBGT (Wet-Bulb Globe Temperature)
                </div>
                <div className="text-5xl font-bold" style={{ color: result.color }}>
                  {result.wbgt.toFixed(1)}°C
                </div>
                <div
                  className="mt-2 inline-flex px-3 py-1 rounded-full text-sm font-medium"
                  style={{ backgroundColor: result.color, color: 'white' }}
                >
                  {result.risk_level} Risk
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 bg-blue-50 rounded-lg text-center">
                  <div className="text-xs text-blue-600 mb-1">Wet-Bulb Temp</div>
                  <div className="text-xl font-bold text-blue-700">
                    {wetBulb.toFixed(1)}°C
                  </div>
                </div>
                <div className="p-4 bg-orange-50 rounded-lg text-center">
                  <div className="text-xs text-orange-600 mb-1">Heat Index</div>
                  <div className="text-xl font-bold text-orange-700">
                    {heatIndex.toFixed(1)}°C
                  </div>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-start space-x-2">
                  <AlertTriangle
                    className="h-5 w-5 flex-shrink-0 mt-0.5"
                    style={{ color: result.color }}
                  />
                  <p className="text-sm text-gray-700">{result.recommendation}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DistrictSimulation() {
  const [selectedDistrictId, setSelectedDistrictId] = useState(1);
  const [isRunning, setIsRunning] = useState(false);
  const [simulationData, setSimulationData] = useState<{ hour: string; wbgt: number }[]>([]);
  const [currentHour, setCurrentHour] = useState(0);

  const districts = getUgandaDistricts();
  const district = districts.find((d) => d.id === selectedDistrictId);

  useEffect(() => {
    if (isRunning) {
      const interval = setInterval(() => {
        setCurrentHour((prev) => {
          if (prev >= 23) {
            setIsRunning(false);
            return 23;
          }
          return prev + 1;
        });
      }, 500);
      return () => clearInterval(interval);
    }
  }, [isRunning]);

  useEffect(() => {
    if (!wasmReady()) return;
    const baseTemp = 28 + selectedDistrictId * 0.5;
    const humidity = 60 + (selectedDistrictId % 5) * 3;

    // Call the real Rust WASM function
    const forecast = wasm.generate_demo_forecast(baseTemp, humidity);
    const data = [];
    for (let i = 0; i <= currentHour && i < forecast.length; i++) {
      const f = forecast[i];
      data.push({
        hour: `${f.hour.toString().padStart(2, '0')}:00`,
        wbgt: f.wbgt,
      });
    }

    setSimulationData(data);
  }, [selectedDistrictId, currentHour]);

  const handleReset = () => {
    setIsRunning(false);
    setCurrentHour(0);
    setSimulationData([]);
  };

  const latestResult =
    simulationData.length > 0
      ? classifyRisk(simulationData[simulationData.length - 1].wbgt)
      : null;

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          24-Hour District Simulation
        </h3>
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
          Rust WebAssembly
        </span>
      </div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <select
          value={selectedDistrictId}
          onChange={(e) => {
            setSelectedDistrictId(Number(e.target.value));
            handleReset();
          }}
          className="border border-gray-300 rounded-lg px-4 py-2"
        >
          {districts.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}, {d.region}
            </option>
          ))}
        </select>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsRunning(!isRunning)}
            className="btn-primary flex items-center space-x-2"
          >
            {isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            <span>{isRunning ? 'Pause' : 'Play'}</span>
          </button>
          <button onClick={handleReset} className="btn-secondary">
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-gray-50 rounded-lg text-center">
          <div className="text-sm text-gray-500">Current Hour</div>
          <div className="text-2xl font-bold">{currentHour}:00</div>
        </div>
        <div
          className="p-4 rounded-lg text-center"
          style={{ backgroundColor: latestResult ? `${latestResult.color}20` : '#f3f4f6' }}
        >
          <div className="text-sm" style={{ color: latestResult?.color || '#6b7280' }}>
            Current WBGT
          </div>
          <div
            className="text-2xl font-bold"
            style={{ color: latestResult?.color || '#374151' }}
          >
            {simulationData.length > 0
              ? simulationData[simulationData.length - 1].wbgt.toFixed(1)
              : '--'}
            °C
          </div>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg text-center">
          <div className="text-sm text-gray-500">Location</div>
          <div className="text-lg font-bold">
            {district?.lat.toFixed(2)}°, {district?.lon.toFixed(2)}°
          </div>
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={simulationData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
            <YAxis domain={[15, 40]} />
            <Tooltip
              formatter={(value: number) => [`${value.toFixed(1)}°C`, 'WBGT']}
            />
            <Line
              type="monotone"
              dataKey="wbgt"
              stroke="#ef4444"
              strokeWidth={2}
              dot={false}
              animationDuration={300}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function PerformanceDemo() {
  const [iterations, setIterations] = useState(1000);
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<{
    wasmTime: number;
    wasmOps: number;
    jsTime: number;
    jsOps: number;
    speedup: string;
    calculations: number;
  } | null>(null);

  const runBenchmark = () => {
    if (!wasmReady()) return;
    setIsRunning(true);

    setTimeout(() => {
      // Generate test inputs once
      const inputs = Array.from({ length: iterations }, () => ({
        temp: 25 + Math.random() * 15,
        hum: 40 + Math.random() * 50,
        wind: Math.random() * 10,
        solar: Math.random() * 1000,
      }));

      // Benchmark WASM (Rust)
      const wasmStart = performance.now();
      for (const { temp, hum, wind, solar } of inputs) {
        wasm.calculate_wbgt(temp, hum, wind, solar);
      }
      const wasmEnd = performance.now();
      const wasmDuration = wasmEnd - wasmStart;
      const wasmOps = (iterations / wasmDuration) * 1000;

      // Benchmark JS (the pure-JS fallback from wasm.ts)
      const jsStart = performance.now();
      for (const { temp, hum, wind, solar } of inputs) {
        jsCalculateWbgt(temp, hum, wind, solar);
      }
      const jsEnd = performance.now();
      const jsDuration = jsEnd - jsStart;
      const jsOps = (iterations / jsDuration) * 1000;

      const speedup = (jsDuration / wasmDuration).toFixed(1);

      setResults({
        wasmTime: wasmDuration,
        wasmOps,
        jsTime: jsDuration,
        jsOps,
        speedup,
        calculations: iterations,
      });
      setIsRunning(false);
    }, 100);
  };

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Performance Comparison: WASM vs JavaScript
        </h3>
      </div>
      <p className="text-gray-600 mb-6">
        Compare Rust WebAssembly against pure JavaScript for WBGT calculation speed
      </p>

      <div className="flex items-center space-x-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Iterations
          </label>
          <select
            value={iterations}
            onChange={(e) => setIterations(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2"
          >
            <option value={100}>100</option>
            <option value={1000}>1,000</option>
            <option value={10000}>10,000</option>
            <option value={100000}>100,000</option>
          </select>
        </div>
        <button
          onClick={runBenchmark}
          disabled={isRunning || !wasmReady()}
          className="btn-primary flex items-center space-x-2 mt-6"
        >
          <Zap className={`h-4 w-4 ${isRunning ? 'animate-pulse' : ''}`} />
          <span>{isRunning ? 'Running...' : 'Run Benchmark'}</span>
        </button>
      </div>

      {results && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-purple-50 rounded-lg text-center">
              <div className="text-xs text-purple-600 font-semibold mb-2">Rust WASM</div>
              <div className="text-2xl font-bold text-purple-700">
                {results.wasmOps.toFixed(0)}
              </div>
              <div className="text-sm text-purple-600">ops/sec</div>
              <div className="text-xs text-purple-500 mt-1">{results.wasmTime.toFixed(2)} ms</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg text-center">
              <div className="text-xs text-gray-600 font-semibold mb-2">JavaScript</div>
              <div className="text-2xl font-bold text-gray-700">
                {results.jsOps.toFixed(0)}
              </div>
              <div className="text-sm text-gray-600">ops/sec</div>
              <div className="text-xs text-gray-500 mt-1">{results.jsTime.toFixed(2)} ms</div>
            </div>
          </div>
          <div className="p-4 bg-green-50 rounded-lg text-center">
            <div className="text-sm text-green-600">WASM speedup</div>
            <div className="text-3xl font-bold text-green-700">{results.speedup}x</div>
            <div className="text-xs text-green-600 mt-1">
              {results.calculations.toLocaleString()} WBGT calculations each
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Demo() {
  const [wasmLoaded, setWasmLoaded] = useState(false);
  const [wasmError, setWasmError] = useState<string | null>(null);

  useEffect(() => {
    initWasm()
      .then(() => setWasmLoaded(true))
      .catch((err) => {
        console.error('[Demo] WASM init failed:', err);
        setWasmError(err.message || 'Failed to load WebAssembly module');
      });
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-gray-900">Interactive Demo</h1>
          {wasmLoaded ? (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
              WebAssembly loaded (174 KB)
            </span>
          ) : wasmError ? (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
              WASM failed
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
              Loading WASM...
            </span>
          )}
        </div>
        <p className="text-gray-500 mt-1">
          WBGT calculations powered by Rust compiled to WebAssembly (heatshield-wasm crate)
        </p>
      </div>

      {wasmError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          WebAssembly failed to load: {wasmError}. Calculations will not be available.
        </div>
      )}

      {wasmLoaded && (
        <div className="space-y-8">
          <WBGTCalculator />
          <DistrictSimulation />
          <PerformanceDemo />
        </div>
      )}

      {/* Info */}
      <div className="mt-8 p-4 bg-gray-50 border border-gray-200 rounded-xl">
        <h4 className="font-semibold text-gray-900 mb-2">About This Demo</h4>
        <p className="text-gray-600 text-sm">
          All WBGT calculations on this page are performed by the <code>heatshield-wasm</code> Rust
          crate, compiled to WebAssembly via <code>wasm-pack</code>. The 174 KB <code>.wasm</code> binary
          runs Stull (2011) wet-bulb, Liljegren (2008) globe temperature, and ISO 7243 WBGT
          formulas at near-native speed. The performance benchmark compares this against the
          equivalent pure-JavaScript implementation.
        </p>
      </div>
    </div>
  );
}
