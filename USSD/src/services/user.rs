//! User service for managing user registrations and preferences

use crate::error::AppError;
use crate::models::user::{AlertPreferences, User, UserRegistration};

/// Register a new user for SMS alerts
pub async fn register_user(registration: UserRegistration) -> Result<User, AppError> {
    // In production, this would:
    // 1. Validate phone number
    // 2. Check for existing registration
    // 3. Store in database
    // 4. Send confirmation SMS

    let user = User {
        id: 0, // Would be assigned by database
        phone_number: registration.phone_number,
        district_id: registration.district_id,
        subcounty: registration.subcounty,
        language: registration.language.unwrap_or_else(|| "en".to_string()),
        alert_preferences: AlertPreferences::default(),
        created_at: chrono::Utc::now(),
        updated_at: chrono::Utc::now(),
    };

    Ok(user)
}

/// Update user's location
pub async fn update_user_location(
    phone_number: &str,
    district_id: i32,
    subcounty: Option<String>,
) -> Result<(), AppError> {
    // In production, this would update the database
    tracing::info!(
        phone = phone_number,
        district = district_id,
        "User location updated"
    );
    Ok(())
}

/// Update user's language preference
pub async fn update_user_language(phone_number: &str, language: &str) -> Result<(), AppError> {
    // Validate language code
    let valid_languages = ["en", "lg", "rny", "ach", "sw"];
    if !valid_languages.contains(&language) {
        return Err(AppError::InvalidInput(format!(
            "Invalid language: {}",
            language
        )));
    }

    // In production, this would update the database
    tracing::info!(
        phone = phone_number,
        language = language,
        "User language updated"
    );
    Ok(())
}

/// Update user's alert preferences
pub async fn update_alert_preferences(
    phone_number: &str,
    preferences: AlertPreferences,
) -> Result<(), AppError> {
    // In production, this would update the database
    tracing::info!(
        phone = phone_number,
        threshold = preferences.threshold,
        enabled = preferences.enabled,
        "Alert preferences updated"
    );
    Ok(())
}

/// Get user by phone number
pub async fn get_user_by_phone(phone_number: &str) -> Result<Option<User>, AppError> {
    // In production, this would query the database
    // For demo, return None (user not found)
    Ok(None)
}

/// Validate Uganda phone number
pub fn validate_phone_number(phone: &str) -> bool {
    // Uganda phone numbers:
    // +256XXXXXXXXX (12 digits with country code)
    // 0XXXXXXXXX (10 digits with leading 0)

    let cleaned: String = phone.chars().filter(|c| c.is_ascii_digit()).collect();

    if cleaned.len() == 12 && cleaned.starts_with("256") {
        // Check valid network prefixes (7XX for MTN/Airtel)
        let prefix = &cleaned[3..4];
        prefix == "7"
    } else if cleaned.len() == 10 && cleaned.starts_with("0") {
        let prefix = &cleaned[1..2];
        prefix == "7"
    } else if cleaned.len() == 9 {
        let prefix = &cleaned[0..1];
        prefix == "7"
    } else {
        false
    }
}

/// Format phone number to international format
pub fn format_phone_number(phone: &str) -> String {
    let cleaned: String = phone.chars().filter(|c| c.is_ascii_digit()).collect();

    if cleaned.len() == 12 && cleaned.starts_with("256") {
        format!("+{}", cleaned)
    } else if cleaned.len() == 10 && cleaned.starts_with("0") {
        format!("+256{}", &cleaned[1..])
    } else if cleaned.len() == 9 {
        format!("+256{}", cleaned)
    } else {
        phone.to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_phone_number() {
        assert!(validate_phone_number("+256700123456"));
        assert!(validate_phone_number("0700123456"));
        assert!(validate_phone_number("700123456"));
        assert!(!validate_phone_number("123456")); // Too short
        assert!(!validate_phone_number("+1234567890")); // Wrong country
    }

    #[test]
    fn test_format_phone_number() {
        assert_eq!(format_phone_number("0700123456"), "+256700123456");
        assert_eq!(format_phone_number("700123456"), "+256700123456");
        assert_eq!(format_phone_number("+256700123456"), "+256700123456");
    }
}
