import React, { useState, useEffect } from 'react';
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
import { Clock, Sun, Coffee, Droplets, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAppStore } from '../store';
import {
  generateDemoForecast,
  optimizeWorkSchedule,
  classifyRisk,
  getUgandaDistricts,
  HourlyForecast,
  WorkSchedule,
} from '../wasm';

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
            formatter={(value: number, name: string, props: any) => [
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

export default function Schedule() {
  const { selectedDistrict, setSelectedDistrict } = useAppStore();
  const [workHoursNeeded, setWorkHoursNeeded] = useState(8);
  const [forecast, setForecast] = useState<HourlyForecast[]>([]);
  const [schedule, setSchedule] = useState<WorkSchedule | null>(null);

  const districts = getUgandaDistricts();

  useEffect(() => {
    if (!selectedDistrict) {
      setSelectedDistrict(districts[0]);
    }

    // Generate forecast
    const baseTemp = 30 + Math.random() * 4;
    const humidity = 60 + Math.random() * 15;
    const data = generateDemoForecast(baseTemp, humidity);
    setForecast(data);

    // Optimize schedule
    const optimized = optimizeWorkSchedule(data, workHoursNeeded);
    setSchedule(optimized);
  }, [selectedDistrict, workHoursNeeded]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Work Schedule Optimizer</h1>
          <p className="text-gray-500 mt-1">
            AI-recommended safe work windows based on WBGT forecast
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
                {schedule.recommended_start}:00
              </div>
              <div className="text-sm text-gray-500">Start Time</div>
            </div>
            <div className="card text-center">
              <Coffee className="h-8 w-8 text-blue-500 mx-auto mb-2" />
              <div className="text-3xl font-bold text-gray-900">
                {schedule.recommended_end}:00
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
                {schedule.recommended_start < 10 && (
                  <WorkBlock
                    title="Morning Work Session"
                    startHour={schedule.recommended_start}
                    endHour={Math.min(10, schedule.recommended_end)}
                    type="work"
                  />
                )}
                <WorkBlock
                  title="Midday Rest Period"
                  startHour={11}
                  endHour={15}
                  type="rest"
                />
                {schedule.recommended_end > 15 && (
                  <WorkBlock
                    title="Evening Work Session"
                    startHour={Math.max(15, schedule.recommended_start)}
                    endHour={schedule.recommended_end}
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
