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
import {
  calculateWbgt,
  calculateWetBulb,
  calculateHeatIndex,
  classifyRisk,
  getUgandaDistricts,
  optimizeWorkSchedule,
  generateDemoForecast,
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
    const wbgtResult = calculateWbgt(temperature, humidity, windSpeed, solarRadiation);
    setResult(wbgtResult);
    setWetBulb(calculateWetBulb(temperature, humidity));
    setHeatIndex(calculateHeatIndex(temperature, humidity));
  }, [temperature, humidity, windSpeed, solarRadiation]);

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">
        WBGT Calculator (Powered by WebAssembly)
      </h3>

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
    const baseTemp = 28 + selectedDistrictId * 0.5;
    const humidity = 60 + (selectedDistrictId % 5) * 3;
    const forecast = generateDemoForecast(baseTemp, humidity);

    const data = forecast.slice(0, currentHour + 1).map((f) => ({
      hour: `${f.hour.toString().padStart(2, '0')}:00`,
      wbgt: f.wbgt,
    }));

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
      <h3 className="text-lg font-semibold text-gray-900 mb-6">
        24-Hour District Simulation
      </h3>

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
    time: number;
    opsPerSecond: number;
    calculations: number;
  } | null>(null);

  const runBenchmark = () => {
    setIsRunning(true);

    setTimeout(() => {
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        const temp = 25 + Math.random() * 15;
        const humidity = 40 + Math.random() * 50;
        const wind = Math.random() * 10;
        const solar = Math.random() * 1000;
        calculateWbgt(temp, humidity, wind, solar);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;
      const opsPerSecond = (iterations / duration) * 1000;

      setResults({
        time: duration,
        opsPerSecond,
        calculations: iterations,
      });
      setIsRunning(false);
    }, 100);
  };

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        WebAssembly Performance Demo
      </h3>
      <p className="text-gray-600 mb-6">
        Test the performance of WBGT calculations running in WebAssembly
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
          disabled={isRunning}
          className="btn-primary flex items-center space-x-2 mt-6"
        >
          <Zap className={`h-4 w-4 ${isRunning ? 'animate-pulse' : ''}`} />
          <span>{isRunning ? 'Running...' : 'Run Benchmark'}</span>
        </button>
      </div>

      {results && (
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-green-50 rounded-lg text-center">
            <Gauge className="h-6 w-6 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-green-700">
              {results.opsPerSecond.toFixed(0)}
            </div>
            <div className="text-sm text-green-600">Operations/sec</div>
          </div>
          <div className="p-4 bg-blue-50 rounded-lg text-center">
            <Zap className="h-6 w-6 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-blue-700">
              {results.time.toFixed(2)}
            </div>
            <div className="text-sm text-blue-600">Milliseconds</div>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg text-center">
            <Thermometer className="h-6 w-6 text-purple-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-purple-700">
              {results.calculations.toLocaleString()}
            </div>
            <div className="text-sm text-purple-600">Calculations</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Demo() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Interactive Demo</h1>
        <p className="text-gray-500 mt-1">
          Explore HeatShield Agri's WBGT calculations and predictions
        </p>
      </div>

      <div className="space-y-8">
        <WBGTCalculator />
        <DistrictSimulation />
        <PerformanceDemo />
      </div>

      {/* Info */}
      <div className="mt-8 p-4 bg-gray-50 border border-gray-200 rounded-xl">
        <h4 className="font-semibold text-gray-900 mb-2">About This Demo</h4>
        <p className="text-gray-600 text-sm">
          This demo showcases the HeatShield Agri web platform powered by Rust compiled to
          WebAssembly. The WBGT calculations run directly in your browser at near-native
          speed. In production, this same code runs server-side for prediction generation
          and client-side for real-time interactivity.
        </p>
      </div>
    </div>
  );
}
