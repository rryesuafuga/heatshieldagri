/* tslint:disable */
/* eslint-disable */

/**
 * District information for Uganda
 */
export class District {
    free(): void;
    [Symbol.dispose](): void;
    constructor(id: number, name: string, region: string, lat: number, lon: number);
    id: number;
    lat: number;
    lon: number;
    name: string;
    region: string;
}

/**
 * Grid point for spatial data
 */
export class GridPoint {
    free(): void;
    [Symbol.dispose](): void;
    constructor(lat: number, lon: number, value: number);
    lat: number;
    lon: number;
    value: number;
}

/**
 * Hourly forecast data point
 */
export class HourlyForecast {
    free(): void;
    [Symbol.dispose](): void;
    constructor(hour: number, wbgt: number, temperature: number, humidity: number, wind_speed: number, solar_radiation: number);
    hour: number;
    humidity: number;
    solar_radiation: number;
    temperature: number;
    wbgt: number;
    wind_speed: number;
}

/**
 * Risk level enumeration
 */
export enum RiskLevel {
    Low = 0,
    Moderate = 1,
    High = 2,
    VeryHigh = 3,
    Extreme = 4,
}

/**
 * WBGT calculation result with risk assessment
 */
export class WbgtResult {
    free(): void;
    [Symbol.dispose](): void;
    constructor(wbgt: number, risk_level: string, risk_code: number, recommendation: string, color: string);
    color: string;
    recommendation: string;
    risk_code: number;
    risk_level: string;
    wbgt: number;
}

/**
 * Optimized work schedule
 */
export class WorkSchedule {
    free(): void;
    [Symbol.dispose](): void;
    constructor(safe_hours: Uint8Array, total_safe_hours: number, recommended_start: number, recommended_end: number, break_schedule: string, productivity_score: number);
    break_schedule: string;
    productivity_score: number;
    recommended_end: number;
    recommended_start: number;
    safe_hours: Uint8Array;
    total_safe_hours: number;
    readonly safe_hours_array: Uint8Array;
}

/**
 * Calculate the centroid of a set of points
 */
export function calculate_centroid(points: GridPoint[]): GridPoint;

/**
 * Calculate globe temperature from environmental factors
 * Simplified model based on Liljegren et al. (2008)
 */
export function calculate_globe_temperature(temperature: number, wind_speed: number, solar_radiation: number): number;

/**
 * Calculate daily heat exposure index
 */
export function calculate_heat_exposure(forecast: HourlyForecast[], work_hours: Uint8Array): number;

/**
 * Calculate heat index (feels-like temperature)
 * Using NWS formula
 */
export function calculate_heat_index(temperature: number, humidity: number): number;

/**
 * Calculate productivity impact percentage
 */
export function calculate_productivity_impact(wbgt: number): number;

/**
 * Calculate thermal work limit (TWL) in W/m²
 * Maximum sustainable metabolic rate for given conditions
 */
export function calculate_thermal_work_limit(wbgt: number): number;

/**
 * Calculate recommended water intake in liters
 */
export function calculate_water_intake(wbgt: number, work_hours: number, work_intensity: number): number;

/**
 * Calculate Wet-Bulb Globe Temperature (WBGT)
 *
 * This uses the outdoor WBGT formula:
 * WBGT = 0.7 * Tw + 0.2 * Tg + 0.1 * Ta
 *
 * Where:
 * - Tw = Natural wet-bulb temperature
 * - Tg = Globe temperature
 * - Ta = Dry-bulb (air) temperature
 *
 * # Arguments
 * * `temperature` - Air temperature in Celsius
 * * `humidity` - Relative humidity (0-100)
 * * `wind_speed` - Wind speed in m/s
 * * `solar_radiation` - Solar radiation in W/m²
 *
 * # Returns
 * * `WbgtResult` - WBGT value with risk assessment
 */
export function calculate_wbgt(temperature: number, humidity: number, wind_speed: number, solar_radiation: number): WbgtResult;

/**
 * Calculate indoor WBGT (no solar radiation)
 * WBGT = 0.7 * Tw + 0.3 * Tg
 */
export function calculate_wbgt_indoor(temperature: number, humidity: number): WbgtResult;

/**
 * Calculate wet-bulb temperature using Stull formula
 * Reference: Stull, R. (2011). Wet-Bulb Temperature from Relative Humidity and Air Temperature
 */
