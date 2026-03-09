import React, { useState, useEffect, useRef } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import { Clock, Sun, Coffee, Droplets, AlertCircle, CheckCircle2, Cpu, Beaker } from 'lucide-react';
import { useAppStore } from '../store';
import { useHeatShieldML } from '../hooks/useHeatShieldML';
import {
  calculateWbgt,
  optimizeWorkSchedule,
  classifyRisk,
  getUgandaDistricts,
  HourlyForecast,
  WorkSchedule,
} from '../wasm';
import type { WBGTForecast } from '../ml-inference';

// ---- Helpers ----

function TimeSlot({
  hour,
  wbgt,
  isRecommended,
}: {
  hour: number;
  wbgt: number;
  isRecommended: boolean;
}) {
  const risk = classifyRisk(wbgt);
  // Use risk color for recommended slots, muted gray for non-recommended
  const valueColor = isRecommended ? risk.color : '#9ca3af';
  const badgeColor = isRecommended ? risk.color : '#9ca3af';

  return (
    <div
      className={`relative p-3 rounded-lg border-2 transition-all ${
        isRecommended
          ? 'border-green-500 bg-green-50'
          : 'border-gray-200 bg-gray-50 opacity-60'
      }`}
    >
      {isRecommended && (
        <div className="absolute -top-2 -right-2">
          <CheckCircle2 className="h-5 w-5 text-green-600 bg-white rounded-full" />
        </div>
      )}
      <div className="text-center">
        <div className={`text-sm font-medium ${isRecommended ? 'text-gray-700' : 'text-gray-400'}`}>
          {hour.toString().padStart(2, '0')}:00
        </div>
        <div
          className="text-lg font-bold mt-1"
          style={{ color: valueColor }}
        >
          {wbgt.toFixed(1)}°
        </div>
        <div
          className="text-xs mt-1 px-2 py-0.5 rounded-full"
          style={{
            backgroundColor: `${badgeColor}20`,
            color: badgeColor,
          }}
        >
          {risk.risk_level}
        </div>
      </div>
    </div>
  );
}

