import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
import log from 'electron-log';
import {
  SCHEMA_VERSION,
  CREATE_TABLES_SQL,
  CREATE_INDEXES_SQL,
  INSERT_DEFAULT_DATA_SQL,
} from './schema';

/**
 * Database Manager
 *
 * Features:
 * - Singleton pattern for single database connection
 * - Automatic schema migration
 * - Connection lifecycle management
 * - Error handling with proper cleanup
 */
class DatabaseManager {
  private db: Database.Database | null = null;
  private dbPath: string;
  private initialized = false;

  constructor() {
    // Use userData directory for database storage
    this.dbPath = path.join(app.getPath('userData'), 'yes-sessions.db');
    log.info(`Database path: ${this.dbPath}`);
  }

  /**
   * Initialize the database connection and run migrations
   */
  initialize(): void {
    if (this.initialized) {
      log.warn('Database already initialized');
      return;
    }

    try {
      log.info('Initializing database...');

      // Open database with WAL mode for better concurrency
      this.db = new Database(this.dbPath);
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('foreign_keys = ON');

      // Create tables and indexes
      this.db.exec(CREATE_TABLES_SQL);
      this.db.exec(CREATE_INDEXES_SQL);

      // Run migrations
      this.runMigrations();

      // Insert default data
      this.db.exec(INSERT_DEFAULT_DATA_SQL);

      this.initialized = true;
      log.info('Database initialized successfully');
    } catch (error) {
      log.error('Failed to initialize database:', error);
      throw error;
    }
  }

  /**
   * Get the database instance
   * Throws if not initialized
   */
  getDatabase(): Database.Database {
    if (!this.db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.db;
  }

  /**
   * Check if database is initialized
   */
  isInitialized(): boolean {
    return this.initialized && this.db !== null;
  }

  /**
   * Run database migrations
   */
  private runMigrations(): void {
    if (!this.db) return;

    const currentVersion = this.getCurrentSchemaVersion();
    log.info(`Current schema version: ${currentVersion}`);

    if (currentVersion < SCHEMA_VERSION) {
      log.info(`Migrating from version ${currentVersion} to ${SCHEMA_VERSION}`);

      // Run migrations for each version
      for (let version = currentVersion + 1; version <= SCHEMA_VERSION; version++) {
        this.migrateToVersion(version);
      }

      // Update schema version
      const stmt = this.db.prepare('INSERT OR REPLACE INTO schema_version (version) VALUES (?)');
      stmt.run(SCHEMA_VERSION);

      log.info('Migrations completed');
    }
  }

  /**
   * Get current schema version from database
   */
  private getCurrentSchemaVersion(): number {
    if (!this.db) return 0;

    try {
      const stmt = this.db.prepare(
        'SELECT version FROM schema_version ORDER BY version DESC LIMIT 1'
      );
      const result = stmt.get() as { version: number } | undefined;
      return result?.version ?? 0;
    } catch {
      // Table doesn't exist yet
      return 0;
    }
  }

  /**
   * Run migration for a specific version
   */
  private migrateToVersion(version: number): void {
    if (!this.db) return;

    log.info(`Running migration to version ${version}`);

    // Add migrations here as the schema evolves
    switch (version) {
      case 1:
        // Initial schema - already created in CREATE_TABLES_SQL
        break;
      // Add future migrations here:
      // case 2:
      //   this.db.exec('ALTER TABLE ...');
      //   break;
      default:
        log.warn(`No migration defined for version ${version}`);
    }
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      log.info('Closing database connection');
      this.db.close();
      this.db = null;
      this.initialized = false;
    }
  }

  /**
   * Backup database to a file
   */
  backup(backupPath: string): void {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    log.info(`Creating database backup to: ${backupPath}`);
    this.db.backup(backupPath);
    log.info('Backup completed');
  }

  /**
   * Get database statistics
   */
  getStats(): Record<string, number> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const stats: Record<string, number> = {};

    const tables = ['settings'];

    for (const table of tables) {
      try {
        const stmt = this.db.prepare(`SELECT COUNT(*) as count FROM ${table}`);
        const result = stmt.get() as { count: number };
        stats[table] = result.count;
      } catch {
        stats[table] = 0;
      }
    }

    return stats;
  }
}

// Export singleton instance
export const dbManager = new DatabaseManager();

// Export for testing
export { DatabaseManager };
