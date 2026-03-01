//! USSD callback handler for Africa's Talking integration

use actix_web::{web, HttpResponse, Responder};
use serde::Deserialize;
use tracing::{info, warn};

use crate::menu::screens::{get_main_menu, process_menu_selection};
use crate::session::state::SessionState;
use crate::AppState;

/// USSD callback request from Africa's Talking
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UssdRequest {
    /// Unique session identifier
    pub session_id: String,

    /// User's phone number (MSISDN)
    pub phone_number: String,

    /// Network code (e.g., 62001 for MTN Uganda)
    #[serde(default)]
    pub network_code: String,

    /// Service code dialed (e.g., *384*HEAT#)
    pub service_code: String,

    /// User input text (empty for new session, contains selections for ongoing)
    #[serde(default)]
    pub text: String,
}

/// Handle incoming USSD callback
pub async fn handle_ussd(
    app_state: web::Data<AppState>,
    form: web::Form<UssdRequest>,
) -> impl Responder {
    let request = form.into_inner();

    info!(
        session_id = %request.session_id,
        phone = %request.phone_number,
        text = %request.text,
        "USSD request received"
    );

    // Parse user input
    let inputs: Vec<&str> = if request.text.is_empty() {
        vec![]
    } else {
        request.text.split('*').collect()
    };

    // Determine session state and generate response
    let response = if inputs.is_empty() {
        // New session - show main menu
        get_main_menu("en")
    } else {
        // Ongoing session - process selections
        process_ussd_flow(&request.phone_number, &inputs).await
    };

    info!(
        session_id = %request.session_id,
        response_preview = %response.chars().take(50).collect::<String>(),
        "USSD response sent"
    );

    HttpResponse::Ok()
        .content_type("text/plain")
        .body(response)
}

/// Process the USSD menu flow based on user inputs
async fn process_ussd_flow(phone_number: &str, inputs: &[&str]) -> String {
    // Get the latest selection
    let selection = inputs.last().map(|s| s.trim()).unwrap_or("");

    // Determine current menu level
    match inputs.len() {
        1 => process_main_menu_selection(selection).await,
        2 => process_submenu_selection(inputs[0], selection).await,
        3 => process_sub_submenu_selection(inputs[0], inputs[1], selection).await,
        _ => "END Thank you for using HeatShield Agri.".to_string(),
    }
}

/// Process main menu selection
async fn process_main_menu_selection(selection: &str) -> String {
    match selection {
        "1" => get_todays_heat_risk().await,
        "2" => get_three_day_forecast().await,
        "3" => get_safe_work_hours().await,
        "4" => get_registration_menu(),
        "5" => get_location_menu(),
        "6" => get_language_menu(),
        "0" => "END Thank you for using HeatShield Agri. Stay safe!".to_string(),
        _ => {
            warn!(selection = %selection, "Invalid main menu selection");
            "CON Invalid selection. Please try again:\n\n".to_string() + &get_main_menu("en")[4..]
        }
    }
}

/// Get today's heat risk information
async fn get_todays_heat_risk() -> String {
    // Demo data - in production this would call the HeatShield API
    let wbgt = 29.5;
    let risk_level = "HIGH";
    let recommendation = "Work 5-10am only. Take 30-min breaks.";

    format!(
        "END TODAY'S HEAT RISK\n\
        ===================\n\
        WBGT: {:.1}°C\n\
        Risk Level: {}\n\n\
        Recommendation:\n\
        {}\n\n\
        Drink 500ml water/hour.\n\
        Watch for dizziness.\n\n\
        Stay safe!",
        wbgt, risk_level, recommendation
    )
}

/// Get 3-day forecast
async fn get_three_day_forecast() -> String {
    // Demo data
    format!(
        "END 3-DAY FORECAST\n\
        ==================\n\n\
        TODAY:\n\
        Max WBGT: 29.5°C (HIGH)\n\
        Safe hours: 5-10am\n\n\
        TOMORROW:\n\
        Max WBGT: 30.2°C (V.HIGH)\n\
        Safe hours: 6-9am\n\n\
        DAY 3:\n\
        Max WBGT: 28.1°C (HIGH)\n\
        Safe hours: 5-11am\n\n\
        Stay hydrated!"
    )
}

