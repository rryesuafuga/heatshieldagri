//! HTTP handlers for USSD endpoints

mod health;
mod ussd;

use actix_web::web;

/// Configure all routes
pub fn configure_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("")
            .route("/health", web::get().to(health::health_check))
            .route("/ussd", web::post().to(ussd::handle_ussd))
            .route("/ussd/callback", web::post().to(ussd::handle_ussd))
    );
}
