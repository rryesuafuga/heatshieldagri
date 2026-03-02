/* @ts-self-types="./heatshield_wasm.d.ts" */

/**
 * District information for Uganda
 */
export class District {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(District.prototype);
        obj.__wbg_ptr = ptr;
        DistrictFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        DistrictFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_district_free(ptr, 0);
    }
    /**
     * @param {number} id
     * @param {string} name
     * @param {string} region
     * @param {number} lat
     * @param {number} lon
     */
    constructor(id, name, region, lat, lon) {
        const ptr0 = passStringToWasm0(name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(region, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.district_new(id, ptr0, len0, ptr1, len1, lat, lon);
        this.__wbg_ptr = ret >>> 0;
        DistrictFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @returns {number}
     */
    get id() {
        const ret = wasm.__wbg_get_district_id(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    get lat() {
        const ret = wasm.__wbg_get_district_lat(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get lon() {
        const ret = wasm.__wbg_get_district_lon(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {string}
     */
    get name() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.__wbg_get_district_name(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @returns {string}
     */
    get region() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.__wbg_get_district_region(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @param {number} arg0
     */
    set id(arg0) {
        wasm.__wbg_set_district_id(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} arg0
     */
    set lat(arg0) {
        wasm.__wbg_set_district_lat(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} arg0
     */
    set lon(arg0) {
        wasm.__wbg_set_district_lon(this.__wbg_ptr, arg0);
    }
    /**
     * @param {string} arg0
     */
    set name(arg0) {
        const ptr0 = passStringToWasm0(arg0, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_district_name(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * @param {string} arg0
     */
    set region(arg0) {
        const ptr0 = passStringToWasm0(arg0, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_district_region(this.__wbg_ptr, ptr0, len0);
    }
}
if (Symbol.dispose) District.prototype[Symbol.dispose] = District.prototype.free;

/**
 * Grid point for spatial data
 */
export class GridPoint {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(GridPoint.prototype);
        obj.__wbg_ptr = ptr;
        GridPointFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    static __unwrap(jsValue) {
        if (!(jsValue instanceof GridPoint)) {
            return 0;
        }
        return jsValue.__destroy_into_raw();
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        GridPointFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_gridpoint_free(ptr, 0);
    }
    /**
     * @returns {number}
     */
    get lat() {
        const ret = wasm.__wbg_get_gridpoint_lat(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get lon() {
        const ret = wasm.__wbg_get_gridpoint_lon(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get value() {
        const ret = wasm.__wbg_get_gridpoint_value(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} lat
     * @param {number} lon
     * @param {number} value
     */
    constructor(lat, lon, value) {
        const ret = wasm.gridpoint_new(lat, lon, value);
        this.__wbg_ptr = ret >>> 0;
        GridPointFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @param {number} arg0
     */
    set lat(arg0) {
        wasm.__wbg_set_gridpoint_lat(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} arg0
     */
    set lon(arg0) {
        wasm.__wbg_set_gridpoint_lon(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} arg0
     */
    set value(arg0) {
        wasm.__wbg_set_gridpoint_value(this.__wbg_ptr, arg0);
    }
}
if (Symbol.dispose) GridPoint.prototype[Symbol.dispose] = GridPoint.prototype.free;

/**
 * Hourly forecast data point
 */
export class HourlyForecast {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(HourlyForecast.prototype);
        obj.__wbg_ptr = ptr;
        HourlyForecastFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    static __unwrap(jsValue) {
        if (!(jsValue instanceof HourlyForecast)) {
            return 0;
        }
        return jsValue.__destroy_into_raw();
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        HourlyForecastFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_hourlyforecast_free(ptr, 0);
    }
    /**
     * @returns {number}
     */
    get hour() {
        const ret = wasm.__wbg_get_hourlyforecast_hour(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get humidity() {
        const ret = wasm.__wbg_get_hourlyforecast_humidity(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get solar_radiation() {
        const ret = wasm.__wbg_get_hourlyforecast_solar_radiation(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get temperature() {
        const ret = wasm.__wbg_get_hourlyforecast_temperature(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get wbgt() {
        const ret = wasm.__wbg_get_hourlyforecast_wbgt(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get wind_speed() {
        const ret = wasm.__wbg_get_hourlyforecast_wind_speed(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} hour
     * @param {number} wbgt
     * @param {number} temperature
     * @param {number} humidity
     * @param {number} wind_speed
     * @param {number} solar_radiation
     */
    constructor(hour, wbgt, temperature, humidity, wind_speed, solar_radiation) {
        const ret = wasm.hourlyforecast_new(hour, wbgt, temperature, humidity, wind_speed, solar_radiation);
        this.__wbg_ptr = ret >>> 0;
        HourlyForecastFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @param {number} arg0
     */
    set hour(arg0) {
        wasm.__wbg_set_hourlyforecast_hour(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} arg0
     */
    set humidity(arg0) {
        wasm.__wbg_set_hourlyforecast_humidity(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} arg0
     */
    set solar_radiation(arg0) {
        wasm.__wbg_set_hourlyforecast_solar_radiation(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} arg0
     */
    set temperature(arg0) {
        wasm.__wbg_set_hourlyforecast_temperature(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} arg0
     */
    set wbgt(arg0) {
        wasm.__wbg_set_hourlyforecast_wbgt(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} arg0
     */
    set wind_speed(arg0) {
        wasm.__wbg_set_hourlyforecast_wind_speed(this.__wbg_ptr, arg0);
    }
}
if (Symbol.dispose) HourlyForecast.prototype[Symbol.dispose] = HourlyForecast.prototype.free;

/**
 * Risk level enumeration
 * @enum {0 | 1 | 2 | 3 | 4}
 */
export const RiskLevel = Object.freeze({
    Low: 0, "0": "Low",
    Moderate: 1, "1": "Moderate",
    High: 2, "2": "High",
    VeryHigh: 3, "3": "VeryHigh",
    Extreme: 4, "4": "Extreme",
});

/**
 * WBGT calculation result with risk assessment
 */
export class WbgtResult {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(WbgtResult.prototype);
        obj.__wbg_ptr = ptr;
        WbgtResultFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        WbgtResultFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wbgtresult_free(ptr, 0);
    }
    /**
     * @returns {string}
     */
    get color() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.__wbg_get_wbgtresult_color(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @returns {string}
     */
    get recommendation() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.__wbg_get_wbgtresult_recommendation(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @returns {number}
     */
    get risk_code() {
        const ret = wasm.__wbg_get_wbgtresult_risk_code(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {string}
     */
    get risk_level() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.__wbg_get_wbgtresult_risk_level(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @returns {number}
     */
    get wbgt() {
        const ret = wasm.__wbg_get_wbgtresult_wbgt(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {string} arg0
     */
    set color(arg0) {
        const ptr0 = passStringToWasm0(arg0, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wbgtresult_color(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * @param {string} arg0
     */
    set recommendation(arg0) {
        const ptr0 = passStringToWasm0(arg0, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wbgtresult_recommendation(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * @param {number} arg0
     */
    set risk_code(arg0) {
        wasm.__wbg_set_wbgtresult_risk_code(this.__wbg_ptr, arg0);
    }
    /**
     * @param {string} arg0
     */
    set risk_level(arg0) {
        const ptr0 = passStringToWasm0(arg0, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wbgtresult_risk_level(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * @param {number} arg0
     */
    set wbgt(arg0) {
        wasm.__wbg_set_wbgtresult_wbgt(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} wbgt
     * @param {string} risk_level
     * @param {number} risk_code
     * @param {string} recommendation
     * @param {string} color
     */
    constructor(wbgt, risk_level, risk_code, recommendation, color) {
        const ptr0 = passStringToWasm0(risk_level, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(recommendation, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passStringToWasm0(color, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len2 = WASM_VECTOR_LEN;
        const ret = wasm.wbgtresult_new(wbgt, ptr0, len0, risk_code, ptr1, len1, ptr2, len2);
        this.__wbg_ptr = ret >>> 0;
        WbgtResultFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
}
if (Symbol.dispose) WbgtResult.prototype[Symbol.dispose] = WbgtResult.prototype.free;

/**
 * Optimized work schedule
 */
export class WorkSchedule {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(WorkSchedule.prototype);
        obj.__wbg_ptr = ptr;
        WorkScheduleFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        WorkScheduleFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_workschedule_free(ptr, 0);
    }
    /**
     * @returns {string}
     */
    get break_schedule() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.__wbg_get_workschedule_break_schedule(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @returns {number}
     */
    get productivity_score() {
        const ret = wasm.__wbg_get_workschedule_productivity_score(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get recommended_end() {
        const ret = wasm.__wbg_get_workschedule_recommended_end(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get recommended_start() {
        const ret = wasm.__wbg_get_workschedule_recommended_start(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {Uint8Array}
     */
    get safe_hours() {
        const ret = wasm.__wbg_get_workschedule_safe_hours(this.__wbg_ptr);
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
    /**
     * @returns {number}
     */
    get total_safe_hours() {
        const ret = wasm.__wbg_get_workschedule_total_safe_hours(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {string} arg0
     */
    set break_schedule(arg0) {
        const ptr0 = passStringToWasm0(arg0, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_workschedule_break_schedule(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * @param {number} arg0
     */
    set productivity_score(arg0) {
        wasm.__wbg_set_workschedule_productivity_score(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} arg0
     */
    set recommended_end(arg0) {
        wasm.__wbg_set_workschedule_recommended_end(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} arg0
     */
    set recommended_start(arg0) {
        wasm.__wbg_set_workschedule_recommended_start(this.__wbg_ptr, arg0);
    }
    /**
     * @param {Uint8Array} arg0
     */
    set safe_hours(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_workschedule_safe_hours(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * @param {number} arg0
     */
    set total_safe_hours(arg0) {
        wasm.__wbg_set_workschedule_total_safe_hours(this.__wbg_ptr, arg0);
    }
    /**
     * @param {Uint8Array} safe_hours
     * @param {number} total_safe_hours
     * @param {number} recommended_start
     * @param {number} recommended_end
     * @param {string} break_schedule
     * @param {number} productivity_score
     */
    constructor(safe_hours, total_safe_hours, recommended_start, recommended_end, break_schedule, productivity_score) {
        const ptr0 = passArray8ToWasm0(safe_hours, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(break_schedule, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.workschedule_new(ptr0, len0, total_safe_hours, recommended_start, recommended_end, ptr1, len1, productivity_score);
        this.__wbg_ptr = ret >>> 0;
        WorkScheduleFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @returns {Uint8Array}
     */
    get safe_hours_array() {
        const ret = wasm.workschedule_safe_hours_array(this.__wbg_ptr);
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
}
if (Symbol.dispose) WorkSchedule.prototype[Symbol.dispose] = WorkSchedule.prototype.free;

/**
 * Calculate the centroid of a set of points
 * @param {GridPoint[]} points
 * @returns {GridPoint}
 */
export function calculate_centroid(points) {
    const ptr0 = passArrayJsValueToWasm0(points, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.calculate_centroid(ptr0, len0);
    return GridPoint.__wrap(ret);
}

/**
 * Calculate globe temperature from environmental factors
 * Simplified model based on Liljegren et al. (2008)
 * @param {number} temperature
 * @param {number} wind_speed
 * @param {number} solar_radiation
 * @returns {number}
 */
export function calculate_globe_temperature(temperature, wind_speed, solar_radiation) {
    const ret = wasm.calculate_globe_temperature(temperature, wind_speed, solar_radiation);
    return ret;
}

/**
 * Calculate daily heat exposure index
 * @param {HourlyForecast[]} forecast
 * @param {Uint8Array} work_hours
 * @returns {number}
 */
export function calculate_heat_exposure(forecast, work_hours) {
    const ptr0 = passArrayJsValueToWasm0(forecast, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(work_hours, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.calculate_heat_exposure(ptr0, len0, ptr1, len1);
    return ret;
}

/**
 * Calculate heat index (feels-like temperature)
 * Using NWS formula
 * @param {number} temperature
 * @param {number} humidity
 * @returns {number}
 */
export function calculate_heat_index(temperature, humidity) {
    const ret = wasm.calculate_heat_index(temperature, humidity);
    return ret;
}

/**
 * Calculate productivity impact percentage
 * @param {number} wbgt
 * @returns {number}
 */
export function calculate_productivity_impact(wbgt) {
    const ret = wasm.calculate_productivity_impact(wbgt);
    return ret;
}

/**
 * Calculate thermal work limit (TWL) in W/m²
 * Maximum sustainable metabolic rate for given conditions
 * @param {number} wbgt
 * @returns {number}
 */
export function calculate_thermal_work_limit(wbgt) {
    const ret = wasm.calculate_thermal_work_limit(wbgt);
    return ret;
}

/**
 * Calculate recommended water intake in liters
 * @param {number} wbgt
 * @param {number} work_hours
 * @param {number} work_intensity
 * @returns {number}
 */
export function calculate_water_intake(wbgt, work_hours, work_intensity) {
    const ret = wasm.calculate_water_intake(wbgt, work_hours, work_intensity);
    return ret;
}

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
 * @param {number} temperature
 * @param {number} humidity
 * @param {number} wind_speed
 * @param {number} solar_radiation
 * @returns {WbgtResult}
 */
export function calculate_wbgt(temperature, humidity, wind_speed, solar_radiation) {
    const ret = wasm.calculate_wbgt(temperature, humidity, wind_speed, solar_radiation);
    return WbgtResult.__wrap(ret);
}

/**
 * Calculate indoor WBGT (no solar radiation)
 * WBGT = 0.7 * Tw + 0.3 * Tg
 * @param {number} temperature
 * @param {number} humidity
 * @returns {WbgtResult}
 */
export function calculate_wbgt_indoor(temperature, humidity) {
    const ret = wasm.calculate_wbgt_indoor(temperature, humidity);
    return WbgtResult.__wrap(ret);
}

/**
 * Calculate wet-bulb temperature using Stull formula
 * Reference: Stull, R. (2011). Wet-Bulb Temperature from Relative Humidity and Air Temperature
 * @param {number} temperature
 * @param {number} humidity
 * @returns {number}
 */
export function calculate_wet_bulb(temperature, humidity) {
    const ret = wasm.calculate_wet_bulb(temperature, humidity);
    return ret;
}

/**
 * Classify WBGT into risk level with recommendations
 * @param {number} wbgt
 * @returns {WbgtResult}
 */
export function classify_risk(wbgt) {
    const ret = wasm.classify_risk(wbgt);
    return WbgtResult.__wrap(ret);
}

/**
 * Calculate total safe work hours in a day
 * @param {HourlyForecast[]} forecast
 * @param {number} max_wbgt
 * @returns {number}
 */
export function count_safe_hours(forecast, max_wbgt) {
    const ptr0 = passArrayJsValueToWasm0(forecast, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.count_safe_hours(ptr0, len0, max_wbgt);
    return ret;
}

/**
 * Estimate dehydration rate in liters per hour
 * @param {number} wbgt
 * @param {number} work_intensity
 * @returns {number}
 */
export function estimate_dehydration_rate(wbgt, work_intensity) {
    const ret = wasm.estimate_dehydration_rate(wbgt, work_intensity);
    return ret;
}

/**
 * Find the best continuous work window
 * @param {HourlyForecast[]} forecast
 * @param {number} window_size
 * @returns {Uint8Array}
 */
export function find_best_work_window(forecast, window_size) {
    const ptr0 = passArrayJsValueToWasm0(forecast, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.find_best_work_window(ptr0, len0, window_size);
    var v2 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v2;
}

/**
 * Find the N nearest points to a target location
 * @param {GridPoint[]} points
 * @param {number} target_lat
 * @param {number} target_lon
 * @param {number} n
 * @returns {GridPoint[]}
 */
export function find_nearest_points(points, target_lat, target_lon, n) {
    const ptr0 = passArrayJsValueToWasm0(points, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.find_nearest_points(ptr0, len0, target_lat, target_lon, n);
    var v2 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v2;
}

/**
 * Generate human-readable schedule summary
 * @param {WorkSchedule} schedule
 * @returns {string}
 */
export function format_schedule_summary(schedule) {
    let deferred1_0;
    let deferred1_1;
    try {
        _assertClass(schedule, WorkSchedule);
        const ret = wasm.format_schedule_summary(schedule.__wbg_ptr);
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}

/**
 * Generate 72-hour forecast for testing
 * @param {number} base_temp
 * @param {number} humidity
 * @returns {HourlyForecast[]}
 */
export function generate_72h_forecast(base_temp, humidity) {
    const ret = wasm.generate_72h_forecast(base_temp, humidity);
    var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v1;
}

/**
 * Generate demo 24-hour forecast for testing
 * @param {number} base_temp
 * @param {number} humidity
 * @returns {HourlyForecast[]}
 */
export function generate_demo_forecast(base_temp, humidity) {
    const ret = wasm.generate_demo_forecast(base_temp, humidity);
    var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v1;
}

/**
 * Generate a regular grid of points covering a bounding box
 * @param {number} min_lat
 * @param {number} max_lat
 * @param {number} min_lon
 * @param {number} max_lon
 * @param {number} resolution_km
 * @returns {GridPoint[]}
 */
export function generate_grid(min_lat, max_lat, min_lon, max_lon, resolution_km) {
    const ret = wasm.generate_grid(min_lat, max_lat, min_lon, max_lon, resolution_km);
    var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v1;
}

/**
 * Generate Uganda's 5km grid for WBGT predictions
 * @returns {GridPoint[]}
 */
export function generate_uganda_grid() {
    const ret = wasm.generate_uganda_grid();
    var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v1;
}

/**
 * Get evening work window
 * @param {HourlyForecast[]} forecast
 * @returns {Uint8Array}
 */
export function get_evening_window(forecast) {
    const ptr0 = passArrayJsValueToWasm0(forecast, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.get_evening_window(ptr0, len0);
    var v2 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v2;
}

/**
 * Get library info
 * @returns {string}
 */
export function get_library_info() {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.get_library_info();
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}

/**
 * Get maximum recommended continuous work time in minutes
 * @param {number} wbgt
 * @returns {number}
 */
export function get_max_work_duration(wbgt) {
    const ret = wasm.get_max_work_duration(wbgt);
    return ret >>> 0;
}

/**
 * Get early morning work window (typically safest)
 * @param {HourlyForecast[]} forecast
 * @returns {Uint8Array}
 */
export function get_morning_window(forecast) {
    const ptr0 = passArrayJsValueToWasm0(forecast, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.get_morning_window(ptr0, len0);
    var v2 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v2;
}

/**
 * Get risk color for visualization
 * @param {number} wbgt
 * @returns {string}
 */
export function get_risk_color(wbgt) {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.get_risk_color(wbgt);
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}

/**
 * Get risk label text
 * @param {number} wbgt
 * @returns {string}
 */
export function get_risk_label(wbgt) {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.get_risk_label(wbgt);
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}

/**
 * Get risk level as number (0-4)
 * @param {number} wbgt
 * @returns {number}
 */
export function get_risk_level(wbgt) {
    const ret = wasm.get_risk_level(wbgt);
    return ret;
}

/**
 * Get localized risk message in Luganda
 * @param {number} wbgt
 * @returns {string}
 */
export function get_risk_message_luganda(wbgt) {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.get_risk_message_luganda(wbgt);
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}

/**
 * Get localized risk message in Runyankole
 * @param {number} wbgt
 * @returns {string}
 */
export function get_risk_message_runyankole(wbgt) {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.get_risk_message_runyankole(wbgt);
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}

/**
 * Get Uganda districts for demo
 * @returns {District[]}
 */
export function get_uganda_districts() {
    const ret = wasm.get_uganda_districts();
    var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v1;
}

/**
 * Get library version
 * @returns {string}
 */
export function get_version() {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.get_version();
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}

/**
 * Get heat illness symptoms to watch for
 * @returns {string}
 */
export function get_warning_symptoms() {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.get_warning_symptoms();
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}

/**
 * Get required water intake in ml per hour
 * @param {number} wbgt
 * @returns {number}
 */
export function get_water_requirement(wbgt) {
    const ret = wasm.get_water_requirement(wbgt);
    return ret >>> 0;
}

/**
 * Get work-rest ratio recommendation
 * @param {number} wbgt
 * @returns {string}
 */
export function get_work_rest_ratio(wbgt) {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.get_work_rest_ratio(wbgt);
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}

/**
 * Calculate haversine distance between two points in kilometers
 * @param {number} lat1
 * @param {number} lon1
 * @param {number} lat2
 * @param {number} lon2
 * @returns {number}
 */
export function haversine_distance(lat1, lon1, lat2, lon2) {
    const ret = wasm.haversine_distance(lat1, lon1, lat2, lon2);
    return ret;
}

/**
 * Initialize panic hook for better error messages in browser console
 */
export function init() {
    wasm.init();
}

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
 * @param {Float64Array} values
 * @param {number} min_lat
 * @param {number} max_lat
 * @param {number} min_lon
 * @param {number} max_lon
 * @param {number} rows
 * @param {number} cols
 * @param {number} target_lat
 * @param {number} target_lon
 * @returns {number}
 */
export function interpolate_bilinear(values, min_lat, max_lat, min_lon, max_lon, rows, cols, target_lat, target_lon) {
    const ptr0 = passArrayF64ToWasm0(values, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.interpolate_bilinear(ptr0, len0, min_lat, max_lat, min_lon, max_lon, rows, cols, target_lat, target_lon);
    return ret;
}

/**
 * Simplified interpolation using default power of 2
 * @param {GridPoint[]} points
 * @param {number} target_lat
 * @param {number} target_lon
 * @returns {number}
 */
export function interpolate_grid(points, target_lat, target_lon) {
    const ptr0 = passArrayJsValueToWasm0(points, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.interpolate_grid(ptr0, len0, target_lat, target_lon);
    return ret;
}

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
 * @param {GridPoint[]} points
 * @param {number} target_lat
 * @param {number} target_lon
 * @param {number} power
 * @returns {number}
 */
export function interpolate_idw(points, target_lat, target_lon, power) {
    const ptr0 = passArrayJsValueToWasm0(points, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.interpolate_idw(ptr0, len0, target_lat, target_lon, power);
    return ret;
}

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
 * @param {HourlyForecast[]} forecast
 * @param {number} work_hours_needed
 * @returns {WorkSchedule}
 */
export function optimize_work_schedule(forecast, work_hours_needed) {
    const ptr0 = passArrayJsValueToWasm0(forecast, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.optimize_work_schedule(ptr0, len0, work_hours_needed);
    return WorkSchedule.__wrap(ret);
}

/**
 * Check if work should be suspended
 * @param {number} wbgt
 * @returns {boolean}
 */
export function should_suspend_work(wbgt) {
    const ret = wasm.should_suspend_work(wbgt);
    return ret !== 0;
}

function __wbg_get_imports() {
    const import0 = {
        __proto__: null,
        __wbg___wbindgen_throw_6ddd609b62940d55: function(arg0, arg1) {
            throw new Error(getStringFromWasm0(arg0, arg1));
        },
        __wbg_district_new: function(arg0) {
            const ret = District.__wrap(arg0);
            return ret;
        },
        __wbg_error_a6fa202b58aa1cd3: function(arg0, arg1) {
            let deferred0_0;
            let deferred0_1;
            try {
                deferred0_0 = arg0;
                deferred0_1 = arg1;
                console.error(getStringFromWasm0(arg0, arg1));
            } finally {
                wasm.__wbindgen_free(deferred0_0, deferred0_1, 1);
            }
        },
        __wbg_gridpoint_new: function(arg0) {
            const ret = GridPoint.__wrap(arg0);
            return ret;
        },
        __wbg_gridpoint_unwrap: function(arg0) {
            const ret = GridPoint.__unwrap(arg0);
            return ret;
        },
        __wbg_hourlyforecast_new: function(arg0) {
            const ret = HourlyForecast.__wrap(arg0);
            return ret;
        },
        __wbg_hourlyforecast_unwrap: function(arg0) {
            const ret = HourlyForecast.__unwrap(arg0);
            return ret;
        },
        __wbg_new_227d7c05414eb861: function() {
            const ret = new Error();
            return ret;
        },
        __wbg_stack_3b0d974bbf31e44f: function(arg0, arg1) {
            const ret = arg1.stack;
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbindgen_init_externref_table: function() {
            const table = wasm.__wbindgen_externrefs;
            const offset = table.grow(4);
            table.set(0, undefined);
            table.set(offset + 0, undefined);
            table.set(offset + 1, null);
            table.set(offset + 2, true);
            table.set(offset + 3, false);
        },
    };
    return {
        __proto__: null,
        "./heatshield_wasm_bg.js": import0,
    };
}

const DistrictFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_district_free(ptr >>> 0, 1));
const GridPointFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_gridpoint_free(ptr >>> 0, 1));
const HourlyForecastFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_hourlyforecast_free(ptr >>> 0, 1));
const WbgtResultFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_wbgtresult_free(ptr >>> 0, 1));
const WorkScheduleFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_workschedule_free(ptr >>> 0, 1));

function addToExternrefTable0(obj) {
    const idx = wasm.__externref_table_alloc();
    wasm.__wbindgen_externrefs.set(idx, obj);
    return idx;
}

function _assertClass(instance, klass) {
    if (!(instance instanceof klass)) {
        throw new Error(`expected instance of ${klass.name}`);
    }
}

function getArrayJsValueFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    const mem = getDataViewMemory0();
    const result = [];
    for (let i = ptr; i < ptr + 4 * len; i += 4) {
        result.push(wasm.__wbindgen_externrefs.get(mem.getUint32(i, true)));
    }
    wasm.__externref_drop_slice(ptr, len);
    return result;
}

function getArrayU8FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}

let cachedDataViewMemory0 = null;
function getDataViewMemory0() {
    if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer.detached === true || (cachedDataViewMemory0.buffer.detached === undefined && cachedDataViewMemory0.buffer !== wasm.memory.buffer)) {
        cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
    }
    return cachedDataViewMemory0;
}

let cachedFloat64ArrayMemory0 = null;
function getFloat64ArrayMemory0() {
    if (cachedFloat64ArrayMemory0 === null || cachedFloat64ArrayMemory0.byteLength === 0) {
        cachedFloat64ArrayMemory0 = new Float64Array(wasm.memory.buffer);
    }
    return cachedFloat64ArrayMemory0;
}

function getStringFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return decodeText(ptr, len);
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function passArray8ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 1, 1) >>> 0;
    getUint8ArrayMemory0().set(arg, ptr / 1);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function passArrayF64ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 8, 8) >>> 0;
    getFloat64ArrayMemory0().set(arg, ptr / 8);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function passArrayJsValueToWasm0(array, malloc) {
    const ptr = malloc(array.length * 4, 4) >>> 0;
    for (let i = 0; i < array.length; i++) {
        const add = addToExternrefTable0(array[i]);
        getDataViewMemory0().setUint32(ptr + 4 * i, add, true);
    }
    WASM_VECTOR_LEN = array.length;
    return ptr;
}

function passStringToWasm0(arg, malloc, realloc) {
    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length, 1) >>> 0;
        getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;

    const mem = getUint8ArrayMemory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }
    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
        const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
        const ret = cachedTextEncoder.encodeInto(arg, view);

        offset += ret.written;
        ptr = realloc(ptr, len, offset, 1) >>> 0;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
cachedTextDecoder.decode();
const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(ptr, len) {
    numBytesDecoded += len;
    if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
        cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
        cachedTextDecoder.decode();
        numBytesDecoded = len;
    }
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

const cachedTextEncoder = new TextEncoder();

if (!('encodeInto' in cachedTextEncoder)) {
    cachedTextEncoder.encodeInto = function (arg, view) {
        const buf = cachedTextEncoder.encode(arg);
        view.set(buf);
        return {
            read: arg.length,
            written: buf.length
        };
    };
}

let WASM_VECTOR_LEN = 0;

let wasmModule, wasm;
function __wbg_finalize_init(instance, module) {
    wasm = instance.exports;
    wasmModule = module;
    cachedDataViewMemory0 = null;
    cachedFloat64ArrayMemory0 = null;
    cachedUint8ArrayMemory0 = null;
    wasm.__wbindgen_start();
    return wasm;
}

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);
            } catch (e) {
                const validResponse = module.ok && expectedResponseType(module.type);

                if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else { throw e; }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);
    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };
        } else {
            return instance;
        }
    }

    function expectedResponseType(type) {
        switch (type) {
            case 'basic': case 'cors': case 'default': return true;
        }
        return false;
    }
}

function initSync(module) {
    if (wasm !== undefined) return wasm;


    if (module !== undefined) {
        if (Object.getPrototypeOf(module) === Object.prototype) {
            ({module} = module)
        } else {
            console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
        }
    }

    const imports = __wbg_get_imports();
    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }
    const instance = new WebAssembly.Instance(module, imports);
    return __wbg_finalize_init(instance, module);
}

async function __wbg_init(module_or_path) {
    if (wasm !== undefined) return wasm;


    if (module_or_path !== undefined) {
        if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
            ({module_or_path} = module_or_path)
        } else {
            console.warn('using deprecated parameters for the initialization function; pass a single object instead')
        }
    }

    if (module_or_path === undefined) {
        module_or_path = new URL('heatshield_wasm_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync, __wbg_init as default };