function ScheduleVisualization({
  forecast,
  schedule,
}: {
  forecast: HourlyForecast[];
  schedule: WorkSchedule;
}) {
  // Show hours present in the forecast (auto-adapts to physics 6-18 or RF 5-19)
  const minHour = Math.min(...forecast.map((f) => f.hour));
  const maxHour = Math.max(...forecast.map((f) => f.hour));
  const daylight = forecast.filter((f) => f.hour >= Math.max(5, minHour) && f.hour <= Math.min(19, maxHour));
  const data = daylight.map((f) => ({
    hour: `${f.hour.toString().padStart(2, '0')}:00`,
    wbgt: f.wbgt,
    isRecommended: schedule.safe_hours.includes(f.hour),
  }));

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={2} />
          <YAxis domain={[15, 40]} tick={{ fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
            }}
            formatter={(value: number, _name: string, props: any) => [
              `${value.toFixed(1)}°C`,
              props.payload.isRecommended ? 'WBGT (Recommended)' : 'WBGT',
            ]}
          />
          <Bar dataKey="wbgt" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => {
              const risk = classifyRisk(entry.wbgt);
              return (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.isRecommended ? '#22c55e' : risk.color}
                  opacity={entry.isRecommended ? 1 : 0.6}
                />
              );
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function WorkBlock({
  title,
  startHour,
  endHour,
  type,
}: {
  title: string;
  startHour: number;
  endHour: number;
  type: 'work' | 'break' | 'rest';
}) {
  const colors = {
    work: 'bg-green-100 border-green-300 text-green-800',
    break: 'bg-blue-100 border-blue-300 text-blue-800',
    rest: 'bg-gray-100 border-gray-300 text-gray-600',
  };

  const icons = {
    work: Sun,
    break: Coffee,
    rest: Clock,
  };

  const Icon = icons[type];

  return (
    <div className={`flex items-center p-4 rounded-lg border ${colors[type]}`}>
      <Icon className="h-5 w-5 mr-3 flex-shrink-0" />
      <div className="flex-1">
        <div className="font-medium">{title}</div>
        <div className="text-sm opacity-75">
          {startHour.toString().padStart(2, '0')}:00 -{' '}
          {endHour.toString().padStart(2, '0')}:00
        </div>
      </div>
      <div className="text-sm font-medium">{endHour - startHour}h</div>
    </div>
  );
}

// ---- Data fetching ----

/** Fetch today's 24-hour weather from Open-Meteo (NWP physics forecast + history for ML seed) */
async function fetchWeatherData(
  lat: number, lon: number,
): Promise<{
  /** Today's 24-hour physics-based forecast (hours 0-23) */
  physicsForecast: HourlyForecast[];
  /** ML seed data: past 4+ days of hourly history */
  history: { temps: number[]; hums: number[]; winds: number[] } | null;
}> {
  const url = `https://api.open-meteo.com/v1/forecast?` +
    `latitude=${lat}&longitude=${lon}` +
    `&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m,shortwave_radiation` +
    `&past_days=4&forecast_days=2` +
    `&timezone=Africa/Kampala`;

  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Open-Meteo API error: ${resp.status}`);
  const data = await resp.json();
  const hourly = data.hourly;

  // Parse all timestamps
  const times: Date[] = hourly.time.map((t: string) => new Date(t));

  // Find today's date boundaries (hours 0-23)
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // Build today's physics forecast (24 hours)
  const physicsForecast: HourlyForecast[] = [];
  for (let i = 0; i < times.length; i++) {
    const timeStr = hourly.time[i]; // "YYYY-MM-DDTHH:MM"
    if (!timeStr.startsWith(todayStr)) continue;

    const temp = hourly.temperature_2m[i];
    const hum = hourly.relative_humidity_2m[i];
    const wind = hourly.wind_speed_10m[i];
    const solar = hourly.shortwave_radiation[i] ?? 0;
    if (temp == null || hum == null || wind == null) continue;

    const result = calculateWbgt(temp, hum, wind, solar);
    physicsForecast.push({
      hour: times[i].getHours(),
      wbgt: result.wbgt,
      temperature: temp,
      humidity: hum,
      wind_speed: wind,
      solar_radiation: solar,
    });
  }

  // Build history arrays for ML seed (all past data before today)
  const histTemps: number[] = [];
  const histHums: number[] = [];
  const histWinds: number[] = [];
  for (let i = 0; i < times.length; i++) {
    if (hourly.time[i] >= todayStr + 'T00:00') break;
    if (
      hourly.temperature_2m[i] != null &&
      hourly.relative_humidity_2m[i] != null &&
      hourly.wind_speed_10m[i] != null
    ) {
      histTemps.push(hourly.temperature_2m[i]);
      histHums.push(hourly.relative_humidity_2m[i]);
      histWinds.push(hourly.wind_speed_10m[i]);
    }
  }

  return {
    physicsForecast,
    history: histTemps.length >= 73
      ? { temps: histTemps, hums: histHums, winds: histWinds }
      : null,
  };
}

// Max mean absolute deviation (°C) to accept RF over physics
const RF_DEVIATION_THRESHOLD = 2.0;

// Valid hour range for RF predictions (5:00 AM – 19:00 / 7:00 PM)
const RF_VALID_HOUR_MIN = 5;
const RF_VALID_HOUR_MAX = 19;

// ---- Main Component ----

export default function Schedule() {
  const { selectedDistrict, setSelectedDistrict } = useAppStore();
  const [workHoursNeeded, setWorkHoursNeeded] = useState(8);
  const [physicsForecast, setPhysicsForecast] = useState<HourlyForecast[]>([]);
  const [rfForecast, setRfForecast] = useState<HourlyForecast[] | null>(null);
  const [schedule, setSchedule] = useState<WorkSchedule | null>(null);
  const [rfSchedule, setRfSchedule] = useState<WorkSchedule | null>(null);
  const [dataSource, setDataSource] = useState<'loading' | 'physics' | 'rf-available'>('loading');
  const [rfDeviation, setRfDeviation] = useState<number | null>(null);
  const [rfStatus, setRfStatus] = useState<'loading' | 'valid' | 'out-of-range' | 'high-deviation' | 'error' | 'unavailable'>('loading');
  const isForecastingRef = useRef(false);

  const { isReady, isLoading: mlLoading, predictMultiStep } = useHeatShieldML();
  const districts = getUgandaDistricts();

  useEffect(() => {
    if (!selectedDistrict) {
      setSelectedDistrict(districts[0]);
    }

    const district = selectedDistrict || districts[0];
    if (!district || isForecastingRef.current) return;
    isForecastingRef.current = true;

    (async () => {
      try {
        // 1. Always fetch real weather data and compute physics-based WBGT
        const { physicsForecast: pForecast, history } = await fetchWeatherData(district.lat, district.lon);

        if (pForecast.length < 12) {
          throw new Error(`Insufficient forecast data: ${pForecast.length} hours`);
        }

        // Always set physics forecast and schedule first
        setPhysicsForecast(pForecast);
        setSchedule(optimizeWorkSchedule(pForecast, workHoursNeeded));
        setDataSource('physics');

        // 2. If RF models are ready and we have enough history, run RF separately
        if (isReady && history) {
          try {
            const rfResults = await predictMultiStep(
              history.temps, history.hums, history.winds, 24,
            );

            // Filter RF results to valid daylight range (5AM–7PM)
            const rfDaylight = rfResults.filter((r) => {
              const h = r.timestamp.getHours();
              return h >= RF_VALID_HOUR_MIN && h < RF_VALID_HOUR_MAX;
            });

            if (rfDaylight.length === 0) {
              console.warn('[Schedule] RF has no predictions in valid range (5AM-7PM)');
              setRfStatus('out-of-range');
              setRfForecast(null);
              setRfSchedule(null);
              return;
            }

            // Build RF forecast as HourlyForecast[] for the valid hours
            const rfByHour = new Map<number, WBGTForecast>();
            for (const r of rfResults) {
              rfByHour.set(r.timestamp.getHours(), r);
            }

            // Compute mean absolute deviation against physics baseline (daylight hours only)
            let totalDev = 0;
            let matchCount = 0;
            for (const pf of pForecast) {
              const h = pf.hour;
              if (h < RF_VALID_HOUR_MIN || h >= RF_VALID_HOUR_MAX) continue;
              const rfR = rfByHour.get(h);
              if (rfR != null) {
                totalDev += Math.abs(rfR.wbgt - pf.wbgt);
                matchCount++;
              }
            }
            const mae = matchCount > 0 ? totalDev / matchCount : Infinity;
            const deviation = Math.round(mae * 10) / 10;
            setRfDeviation(deviation);

            console.log(`[Schedule] RF vs Physics MAE: ${mae.toFixed(2)}°C (threshold: ${RF_DEVIATION_THRESHOLD}°C)`);

            // Build RF HourlyForecast array for valid hours only
            const rfHourly: HourlyForecast[] = pForecast
              .filter((pf) => pf.hour >= RF_VALID_HOUR_MIN && pf.hour < RF_VALID_HOUR_MAX)
              .map((pf) => {
                const rfR = rfByHour.get(pf.hour);
                if (rfR != null) {
                  return {
                    ...pf,
                    wbgt: Math.round(rfR.wbgt * 10) / 10,
                  };
                }
                return pf; // fallback to physics if RF missing for this hour
              });

            if (mae > RF_DEVIATION_THRESHOLD) {
              console.warn(`[Schedule] RF deviation high (${mae.toFixed(1)}°C) — showing for comparison but using physics for scheduling`);
              setRfStatus('high-deviation');
              setRfForecast(rfHourly);
              // Still build RF schedule for display, but mark it as high-deviation
              setRfSchedule(optimizeWorkSchedule(rfHourly, workHoursNeeded));
            } else {
              setRfStatus('valid');
              setRfForecast(rfHourly);
              setRfSchedule(optimizeWorkSchedule(rfHourly, workHoursNeeded));
              setDataSource('rf-available');
            }
          } catch (rfErr) {
            console.warn('[Schedule] RF inference failed:', rfErr);
            setRfStatus('error');
            setRfForecast(null);
            setRfSchedule(null);
          }
        } else if (!isReady && !mlLoading) {
          setRfStatus('unavailable');
        }
      } catch (err: any) {
        console.error('[Schedule] Failed to fetch weather data:', err);
        setPhysicsForecast([]);
        setSchedule(null);
        setDataSource('loading');
      } finally {
        isForecastingRef.current = false;
      }
    })();
  }, [selectedDistrict, isReady, predictMultiStep]);

  // Re-optimize schedules when work hours slider changes (no re-fetch needed)
  useEffect(() => {
    if (physicsForecast.length > 0) {
      setSchedule(optimizeWorkSchedule(physicsForecast, workHoursNeeded));
    }
    if (rfForecast && rfForecast.length > 0) {
      setRfSchedule(optimizeWorkSchedule(rfForecast, workHoursNeeded));
    }
  }, [workHoursNeeded]);

  // Build comparison chart data for overlay visualization
  const comparisonData = physicsForecast
    .filter((f) => f.hour >= 5 && f.hour < 19)
    .map((pf) => {
      const rfMatch = rfForecast?.find((rf) => rf.hour === pf.hour);
      return {
        hour: `${pf.hour.toString().padStart(2, '0')}:00`,
        physics: pf.wbgt,
        rf: rfMatch ? rfMatch.wbgt : undefined,
      };
    });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900">Work Schedule Optimizer</h1>
          </div>
          <p className="text-gray-500 mt-1">
            {dataSource === 'loading'
              ? 'Fetching weather data...'
              : 'Physics-first architecture with ISO 7243 compliance — RF validates and enhances predictions'}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600">Hours needed:</label>
            <select
              value={workHoursNeeded}
              onChange={(e) => setWorkHoursNeeded(Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-2"
            >
              {[4, 5, 6, 7, 8, 9, 10, 12].map((h) => (
                <option key={h} value={h}>
                  {h} hours
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 1: PHYSICS MODEL (ISO 7243)
          ═══════════════════════════════════════════════════════════════ */}
      {schedule && (
        <>
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Beaker className="h-5 w-5 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">Physics Model — ISO 7243 WBGT</h2>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                Primary
              </span>
            </div>
            <p className="text-sm text-gray-500 ml-7">
              WBGT = 0.7 × T<sub>w</sub> + 0.2 × T<sub>g</sub> + 0.1 × T<sub>a</sub> — Stull (2011) wet-bulb approximation, Liljegren globe temperature (Newton-Raphson iterative solver)
            </p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="card text-center">
              <Clock className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <div className="text-3xl font-bold text-gray-900">
                {schedule.total_safe_hours}
              </div>
              <div className="text-sm text-gray-500">Safe Work Hours</div>
            </div>
            <div className="card text-center">
              <Sun className="h-8 w-8 text-orange-500 mx-auto mb-2" />
              <div className="text-3xl font-bold text-gray-900">
                {schedule.recommended_start.toString().padStart(2, '0')}:00
              </div>
              <div className="text-sm text-gray-500">Start Time</div>
            </div>
            <div className="card text-center">
              <Coffee className="h-8 w-8 text-blue-500 mx-auto mb-2" />
              <div className="text-3xl font-bold text-gray-900">
                {schedule.recommended_end.toString().padStart(2, '0')}:00
              </div>
              <div className="text-sm text-gray-500">End Time</div>
            </div>
            <div className="card text-center">
              <div className="flex items-center justify-center mb-2">
                <div className="w-16 h-16 relative">
                  <svg viewBox="0 0 36 36" className="w-16 h-16">
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#e5e7eb"
                      strokeWidth="3"
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#22c55e"
                      strokeWidth="3"
                      strokeDasharray={`${schedule.productivity_score}, 100`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold">
                      {schedule.productivity_score.toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-sm text-gray-500">Productivity Score</div>
            </div>
          </div>

          {/* Physics Schedule Visualization */}
          <div className="card mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Physics WBGT Forecast & Recommended Work Hours (06:00 – 18:00)
            </h2>
            <ScheduleVisualization forecast={physicsForecast} schedule={schedule} />
            <div className="flex items-center justify-center mt-4 space-x-6">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-500 rounded" />
                <span className="text-sm text-gray-600">Recommended work hours</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-gray-400 rounded opacity-60" />
                <span className="text-sm text-gray-600">Not recommended</span>
              </div>
            </div>
          </div>

          {/* Physics Hour Grid */}
          <div className="card mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Physics Hourly Breakdown (06:00 – 18:00)
            </h2>
            <div className="grid grid-cols-6 md:grid-cols-6 lg:grid-cols-12 gap-3">
              {physicsForecast.filter((f) => f.hour >= 6 && f.hour < 18).map((f) => (
                <TimeSlot
                  key={f.hour}
                  hour={f.hour}
                  wbgt={f.wbgt}
                  isRecommended={schedule.safe_hours.includes(f.hour)}
                />
              ))}
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════
              SECTION 2: RANDOM FOREST ML PREDICTIONS
              ═══════════════════════════════════════════════════════════════ */}
          <div className="border-t-2 border-gray-200 pt-8 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Cpu className="h-5 w-5 text-green-600" />
              <h2 className="text-xl font-bold text-gray-900">Random Forest ML Predictions</h2>
              {rfStatus === 'valid' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                  <CheckCircle2 className="h-3 w-3" /> Valid (MAE: {rfDeviation}°C)
                </span>
              )}
              {rfStatus === 'high-deviation' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                  <AlertCircle className="h-3 w-3" /> High Deviation ({rfDeviation}°C)
                </span>
              )}
              {rfStatus === 'out-of-range' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                  <AlertCircle className="h-3 w-3" /> Out of Range
                </span>
              )}
              {(rfStatus === 'loading' || rfStatus === 'unavailable') && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                  {mlLoading ? 'Loading ONNX models...' : rfStatus === 'loading' ? 'Waiting...' : 'Models unavailable'}
                </span>
              )}
              {rfStatus === 'error' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                  <AlertCircle className="h-3 w-3" /> Inference Error
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 ml-7">
              3 ONNX Random Forest models (30 trees, max depth 10) with 17-feature engineering pipeline — deployed via ONNX Runtime for browser inference. Valid range: 05:00 – 19:00.
            </p>
          </div>

          {rfForecast && rfSchedule ? (
            <>
              {/* Comparison Chart: Physics vs RF overlay */}
              <div className="card mb-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Physics vs Random Forest WBGT Comparison (05:00 – 19:00)
                </h2>
                {rfStatus === 'high-deviation' && (
                  <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                    <AlertCircle className="h-4 w-4 inline mr-1" />
                    RF deviation is above {RF_DEVIATION_THRESHOLD}°C threshold — physics model is used for scheduling. RF shown for comparison only.
                  </div>
                )}
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={comparisonData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
                      <YAxis domain={[15, 40]} tick={{ fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                        }}
                        formatter={(value: number, name: string) => [
                          `${value.toFixed(1)}°C`,
                          name === 'physics' ? 'Physics (ISO 7243)' : 'Random Forest',
                        ]}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="physics"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        name="Physics (ISO 7243)"
                      />
                      <Line
                        type="monotone"
                        dataKey="rf"
                        stroke="#22c55e"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={{ r: 3 }}
                        name="Random Forest"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center justify-center mt-4 space-x-6">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-0.5 bg-blue-500" />
                    <span className="text-sm text-gray-600">Physics WBGT</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-0.5 bg-green-500" style={{ borderTop: '2px dashed #22c55e' }} />
                    <span className="text-sm text-gray-600">RF WBGT</span>
                  </div>
                </div>
              </div>

              {/* RF Schedule Visualization */}
              <div className="card mb-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  RF WBGT Forecast & Work Hours (05:00 – 19:00)
                </h2>
                <ScheduleVisualization forecast={rfForecast} schedule={rfSchedule} />
              </div>

              {/* RF Hour Grid */}
              <div className="card mb-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  RF Hourly Breakdown (05:00 – 19:00)
                </h2>
                <div className="grid grid-cols-7 md:grid-cols-7 lg:grid-cols-14 gap-3">
                  {rfForecast.map((f) => (
                    <TimeSlot
                      key={f.hour}
                      hour={f.hour}
                      wbgt={f.wbgt}
                      isRecommended={rfSchedule.safe_hours.includes(f.hour)}
                    />
                  ))}
                </div>
              </div>

              {/* RF Summary Cards */}
              <div className="card mb-8">
                <h3 className="text-md font-semibold text-gray-700 mb-3">RF Schedule Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center text-sm">
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{rfSchedule.total_safe_hours}</div>
                    <div className="text-gray-500">Safe Hours</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {rfSchedule.recommended_start.toString().padStart(2, '0')}:00
                    </div>
                    <div className="text-gray-500">Start</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {rfSchedule.recommended_end.toString().padStart(2, '0')}:00
                    </div>
                    <div className="text-gray-500">End</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {rfSchedule.productivity_score.toFixed(0)}%
                    </div>
                    <div className="text-gray-500">Productivity</div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="card mb-8 text-center py-8">
              <Cpu className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">
                {mlLoading
                  ? 'Loading ONNX Random Forest models...'
                  : rfStatus === 'out-of-range'
                  ? 'RF predictions fell outside the valid 05:00–19:00 range. Physics model is used for scheduling.'
                  : rfStatus === 'error'
                  ? 'RF inference encountered an error. Physics model is used for scheduling.'
                  : 'Random Forest models not yet available. Physics model is used for scheduling.'}
              </p>
            </div>
          )}

          {/* Recommended Schedule (always uses physics) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Recommended Daily Schedule
              </h2>
              <p className="text-xs text-gray-400 mb-3">Based on Physics Model (ISO 7243)</p>
              <div className="space-y-3">
                {schedule.recommended_start < 11 && (
                  <WorkBlock
                    title="Morning Work Session"
                    startHour={schedule.recommended_start}
                    endHour={Math.min(11, schedule.recommended_end + 1)}
                    type="work"
                  />
                )}
                <WorkBlock
                  title="Midday Rest Period"
                  startHour={11}
                  endHour={15}
                  type="rest"
                />
                {schedule.recommended_end >= 15 && (
                  <WorkBlock
                    title="Afternoon Work Session"
                    startHour={15}
                    endHour={schedule.recommended_end + 1}
                    type="work"
                  />
                )}
              </div>
            </div>

            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Break & Hydration Schedule
              </h2>
              <p className="text-gray-600 mb-4">{schedule.break_schedule}</p>
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-start space-x-3">
                  <Droplets className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-900">Hydration Guide</p>
                    <ul className="text-sm text-blue-700 mt-2 space-y-1">
                      <li>• Drink 250ml water every 30 minutes</li>
                      <li>• Avoid caffeinated drinks during work</li>
                      <li>• Watch for dark urine (sign of dehydration)</li>
                      <li>• Keep water accessible at all times</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-4 bg-orange-50 rounded-lg">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-orange-900">Heat Illness Warning Signs</p>
                    <ul className="text-sm text-orange-700 mt-2 space-y-1">
                      <li>• Headache or dizziness</li>
                      <li>• Heavy sweating or no sweating</li>
                      <li>• Nausea or confusion</li>
                      <li>• Rapid heartbeat</li>
                    </ul>
                    <p className="text-sm text-orange-800 mt-2 font-medium">
                      If symptoms appear: Stop work, move to shade, drink water, cool down.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
