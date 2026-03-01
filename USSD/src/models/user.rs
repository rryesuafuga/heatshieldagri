//! User data models

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// District information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct District {
    pub id: i32,
    pub name: String,
    pub region: String,
    pub lat: f64,
    pub lon: f64,
}

impl District {
    pub fn new(id: i32, name: &str, region: &str, lat: f64, lon: f64) -> Self {
        District {
            id,
            name: name.to_string(),
            region: region.to_string(),
            lat,
            lon,
        }
    }
}

/// User registration request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserRegistration {
    pub phone_number: String,
    pub district_id: i32,
    pub subcounty: Option<String>,
    pub language: Option<String>,
}

/// Alert preferences
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlertPreferences {
    /// Whether alerts are enabled
    pub enabled: bool,

    /// WBGT threshold for alerts (default: 28.0)
    pub threshold: f64,

    /// Alert times (e.g., "morning", "evening", "both")
    pub alert_times: String,

    /// Include forecast in alerts
    pub include_forecast: bool,
}

impl Default for AlertPreferences {
    fn default() -> Self {
        AlertPreferences {
            enabled: true,
            threshold: 28.0,
            alert_times: "morning".to_string(),
            include_forecast: true,
        }
    }
}

/// User profile
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    pub id: i64,
    pub phone_number: String,
    pub district_id: i32,
    pub subcounty: Option<String>,
    pub language: String,
    pub alert_preferences: AlertPreferences,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Alert history entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlertHistory {
    pub id: i64,
    pub user_id: i64,
    pub wbgt: f64,
    pub risk_level: String,
    pub message: String,
    pub sent_at: DateTime<Utc>,
    pub delivered: bool,
}

/// SMS alert to be sent
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SmsAlert {
    pub phone_number: String,
    pub message: String,
    pub priority: AlertPriority,
}

/// Alert priority levels
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum AlertPriority {
    Normal,
    High,
    Emergency,
}

impl SmsAlert {
    /// Create a new SMS alert
    pub fn new(phone_number: &str, message: &str, priority: AlertPriority) -> Self {
        SmsAlert {
            phone_number: phone_number.to_string(),
            message: message.to_string(),
            priority,
        }
    }

    /// Create a standard heat warning alert
    pub fn heat_warning(phone_number: &str, wbgt: f64, location: &str, lang: &str) -> Self {
        let message = match lang {
            "lg" => format!(
                "HEATSHIELD: Bbugumu ennene ({:.1}C) e {}. Kola 5-10am kyokka. Nywa amazzi.",
                wbgt, location
            ),
            "sw" => format!(
                "HEATSHIELD: Joto kali ({:.1}C) {}. Kazi 5-10am tu. Kunywa maji.",
                wbgt, location
            ),
            _ => format!(
                "HEATSHIELD: High heat risk ({:.1}C) in {}. Work 5-10am only. Stay hydrated.",
                wbgt, location
            ),
        };

        let priority = if wbgt >= 32.0 {
            AlertPriority::Emergency
        } else if wbgt >= 30.0 {
            AlertPriority::High
        } else {
            AlertPriority::Normal
        };

        SmsAlert::new(phone_number, &message, priority)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_district_creation() {
        let district = District::new(1, "Kampala", "Central", 0.3476, 32.5825);
        assert_eq!(district.name, "Kampala");
        assert_eq!(district.region, "Central");
    }

    #[test]
    fn test_alert_preferences_default() {
        let prefs = AlertPreferences::default();
        assert!(prefs.enabled);
        assert_eq!(prefs.threshold, 28.0);
    }

    #[test]
    fn test_sms_alert_creation() {
        let alert = SmsAlert::heat_warning("+256700123456", 31.5, "Kampala", "en");
        assert!(alert.message.contains("31.5"));
        assert!(alert.message.contains("Kampala"));
        assert_eq!(alert.priority, AlertPriority::High);
    }
}
