import React from 'react';
import {
  Sun,
  Droplets,
  Wind,
  Thermometer,
  AlertTriangle,
  Clock,
  MapPin,
  RefreshCw,
  Loader2,
  CloudOff,
} from 'lucide-react';
import { useAppStore, useTranslation } from '../store';
import {
  calculateWbgt,
  optimizeWorkSchedule,
  getUgandaDistricts,
  WbgtResult,
  HourlyForecast,
} from '../wasm';
import { useWeather, transformToWbgtForecast } from '../hooks/useWeather';
import { getWeatherDescription, getWeatherIcon } from '../services/weatherApi';

function RiskIndicator({ result }: { result: WbgtResult }) {
  const riskStyles: Record<string, string> = {
    Low: 'bg-green-100 text-green-800 border-green-300',
    Moderate: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    High: 'bg-orange-100 text-orange-800 border-orange-300',
    'Very High': 'bg-red-100 text-red-800 border-red-300',
    Extreme: 'bg-red-900 text-white border-red-700',
  };

  return (
    <div
      className={`rounded-xl p-6 border-2 ${riskStyles[result.risk_level] || riskStyles.Low}`}
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-lg font-semibold">Heat Stress Risk</span>
        <AlertTriangle className="h-6 w-6" />
      </div>
      <div className="text-4xl font-bold mb-2">{result.wbgt.toFixed(1)}°C</div>
      <div className="text-xl font-medium mb-3">{result.risk_level} Risk</div>
      <p className="text-sm opacity-90">{result.recommendation}</p>
    </div>
  );
}

function WeatherCard({
  icon: Icon,
  label,
  value,
  unit,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  unit: string;
}) {
  return (
    <div className="card">
      <div className="flex items-center space-x-3 mb-2">
        <Icon className="h-5 w-5 text-gray-500" />
        <span className="text-sm text-gray-500">{label}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900">
        {value.toFixed(1)}
        <span className="text-sm font-normal text-gray-500 ml-1">{unit}</span>
      </div>
    </div>
  );
}

