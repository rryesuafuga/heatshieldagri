//! HeatShield Agri USSD Application
//!
//! A USSD-based interface for agricultural workers to access heat stress
//! warnings on feature phones. Built with Rust for reliability and performance.

use actix_web::{web, App, HttpServer};
use tracing::info;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod config;
mod error;
mod handlers;
mod i18n;
mod menu;
mod models;
mod services;
mod session;

use crate::config::Settings;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // Initialize logging
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            std::env::var("RUST_LOG").unwrap_or_else(|_| "info".into()),
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Load configuration
    let settings = Settings::new().expect("Failed to load configuration");

    info!("Starting HeatShield USSD Server on {}:{}", settings.host, settings.port);
    info!("USSD Service Code: {}", settings.ussd_service_code);

    // Create shared state
    let app_state = web::Data::new(AppState {
        settings: settings.clone(),
    });

    // Start HTTP server
    HttpServer::new(move || {
        App::new()
            .app_data(app_state.clone())
            .configure(handlers::configure_routes)
    })
    .bind(format!("{}:{}", settings.host, settings.port))?
    .run()
    .await
}

/// Application state shared across handlers
pub struct AppState {
    pub settings: Settings,
}