export function calculate_wet_bulb(temperature: number, humidity: number): number;

/**
 * Classify WBGT into risk level with recommendations
 */
export function classify_risk(wbgt: number): WbgtResult;

/**
 * Calculate total safe work hours in a day
 */
export function count_safe_hours(forecast: HourlyForecast[], max_wbgt: number): number;

/**
 * Estimate dehydration rate in liters per hour
 */
export function estimate_dehydration_rate(wbgt: number, work_intensity: number): number;

/**
 * Find the best continuous work window
 */
export function find_best_work_window(forecast: HourlyForecast[], window_size: number): Uint8Array;

/**
 * Find the N nearest points to a target location
 */
export function find_nearest_points(points: GridPoint[], target_lat: number, target_lon: number, n: number): GridPoint[];

/**
 * Generate human-readable schedule summary
 */
export function format_schedule_summary(schedule: WorkSchedule): string;

/**
 * Generate 72-hour forecast for testing
 */
export function generate_72h_forecast(base_temp: number, humidity: number): HourlyForecast[];

/**
 * Generate demo 24-hour forecast for testing
 */
export function generate_demo_forecast(base_temp: number, humidity: number): HourlyForecast[];

/**
 * Generate a regular grid of points covering a bounding box
 */
export function generate_grid(min_lat: number, max_lat: number, min_lon: number, max_lon: number, resolution_km: number): GridPoint[];

/**
 * Generate Uganda's 5km grid for WBGT predictions
 */
export function generate_uganda_grid(): GridPoint[];

/**
 * Get evening work window
 */
export function get_evening_window(forecast: HourlyForecast[]): Uint8Array;

/**
 * Get library info
 */
export function get_library_info(): string;

/**
 * Get maximum recommended continuous work time in minutes
 */
export function get_max_work_duration(wbgt: number): number;

/**
 * Get early morning work window (typically safest)
 */
export function get_morning_window(forecast: HourlyForecast[]): Uint8Array;

/**
 * Get risk color for visualization
 */
export function get_risk_color(wbgt: number): string;

/**
 * Get risk label text
 */
export function get_risk_label(wbgt: number): string;

/**
 * Get risk level as number (0-4)
 */
export function get_risk_level(wbgt: number): number;

/**
 * Get localized risk message in Luganda
 */
export function get_risk_message_luganda(wbgt: number): string;

/**
 * Get localized risk message in Runyankole
 */
export function get_risk_message_runyankole(wbgt: number): string;

/**
 * Get Uganda districts for demo
 */
export function get_uganda_districts(): District[];

/**
 * Get library version
 */
export function get_version(): string;

/**
 * Get heat illness symptoms to watch for
 */
export function get_warning_symptoms(): string;

/**
 * Get required water intake in ml per hour
 */
export function get_water_requirement(wbgt: number): number;

/**
 * Get work-rest ratio recommendation
 */
export function get_work_rest_ratio(wbgt: number): string;

/**
 * Calculate haversine distance between two points in kilometers
 */
export function haversine_distance(lat1: number, lon1: number, lat2: number, lon2: number): number;

/**
 * Initialize panic hook for better error messages in browser console
 */
export function init(): void;

/**
 * Bilinear interpolation for regular grids
 *
 * Fast interpolation method for data on a regular lat/lon grid.
 *
 * # Arguments
 * * `values` - 2D array of values (flattened row-major)
 * * `min_lat` - Minimum latitude of grid
 * * `max_lat` - Maximum latitude of grid
 * * `min_lon` - Minimum longitude of grid
 * * `max_lon` - Maximum longitude of grid
 * * `rows` - Number of rows in grid
 * * `cols` - Number of columns in grid
 * * `target_lat` - Target latitude
 * * `target_lon` - Target longitude
 */
export function interpolate_bilinear(values: Float64Array, min_lat: number, max_lat: number, min_lon: number, max_lon: number, rows: number, cols: number, target_lat: number, target_lon: number): number;

/**
 * Simplified interpolation using default power of 2
 */
export function interpolate_grid(points: GridPoint[], target_lat: number, target_lon: number): number;

