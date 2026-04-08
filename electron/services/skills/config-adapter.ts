/**
 * Skills Config Adapter
 * 
 * Handles syncing skills configuration to app-specific config files
 */

import type { AppType, Skill } from '../../../src/types';
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

export class SkillsConfigAdapter {
  /**
   * Get the skills config location for an app
   */
  getConfigLocation(appType: AppType): ConfigLocation {
    const home = os.homedir();

    switch (appType) {
      case 'claude':
        return {
          path: path.join(home, 'Library', 'Application Support', 'Claude'),
          filename: 'settings.json',
        };
      
      case 'codex':
        return {
          path: path.join(home, '.codex'),
          filename: 'config.json',
        };
      
      case 'gemini':
        return {
          path: path.join(home, '.gemini'),
          filename: 'config.json',
        };
      
      case 'opencode':
        return {
          path: path.join(home, '.opencode'),
          filename: 'config.json',
        };
      
      case 'openclaw':
        return {
          path: path.join(home, '.openclaw'),
          filename: 'config.json',
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
   * Sync skills to an app's config file
   */
  syncToApp(appType: AppType, skills: Skill[]): void {
    const location = this.getConfigLocation(appType);
    const existingConfig = this.readConfig(location);

    // Build skills config
    const skillsConfig: Record<string, unknown> = {};
    for (const skill of skills) {
      if (skill.enabledApps[appType]) {
        skillsConfig[skill.name] = {
          path: skill.directory,
        };
      }
    }

    // Merge with existing config
    const newConfig = {
      ...existingConfig,
      skills: skillsConfig,
    };

    this.writeConfig(location, newConfig);
    log.info(`Synced ${skills.length} skills to ${appType}`);
  }

  /**
   * Sync skills to all apps that have them enabled
   */
  syncToAllApps(skills: Skill[]): void {
    const apps: AppType[] = ['claude', 'codex', 'gemini', 'opencode', 'openclaw'];
    
    for (const app of apps) {
      const appSkills = skills.filter(s => s.enabledApps[app]);
      if (appSkills.length > 0) {
        try {
          this.syncToApp(app, skills);
        } catch (error) {
          log.error(`Failed to sync skills to ${app}:`, error);
        }
      }
    }
  }

  /**
   * Open skills folder in file manager
   */
  openSkillsFolder(): void {
    const skillsPath = path.join(os.homedir(), '.cc-switch', 'skills');
    
    try {
      // Create if doesn't exist
      if (!fs.existsSync(skillsPath)) {
        fs.mkdirSync(skillsPath, { recursive: true });
      }
      
      shell.openPath(skillsPath);
    } catch (error) {
      log.error(`Failed to open skills folder:`, error);
      throw errors.fileSystemError('open', skillsPath, error);
    }
  }
}

export const skillsConfigAdapter = new SkillsConfigAdapter();
