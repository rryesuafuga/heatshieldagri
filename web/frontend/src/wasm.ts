/**
 * WebAssembly Module Interface
 *
 * This module provides TypeScript bindings for the Rust WASM core.
 * In production, this would import from the compiled WASM package.
 * For the demo, we provide JavaScript implementations.
 */

export interface WbgtResult {
  wbgt: number;
  risk_level: string;
  risk_code: number;
  recommendation: string;
  color: string;
}

export interface GridPoint {
  lat: number;
  lon: number;
  value: number;
}

export interface HourlyForecast {
  hour: number;
  wbgt: number;
  temperature: number;
  humidity: number;
  wind_speed: number;
  solar_radiation: number;
}

export interface WorkSchedule {
  safe_hours: number[];
  total_safe_hours: number;
  recommended_start: number;
  recommended_end: number;
  break_schedule: string;
  productivity_score: number;
}

export interface District {
  id: number;
  name: string;
  region: string;
  lat: number;
  lon: number;
}

// Risk thresholds based on ISO 7243
const WBGT_LOW = 26.0;
const WBGT_MODERATE = 28.0;
const WBGT_HIGH = 30.0;
const WBGT_VERY_HIGH = 32.0;

/**
 * Calculate wet-bulb temperature using Stull formula
 */
export function calculateWetBulb(temperature: number, humidity: number): number {
  const t = temperature;
  const rh = humidity;

  return (
    t * Math.atan(0.151977 * Math.sqrt(rh + 8.313659)) +
    Math.atan(t + rh) -
    Math.atan(rh - 1.676331) +
    0.00391838 * Math.pow(rh, 1.5) * Math.atan(0.023101 * rh) -
    4.686035
  );
}

/**
 * Calculate globe temperature
 */
export function calculateGlobeTemperature(
  temperature: number,
  windSpeed: number,
  solarRadiation: number
): number {
  const emissivity = 0.95;
  const diameter = 0.15;
  const stefanBoltzmann = 5.67e-8;

  const hConv =
    windSpeed < 0.1
      ? 1.4 * Math.pow(Math.abs(temperature) / diameter, 0.25)
      : 6.3 * Math.pow(windSpeed, 0.6) / Math.pow(diameter, 0.4);

  const qSolar = 0.95 * solarRadiation;

  let tg = temperature + 10.0;

  for (let i = 0; i < 20; i++) {
    const qRadOut = emissivity * stefanBoltzmann * Math.pow(tg + 273.15, 4);
    const qRadIn = emissivity * stefanBoltzmann * Math.pow(temperature + 273.15, 4);
    const qConv = hConv * (tg - temperature);

    const residual = qSolar + qRadIn - qRadOut - qConv;
    const dqDtg = 4.0 * emissivity * stefanBoltzmann * Math.pow(tg + 273.15, 3) + hConv;
    tg += residual / dqDtg;
  }

  return tg;
}

/**
 * Calculate WBGT (Wet-Bulb Globe Temperature)
 */
export function calculateWbgt(
  temperature: number,
  humidity: number,
  windSpeed: number,
  solarRadiation: number
): WbgtResult {
  const tw = calculateWetBulb(temperature, humidity);
  const tg = calculateGlobeTemperature(temperature, windSpeed, solarRadiation);
  const wbgt = 0.7 * tw + 0.2 * tg + 0.1 * temperature;

  return classifyRisk(wbgt);
}

/**
 * Classify WBGT into risk level
 */
