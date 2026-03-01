//! Forecast data models

use serde::{Deserialize, Serialize};

/// Risk level enum
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum RiskLevel {
    Low,
    Moderate,
    High,
    VeryHigh,
    Extreme,
}

impl RiskLevel {
    /// Get display name
    pub fn display_name(&self) -> &'static str {
        match self {
            RiskLevel::Low => "Low",
            RiskLevel::Moderate => "Moderate",
            RiskLevel::High => "High",
            RiskLevel::VeryHigh => "Very High",
            RiskLevel::Extreme => "EXTREME",
        }
    }

    /// Get short code for USSD display
    pub fn short_code(&self) -> &'static str {
        match self {
            RiskLevel::Low => "LOW",
            RiskLevel::Moderate => "MOD",
            RiskLevel::High => "HIGH",
            RiskLevel::VeryHigh => "V.HIGH",
            RiskLevel::Extreme => "DANGER",
        }
    }
}

/// WBGT calculation result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WbgtResult {
    pub wbgt: f64,
    pub risk_level: RiskLevel,
    pub recommendation: String,
}

/// Hourly forecast data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HourlyForecast {
    pub hour: i32,
    pub wbgt: f64,
    pub temperature: f64,
    pub humidity: f64,
    pub wind_speed: f64,
    pub solar_radiation: f64,
    pub risk_level: RiskLevel,
}

/// Daily forecast summary
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DailyForecast {
    pub day: u8,
    pub max_wbgt: f64,
    pub min_wbgt: f64,
    pub peak_risk: RiskLevel,
    pub safe_hours: Vec<u8>,
}

impl DailyForecast {
    /// Get day label
    pub fn day_label(&self) -> &'static str {
        match self.day {
            0 => "Today",
            1 => "Tomorrow",
            2 => "Day 3",
            _ => "Future",
        }
    }

    /// Format safe hours for display
    pub fn format_safe_hours(&self) -> String {
        if self.safe_hours.is_empty() {
            return "None".to_string();
        }

        let start = self.safe_hours.first().unwrap();
        let end = self.safe_hours.last().unwrap();

        format!("{:02}:00-{:02}:00", start, end + 1)
    }
}

/// Three-day forecast
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ThreeDayForecast {
    pub days: Vec<DailyForecast>,
}

/// Work schedule recommendation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkSchedule {
    pub safe_hours: Vec<u8>,
    pub total_safe_hours: u8,
    pub recommended_start: u8,
    pub recommended_end: u8,
    pub break_schedule: String,
    pub productivity_score: f64,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_risk_level_display() {
        assert_eq!(RiskLevel::Low.display_name(), "Low");
        assert_eq!(RiskLevel::Extreme.short_code(), "DANGER");
    }

    #[test]
    fn test_daily_forecast_label() {
        let forecast = DailyForecast {
            day: 0,
            max_wbgt: 30.0,
            min_wbgt: 24.0,
            peak_risk: RiskLevel::High,
            safe_hours: vec![5, 6, 7, 8, 9],
        };
        assert_eq!(forecast.day_label(), "Today");
        assert_eq!(forecast.format_safe_hours(), "05:00-10:00");
    }
}
