/**
 * MCP Server Service
 * 
 * CRUD operations for MCP servers
 * Handles database operations and cross-app configuration sync
 */

import type { Database } from 'better-sqlite3';
import type {
  McpServer,
  CreateMcpServerInput,
  AppType,
} from '../../../src/types';
import { errors } from '../../utils/errors';
import log from 'electron-log';

export class McpService {
  constructor(private db: Database) {}

  /**
   * Get all MCP servers with their app enablement status
   */
  getAll(): McpServer[] {
    const stmt = this.db.prepare(`
      SELECT 
        s.id, s.name, s.transport, s.command, s.args, s.env, s.url, s.description,
        s.created_at as createdAt, s.updated_at as updatedAt
      FROM mcp_servers s
      ORDER BY s.name ASC
    `);

    const rows = stmt.all() as Array<Record<string, unknown>>;
    return rows.map(row => this.mapRowToMcpServer(row));
  }

  /**
   * Get MCP server by ID
   */
  getById(id: string): McpServer | null {
    const stmt = this.db.prepare(`
      SELECT 
        s.id, s.name, s.transport, s.command, s.args, s.env, s.url, s.description,
        s.created_at as createdAt, s.updated_at as updatedAt
      FROM mcp_servers s
      WHERE s.id = ?
    `);

    const row = stmt.get(id) as Record<string, unknown> | undefined;
    return row ? this.mapRowToMcpServer(row) : null;
  }

  /**
   * Get MCP servers enabled for a specific app
   */
  getByApp(appType: AppType): McpServer[] {
    const stmt = this.db.prepare(`
      SELECT 
        s.id, s.name, s.transport, s.command, s.args, s.env, s.url, s.description,
        s.created_at as createdAt, s.updated_at as updatedAt
      FROM mcp_servers s
      INNER JOIN mcp_server_apps a ON s.id = a.server_id
      WHERE a.app_type = ? AND a.enabled = 1
      ORDER BY s.name ASC
    `);

    const rows = stmt.all(appType) as Array<Record<string, unknown>>;
    return rows.map(row => this.mapRowToMcpServer(row));
  }

  /**
   * Create a new MCP server
   */
  create(input: CreateMcpServerInput): McpServer {
    // Validate input
    if (!input.name?.trim()) {
      throw errors.invalidInput('name', 'Name is required');
    }

    if (!input.transport) {
      throw errors.invalidInput('transport', 'Transport type is required');
    }

    // Validate transport-specific fields
    if (input.transport === 'stdio' && !input.command?.trim()) {
      throw errors.invalidInput('command', 'Command is required for stdio transport');
    }

    if ((input.transport === 'http' || input.transport === 'sse') && !input.url?.trim()) {
      throw errors.invalidInput('url', 'URL is required for HTTP/SSE transport');
    }

    const id = crypto.randomUUID();
    const now = Date.now();

    const stmt = this.db.prepare(`
      INSERT INTO mcp_servers (
        id, name, transport, command, args, env, url, description, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    try {
      stmt.run(
        id,
        input.name,
        input.transport,
        input.command || null,
        JSON.stringify(input.args || []),
        JSON.stringify(input.env || {}),
        input.url || null,
        input.description || null,
        now,
        now
      );

      // Initialize app enablements (all disabled by default)
      const apps: AppType[] = ['claude', 'codex', 'gemini', 'opencode', 'openclaw'];
      const appStmt = this.db.prepare(`
        INSERT INTO mcp_server_apps (server_id, app_type, enabled) VALUES (?, ?, 0)
      `);
      for (const app of apps) {
        appStmt.run(id, app);
      }

      log.info(`MCP server created: ${id} (${input.name})`);

      const server = this.getById(id);
      if (!server) {
        throw errors.databaseError('insert', 'Server not found after creation');
      }
      return server;
    } catch (error) {
      log.error('Failed to create MCP server:', error);
      throw errors.databaseError('insert', error);
    }
  }

  /**
   * Update an MCP server
   */
  update(id: string, input: Partial<CreateMcpServerInput>): McpServer {
    const existing = this.getById(id);
    if (!existing) {
      throw errors.notFound('MCP Server', id);
    }

    const updates: string[] = [];
    const values: unknown[] = [];

    if (input.name !== undefined) {
      updates.push('name = ?');
      values.push(input.name);
    }
    if (input.transport !== undefined) {
      updates.push('transport = ?');
      values.push(input.transport);
    }
    if (input.command !== undefined) {
      updates.push('command = ?');
      values.push(input.command);
    }
    if (input.args !== undefined) {
      updates.push('args = ?');
      values.push(JSON.stringify(input.args));
    }
    if (input.env !== undefined) {
      updates.push('env = ?');
      values.push(JSON.stringify(input.env));
    }
    if (input.url !== undefined) {
      updates.push('url = ?');
      values.push(input.url);
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

    const stmt = this.db.prepare(`
      UPDATE mcp_servers
      SET ${updates.join(', ')}
      WHERE id = ?
    `);

    try {
      stmt.run(...values, id);
      log.info(`MCP server updated: ${id}`);

      const updated = this.getById(id);
      if (!updated) {
        throw errors.databaseError('update', 'Server not found after update');
      }
      return updated;
    } catch (error) {
      log.error('Failed to update MCP server:', error);
      throw errors.databaseError('update', error);
    }
  }

  /**
   * Delete an MCP server
   */
  delete(id: string): void {
    const existing = this.getById(id);
    if (!existing) {
      throw errors.notFound('MCP Server', id);
    }

    const stmt = this.db.prepare('DELETE FROM mcp_servers WHERE id = ?');
    
    try {
      stmt.run(id);
      log.info(`MCP server deleted: ${id}`);
    } catch (error) {
      log.error('Failed to delete MCP server:', error);
      throw errors.databaseError('delete', error);
    }
  }

  /**
   * Toggle MCP server enablement for an app
   */
  toggleApp(serverId: string, appType: AppType, enabled: boolean): void {
    const server = this.getById(serverId);
    if (!server) {
      throw errors.notFound('MCP Server', serverId);
    }

    const stmt = this.db.prepare(`
      INSERT INTO mcp_server_apps (server_id, app_type, enabled)
      VALUES (?, ?, ?)
      ON CONFLICT(server_id, app_type) DO UPDATE SET enabled = excluded.enabled
    `);

    try {
      stmt.run(serverId, appType, enabled ? 1 : 0);
      log.info(`MCP server ${serverId} ${enabled ? 'enabled' : 'disabled'} for ${appType}`);
    } catch (error) {
      log.error('Failed to toggle MCP server app:', error);
      throw errors.databaseError('update', error);
    }
  }

  /**
   * Get enablement status for all apps
   */
  getEnabledApps(serverId: string): Record<AppType, boolean> {
    const stmt = this.db.prepare(`
      SELECT app_type, enabled FROM mcp_server_apps WHERE server_id = ?
    `);

    const rows = stmt.all(serverId) as Array<{ app_type: string; enabled: number }>;
    
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
   * Map database row to McpServer object
   */
  private mapRowToMcpServer(row: Record<string, unknown>): McpServer {
    const id = row.id as string;
    const enabledApps = this.getEnabledApps(id);

    return {
      id,
      name: row.name as string,
      transport: row.transport as McpServer['transport'],
      command: row.command as string | undefined,
      args: JSON.parse((row.args as string) || '[]'),
      env: JSON.parse((row.env as string) || '{}'),
      url: row.url as string | undefined,
      description: row.description as string | undefined,
      enabledApps,
    };
  }
}
