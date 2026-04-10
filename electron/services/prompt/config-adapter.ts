/**
 * Prompt Config Adapter
 *
 * Handles syncing prompt configurations to/from different AI application config files
 * Each app has its own prompt configuration format
 */

import type { AppType, Prompt } from '../../../src/types';
import { shell } from 'electron';
import fs from 'fs';
import path from 'path';
import os from 'os';
import log from 'electron-log';
import { errors } from '../../utils/errors';
import { getPromptService } from './crud';

/**
 * Config paths for each app type (macOS)
 */
const CONFIG_PATHS: Record<AppType, string> = {
  claude: path.join(os.homedir(), 'Library/Application Support/Claude'),
  codex: path.join(os.homedir(), '.codex'),
  gemini: path.join(os.homedir(), '.gemini'),
  opencode: path.join(os.homedir(), '.opencode'),
  openclaw: path.join(os.homedir(), '.openclaw'),
  codebuddy: path.join(os.homedir(), '.codebuddy'),
};

/**
 * Config file names for each app type
 */
const CONFIG_FILES: Record<AppType, string> = {
  claude: 'settings.json',
  codex: 'settings.json',
  gemini: 'config.json',
  opencode: 'settings.json',
  openclaw: 'settings.json',
  codebuddy: 'settings.json',
};

export class PromptConfigAdapter {
  /**
   * Get full config file path for an app
   */
  getConfigPath(appType: AppType): string {
    const configPath = CONFIG_PATHS[appType];
    const configFile = CONFIG_FILES[appType];
    return path.join(configPath, configFile);
  }

  /**
   * Read and parse JSON config file
   * Returns empty object if file doesn't exist or is invalid
   */
  readConfig(appType: AppType): Record<string, unknown> {
    const configPath = this.getConfigPath(appType);

    try {
      if (!fs.existsSync(configPath)) {
        return {};
      }
      const content = fs.readFileSync(configPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      log.warn(`Failed to read config from ${configPath}:`, error);
      return {};
    }
  }

  /**
   * Write config to file
   * Creates directory if it doesn't exist
   */
  writeConfig(appType: AppType, config: Record<string, unknown>): void {
    const configPath = this.getConfigPath(appType);
    const configDir = path.dirname(configPath);

    try {
      // Ensure directory exists
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }

      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
      log.info(`Config written to ${configPath}`);
    } catch (error) {
      log.error(`Failed to write config to ${configPath}:`, error);
      throw errors.fileSystemError('write', configPath, error);
    }
  }

  /**
   * Extract prompt content from app config
   * Each app has a different config structure
   */
  extractPromptContent(appType: AppType, config: Record<string, unknown>): string | null {
    switch (appType) {
      case 'claude':
        return (config.systemPrompt as string) || null;

      case 'codex':
        // Codex supports both systemPrompt and customInstructions
        return (config.systemPrompt as string) || (config.customInstructions as string) || null;

      case 'gemini':
      case 'opencode':
      case 'openclaw':
      case 'codebuddy':
        return (config.systemPrompt as string) || null;

      default:
        return null;
    }
  }

  /**
   * Inject prompt content into app config
   * Returns updated config object
   */
  injectPromptContent(
    appType: AppType,
    config: Record<string, unknown>,
    content: string
  ): Record<string, unknown> {
    switch (appType) {
      case 'claude':
        return {
          ...config,
          systemPrompt: content,
        };

      case 'codex':
        // Use systemPrompt for codex
        return {
          ...config,
          systemPrompt: content,
        };

      case 'gemini':
      case 'opencode':
      case 'openclaw':
      case 'codebuddy':
        return {
          ...config,
          systemPrompt: content,
        };

      default:
        return config;
    }
  }

  /**
   * Write active prompt to app config
   * Gets the active prompt for the app type and syncs it
   */
  syncToApp(appType: AppType): void {
    try {
      const promptService = getPromptService();
      const activePrompt = promptService.getActive(appType);

      if (!activePrompt) {
        log.info(`No active prompt for ${appType}, skipping sync`);
        return;
      }

      const config = this.readConfig(appType);
      const updatedConfig = this.injectPromptContent(appType, config, activePrompt.content);
      this.writeConfig(appType, updatedConfig);

      log.info(`Synced prompt "${activePrompt.name}" to ${appType}`);
    } catch (error) {
      log.error(`Failed to sync prompt to ${appType}:`, error);
      throw error;
    }
  }

  /**
   * Import prompt from app config
   * Creates a new prompt in the database from the app's current config
   */
  importFromApp(appType: AppType, name?: string): Prompt | null {
    try {
      const promptService = getPromptService();
      const config = this.readConfig(appType);
      const content = this.extractPromptContent(appType, config);

      if (!content) {
        log.info(`No prompt content found in ${appType} config`);
        return null;
      }

      const promptName = name || `Imported from ${appType}`;
      const prompt = promptService.create({
        appType,
        name: promptName,
        content,
        description: `Imported from ${appType} config file`,
      });

      log.info(`Imported prompt "${promptName}" from ${appType}`);
      return prompt;
    } catch (error) {
      log.error(`Failed to import prompt from ${appType}:`, error);
      throw error;
    }
  }

  /**
   * Sync active prompts to all apps
   */
  syncAll(): void {
    const apps: AppType[] = ['claude', 'codex', 'codebuddy', 'gemini', 'opencode', 'openclaw'];

    for (const app of apps) {
      try {
        this.syncToApp(app);
      } catch (error) {
        log.error(`Failed to sync prompt to ${app}:`, error);
        // Continue with other apps even if one fails
      }
    }
  }

  /**
   * Open config folder in file manager
   */
  openConfigFolder(appType: AppType): void {
    const configPath = CONFIG_PATHS[appType];

    try {
      shell.openPath(configPath);
      log.info(`Opened config folder for ${appType}: ${configPath}`);
    } catch (error) {
      log.error(`Failed to open config folder for ${appType}:`, error);
      throw errors.fileSystemError('open', configPath, error);
    }
  }
}

// Export singleton instance
export const promptConfigAdapter = new PromptConfigAdapter();
