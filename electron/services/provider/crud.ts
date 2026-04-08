/**
 * Provider Service
 * 
 * CRUD operations for AI providers
 * Handles database operations and live config synchronization
 */

import type { Database } from 'better-sqlite3';
import type {
  Provider,
  CreateProviderInput,
  AppType,
  SwitchProviderResult,
} from '../../../src/types';
import { errors } from '../../utils/errors';
import log from 'electron-log';

export class ProviderService {
  constructor(private db: Database) {}

  /**
   * Get all providers for an app
   */
  getAll(appType: AppType): Provider[] {
    const stmt = this.db.prepare(`
      SELECT 
        id, app_type as appType, name, settings_config as settingsConfig,
        website_url as websiteUrl, category, created_at as createdAt,
        sort_index as sortIndex, is_current as isCurrent,
        in_failover_queue as inFailoverQueue, notes, icon, icon_color as iconColor
      FROM providers
      WHERE app_type = ?
      ORDER BY sort_index ASC, created_at DESC
    `);

    const rows = stmt.all(appType) as Array<Record<string, unknown>>;
    return rows.map(row => this.mapRowToProvider(row));
  }

  /**
   * Get provider by ID
   */
  getById(id: string, appType: AppType): Provider | null {
    const stmt = this.db.prepare(`
      SELECT 
        id, app_type as appType, name, settings_config as settingsConfig,
        website_url as websiteUrl, category, created_at as createdAt,
        sort_index as sortIndex, is_current as isCurrent,
        in_failover_queue as inFailoverQueue, notes, icon, icon_color as iconColor
      FROM providers
      WHERE id = ? AND app_type = ?
    `);

    const row = stmt.get(id, appType) as Record<string, unknown> | undefined;
    return row ? this.mapRowToProvider(row) : null;
  }

  /**
   * Get current provider for an app
   */
  getCurrent(appType: AppType): Provider | null {
    const stmt = this.db.prepare(`
      SELECT 
        id, app_type as appType, name, settings_config as settingsConfig,
        website_url as websiteUrl, category, created_at as createdAt,
        sort_index as sortIndex, is_current as isCurrent,
        in_failover_queue as inFailoverQueue, notes, icon, icon_color as iconColor
      FROM providers
      WHERE app_type = ? AND is_current = 1
      LIMIT 1
    `);

    const row = stmt.get(appType) as Record<string, unknown> | undefined;
    return row ? this.mapRowToProvider(row) : null;
  }

