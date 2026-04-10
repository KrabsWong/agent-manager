/**
 * MCP Config Adapter
 *
 * Handles syncing MCP server configurations to app-specific config files
 * Each app has its own MCP configuration format
 */

import type { AppType, McpServer } from '../../../src/types';
import { shell } from 'electron';
import fs from 'fs';
import path from 'path';
import os from 'os';
import log from 'electron-log';
import { errors } from '../../utils/errors';

export interface ConfigLocation {
  path: string;
  filename: string;
}

export class McpConfigAdapter {
  /**
   * Get the config file location for an app
   */
  getConfigLocation(appType: AppType): ConfigLocation {
    const home = os.homedir();

    switch (appType) {
      case 'claude':
        // Claude Code uses ~/.claude.json for MCP server configuration
        return {
          path: home,
          filename: '.claude.json',
        };

      case 'codex':
        return {
          path: path.join(home, '.codex'),
          filename: 'mcp.json',
        };

      case 'gemini':
        return {
          path: path.join(home, '.gemini'),
          filename: 'mcp.json',
        };

      case 'opencode':
        return {
          path: path.join(home, '.opencode'),
          filename: 'mcp.json',
        };

      case 'openclaw':
        return {
          path: path.join(home, '.openclaw'),
          filename: 'mcp.json',
        };

      case 'codebuddy':
        return {
          path: path.join(home, '.codebuddy'),
          filename: 'mcp.json',
        };

      default:
        throw errors.invalidInput('appType', `Unknown app type: ${appType}`);
    }
  }

  /**
   * Read existing config file
   */
  private readConfig(location: ConfigLocation): Record<string, unknown> {
    const fullPath = path.join(location.path, location.filename);

    try {
      if (!fs.existsSync(fullPath)) {
        return {};
      }
      const content = fs.readFileSync(fullPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      log.warn(`Failed to read config from ${fullPath}:`, error);
      return {};
    }
  }

  /**
   * Write config file
   */
  private writeConfig(location: ConfigLocation, config: Record<string, unknown>): void {
    const fullPath = path.join(location.path, location.filename);

    try {
      // Ensure directory exists
      if (!fs.existsSync(location.path)) {
        fs.mkdirSync(location.path, { recursive: true });
      }

      fs.writeFileSync(fullPath, JSON.stringify(config, null, 2), 'utf-8');
      log.info(`Config written to ${fullPath}`);
    } catch (error) {
      log.error(`Failed to write config to ${fullPath}:`, error);
      throw errors.fileSystemError('write', fullPath, error);
    }
  }

  /**
   * Convert MCP server to app-specific format
   */
  private convertServer(server: McpServer, appType: AppType): unknown {
    switch (appType) {
      case 'claude':
        return this.convertForClaude(server);

      case 'codex':
        return this.convertForCodex(server);

      case 'gemini':
        return this.convertForGemini(server);

      case 'opencode':
        return this.convertForOpenCode(server);

      case 'openclaw':
        return this.convertForOpenClaw(server);

      case 'codebuddy':
        return this.convertForCodebuddy(server);

      default:
        throw errors.invalidInput('appType', `Unknown app type: ${appType}`);
    }
  }

  /**
   * Convert for Claude Code
   */
  private convertForClaude(server: McpServer): Record<string, unknown> {
    if (server.transport === 'stdio') {
      return {
        command: server.command,
        args: server.args || [],
        env: server.env || {},
      };
    }

    // HTTP/SSE servers not directly supported in Claude Code
    return {
      command: 'echo',
      args: ['HTTP/SSE servers not supported'],
    };
  }

  /**
   * Convert for Codex CLI
   */
  private convertForCodex(server: McpServer): Record<string, unknown> {
    if (server.transport === 'stdio') {
      return {
        command: server.command,
        args: server.args || [],
        env: server.env || {},
      };
    }

    return {
      url: server.url,
      type: server.transport,
    };
  }

  /**
   * Convert for Gemini CLI
   */
  private convertForGemini(server: McpServer): Record<string, unknown> {
    if (server.transport === 'stdio') {
      return {
        command: server.command,
        args: server.args || [],
        env: server.env || {},
      };
    }

    return {
      url: server.url,
      type: server.transport,
    };
  }

  /**
   * Convert for OpenCode
   */
  private convertForOpenCode(server: McpServer): Record<string, unknown> {
    if (server.transport === 'stdio') {
      return {
        command: server.command,
        args: server.args || [],
        env: server.env || {},
      };
    }

    return {
      url: server.url,
      type: server.transport,
    };
  }

  /**
   * Convert for OpenClaw
   */
  private convertForOpenClaw(server: McpServer): Record<string, unknown> {
    if (server.transport === 'stdio') {
      return {
        command: server.command,
        args: server.args || [],
        env: server.env || {},
      };
    }

    return {
      url: server.url,
      type: server.transport,
    };
  }

  /**
   * Convert for Codebuddy
   */
  private convertForCodebuddy(server: McpServer): Record<string, unknown> {
    if (server.transport === 'stdio') {
      return {
        command: server.command,
        args: server.args || [],
        env: server.env || {},
      };
    }

    return {
      url: server.url,
      type: server.transport,
    };
  }

  /**
   * Sync MCP servers to an app's config file
   */
  syncToApp(appType: AppType, servers: McpServer[]): void {
    const location = this.getConfigLocation(appType);
    const existingConfig = this.readConfig(location);

    // Convert enabled servers to app format
    const mcpServers: Record<string, unknown> = {};
    for (const server of servers) {
      if (server.enabledApps[appType]) {
        mcpServers[server.name] = this.convertServer(server, appType);
      }
    }

    // Build new config - only include mcpServers if there are enabled servers
    // or if there were existing mcpServers (to allow clearing)
    const newConfig: Record<string, unknown> = { ...existingConfig };

    // Always update mcpServers to reflect current state (including empty)
    newConfig.mcpServers = mcpServers;

    this.writeConfig(location, newConfig);
    log.info(`Synced ${Object.keys(mcpServers).length} MCP servers to ${appType}`);
  }

  /**
   * Sync MCP servers to all apps that have them enabled
   */
  syncToAllApps(servers: McpServer[]): void {
    const apps: AppType[] = ['claude', 'codex', 'codebuddy', 'gemini', 'opencode', 'openclaw'];

    for (const app of apps) {
      const appServers = servers.filter((s) => s.enabledApps[app]);
      if (appServers.length > 0) {
        try {
          this.syncToApp(app, servers);
        } catch (error) {
          log.error(`Failed to sync MCP servers to ${app}:`, error);
        }
      }
    }
  }

  /**
   * Open config folder in file manager
   */
  openConfigFolder(appType: AppType): void {
    const location = this.getConfigLocation(appType);

    try {
      shell.openPath(location.path);
    } catch (error) {
      log.error(`Failed to open config folder for ${appType}:`, error);
      throw errors.fileSystemError('open', location.path, error);
    }
  }
}

export const mcpConfigAdapter = new McpConfigAdapter();
