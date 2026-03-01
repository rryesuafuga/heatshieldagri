import React, { useState, useMemo } from 'react';
import { MapPin, Layers, RefreshCw, Loader2, CloudOff } from 'lucide-react';
import { useAppStore } from '../store';
import { getUgandaDistricts, calculateWbgt, classifyRisk, District, haversineDistance } from '../wasm';
import { useUgandaWeather, calculateDistrictHeatData, DistrictHeatData } from '../hooks/useWeather';

// Uganda bounds
const UGANDA_BOUNDS = {
  minLat: -1.5,
  maxLat: 4.3,
  minLon: 29.5,
  maxLon: 35.0,
};

// Grid resolution in degrees (approximately 10km for better performance)
const GRID_STEP = 0.09;

interface GridCell {
  lat: number;
  lon: number;
  wbgt: number;
  color: string;
}

// Interpolate WBGT values from district data using IDW (Inverse Distance Weighting)
function interpolateHeatGrid(districtData: DistrictHeatData[]): GridCell[] {
  const cells: GridCell[] = [];

  for (let lat = UGANDA_BOUNDS.minLat; lat <= UGANDA_BOUNDS.maxLat; lat += GRID_STEP) {
    for (let lon = UGANDA_BOUNDS.minLon; lon <= UGANDA_BOUNDS.maxLon; lon += GRID_STEP) {
      // Calculate IDW interpolation from district data
      let weightedSum = 0;
      let weightSum = 0;
      const power = 2; // IDW power parameter

      for (const district of districtData) {
        const distance = haversineDistance(lat, lon, district.district.lat, district.district.lon);
        if (distance < 0.1) {
          // Very close to a district - use its value directly
          weightedSum = district.wbgt;
          weightSum = 1;
          break;
        }
        const weight = 1 / Math.pow(distance, power);
        weightedSum += district.wbgt * weight;
        weightSum += weight;
      }

      const wbgt = weightSum > 0 ? weightedSum / weightSum : 25;
      const risk = classifyRisk(wbgt);

      cells.push({
        lat,
        lon,
        wbgt,
        color: risk.color,
      });
    }
  }

  return cells;
}

function GridCellComponent({
  cell,
  scale,
  offset,
  onClick,
}: {
  cell: GridCell;
  scale: number;
  offset: { x: number; y: number };
  onClick: (cell: GridCell) => void;
}) {
  const x = (cell.lon - UGANDA_BOUNDS.minLon) * scale + offset.x;
  const y = (UGANDA_BOUNDS.maxLat - cell.lat) * scale + offset.y;
  const size = GRID_STEP * scale;

  return (
    <rect
      x={x}
      y={y}
      width={size}
      height={size}
      fill={cell.color}
      opacity={0.7}
      stroke={cell.color}
      strokeWidth={0.5}
      className="cursor-pointer hover:opacity-90 transition-opacity"
      onClick={() => onClick(cell)}
    />
  );
}

function DistrictMarker({
  district,
  districtData,
  scale,
  offset,
  isSelected,
  onClick,
}: {
  district: District;
  districtData?: DistrictHeatData;
  scale: number;
  offset: { x: number; y: number };
  isSelected: boolean;
  onClick: (district: District) => void;
}) {
  const x = (district.lon - UGANDA_BOUNDS.minLon) * scale + offset.x;
  const y = (UGANDA_BOUNDS.maxLat - district.lat) * scale + offset.y;

  return (
    <g
      className="cursor-pointer"
      onClick={() => onClick(district)}
      transform={`translate(${x}, ${y})`}
    >
      <circle
        r={isSelected ? 8 : 6}
        fill={isSelected ? '#16a34a' : '#374151'}
        stroke="white"
        strokeWidth={2}
      />
      <text
        x={10}
        y={4}
        fontSize={isSelected ? 12 : 10}
        fontWeight={isSelected ? 600 : 400}
        fill="#374151"
      >
        {district.name}
        {districtData && (
          <tspan fill={classifyRisk(districtData.wbgt).color} fontWeight={600}>
            {' '}({districtData.wbgt.toFixed(0)}°)
          </tspan>
        )}
      </text>
    </g>
  );
}