function HourlyForecastCard({ forecasts }: { forecasts: HourlyForecast[] }) {
  const now = new Date().getHours();
  // Get next 8 hours starting from current hour
  const startIndex = forecasts.findIndex(f => f.hour === now);
  const upcomingForecasts = startIndex >= 0
    ? forecasts.slice(startIndex, startIndex + 8)
    : forecasts.slice(0, 8);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Next 8 Hours</h3>
        <Clock className="h-5 w-5 text-gray-400" />
      </div>
      <div className="grid grid-cols-8 gap-2">
        {upcomingForecasts.map((f, idx) => {
          const color =
            f.wbgt < 26
              ? 'bg-green-100 text-green-800'
              : f.wbgt < 28
              ? 'bg-yellow-100 text-yellow-800'
              : f.wbgt < 30
              ? 'bg-orange-100 text-orange-800'
              : 'bg-red-100 text-red-800';

          return (
            <div key={idx} className="text-center">
              <div className="text-xs text-gray-500 mb-1">
                {f.hour.toString().padStart(2, '0')}:00
              </div>
              <div className={`rounded-lg p-2 ${color}`}>
                <div className="text-sm font-bold">{f.wbgt.toFixed(0)}°</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="h-12 w-12 text-green-600 animate-spin mb-4" />
        <p className="text-gray-600">Loading weather data...</p>
        <p className="text-sm text-gray-400 mt-2">Fetching real-time conditions from Open-Meteo</p>
      </div>
    </div>
  );
}

function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <CloudOff className="h-12 w-12 text-red-500 mb-4" />
        <p className="text-gray-900 font-medium mb-2">Unable to load weather data</p>
        <p className="text-sm text-gray-500 mb-4">{error}</p>
        <button onClick={onRetry} className="btn-primary flex items-center space-x-2">
          <RefreshCw className="h-4 w-4" />
          <span>Try Again</span>
        </button>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { t } = useTranslation();
  const { selectedDistrict, setSelectedDistrict } = useAppStore();
  const districts = getUgandaDistricts();

  // Set default district if none selected
  React.useEffect(() => {
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
    isFetching,
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

  // Calculate WBGT from real weather data
  const wbgtResult = calculateWbgt(
    weather.current.temperature,
    weather.current.humidity,
    weather.current.windSpeed,
    weather.current.solarRadiation
  );

  // Transform hourly data to forecast format
  const forecast = transformToWbgtForecast(weather);

  // Get today's forecast (first 24 hours)
  const todayForecast = forecast.slice(0, 24);

  // Calculate optimized work schedule
  const schedule = todayForecast.length > 0 ? optimizeWorkSchedule(todayForecast, 8) : null;

  // Format last update time
  const lastUpdate = new Date(weather.current.time);
  const lastUpdateStr = lastUpdate.toLocaleTimeString('en-UG', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('dashboard')}</h1>
          <p className="text-gray-500 mt-1">
            Real-time heat stress monitoring for agricultural workers
          </p>
          <div className="flex items-center space-x-2 mt-2">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Live Data
            </span>
            <span className="text-xs text-gray-400">
              Last updated: {lastUpdateStr}
            </span>
            <span className="text-xs text-gray-400">
              {getWeatherIcon(weather.current.weatherCode)} {getWeatherDescription(weather.current.weatherCode)}
            </span>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 bg-white rounded-lg border border-gray-200 px-3 py-2">
            <MapPin className="h-4 w-4 text-gray-400" />
            <select
              value={selectedDistrict?.id || ''}
              onChange={(e) => {
                const district = districts.find((d) => d.id === Number(e.target.value));
                setSelectedDistrict(district || null);
              }}
              className="bg-transparent border-none focus:outline-none text-sm"
            >
              {districts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}, {d.region}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="btn-primary flex items-center space-x-2"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Risk Indicator - Large */}
        <div className="lg:col-span-1">
          <RiskIndicator result={wbgtResult} />

          {/* Work Schedule Summary */}
          {schedule && (
            <div className="card mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Today's Safe Work Hours
              </h3>
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-500">Recommended Hours</span>
                <span className="font-medium">
                  {schedule.recommended_start}:00 - {schedule.recommended_end}:00
                </span>
              </div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-500">Total Safe Hours</span>
                <span className="font-medium">{schedule.total_safe_hours} hours</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Productivity Score</span>
                <div className="flex items-center space-x-2">
                  <div className="w-24 h-2 bg-gray-200 rounded-full">
                    <div
                      className="h-2 bg-green-500 rounded-full"
                      style={{ width: `${schedule.productivity_score}%` }}
                    />
                  </div>
                  <span className="font-medium">{schedule.productivity_score.toFixed(0)}%</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Weather Conditions */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <WeatherCard
              icon={Thermometer}
              label="Temperature"
              value={weather.current.temperature}
              unit="°C"
            />
            <WeatherCard
              icon={Droplets}
              label="Humidity"
              value={weather.current.humidity}
              unit="%"
            />
            <WeatherCard
              icon={Wind}
              label="Wind Speed"
              value={weather.current.windSpeed}
              unit="m/s"
            />
            <WeatherCard
              icon={Sun}
              label="Solar Radiation"
              value={weather.current.solarRadiation}
              unit="W/m²"
            />
          </div>

          {/* Hourly Forecast */}
          <HourlyForecastCard forecasts={todayForecast} />

          {/* Break Schedule */}
          {schedule && (
            <div className="card mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Break Schedule Recommendation
              </h3>
              <p className="text-gray-600">{schedule.break_schedule}</p>
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <div className="flex items-start space-x-3">
                  <Droplets className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-900">Hydration Reminder</p>
                    <p className="text-sm text-blue-700">
                      Drink at least 500ml of water every hour. Watch for signs of
                      dehydration: headache, dizziness, dark urine.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Warning Banner (if high risk) */}
      {wbgtResult.risk_code >= 2 && (
        <div className="mt-8 p-4 bg-orange-50 border border-orange-200 rounded-xl">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-6 w-6 text-orange-600 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-orange-900">Heat Warning Active</h4>
              <p className="text-orange-700 mt-1">
                Current conditions pose elevated heat stress risk. Follow the recommended
                work schedule and take regular breaks in shaded areas. Monitor workers for
                symptoms of heat-related illness.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Data Source Attribution */}
      <div className="mt-8 text-center text-xs text-gray-400">
        Weather data provided by{' '}
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
