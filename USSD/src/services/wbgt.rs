//! WBGT calculation service

use crate::models::forecast::{RiskLevel, WbgtResult};

/// Risk thresholds (°C)
const WBGT_LOW: f64 = 26.0;
const WBGT_MODERATE: f64 = 28.0;
const WBGT_HIGH: f64 = 30.0;
const WBGT_VERY_HIGH: f64 = 32.0;

/// Calculate WBGT from environmental factors
pub fn calculate_wbgt(
    temperature: f64,
    humidity: f64,
    wind_speed: f64,
    solar_radiation: f64,
) -> WbgtResult {
    let tw = calculate_wet_bulb(temperature, humidity);
    let tg = calculate_globe_temperature(temperature, wind_speed, solar_radiation);

    // Outdoor WBGT formula
    let wbgt = 0.7 * tw + 0.2 * tg + 0.1 * temperature;

    classify_risk(wbgt)
}

/// Calculate wet-bulb temperature using Stull formula
fn calculate_wet_bulb(temperature: f64, humidity: f64) -> f64 {
    let t = temperature;
    let rh = humidity;

    t * (0.151977 * (rh + 8.313659_f64).sqrt()).atan()
        + (t + rh).atan()
        - (rh - 1.676331).atan()
        + 0.00391838 * rh.powf(1.5) * (0.023101 * rh).atan()
        - 4.686035
}

/// Calculate globe temperature
fn calculate_globe_temperature(
    temperature: f64,
    wind_speed: f64,
    solar_radiation: f64,
) -> f64 {
    let emissivity = 0.95;
    let diameter = 0.15;
    let stefan_boltzmann = 5.67e-8;

    let h_conv = if wind_speed < 0.1 {
        1.4 * (temperature.abs() / diameter).powf(0.25)
    } else {
        6.3 * wind_speed.powf(0.6) / diameter.powf(0.4)
    };

    let q_solar = 0.95 * solar_radiation;
    let mut tg = temperature + 10.0;

    for _ in 0..20 {
        let q_rad_out = emissivity * stefan_boltzmann * (tg + 273.15).powf(4.0);
        let q_rad_in = emissivity * stefan_boltzmann * (temperature + 273.15).powf(4.0);
        let q_conv = h_conv * (tg - temperature);

        let residual = q_solar + q_rad_in - q_rad_out - q_conv;
        let dq_dtg = 4.0 * emissivity * stefan_boltzmann * (tg + 273.15).powf(3.0) + h_conv;
        tg += residual / dq_dtg;
    }

    tg
}

/// Classify WBGT into risk level
pub fn classify_risk(wbgt: f64) -> WbgtResult {
    let (risk_level, recommendation) = if wbgt < WBGT_LOW {
        (
            RiskLevel::Low,
            "Normal work. Drink 250ml water every 30 min.",
        )
    } else if wbgt < WBGT_MODERATE {
        (
            RiskLevel::Moderate,
            "15-min breaks hourly. 500ml water/hour.",
        )
    } else if wbgt < WBGT_HIGH {
        (
            RiskLevel::High,
            "Work 5-10am only. 30-min breaks. Seek shade.",
        )
    } else if wbgt < WBGT_VERY_HIGH {
        (
            RiskLevel::VeryHigh,
            "Work 6-10am only. Monitor for heat illness.",
        )
    } else {
        (
            RiskLevel::Extreme,
            "STOP outdoor work! Emergency protocols.",
        )
    };

    WbgtResult {
        wbgt,
        risk_level,
        recommendation: recommendation.to_string(),
    }
}

/// Get risk level from WBGT value
pub fn get_risk_level(wbgt: f64) -> RiskLevel {
    if wbgt < WBGT_LOW {
        RiskLevel::Low
    } else if wbgt < WBGT_MODERATE {
        RiskLevel::Moderate
    } else if wbgt < WBGT_HIGH {
        RiskLevel::High
    } else if wbgt < WBGT_VERY_HIGH {
        RiskLevel::VeryHigh
    } else {
        RiskLevel::Extreme
    }
}

/// Generate demo forecast for a location
pub fn generate_demo_forecast(base_temp: f64, humidity: f64) -> Vec<WbgtResult> {
    (0..24)
        .map(|hour| {
            let hour_factor = ((hour as f64 - 14.0).abs() / 12.0 - 1.0).abs();
            let temp = base_temp - 8.0 + hour_factor * 12.0;

            let solar = if hour >= 6 && hour <= 18 {
                let solar_hour = (hour as f64 - 12.0).abs();
                (1.0 - solar_hour / 6.0) * 900.0
            } else {
                0.0
            };

            let wind = if hour >= 8 && hour <= 18 { 3.0 } else { 1.5 };

            calculate_wbgt(temp, humidity, wind, solar)
        })
        .collect()
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
    fn test_risk_classification() {
        assert!(matches!(get_risk_level(24.0), RiskLevel::Low));
        assert!(matches!(get_risk_level(27.0), RiskLevel::Moderate));
        assert!(matches!(get_risk_level(29.0), RiskLevel::High));
        assert!(matches!(get_risk_level(31.0), RiskLevel::VeryHigh));
        assert!(matches!(get_risk_level(33.0), RiskLevel::Extreme));
    }
}