function Legend() {
  const levels = [
    { label: 'Low (<26°C)', color: '#22c55e' },
    { label: 'Moderate (26-28°C)', color: '#eab308' },
    { label: 'High (28-30°C)', color: '#f97316' },
    { label: 'Very High (30-32°C)', color: '#ef4444' },
    { label: 'Extreme (>32°C)', color: '#7c2d12' },
  ];

  return (
    <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-4">
      <h4 className="text-sm font-semibold text-gray-700 mb-2">WBGT Risk Level</h4>
      <div className="space-y-1">
        {levels.map((level) => (
          <div key={level.label} className="flex items-center space-x-2">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: level.color }}
            />
            <span className="text-xs text-gray-600">{level.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="h-96 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin text-green-600 mx-auto mb-4" />
        <p className="text-gray-600">Loading heat map data...</p>
        <p className="text-sm text-gray-400 mt-2">Fetching weather for 12 Uganda districts</p>
      </div>
    </div>
  );
}

function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="h-96 flex items-center justify-center">
      <div className="text-center">
        <CloudOff className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <p className="text-gray-900 font-medium mb-2">Unable to load weather data</p>
        <p className="text-sm text-gray-500 mb-4">{error}</p>
        <button onClick={onRetry} className="btn-primary flex items-center space-x-2 mx-auto">
          <RefreshCw className="h-4 w-4" />
          <span>Try Again</span>
        </button>
      </div>
    </div>
  );
}

