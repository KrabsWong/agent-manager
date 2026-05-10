use rusqlite::{Connection, params};
use serde::Serialize;
use std::path::PathBuf;

#[derive(Serialize)]
pub struct OpenCodeSession {
    pub id: String,
    pub title: Option<String>,
    pub time_created: i64,
    pub time_updated: i64,
    pub time_archived: Option<i64>,
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

    pub fn get_sessions(&self) -> Result<Vec<OpenCodeSession>, anyhow::Error> {
        let conn = Connection::open(&self.db_path)?;
        
        let mut stmt = conn.prepare(
            "SELECT id, title, time_created, time_updated, time_archived
             FROM session
             WHERE time_archived IS NULL
             ORDER BY time_updated DESC"
        )?;
        
        let sessions = stmt.query_map([], |row| {
            Ok(OpenCodeSession {
                id: row.get(0)?,
                title: row.get(1)?,
                time_created: row.get(2)?,
                time_updated: row.get(3)?,
                time_archived: row.get(4)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
        
        Ok(sessions)
    }

    pub fn get_session_detail(&self, session_id: &str) -> Result<Option<serde_json::Value>, anyhow::Error> {
        // TODO: Implement session detail query with messages
        Ok(None)
    }
}