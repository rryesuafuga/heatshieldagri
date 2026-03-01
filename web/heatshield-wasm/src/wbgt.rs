//! WBGT (Wet-Bulb Globe Temperature) Calculation Module
//!
//! Implements the ISO 7243 standard for occupational heat stress assessment.

use wasm_bindgen::prelude::*;
use crate::{WbgtResult, risk_classifier};

/// Calculate Wet-Bulb Globe Temperature (WBGT)
///
/// This uses the outdoor WBGT formula:
/// WBGT = 0.7 * Tw + 0.2 * Tg + 0.1 * Ta
///
/// Where:
/// - Tw = Natural wet-bulb temperature
/// - Tg = Globe temperature
/// - Ta = Dry-bulb (air) temperature
///
/// # Arguments
/// * `temperature` - Air temperature in Celsius
/// * `humidity` - Relative humidity (0-100)
/// * `wind_speed` - Wind speed in m/s
/// * `solar_radiation` - Solar radiation in W/m²
///
/// # Returns
/// * `WbgtResult` - WBGT value with risk assessment
#[wasm_bindgen]
pub fn calculate_wbgt(
    temperature: f64,
    humidity: f64,
    wind_speed: f64,
    solar_radiation: f64,
) -> WbgtResult {
    // Calculate wet-bulb temperature using Stull formula (2011)
    let tw = calculate_wet_bulb(temperature, humidity);

    // Calculate globe temperature
    let tg = calculate_globe_temperature(temperature, wind_speed, solar_radiation);

    // Calculate WBGT (outdoor formula)
    let wbgt = 0.7 * tw + 0.2 * tg + 0.1 * temperature;

    // Get risk classification
    risk_classifier::classify_risk(wbgt)
}

/// Calculate indoor WBGT (no solar radiation)
/// WBGT = 0.7 * Tw + 0.3 * Tg
#[wasm_bindgen]
pub fn calculate_wbgt_indoor(temperature: f64, humidity: f64) -> WbgtResult {
    let tw = calculate_wet_bulb(temperature, humidity);
    let tg = temperature + 2.0; // Simplified indoor globe temp

    let wbgt = 0.7 * tw + 0.3 * tg;

    risk_classifier::classify_risk(wbgt)
}

/// Calculate wet-bulb temperature using Stull formula
/// Reference: Stull, R. (2011). Wet-Bulb Temperature from Relative Humidity and Air Temperature
#[wasm_bindgen]
pub fn calculate_wet_bulb(temperature: f64, humidity: f64) -> f64 {
    let t = temperature;
    let rh = humidity;

    // Stull formula (valid for RH 5-99% and T -20 to 50°C)
    t * (0.151977 * (rh + 8.313659_f64).sqrt()).atan()
        + (t + rh).atan()
        - (rh - 1.676331).atan()
        + 0.00391838 * rh.powf(1.5) * (0.023101 * rh).atan()
        - 4.686035
}

/// Calculate globe temperature from environmental factors
/// Simplified model based on Liljegren et al. (2008)
#[wasm_bindgen]
pub fn calculate_globe_temperature(
    temperature: f64,
    wind_speed: f64,
    solar_radiation: f64,
) -> f64 {
    // Constants
    let emissivity = 0.95; // Black globe emissivity
    let diameter = 0.15; // Globe diameter in meters (150mm standard)
    let stefan_boltzmann = 5.67e-8;

    // Convective heat transfer coefficient
    let h_conv = if wind_speed < 0.1 {
        // Natural convection
        1.4 * (temperature.abs() / diameter).powf(0.25)
    } else {
        // Forced convection
        6.3 * wind_speed.powf(0.6) / diameter.powf(0.4)
    };

    // Absorbed solar radiation (assuming 0.95 absorptivity for black globe)
    let q_solar = 0.95 * solar_radiation;

    // Iterative solution for globe temperature
    let mut tg = temperature + 10.0; // Initial guess

    for _ in 0..20 {
        let q_rad_out = emissivity * stefan_boltzmann * (tg + 273.15).powf(4.0);
        let q_rad_in = emissivity * stefan_boltzmann * (temperature + 273.15).powf(4.0);
        let q_conv = h_conv * (tg - temperature);

        // Energy balance: q_solar + q_rad_in = q_rad_out + q_conv
        let residual = q_solar + q_rad_in - q_rad_out - q_conv;

        // Newton-Raphson update
        let dq_dtg = 4.0 * emissivity * stefan_boltzmann * (tg + 273.15).powf(3.0) + h_conv;
        tg += residual / dq_dtg;
    }

    tg
}

