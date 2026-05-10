use actix_web::{web, HttpResponse};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

const MAX_DEPTH: usize = 3;
const MAX_ITEMS_PER_DIR: usize = 100;

#[derive(Deserialize)]
pub struct TreeRequest {
    dir_path: String,
}

#[derive(Serialize, Clone)]
pub struct TreeNode {
    name: String,
    path: String,
    #[serde(rename = "type")]
    node_type: String, // "file" or "directory"
    children: Option<Vec<TreeNode>>,
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

const IGNORED_DIRS: &[&str] = &[
    "node_modules",
    ".git",
    ".svn",
    ".hg",
    "dist",
    "build",
    "out",
    "coverage",
    ".next",
    ".nuxt",
    ".cache",
    "vendor",
];

const IGNORED_FILES: &[&str] = &[".DS_Store", "Thumbs.db", "desktop.ini"];

fn build_tree(dir_path: &str, depth: usize) -> Vec<TreeNode> {
    if depth > MAX_DEPTH {
        return Vec::new();
    }

    let path = Path::new(dir_path);
    
    if !path.exists() || !path.is_dir() {
        return Vec::new();
    }

    let entries = match fs::read_dir(path) {
        Ok(e) => e,
        Err(_) => return Vec::new(),
    };

    let mut nodes: Vec<TreeNode> = Vec::new();

    for entry in entries {
        if nodes.len() >= MAX_ITEMS_PER_DIR {
            break;
        }

        let entry = match entry {
            Ok(e) => e,
            Err(_) => continue,
        };

        let name = entry.file_name().to_string_lossy().to_string();

        // Skip hidden files
        if name.starts_with('.') {
            continue;
        }

        let entry_path = entry.path();
        let path_str = entry_path.to_string_lossy().to_string();

        let is_dir = match entry.file_type() {
            Ok(ft) => ft.is_dir(),
            Err(_) => continue,
        };

        // Skip ignored directories and files
        if is_dir && IGNORED_DIRS.contains(&name.as_str()) {
            continue;
        }
        
        if !is_dir && IGNORED_FILES.contains(&name.as_str()) {
            continue;
        }

        let node_type = if is_dir { "directory" } else { "file" };

        let children = if is_dir {
            Some(build_tree(&path_str, depth + 1))
        } else {
            None
        };

        nodes.push(TreeNode {
            name,
            path: path_str,
            node_type: node_type.to_string(),
            children,
        });
    }

    // Sort: directories first, then alphabetically
    nodes.sort_by(|a, b| {
        if a.node_type == "directory" && b.node_type == "file" {
            std::cmp::Ordering::Less
        } else if a.node_type == "file" && b.node_type == "directory" {
            std::cmp::Ordering::Greater
        } else {
            a.name.cmp(&b.name)
        }
    });

    nodes
}

pub async fn get_tree(req: web::Query<TreeRequest>) -> HttpResponse {
    let dir_path = &req.dir_path;

    if dir_path.is_empty() || dir_path.trim().is_empty() {
        return HttpResponse::BadRequest().json(ApiResponse::<Vec<TreeNode>> {
            success: false,
            data: None,
            error: Some(ApiError {
                message: "Invalid directory path".to_string(),
            }),
        });
    }

    let path = Path::new(dir_path);

    if !path.exists() {
        return HttpResponse::NotFound().json(ApiResponse::<Vec<TreeNode>> {
            success: false,
            data: None,
            error: Some(ApiError {
                message: "Directory not found".to_string(),
            }),
        });
    }

    if !path.is_dir() {
        return HttpResponse::BadRequest().json(ApiResponse::<Vec<TreeNode>> {
            success: false,
            data: None,
            error: Some(ApiError {
                message: "Path is not a directory".to_string(),
            }),
        });
    }

    let tree = build_tree(dir_path, 0);

    HttpResponse::Ok().json(ApiResponse::<Vec<TreeNode>> {
        success: true,
        data: Some(tree),
        error: None,
    })
}