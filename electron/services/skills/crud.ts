/**
 * Skills Service
 * 
 * CRUD operations for Skills
 * Manages installed skills and their enablement across apps
 */

import type { Database } from 'better-sqlite3';
import type { Skill, AppType } from '../../../src/types';
import { errors } from '../../utils/errors';
import log from 'electron-log';

export class SkillsService {
  constructor(private db: Database) {}

  /**
   * Get all installed skills
   */
  getAll(): Skill[] {
    const stmt = this.db.prepare(`
      SELECT 
        s.id, s.name, s.description, s.repo_owner as repoOwner, 
        s.repo_name as repoName, s.directory, s.installed_at as installedAt
      FROM skills s
      ORDER BY s.name ASC
    `);

    const rows = stmt.all() as Array<Record<string, unknown>>;
    return rows.map(row => this.mapRowToSkill(row));
  }

  /**
   * Get skill by ID
   */
  getById(id: string): Skill | null {
    const stmt = this.db.prepare(`
      SELECT 
        s.id, s.name, s.description, s.repo_owner as repoOwner, 
        s.repo_name as repoName, s.directory, s.installed_at as installedAt
      FROM skills s
      WHERE s.id = ?
    `);

    const row = stmt.get(id) as Record<string, unknown> | undefined;
    return row ? this.mapRowToSkill(row) : null;
  }

  /**
   * Get skills enabled for a specific app
   */
  getByApp(appType: AppType): Skill[] {
    const stmt = this.db.prepare(`
      SELECT 
        s.id, s.name, s.description, s.repo_owner as repoOwner, 
        s.repo_name as repoName, s.directory, s.installed_at as installedAt
      FROM skills s
      INNER JOIN skill_apps a ON s.id = a.skill_id
      WHERE a.app_type = ? AND a.enabled = 1
      ORDER BY s.name ASC
    `);

    const rows = stmt.all(appType) as Array<Record<string, unknown>>;
    return rows.map(row => this.mapRowToSkill(row));
  }

  /**
   * Create a new skill record
   */
  create(skillData: Omit<Skill, 'id' | 'installedAt' | 'enabledApps'>): Skill {
    const id = crypto.randomUUID();
    const installedAt = Date.now();

    const stmt = this.db.prepare(`
      INSERT INTO skills (
        id, name, description, repo_owner, repo_name, directory, installed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    try {
      stmt.run(
        id,
        skillData.name,
        skillData.description || null,
        skillData.repoOwner || null,
        skillData.repoName || null,
        skillData.directory,
        installedAt
      );

      // Initialize app enablements (all disabled by default)
      const apps: AppType[] = ['claude', 'codex', 'gemini', 'opencode', 'openclaw'];
      const appStmt = this.db.prepare(`
        INSERT INTO skill_apps (skill_id, app_type, enabled) VALUES (?, ?, 0)
      `);
      for (const app of apps) {
        appStmt.run(id, app);
      }

      log.info(`Skill created: ${id} (${skillData.name})`);

      const skill = this.getById(id);
      if (!skill) {
        throw errors.databaseError('insert', 'Skill not found after creation');
      }
      return skill;
    } catch (error) {
      log.error('Failed to create skill:', error);
      throw errors.databaseError('insert', error);
    }
  }

  /**
   * Delete a skill
   */
  delete(id: string): void {
    const existing = this.getById(id);
    if (!existing) {
      throw errors.notFound('Skill', id);
    }

    const stmt = this.db.prepare('DELETE FROM skills WHERE id = ?');
    
    try {
      stmt.run(id);
      log.info(`Skill deleted: ${id}`);
    } catch (error) {
      log.error('Failed to delete skill:', error);
      throw errors.databaseError('delete', error);
    }
  }

  /**
   * Toggle skill enablement for an app
   */
  toggleApp(skillId: string, appType: AppType, enabled: boolean): void {
    const skill = this.getById(skillId);
    if (!skill) {
      throw errors.notFound('Skill', skillId);
    }

    const stmt = this.db.prepare(`
      INSERT INTO skill_apps (skill_id, app_type, enabled)
      VALUES (?, ?, ?)
      ON CONFLICT(skill_id, app_type) DO UPDATE SET enabled = excluded.enabled
    `);

    try {
      stmt.run(skillId, appType, enabled ? 1 : 0);
      log.info(`Skill ${skillId} ${enabled ? 'enabled' : 'disabled'} for ${appType}`);
    } catch (error) {
      log.error('Failed to toggle skill app:', error);
      throw errors.databaseError('update', error);
    }
  }

  /**
   * Get enablement status for all apps
   */
  getEnabledApps(skillId: string): Record<AppType, boolean> {
    const stmt = this.db.prepare(`
      SELECT app_type, enabled FROM skill_apps WHERE skill_id = ?
    `);

    const rows = stmt.all(skillId) as Array<{ app_type: string; enabled: number }>;
    
    const result: Record<string, boolean> = {
      claude: false,
      codex: false,
      gemini: false,
      opencode: false,
      openclaw: false,
    };

    for (const row of rows) {
      result[row.app_type] = row.enabled === 1;
    }

    return result as Record<AppType, boolean>;
  }

  /**
   * Check if skill exists by directory
   */
  existsByDirectory(directory: string): boolean {
    const stmt = this.db.prepare('SELECT 1 FROM skills WHERE directory = ? LIMIT 1');
    const row = stmt.get(directory);
    return !!row;
  }

  /**
   * Map database row to Skill object
   */
  private mapRowToSkill(row: Record<string, unknown>): Skill {
    const id = row.id as string;
    const enabledApps = this.getEnabledApps(id);

    return {
      id,
      name: row.name as string,
      description: row.description as string | undefined,
      repoOwner: row.repoOwner as string | undefined,
      repoName: row.repoName as string | undefined,
      directory: row.directory as string,
      installedAt: row.installedAt as number,
      enabledApps,
    };
  }
}
