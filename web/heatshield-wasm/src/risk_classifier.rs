//! Risk Classification Module
//!
//! Implements ISO 7243 heat stress risk levels adapted for agricultural work.

use wasm_bindgen::prelude::*;
use crate::WbgtResult;

/// Risk level thresholds based on ISO 7243 for moderate work intensity
/// Adjusted for agricultural labor in tropical conditions
pub const WBGT_LOW: f64 = 26.0;
pub const WBGT_MODERATE: f64 = 28.0;
pub const WBGT_HIGH: f64 = 30.0;
pub const WBGT_VERY_HIGH: f64 = 32.0;

/// Risk level enumeration
#[wasm_bindgen]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RiskLevel {
    Low = 0,
    Moderate = 1,
    High = 2,
    VeryHigh = 3,
    Extreme = 4,
}

/// Classify WBGT into risk level with recommendations
#[wasm_bindgen]
pub fn classify_risk(wbgt: f64) -> WbgtResult {
    let (risk_level, risk_code, recommendation, color) = if wbgt < WBGT_LOW {
        (
            "Low",
            0u8,
            "Normal work schedule. Stay hydrated with 250ml water every 30 minutes.",
            "#22c55e" // green
        )
    } else if wbgt < WBGT_MODERATE {
        (
            "Moderate",
            1u8,
            "Take 15-minute breaks every hour. Increase water intake to 500ml per hour. Wear light, loose clothing.",
            "#eab308" // yellow
        )
    } else if wbgt < WBGT_HIGH {
        (
            "High",
            2u8,
            "Work only during cooler hours (5-10am, 4-6pm). Take 30-minute breaks per hour. Seek shade frequently. Watch for heat illness symptoms.",
            "#f97316" // orange
        )
    } else if wbgt < WBGT_VERY_HIGH {
        (
            "Very High",
            3u8,
            "Limit outdoor work to 6-10am only. Extended midday break required. Assign only essential tasks. Monitor all workers for heat stress symptoms.",
            "#ef4444" // red
        )
    } else {
        (
            "Extreme",
            4u8,
            "SUSPEND all outdoor agricultural work. Emergency protocols active. Move to shaded/cooled areas. This is a life-threatening heat event.",
            "#7c2d12" // dark red
        )
    };

    WbgtResult::new(
        wbgt,
        risk_level.to_string(),
        risk_code,
        recommendation.to_string(),
        color.to_string(),
    )
}

/// Get risk level as number (0-4)
#[wasm_bindgen]
pub fn get_risk_level(wbgt: f64) -> u8 {
    if wbgt < WBGT_LOW {
        0
    } else if wbgt < WBGT_MODERATE {
        1
    } else if wbgt < WBGT_HIGH {
        2
    } else if wbgt < WBGT_VERY_HIGH {
        3
    } else {
        4
    }
}

/// Get risk color for visualization
#[wasm_bindgen]
pub fn get_risk_color(wbgt: f64) -> String {
    if wbgt < WBGT_LOW {
        "#22c55e".to_string()
    } else if wbgt < WBGT_MODERATE {
        "#eab308".to_string()
    } else if wbgt < WBGT_HIGH {
        "#f97316".to_string()
    } else if wbgt < WBGT_VERY_HIGH {
        "#ef4444".to_string()
    } else {
        "#7c2d12".to_string()
    }
}

/// Get risk label text
#[wasm_bindgen]
pub fn get_risk_label(wbgt: f64) -> String {
    if wbgt < WBGT_LOW {
        "Low Risk".to_string()
    } else if wbgt < WBGT_MODERATE {
        "Moderate Risk".to_string()
    } else if wbgt < WBGT_HIGH {
        "High Risk".to_string()
    } else if wbgt < WBGT_VERY_HIGH {
        "Very High Risk".to_string()
    } else {
        "Extreme Risk".to_string()
    }
}