export function classifyRisk(wbgt: number): WbgtResult {
  let riskLevel: string;
  let riskCode: number;
  let recommendation: string;
  let color: string;

  if (wbgt < WBGT_LOW) {
    riskLevel = 'Low';
    riskCode = 0;
    recommendation =
      'Normal work schedule. Stay hydrated with 250ml water every 30 minutes.';
    color = '#22c55e';
  } else if (wbgt < WBGT_MODERATE) {
    riskLevel = 'Moderate';
    riskCode = 1;
    recommendation =
      'Take 15-minute breaks every hour. Increase water intake to 500ml per hour. Wear light, loose clothing.';
    color = '#eab308';
  } else if (wbgt < WBGT_HIGH) {
    riskLevel = 'High';
    riskCode = 2;
    recommendation =
      'Work only during cooler hours (5-10am, 4-6pm). Take 30-minute breaks per hour. Seek shade frequently.';
    color = '#f97316';
  } else if (wbgt < WBGT_VERY_HIGH) {
    riskLevel = 'Very High';
    riskCode = 3;
    recommendation =
      'Limit outdoor work to 6-10am only. Extended midday break required. Monitor all workers for heat stress.';
    color = '#ef4444';
  } else {
    riskLevel = 'Extreme';
    riskCode = 4;
    recommendation =
      'SUSPEND all outdoor agricultural work. Emergency protocols active. This is a life-threatening heat event.';
    color = '#7c2d12';
  }

  return { wbgt, risk_level: riskLevel, risk_code: riskCode, recommendation, color };
}

/**
 * Generate demo 24-hour forecast
 */
export function generateDemoForecast(baseTemp: number, humidity: number): HourlyForecast[] {
  const forecasts: HourlyForecast[] = [];

  for (let hour = 0; hour < 24; hour++) {
    const hourFactor = Math.abs(Math.abs(hour - 14) / 12 - 1);
    const temp = baseTemp - 8 + hourFactor * 12;

    let solar = 0;
    if (hour >= 6 && hour <= 18) {
      const solarHour = Math.abs(hour - 12);
      solar = (1 - solarHour / 6) * 900;
    }

    const wind = hour >= 8 && hour <= 18 ? 3.0 : 1.5;
    const result = calculateWbgt(temp, humidity, wind, solar);

    forecasts.push({
      hour,
      wbgt: result.wbgt,
      temperature: temp,
      humidity,
      wind_speed: wind,
      solar_radiation: solar,
    });
  }

  return forecasts;
}

/**
 * Generate 72-hour forecast
 */
export function generate72hForecast(baseTemp: number, humidity: number): HourlyForecast[] {
  const forecasts: HourlyForecast[] = [];

  for (let i = 0; i < 72; i++) {
    const hour = i % 24;
    const day = Math.floor(i / 24);
    const dayOffset = (day - 1) * 1.5;
    const tempBase = baseTemp + dayOffset;

    const hourFactor = Math.abs(Math.abs(hour - 14) / 12 - 1);
    const temp = tempBase - 8 + hourFactor * 12;

    let solar = 0;
    if (hour >= 6 && hour <= 18) {
      const solarHour = Math.abs(hour - 12);
      solar = (1 - solarHour / 6) * 900;
    }

    const wind = hour >= 8 && hour <= 18 ? 3.0 : 1.5;
    const result = calculateWbgt(temp, humidity, wind, solar);

    forecasts.push({
      hour,
      wbgt: result.wbgt,
      temperature: temp,
      humidity: humidity + (Math.random() - 0.5) * 10,
      wind_speed: wind + (Math.random() - 0.5) * 1,
      solar_radiation: solar,
    });
  }

  return forecasts;
}

/**
 * Optimize work schedule
 */
