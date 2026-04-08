/**
 * Prompt Service
 * 
 * CRUD operations for system prompts
 * Handles database operations and active prompt management per app
 */

import type { Database } from 'better-sqlite3';
import type {
  Prompt,
  CreatePromptInput,
  AppType,
} from '../../../src/types';
import { CCError, errors } from '../../utils/errors';
import log from 'electron-log';

export class PromptService {
  constructor(private db: Database | null) {}

  /**
   * Ensure database is initialized
   */
  private ensureDb(): Database {
    if (!this.db) {
      throw new CCError('DATABASE_ERROR', 'Database not initialized');
    }
    return this.db;
  }

  /**
   * Get all prompts for an app type, ordered by created_at DESC
   */
  getAll(appType: AppType): Prompt[] {
    const db = this.ensureDb();
    
    const stmt = db.prepare(`
      SELECT 
        id, app_type, name, content, description, 
        is_active, created_at, updated_at
      FROM prompts
      WHERE app_type = ?
      ORDER BY created_at DESC
    `);

    const rows = stmt.all(appType) as Array<Record<string, unknown>>;
    return rows.map(row => this.mapRowToPrompt(row));
  }

  /**
   * Get a single prompt by ID and app type
   */
  getById(id: string, appType: AppType): Prompt | null {
    const db = this.ensureDb();
    
    const stmt = db.prepare(`
      SELECT 
        id, app_type, name, content, description, 
        is_active, created_at, updated_at
      FROM prompts
      WHERE id = ? AND app_type = ?
    `);

    const row = stmt.get(id, appType) as Record<string, unknown> | undefined;
    return row ? this.mapRowToPrompt(row) : null;
  }

  /**
   * Create a new prompt
   * is_active defaults to 0 (false)
   */
  create(input: CreatePromptInput): Prompt {
    const db = this.ensureDb();
    
    // Validate input
    if (!input.name?.trim()) {
      throw errors.invalidInput('name', 'Name is required');
    }

    if (!input.content?.trim()) {
      throw errors.invalidInput('content', 'Content is required');
    }

    const id = crypto.randomUUID();
    const now = Date.now();

    const stmt = db.prepare(`
      INSERT INTO prompts (
        id, app_type, name, content, description, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    try {
      stmt.run(
        id,
        input.appType,
        input.name,
        input.content,
        input.description || null,
        0, // is_active defaults to 0
        now,
        now
      );

      log.info(`Prompt created: ${id} (${input.name}) for ${input.appType}`);

      const prompt = this.getById(id, input.appType);
      if (!prompt) {
        throw errors.databaseError('insert', 'Prompt not found after creation');
      }
      return prompt;
    } catch (error) {
      log.error('Failed to create prompt:', error);
      throw errors.databaseError('insert', error);
    }
  }

  /**
   * Update an existing prompt
   */
  update(id: string, appType: AppType, input: Partial<CreatePromptInput>): Prompt {
    const db = this.ensureDb();
    
    const existing = this.getById(id, appType);
    if (!existing) {
      throw errors.notFound('Prompt', id);
    }

    const updates: string[] = [];
    const values: unknown[] = [];

    if (input.name !== undefined) {
      updates.push('name = ?');
      values.push(input.name);
    }
    if (input.content !== undefined) {
      updates.push('content = ?');
      values.push(input.content);
    }
    if (input.description !== undefined) {
      updates.push('description = ?');
      values.push(input.description);
    }

    if (updates.length === 0) {
      return existing;
    }

    // Add updated_at
    updates.push('updated_at = ?');
    values.push(Date.now());

    const stmt = db.prepare(`
      UPDATE prompts
      SET ${updates.join(', ')}
      WHERE id = ? AND app_type = ?
    `);

    try {
      stmt.run(...values, id, appType);
      log.info(`Prompt updated: ${id}`);

      const updated = this.getById(id, appType);
      if (!updated) {
        throw errors.databaseError('update', 'Prompt not found after update');
      }
      return updated;
    } catch (error) {
      log.error('Failed to update prompt:', error);
      throw errors.databaseError('update', error);
    }
  }

  /**
   * Delete a prompt
   */
  delete(id: string, appType: AppType): void {
    const db = this.ensureDb();
    
    const existing = this.getById(id, appType);
    if (!existing) {
      throw errors.notFound('Prompt', id);
    }

    const stmt = db.prepare('DELETE FROM prompts WHERE id = ? AND app_type = ?');
    
    try {
      stmt.run(id, appType);
      log.info(`Prompt deleted: ${id}`);
    } catch (error) {
      log.error('Failed to delete prompt:', error);
      throw errors.databaseError('delete', error);
    }
  }

  /**
   * Set a prompt as active for an app type
   * Uses transaction to deactivate all other prompts for the same app first
   */
  setActive(id: string, appType: AppType): void {
    const db = this.ensureDb();
    
    const existing = this.getById(id, appType);
    if (!existing) {
      throw errors.notFound('Prompt', id);
    }

    const deactivateStmt = db.prepare(`
      UPDATE prompts SET is_active = 0, updated_at = ? WHERE app_type = ?
    `);
    
    const activateStmt = db.prepare(`
      UPDATE prompts SET is_active = 1, updated_at = ? WHERE id = ? AND app_type = ?
    `);

    const transaction = db.transaction(() => {
      const now = Date.now();
      deactivateStmt.run(now, appType);
      activateStmt.run(now, id, appType);
    });

    try {
      transaction();
      log.info(`Prompt ${id} set as active for ${appType}`);
    } catch (error) {
      log.error('Failed to set active prompt:', error);
      throw errors.databaseError('update', error);
    }
  }

  /**
   * Get the active prompt for an app type
   */
  getActive(appType: AppType): Prompt | null {
    const db = this.ensureDb();
    
    const stmt = db.prepare(`
      SELECT 
        id, app_type, name, content, description, 
        is_active, created_at, updated_at
      FROM prompts
      WHERE app_type = ? AND is_active = 1
      LIMIT 1
    `);

    const row = stmt.get(appType) as Record<string, unknown> | undefined;
    return row ? this.mapRowToPrompt(row) : null;
  }

  /**
   * Map database row to Prompt object
   */
  private mapRowToPrompt(row: Record<string, unknown>): Prompt {
    return {
      id: row.id as string,
      appType: row.app_type as AppType,
      name: row.name as string,
      content: row.content as string,
      description: row.description as string | undefined,
      isActive: (row.is_active as number) === 1,
      createdAt: row.created_at as number,
      updatedAt: row.updated_at as number,
    };
  }
}

// Export singleton instance
// Note: The actual database will be set after dbManager initializes
let promptServiceInstance: PromptService | null = null;

export function initializePromptService(db: Database): PromptService {
  promptServiceInstance = new PromptService(db);
  return promptServiceInstance;
}

export function getPromptService(): PromptService {
  if (!promptServiceInstance) {
    throw new CCError('DATABASE_ERROR', 'Prompt service not initialized');
  }
  return promptServiceInstance;
}

export { promptServiceInstance as promptService };
