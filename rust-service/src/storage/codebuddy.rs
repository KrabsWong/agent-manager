// CodeBuddy Session Storage
// Reads and parses CodeBuddy conversation sessions from projects directory
// Each project can have multiple session .jsonl files with full message history

use anyhow::{Result, Context};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::fs;
use std::collections::HashMap;

const CODEBUDDY_DIR: &str = ".codebuddy";
const PROJECTS_DIR_NAME: &str = "projects";
const SESSIONS_DIR_NAME: &str = "sessions";

#[derive(Debug, Serialize, Deserialize)]
pub struct CodebuddySessionFile {
    pub pid: i32,
    pub lastHeartbeat: i64,
    pub sessionId: String,
    pub cwd: String,
    pub startedAt: i64,
    pub kind: String,
    pub url: String,
    pub endpoint: String,
    pub mode: String,
    pub version: String,
    pub os: String,
    pub arch: String,
    pub hostname: String,
    pub updatedAt: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub meta: Option<CodebuddyMeta>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CodebuddyMeta {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub currentTopic: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CodebuddyMessageEntry {
    pub id: String,
    pub timestamp: i64,
    #[serde(rename = "type")]
    pub entry_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub role: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub content: Option<Vec<CodebuddyContent>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<CodebuddyMessageContent>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub arguments: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub callId: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub output: Option<CodebuddyOutput>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub providerData: Option<CodebuddyProviderData>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CodebuddyContent {
    #[serde(rename = "type")]
    pub content_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub text: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CodebuddyMessageContent {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub content: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CodebuddyOutput {
    #[serde(rename = "type")]
    pub output_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub text: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CodebuddyProviderData {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub agent: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub messageId: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CodebuddySession {
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
pub struct CodebuddyMessage {
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
    pub tool_input: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_output: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub callId: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CodebuddySessionDetail {
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
    pub messages: Vec<CodebuddyMessage>,
}

pub struct CodebuddyStorage {
    home_dir: PathBuf,
}

impl CodebuddyStorage {
    pub fn new() -> Result<Self> {
        let home_dir = dirs::home_dir()
            .context("Failed to get home directory")?;
        Ok(Self { home_dir })
    }

    pub fn is_available(&self) -> bool {
        let codebuddy_dir = self.home_dir.join(CODEBUDDY_DIR);
        codebuddy_dir.exists()
    }

    fn decode_project_dir(&self, dir_name: &str) -> String {
        if dir_name.starts_with("Users-") {
            let parts: Vec<&str> = dir_name.split('-').collect();
            if parts.len() >= 2 {
                let user_part = parts[1];
                let remaining_path = parts[2..].join("/");
                return format!("/Users/{}/{}", user_part, remaining_path);
            }
        }
        format!("/{}", dir_name.replace('-', "/"))
    }

    fn read_cwd_from_session(&self, file_path: &Path) -> Option<String> {
        let content = fs::read_to_string(file_path).ok()?;
        let first_line = content.lines().next()?;
        let entry: CodebuddyMessageEntry = serde_json::from_str(first_line).ok()?;
        
        if let Some(extra) = serde_json::from_str::<serde_json::Value>(first_line).ok() {
            if let Some(cwd) = extra.get("cwd").and_then(|c| c.as_str()) {
                return Some(cwd.to_string());
            }
        }
        None
    }

    fn read_session_jsonl(&self, file_path: &Path) -> (i64, i64, i64, String, String) {
        let content = match fs::read_to_string(file_path) {
            Ok(c) => c,
            Err(_) => return (0, 0, 0, String::new(), String::new()),
        };

        let lines: Vec<&str> = content.lines().filter(|l| !l.trim().is_empty()).collect();

        if lines.is_empty() {
            return (0, 0, 0, String::new(), String::new());
        }

        let mut count = 0i64;
        let mut first_message = String::new();
        let mut last_message = String::new();
        let mut first_timestamp = 0i64;
        let mut last_timestamp = 0i64;

        for line in &lines {
            if let Ok(entry) = serde_json::from_str::<CodebuddyMessageEntry>(line) {
                if entry.timestamp > 0 {
                    if first_timestamp == 0 {
                        first_timestamp = entry.timestamp;
                    }
                    last_timestamp = entry.timestamp;
                }

                let is_displayable = 
                    (entry.entry_type == "message" && matches!(entry.role.as_deref(), Some("user") | Some("assistant"))) ||
                    entry.entry_type == "function_call" ||
                    entry.entry_type == "function_call_result";

                if is_displayable {
                    count += 1;
                }

                if entry.entry_type == "message" && entry.role.as_deref() == Some("user") {
                    let text = entry.content
                        .and_then(|c| c.into_iter().next())
                        .and_then(|c| c.text)
                        .unwrap_or_default();
                    
                    if first_message.is_empty() {
                        first_message = self.truncate_message(&text, 100);
                    }
                    last_message = self.truncate_message(&text, 100);
                }
            }
        }

        (count, first_timestamp, last_timestamp, first_message, last_message)
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

    pub async fn get_sessions(&self) -> Result<Vec<CodebuddySession>> {
        let projects_dir = self.home_dir.join(CODEBUDDY_DIR).join(PROJECTS_DIR_NAME);
        
        if !projects_dir.exists() {
            return Ok(vec![]);
        }

        let sessions_dir = self.home_dir.join(CODEBUDDY_DIR).join(SESSIONS_DIR_NAME);
        
        let mut active_session: Option<CodebuddySessionFile> = None;
        if sessions_dir.exists() {
            if let Ok(entries) = fs::read_dir(&sessions_dir) {
                for entry in entries {
                    if let Ok(entry) = entry {
                        let file_name = entry.file_name().to_string_lossy().to_string();
                        if file_name.ends_with(".json") {
                            if let Ok(content) = fs::read_to_string(entry.path()) {
                                if let Ok(session) = serde_json::from_str::<CodebuddySessionFile>(&content) {
                                    active_session = Some(session);
                                    break;
                                }
                            }
                        }
                    }
                }
            }
        }

        let mut session_map: HashMap<String, (CodebuddySession, u64)> = HashMap::new();

        if let Ok(project_dirs) = fs::read_dir(&projects_dir) {
            for project_entry in project_dirs {
                if let Ok(project_entry) = project_entry {
                    let project_dir_name = project_entry.file_name().to_string_lossy().to_string();
                    let project_path = project_entry.path();

                    if !project_path.is_dir() {
                        continue;
                    }

                    let decoded_cwd = self.decode_project_dir(&project_dir_name);

                    if let Ok(entries) = fs::read_dir(&project_path) {
                        for entry in entries {
                            if let Ok(entry) = entry {
                                let entry_name = entry.file_name().to_string_lossy().to_string();
                                let entry_path = entry.path();

                                if entry_name.ends_with(".jsonl") && entry_path.is_file() {
                                    let session_id = entry_name.replace(".jsonl", "");
                                    let stats = fs::metadata(&entry_path)?;
                                    let size = stats.len();

                                    if let Some((_, existing_size)) = session_map.get(&session_id) {
                                        if *existing_size >= size {
                                            continue;
                                        }
                                    }

                                    let session_cwd = self.read_cwd_from_session(&entry_path)
                                        .unwrap_or_else(|| decoded_cwd.clone());

                                    let is_active_session = active_session.as_ref()
                                        .map(|s| s.sessionId == session_id)
                                        .unwrap_or(false);

                                    let (count, created_at, updated_at, first_msg, last_msg) = 
                                        self.read_session_jsonl(&entry_path);

                                    let file_name = if is_active_session {
                                        active_session.as_ref()
                                            .and_then(|s| s.meta.as_ref())
                                            .and_then(|m| m.currentTopic.clone())
                                            .unwrap_or_else(|| first_msg.clone())
                                    } else {
                                        first_msg.clone()
                                    };

                                    let session = CodebuddySession {
                                        id: session_id.clone(),
                                        app_type: "codebuddy".to_string(),
                                        file_name: if file_name.is_empty() {
                                            format!("Session {}", &session_id[..8.min(session_id.len())])
                                        } else {
                                            file_name
                                        },
                                        file_path: entry_path.to_string_lossy().to_string(),
                                        directory: Some(session_cwd),
                                        created_at,
                                        updated_at: if is_active_session {
                                            active_session.as_ref()
                                                .map(|s| s.updatedAt.max(s.lastHeartbeat))
                                                .unwrap_or(updated_at)
                                        } else {
                                            updated_at
                                        },
                                        message_count: count,
                                        first_message: first_msg,
                                        last_message: if is_active_session {
                                            active_session.as_ref()
                                                .and_then(|s| s.meta.as_ref())
                                                .and_then(|m| m.currentTopic.clone())
                                                .unwrap_or_else(|| last_msg.clone())
                                        } else {
                                            last_msg
                                        },
                                    };

                                    session_map.insert(session_id, (session, size));
                                }
                            }
                        }
                    }
                }
            }
        }

        let mut sessions: Vec<CodebuddySession> = session_map.into_values()
            .map(|(s, _)| s)
            .collect();

        sessions.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));

        Ok(sessions)
    }

    pub async fn get_session_detail(&self, session_id: &str) -> Result<Option<CodebuddySessionDetail>> {
        let projects_dir = self.home_dir.join(CODEBUDDY_DIR).join(PROJECTS_DIR_NAME);
        
        if !projects_dir.exists() {
            return Ok(None);
        }

        let mut found_sessions: Vec<(PathBuf, String, u64)> = vec![];

        if let Ok(project_dirs) = fs::read_dir(&projects_dir) {
            for project_entry in project_dirs {
                if let Ok(project_entry) = project_entry {
                    let project_dir_name = project_entry.file_name().to_string_lossy().to_string();
                    let project_path = project_entry.path();

                    if !project_path.is_dir() {
                        continue;
                    }

                    let decoded_cwd = self.decode_project_dir(&project_dir_name);

                    let target_file = project_path.join(format!("{}.jsonl", session_id));
                    if target_file.exists() {
                        let stats = fs::metadata(&target_file)?;
                        found_sessions.push((target_file, decoded_cwd.clone(), stats.len()));
                    }

                    if let Ok(sub_entries) = fs::read_dir(&project_path) {
                        for sub_entry in sub_entries {
                            if let Ok(sub_entry) = sub_entry {
                                if sub_entry.path().is_dir() {
                                    let sub_file = sub_entry.path().join(format!("{}.jsonl", session_id));
                                    if sub_file.exists() {
                                        let stats = fs::metadata(&sub_file)?;
                                        found_sessions.push((sub_file, decoded_cwd.clone(), stats.len()));
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        if found_sessions.is_empty() {
            return Ok(None);
        }

        found_sessions.sort_by(|a, b| b.2.cmp(&a.2));
        let (found_path, project_cwd, _) = found_sessions.into_iter().next().unwrap();

        let content = fs::read_to_string(&found_path)?;
        let lines: Vec<&str> = content.lines().filter(|l| !l.trim().is_empty()).collect();

        let mut messages: Vec<CodebuddyMessage> = vec![];
        let mut first_message = String::new();
        let mut last_message = String::new();
        let mut current_model: Option<String> = None;

        let mut pending_tool_calls: HashMap<String, (Option<String>, Option<String>)> = HashMap::new();

        for line in &lines {
            if let Ok(entry) = serde_json::from_str::<CodebuddyMessageEntry>(line) {
                if let Some(ref model) = entry.providerData.as_ref().and_then(|p| p.model.clone()) {
                    current_model = Some(model.clone());
                }

                if entry.entry_type == "message" && entry.role.as_deref() == Some("user") {
                    let text = entry.content
                        .as_ref()
                        .and_then(|c| c.first())
                        .and_then(|c| c.text.clone())
                        .unwrap_or_default();

                    if first_message.is_empty() {
                        first_message = self.truncate_message(&text, 100);
                    }
                    last_message = self.truncate_message(&text, 100);

                    messages.push(CodebuddyMessage {
                        msg_type: "user".to_string(),
                        timestamp: Some(chrono::DateTime::from_timestamp_millis(entry.timestamp)
                            .map(|dt| dt.to_rfc3339())
                            .unwrap_or_default()),
                        role: Some("user".to_string()),
                        content: Some(text),
                        tool_name: None,
                        tool_input: None,
                        tool_output: None,
                        model: current_model.clone(),
                        callId: None,
                        metadata: None,
                    });
                } else if entry.entry_type == "message" && entry.role.as_deref() == Some("assistant") {
                    let text = if let Some(content_arr) = entry.content.as_ref() {
                        content_arr.iter()
                            .filter(|c| c.content_type == "output_text")
                            .filter_map(|c| c.text.clone())
                            .collect::<Vec<_>>()
                            .join("")
                    } else if let Some(msg_content) = entry.message.as_ref().and_then(|m| m.content.clone()) {
                        msg_content
                    } else {
                        String::new()
                    };

                    messages.push(CodebuddyMessage {
                        msg_type: "assistant".to_string(),
                        timestamp: Some(chrono::DateTime::from_timestamp_millis(entry.timestamp)
                            .map(|dt| dt.to_rfc3339())
                            .unwrap_or_default()),
                        role: Some("assistant".to_string()),
                        content: Some(text),
                        tool_name: None,
                        tool_input: None,
                        tool_output: None,
                        model: current_model.clone(),
                        callId: None,
                        metadata: None,
                    });
                } else if entry.entry_type == "function_call" {
                    let mut tool_input: serde_json::Value = serde_json::json!({});
                    let mut tool_content = format!("Tool: {}", entry.name.as_deref().unwrap_or("unknown"));

                    if let Some(args) = entry.arguments.as_ref() {
                        if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(args) {
                            tool_input = parsed.clone();
                            
                            if let Some(name) = entry.name.as_deref() {
                                if name == "WebFetch" {
                                    if let Some(url) = tool_input.get("url").and_then(|u| u.as_str()) {
                                        tool_content = format!("WebFetch: {}", url);
                                    }
                                } else if name == "Read" {
                                    if let Some(path) = tool_input.get("file_path").and_then(|p| p.as_str()) {
                                        tool_content = format!("Read: {}", path);
                                    }
                                } else if name == "Write" {
                                    if let Some(path) = tool_input.get("file_path").and_then(|p| p.as_str()) {
                                        tool_content = format!("Write: {}", path);
                                    }
                                } else if name == "Bash" {
                                    if let Some(cmd) = tool_input.get("command").and_then(|c| c.as_str()) {
                                        tool_content = format!("Bash: {}", cmd);
                                    }
                                } else if name == "Agent" {
                                    if let Some(desc) = tool_input.get("description").and_then(|d| d.as_str()) {
                                        tool_content = format!("Agent: {}", desc);
                                    }
                                }
                            }
                        }
                    }

                    let call_id = entry.callId.as_ref()
                        .or(Some(&entry.id))
                        .map(|s| s.to_string())
                        .unwrap_or_else(|| format!("call_{}", messages.len()));

                    if entry.name.as_deref().map(|n| n.to_lowercase().contains("agent")).unwrap_or(false) {
                        let child_session_id = tool_input.get("sessionId")
                            .or(tool_input.get("subAgentSessionId"))
                            .or(tool_input.get("childSessionId"))
                            .and_then(|v| v.as_str())
                            .map(|s| s.to_string());

                        pending_tool_calls.insert(call_id.clone(), (child_session_id, Some("codebuddy".to_string())));
                    }

                    messages.push(CodebuddyMessage {
                        msg_type: "tool_use".to_string(),
                        timestamp: Some(chrono::DateTime::from_timestamp_millis(entry.timestamp)
                            .map(|dt| dt.to_rfc3339())
                            .unwrap_or_default()),
                        role: None,
                        content: Some(tool_content),
                        tool_name: entry.name.clone(),
                        tool_input: Some(tool_input),
                        tool_output: None,
                        model: current_model.clone(),
                        callId: Some(call_id.clone()),
                        metadata: None,
                    });
                } else if entry.entry_type == "function_call_result" {
                    let output_text = entry.output
                        .as_ref()
                        .and_then(|o| o.text.clone())
                        .unwrap_or_default();
                    let truncated_output = self.truncate_message(&output_text, 300);

                    let mut child_session_id: Option<String> = None;
                    let mut child_session_app_type: Option<String> = None;

                    if let Some(call_id) = entry.callId.as_ref() {
                        if let Some((sid, atype)) = pending_tool_calls.remove(call_id) {
                            child_session_id = sid;
                            child_session_app_type = atype;
                        }
                    }

                    let metadata = if let Some(sid) = child_session_id {
                        Some(serde_json::json!({
                            "childSessionId": sid,
                            "childSessionAppType": child_session_app_type
                        }))
                    } else {
                        None
                    };

                    messages.push(CodebuddyMessage {
                        msg_type: "tool_result".to_string(),
                        timestamp: Some(chrono::DateTime::from_timestamp_millis(entry.timestamp)
                            .map(|dt| dt.to_rfc3339())
                            .unwrap_or_default()),
                        role: None,
                        content: Some(truncated_output),
                        tool_name: entry.name.clone(),
                        tool_input: None,
                        tool_output: Some(serde_json::json!({ "output": output_text })),
                        model: current_model.clone(),
                        callId: entry.callId.clone(),
                        metadata,
                    });
                }
            }
        }

        let first_entry: CodebuddyMessageEntry = lines.first()
            .and_then(|l| serde_json::from_str(l).ok())
            .unwrap_or_else(|| CodebuddyMessageEntry {
                id: String::new(),
                timestamp: chrono::Utc::now().timestamp_millis(),
                entry_type: String::new(),
                role: None,
                content: None,
                message: None,
                name: None,
                arguments: None,
                callId: None,
                output: None,
                status: None,
                providerData: None,
            });

        let last_entry: CodebuddyMessageEntry = lines.last()
            .and_then(|l| serde_json::from_str(l).ok())
            .unwrap_or_else(|| first_entry.clone());

        Ok(Some(CodebuddySessionDetail {
            id: session_id.to_string(),
            app_type: "codebuddy".to_string(),
            file_name: if first_message.is_empty() {
                format!("Session {}", &session_id[..8.min(session_id.len())])
            } else {
                first_message.clone()
            },
            file_path: found_path.to_string_lossy().to_string(),
            directory: Some(project_cwd),
            created_at: first_entry.timestamp,
            updated_at: last_entry.timestamp,
            message_count: messages.len() as i64,
            first_message,
            last_message,
            messages,
        }))
    }

    pub async fn get_stats(&self) -> Result<serde_json::Value> {
        let sessions = self.get_sessions().await?;

        if sessions.is_empty() {
            return Ok(serde_json::json!({
                "totalSessions": 0,
                "totalMessages": 0
            }));
        }

        let total_messages: i64 = sessions.iter().map(|s| s.message_count).sum();
        let dates: Vec<i64> = sessions.iter().map(|s| s.created_at).collect();
        let updated_dates: Vec<i64> = sessions.iter().map(|s| s.updated_at).collect();

        Ok(serde_json::json!({
            "totalSessions": sessions.len(),
            "totalMessages": total_messages,
            "firstSessionDate": dates.iter().min(),
            "lastSessionDate": updated_dates.iter().max()
        }))
    }
}