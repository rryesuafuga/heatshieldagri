//! HeatShield Agri WebAssembly Module
//!
//! This module provides high-performance WBGT (Wet-Bulb Globe Temperature)
//! calculations and heat stress risk assessment for agricultural workers.

use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};

mod wbgt;
mod interpolation;
mod risk_classifier;
mod schedule;

pub use wbgt::*;
pub use interpolation::*;
pub use risk_classifier::*;
pub use schedule::*;

/// Initialize panic hook for better error messages in browser console
#[wasm_bindgen(start)]
pub fn init() {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}

/// WBGT calculation result with risk assessment
#[derive(Debug, Clone, Serialize, Deserialize)]
#[wasm_bindgen(getter_with_clone)]
pub struct WbgtResult {
    pub wbgt: f64,
    pub risk_level: String,
    pub risk_code: u8,
    pub recommendation: String,
    pub color: String,
}

#[wasm_bindgen]
impl WbgtResult {
    #[wasm_bindgen(constructor)]
    pub fn new(wbgt: f64, risk_level: String, risk_code: u8, recommendation: String, color: String) -> Self {
        Self {
            wbgt,
            risk_level,
            risk_code,
            recommendation,
            color,
        }
    }
}

/// Grid point for spatial data
#[derive(Debug, Clone, Serialize, Deserialize)]
#[wasm_bindgen(getter_with_clone)]
pub struct GridPoint {
    pub lat: f64,
    pub lon: f64,
    pub value: f64,
}

#[wasm_bindgen]
impl GridPoint {
    #[wasm_bindgen(constructor)]
    pub fn new(lat: f64, lon: f64, value: f64) -> Self {
        Self { lat, lon, value }
    }
}

/// Hourly forecast data point
#[derive(Debug, Clone, Serialize, Deserialize)]
#[wasm_bindgen(getter_with_clone)]
pub struct HourlyForecast {
    pub hour: u8,
    pub wbgt: f64,
    pub temperature: f64,
    pub humidity: f64,
    pub wind_speed: f64,
    pub solar_radiation: f64,
}

#[wasm_bindgen]
impl HourlyForecast {
    #[wasm_bindgen(constructor)]
    pub fn new(hour: u8, wbgt: f64, temperature: f64, humidity: f64, wind_speed: f64, solar_radiation: f64) -> Self {
        Self {
            hour,
            wbgt,
            temperature,
            humidity,
            wind_speed,
            solar_radiation,
        }
    }
}

/// Optimized work schedule
#[derive(Debug, Clone, Serialize, Deserialize)]
#[wasm_bindgen(getter_with_clone)]
pub struct WorkSchedule {
    pub safe_hours: Vec<u8>,
    pub total_safe_hours: u8,
    pub recommended_start: u8,
    pub recommended_end: u8,
    pub break_schedule: String,
    pub productivity_score: f64,
}

#[wasm_bindgen]
impl WorkSchedule {
    #[wasm_bindgen(constructor)]
    pub fn new(
        safe_hours: Vec<u8>,
        total_safe_hours: u8,
        recommended_start: u8,
        recommended_end: u8,
        break_schedule: String,
        productivity_score: f64,
    ) -> Self {
        Self {
            safe_hours,
            total_safe_hours,
            recommended_start,
            recommended_end,
            break_schedule,
            productivity_score,
        }
    }

    #[wasm_bindgen(getter)]
    pub fn safe_hours_array(&self) -> Vec<u8> {
        self.safe_hours.clone()
    }
}

/// District information for Uganda
#[derive(Debug, Clone, Serialize, Deserialize)]
#[wasm_bindgen(getter_with_clone)]
pub struct District {
    pub id: u32,
    pub name: String,
    pub region: String,
    pub lat: f64,
    pub lon: f64,
}

#[wasm_bindgen]
impl District {
    #[wasm_bindgen(constructor)]
    pub fn new(id: u32, name: String, region: String, lat: f64, lon: f64) -> Self {
        Self { id, name, region, lat, lon }
    }
}

/// Get Uganda districts for demo
#[wasm_bindgen]
pub fn get_uganda_districts() -> Vec<District> {
    vec![
        District::new(1, "Kampala".into(), "Central".into(), 0.3476, 32.5825),
        District::new(2, "Wakiso".into(), "Central".into(), 0.4044, 32.4594),
        District::new(3, "Mukono".into(), "Central".into(), 0.3533, 32.7553),
        District::new(4, "Jinja".into(), "Eastern".into(), 0.4244, 33.2041),
        District::new(5, "Mbale".into(), "Eastern".into(), 1.0647, 34.1797),
        District::new(6, "Gulu".into(), "Northern".into(), 2.7747, 32.2990),
        District::new(7, "Lira".into(), "Northern".into(), 2.2499, 32.8998),
        District::new(8, "Mbarara".into(), "Western".into(), -0.6072, 30.6545),
        District::new(9, "Kabale".into(), "Western".into(), -1.2508, 29.9894),
        District::new(10, "Fort Portal".into(), "Western".into(), 0.6710, 30.2750),
        District::new(11, "Masaka".into(), "Central".into(), -0.3136, 31.7350),
        District::new(12, "Arua".into(), "Northern".into(), 3.0203, 30.9107),
    ]
}

/// Get library version
#[wasm_bindgen]
pub fn get_version() -> String {
    "1.0.0".to_string()
}

/// Get library info
#[wasm_bindgen]
pub fn get_library_info() -> String {
    serde_json::json!({
        "name": "HeatShield Agri WASM Core",
        "version": "1.0.0",
        "description": "WebAssembly module for WBGT calculations",
        "features": [
            "WBGT calculation",
            "Risk classification",
            "Spatial interpolation",
            "Work schedule optimization"
        ]
    }).to_string()
}
