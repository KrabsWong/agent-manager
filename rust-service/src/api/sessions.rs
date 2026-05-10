use actix_web::{web, HttpResponse};
use serde::{Deserialize, Serialize};

use crate::storage::opencode::{OpenCodeStorage, OpenCodeSession};
use crate::storage::claude::ClaudeStorage;
use crate::storage::codebuddy::CodebuddyStorage;

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Session {
    pub id: String,
    pub app_type: String,
    pub file_name: String,
    pub file_path: String,
    pub directory: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
    pub message_count: i64,
    pub first_message: String,
    pub last_message: String,
}

impl From<OpenCodeSession> for Session {
    fn from(s: OpenCodeSession) -> Self {
        Self {
            id: s.id,
            app_type: s.app_type,
            file_name: s.file_name,
            file_path: s.file_path,
            directory: s.directory,
            created_at: s.created_at,
            updated_at: s.updated_at,
            message_count: s.message_count,
            first_message: s.first_message,
            last_message: s.last_message,
        }
    }
}

/// Get all sessions for an app type
pub async fn get_sessions(path: web::Path<String>) -> HttpResponse {
    let app_type = path.into_inner();
    
    match app_type.as_str() {
        "opencode" => {
            match OpenCodeStorage::new() {
                Ok(storage) => {
                    if !storage.is_available() {
                        return HttpResponse::Ok().json(serde_json::json!({
                            "success": true,
                            "data": []
                        }));
                    }
                    
                    match storage.get_sessions() {
                        Ok(sessions) => {
                            let sessions: Vec<Session> = sessions.into_iter().map(Session::from).collect();
                            HttpResponse::Ok().json(serde_json::json!({
                                "success": true,
                                "data": sessions
                            }))
                        }
                        Err(e) => {
                            HttpResponse::InternalServerError().json(serde_json::json!({
                                "success": false,
                                "error": {
                                    "code": "QUERY_ERROR",
                                    "message": e.to_string()
                                }
                            }))
                        }
                    }
                }
                Err(e) => {
                    HttpResponse::InternalServerError().json(serde_json::json!({
                        "success": false,
                        "error": {
                            "code": "STORAGE_INIT_ERROR",
                            "message": e.to_string()
                        }
                    }))
                }
            }
        }
        "claude" => {
            match ClaudeStorage::new() {
                Ok(storage) => {
                    if !storage.is_available() {
                        return HttpResponse::Ok().json(serde_json::json!({
                            "success": true,
                            "data": []
                        }));
                    }
                    
                    match storage.get_sessions() {
                        Ok(sessions) => {
                            let sessions: Vec<Session> = sessions.into_iter().map(|s| Session {
                                id: s.id,
                                app_type: s.app_type,
                                file_name: s.file_name,
                                file_path: s.file_path,
                                directory: s.directory,
                                created_at: s.created_at,
                                updated_at: s.updated_at,
                                message_count: s.message_count,
                                first_message: s.first_message,
                                last_message: s.last_message,
                            }).collect();
                            HttpResponse::Ok().json(serde_json::json!({
                                "success": true,
                                "data": sessions
                            }))
                        }
                        Err(e) => {
                            HttpResponse::InternalServerError().json(serde_json::json!({
                                "success": false,
                                "error": {
                                    "code": "QUERY_ERROR",
                                    "message": e.to_string()
                                }
                            }))
                        }
                    }
                }
                Err(e) => {
                    HttpResponse::InternalServerError().json(serde_json::json!({
                        "success": false,
                        "error": {
                            "code": "STORAGE_INIT_ERROR",
                            "message": e.to_string()
                        }
                    }))
                }
            }
        }
        "codebuddy" => {
            match CodebuddyStorage::new() {
                Ok(storage) => {
                    if !storage.is_available() {
                        return HttpResponse::Ok().json(serde_json::json!({
                            "success": true,
                            "data": []
                        }));
                    }
                    
                    match storage.get_sessions().await {
                        Ok(sessions) => {
                            let sessions: Vec<Session> = sessions.into_iter().map(|s| Session {
                                id: s.id,
                                app_type: s.app_type,
                                file_name: s.file_name,
                                file_path: s.file_path,
                                directory: s.directory,
                                created_at: s.created_at,
                                updated_at: s.updated_at,
                                message_count: s.message_count,
                                first_message: s.first_message,
                                last_message: s.last_message,
                            }).collect();
                            HttpResponse::Ok().json(serde_json::json!({
                                "success": true,
                                "data": sessions
                            }))
                        }
                        Err(e) => {
                            HttpResponse::InternalServerError().json(serde_json::json!({
                                "success": false,
                                "error": {
                                    "code": "QUERY_ERROR",
                                    "message": e.to_string()
                                }
                            }))
                        }
                    }
                }
                Err(e) => {
                    HttpResponse::InternalServerError().json(serde_json::json!({
                        "success": false,
                        "error": {
                            "code": "STORAGE_INIT_ERROR",
                            "message": e.to_string()
                        }
                    }))
                }
            }
        }
        _ => {
            // Other app types not implemented yet
            HttpResponse::Ok().json(serde_json::json!({
                "success": true,
                "data": []
            }))
        }
    }
}

