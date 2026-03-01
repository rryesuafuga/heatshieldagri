//! Configuration module for HeatShield USSD

use serde::Deserialize;

/// Application settings
#[derive(Debug, Clone, Deserialize)]
pub struct Settings {
    /// Server host
    #[serde(default = "default_host")]
    pub host: String,

    /// Server port
    #[serde(default = "default_port")]
    pub port: u16,

    /// USSD service code (e.g., *384*HEAT#)
    #[serde(default = "default_service_code")]
    pub ussd_service_code: String,

    /// Database URL
    #[serde(default = "default_database_url")]
    pub database_url: String,

    /// Redis URL for session storage
    #[serde(default = "default_redis_url")]
    pub redis_url: String,

    /// Africa's Talking API key
    #[serde(default)]
    pub africas_talking_api_key: String,

    /// Africa's Talking username
    #[serde(default)]
    pub africas_talking_username: String,

    /// HeatShield API base URL
    #[serde(default = "default_api_url")]
    pub heatshield_api_url: String,

    /// Session timeout in seconds
    #[serde(default = "default_session_timeout")]
    pub session_timeout_secs: u64,
}

fn default_host() -> String {
    "0.0.0.0".to_string()
}

fn default_port() -> u16 {
    8080
}

fn default_service_code() -> String {
    "*384*HEAT#".to_string()
}

fn default_database_url() -> String {
    "postgres://localhost/heatshield".to_string()
}

fn default_redis_url() -> String {
    "redis://localhost:6379".to_string()
}

fn default_api_url() -> String {
    "http://localhost:3000/api/v1".to_string()
}

fn default_session_timeout() -> u64 {
    300 // 5 minutes
}

impl Settings {
    /// Load settings from environment and config files
    pub fn new() -> Result<Self, config::ConfigError> {
        // Load .env file if present
        let _ = dotenv::dotenv();

        let settings = config::Config::builder()
            .add_source(config::Environment::default())
            .set_default("host", default_host())?
            .set_default("port", default_port() as i64)?
            .set_default("ussd_service_code", default_service_code())?
            .set_default("database_url", default_database_url())?
            .set_default("redis_url", default_redis_url())?
            .set_default("heatshield_api_url", default_api_url())?
            .set_default("session_timeout_secs", default_session_timeout() as i64)?
            .build()?;

        settings.try_deserialize()
    }
}
