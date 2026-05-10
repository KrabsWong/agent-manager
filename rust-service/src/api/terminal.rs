use actix_web::{web, HttpResponse};
use serde::{Deserialize, Serialize};
use std::sync::Arc;

use crate::terminal::TerminalManager;

#[derive(Deserialize)]
pub struct CreateTerminalRequest {
    pub session_id: String,
    pub cwd: Option<String>,
}

#[derive(Serialize)]
pub struct CreateTerminalResponse {
    pub session_id: String,
    pub shell: String,
}

/// Create a new terminal session
pub async fn create_terminal(
    terminal_manager: web::Data<Arc<TerminalManager>>,
    body: web::Json<CreateTerminalRequest>,
) -> HttpResponse {
    let request = body.into_inner();
    
    match terminal_manager.create(request.session_id.clone(), request.cwd) {
        Ok(shell) => {
            HttpResponse::Ok().json(serde_json::json!({
                "success": true,
                "sessionId": request.session_id,
                "shell": shell
            }))
        }
        Err(e) => {
            HttpResponse::InternalServerError().json(serde_json::json!({
                "success": false,
                "error": e.to_string()
            }))
        }
    }
}