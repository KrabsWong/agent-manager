/**
 * Skills Config Adapter
 *
 * Handles syncing skills to app-specific directories (NOT config files)
 * Based on old Yes Sessions implementation:
 * - SSOT: ~/.yes-sessions/skills/ (single source of truth)
 * - Sync: Copy or symlink to app directories like ~/.claude/skills/
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

export type SyncMethod = 'auto' | 'symlink' | 'copy';

export class SkillsConfigAdapter {
  /**
   * Get the SSOT directory for skills
   */
  getSsotDir(): string {
    return path.join(os.homedir(), '.yes-sessions', 'skills');
  }

  /**
   * Get the skills directory for an app
   */
  getAppSkillsDir(appType: AppType): string {
    const home = os.homedir();

    switch (appType) {
      case 'claude':
        return path.join(home, '.claude', 'skills');

      case 'codex':
        return path.join(home, '.codex', 'skills');

      case 'gemini':
        return path.join(home, '.gemini', 'skills');

      case 'opencode':
        return path.join(home, '.config', 'opencode', 'skills');

      case 'openclaw':
        return path.join(home, '.openclaw', 'skills');

      case 'codebuddy':
        return path.join(home, '.codebuddy', 'skills');

      default:
        throw errors.invalidInput('appType', `Unknown app type: ${appType}`);
    }
  }

  /**
   * Get current sync method from settings
   */
  getSyncMethod(): SyncMethod {
    // TODO: Read from settings, default to 'auto'
    return 'auto';
  }

  /**
   * Check if path is a symlink
   */
  private isSymlink(filePath: string): boolean {
    try {
      return fs.lstatSync(filePath).isSymbolicLink();
    } catch {
      return false;
    }
  }

  /**
   * Remove path (handles symlinks and directories)
   */
  private removePath(filePath: string): void {
    if (this.isSymlink(filePath)) {
      // Symlink: just remove the link
      fs.unlinkSync(filePath);
    } else if (fs.statSync(filePath).isDirectory()) {
      // Directory: recursive delete
      fs.rmSync(filePath, { recursive: true, force: true });
    } else {
      // File
      fs.unlinkSync(filePath);
    }
  }

  /**
   * Create symlink (cross-platform)
   */
  private createSymlink(src: string, dest: string): void {
    fs.symlinkSync(src, dest, 'junction'); // 'junction' works on Windows for directories
  }

  /**
   * Copy directory recursively
   */
  private copyDirRecursive(src: string, dest: string): void {
    fs.mkdirSync(dest, { recursive: true });

    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        this.copyDirRecursive(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  /**
   * Sync a single skill to an app's skills directory
   *
   * Sync strategy:
   * - Auto: Try symlink first, fallback to copy
   * - Symlink: Only use symlink
   * - Copy: Only use file copy
   */
  syncSkillToApp(directory: string, appType: AppType): void {
    const ssotDir = this.getSsotDir();
    const source = path.join(ssotDir, directory);

    if (!fs.existsSync(source)) {
      throw errors.notFound('Skill', `SSOT path: ${source}`);
    }

    const appDir = this.getAppSkillsDir(appType);
    fs.mkdirSync(appDir, { recursive: true });

    const dest = path.join(appDir, directory);

    // Remove existing (symlink or directory)
    if (fs.existsSync(dest) || this.isSymlink(dest)) {
      this.removePath(dest);
    }

    const syncMethod = this.getSyncMethod();

    switch (syncMethod) {
      case 'auto':
        // Try symlink first
        try {
          this.createSymlink(source, dest);
          log.debug(`Skill ${directory} synced to ${appType} via symlink`);
        } catch (err) {
          log.warn(`Symlink failed for ${directory} to ${appType}, falling back to copy:`, err);
          this.copyDirRecursive(source, dest);
          log.debug(`Skill ${directory} synced to ${appType} via copy`);
        }
        break;

      case 'symlink':
        this.createSymlink(source, dest);
        log.debug(`Skill ${directory} synced to ${appType} via symlink`);
        break;

      case 'copy':
        this.copyDirRecursive(source, dest);
        log.debug(`Skill ${directory} synced to ${appType} via copy`);
        break;
    }
  }

  /**
   * Remove a skill from an app's skills directory
   */
  removeSkillFromApp(directory: string, appType: AppType): void {
    const appDir = this.getAppSkillsDir(appType);
    const skillPath = path.join(appDir, directory);

    if (fs.existsSync(skillPath) || this.isSymlink(skillPath)) {
      this.removePath(skillPath);
      log.debug(`Skill ${directory} removed from ${appType}`);
    }
  }

  /**
   * Sync all enabled skills to an app's skills directory
   * Also removes skills that are no longer enabled
   */
  syncToApp(appType: AppType, skills: Skill[]): void {
    const ssotDir = this.getSsotDir();
    const appDir = this.getAppSkillsDir(appType);

    // Ensure app directory exists
    fs.mkdirSync(appDir, { recursive: true });

    // Build set of directories that should be synced
    const enabledDirs = new Set(
      skills.filter((s) => s.enabledApps[appType]).map((s) => s.directory)
    );

    // Read current app directory (include both directories and symlinks)
    const currentEntries = fs.existsSync(appDir)
      ? fs
          .readdirSync(appDir, { withFileTypes: true })
          .filter((e) => e.isDirectory() || e.isSymbolicLink())
          .map((e) => e.name)
      : [];

    // Remove skills that are no longer enabled
    for (const entry of currentEntries) {
      const fullPath = path.join(appDir, entry);

      // Check if it's a Yes Sessions managed skill
      // It's managed if:
      // 1. It's a symlink pointing to SSOT, OR
      // 2. The directory exists in SSOT (was copied from there)
      let isManagedSkill = false;

      if (this.isSymlink(fullPath)) {
        // Symlink: check if it points to SSOT
        try {
          const linkTarget = fs.readlinkSync(fullPath);
          isManagedSkill = linkTarget.startsWith(ssotDir);
        } catch {
          isManagedSkill = false;
        }
      } else {
        // Regular directory: check if it exists in SSOT
        const ssotPath = path.join(ssotDir, entry);
        isManagedSkill = fs.existsSync(ssotPath);
      }

      if (isManagedSkill && !enabledDirs.has(entry)) {
        this.removePath(fullPath);
        log.info(`Removed skill ${entry} from ${appType}`);
      }
    }

    // Sync enabled skills
    for (const skill of skills) {
      if (skill.enabledApps[appType]) {
        try {
          this.syncSkillToApp(skill.directory, appType);
        } catch (error) {
          log.error(`Failed to sync skill ${skill.directory} to ${appType}:`, error);
        }
      }
    }

    log.info(`Synced skills to ${appType}: ${enabledDirs.size} enabled`);
  }

  /**
   * Sync skills to all apps
   */
  syncToAllApps(skills: Skill[]): void {
    const apps: AppType[] = ['claude', 'codex', 'codebuddy', 'gemini', 'opencode', 'openclaw'];

    for (const app of apps) {
      const appSkills = skills.filter((s) => s.enabledApps[app]);
      if (appSkills.length > 0 || this.hasAnySyncedSkills(app)) {
        try {
          this.syncToApp(app, skills);
        } catch (error) {
          log.error(`Failed to sync skills to ${app}:`, error);
        }
      }
    }
  }

  /**
   * Check if app has any synced skills
   */
  private hasAnySyncedSkills(appType: AppType): boolean {
    const appDir = this.getAppSkillsDir(appType);
    if (!fs.existsSync(appDir)) return false;

    const entries = fs.readdirSync(appDir, { withFileTypes: true });
    return entries.some((e) => e.isDirectory());
  }

  /**
   * Open skills folder in file manager
   */
  openSkillsFolder(): void {
    const skillsPath = this.getSsotDir();

    try {
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
