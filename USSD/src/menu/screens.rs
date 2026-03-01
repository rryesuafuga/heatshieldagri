//! USSD menu screen definitions

use crate::i18n::messages::get_message;

/// Get the main menu screen
pub fn get_main_menu(lang: &str) -> String {
    let title = get_message("main_menu_title", lang);
    let check_today = get_message("menu_check_today", lang);
    let forecast = get_message("menu_forecast", lang);
    let safe_hours = get_message("menu_safe_hours", lang);
    let register = get_message("menu_register", lang);
    let change_location = get_message("menu_change_location", lang);
    let change_language = get_message("menu_change_language", lang);
    let exit = get_message("menu_exit", lang);

    format!(
        "CON {}\n\
        ================\n\n\
        1. {}\n\
        2. {}\n\
        3. {}\n\
        4. {}\n\
        5. {}\n\
        6. {}\n\n\
        0. {}",
        title,
        check_today,
        forecast,
        safe_hours,
        register,
        change_location,
        change_language,
        exit
    )
}

/// Get district selection menu
pub fn get_district_menu(region: &str, lang: &str) -> String {
    let districts = match region {
        "Central" => vec!["Kampala", "Wakiso", "Mukono", "Masaka"],
        "Eastern" => vec!["Jinja", "Mbale", "Soroti", "Tororo"],
        "Northern" => vec!["Gulu", "Lira", "Arua", "Kitgum"],
        "Western" => vec!["Mbarara", "Kabale", "Fort Portal", "Kasese"],
        _ => vec!["Other"],
    };

    let mut menu = format!(
        "CON SELECT DISTRICT ({})\n\
        ========================\n\n",
        region
    );

    for (i, district) in districts.iter().enumerate() {
        menu.push_str(&format!("{}. {}\n", i + 1, district));
    }
    menu.push_str("\n0. Back");

    menu
}

/// Get risk display for given WBGT
pub fn format_risk_display(wbgt: f64, lang: &str) -> String {
    let (risk_level, color_indicator) = if wbgt < 26.0 {
        (get_message("risk_low", lang), "[LOW]")
    } else if wbgt < 28.0 {
        (get_message("risk_moderate", lang), "[MOD]")
    } else if wbgt < 30.0 {
        (get_message("risk_high", lang), "[HIGH]")
    } else if wbgt < 32.0 {
        (get_message("risk_very_high", lang), "[V.HIGH]")
    } else {
        (get_message("risk_extreme", lang), "[DANGER]")
    };

    format!("{} {}", color_indicator, risk_level)
}

/// Process menu selection and return appropriate response
pub fn process_menu_selection(selection: &str, lang: &str) -> String {
    match selection {
        "1" => "Loading today's heat risk...".to_string(),
        "2" => "Loading 3-day forecast...".to_string(),
        "3" => "Loading safe work hours...".to_string(),
        "4" => get_district_menu("", lang),
        "5" => "Loading location settings...".to_string(),
        "6" => get_language_selection_menu(lang),
        "0" => format!("END {}", get_message("goodbye", lang)),
        _ => format!(
            "CON {}\n\n{}",
            get_message("invalid_selection", lang),
            &get_main_menu(lang)[4..]
        ),
    }
}

/// Get language selection menu
pub fn get_language_selection_menu(current_lang: &str) -> String {
    format!(
        "CON SELECT LANGUAGE\n\
        ===================\n\n\
        1. English {}\n\
        2. Luganda {}\n\
        3. Runyankole {}\n\
        4. Acholi {}\n\
        5. Swahili {}\n\n\
        0. Back",
        if current_lang == "en" { "(current)" } else { "" },
        if current_lang == "lg" { "(okati)" } else { "" },
        if current_lang == "rny" { "(egi)" } else { "" },
        if current_lang == "ach" { "(ni)" } else { "" },
        if current_lang == "sw" { "(sasa)" } else { "" }
    )
}

/// Format work schedule display
pub fn format_work_schedule(safe_hours: &[u8], lang: &str) -> String {
    if safe_hours.is_empty() {
        return get_message("no_safe_hours", lang);
    }

    let mut schedule = String::new();
    let mut i = 0;

    while i < safe_hours.len() {
        let start = safe_hours[i];
        let mut end = start;

        // Find consecutive hours
        while i + 1 < safe_hours.len() && safe_hours[i + 1] == safe_hours[i] + 1 {
            end = safe_hours[i + 1];
            i += 1;
        }

        if start == end {
            schedule.push_str(&format!("{:02}:00\n", start));
        } else {
            schedule.push_str(&format!("{:02}:00 - {:02}:00\n", start, end + 1));
        }
        i += 1;
    }

    schedule
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_main_menu() {
        let menu = get_main_menu("en");
        assert!(menu.starts_with("CON"));
        assert!(menu.contains("Check Today"));
    }

    #[test]
    fn test_risk_display() {
        assert!(format_risk_display(25.0, "en").contains("LOW"));
        assert!(format_risk_display(27.0, "en").contains("MOD"));
        assert!(format_risk_display(29.0, "en").contains("HIGH"));
        assert!(format_risk_display(31.0, "en").contains("V.HIGH"));
        assert!(format_risk_display(33.0, "en").contains("DANGER"));
    }

    #[test]
    fn test_work_schedule() {
        let hours = vec![5, 6, 7, 8, 9, 16, 17];
        let schedule = format_work_schedule(&hours, "en");
        assert!(schedule.contains("05:00 - 10:00"));
        assert!(schedule.contains("16:00 - 18:00"));
    }
}
