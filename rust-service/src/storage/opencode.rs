use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OpenCodeSession {
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

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OpenCodeSessionDetail {
    #[serde(flatten)]
    pub session: OpenCodeSession,
    pub messages: Vec<OpenCodeMessage>,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OpenCodeMessage {
    #[serde(rename = "type")]
    pub message_type: String,
    pub timestamp: String,
    pub content: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "reasoning_content")]
    pub reasoning_content: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "tool_name")]
    pub tool_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "tool_input")]
    pub tool_input: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "tool_output")]
    pub tool_output: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,
}

pub struct OpenCodeStorage {
    db_path: PathBuf,
}

impl OpenCodeStorage {
    pub fn new() -> Result<Self, anyhow::Error> {
        let home = dirs::home_dir()
            .ok_or_else(|| anyhow::anyhow!("Cannot find home directory"))?;

        let db_path = home.join(".local/share/opencode/opencode.db");

        Ok(Self { db_path })
    }

    pub fn is_available(&self) -> bool {
        self.db_path.exists()
    }

    pub fn get_sessions(&self) -> Result<Vec<OpenCodeSession>, anyhow::Error> {
        let conn = Connection::open(&self.db_path)?;

        let mut stmt = conn.prepare(
            "SELECT s.id, s.directory, s.title, s.time_created, s.time_updated,
                    COUNT(m.id) as message_count
             FROM session s
             LEFT JOIN message m ON m.session_id = s.id
             WHERE s.time_archived IS NULL
             GROUP BY s.id
             ORDER BY s.time_updated DESC",
        )?;

        let sessions = stmt
            .query_map([], |row| {
                let id: String = row.get(0)?;
                let directory: Option<String> = row.get(1)?;
                let title: Option<String> = row.get(2)?;
                let time_created: i64 = row.get(3)?;
                let time_updated: i64 = row.get(4)?;
                let message_count: i64 = row.get(5)?;

                Ok(OpenCodeSession {
                    id: id.clone(),
                    app_type: "opencode".to_string(),
                    file_name: title.clone().unwrap_or_else(|| id.clone()),
                    file_path: self.db_path.to_string_lossy().to_string(),
                    directory,
                    created_at: time_created,
                    updated_at: time_updated,
                    message_count,
                    first_message: title.unwrap_or_default(),
                    last_message: String::new(),
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(sessions)
    }

    pub fn get_session_detail(
        &self,
        session_id: &str,
    ) -> Result<Option<OpenCodeSessionDetail>, anyhow::Error> {
        let conn = Connection::open(&self.db_path)?;

        // Get session info
        let session_row: Option<(String, Option<String>, Option<String>, i64, i64)> = conn
            .query_row(
                "SELECT id, directory, title, time_created, time_updated
                 FROM session
                 WHERE id = ?",
                [session_id],
                |row| {
                    Ok((
                        row.get::<_, String>(0)?,
                        row.get::<_, Option<String>>(1)?,
                        row.get::<_, Option<String>>(2)?,
                        row.get::<_, i64>(3)?,
                        row.get::<_, i64>(4)?,
                    ))
                },
            )
            .ok();

        let (id, directory, title, time_created, time_updated) = match session_row {
            Some(row) => row,
            None => return Ok(None),
        };

        // Get messages
        let mut message_stmt = conn.prepare(
            "SELECT id, time_created, data
             FROM message
             WHERE session_id = ?
             ORDER BY time_created ASC",
        )?;

        let message_rows = message_stmt
            .query_map([session_id], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, i64>(1)?,
                    row.get::<_, String>(2)?,
                ))
            })?
            .collect::<Result<Vec<_>, _>>()?;

        // Get parts
        let mut parts_stmt = conn.prepare(
            "SELECT message_id, data
             FROM part
             WHERE session_id = ?
             ORDER BY time_created ASC",
        )?;

        let part_rows = parts_stmt
            .query_map([session_id], |row| {
                Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
            })?
            .collect::<Result<Vec<_>, _>>()?;

        // Group parts by message_id
        let mut parts_by_message: HashMap<String, Vec<serde_json::Value>> = HashMap::new();
        for (message_id, part_data) in part_rows {
            if let Ok(part) = serde_json::from_str(&part_data) {
                parts_by_message
                    .entry(message_id)
                    .or_insert_with(Vec::new)
                    .push(part);
            }
        }

        // Parse messages
        let mut current_model: Option<String> = None;
        let messages: Vec<OpenCodeMessage> = message_rows
            .into_iter()
            .filter_map(|(msg_id, timestamp, data)| {
                parse_message(msg_id, data, &parts_by_message, timestamp, &mut current_model)
            })
            .collect();

        let session = OpenCodeSession {
            id: id.clone(),
            app_type: "opencode".to_string(),
            file_name: title.clone().unwrap_or_else(|| id.clone()),
            file_path: self.db_path.to_string_lossy().to_string(),
            directory,
            created_at: time_created,
            updated_at: time_updated,
            message_count: messages.len() as i64,
            first_message: title.unwrap_or_default(),
            last_message: messages.last().map(|m| m.content.clone()).unwrap_or_default(),
        };

        Ok(Some(OpenCodeSessionDetail { session, messages }))
    }

    pub fn get_stats(&self) -> Result<serde_json::Value, anyhow::Error> {
        let conn = Connection::open(&self.db_path)?;

        let session_count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM session WHERE time_archived IS NULL",
            [],
            |row| row.get(0),
        )?;

        let message_count: i64 =
            conn.query_row("SELECT COUNT(*) FROM message", [], |row| row.get(0))?;

        let date_range: Option<(i64, i64)> = conn
            .query_row(
                "SELECT MIN(time_created), MAX(time_updated) FROM session WHERE time_archived IS NULL",
                [],
                |row| {
                    let first: Option<i64> = row.get(0).ok();
                    let last: Option<i64> = row.get(1).ok();
                    Ok(first.zip(last))
                },
            )
            .ok()
            .flatten();

        let mut result = serde_json::json!({
            "totalSessions": session_count,
            "totalMessages": message_count,
        });

        if let Some((first, last)) = date_range {
            result["firstSessionDate"] = serde_json::json!(first);
            result["lastSessionDate"] = serde_json::json!(last);
        }

        Ok(result)
    }
}