  /**
   * Create a new provider
   */
  create(input: CreateProviderInput): Provider {
    // Validate input
    if (!input.name?.trim()) {
      throw errors.invalidInput('name', 'Name is required');
    }

    const id = crypto.randomUUID();
    const createdAt = Date.now();

    const stmt = this.db.prepare(`
      INSERT INTO providers (
        id, app_type, name, settings_config, website_url, category,
        sort_index, is_current, in_failover_queue, notes, icon, icon_color
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    try {
      stmt.run(
        id,
        input.appType,
        input.name,
        JSON.stringify(input.settingsConfig || {}),
        input.websiteUrl || null,
        input.category || 'custom',
        input.sortIndex ?? 0,
        0, // is_current
        0, // in_failover_queue
        input.notes || null,
        input.icon || null,
        input.iconColor || null
      );

      log.info(`Provider created: ${id} for ${input.appType}`);

      return {
        id,
        appType: input.appType,
        name: input.name,
        settingsConfig: input.settingsConfig || {},
        websiteUrl: input.websiteUrl,
        category: input.category || 'custom',
        createdAt,
        sortIndex: input.sortIndex ?? 0,
        isCurrent: false,
        inFailoverQueue: false,
        notes: input.notes,
        icon: input.icon,
        iconColor: input.iconColor,
      };
    } catch (error) {
      log.error('Failed to create provider:', error);
      throw errors.databaseError('insert', error);
    }
  }

  /**
   * Update a provider
   */
  update(id: string, appType: AppType, input: Partial<CreateProviderInput>): Provider {
    const existing = this.getById(id, appType);
    if (!existing) {
      throw errors.notFound('Provider', id);
    }

    const updates: string[] = [];
    const values: unknown[] = [];

    if (input.name !== undefined) {
      updates.push('name = ?');
      values.push(input.name);
    }
    if (input.settingsConfig !== undefined) {
      updates.push('settings_config = ?');
      values.push(JSON.stringify(input.settingsConfig));
    }
    if (input.websiteUrl !== undefined) {
      updates.push('website_url = ?');
      values.push(input.websiteUrl);
    }
    if (input.category !== undefined) {
      updates.push('category = ?');
      values.push(input.category);
    }
    if (input.sortIndex !== undefined) {
      updates.push('sort_index = ?');
      values.push(input.sortIndex);
    }
    if (input.notes !== undefined) {
      updates.push('notes = ?');
      values.push(input.notes);
    }
    if (input.icon !== undefined) {
      updates.push('icon = ?');
      values.push(input.icon);
    }
    if (input.iconColor !== undefined) {
      updates.push('icon_color = ?');
      values.push(input.iconColor);
    }

    if (updates.length === 0) {
      return existing;
    }

    const stmt = this.db.prepare(`
      UPDATE providers
      SET ${updates.join(', ')}
      WHERE id = ? AND app_type = ?
    `);

    try {
      stmt.run(...values, id, appType);
      log.info(`Provider updated: ${id}`);

      // Return updated provider
      const updated = this.getById(id, appType);
      if (!updated) {
        throw errors.databaseError('update', 'Provider not found after update');
      }
      return updated;
    } catch (error) {
      log.error('Failed to update provider:', error);
      throw errors.databaseError('update', error);
    }
  }

  /**
   * Delete a provider
   */
  delete(id: string, appType: AppType): void {
    const existing = this.getById(id, appType);
    if (!existing) {
      throw errors.notFound('Provider', id);
    }

    const stmt = this.db.prepare('DELETE FROM providers WHERE id = ? AND app_type = ?');
    
    try {
      stmt.run(id, appType);
      log.info(`Provider deleted: ${id}`);
    } catch (error) {
      log.error('Failed to delete provider:', error);
      throw errors.databaseError('delete', error);
    }
  }

  /**
   * Switch to a different provider
   */
  switch(id: string, appType: AppType): SwitchProviderResult {
    const target = this.getById(id, appType);
    if (!target) {
      throw errors.notFound('Provider', id);
    }

    const current = this.getCurrent(appType);

    // Begin transaction
    const transaction = this.db.transaction(() => {
      // Unset current provider
      if (current) {
        const unsetStmt = this.db.prepare(`
          UPDATE providers SET is_current = 0 WHERE id = ? AND app_type = ?
        `);
        unsetStmt.run(current.id, appType);
      }

      // Set new current provider
      const setStmt = this.db.prepare(`
        UPDATE providers SET is_current = 1 WHERE id = ? AND app_type = ?
      `);
      setStmt.run(id, appType);
    });

    try {
      transaction();
      log.info(`Provider switched for ${appType}: ${current?.id || 'none'} -> ${id}`);

      return {
        success: true,
        providerId: id,
        previousProviderId: current?.id,
      };
    } catch (error) {
      log.error('Failed to switch provider:', error);
      throw errors.databaseError('transaction', error);
    }
  }

  /**
   * Reorder providers
   */
  reorder(appType: AppType, providerIds: string[]): void {
    const transaction = this.db.transaction(() => {
      const stmt = this.db.prepare(`
        UPDATE providers SET sort_index = ? WHERE id = ? AND app_type = ?
      `);

      for (let i = 0; i < providerIds.length; i++) {
        stmt.run(i, providerIds[i], appType);
      }
    });

    try {
      transaction();
      log.info(`Providers reordered for ${appType}`);
    } catch (error) {
      log.error('Failed to reorder providers:', error);
      throw errors.databaseError('transaction', error);
    }
  }

  /**
   * Map database row to Provider object
   */
  private mapRowToProvider(row: Record<string, unknown>): Provider {
    return {
      id: row.id as string,
      appType: row.appType as AppType,
      name: row.name as string,
      settingsConfig: JSON.parse((row.settingsConfig as string) || '{}'),
      websiteUrl: row.websiteUrl as string | undefined,
      category: row.category as Provider['category'],
      createdAt: row.createdAt as number,
      sortIndex: row.sortIndex as number,
      isCurrent: Boolean(row.isCurrent),
      inFailoverQueue: Boolean(row.inFailoverQueue),
      notes: row.notes as string | undefined,
      icon: row.icon as string | undefined,
      iconColor: row.iconColor as string | undefined,
    };
  }
}
