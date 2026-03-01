/**
 * Weather API Service - Open-Meteo Integration
 *
 * Open-Meteo is a free, open-source weather API that provides:
 * - Current weather conditions
 * - Hourly forecasts up to 16 days
 * - All variables needed for WBGT calculation
 *
 * No API key required.
 */

export interface CurrentWeather {
  temperature: number;
  humidity: number;
  windSpeed: number;
  solarRadiation: number;
  weatherCode: number;
  time: string;
}

export interface HourlyWeather {
  time: string;
  temperature: number;
  humidity: number;
  windSpeed: number;
  solarRadiation: number;
  weatherCode: number;
}

export interface WeatherForecast {
  current: CurrentWeather;
  hourly: HourlyWeather[];
  location: {
    lat: number;
    lon: number;
    name?: string;
  };
  timezone: string;
}

export interface WeatherError {
  message: string;
  code: string;
}

const OPEN_METEO_BASE_URL = 'https://api.open-meteo.com/v1/forecast';

/**
 * Fetch weather data from Open-Meteo API
 */
export async function fetchWeatherData(
  lat: number,
  lon: number,
  locationName?: string
): Promise<WeatherForecast> {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    current: [
      'temperature_2m',
      'relative_humidity_2m',
      'wind_speed_10m',
      'weather_code',
      'shortwave_radiation'
    ].join(','),
    hourly: [
      'temperature_2m',
      'relative_humidity_2m',
      'wind_speed_10m',
      'weather_code',
      'shortwave_radiation'
    ].join(','),
    timezone: 'Africa/Kampala',
    forecast_days: '3' // 72 hours
  });

  const response = await fetch(`${OPEN_METEO_BASE_URL}?${params}`);

  if (!response.ok) {
    throw new Error(`Weather API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  // Transform Open-Meteo response to our format
  const current: CurrentWeather = {
    temperature: data.current.temperature_2m,
    humidity: data.current.relative_humidity_2m,
    windSpeed: data.current.wind_speed_10m / 3.6, // Convert km/h to m/s
    solarRadiation: data.current.shortwave_radiation || estimateSolarRadiation(new Date()),
    weatherCode: data.current.weather_code,
    time: data.current.time
  };

  const hourly: HourlyWeather[] = data.hourly.time.map((time: string, index: number) => ({
    time,
    temperature: data.hourly.temperature_2m[index],
    humidity: data.hourly.relative_humidity_2m[index],
    windSpeed: data.hourly.wind_speed_10m[index] / 3.6, // Convert km/h to m/s
    solarRadiation: data.hourly.shortwave_radiation?.[index] || estimateSolarRadiation(new Date(time)),
    weatherCode: data.hourly.weather_code[index]
  }));

  return {
    current,
    hourly,
    location: {
      lat,
      lon,
      name: locationName
    },
    timezone: data.timezone
  };
}

/**
 * Fetch weather for multiple locations (for heat map)
 */
export async function fetchMultipleLocations(
  locations: Array<{ lat: number; lon: number; name: string }>
): Promise<WeatherForecast[]> {
  const promises = locations.map(loc =>
    fetchWeatherData(loc.lat, loc.lon, loc.name)
  );

  // Use Promise.allSettled to handle partial failures gracefully
  const results = await Promise.allSettled(promises);

  return results
    .filter((result): result is PromiseFulfilledResult<WeatherForecast> =>
      result.status === 'fulfilled'
    )
    .map(result => result.value);
}

/**
 * Estimate solar radiation when not available from API
 * Based on time of day and typical equatorial patterns
 */
function estimateSolarRadiation(date: Date): number {
  const hour = date.getHours();

  // Night time - no solar radiation
  if (hour < 6 || hour > 18) {
    return 0;
  }

  // Calculate based on solar angle (simplified)
  const solarNoon = 12;
  const hoursFromNoon = Math.abs(hour - solarNoon);
  const maxRadiation = 900; // W/m² typical max for equatorial regions

  // Cosine curve for daily radiation pattern
  const radiation = maxRadiation * Math.cos((hoursFromNoon / 6) * (Math.PI / 2));

  return Math.max(0, radiation);
}

/**
 * Get weather description from WMO weather code
 */
export function getWeatherDescription(code: number): string {
  const descriptions: Record<number, string> = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Foggy',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    71: 'Slight snow',
    73: 'Moderate snow',
    75: 'Heavy snow',
    77: 'Snow grains',
    80: 'Slight rain showers',
    81: 'Moderate rain showers',
    82: 'Violent rain showers',
    85: 'Slight snow showers',
    86: 'Heavy snow showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with slight hail',
    99: 'Thunderstorm with heavy hail'
  };

  return descriptions[code] || 'Unknown';
}

/**
 * Get weather icon based on WMO code
 */
export function getWeatherIcon(code: number): string {
  if (code === 0) return '☀️';
  if (code <= 3) return '⛅';
  if (code <= 48) return '🌫️';
  if (code <= 55) return '🌧️';
  if (code <= 65) return '🌧️';
  if (code <= 77) return '❄️';
  if (code <= 82) return '🌦️';
  if (code >= 95) return '⛈️';
  return '🌤️';
}

/**
 * Cache for weather data to reduce API calls
 */
const weatherCache = new Map<string, { data: WeatherForecast; timestamp: number }>();
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

export async function fetchWeatherDataCached(
  lat: number,
  lon: number,
  locationName?: string
): Promise<WeatherForecast> {
  const cacheKey = `${lat.toFixed(2)},${lon.toFixed(2)}`;
  const cached = weatherCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  const data = await fetchWeatherData(lat, lon, locationName);
  weatherCache.set(cacheKey, { data, timestamp: Date.now() });

  return data;
}

/**
 * Clear weather cache
 */
export function clearWeatherCache(): void {
  weatherCache.clear();
}