export default function HeatMap() {
  const { selectedDistrict, setSelectedDistrict } = useAppStore();
  const [selectedCell, setSelectedCell] = useState<GridCell | null>(null);
  const [showDistricts, setShowDistricts] = useState(true);

  const districts = getUgandaDistricts();

  // Fetch real weather data for all Uganda districts
  const {
    data: weatherData,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useUgandaWeather();

  // Calculate district heat data from weather
  const districtHeatData = useMemo(() => {
    if (!weatherData) return [];
    return calculateDistrictHeatData(weatherData);
  }, [weatherData]);

  // Generate interpolated heat grid from district data
  const gridCells = useMemo(() => {
    if (districtHeatData.length === 0) return [];
    return interpolateHeatGrid(districtHeatData);
  }, [districtHeatData]);

  // Map dimensions
  const width = 800;
  const height = 600;
  const padding = 40;
  const scale =
    Math.min(
      (width - 2 * padding) / (UGANDA_BOUNDS.maxLon - UGANDA_BOUNDS.minLon),
      (height - 2 * padding) / (UGANDA_BOUNDS.maxLat - UGANDA_BOUNDS.minLat)
    );
  const offset = { x: padding, y: padding };

  const handleCellClick = (cell: GridCell) => {
    setSelectedCell(cell);
  };

  const handleDistrictClick = (district: District) => {
    setSelectedDistrict(district);
    // Find the district's heat data
    const districtData = districtHeatData.find(d => d.district.id === district.id);
    if (districtData) {
      setSelectedCell({
        lat: district.lat,
        lon: district.lon,
        wbgt: districtData.wbgt,
        color: classifyRisk(districtData.wbgt).color,
      });
    }
  };

  // Get district data for selected district
  const selectedDistrictData = selectedDistrict
    ? districtHeatData.find(d => d.district.id === selectedDistrict.id)
    : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Heat Risk Map</h1>
          <p className="text-gray-500 mt-1">
            Real-time WBGT levels across Uganda
          </p>
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 mt-2">
            Live Data • IDW Interpolation from 12 Districts
          </span>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowDistricts(!showDistricts)}
            className={`px-4 py-2 rounded-lg font-medium flex items-center space-x-2 ${
              showDistricts ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>Districts</span>
          </button>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map */}
        <div className="lg:col-span-2 card relative">
          {isLoading ? (
            <LoadingState />
          ) : isError ? (
            <ErrorState
              error={error instanceof Error ? error.message : 'Unknown error'}
              onRetry={() => refetch()}
            />
          ) : (
            <svg
              width="100%"
              height="500"
              viewBox={`0 0 ${width} ${height}`}
              className="border border-gray-200 rounded-lg"
            >
              {/* Background */}
              <rect width={width} height={height} fill="#f8fafc" />

              {/* Uganda outline (simplified) */}
              <path
                d={`M ${padding} ${height - padding}
                   L ${width - padding} ${height - padding}
                   L ${width - padding} ${padding}
                   L ${padding} ${padding} Z`}
                fill="none"
                stroke="#cbd5e1"
                strokeWidth={1}
              />

              {/* Grid cells */}
              {gridCells.map((cell, idx) => (
                <GridCellComponent
                  key={idx}
                  cell={cell}
                  scale={scale}
                  offset={offset}
                  onClick={handleCellClick}
                />
              ))}

              {/* District markers */}
              {showDistricts &&
                districts.map((d) => {
                  const dData = districtHeatData.find(dd => dd.district.id === d.id);
                  return (
                    <DistrictMarker
                      key={d.id}
                      district={d}
                      districtData={dData}
                      scale={scale}
                      offset={offset}
                      isSelected={selectedDistrict?.id === d.id}
                      onClick={handleDistrictClick}
                    />
                  );
                })}
            </svg>
          )}
          <Legend />
        </div>

        {/* Info Panel */}
        <div className="space-y-6">
          {/* Selected Location */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {selectedDistrict ? selectedDistrict.name : 'Select a Location'}
            </h3>
            {selectedDistrictData ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">WBGT</span>
                  <span
                    className="text-2xl font-bold"
                    style={{ color: classifyRisk(selectedDistrictData.wbgt).color }}
                  >
                    {selectedDistrictData.wbgt.toFixed(1)}°C
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Risk Level</span>
                  <span
                    className="px-3 py-1 rounded-full text-sm font-medium"
                    style={{
                      backgroundColor: `${classifyRisk(selectedDistrictData.wbgt).color}20`,
                      color: classifyRisk(selectedDistrictData.wbgt).color,
                    }}
                  >
                    {selectedDistrictData.riskLevel}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Temperature</span>
                  <span className="text-gray-700">{selectedDistrictData.temperature.toFixed(1)}°C</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Humidity</span>
                  <span className="text-gray-700">{selectedDistrictData.humidity.toFixed(0)}%</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Coordinates</span>
                  <span className="text-gray-700">
                    {selectedDistrict?.lat.toFixed(3)}°, {selectedDistrict?.lon.toFixed(3)}°
                  </span>
                </div>
                <div className="pt-4 border-t border-gray-100">
                  <p className="text-sm text-gray-600">
                    {classifyRisk(selectedDistrictData.wbgt).recommendation}
                  </p>
                </div>
              </div>
            ) : selectedCell ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">WBGT (Interpolated)</span>
                  <span
                    className="text-2xl font-bold"
                    style={{ color: selectedCell.color }}
                  >
                    {selectedCell.wbgt.toFixed(1)}°C
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Risk Level</span>
                  <span
                    className="px-3 py-1 rounded-full text-sm font-medium"
                    style={{
                      backgroundColor: `${selectedCell.color}20`,
                      color: selectedCell.color,
                    }}
                  >
                    {classifyRisk(selectedCell.wbgt).risk_level}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Coordinates</span>
                  <span className="text-gray-700">
                    {selectedCell.lat.toFixed(3)}°, {selectedCell.lon.toFixed(3)}°
                  </span>
                </div>
                <div className="pt-4 border-t border-gray-100">
                  <p className="text-sm text-gray-600">
                    {classifyRisk(selectedCell.wbgt).recommendation}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">
                Click on the map or select a district to view heat risk details.
              </p>
            )}
          </div>

          {/* District List with Live Data */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Districts (Live)</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {districts.map((d) => {
                const dData = districtHeatData.find(dd => dd.district.id === d.id);
                return (
                  <button
                    key={d.id}
                    onClick={() => handleDistrictClick(d)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                      selectedDistrict?.id === d.id
                        ? 'bg-green-100 text-green-800'
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">{d.name}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        {dData && (
                          <span
                            className="text-sm font-bold"
                            style={{ color: classifyRisk(dData.wbgt).color }}
                          >
                            {dData.wbgt.toFixed(0)}°C
                          </span>
                        )}
                        <span className="text-xs text-gray-500">{d.region}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Overview</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {districtHeatData.filter((d) => d.wbgt < 26).length}
                </div>
                <div className="text-xs text-green-700">Low Risk Districts</div>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">
                  {districtHeatData.filter((d) => d.wbgt >= 26 && d.wbgt < 28).length}
                </div>
                <div className="text-xs text-yellow-700">Moderate Risk</div>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {districtHeatData.filter((d) => d.wbgt >= 28 && d.wbgt < 30).length}
                </div>
                <div className="text-xs text-orange-700">High Risk</div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {districtHeatData.filter((d) => d.wbgt >= 30).length}
                </div>
                <div className="text-xs text-red-700">Very High/Extreme</div>
              </div>
            </div>
          </div>
        </div>
      </div>

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
        {' '}• Interpolated using Inverse Distance Weighting (IDW)
      </div>
    </div>
  );
}
