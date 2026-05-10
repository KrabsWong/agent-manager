use actix_web::{web, HttpResponse};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use base64::{engine::general_purpose, Engine as _};

const MAX_TEXT_FILE_SIZE: u64 = 50 * 1024 * 1024; // 50MB
const MAX_IMAGE_FILE_SIZE: u64 = 10 * 1024 * 1024; // 10MB

#[derive(Deserialize)]
pub struct ReadFileRequest {
    file_path: String,
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

pub async fn read_file(req: web::Query<ReadFileRequest>) -> HttpResponse {
    let file_path = &req.file_path;

    if file_path.is_empty() || file_path.trim().is_empty() {
        return HttpResponse::BadRequest().json(ApiResponse::<String> {
            success: false,
            data: None,
            error: Some(ApiError {
                message: "Invalid file path".to_string(),
            }),
        });
    }

    let path = Path::new(file_path);

    if !path.exists() {
        return HttpResponse::NotFound().json(ApiResponse::<String> {
            success: false,
            data: None,
            error: Some(ApiError {
                message: "File not found".to_string(),
            }),
        });
    }

    let metadata = match fs::metadata(path) {
        Ok(m) => m,
        Err(e) => {
            return HttpResponse::InternalServerError().json(ApiResponse::<String> {
                success: false,
                data: None,
                error: Some(ApiError {
                    message: format!("Failed to read file metadata: {}", e),
                }),
            });
        }
    };

    if metadata.is_dir() {
        return HttpResponse::BadRequest().json(ApiResponse::<String> {
            success: false,
            data: None,
            error: Some(ApiError {
                message: "Cannot read directory as file".to_string(),
            }),
        });
    }

    if metadata.len() > MAX_TEXT_FILE_SIZE {
        return HttpResponse::BadRequest().json(ApiResponse::<String> {
            success: false,
            data: None,
            error: Some(ApiError {
                message: "File too large (>50MB)".to_string(),
            }),
        });
    }

    match fs::read_to_string(path) {
        Ok(content) => HttpResponse::Ok().json(ApiResponse::<String> {
            success: true,
            data: Some(content),
            error: None,
        }),
        Err(e) => HttpResponse::InternalServerError().json(ApiResponse::<String> {
            success: false,
            data: None,
            error: Some(ApiError {
                message: format!("Failed to read file: {}", e),
            }),
        }),
    }
}

#[derive(Deserialize)]
pub struct ReadImageRequest {
    file_path: String,
}

pub async fn read_image(req: web::Query<ReadImageRequest>) -> HttpResponse {
    let file_path = &req.file_path;

    if file_path.is_empty() || file_path.trim().is_empty() {
        return HttpResponse::BadRequest().json(ApiResponse::<String> {
            success: false,
            data: None,
            error: Some(ApiError {
                message: "Invalid file path".to_string(),
            }),
        });
    }

    let path = Path::new(file_path);

    if !path.exists() {
        return HttpResponse::NotFound().json(ApiResponse::<String> {
            success: false,
            data: None,
            error: Some(ApiError {
                message: "File not found".to_string(),
            }),
        });
    }

    let metadata = match fs::metadata(path) {
        Ok(m) => m,
        Err(e) => {
            return HttpResponse::InternalServerError().json(ApiResponse::<String> {
                success: false,
                data: None,
                error: Some(ApiError {
                    message: format!("Failed to read file metadata: {}", e),
                }),
            });
        }
    };

    if metadata.is_dir() {
        return HttpResponse::BadRequest().json(ApiResponse::<String> {
            success: false,
            data: None,
            error: Some(ApiError {
                message: "Cannot read directory as image".to_string(),
            }),
        });
    }

    if metadata.len() > MAX_IMAGE_FILE_SIZE {
        return HttpResponse::BadRequest().json(ApiResponse::<String> {
            success: false,
            data: None,
            error: Some(ApiError {
                message: "Image too large (>10MB)".to_string(),
            }),
        });
    }

    let bytes = match fs::read(path) {
        Ok(b) => b,
        Err(e) => {
            return HttpResponse::InternalServerError().json(ApiResponse::<String> {
                success: false,
                data: None,
                error: Some(ApiError {
                    message: format!("Failed to read image: {}", e),
                }),
            });
        }
    };

    let ext = path
        .extension()
        .and_then(|s| s.to_str())
        .map(|s| s.to_lowercase())
        .unwrap_or_default();

    let mime_type = match ext.as_str() {
        "jpg" | "jpeg" => "image/jpeg",
        "png" => "image/png",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "svg" => "image/svg+xml",
        "bmp" => "image/bmp",
        "ico" => "image/x-icon",
        "tiff" | "tif" => "image/tiff",
        _ => "application/octet-stream",
    };

    let base64_str = general_purpose::STANDARD.encode(&bytes);
    let data_uri = format!("data:{};base64,{}", mime_type, base64_str);

    HttpResponse::Ok().json(ApiResponse::<String> {
        success: true,
        data: Some(data_uri),
        error: None,
    })
}