//! Work Schedule Optimization Module
//!
//! Generates optimal work schedules based on hourly WBGT forecasts.

use wasm_bindgen::prelude::*;
use crate::{HourlyForecast, WorkSchedule, risk_classifier};

/// Optimize work schedule based on 24-hour forecast
///
/// Finds the safest work windows while maximizing productive hours.
///
/// # Arguments
/// * `forecast` - Array of hourly forecasts (24 hours)
/// * `work_hours_needed` - Required work hours (1-12)
///
/// # Returns
/// * `WorkSchedule` - Optimized schedule with safe hours and recommendations
#[wasm_bindgen]
pub fn optimize_work_schedule(
    forecast: Vec<HourlyForecast>,
    work_hours_needed: u8,
) -> WorkSchedule {
    let work_hours = work_hours_needed.min(12) as usize;

    // Score each hour based on WBGT (lower is better)
    let mut hour_scores: Vec<(u8, f64)> = forecast
        .iter()
        .map(|f| (f.hour, f.wbgt))
        .collect();

    // Sort by WBGT (lowest first)
    hour_scores.sort_by(|a, b| a.1.partial_cmp(&b.1).unwrap());

    // Select the safest hours
    let safe_hours: Vec<u8> = hour_scores
        .iter()
        .take(work_hours)
        .map(|(h, _)| *h)
        .collect();

    let mut safe_hours_sorted = safe_hours.clone();
    safe_hours_sorted.sort();

    // Find recommended start and end times
    let recommended_start = *safe_hours_sorted.first().unwrap_or(&6);
    let recommended_end = *safe_hours_sorted.last().unwrap_or(&17);

    // Calculate productivity score (inverse of average WBGT in safe hours)
    let avg_wbgt: f64 = hour_scores
        .iter()
        .take(work_hours)
        .map(|(_, w)| *w)
        .sum::<f64>() / work_hours as f64;

    let productivity_score = ((40.0 - avg_wbgt) / 40.0 * 100.0).max(0.0).min(100.0);

    // Generate break schedule based on conditions
    let break_schedule = generate_break_schedule(avg_wbgt);

    WorkSchedule::new(
        safe_hours_sorted.clone(),
        safe_hours_sorted.len() as u8,
        recommended_start,
        recommended_end,
        break_schedule,
        productivity_score,
    )
}

/// Generate break schedule recommendation
fn generate_break_schedule(avg_wbgt: f64) -> String {
    if avg_wbgt < 26.0 {
        "Take a 10-minute break every 2 hours. Drink water during breaks.".to_string()
    } else if avg_wbgt < 28.0 {
        "Take a 15-minute break every hour. Stay in shade during breaks.".to_string()
    } else if avg_wbgt < 30.0 {
        "Take a 20-minute break every 45 minutes. Rest in coolest available area.".to_string()
    } else {
        "Take a 30-minute break every 30 minutes. Only essential work. Monitor for heat illness.".to_string()
    }
}

/// Find the best continuous work window
#[wasm_bindgen]
pub fn find_best_work_window(
    forecast: Vec<HourlyForecast>,
    window_size: u8,
) -> Vec<u8> {
    let size = window_size as usize;

    if forecast.len() < size {
        return (0..forecast.len() as u8).collect();
    }

    let mut best_start = 0;
    let mut best_avg = f64::MAX;

    for start in 0..=(forecast.len() - size) {
        let avg: f64 = forecast[start..(start + size)]
            .iter()
            .map(|f| f.wbgt)
            .sum::<f64>() / size as f64;

        if avg < best_avg {
            best_avg = avg;
            best_start = start;
        }
    }

    (best_start..(best_start + size))
        .map(|h| h as u8)
        .collect()
}

/// Get early morning work window (typically safest)
#[wasm_bindgen]
pub fn get_morning_window(forecast: Vec<HourlyForecast>) -> Vec<u8> {
    forecast
        .iter()
        .filter(|f| f.hour >= 5 && f.hour <= 10)
        .map(|f| f.hour)
        .collect()
}

/// Get evening work window
#[wasm_bindgen]
pub fn get_evening_window(forecast: Vec<HourlyForecast>) -> Vec<u8> {
    forecast
        .iter()
        .filter(|f| f.hour >= 16 && f.hour <= 19)
        .map(|f| f.hour)
        .collect()
}

