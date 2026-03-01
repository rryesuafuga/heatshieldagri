/**
 * React Query hooks for weather data
 */

import { useQuery } from '@tanstack/react-query';
import {
  fetchWeatherDataCached,
  fetchMultipleLocations,
  WeatherForecast
} from '../services/weatherApi';
import { calculateWbgt, HourlyForecast } from '../wasm';
import { getUgandaDistricts, District } from '../wasm';

/**
 * Hook to fetch current weather and forecast for a location
 */
export function useWeather(lat: number | null, lon: number | null, locationName?: string) {
  return useQuery({
    queryKey: ['weather', lat, lon],
    queryFn: () => {
      if (lat === null || lon === null) {
        throw new Error('Location not provided');
      }
      return fetchWeatherDataCached(lat, lon, locationName);
    },
    enabled: lat !== null && lon !== null,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // Refetch every 10 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  });
}

/**
 * Hook to fetch weather for all Uganda districts (for heat map)
 */
export function useUgandaWeather() {
  const districts = getUgandaDistricts();

  return useQuery({
    queryKey: ['uganda-weather'],
    queryFn: () =>
      fetchMultipleLocations(
        districts.map((d) => ({ lat: d.lat, lon: d.lon, name: d.name }))
      ),
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval: 15 * 60 * 1000, // Refetch every 15 minutes
    retry: 2
  });
}

/**
 * Transform API weather data to WBGT forecast format
 */
export function transformToWbgtForecast(weather: WeatherForecast): HourlyForecast[] {
  return weather.hourly.map((hour) => {
    const result = calculateWbgt(
      hour.temperature,
      hour.humidity,
      hour.windSpeed,
      hour.solarRadiation
    );

    const hourNum = new Date(hour.time).getHours();

    return {
      hour: hourNum,
      wbgt: result.wbgt,
      temperature: hour.temperature,
      humidity: hour.humidity,
      wind_speed: hour.windSpeed,
      solar_radiation: hour.solarRadiation
    };
  });
}

/**
 * Get current hour's forecast from the hourly data
 */
export function getCurrentHourForecast(weather: WeatherForecast): HourlyForecast | null {
  const now = new Date();
  const currentHour = now.getHours();

  const currentData = weather.hourly.find((h) => {
    const hourDate = new Date(h.time);
    return (
      hourDate.getDate() === now.getDate() &&
      hourDate.getHours() === currentHour
    );
  });

  if (!currentData) return null;

  const result = calculateWbgt(
    currentData.temperature,
    currentData.humidity,
    currentData.windSpeed,
    currentData.solarRadiation
  );

  return {
    hour: currentHour,
    wbgt: result.wbgt,
    temperature: currentData.temperature,
    humidity: currentData.humidity,
    wind_speed: currentData.windSpeed,
    solar_radiation: currentData.solarRadiation
  };
}

/**
 * Calculate district heat data for map
 */
export interface DistrictHeatData {
  district: District;
  wbgt: number;
  riskLevel: string;
  temperature: number;
  humidity: number;
}

export function calculateDistrictHeatData(
  weatherData: WeatherForecast[]
): DistrictHeatData[] {
  const districts = getUgandaDistricts();

  return weatherData.map((weather, index) => {
    const district = districts[index];
    const result = calculateWbgt(
      weather.current.temperature,
      weather.current.humidity,
      weather.current.windSpeed,
      weather.current.solarRadiation
    );

    return {
      district,
      wbgt: result.wbgt,
      riskLevel: result.risk_level,
      temperature: weather.current.temperature,
      humidity: weather.current.humidity
    };
  });
}
