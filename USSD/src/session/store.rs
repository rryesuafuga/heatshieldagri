//! Session storage using Redis

use crate::error::AppError;
use crate::session::state::Session;

/// Session store trait for abstraction
pub trait SessionStore {
    /// Get a session by ID
    fn get(&self, session_id: &str) -> Result<Option<Session>, AppError>;

    /// Save a session
    fn save(&self, session: &Session) -> Result<(), AppError>;

    /// Delete a session
    fn delete(&self, session_id: &str) -> Result<(), AppError>;
}

/// In-memory session store for demo/testing
pub struct InMemorySessionStore {
    sessions: std::sync::RwLock<std::collections::HashMap<String, Session>>,
}

impl InMemorySessionStore {
    pub fn new() -> Self {
        InMemorySessionStore {
            sessions: std::sync::RwLock::new(std::collections::HashMap::new()),
        }
    }
}

impl SessionStore for InMemorySessionStore {
    fn get(&self, session_id: &str) -> Result<Option<Session>, AppError> {
        let sessions = self.sessions.read().map_err(|e| {
            AppError::CacheError(format!("Failed to read sessions: {}", e))
        })?;
        Ok(sessions.get(session_id).cloned())
    }

    fn save(&self, session: &Session) -> Result<(), AppError> {
        let mut sessions = self.sessions.write().map_err(|e| {
            AppError::CacheError(format!("Failed to write sessions: {}", e))
        })?;
        sessions.insert(session.session_id.clone(), session.clone());
        Ok(())
    }

    fn delete(&self, session_id: &str) -> Result<(), AppError> {
        let mut sessions = self.sessions.write().map_err(|e| {
            AppError::CacheError(format!("Failed to write sessions: {}", e))
        })?;
        sessions.remove(session_id);
        Ok(())
    }
}

/// Redis session store for production
pub struct RedisSessionStore {
    // In production, this would hold a Redis connection pool
    prefix: String,
}

impl RedisSessionStore {
    pub fn new(prefix: &str) -> Self {
        RedisSessionStore {
            prefix: prefix.to_string(),
        }
    }

    fn make_key(&self, session_id: &str) -> String {
        format!("{}:{}", self.prefix, session_id)
    }
}

impl SessionStore for RedisSessionStore {
    fn get(&self, session_id: &str) -> Result<Option<Session>, AppError> {
        // In production, this would:
        // 1. Get Redis connection from pool
        // 2. GET the key
        // 3. Deserialize JSON to Session
        let _key = self.make_key(session_id);

        // Demo implementation returns None
        Ok(None)
    }

    fn save(&self, session: &Session) -> Result<(), AppError> {
        // In production, this would:
        // 1. Get Redis connection from pool
        // 2. Serialize Session to JSON
        // 3. SETEX with TTL
        let _key = self.make_key(&session.session_id);
        let _json = serde_json::to_string(session)
            .map_err(|e| AppError::CacheError(format!("Serialization error: {}", e)))?;

        // Demo implementation does nothing
        Ok(())
    }

    fn delete(&self, session_id: &str) -> Result<(), AppError> {
        // In production, this would:
        // 1. Get Redis connection from pool
        // 2. DEL the key
        let _key = self.make_key(session_id);

        // Demo implementation does nothing
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_in_memory_store() {
        let store = InMemorySessionStore::new();
        let session = Session::new("test123".into(), "+256700123456".into());

        // Save
        store.save(&session).unwrap();

        // Get
        let retrieved = store.get("test123").unwrap();
        assert!(retrieved.is_some());
        assert_eq!(retrieved.unwrap().phone_number, "+256700123456");

        // Delete
        store.delete("test123").unwrap();
        let deleted = store.get("test123").unwrap();
        assert!(deleted.is_none());
    }
}