/// Get localized risk message in Luganda
#[wasm_bindgen]
pub fn get_risk_message_luganda(wbgt: f64) -> String {
    if wbgt < WBGT_LOW {
        "Embeera ennungi. Nywa amazzi buli ddakiika 30.".to_string()
    } else if wbgt < WBGT_MODERATE {
        "Obubonero bwa bbugumu. Wummula eddakiika 15 buli ssaawa.".to_string()
    } else if wbgt < WBGT_HIGH {
        "Bbugumu ennyo. Kola mu biseera eby'obutiti (5-10am).".to_string()
    } else if wbgt < WBGT_VERY_HIGH {
        "Bbugumu ey'akabi. Kola 6-10am kyokka. Tunula obuzibu bw'omusana.".to_string()
    } else {
        "AKABI! Leka okukola ebweru. Noonya ekisiikirize.".to_string()
    }
}

/// Get localized risk message in Runyankole
#[wasm_bindgen]
pub fn get_risk_message_runyankole(wbgt: f64) -> String {
    if wbgt < WBGT_LOW {
        "Embeera nungi. Nywa amaizi buri dakika 30.".to_string()
    } else if wbgt < WBGT_MODERATE {
        "Ekyeya kirikukura. Humura edakika 15 buri saawa.".to_string()
    } else if wbgt < WBGT_HIGH {
        "Ekyeya kingi. Kora amasaawa g'enkya (5-10am).".to_string()
    } else if wbgt < WBGT_VERY_HIGH {
        "Ekyeya kingi muno. Kora 6-10am kwonka.".to_string()
    } else {
        "OBUBI! Rekera okukora aheru. Reeba ekisiikirize.".to_string()
    }
}

/// Get work-rest ratio recommendation
#[wasm_bindgen]
pub fn get_work_rest_ratio(wbgt: f64) -> String {
    if wbgt < WBGT_LOW {
        "Continuous work allowed".to_string()
    } else if wbgt < WBGT_MODERATE {
        "45 min work / 15 min rest".to_string()
    } else if wbgt < WBGT_HIGH {
        "30 min work / 30 min rest".to_string()
    } else if wbgt < WBGT_VERY_HIGH {
        "15 min work / 45 min rest".to_string()
    } else {
        "No work recommended".to_string()
    }
}

/// Get required water intake in ml per hour
#[wasm_bindgen]
pub fn get_water_requirement(wbgt: f64) -> u32 {
    if wbgt < WBGT_LOW {
        500
    } else if wbgt < WBGT_MODERATE {
        750
    } else if wbgt < WBGT_HIGH {
        1000
    } else if wbgt < WBGT_VERY_HIGH {
        1250
    } else {
        1500
    }
}

/// Get maximum recommended continuous work time in minutes
#[wasm_bindgen]
pub fn get_max_work_duration(wbgt: f64) -> u32 {
    if wbgt < WBGT_LOW {
        120
    } else if wbgt < WBGT_MODERATE {
        45
    } else if wbgt < WBGT_HIGH {
        30
    } else if wbgt < WBGT_VERY_HIGH {
        15
    } else {
        0
    }
}

/// Check if work should be suspended
#[wasm_bindgen]
pub fn should_suspend_work(wbgt: f64) -> bool {
    wbgt >= WBGT_VERY_HIGH
}

/// Get heat illness symptoms to watch for
#[wasm_bindgen]
pub fn get_warning_symptoms() -> String {
    "Watch for: headache, dizziness, nausea, heavy sweating or no sweating, confusion, rapid heartbeat, muscle cramps. Seek shade and water immediately if symptoms appear.".to_string()
}

/// Calculate productivity impact percentage
#[wasm_bindgen]
pub fn calculate_productivity_impact(wbgt: f64) -> f64 {
    if wbgt < WBGT_LOW {
        0.0
    } else if wbgt < WBGT_MODERATE {
        10.0
    } else if wbgt < WBGT_HIGH {
        25.0
    } else if wbgt < WBGT_VERY_HIGH {
        50.0
    } else {
        100.0
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_risk_classification() {
        assert_eq!(get_risk_level(24.0), 0);
        assert_eq!(get_risk_level(27.0), 1);
        assert_eq!(get_risk_level(29.0), 2);
        assert_eq!(get_risk_level(31.0), 3);
        assert_eq!(get_risk_level(33.0), 4);
    }

    #[test]
    fn test_work_suspension() {
        assert!(!should_suspend_work(28.0));
        assert!(should_suspend_work(32.0));
    }
}
