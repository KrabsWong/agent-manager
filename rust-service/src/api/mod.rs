pub mod file;
pub mod sessions;
pub mod settings;
pub mod shell;
pub mod terminal;
pub mod tree;

use actix_web::HttpResponse;

pub async fn health() -> HttpResponse {
    HttpResponse::Ok().json(serde_json::json!({
        "status": "ok",
        "service": "yes-sessions-backend",
        "version": env!("CARGO_PKG_VERSION")
    }))
}