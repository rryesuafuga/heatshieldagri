//! USSD session state machine

use serde::{Deserialize, Serialize};

/// Registration step in the flow
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum RegistrationStep {
    SelectRegion,
    SelectDistrict,
    SelectSubcounty,
    Confirm,
}

/// Pending user action
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum PendingAction {
    ConfirmRegistration {
        district: String,
        subcounty: Option<String>,
    },
    ConfirmLocationChange {
        new_location: String,
    },
    ConfirmLanguageChange {
        new_language: String,
    },
}

/// Session state for USSD navigation
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum SessionState {
    /// Main menu
    MainMenu,

    /// Viewing forecast for a specific day
    ViewingForecast { day: u8 },

    /// Viewing today's risk details
    ViewingTodayRisk,

    /// Viewing safe work hours
    ViewingSafeHours,

    /// Registration flow
    RegisteringLocation { step: RegistrationStep },

    /// Changing location
    ChangingLocation { region: Option<String> },

    /// Selecting language
    SelectingLanguage,

    /// Confirming an action
    ConfirmingAction { action: PendingAction },
}

impl Default for SessionState {
    fn default() -> Self {
        SessionState::MainMenu
    }
}

/// Full session data stored in Redis
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Session {
    /// Unique session ID from Africa's Talking
    pub session_id: String,

    /// User's phone number
    pub phone_number: String,

    /// Current state in the menu flow
    pub state: SessionState,

    /// User's preferred language
    pub language: String,

    /// User's registered location (if any)
    pub location: Option<UserLocation>,

    /// Session creation timestamp
    pub created_at: i64,

    /// Last activity timestamp
    pub last_activity: i64,

    /// Navigation history for back functionality
    pub navigation_history: Vec<SessionState>,
}

/// User location data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserLocation {
    pub region: String,
    pub district: String,
    pub subcounty: Option<String>,
    pub lat: f64,
    pub lon: f64,
}

impl Session {
    /// Create a new session
    pub fn new(session_id: String, phone_number: String) -> Self {
        let now = chrono::Utc::now().timestamp();
        Session {
            session_id,
            phone_number,
            state: SessionState::MainMenu,
            language: "en".to_string(),
            location: None,
            created_at: now,
            last_activity: now,
            navigation_history: vec![],
        }
    }

    /// Update session state
    pub fn set_state(&mut self, new_state: SessionState) {
        // Save current state to history
        self.navigation_history.push(self.state.clone());
        // Keep history limited
        if self.navigation_history.len() > 10 {
            self.navigation_history.remove(0);
        }
        self.state = new_state;
        self.last_activity = chrono::Utc::now().timestamp();
    }

    /// Go back to previous state
    pub fn go_back(&mut self) -> bool {
        if let Some(prev_state) = self.navigation_history.pop() {
            self.state = prev_state;
            self.last_activity = chrono::Utc::now().timestamp();
            true
        } else {
            self.state = SessionState::MainMenu;
            false
        }
    }

    /// Check if session is expired
    pub fn is_expired(&self, timeout_secs: u64) -> bool {
        let now = chrono::Utc::now().timestamp();
        (now - self.last_activity) as u64 > timeout_secs
    }

    /// Update last activity timestamp
    pub fn touch(&mut self) {
        self.last_activity = chrono::Utc::now().timestamp();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_new_session() {
        let session = Session::new("sess123".into(), "+256700123456".into());
        assert_eq!(session.state, SessionState::MainMenu);
        assert_eq!(session.language, "en");
    }

    #[test]
    fn test_state_transition() {
        let mut session = Session::new("sess123".into(), "+256700123456".into());
        session.set_state(SessionState::ViewingTodayRisk);
        assert_eq!(session.state, SessionState::ViewingTodayRisk);
        assert_eq!(session.navigation_history.len(), 1);
    }

    #[test]
    fn test_go_back() {
        let mut session = Session::new("sess123".into(), "+256700123456".into());
        session.set_state(SessionState::ViewingTodayRisk);
        session.set_state(SessionState::ViewingForecast { day: 1 });

        session.go_back();
        assert_eq!(session.state, SessionState::ViewingTodayRisk);

        session.go_back();
        assert_eq!(session.state, SessionState::MainMenu);
    }
}
