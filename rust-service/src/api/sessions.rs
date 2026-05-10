use actix_web::{web, HttpResponse};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct Session {
    pub id: String,
    pub app_type: String,
    pub file_name: String,
    pub file_path: String,
    pub created_at: i64,
    pub updated_at: i64,
    pub message_count: i64,
    pub first_message: Option<String>,
    pub last_message: Option<String>,
    pub directory: Option<String>,
    pub uuid: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct SessionDetail {
    #[serde(flatten)]
    pub session: Session,
    pub messages: Vec<SessionMessage>,
}

#[derive(Serialize, Deserialize)]
pub struct SessionMessage {
    #[serde(rename = "type")]
    pub message_type: String,
    pub timestamp: String,
    pub content: Option<String>,
}

/// Get all sessions for an app type
pub async fn get_sessions(path: web::Path<String>) -> HttpResponse {
    let app_type = path.into_inner();
    
    // TODO: Implement session fetching logic
    // 1. Get database path based on app_type
    // 2. Query sessions from SQLite
    // 3. Return session list
    
    HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "data": []
    }))
}

/// Get session detail by ID
pub async fn get_session_detail(path: web::Path<(String, String)>) -> HttpResponse {
    let (app_type, session_id) = path.into_inner();
    
    // TODO: Implement session detail fetching
    // 1. Get database path based on app_type
    // 2. Query session and messages
    // 3. Return session detail
    
    HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "data": null
    }))
}