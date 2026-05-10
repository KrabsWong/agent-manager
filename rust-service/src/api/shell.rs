use actix_web::{web, HttpResponse};
use serde::{Deserialize, Serialize};
use std::path::Path;
use std::process::Command;

#[derive(Deserialize)]
pub struct OpenExternalRequest {
    url: String,
}

#[derive(Deserialize)]
pub struct OpenPathRequest {
    path: String,
}

#[derive(Serialize)]
pub struct ApiResponse<T> {
    success: bool,
    data: Option<T>,
    error: Option<ApiError>,
}

#[derive(Serialize)]
pub struct ApiError {
    message: String,
}

#[derive(Serialize)]
pub struct TerminalInfo {
    preferred: String,
    ghostty_installed: bool,
    kitty_installed: bool,
}

fn check_ghostty_installed() -> bool {
    Command::new("which")
        .arg("ghostty")
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

fn check_kitty_installed() -> bool {
    if Command::new("which")
        .arg("kitty")
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
    {
        return true;
    }
    
    let kitty_paths = [
        "/Applications/kitty.app/Contents/MacOS/kitty",
    ];
    
    for path in kitty_paths {
        if Path::new(path).exists() {
            return true;
        }
    }
    
    false
}

pub async fn get_terminal_info() -> HttpResponse {
    let ghostty_installed = check_ghostty_installed();
    let kitty_installed = check_kitty_installed();
    
    let preferred = if ghostty_installed {
        "ghostty".to_string()
    } else if kitty_installed {
        "kitty".to_string()
    } else {
        "builtin".to_string()
    };
    
    HttpResponse::Ok().json(ApiResponse {
        success: true,
        data: Some(TerminalInfo {
            preferred,
            ghostty_installed,
            kitty_installed,
        }),
        error: None,
    })
}

pub async fn open_external(req: web::Query<OpenExternalRequest>) -> HttpResponse {
    let url = &req.url;

    if url.is_empty() || url.trim().is_empty() {
        return HttpResponse::BadRequest().json(ApiResponse::<()> {
            success: false,
            data: None,
            error: Some(ApiError {
                message: "Invalid URL".to_string(),
            }),
        });
    }

    // Basic URL validation
    if !url.starts_with("http://") && !url.starts_with("https://") {
        return HttpResponse::BadRequest().json(ApiResponse::<()> {
            success: false,
            data: None,
            error: Some(ApiError {
                message: "Invalid URL scheme (must be http or https)".to_string(),
            }),
        });
    }

    match opener::open(url) {
        Ok(_) => HttpResponse::Ok().json(ApiResponse::<()> {
            success: true,
            data: Some(()),
            error: None,
        }),
        Err(e) => HttpResponse::InternalServerError().json(ApiResponse::<()> {
            success: false,
            data: None,
            error: Some(ApiError {
                message: format!("Failed to open URL: {}", e),
            }),
        }),
    }
}

pub async fn open_path(req: web::Query<OpenPathRequest>) -> HttpResponse {
    let path_str = &req.path;

    if path_str.is_empty() || path_str.trim().is_empty() {
        return HttpResponse::BadRequest().json(ApiResponse::<()> {
            success: false,
            data: None,
            error: Some(ApiError {
                message: "Invalid file path".to_string(),
            }),
        });
    }

    let path = Path::new(path_str);

    if !path.exists() {
        return HttpResponse::NotFound().json(ApiResponse::<()> {
            success: false,
            data: None,
            error: Some(ApiError {
                message: "Path does not exist".to_string(),
            }),
        });
    }

    match opener::open(path) {
        Ok(_) => HttpResponse::Ok().json(ApiResponse::<()> {
            success: true,
            data: Some(()),
            error: None,
        }),
        Err(e) => HttpResponse::InternalServerError().json(ApiResponse::<()> {
            success: false,
            data: None,
            error: Some(ApiError {
                message: format!("Failed to open path: {}", e),
            }),
        }),
    }
}