/// Calculate heat index (feels-like temperature)
/// Using NWS formula
#[wasm_bindgen]
pub fn calculate_heat_index(temperature: f64, humidity: f64) -> f64 {
    // Convert to Fahrenheit for NWS formula
    let t = temperature * 9.0 / 5.0 + 32.0;
    let r = humidity;

    // Simple formula for lower values
    if t < 80.0 {
        return (t - 32.0) * 5.0 / 9.0;
    }

    // Full NWS heat index formula
    let hi = -42.379
        + 2.04901523 * t
        + 10.14333127 * r
        - 0.22475541 * t * r
        - 0.00683783 * t * t
        - 0.05481717 * r * r
        + 0.00122874 * t * t * r
        + 0.00085282 * t * r * r
        - 0.00000199 * t * t * r * r;

    // Adjustments
    let hi = if r < 13.0 && t >= 80.0 && t <= 112.0 {
        hi - ((13.0 - r) / 4.0) * ((17.0 - (t - 95.0).abs()) / 17.0).sqrt()
    } else if r > 85.0 && t >= 80.0 && t <= 87.0 {
        hi + ((r - 85.0) / 10.0) * ((87.0 - t) / 5.0)
    } else {
        hi
    };

    // Convert back to Celsius
    (hi - 32.0) * 5.0 / 9.0
}

/// Calculate thermal work limit (TWL) in W/m²
/// Maximum sustainable metabolic rate for given conditions
#[wasm_bindgen]
pub fn calculate_thermal_work_limit(wbgt: f64) -> f64 {
    // Simplified TWL model based on ISO 7933
    if wbgt < 20.0 {
        450.0 // Maximum unrestricted work
    } else if wbgt > 35.0 {
        0.0 // No work recommended
    } else {
        450.0 - (wbgt - 20.0) * 30.0
    }
}

/// Estimate dehydration rate in liters per hour
#[wasm_bindgen]
pub fn estimate_dehydration_rate(wbgt: f64, work_intensity: f64) -> f64 {
    // work_intensity: 0-1 scale (0=rest, 1=heavy physical work)
    let base_rate = 0.3; // liters/hour at rest
    let activity_factor = 1.0 + work_intensity * 1.5;
    let heat_factor = if wbgt > 25.0 { 1.0 + (wbgt - 25.0) * 0.1 } else { 1.0 };

    base_rate * activity_factor * heat_factor
}

/// Calculate recommended water intake in liters
#[wasm_bindgen]
pub fn calculate_water_intake(wbgt: f64, work_hours: f64, work_intensity: f64) -> f64 {
    let dehydration_rate = estimate_dehydration_rate(wbgt, work_intensity);
    let intake = dehydration_rate * work_hours * 1.2; // 20% buffer

    // Cap at reasonable maximum
    intake.min(8.0)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_wbgt_calculation() {
        let result = calculate_wbgt(35.0, 70.0, 2.0, 800.0);
        assert!(result.wbgt > 25.0);
        assert!(result.wbgt < 40.0);
    }

    #[test]
    fn test_wet_bulb() {
        let tw = calculate_wet_bulb(30.0, 50.0);
        assert!(tw > 20.0);
        assert!(tw < 30.0);
    }

    #[test]
    fn test_heat_index() {
        let hi = calculate_heat_index(35.0, 70.0);
        assert!(hi > 35.0); // Heat index should be higher than air temp at high humidity
    }
}