/// Get session detail by ID
pub async fn get_session_detail(path: web::Path<(String, String)>) -> HttpResponse {
    let (app_type, session_id) = path.into_inner();
    
    match app_type.as_str() {
        "opencode" => {
            match OpenCodeStorage::new() {
                Ok(storage) => {
                    if !storage.is_available() {
                        return HttpResponse::Ok().json(serde_json::json!({
                            "success": true,
                            "data": null
                        }));
                    }
                    
                    match storage.get_session_detail(&session_id) {
                        Ok(Some(detail)) => {
                            HttpResponse::Ok().json(serde_json::json!({
                                "success": true,
                                "data": detail
                            }))
                        }
                        Ok(None) => {
                            HttpResponse::Ok().json(serde_json::json!({
                                "success": true,
                                "data": null
                            }))
                        }
                        Err(e) => {
                            HttpResponse::InternalServerError().json(serde_json::json!({
                                "success": false,
                                "error": {
                                    "code": "QUERY_ERROR",
                                    "message": e.to_string()
                                }
                            }))
                        }
                    }
                }
                Err(e) => {
                    HttpResponse::InternalServerError().json(serde_json::json!({
                        "success": false,
                        "error": {
                            "code": "STORAGE_INIT_ERROR",
                            "message": e.to_string()
                        }
                    }))
                }
            }
        }
        "claude" => {
            match ClaudeStorage::new() {
                Ok(storage) => {
                    if !storage.is_available() {
                        return HttpResponse::Ok().json(serde_json::json!({
                            "success": true,
                            "data": null
                        }));
                    }
                    
                    match storage.get_session_detail(&session_id) {
                        Ok(Some(detail)) => {
                            HttpResponse::Ok().json(serde_json::json!({
                                "success": true,
                                "data": detail
                            }))
                        }
                        Ok(None) => {
                            HttpResponse::Ok().json(serde_json::json!({
                                "success": true,
                                "data": null
                            }))
                        }
                        Err(e) => {
                            HttpResponse::InternalServerError().json(serde_json::json!({
                                "success": false,
                                "error": {
                                    "code": "QUERY_ERROR",
                                    "message": e.to_string()
                                }
                            }))
                        }
                    }
                }
                Err(e) => {
                    HttpResponse::InternalServerError().json(serde_json::json!({
                        "success": false,
                        "error": {
                            "code": "STORAGE_INIT_ERROR",
                            "message": e.to_string()
                        }
                    }))
                }
            }
        }
        "codebuddy" => {
            match CodebuddyStorage::new() {
                Ok(storage) => {
                    if !storage.is_available() {
                        return HttpResponse::Ok().json(serde_json::json!({
                            "success": true,
                            "data": null
                        }));
                    }
                    
                    match storage.get_session_detail(&session_id).await {
                        Ok(Some(detail)) => {
                            HttpResponse::Ok().json(serde_json::json!({
                                "success": true,
                                "data": detail
                            }))
                        }
                        Ok(None) => {
                            HttpResponse::Ok().json(serde_json::json!({
                                "success": true,
                                "data": null
                            }))
                        }
                        Err(e) => {
                            HttpResponse::InternalServerError().json(serde_json::json!({
                                "success": false,
                                "error": {
                                    "code": "QUERY_ERROR",
                                    "message": e.to_string()
                                }
                            }))
                        }
                    }
                }
                Err(e) => {
                    HttpResponse::InternalServerError().json(serde_json::json!({
                        "success": false,
                        "error": {
                            "code": "STORAGE_INIT_ERROR",
                            "message": e.to_string()
                        }
                    }))
                }
            }
        }
        _ => {
            // Other app types not implemented yet
            HttpResponse::Ok().json(serde_json::json!({
                "success": true,
                "data": null
            }))
        }
    }
}