/// Calculate total safe work hours in a day
#[wasm_bindgen]
pub fn count_safe_hours(forecast: Vec<HourlyForecast>, max_wbgt: f64) -> u8 {
    forecast
        .iter()
        .filter(|f| f.wbgt <= max_wbgt)
        .count() as u8
}

/// Generate human-readable schedule summary
#[wasm_bindgen]
pub fn format_schedule_summary(schedule: &WorkSchedule) -> String {
    if schedule.total_safe_hours == 0 {
        return "No safe work hours available today. Consider indoor tasks only.".to_string();
    }

    let hours: Vec<String> = schedule.safe_hours.iter()
        .map(|h| format!("{}:00", h))
        .collect();

    format!(
        "Recommended work hours: {}-{}:00 ({} hours)\nSafe periods: {}\n{}",
        schedule.recommended_start,
        schedule.recommended_end,
        schedule.total_safe_hours,
        hours.join(", "),
        schedule.break_schedule
    )
}

/// Calculate daily heat exposure index
#[wasm_bindgen]
pub fn calculate_heat_exposure(forecast: Vec<HourlyForecast>, work_hours: Vec<u8>) -> f64 {
    let work_forecasts: Vec<&HourlyForecast> = forecast
        .iter()
        .filter(|f| work_hours.contains(&f.hour))
        .collect();

    if work_forecasts.is_empty() {
        return 0.0;
    }

    // Weighted sum considering both WBGT and duration
    work_forecasts
        .iter()
        .map(|f| {
            let risk = risk_classifier::get_risk_level(f.wbgt) as f64;
            risk * (f.wbgt / 30.0)
        })
        .sum::<f64>() / work_forecasts.len() as f64
}

/// Generate demo 24-hour forecast for testing
#[wasm_bindgen]
pub fn generate_demo_forecast(base_temp: f64, humidity: f64) -> Vec<HourlyForecast> {
    (0..24)
        .map(|hour| {
            // Temperature varies by hour (cooler at night, peak at 14:00)
            let hour_factor = ((hour as f64 - 14.0).abs() / 12.0 - 1.0).abs();
            let temp = base_temp - 8.0 + hour_factor * 12.0;

            // Solar radiation follows daylight pattern
            let solar = if hour >= 6 && hour <= 18 {
                let solar_hour = (hour as f64 - 12.0).abs();
                (1.0 - solar_hour / 6.0) * 900.0
            } else {
                0.0
            };

            // Wind typically lower at night
            let wind = if hour >= 8 && hour <= 18 { 3.0 } else { 1.5 };

            // Calculate WBGT
            let result = crate::wbgt::calculate_wbgt(temp, humidity, wind, solar);

            HourlyForecast::new(
                hour as u8,
                result.wbgt,
                temp,
                humidity,
                wind,
                solar,
            )
        })
        .collect()
}

/// Generate 72-hour forecast for testing
#[wasm_bindgen]
pub fn generate_72h_forecast(base_temp: f64, humidity: f64) -> Vec<HourlyForecast> {
    (0..72)
        .map(|i| {
            let hour = (i % 24) as u8;
            let day = i / 24;

            // Slight temperature variation by day
            let day_offset = (day as f64 - 1.0) * 1.5;
            let temp_base = base_temp + day_offset;

            // Temperature varies by hour
            let hour_factor = ((hour as f64 - 14.0).abs() / 12.0 - 1.0).abs();
            let temp = temp_base - 8.0 + hour_factor * 12.0;

            let solar = if hour >= 6 && hour <= 18 {
                let solar_hour = (hour as f64 - 12.0).abs();
                (1.0 - solar_hour / 6.0) * 900.0
            } else {
                0.0
            };

            let wind = if hour >= 8 && hour <= 18 { 3.0 } else { 1.5 };

            let result = crate::wbgt::calculate_wbgt(temp, humidity, wind, solar);

            HourlyForecast::new(hour, result.wbgt, temp, humidity, wind, solar)
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_schedule_optimization() {
        let forecast = generate_demo_forecast(32.0, 70.0);
        let schedule = optimize_work_schedule(forecast, 6);

        assert!(schedule.total_safe_hours > 0);
        assert!(schedule.recommended_start < 12);
    }

    #[test]
    fn test_work_window() {
        let forecast = generate_demo_forecast(30.0, 60.0);
        let window = find_best_work_window(forecast, 4);

        assert_eq!(window.len(), 4);
    }
}
