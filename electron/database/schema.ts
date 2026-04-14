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

-- Settings table
-- Key-value store for app settings
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL, -- JSON
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
);
`;

// Indexes for performance
export const CREATE_INDEXES_SQL = `
-- No additional indexes needed for minimal schema
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
  ));
`;
