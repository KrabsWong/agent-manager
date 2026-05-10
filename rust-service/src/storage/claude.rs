// Claude Code Session Storage
// Reads and parses Claude Code conversation sessions from:
// - New format: ~/.claude/projects/ (with UUID)
// - Old format: ~/.claude/transcripts/ (ses_*.jsonl)

use anyhow::{Result, Context};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::fs;
use std::collections::HashMap;

const CLAUDE_PROJECTS_PATH: &str = ".claude/projects";
const CLAUDE_HISTORY_PATH: &str = ".claude/history.jsonl";
const CLAUDE_TRANSCRIPTS_PATH: &str = ".claude/transcripts";

#[derive(Debug, Serialize, Deserialize)]
pub struct HistoryEntry {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub display: Option<String>,
    pub timestamp: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub project: Option<String>,
    pub sessionId: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub pastedContents: Option<HashMap<String, serde_json::Value>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ClaudeSession {
    pub id: String,
    pub app_type: String,
    pub file_name: String,
    pub file_path: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub directory: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
    pub message_count: i64,
    pub first_message: String,
    pub last_message: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ClaudeMessage {
    #[serde(rename = "type")]
    pub msg_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub timestamp: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub role: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub content: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_output: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub thinking: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub callId: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ClaudeSessionDetail {
    pub id: String,
    pub app_type: String,
    pub file_name: String,
    pub file_path: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub directory: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
    pub message_count: i64,
    pub first_message: String,
    pub last_message: String,
    pub messages: Vec<ClaudeMessage>,
}

pub struct ClaudeStorage {
    home_dir: PathBuf,
}

impl ClaudeStorage {
    pub fn new() -> Result<Self> {
        let home_dir = dirs::home_dir()
            .context("Failed to get home directory")?;
        Ok(Self { home_dir })
    }

    pub fn is_available(&self) -> bool {
        let projects_path = self.home_dir.join(CLAUDE_PROJECTS_PATH);
        let transcripts_path = self.home_dir.join(CLAUDE_TRANSCRIPTS_PATH);
        projects_path.exists() || transcripts_path.exists()
    }

    fn load_history(&self) -> Vec<HistoryEntry> {
        let history_path = self.home_dir.join(CLAUDE_HISTORY_PATH);
        if !history_path.exists() {
            return vec![];
        }

        let content = fs::read_to_string(&history_path)
            .unwrap_or_default();
        
        content
            .lines()
            .filter(|line| !line.trim().is_empty())
            .filter_map(|line| {
                serde_json::from_str::<HistoryEntry>(line).ok()
            })
            .filter(|entry| !entry.sessionId.is_empty() && entry.timestamp > 0)
            .collect()
    }

    fn escape_project_path(project_path: &str) -> String {
        project_path.replace('/', "-")
    }

    fn get_new_format_sessions(&self) -> Vec<ClaudeSession> {
        let mut sessions = Vec::new();
        
        let projects_path = self.home_dir.join(CLAUDE_PROJECTS_PATH);
        if !projects_path.exists() {
            return sessions;
        }

        let history_entries = self.load_history();
        let seen_session_ids: HashMap<String, bool> = HashMap::new();

        // Process in reverse to get latest first
        for entry in history_entries.iter().rev() {
            if seen_session_ids.contains_key(&entry.sessionId) {
                continue;
            }

            if entry.project.is_none() {
                continue;
            }

            let project = entry.project.as_ref().unwrap();
            let project_dir = Self::escape_project_path(project);
            let session_file = projects_path.join(&project_dir).join(format!("{}.jsonl", entry.sessionId));

            if !session_file.exists() {
                continue;
            }

            if let Ok(session) = self.parse_new_session_file(&session_file, entry) {
                sessions.push(session);
            }
        }

        sessions
    }

    fn get_old_format_sessions(&self) -> Vec<ClaudeSession> {
        let mut sessions = Vec::new();
        
        let transcripts_path = self.home_dir.join(CLAUDE_TRANSCRIPTS_PATH);
        if !transcripts_path.exists() {
            return sessions;
        }

        if let Ok(entries) = fs::read_dir(&transcripts_path) {
            for entry in entries {
                if let Ok(entry) = entry {
                    let file_name = entry.file_name().to_string_lossy().to_string();
                    
                    if file_name.ends_with(".jsonl") && file_name.starts_with("ses_") {
                        if let Ok(session) = self.parse_old_session_file(&file_name) {
                            sessions.push(session);
                        }
                    }
                }
            }
        }

        sessions
    }

    pub fn get_sessions(&self) -> Result<Vec<ClaudeSession>> {
        let new_sessions = self.get_new_format_sessions();
        let old_sessions = self.get_old_format_sessions();

        let mut all_sessions = new_sessions;
        all_sessions.extend(old_sessions);

        // Sort by updated_at descending
        all_sessions.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));

        Ok(all_sessions)
    }

    fn parse_new_session_file(&self, file_path: &Path, history_entry: &HistoryEntry) -> Result<ClaudeSession> {
        let content = fs::read_to_string(file_path)?;
        let lines: Vec<&str> = content.lines().filter(|l| !l.trim().is_empty()).collect();

        if lines.is_empty() {
            return Err(anyhow::anyhow!("Empty session file"));
        }

        let mut first_message = String::new();
        let mut last_message = String::new();
        let mut message_count = 0;

        for line in &lines {
            if let Ok(msg) = serde_json::from_str::<serde_json::Value>(line) {
                let msg_type = msg.get("type").and_then(|t| t.as_str()).unwrap_or("");
                
                if msg_type == "user" || msg_type == "assistant" {
                    message_count += 1;
                    
                    let preview = self.extract_new_message_preview(&msg);
                    if first_message.is_empty() {
                        first_message = preview.clone();
                    }
                    last_message = preview;
                }
            }
        }

        Ok(ClaudeSession {
            id: history_entry.sessionId.clone(),
            app_type: "claude".to_string(),
            file_name: format!("{}.jsonl", history_entry.sessionId),
            file_path: file_path.to_string_lossy().to_string(),
            directory: history_entry.project.clone(),
            created_at: history_entry.timestamp,
            updated_at: history_entry.timestamp,
            message_count,
            first_message: if first_message.is_empty() {
                history_entry.display.clone().unwrap_or_default()
            } else {
                first_message
            },
            last_message,
        })
    }

    fn parse_old_session_file(&self, file_name: &str) -> Result<ClaudeSession> {
        let transcripts_path = self.home_dir.join(CLAUDE_TRANSCRIPTS_PATH);
        let file_path = transcripts_path.join(file_name);

        let metadata = fs::metadata(&file_path)?;
        let created_at = metadata.created()?.duration_since(std::time::UNIX_EPOCH)?.as_millis() as i64;
        let updated_at = metadata.modified()?.duration_since(std::time::UNIX_EPOCH)?.as_millis() as i64;

        // Extract session ID from filename (ses_<id>.jsonl)
        let id = file_name.replace(".jsonl", "");

        let content = fs::read_to_string(&file_path)?;
        let lines: Vec<&str> = content.lines().filter(|l| !l.trim().is_empty()).collect();

        if lines.is_empty() {
            return Err(anyhow::anyhow!("Empty session file"));
        }

        let mut first_message = String::new();
        let mut last_message = String::new();

        if let Ok(first_line) = serde_json::from_str::<serde_json::Value>(lines[0]) {
            first_message = self.extract_old_message_preview(&first_line);
        }

        if let Ok(last_line) = serde_json::from_str::<serde_json::Value>(lines[lines.len() - 1]) {
            last_message = self.extract_old_message_preview(&last_line);
        }

        Ok(ClaudeSession {
            id,
            app_type: "claude".to_string(),
            file_name: file_name.to_string(),
            file_path: file_path.to_string_lossy().to_string(),
            directory: None,
            created_at,
            updated_at,
            message_count: lines.len() as i64,
            first_message,
            last_message,
        })
    }

    fn extract_new_message_preview(&self, msg: &serde_json::Value) -> String {
        let message_obj = msg.get("message");
        
        if let Some(content) = message_obj.and_then(|m| m.get("content")) {
            if let Some(content_str) = content.as_str() {
                return self.truncate_message(content_str, 100);
            }
            
            if let Some(content_arr) = content.as_array() {
                let text_parts = content_arr
                    .iter()
                    .filter(|item| {
                        item.get("type").and_then(|t| t.as_str()) == Some("text")
                    })
                    .filter_map(|item| item.get("text").and_then(|t| t.as_str()))
                    .collect::<Vec<_>>()
                    .join(" ");
                
                return self.truncate_message(&text_parts, 100);
            }
        }

        String::new()
    }

    fn extract_old_message_preview(&self, msg: &serde_json::Value) -> String {
        if let Some(content) = msg.get("content").and_then(|c| c.as_str()) {
            return self.truncate_message(content, 100);
        }

        if let Some(tool_name) = msg.get("tool_name").and_then(|t| t.as_str()) {
            return format!("[Tool: {}]", tool_name);
        }

        "[Unknown message type]".to_string()
    }

    fn truncate_message(&self, text: &str, max_len: usize) -> String {
        if text.len() > max_len {
            let mut end = max_len;
            while !text.is_char_boundary(end) && end > 0 {
                end -= 1;
            }
            format!("{}...", &text[..end])
        } else {
            text.to_string()
        }
    }

    pub fn get_session_detail(&self, session_id: &str) -> Result<Option<ClaudeSessionDetail>> {
        // Check if it's new format (UUID format)
        if session_id.contains('-') {
            return self.get_new_session_detail(session_id);
        }

        // Otherwise it's old format (ses_xxx)
        self.get_old_session_detail(session_id)
    }

    fn get_new_session_detail(&self, session_id: &str) -> Result<Option<ClaudeSessionDetail>> {
        let history_entries = self.load_history();
        let history_entry = history_entries.iter().find(|e| e.sessionId == session_id);

        if history_entry.is_none() || history_entry.unwrap().project.is_none() {
            return Ok(None);
        }

        let entry = history_entry.unwrap();
        let project = entry.project.as_ref().unwrap();
        let project_dir = Self::escape_project_path(project);
        let file_path = self.home_dir.join(CLAUDE_PROJECTS_PATH).join(&project_dir).join(format!("{}.jsonl", session_id));

        if !file_path.exists() {
            return Ok(None);
        }

        let content = fs::read_to_string(&file_path)?;
        let lines: Vec<&str> = content.lines().filter(|l| !l.trim().is_empty()).collect();

        let mut messages = Vec::new();
        
        for line in &lines {
            if let Ok(msg) = serde_json::from_str::<serde_json::Value>(line) {
                if let Some(parsed) = self.parse_new_project_message(&msg) {
                    messages.push(parsed);
                }
            }
        }

        let first_message = messages.first()
            .and_then(|m| m.content.clone())
            .map(|c| self.truncate_message(&c, 100))
            .unwrap_or_default();

        let last_message = messages.last()
            .and_then(|m| m.content.clone())
            .map(|c| self.truncate_message(&c, 100))
            .unwrap_or_default();

        Ok(Some(ClaudeSessionDetail {
            id: session_id.to_string(),
            app_type: "claude".to_string(),
            file_name: format!("{}.jsonl", session_id),
            file_path: file_path.to_string_lossy().to_string(),
            directory: Some(project.clone()),
            created_at: entry.timestamp,
            updated_at: entry.timestamp,
            message_count: messages.len() as i64,
            first_message,
            last_message,
            messages,
        }))
    }

    fn get_old_session_detail(&self, session_id: &str) -> Result<Option<ClaudeSessionDetail>> {
        let file_name = format!("{}.jsonl", session_id);
        let file_path = self.home_dir.join(CLAUDE_TRANSCRIPTS_PATH).join(&file_name);

        if !file_path.exists() {
            return Ok(None);
        }

        let metadata = fs::metadata(&file_path)?;
        let created_at = metadata.created()?.duration_since(std::time::UNIX_EPOCH)?.as_millis() as i64;
        let updated_at = metadata.modified()?.duration_since(std::time::UNIX_EPOCH)?.as_millis() as i64;

        let content = fs::read_to_string(&file_path)?;
        let lines: Vec<&str> = content.lines().filter(|l| !l.trim().is_empty()).collect();

        let mut messages = Vec::new();
        
        for line in &lines {
            if let Ok(msg) = serde_json::from_str::<serde_json::Value>(line) {
                let msg_type = msg.get("type").and_then(|t| t.as_str()).unwrap_or("");
                
                // Filter out internal messages without content
                if msg_type == "user" && msg.get("content").is_none() {
                    continue;
                }

                if let Some(parsed) = self.parse_old_project_message(&msg) {
                    messages.push(parsed);
                }
            }
        }

        let first_message = messages.first()
            .and_then(|m| m.content.clone())
            .map(|c| self.truncate_message(&c, 100))
            .unwrap_or_default();

        let last_message = messages.last()
            .and_then(|m| m.content.clone())
            .map(|c| self.truncate_message(&c, 100))
            .unwrap_or_default();

        Ok(Some(ClaudeSessionDetail {
            id: session_id.to_string(),
            app_type: "claude".to_string(),
            file_name,
            file_path: file_path.to_string_lossy().to_string(),
            directory: None,
            created_at,
            updated_at,
            message_count: messages.len() as i64,
            first_message,
            last_message,
            messages,
        }))
    }

    fn parse_new_project_message(&self, msg: &serde_json::Value) -> Option<ClaudeMessage> {
        let msg_type = msg.get("type").and_then(|t| t.as_str())?;
        
        let timestamp = msg.get("timestamp")
            .and_then(|t| t.as_str())
            .unwrap_or(&chrono::Utc::now().to_rfc3339())
            .to_string();

        if msg_type == "user" {
            let prompt_id = msg.get("promptId");
            
            // Skip messages without promptId (internal/tool result)
            if prompt_id.is_none() {
                // Check if this is a tool result
                if let Some(tool_result) = msg.get("toolUseResult").and_then(|t| t.as_str()) {
                    return Some(ClaudeMessage {
                        msg_type: "tool_result".to_string(),
                        timestamp: Some(timestamp.to_string()),
                        role: None,
                        content: Some(self.truncate_message(tool_result, 300)),
                        tool_name: Some("unknown".to_string()),
                        tool_output: Some(serde_json::json!({ "output": tool_result })),
                        thinking: None,
                        model: None,
                        callId: msg.get("sourceToolAssistantUUID").and_then(|id| id.as_str()).map(|s| s.to_string()),
                    });
                }
                return None;
            }

            let content = self.extract_user_content(msg);
            
            return Some(ClaudeMessage {
                msg_type: "user".to_string(),
                timestamp: Some(timestamp.to_string()),
                role: Some("user".to_string()),
                content: Some(content),
                tool_name: None,
                tool_output: None,
                thinking: None,
                model: self.extract_model_from_message(msg),
                callId: None,
            });
        }

        if msg_type == "assistant" {
            let message_obj = msg.get("message");
            
            let content = if let Some(content_val) = message_obj.and_then(|m| m.get("content")) {
                if let Some(content_str) = content_val.as_str() {
                    Some(content_str.to_string())
                } else if let Some(content_arr) = content_val.as_array() {
                    let text_parts = content_arr
                        .iter()
                        .filter(|item| item.get("type").and_then(|t| t.as_str()) == Some("text"))
                        .filter_map(|item| item.get("text").and_then(|t| t.as_str()))
                        .collect::<Vec<_>>()
                        .join("\n");
                    
                    Some(text_parts)
                } else {
                    None
                }
            } else {
                None
            };

            let thinking = message_obj
                .and_then(|m| m.get("thinking"))
                .and_then(|t| t.as_str())
                .map(|s| s.to_string());

            return Some(ClaudeMessage {
                msg_type: "assistant".to_string(),
                timestamp: Some(timestamp.to_string()),
                role: Some("assistant".to_string()),
                content,
                tool_name: None,
                tool_output: None,
                thinking,
                model: self.extract_model_from_message(msg),
                callId: None,
            });
        }

        None
    }

    fn parse_old_project_message(&self, msg: &serde_json::Value) -> Option<ClaudeMessage> {
        let msg_type = msg.get("type").and_then(|t| t.as_str())?;
        
        let content = msg.get("content").and_then(|c| c.as_str()).map(|s| s.to_string());
        let role = msg.get("role").and_then(|r| r.as_str()).map(|s| s.to_string());
        let timestamp = msg.get("timestamp").and_then(|t| t.as_str()).map(|s| s.to_string());

        Some(ClaudeMessage {
            msg_type: msg_type.to_string(),
            timestamp,
            role,
            content,
            tool_name: msg.get("tool_name").and_then(|t| t.as_str()).map(|s| s.to_string()),
            tool_output: msg.get("tool_output").cloned(),
            thinking: None,
            model: None,
            callId: None,
        })
    }

    fn extract_user_content(&self, msg: &serde_json::Value) -> String {
        let message_obj = msg.get("message");
        
        if let Some(content) = message_obj.and_then(|m| m.get("content")) {
            if let Some(content_str) = content.as_str() {
                return content_str.to_string();
            }
            
            if let Some(content_arr) = content.as_array() {
                return content_arr
                    .iter()
                    .filter(|item| item.get("type").and_then(|t| t.as_str()) == Some("text"))
                    .filter_map(|item| item.get("text").and_then(|t| t.as_str()))
                    .collect::<Vec<_>>()
                    .join("\n");
            }
        }

        String::new()
    }

    fn extract_model_from_message(&self, msg: &serde_json::Value) -> Option<String> {
        // Try message.model first
        if let Some(model) = msg.get("message").and_then(|m| m.get("model")) {
            return self.extract_model_string(model);
        }

        // Try msg.model
        if let Some(model) = msg.get("model") {
            return self.extract_model_string(model);
        }

        None
    }

    fn extract_model_string(&self, model: &serde_json::Value) -> Option<String> {
        if let Some(model_str) = model.as_str() {
            return Some(model_str.to_string());
        }

        if let Some(model_obj) = model.as_object() {
            // Handle {providerID, modelID} format
            if let Some(model_id) = model_obj.get("modelID") {
                return Some(model_id.to_string());
            }

            // Handle {model: string} format
            if let Some(model_str) = model_obj.get("model").and_then(|m| m.as_str()) {
                return Some(model_str.to_string());
            }
        }

        None
    }
}