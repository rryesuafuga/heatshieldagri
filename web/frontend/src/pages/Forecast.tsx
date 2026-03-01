import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  AreaChart,
} from 'recharts';
import { Calendar, Clock, TrendingUp, AlertTriangle, Loader2, CloudOff, RefreshCw } from 'lucide-react';
import { useAppStore } from '../store';
import { classifyRisk, getUgandaDistricts, HourlyForecast } from '../wasm';
import { useWeather, transformToWbgtForecast } from '../hooks/useWeather';
import MLForecastPanel from './MLForecastPanel';

function DaySelector({
  selectedDay,
  onChange,
  dates,
}: {
  selectedDay: number;
  onChange: (day: number) => void;
  dates: string[];
}) {
  const labels = ['Today', 'Tomorrow', 'Day 3'];

  return (
    <div className="flex space-x-2">
      {labels.map((label, idx) => (
        <button
          key={idx}
          onClick={() => onChange(idx)}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            selectedDay === idx
              ? 'bg-green-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <span className="block">{label}</span>
          {dates[idx] && (
            <span className="block text-xs opacity-75">{dates[idx]}</span>
          )}
        </button>
      ))}
    </div>
  );
}

function ForecastChart({ data, day }: { data: HourlyForecast[]; day: number }) {
  const dayData = data.slice(day * 24, (day + 1) * 24).map((f, idx) => ({
    hour: `${idx.toString().padStart(2, '0')}:00`,
    wbgt: f.wbgt,
    temperature: f.temperature,
    humidity: f.humidity,
  }));

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={dayData}>
          <defs>
            <linearGradient id="wbgtGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
              <stop offset="50%" stopColor="#eab308" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="hour" tick={{ fontSize: 12 }} />
          <YAxis
            domain={[15, 40]}
            tick={{ fontSize: 12 }}
            label={{
              value: 'WBGT (°C)',
              angle: -90,
              position: 'insideLeft',
              fontSize: 12,
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
            }}
            formatter={(value: number) => [`${value.toFixed(1)}°C`, 'WBGT']}
          />
          <ReferenceLine y={26} stroke="#22c55e" strokeDasharray="3 3" label="Low" />
          <ReferenceLine y={28} stroke="#eab308" strokeDasharray="3 3" label="Moderate" />
          <ReferenceLine y={30} stroke="#f97316" strokeDasharray="3 3" label="High" />
          <ReferenceLine y={32} stroke="#ef4444" strokeDasharray="3 3" label="Very High" />
          <Area
            type="monotone"
            dataKey="wbgt"
            stroke="#ef4444"
            fill="url(#wbgtGradient)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function HourlyBreakdown({ data, day }: { data: HourlyForecast[]; day: number }) {
  const dayData = data.slice(day * 24, (day + 1) * 24);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Hour
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              WBGT
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Risk
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Temp
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Humidity
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Work Status
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {dayData.map((f, idx) => {
            const risk = classifyRisk(f.wbgt);
            const riskBadge: Record<string, string> = {
              Low: 'bg-green-100 text-green-800',
              Moderate: 'bg-yellow-100 text-yellow-800',
              High: 'bg-orange-100 text-orange-800',
              'Very High': 'bg-red-100 text-red-800',
              Extreme: 'bg-red-900 text-white',
            };
            const workStatus =
              risk.risk_code <= 1 ? 'Safe to work' : risk.risk_code <= 2 ? 'Limited work' : 'Rest';

            return (
              <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                  {idx.toString().padStart(2, '0')}:00
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                  {f.wbgt.toFixed(1)}°C
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      riskBadge[risk.risk_level]
                    }`}
                  >
                    {risk.risk_level}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                  {f.temperature.toFixed(1)}°C
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                  {f.humidity.toFixed(0)}%
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm">
                  <span
                    className={
                      workStatus === 'Safe to work'
                        ? 'text-green-600'
                        : workStatus === 'Limited work'
                        ? 'text-orange-600'
                        : 'text-red-600'
                    }
                  >
                    {workStatus}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function DailySummary({ data, day }: { data: HourlyForecast[]; day: number }) {
  const dayData = data.slice(day * 24, (day + 1) * 24);

  if (dayData.length === 0) return null;

  const maxWbgt = Math.max(...dayData.map((f) => f.wbgt));
  const minWbgt = Math.min(...dayData.map((f) => f.wbgt));
  const avgWbgt = dayData.reduce((sum, f) => sum + f.wbgt, 0) / dayData.length;
  const safeHours = dayData.filter((f) => f.wbgt < 28).length;
  const peakHour = dayData.findIndex((f) => f.wbgt === maxWbgt);

  const overallRisk = classifyRisk(maxWbgt);

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      <div className="card text-center">
        <div className="text-sm text-gray-500 mb-1">Peak WBGT</div>
        <div className="text-2xl font-bold" style={{ color: overallRisk.color }}>
          {maxWbgt.toFixed(1)}°C
        </div>
        <div className="text-xs text-gray-400">at {peakHour}:00</div>
      </div>
      <div className="card text-center">
        <div className="text-sm text-gray-500 mb-1">Minimum WBGT</div>
        <div className="text-2xl font-bold text-green-600">{minWbgt.toFixed(1)}°C</div>
        <div className="text-xs text-gray-400">early morning</div>
      </div>
      <div className="card text-center">
        <div className="text-sm text-gray-500 mb-1">Average WBGT</div>
        <div className="text-2xl font-bold text-gray-700">{avgWbgt.toFixed(1)}°C</div>
      </div>
      <div className="card text-center">
        <div className="text-sm text-gray-500 mb-1">Safe Work Hours</div>
        <div className="text-2xl font-bold text-blue-600">{safeHours}</div>
        <div className="text-xs text-gray-400">hours below 28°C</div>
      </div>
      <div className="card text-center">
        <div className="text-sm text-gray-500 mb-1">Risk Level</div>
        <div
          className="text-lg font-bold"
          style={{ color: overallRisk.color }}
        >
          {overallRisk.risk_level}
        </div>
      </div>
    </div>
  );
}

function calculateBestWorkWindows(forecast: HourlyForecast[]): { morning: string; evening: string } {
  const todayData = forecast.slice(0, 24);

  // Find morning safe hours (5am - 12pm)
  const morningHours = todayData.filter((f, idx) => idx >= 5 && idx <= 11 && f.wbgt < 28);
  const morningStart = morningHours.length > 0 ? morningHours[0].hour : 5;
  const morningEnd = morningHours.length > 0 ? morningHours[morningHours.length - 1].hour + 1 : 10;

  // Find evening safe hours (4pm - 7pm)
  const eveningHours = todayData.filter((f, idx) => idx >= 16 && idx <= 19 && f.wbgt < 28);
  const eveningStart = eveningHours.length > 0 ? eveningHours[0].hour : 16;
  const eveningEnd = eveningHours.length > 0 ? eveningHours[eveningHours.length - 1].hour + 1 : 18;

  return {
    morning: `${morningStart}:00 AM - ${morningEnd > 12 ? morningEnd - 12 : morningEnd}:00 ${morningEnd >= 12 ? 'PM' : 'AM'}`,
    evening: `${eveningStart > 12 ? eveningStart - 12 : eveningStart}:00 PM - ${eveningEnd > 12 ? eveningEnd - 12 : eveningEnd}:30 PM`
  };
}

function LoadingState() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="h-12 w-12 text-green-600 animate-spin mb-4" />
        <p className="text-gray-600">Loading 72-hour forecast...</p>
        <p className="text-sm text-gray-400 mt-2">Fetching weather predictions from Open-Meteo</p>
      </div>
    </div>
  );
}

function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <CloudOff className="h-12 w-12 text-red-500 mb-4" />
        <p className="text-gray-900 font-medium mb-2">Unable to load forecast data</p>
        <p className="text-sm text-gray-500 mb-4">{error}</p>
        <button onClick={onRetry} className="btn-primary flex items-center space-x-2">
          <RefreshCw className="h-4 w-4" />
          <span>Try Again</span>
        </button>
      </div>
    </div>
  );
}

export default function Forecast() {
  const { selectedDistrict, setSelectedDistrict } = useAppStore();
  const [selectedDay, setSelectedDay] = useState(0);
  const districts = getUgandaDistricts();

  // Set default district if none selected
  useEffect(() => {
    if (!selectedDistrict) {
      setSelectedDistrict(districts[0]);
    }
  }, [selectedDistrict, setSelectedDistrict, districts]);

  // Fetch real weather data
  const {
    data: weather,
    isLoading,
    isError,
    error,
    refetch,
  } = useWeather(
    selectedDistrict?.lat || null,
    selectedDistrict?.lon || null,
    selectedDistrict?.name
  );

  if (isLoading) {
    return <LoadingState />;
  }

  if (isError) {
    return (
      <ErrorState
        error={error instanceof Error ? error.message : 'Unknown error'}
        onRetry={() => refetch()}
      />
    );
  }

  if (!weather) {
    return <LoadingState />;
  }

  // Transform to WBGT forecast
  const forecast = transformToWbgtForecast(weather);

  // Get dates for the 3 days
  const dates = [0, 1, 2].map(dayOffset => {
    const date = new Date();
    date.setDate(date.getDate() + dayOffset);
    return date.toLocaleDateString('en-UG', { weekday: 'short', day: 'numeric' });
  });

  const workWindows = calculateBestWorkWindows(forecast);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">72-Hour Forecast</h1>
          <p className="text-gray-500 mt-1">
            Real-time WBGT predictions for {selectedDistrict?.name || 'your location'}
          </p>
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 mt-2">
            Live Data from Open-Meteo
          </span>
        </div>
        <DaySelector selectedDay={selectedDay} onChange={setSelectedDay} dates={dates} />
      </div>

      {/* Daily Summary */}
      {forecast.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {selectedDay === 0 ? "Today's" : selectedDay === 1 ? "Tomorrow's" : 'Day 3'} Summary
          </h2>
          <DailySummary data={forecast} day={selectedDay} />
        </div>
      )}

      {/* Chart */}
      <div className="card mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">WBGT Forecast</h2>
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-gray-500">Low (&lt;26°C)</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <span className="text-gray-500">Moderate</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 rounded-full bg-orange-500"></div>
              <span className="text-gray-500">High</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-gray-500">Very High</span>
            </div>
          </div>
        </div>
        {forecast.length > 0 && <ForecastChart data={forecast} day={selectedDay} />}
      </div>

      {/* Hourly Breakdown Table */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Hourly Breakdown</h2>
        {forecast.length > 0 && <HourlyBreakdown data={forecast} day={selectedDay} />}
      </div>

      {/* ML-Enhanced Forecast */}
      <div className="mt-8">
        <MLForecastPanel
          district={selectedDistrict?.name || 'Kampala'}
          forecastHours={24}
        />
      </div>

      {/* Recommendations */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center space-x-2 mb-4">
            <Clock className="h-5 w-5 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900">Best Work Windows</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <span className="font-medium text-green-800">Morning</span>
              <span className="text-green-600">{workWindows.morning}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
              <span className="font-medium text-yellow-800">Evening</span>
              <span className="text-yellow-600">{workWindows.evening}</span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <h3 className="text-lg font-semibold text-gray-900">Hours to Avoid</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
              <span className="font-medium text-red-800">Peak Heat</span>
              <span className="text-red-600">11:00 AM - 4:00 PM</span>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Outdoor agricultural work during peak hours significantly increases heat stress risk.
              Reschedule heavy tasks to early morning.
            </p>
          </div>
        </div>
      </div>

      {/* Data Source Attribution */}
      <div className="mt-8 text-center text-xs text-gray-400">
        Forecast data provided by{' '}
        <a
          href="https://open-meteo.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-green-600 hover:underline"
        >
          Open-Meteo.com
        </a>
        {' '}• WBGT calculated using ISO 7243 standard
      </div>
    </div>
  );
}
