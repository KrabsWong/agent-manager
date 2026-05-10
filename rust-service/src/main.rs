/**
 * Yes Sessions Backend Service
 * 
 * HTTP + WebSocket server for session management
 */

mod api;
mod storage;
mod terminal;
mod watcher;

use actix_web::{web, App, HttpServer};
use actix_cors::Cors;
use log::info;
use std::sync::Arc;

use api::sessions::Session;
use terminal::TerminalManager;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // Initialize logger
    env_logger::Builder::from_default_env()
        .filter_level(log::LevelFilter::Info)
        .init();

    info!("🚀 Starting Yes Sessions Backend Service...");
    
    // Initialize terminal manager
    let terminal_manager = Arc::new(terminal::TerminalManager::new());
    let terminal_manager_data = web::Data::new(terminal_manager);

    // Initialize settings state
    let settings_state = Arc::new(api::settings::SettingsState::default());
    let settings_data = web::Data::new(settings_state);

    // Start HTTP server
    HttpServer::new(move || {
        let cors = Cors::permissive();
        
        App::new()
            .wrap(cors)
            .app_data(terminal_manager_data.clone())
            .app_data(settings_data.clone())
            .route("/health", web::get().to(api::health))
            .service(
                web::scope("/api")
                    .route("/sessions/{appType}", web::get().to(api::sessions::get_sessions))
                    .route("/sessions/{appType}/{id}", web::get().to(api::sessions::get_session_detail))
                    .route("/sessions/stats/{appType}", web::get().to(api::sessions::get_stats))
                    .route("/terminal", web::post().to(api::terminal::create_terminal))
                    .route("/terminal/info", web::get().to(api::shell::get_terminal_info))
                    .route("/settings", web::get().to(api::settings::get_settings))
                    .route("/settings", web::post().to(api::settings::update_settings))
                    .route("/file/read", web::get().to(api::file::read_file))
                    .route("/file/readImage", web::get().to(api::file::read_image))
                    .route("/tree", web::get().to(api::tree::get_tree))
                    .route("/shell/openExternal", web::get().to(api::shell::open_external))
                    .route("/shell/openPath", web::get().to(api::shell::open_path))
            )
    })
    .bind("127.0.0.1:3000")?
    .run()
    .await
}