export function optimizeWorkSchedule(
  forecast: HourlyForecast[],
  workHoursNeeded: number
): WorkSchedule {
  const hourScores = forecast.map((f) => ({ hour: f.hour, wbgt: f.wbgt }));
  hourScores.sort((a, b) => a.wbgt - b.wbgt);

  const safeHours = hourScores
    .slice(0, Math.min(workHoursNeeded, 12))
    .map((h) => h.hour)
    .sort((a, b) => a - b);

  const avgWbgt =
    hourScores.slice(0, workHoursNeeded).reduce((sum, h) => sum + h.wbgt, 0) /
    workHoursNeeded;

  const productivityScore = Math.max(0, Math.min(100, ((40 - avgWbgt) / 40) * 100));

  let breakSchedule: string;
  if (avgWbgt < 26) {
    breakSchedule = 'Take a 10-minute break every 2 hours. Drink water during breaks.';
  } else if (avgWbgt < 28) {
    breakSchedule = 'Take a 15-minute break every hour. Stay in shade during breaks.';
  } else if (avgWbgt < 30) {
    breakSchedule = 'Take a 20-minute break every 45 minutes. Rest in coolest available area.';
  } else {
    breakSchedule =
      'Take a 30-minute break every 30 minutes. Only essential work. Monitor for heat illness.';
  }

  return {
    safe_hours: safeHours,
    total_safe_hours: safeHours.length,
    recommended_start: safeHours[0] ?? 6,
    recommended_end: safeHours[safeHours.length - 1] ?? 17,
    break_schedule: breakSchedule,
    productivity_score: productivityScore,
  };
}

/**
 * Get Uganda districts
 */
export function getUgandaDistricts(): District[] {
  return [
    { id: 1, name: 'Kampala', region: 'Central', lat: 0.3476, lon: 32.5825 },
    { id: 2, name: 'Wakiso', region: 'Central', lat: 0.4044, lon: 32.4594 },
    { id: 3, name: 'Mukono', region: 'Central', lat: 0.3533, lon: 32.7553 },
    { id: 4, name: 'Jinja', region: 'Eastern', lat: 0.4244, lon: 33.2041 },
    { id: 5, name: 'Mbale', region: 'Eastern', lat: 1.0647, lon: 34.1797 },
    { id: 6, name: 'Gulu', region: 'Northern', lat: 2.7747, lon: 32.299 },
    { id: 7, name: 'Lira', region: 'Northern', lat: 2.2499, lon: 32.8998 },
    { id: 8, name: 'Mbarara', region: 'Western', lat: -0.6072, lon: 30.6545 },
    { id: 9, name: 'Kabale', region: 'Western', lat: -1.2508, lon: 29.9894 },
    { id: 10, name: 'Fort Portal', region: 'Western', lat: 0.671, lon: 30.275 },
    { id: 11, name: 'Masaka', region: 'Central', lat: -0.3136, lon: 31.735 },
    { id: 12, name: 'Arua', region: 'Northern', lat: 3.0203, lon: 30.9107 },
  ];
}

/**
 * Haversine distance in kilometers
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate heat index
 */
export function calculateHeatIndex(temperature: number, humidity: number): number {
  const t = (temperature * 9) / 5 + 32;
  const r = humidity;

  if (t < 80) return temperature;

  let hi =
    -42.379 +
    2.04901523 * t +
    10.14333127 * r -
    0.22475541 * t * r -
    0.00683783 * t * t -
    0.05481717 * r * r +
    0.00122874 * t * t * r +
    0.00085282 * t * r * r -
    0.00000199 * t * t * r * r;

  if (r < 13 && t >= 80 && t <= 112) {
    hi -= ((13 - r) / 4) * Math.sqrt((17 - Math.abs(t - 95)) / 17);
  } else if (r > 85 && t >= 80 && t <= 87) {
    hi += ((r - 85) / 10) * ((87 - t) / 5);
  }

  return ((hi - 32) * 5) / 9;
}

/**
 * Get risk color
 */
export function getRiskColor(wbgt: number): string {
  if (wbgt < WBGT_LOW) return '#22c55e';
  if (wbgt < WBGT_MODERATE) return '#eab308';
  if (wbgt < WBGT_HIGH) return '#f97316';
  if (wbgt < WBGT_VERY_HIGH) return '#ef4444';
  return '#7c2d12';
}

/**
 * Get risk level number
 */
export function getRiskLevel(wbgt: number): number {
  if (wbgt < WBGT_LOW) return 0;
  if (wbgt < WBGT_MODERATE) return 1;
  if (wbgt < WBGT_HIGH) return 2;
  if (wbgt < WBGT_VERY_HIGH) return 3;
  return 4;
}