fn parse_message(
    _message_id: String,
    data: String,
    parts_by_message: &HashMap<String, Vec<serde_json::Value>>,
    timestamp: i64,
    current_model: &mut Option<String>,
) -> Option<OpenCodeMessage> {
    let data: serde_json::Value = serde_json::from_str(&data).ok()?;
    let parts = parts_by_message.get(&_message_id).cloned().unwrap_or_default();

    // Update model if present
    if let Some(model) = data.get("model") {
        *current_model = extract_model_string(model);
    }

    let role = data
        .get("role")
        .and_then(|r| r.as_str())
        .unwrap_or("assistant");
    let timestamp_str = chrono::DateTime::from_timestamp_millis(timestamp)
        .map(|dt| dt.to_rfc3339())
        .unwrap_or_default();

    // Extract content from parts
    let mut contents = Vec::new();
    let mut reasoning_contents = Vec::new();
    let mut tool_calls = Vec::new();

    for part in parts {
        let part_type = part
            .get("type")
            .and_then(|t| t.as_str())
            .unwrap_or("");

        match part_type {
            "text" => {
                if let Some(text) = part.get("text").and_then(|t| t.as_str()) {
                    contents.push(text.to_string());
                }
            }
            "reasoning" => {
                if let Some(text) = part.get("text").and_then(|t| t.as_str()) {
                    reasoning_contents.push(text.to_string());
                }
            }
            "tool" => {
                tool_calls.push(part.clone());
                if let Some(tool) = part.get("tool").and_then(|t| t.as_str()) {
                    contents.push(format!("🔧 Tool: {}", tool));
                }
                if let Some(state) = part.get("state") {
                    if let Some(input) = state.get("input") {
                        contents.push(format!(
                            "Input: {}",
                            serde_json::to_string_pretty(input).unwrap_or_default()
                        ));
                    }
                    if let Some(output) = state.get("output") {
                        contents.push(format!(
                            "Output: {}",
                            serde_json::to_string_pretty(output).unwrap_or_default()
                        ));
                    }
                }
            }
            _ => {}
        }
    }

    let content = contents.join("\n\n");
    let reasoning_content = if reasoning_contents.is_empty() {
        None
    } else {
        Some(reasoning_contents.join("\n\n"))
    };

    // Handle tool calls
    if role == "assistant" && !tool_calls.is_empty() {
        let tool_call = &tool_calls[0];
        let state = tool_call
            .get("state")
            .cloned()
            .unwrap_or(serde_json::Value::Null);

        return Some(OpenCodeMessage {
            message_type: "tool_use".to_string(),
            timestamp: timestamp_str,
            content,
            reasoning_content,
            tool_name: tool_call.get("tool").and_then(|t| t.as_str()).map(String::from),
            tool_input: state.get("input").cloned(),
            tool_output: state.get("output").map(|o| serde_json::json!({ "output": o })),
            model: current_model.clone(),
        });
    }

    Some(OpenCodeMessage {
        message_type: if role == "user" {
            "user".to_string()
        } else {
            "assistant".to_string()
        },
        timestamp: timestamp_str,
        content,
        reasoning_content,
        tool_name: None,
        tool_input: None,
        tool_output: None,
        model: current_model.clone(),
    })
}

fn extract_model_string(model: &serde_json::Value) -> Option<String> {
    match model {
        serde_json::Value::String(s) => Some(s.clone()),
        serde_json::Value::Object(obj) => {
            if let Some(model_id) = obj.get("modelID") {
                model_id.as_str().map(String::from)
            } else if let Some(m) = obj.get("model") {
                m.as_str().map(String::from)
            } else {
                None
            }
        }
        _ => None,
    }
}