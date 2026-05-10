use actix_web::{web, HttpResponse};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::RwLock;

#[derive(Serialize, Deserialize, Clone)]
pub struct AppSettings {
    pub language: String,
    pub theme: String,
    pub accent_color: String,
    pub auto_start: bool,
    pub lightweight_mode: bool,
    pub default_app: Option<String>,
    pub collapse_bash_blocks: bool,
    pub enable_title_marquee: bool,
    pub show_thinking_content: bool,
    pub sidebar_collapsed: bool,
    pub preferred_terminal: String,
}

pub struct SettingsState {
    pub settings: RwLock<AppSettings>,
}

impl Default for SettingsState {
    fn default() -> Self {
        Self {
            settings: RwLock::new(AppSettings {
                language: "en".to_string(),
                theme: "system".to_string(),
                accent_color: "default".to_string(),
                auto_start: false,
                lightweight_mode: false,
                default_app: None,
                collapse_bash_blocks: false,
                enable_title_marquee: true,
                show_thinking_content: true,
                sidebar_collapsed: false,
                preferred_terminal: "auto".to_string(),
            }),
        }
    }
}

/// Get current settings
pub async fn get_settings(data: web::Data<Arc<SettingsState>>) -> HttpResponse {
    let settings = data.settings.read().await;
    
    HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "data": *settings
    }))
}

/// Update settings
pub async fn update_settings(
    data: web::Data<Arc<SettingsState>>,
    body: web::Json<serde_json::Value>,
) -> HttpResponse {
    let mut current_settings = data.settings.write().await;
    
    if let Some(obj) = body.as_object() {
        if let Some(lang) = obj.get("language").and_then(|v| v.as_str()) {
            current_settings.language = lang.to_string();
        }
        if let Some(theme) = obj.get("theme").and_then(|v| v.as_str()) {
            current_settings.theme = theme.to_string();
        }
        if let Some(color) = obj.get("accentColor").and_then(|v| v.as_str()) {
            current_settings.accent_color = color.to_string();
        }
        if let Some(auto_start) = obj.get("autoStart").and_then(|v| v.as_bool()) {
            current_settings.auto_start = auto_start;
        }
        if let Some(lightweight) = obj.get("lightweightMode").and_then(|v| v.as_bool()) {
            current_settings.lightweight_mode = lightweight;
        }
        if let Some(default_app) = obj.get("defaultApp").and_then(|v| v.as_str()) {
            current_settings.default_app = Some(default_app.to_string());
        } else if obj.contains_key("defaultApp") && obj.get("defaultApp").is_none() {
            current_settings.default_app = None;
        }
        if let Some(collapse) = obj.get("collapseBashBlocks").and_then(|v| v.as_bool()) {
            current_settings.collapse_bash_blocks = collapse;
        }
        if let Some(marquee) = obj.get("enableTitleMarquee").and_then(|v| v.as_bool()) {
            current_settings.enable_title_marquee = marquee;
        }
        if let Some(thinking) = obj.get("showThinkingContent").and_then(|v| v.as_bool()) {
            current_settings.show_thinking_content = thinking;
        }
        if let Some(collapsed) = obj.get("sidebarCollapsed").and_then(|v| v.as_bool()) {
            current_settings.sidebar_collapsed = collapsed;
        }
        if let Some(terminal) = obj.get("preferredTerminal").and_then(|v| v.as_str()) {
            current_settings.preferred_terminal = terminal.to_string();
        }
    }
    
    HttpResponse::Ok().json(serde_json::json!({
        "success": true
    }))
}