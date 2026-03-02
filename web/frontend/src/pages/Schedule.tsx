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
} from 'recharts';
import { Clock, Sun, Coffee, Droplets, AlertCircle, CheckCircle2, Cpu } from 'lucide-react';
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

  return (
    <div
      className={`relative p-3 rounded-lg border-2 transition-all ${
        isRecommended
          ? 'border-green-500 bg-green-50'
          : 'border-gray-200 bg-white'
      }`}
    >
      {isRecommended && (
        <div className="absolute -top-2 -right-2">
          <CheckCircle2 className="h-5 w-5 text-green-600 bg-white rounded-full" />
        </div>
      )}
      <div className="text-center">
        <div className="text-sm font-medium text-gray-700">
          {hour.toString().padStart(2, '0')}:00
        </div>
        <div
          className="text-lg font-bold mt-1"
          style={{ color: risk.color }}
        >
          {wbgt.toFixed(1)}°
        </div>
        <div
          className="text-xs mt-1 px-2 py-0.5 rounded-full"
          style={{
            backgroundColor: `${risk.color}20`,
            color: risk.color,
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
  const data = forecast.map((f) => ({
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

// ---- Main Component ----

export default function Schedule() {
  const { selectedDistrict, setSelectedDistrict } = useAppStore();
  const [workHoursNeeded, setWorkHoursNeeded] = useState(8);
  const [forecast, setForecast] = useState<HourlyForecast[]>([]);
  const [schedule, setSchedule] = useState<WorkSchedule | null>(null);
  const [dataSource, setDataSource] = useState<'loading' | 'physics' | 'rf-enhanced'>('loading');
  const [rfDeviation, setRfDeviation] = useState<number | null>(null);
  const isForecastingRef = useRef(false);

  const { isReady, predictMultiStep } = useHeatShieldML();
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
        const { physicsForecast, history } = await fetchWeatherData(district.lat, district.lon);

        if (physicsForecast.length < 12) {
          throw new Error(`Insufficient forecast data: ${physicsForecast.length} hours`);
        }

        let finalForecast = physicsForecast;
        let source: 'physics' | 'rf-enhanced' = 'physics';
        let deviation: number | null = null;

        // 2. If RF models are ready and we have enough history, compare
        if (isReady && history) {
          try {
            const rfResults = await predictMultiStep(
              history.temps, history.hums, history.winds, 24,
            );

            // Build a map of RF WBGT by hour for comparison
            const rfByHour = new Map<number, number>();
            for (const r of rfResults) {
              rfByHour.set(r.timestamp.getHours(), r.wbgt);
            }

            // Compute mean absolute deviation against physics baseline
            let totalDev = 0;
            let matchCount = 0;
            for (const pf of physicsForecast) {
              const rfWbgt = rfByHour.get(pf.hour);
              if (rfWbgt != null) {
                totalDev += Math.abs(rfWbgt - pf.wbgt);
                matchCount++;
              }
            }
            const mae = matchCount > 0 ? totalDev / matchCount : Infinity;
            deviation = Math.round(mae * 10) / 10;

            console.log(`[Schedule] RF vs Physics MAE: ${mae.toFixed(2)}°C (threshold: ${RF_DEVIATION_THRESHOLD}°C)`);

            if (mae <= RF_DEVIATION_THRESHOLD) {
              // RF is close to physics — use RF-enhanced values
              // Blend: 70% physics + 30% RF for conservative enhancement
              finalForecast = physicsForecast.map((pf) => {
                const rfWbgt = rfByHour.get(pf.hour);
                if (rfWbgt != null) {
                  return { ...pf, wbgt: Math.round((0.7 * pf.wbgt + 0.3 * rfWbgt) * 10) / 10 };
                }
                return pf;
              });
              source = 'rf-enhanced';
            } else {
              console.warn(`[Schedule] RF deviation too high (${mae.toFixed(1)}°C), using physics only`);
            }
          } catch (rfErr) {
            console.warn('[Schedule] RF inference failed, using physics only:', rfErr);
          }
        }

        setForecast(finalForecast);
        setSchedule(optimizeWorkSchedule(finalForecast, workHoursNeeded));
        setDataSource(source);
        setRfDeviation(deviation);
      } catch (err: any) {
        console.error('[Schedule] Failed to fetch weather data:', err);
        // Unable to reach Open-Meteo — no data to show
        setForecast([]);
        setSchedule(null);
        setDataSource('loading');
      } finally {
        isForecastingRef.current = false;
      }
    })();
  }, [selectedDistrict, isReady, predictMultiStep]);

  // Re-optimize schedule when work hours slider changes (no re-fetch needed)
  useEffect(() => {
    if (forecast.length > 0) {
      setSchedule(optimizeWorkSchedule(forecast, workHoursNeeded));
    }
  }, [workHoursNeeded]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900">Work Schedule Optimizer</h1>
            {dataSource === 'rf-enhanced' ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                <Cpu className="h-3 w-3" /> RF-Enhanced
              </span>
            ) : dataSource === 'physics' ? (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                Physics Model
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                Loading...
              </span>
            )}
          </div>
          <p className="text-gray-500 mt-1">
            {dataSource === 'rf-enhanced'
              ? `Real weather data + RF enhancement (deviation: ${rfDeviation}°C)`
              : dataSource === 'physics'
              ? `Physics-based WBGT from real Open-Meteo weather forecast${rfDeviation != null ? ` (RF rejected: ${rfDeviation}°C deviation)` : ''}`
              : 'Fetching weather data...'}
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

      {schedule && (
        <>
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

          {/* Schedule Visualization */}
          <div className="card mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Today's WBGT Forecast & Recommended Hours
            </h2>
            <ScheduleVisualization forecast={forecast} schedule={schedule} />
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

          {/* Hour Grid */}
          <div className="card mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Hourly Breakdown</h2>
            <div className="grid grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-3">
              {forecast.map((f) => (
                <TimeSlot
                  key={f.hour}
                  hour={f.hour}
                  wbgt={f.wbgt}
                  isRecommended={schedule.safe_hours.includes(f.hour)}
                />
              ))}
            </div>
          </div>

          {/* Recommended Schedule */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Recommended Daily Schedule
              </h2>
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