/// Get session stats
pub async fn get_stats(path: web::Path<String>) -> HttpResponse {
    let app_type = path.into_inner();
    
    match app_type.as_str() {
        "opencode" => {
            match OpenCodeStorage::new() {
                Ok(storage) => {
                    if !storage.is_available() {
                        return HttpResponse::Ok().json(serde_json::json!({
                            "success": true,
                            "data": {
                                "totalSessions": 0,
                                "totalMessages": 0
                            }
                        }));
                    }
                    
                    match storage.get_stats() {
                        Ok(stats) => {
                            HttpResponse::Ok().json(serde_json::json!({
                                "success": true,
                                "data": stats
                            }))
                        }
                        Err(e) => {
                            HttpResponse::InternalServerError().json(serde_json::json!({
                                "success": false,
                                "error": {
                                    "code": "QUERY_ERROR",
                                    "message": e.to_string()
                                }
                            }))
                        }
                    }
                }
                Err(e) => {
                    HttpResponse::InternalServerError().json(serde_json::json!({
                        "success": false,
                        "error": {
                            "code": "STORAGE_INIT_ERROR",
                            "message": e.to_string()
                        }
                    }))
                }
            }
        }
        "claude" => {
            match ClaudeStorage::new() {
                Ok(storage) => {
                    if !storage.is_available() {
                        return HttpResponse::Ok().json(serde_json::json!({
                            "success": true,
                            "data": {
                                "totalSessions": 0,
                                "totalMessages": 0
                            }
                        }));
                    }
                    
                    match storage.get_sessions() {
                        Ok(sessions) => {
                            let total_sessions = sessions.len();
                            let total_messages: i64 = sessions.iter().map(|s| s.message_count).sum();
                            
                            HttpResponse::Ok().json(serde_json::json!({
                                "success": true,
                                "data": {
                                    "totalSessions": total_sessions,
                                    "totalMessages": total_messages
                                }
                            }))
                        }
                        Err(e) => {
                            HttpResponse::InternalServerError().json(serde_json::json!({
                                "success": false,
                                "error": {
                                    "code": "QUERY_ERROR",
                                    "message": e.to_string()
                                }
                            }))
                        }
                    }
                }
                Err(e) => {
                    HttpResponse::InternalServerError().json(serde_json::json!({
                        "success": false,
                        "error": {
                            "code": "STORAGE_INIT_ERROR",
                            "message": e.to_string()
                        }
                    }))
                }
            }
        }
        "codebuddy" => {
            match CodebuddyStorage::new() {
                Ok(storage) => {
                    if !storage.is_available() {
                        return HttpResponse::Ok().json(serde_json::json!({
                            "success": true,
                            "data": {
                                "totalSessions": 0,
                                "totalMessages": 0
                            }
                        }));
                    }
                    
                    match storage.get_stats().await {
                        Ok(stats) => {
                            HttpResponse::Ok().json(serde_json::json!({
                                "success": true,
                                "data": stats
                            }))
                        }
                        Err(e) => {
                            HttpResponse::InternalServerError().json(serde_json::json!({
                                "success": false,
                                "error": {
                                    "code": "QUERY_ERROR",
                                    "message": e.to_string()
                                }
                            }))
                        }
                    }
                }
                Err(e) => {
                    HttpResponse::InternalServerError().json(serde_json::json!({
                        "success": false,
                        "error": {
                            "code": "STORAGE_INIT_ERROR",
                            "message": e.to_string()
                        }
                    }))
                }
            }
        }
        _ => {
            HttpResponse::Ok().json(serde_json::json!({
                "success": true,
                "data": {
                    "totalSessions": 0,
                    "totalMessages": 0
                }
            }))
        }
    }
}