/// Get safe work hours for tomorrow
async fn get_safe_work_hours() -> String {
    format!(
        "END SAFE WORK HOURS\n\
        ===================\n\n\
        TOMORROW:\n\
        Morning: 5:00 - 10:00\n\
        Evening: 16:00 - 18:00\n\n\
        Total: 7 safe hours\n\n\
        BREAK SCHEDULE:\n\
        15 min rest every hour\n\
        250ml water every 30 min\n\n\
        Avoid: 11:00 - 15:00\n\
        (Peak heat hours)"
    )
}

/// Get registration sub-menu
fn get_registration_menu() -> String {
    format!(
        "CON REGISTER FOR SMS ALERTS\n\
        ===========================\n\n\
        Select your district:\n\n\
        1. Kampala\n\
        2. Wakiso\n\
        3. Jinja\n\
        4. Mbarara\n\
        5. Gulu\n\
        6. Other\n\n\
        0. Back to main menu"
    )
}

/// Get location change menu
fn get_location_menu() -> String {
    format!(
        "CON CHANGE LOCATION\n\
        ===================\n\n\
        Select your region:\n\n\
        1. Central\n\
        2. Eastern\n\
        3. Northern\n\
        4. Western\n\n\
        0. Back to main menu"
    )
}

/// Get language selection menu
fn get_language_menu() -> String {
    format!(
        "CON SELECT LANGUAGE\n\
        ===================\n\n\
        1. English\n\
        2. Luganda\n\
        3. Runyankole\n\
        4. Acholi\n\
        5. Swahili\n\n\
        0. Back to main menu"
    )
}

/// Process sub-menu selections
async fn process_submenu_selection(main_selection: &str, sub_selection: &str) -> String {
    match (main_selection, sub_selection) {
        // Registration flow
        ("4", district) => process_registration_district(district).await,

        // Location flow
        ("5", region) => process_location_region(region).await,

        // Language flow
        ("6", lang) => process_language_selection(lang),

        // Back to main menu
        (_, "0") => "CON ".to_string() + &get_main_menu("en")[4..],

        _ => "END Invalid selection. Please dial again.".to_string(),
    }
}

/// Process registration district selection
async fn process_registration_district(district: &str) -> String {
    let district_name = match district {
        "1" => "Kampala",
        "2" => "Wakiso",
        "3" => "Jinja",
        "4" => "Mbarara",
        "5" => "Gulu",
        "6" => return get_other_district_input(),
        "0" => return "CON ".to_string() + &get_main_menu("en")[4..],
        _ => return "CON Invalid selection.\n\n".to_string() + &get_registration_menu()[4..],
    };

    format!(
        "END REGISTRATION CONFIRMED\n\
        ==========================\n\n\
        District: {}\n\n\
        You will now receive SMS\n\
        alerts when heat risk is\n\
        HIGH or above in {}.\n\n\
        Thank you for registering!",
        district_name, district_name
    )
}

fn get_other_district_input() -> String {
    format!(
        "CON Enter your sub-county:\n\n\
        (Type the name and press send)"
    )
}

/// Process location region selection
async fn process_location_region(region: &str) -> String {
    let region_name = match region {
        "1" => "Central",
        "2" => "Eastern",
        "3" => "Northern",
        "4" => "Western",
        "0" => return "CON ".to_string() + &get_main_menu("en")[4..],
        _ => return "CON Invalid selection.\n\n".to_string() + &get_location_menu()[4..],
    };

    format!(
        "CON SELECT DISTRICT ({})\n\
        ==========================\n\n\
        Enter district number:\n\n\
        (Type and press send)",
        region_name
    )
}

/// Process language selection
fn process_language_selection(lang: &str) -> String {
    let language = match lang {
        "1" => "English",
        "2" => "Luganda",
        "3" => "Runyankole",
        "4" => "Acholi",
        "5" => "Swahili",
        "0" => return "CON ".to_string() + &get_main_menu("en")[4..],
        _ => return "CON Invalid selection.\n\n".to_string() + &get_language_menu()[4..],
    };

    format!(
        "END LANGUAGE UPDATED\n\
        ====================\n\n\
        Your language is now:\n\
        {}\n\n\
        All future messages will\n\
        be in {}.\n\n\
        Webale! (Thank you!)",
        language, language
    )
}

/// Process third-level selections
async fn process_sub_submenu_selection(
    main_sel: &str,
    sub_sel: &str,
    sub_sub_sel: &str,
) -> String {
    // Handle back navigation
    if sub_sub_sel == "0" {
        return process_main_menu_selection(main_sel).await;
    }

    // Handle confirmation screens
    format!(
        "END Selection confirmed.\n\n\
        Thank you for using\n\
        HeatShield Agri.\n\n\
        Stay safe from heat!"
    )
}