/**
 * Inverse Distance Weighting (IDW) interpolation
 *
 * Estimates a value at a target location based on nearby known values,
 * weighted by the inverse of distance.
 *
 * # Arguments
 * * `points` - Array of known grid points with values
 * * `target_lat` - Latitude of target location
 * * `target_lon` - Longitude of target location
 * * `power` - Distance weighting power (typically 2)
 *
 * # Returns
 * * Interpolated value at target location
 */
export function interpolate_idw(points: GridPoint[], target_lat: number, target_lon: number, power: number): number;

/**
 * Optimize work schedule based on 24-hour forecast
 *
 * Finds the safest work windows while maximizing productive hours.
 *
 * # Arguments
 * * `forecast` - Array of hourly forecasts (24 hours)
 * * `work_hours_needed` - Required work hours (1-12)
 *
 * # Returns
 * * `WorkSchedule` - Optimized schedule with safe hours and recommendations
 */
export function optimize_work_schedule(forecast: HourlyForecast[], work_hours_needed: number): WorkSchedule;

/**
 * Check if work should be suspended
 */
export function should_suspend_work(wbgt: number): boolean;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_district_free: (a: number, b: number) => void;
    readonly __wbg_get_district_id: (a: number) => number;
    readonly __wbg_get_district_lat: (a: number) => number;
    readonly __wbg_get_district_lon: (a: number) => number;
    readonly __wbg_get_district_name: (a: number) => [number, number];
    readonly __wbg_get_district_region: (a: number) => [number, number];
    readonly __wbg_get_gridpoint_value: (a: number) => number;
    readonly __wbg_get_hourlyforecast_hour: (a: number) => number;
    readonly __wbg_get_hourlyforecast_solar_radiation: (a: number) => number;
    readonly __wbg_get_hourlyforecast_wind_speed: (a: number) => number;
    readonly __wbg_get_wbgtresult_risk_code: (a: number) => number;
    readonly __wbg_get_wbgtresult_risk_level: (a: number) => [number, number];
    readonly __wbg_get_workschedule_recommended_end: (a: number) => number;
    readonly __wbg_get_workschedule_recommended_start: (a: number) => number;
    readonly __wbg_get_workschedule_safe_hours: (a: number) => [number, number];
    readonly __wbg_get_workschedule_total_safe_hours: (a: number) => number;
    readonly __wbg_gridpoint_free: (a: number, b: number) => void;
    readonly __wbg_hourlyforecast_free: (a: number, b: number) => void;
    readonly __wbg_set_district_id: (a: number, b: number) => void;
    readonly __wbg_set_district_lat: (a: number, b: number) => void;
    readonly __wbg_set_district_lon: (a: number, b: number) => void;
    readonly __wbg_set_district_name: (a: number, b: number, c: number) => void;
    readonly __wbg_set_district_region: (a: number, b: number, c: number) => void;
    readonly __wbg_set_gridpoint_value: (a: number, b: number) => void;
    readonly __wbg_set_hourlyforecast_hour: (a: number, b: number) => void;
    readonly __wbg_set_hourlyforecast_solar_radiation: (a: number, b: number) => void;
    readonly __wbg_set_hourlyforecast_wind_speed: (a: number, b: number) => void;
    readonly __wbg_set_wbgtresult_risk_code: (a: number, b: number) => void;
    readonly __wbg_set_wbgtresult_risk_level: (a: number, b: number, c: number) => void;
    readonly __wbg_set_workschedule_recommended_end: (a: number, b: number) => void;
    readonly __wbg_set_workschedule_recommended_start: (a: number, b: number) => void;
    readonly __wbg_set_workschedule_total_safe_hours: (a: number, b: number) => void;
    readonly __wbg_wbgtresult_free: (a: number, b: number) => void;
    readonly __wbg_workschedule_free: (a: number, b: number) => void;
    readonly district_new: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => number;
    readonly get_library_info: () => [number, number];
    readonly get_uganda_districts: () => [number, number];
    readonly get_version: () => [number, number];
    readonly gridpoint_new: (a: number, b: number, c: number) => number;
    readonly hourlyforecast_new: (a: number, b: number, c: number, d: number, e: number, f: number) => number;
    readonly init: () => void;
    readonly wbgtresult_new: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => number;
    readonly workschedule_new: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => number;
    readonly workschedule_safe_hours_array: (a: number) => [number, number];
    readonly __wbg_set_gridpoint_lat: (a: number, b: number) => void;
    readonly __wbg_set_gridpoint_lon: (a: number, b: number) => void;
    readonly __wbg_set_hourlyforecast_humidity: (a: number, b: number) => void;
    readonly __wbg_set_hourlyforecast_temperature: (a: number, b: number) => void;
    readonly __wbg_set_hourlyforecast_wbgt: (a: number, b: number) => void;
    readonly __wbg_set_wbgtresult_wbgt: (a: number, b: number) => void;
    readonly __wbg_set_workschedule_productivity_score: (a: number, b: number) => void;
    readonly __wbg_get_wbgtresult_color: (a: number) => [number, number];
    readonly __wbg_get_wbgtresult_recommendation: (a: number) => [number, number];
    readonly __wbg_get_workschedule_break_schedule: (a: number) => [number, number];
    readonly __wbg_set_wbgtresult_color: (a: number, b: number, c: number) => void;
    readonly __wbg_set_wbgtresult_recommendation: (a: number, b: number, c: number) => void;
    readonly __wbg_set_workschedule_break_schedule: (a: number, b: number, c: number) => void;
    readonly __wbg_set_workschedule_safe_hours: (a: number, b: number, c: number) => void;
    readonly __wbg_get_gridpoint_lat: (a: number) => number;
    readonly __wbg_get_gridpoint_lon: (a: number) => number;
    readonly __wbg_get_hourlyforecast_humidity: (a: number) => number;
    readonly __wbg_get_hourlyforecast_temperature: (a: number) => number;
    readonly __wbg_get_hourlyforecast_wbgt: (a: number) => number;
    readonly __wbg_get_wbgtresult_wbgt: (a: number) => number;
    readonly __wbg_get_workschedule_productivity_score: (a: number) => number;
    readonly calculate_productivity_impact: (a: number) => number;
    readonly classify_risk: (a: number) => number;
    readonly get_max_work_duration: (a: number) => number;
    readonly get_risk_color: (a: number) => [number, number];
    readonly get_risk_label: (a: number) => [number, number];
    readonly get_risk_level: (a: number) => number;
    readonly get_risk_message_luganda: (a: number) => [number, number];
    readonly get_risk_message_runyankole: (a: number) => [number, number];
    readonly get_warning_symptoms: () => [number, number];
    readonly get_water_requirement: (a: number) => number;
    readonly get_work_rest_ratio: (a: number) => [number, number];
    readonly should_suspend_work: (a: number) => number;
    readonly calculate_globe_temperature: (a: number, b: number, c: number) => number;
    readonly calculate_heat_index: (a: number, b: number) => number;
    readonly calculate_thermal_work_limit: (a: number) => number;
    readonly calculate_wbgt: (a: number, b: number, c: number, d: number) => number;
    readonly calculate_wbgt_indoor: (a: number, b: number) => number;
    readonly estimate_dehydration_rate: (a: number, b: number) => number;
    readonly calculate_water_intake: (a: number, b: number, c: number) => number;
    readonly calculate_wet_bulb: (a: number, b: number) => number;
    readonly calculate_centroid: (a: number, b: number) => number;
    readonly find_nearest_points: (a: number, b: number, c: number, d: number, e: number) => [number, number];
    readonly generate_grid: (a: number, b: number, c: number, d: number, e: number) => [number, number];
    readonly generate_uganda_grid: () => [number, number];
    readonly haversine_distance: (a: number, b: number, c: number, d: number) => number;
    readonly interpolate_bilinear: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number) => number;
    readonly interpolate_grid: (a: number, b: number, c: number, d: number) => number;
    readonly interpolate_idw: (a: number, b: number, c: number, d: number, e: number) => number;
    readonly calculate_heat_exposure: (a: number, b: number, c: number, d: number) => number;
    readonly count_safe_hours: (a: number, b: number, c: number) => number;
    readonly find_best_work_window: (a: number, b: number, c: number) => [number, number];
    readonly format_schedule_summary: (a: number) => [number, number];
    readonly generate_72h_forecast: (a: number, b: number) => [number, number];
    readonly generate_demo_forecast: (a: number, b: number) => [number, number];
    readonly get_evening_window: (a: number, b: number) => [number, number];
    readonly get_morning_window: (a: number, b: number) => [number, number];
    readonly optimize_work_schedule: (a: number, b: number, c: number) => number;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __externref_table_alloc: () => number;
    readonly __externref_drop_slice: (a: number, b: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
