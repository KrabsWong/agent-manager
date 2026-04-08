/**
 * Database Schema Definition
 * Version: 1
 * 
 * Schema design principles:
 * - Single source of truth (SSOT)
 * - Clear separation of concerns
 * - Indexed for query performance
 * - JSON columns for flexible config storage
 */

// Schema version for migrations
export const SCHEMA_VERSION = 1;

// Core tables SQL
export const CREATE_TABLES_SQL = `
-- Schema version tracking
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
);

-- Providers table
-- Stores AI provider configurations for each app
CREATE TABLE IF NOT EXISTS providers (
  id TEXT NOT NULL,
  app_type TEXT NOT NULL,
  name TEXT NOT NULL,
  settings_config TEXT NOT NULL, -- JSON
  website_url TEXT,
  category TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
  sort_index INTEGER NOT NULL DEFAULT 0,
  is_current INTEGER NOT NULL DEFAULT 0, -- boolean as 0/1
  in_failover_queue INTEGER NOT NULL DEFAULT 0, -- boolean as 0/1
  notes TEXT,
  icon TEXT,
  icon_color TEXT,
  PRIMARY KEY (id, app_type)
);

-- MCP Servers table
-- Stores MCP server configurations
CREATE TABLE IF NOT EXISTS mcp_servers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  transport TEXT NOT NULL DEFAULT 'stdio', -- 'stdio' | 'http' | 'sse'
  command TEXT,
  args TEXT, -- JSON array
  env TEXT, -- JSON object
  url TEXT,
  description TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
);

-- MCP Server App Enablement
-- Tracks which apps have which MCP servers enabled
CREATE TABLE IF NOT EXISTS mcp_server_apps (
  server_id TEXT NOT NULL,
  app_type TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (server_id, app_type),
  FOREIGN KEY (server_id) REFERENCES mcp_servers(id) ON DELETE CASCADE
);

-- Prompts table
-- Stores system prompts for each app
CREATE TABLE IF NOT EXISTS prompts (
  id TEXT NOT NULL,
  app_type TEXT NOT NULL,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  description TEXT,
  is_active INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
  PRIMARY KEY (id, app_type)
);

-- Skills table
-- Stores installed skills
CREATE TABLE IF NOT EXISTS skills (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  repo_owner TEXT,
  repo_name TEXT,
  directory TEXT NOT NULL,
  installed_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
);

-- Skill App Enablement
-- Tracks which apps have which skills enabled
CREATE TABLE IF NOT EXISTS skill_apps (
  skill_id TEXT NOT NULL,
  app_type TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (skill_id, app_type),
  FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
);

-- Settings table
-- Key-value store for app settings
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL, -- JSON
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
);

-- Proxy usage logs
-- Tracks API usage through the proxy
CREATE TABLE IF NOT EXISTS proxy_usage_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
  app_type TEXT NOT NULL,
  provider_id TEXT,
  model TEXT,
  request_type TEXT, -- 'chat' | 'completion' | 'embedding'
  tokens_input INTEGER DEFAULT 0,
  tokens_output INTEGER DEFAULT 0,
  cost_usd REAL DEFAULT 0,
  duration_ms INTEGER,
  success INTEGER NOT NULL DEFAULT 1,
  error_message TEXT
);

-- Daily usage rollup
-- Aggregated daily statistics
CREATE TABLE IF NOT EXISTS usage_daily_rollups (
  date TEXT NOT NULL, -- YYYY-MM-DD
  app_type TEXT NOT NULL,
  provider_id TEXT,
  model TEXT,
  requests_count INTEGER NOT NULL DEFAULT 0,
  tokens_input_total INTEGER NOT NULL DEFAULT 0,
  tokens_output_total INTEGER NOT NULL DEFAULT 0,
  cost_usd_total REAL NOT NULL DEFAULT 0,
  PRIMARY KEY (date, app_type, provider_id, model)
);

-- Skill repositories
-- Configured GitHub repos for skill discovery
CREATE TABLE IF NOT EXISTS skill_repos (
  owner TEXT NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  last_scanned INTEGER,
  PRIMARY KEY (owner, name)
);

-- Failover queue
-- Tracks providers in failover queue with priority
CREATE TABLE IF NOT EXISTS failover_queue (
  app_type TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 0,
  added_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
  PRIMARY KEY (app_type, provider_id),
  FOREIGN KEY (provider_id, app_type) REFERENCES providers(id, app_type) ON DELETE CASCADE
);
`;

// Indexes for performance
export const CREATE_INDEXES_SQL = `
-- Provider indexes
CREATE INDEX IF NOT EXISTS idx_providers_app_sort ON providers(app_type, sort_index);
CREATE INDEX IF NOT EXISTS idx_providers_current ON providers(app_type, is_current) WHERE is_current = 1;

-- MCP indexes
CREATE INDEX IF NOT EXISTS idx_mcp_apps_server ON mcp_server_apps(server_id);
CREATE INDEX IF NOT EXISTS idx_mcp_apps_app ON mcp_server_apps(app_type, enabled);

-- Prompt indexes
CREATE INDEX IF NOT EXISTS idx_prompts_app ON prompts(app_type);
CREATE INDEX IF NOT EXISTS idx_prompts_active ON prompts(app_type, is_active) WHERE is_active = 1;

-- Usage indexes
CREATE INDEX IF NOT EXISTS idx_usage_timestamp ON proxy_usage_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_usage_app ON proxy_usage_logs(app_type, timestamp);
CREATE INDEX IF NOT EXISTS idx_usage_provider ON proxy_usage_logs(provider_id, timestamp);

-- Rollup indexes
CREATE INDEX IF NOT EXISTS idx_rollups_date ON usage_daily_rollups(date);
`;

// Default data
export const INSERT_DEFAULT_DATA_SQL = `
-- Insert schema version
INSERT OR IGNORE INTO schema_version (version) VALUES (${SCHEMA_VERSION});

-- Insert default settings
INSERT OR IGNORE INTO settings (key, value) VALUES 
  ('app', json_object(
    'language', 'en',
    'theme', 'system',
    'autoStart', false,
    'lightweightMode', false
  )),
  ('proxy', json_object(
    'enabled', false,
    'port', 15721,
    'host', '127.0.0.1'
  )),
  ('webdav', json_object(
    'autoSync', false,
    'syncInterval', 30
  )),
  ('backup', json_object(
    'autoBackup', true,
    'retention', 10
  ));

-- Insert default skill repos
INSERT OR IGNORE INTO skill_repos (owner, name, url) VALUES
  ('anthropics', 'skills', 'https://github.com/anthropics/skills'),
  ('ComposioHQ', 'awesome-claude-skills', 'https://github.com/ComposioHQ/awesome-claude-skills');
`;
