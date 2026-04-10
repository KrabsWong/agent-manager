/**
 * Proxy Config Adapter
 *
 * Handles proxy configuration for all supported AI applications
 * Each app has its own proxy configuration key
 */

import type { AppType, ErrorCode } from '@/types';
import { CCError } from '../../utils/errors';
import fs from 'fs';
import path from 'path';
import os from 'os';
import log from 'electron-log';

/**
 * Config paths for each app type (macOS)
 * All apps use settings.json
 */
const CONFIG_PATHS: Record<AppType, string> = {
  claude: path.join(os.homedir(), 'Library/Application Support/Claude/settings.json'),
  codex: path.join(os.homedir(), '.codex/settings.json'),
  codebuddy: path.join(os.homedir(), '.codebuddy/settings.json'),
  gemini: path.join(os.homedir(), '.gemini/settings.json'),
  opencode: path.join(os.homedir(), '.opencode/settings.json'),
  openclaw: path.join(os.homedir(), '.openclaw/settings.json'),
};

/**
 * Config keys for proxy settings in each app
 */
const PROXY_CONFIG_KEYS: Record<AppType, string> = {
  claude: 'apiUrl',
  codex: 'apiBaseUrl',
  codebuddy: 'proxyUrl',
  gemini: 'proxyUrl',
  opencode: 'proxyUrl',
  openclaw: 'proxyUrl',
};

export class ProxyConfigAdapter {
  /**
   * Read and parse JSON config file for an app
   * Returns empty object if file doesn't exist or is invalid
   */
  readConfig(appType: AppType): Record<string, unknown> {
    const configPath = CONFIG_PATHS[appType];

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
   * Write config to file for an app
   * Creates directory if it doesn't exist
   */
  writeConfig(appType: AppType, config: Record<string, unknown>): void {
    const configPath = CONFIG_PATHS[appType];
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
      throw new CCError(
        'FILE_SYSTEM_ERROR' as ErrorCode,
        `Failed to write config to ${configPath}`,
        error
      );
    }
  }

  /**
   * Enable proxy for a specific app
   * Adds proxy URL to the app's config using the appropriate key
   */
  enableForApp(appType: AppType, proxyUrl: string): void {
    try {
      const config = this.readConfig(appType);
      const key = PROXY_CONFIG_KEYS[appType];

      const updatedConfig = {
        ...config,
        [key]: proxyUrl,
      };

      this.writeConfig(appType, updatedConfig);
      log.info(`Enabled proxy for ${appType} with URL: ${proxyUrl}`);
    } catch (error) {
      log.error(`Failed to enable proxy for ${appType}:`, error);
      throw error;
    }
  }

  /**
   * Disable proxy for a specific app
   * Removes proxy URL from the app's config
   */
  disableForApp(appType: AppType): void {
    try {
      const config = this.readConfig(appType);
      const key = PROXY_CONFIG_KEYS[appType];

      // Create new config without the proxy key
      const { [key]: _, ...restConfig } = config;

      this.writeConfig(appType, restConfig);
      log.info(`Disabled proxy for ${appType}`);
    } catch (error) {
      log.error(`Failed to disable proxy for ${appType}:`, error);
      throw error;
    }
  }

  /**
   * Enable proxy for all apps
   */
  enableForAll(proxyUrl: string): void {
    const apps: AppType[] = ['claude', 'codex', 'codebuddy', 'gemini', 'opencode', 'openclaw'];

    for (const app of apps) {
      try {
        this.enableForApp(app, proxyUrl);
      } catch (error) {
        log.error(`Failed to enable proxy for ${app}:`, error);
        // Continue with other apps even if one fails
      }
    }

    log.info(`Enabled proxy for all apps with URL: ${proxyUrl}`);
  }

  /**
   * Disable proxy for all apps
   */
  disableForAll(): void {
    const apps: AppType[] = ['claude', 'codex', 'codebuddy', 'gemini', 'opencode', 'openclaw'];

    for (const app of apps) {
      try {
        this.disableForApp(app);
      } catch (error) {
        log.error(`Failed to disable proxy for ${app}:`, error);
        // Continue with other apps even if one fails
      }
    }

    log.info('Disabled proxy for all apps');
  }
}

// Export singleton instance
export const proxyConfigAdapter = new ProxyConfigAdapter();
