//! Error types for HeatShield USSD

use actix_web::{HttpResponse, ResponseError};
use std::fmt;

/// Application errors
#[derive(Debug)]
pub enum AppError {
    /// Invalid session
    InvalidSession,

    /// Session expired
    SessionExpired,

    /// Invalid input from user
    InvalidInput(String),

    /// Database error
    DatabaseError(String),

    /// Redis/cache error
    CacheError(String),

    /// External API error
    ApiError(String),

    /// Internal server error
    InternalError(String),
}

impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            AppError::InvalidSession => write!(f, "Invalid session"),
            AppError::SessionExpired => write!(f, "Session expired"),
            AppError::InvalidInput(msg) => write!(f, "Invalid input: {}", msg),
            AppError::DatabaseError(msg) => write!(f, "Database error: {}", msg),
            AppError::CacheError(msg) => write!(f, "Cache error: {}", msg),
            AppError::ApiError(msg) => write!(f, "API error: {}", msg),
            AppError::InternalError(msg) => write!(f, "Internal error: {}", msg),
        }
    }
}

impl std::error::Error for AppError {}

impl ResponseError for AppError {
    fn error_response(&self) -> HttpResponse {
        // For USSD, we always return a 200 with an error message
        let message = match self {
            AppError::InvalidSession | AppError::SessionExpired => {
                "END Session expired. Please dial again."
            }
            AppError::InvalidInput(_) => "END Invalid input. Please try again.",
            _ => "END Service temporarily unavailable. Please try again later.",
        };

        HttpResponse::Ok()
            .content_type("text/plain")
            .body(message.to_string())
    }
}
