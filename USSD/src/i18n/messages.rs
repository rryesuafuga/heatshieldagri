//! Localized message strings for USSD interface
//!
//! Supports: English (en), Luganda (lg), Runyankole (rny), Acholi (ach), Swahili (sw)

use std::collections::HashMap;
use std::sync::LazyLock;

/// Message keys and their translations
static MESSAGES: LazyLock<HashMap<&'static str, HashMap<&'static str, &'static str>>> =
    LazyLock::new(|| {
        let mut m = HashMap::new();

        // Main menu
        m.insert(
            "main_menu_title",
            HashMap::from([
                ("en", "HEATSHIELD AGRI"),
                ("lg", "HEATSHIELD AGRI"),
                ("rny", "HEATSHIELD AGRI"),
                ("ach", "HEATSHIELD AGRI"),
                ("sw", "HEATSHIELD AGRI"),
            ]),
        );

        m.insert(
            "menu_check_today",
            HashMap::from([
                ("en", "Check Today's Heat Risk"),
                ("lg", "Laba Akabi ak'Ebbugumu"),
                ("rny", "Reeba Akabi k'Ekyeya"),
                ("ach", "Nen Bal me Lyeto"),
                ("sw", "Angalia Hatari ya Joto"),
            ]),
        );

        m.insert(
            "menu_forecast",
            HashMap::from([
                ("en", "3-Day Forecast"),
                ("lg", "Obubonero bw'Ennaku 3"),
                ("rny", "Ebirikwija by'Ennaku 3"),
                ("ach", "Lok me Nino 3"),
                ("sw", "Utabiri wa Siku 3"),
            ]),
        );

        m.insert(
            "menu_safe_hours",
            HashMap::from([
                ("en", "Safe Work Hours"),
                ("lg", "Essaawa ez'Okukola"),
                ("rny", "Eshaaha z'Okukora"),
                ("ach", "Cawa me Tic"),
                ("sw", "Masaa Salama"),
            ]),
        );

        m.insert(
            "menu_register",
            HashMap::from([
                ("en", "Register for SMS Alerts"),
                ("lg", "Wewandise ku SMS"),
                ("rny", "Kwandika ku SMS"),
                ("ach", "Coo nyingi pi SMS"),
                ("sw", "Jisajili kwa SMS"),
            ]),
        );

        m.insert(
            "menu_change_location",
            HashMap::from([
                ("en", "Change Location"),
                ("lg", "Kyusa Ekifo"),
                ("rny", "Hindura Ahantu"),
                ("ach", "Lok Kabedo"),
                ("sw", "Badilisha Mahali"),
            ]),
        );

        m.insert(
            "menu_change_language",
            HashMap::from([
                ("en", "Change Language"),
                ("lg", "Kyusa Olulimi"),
                ("rny", "Hindura Orurimi"),
                ("ach", "Lok Leb"),
                ("sw", "Badilisha Lugha"),
            ]),
        );

        m.insert(
            "menu_exit",
            HashMap::from([
                ("en", "Exit"),
                ("lg", "Fuluma"),
                ("rny", "Hwerera"),
                ("ach", "Kat Woko"),
                ("sw", "Toka"),
            ]),
        );

        // Risk levels
        m.insert(
            "risk_low",
            HashMap::from([
                ("en", "Low Risk"),
                ("lg", "Akabi Akatono"),
                ("rny", "Akabi Katono"),
                ("ach", "Bal Matidi"),
                ("sw", "Hatari Ndogo"),
            ]),
        );

        m.insert(
            "risk_moderate",
            HashMap::from([
                ("en", "Moderate Risk"),
                ("lg", "Akabi Akatareewo"),
                ("rny", "Akabi Karikukura"),
                ("ach", "Bal Ma Pe Dit"),
                ("sw", "Hatari ya Wastani"),
            ]),
        );

        m.insert(
            "risk_high",
            HashMap::from([
                ("en", "High Risk"),
                ("lg", "Akabi Akanene"),
                ("rny", "Akabi Kanene"),
                ("ach", "Bal Madit"),
                ("sw", "Hatari Kubwa"),
            ]),
        );

        m.insert(
            "risk_very_high",
            HashMap::from([
                ("en", "Very High Risk"),
                ("lg", "Akabi Akanene Nnyo"),
                ("rny", "Akabi Kanene Muno"),
                ("ach", "Bal Madit Tutwal"),
                ("sw", "Hatari Kubwa Sana"),
            ]),
        );

        m.insert(
            "risk_extreme",
            HashMap::from([
                ("en", "EXTREME RISK"),
                ("lg", "AKABI AKASINGAYO"),
                ("rny", "AKABI KASINGIRA"),
                ("ach", "BAL MAKATO"),
                ("sw", "HATARI KALI"),
            ]),
        );

        // Recommendations
        m.insert(
            "rec_low",
            HashMap::from([
                ("en", "Normal work. Drink water every 30 min."),
                ("lg", "Kola bulungi. Nywa mazzi buli ddakiika 30."),
                ("rny", "Kora neza. Nywa amaizi buri dakika 30."),
                ("ach", "Tic maber. Mat pii kare 30."),
                ("sw", "Kazi kawaida. Kunywa maji kila dk 30."),
            ]),
        );

        m.insert(
            "rec_high",
            HashMap::from([
                ("en", "Work 5-10am only. 30 min breaks."),
                ("lg", "Kola 5-10am kyokka. Wummula ddakiika 30."),
                ("rny", "Kora 5-10am kwonka. Humura dakika 30."),
                ("ach", "Tic 5-10am keken. Ywe dakika 30."),
                ("sw", "Fanya kazi 5-10am tu. Pumzika dk 30."),
            ]),
        );

        m.insert(
            "rec_extreme",
            HashMap::from([
                ("en", "STOP outdoor work! Seek shade."),
                ("lg", "LEKA okukola ebweru! Noonya ekisiikirize."),
                ("rny", "REKERA okukora aheru! Reeba ekisirikire."),
                ("ach", "CUK tic woko! Yeny tipo."),
                ("sw", "SIMAMA kazi! Tafuta kivuli."),
            ]),
        );

        // Common messages
        m.insert(
            "goodbye",
            HashMap::from([
                ("en", "Thank you for using HeatShield. Stay safe!"),
                ("lg", "Webale okukozesa HeatShield. Beera bulungi!"),
                ("rny", "Webale kukozesa HeatShield. Beera neza!"),
                ("ach", "Apwoyo pi tiyo ki HeatShield. Bed maber!"),
                ("sw", "Asante kwa kutumia HeatShield. Kaa salama!"),
            ]),
        );

        m.insert(
            "invalid_selection",
            HashMap::from([
                ("en", "Invalid selection. Try again."),
                ("lg", "Okulonda okutali. Gezaako nate."),
                ("rny", "Oburonda obutari. Gezaho okundi."),
                ("ach", "Yero marac. Tem doki."),
                ("sw", "Chaguo batili. Jaribu tena."),
            ]),
        );

        m.insert(
            "no_safe_hours",
            HashMap::from([
                ("en", "No safe outdoor hours today."),
                ("lg", "Tewali ssaawa z'okukolera ebweru leero."),
                ("rny", "Tihariho sawa z'okukora aheru rero."),
                ("ach", "Pe cawa me tic woko tin."),
                ("sw", "Hakuna masaa salama leo."),
            ]),
        );

        m.insert(
            "registration_success",
            HashMap::from([
                ("en", "Registered! You will receive SMS alerts."),
                ("lg", "Owewandisiddwa! Ojja kufuna obubaka."),
                ("rny", "Owandikire! Ozija kuhikira obubaka."),
                ("ach", "Icoo! Ibi nongo SMS ciko."),
                ("sw", "Umesajiliwa! Utapata SMS tahadhari."),
            ]),
        );

        m
    });

/// Get a localized message
pub fn get_message(key: &str, lang: &str) -> String {
    MESSAGES
        .get(key)
        .and_then(|translations| translations.get(lang).or(translations.get("en")))
        .map(|s| s.to_string())
        .unwrap_or_else(|| format!("[{}]", key))
}

/// Get available languages
pub fn get_available_languages() -> Vec<(&'static str, &'static str)> {
    vec![
        ("en", "English"),
        ("lg", "Luganda"),
        ("rny", "Runyankole"),
        ("ach", "Acholi"),
        ("sw", "Swahili"),
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_message() {
        assert_eq!(get_message("menu_exit", "en"), "Exit");
        assert_eq!(get_message("menu_exit", "lg"), "Fuluma");
        assert_eq!(get_message("menu_exit", "sw"), "Toka");
    }

    #[test]
    fn test_fallback_to_english() {
        // Unknown language should fall back to English
        assert_eq!(get_message("menu_exit", "unknown"), "Exit");
    }

    #[test]
    fn test_unknown_key() {
        let msg = get_message("unknown_key", "en");
        assert!(msg.contains("unknown_key"));
    }
}
