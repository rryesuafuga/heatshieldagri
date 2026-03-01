//! Forecast service for fetching and processing weather data

use crate::error::AppError;
use crate::models::forecast::{DailyForecast, HourlyForecast, ThreeDayForecast};
use crate::services::wbgt::{calculate_wbgt, generate_demo_forecast};

/// Fetch current conditions for a location
pub async fn get_current_conditions(lat: f64, lon: f64) -> Result<HourlyForecast, AppError> {
    // In production, this would call the HeatShield API
    // For demo, generate synthetic data

    let hour = chrono::Utc::now().hour() as i32;
    let base_temp = 30.0 + lat.abs() * 0.5;
    let humidity = 65.0;

    let hour_factor = ((hour as f64 - 14.0).abs() / 12.0 - 1.0).abs();
    let temp = base_temp - 8.0 + hour_factor * 12.0;

    let solar = if hour >= 6 && hour <= 18 {
        let solar_hour = (hour as f64 - 12.0).abs();
        (1.0 - solar_hour / 6.0) * 900.0
    } else {
        0.0
    };

    let wind = if hour >= 8 && hour <= 18 { 3.0 } else { 1.5 };
    let wbgt_result = calculate_wbgt(temp, humidity, wind, solar);

    Ok(HourlyForecast {
        hour,
        wbgt: wbgt_result.wbgt,
        temperature: temp,
        humidity,
        wind_speed: wind,
        solar_radiation: solar,
        risk_level: wbgt_result.risk_level,
    })
}

/// Fetch 3-day forecast for a location
pub async fn get_three_day_forecast(lat: f64, lon: f64) -> Result<ThreeDayForecast, AppError> {
    // Generate demo forecast for 3 days
    let base_temp = 30.0 + lat.abs() * 0.5;
    let humidity = 65.0;

    let days: Vec<DailyForecast> = (0..3)
        .map(|day| {
            let day_offset = (day as f64 - 1.0) * 1.5;
            let temp_base = base_temp + day_offset;

            let hourly = generate_demo_forecast(temp_base, humidity);
            let max_wbgt = hourly.iter().map(|h| h.wbgt).fold(f64::MIN, f64::max);
            let min_wbgt = hourly.iter().map(|h| h.wbgt).fold(f64::MAX, f64::min);

            // Find safe hours (WBGT < 28)
            let safe_hours: Vec<u8> = hourly
                .iter()
                .enumerate()
                .filter(|(_, h)| h.wbgt < 28.0)
                .map(|(i, _)| i as u8)
                .collect();

            let peak_risk = crate::services::wbgt::get_risk_level(max_wbgt);

            DailyForecast {
                day: day as u8,
                max_wbgt,
                min_wbgt,
                peak_risk,
                safe_hours,
            }
        })
        .collect();

    Ok(ThreeDayForecast { days })
}

/// Get safe work hours for tomorrow
pub async fn get_safe_work_hours(lat: f64, lon: f64) -> Result<Vec<u8>, AppError> {
    let forecast = get_three_day_forecast(lat, lon).await?;

    // Get tomorrow's safe hours
    if let Some(tomorrow) = forecast.days.get(1) {
        Ok(tomorrow.safe_hours.clone())
    } else {
        Ok(vec![])
    }
}

/// Format work hours for display
pub fn format_work_hours(hours: &[u8]) -> String {
    if hours.is_empty() {
        return "No safe outdoor hours".to_string();
    }

    let mut result = String::new();
    let mut i = 0;

    while i < hours.len() {
        let start = hours[i];
        let mut end = start;

        while i + 1 < hours.len() && hours[i + 1] == hours[i] + 1 {
            end = hours[i + 1];
            i += 1;
        }

        if !result.is_empty() {
            result.push_str(", ");
        }

        if start == end {
            result.push_str(&format!("{:02}:00", start));
        } else {
            result.push_str(&format!("{:02}:00-{:02}:00", start, end + 1));
        }

        i += 1;
    }

    result
}

use chrono::Timelike;

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_get_current_conditions() {
        let result = get_current_conditions(0.3476, 32.5825).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_get_three_day_forecast() {
        let result = get_three_day_forecast(0.3476, 32.5825).await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap().days.len(), 3);
    }

    #[test]
    fn test_format_work_hours() {
        assert_eq!(format_work_hours(&[5, 6, 7, 8, 9]), "05:00-10:00");
        assert_eq!(format_work_hours(&[5, 6, 7, 16, 17]), "05:00-08:00, 16:00-18:00");
        assert_eq!(format_work_hours(&[]), "No safe outdoor hours");
    }
}
