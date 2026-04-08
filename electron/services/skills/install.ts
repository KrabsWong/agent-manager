/**
 * Skill Installation Service
 *
 * Handles downloading and installing skills from GitHub
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import log from 'electron-log';
import { errors } from '../../utils/errors';
import { githubService } from './github';

export class SkillInstallService {
  private skillsBasePath: string;

  constructor() {
    // Store skills in user's home directory under .cc-switch/skills
    this.skillsBasePath = path.join(os.homedir(), '.cc-switch', 'skills');
  }

  /**
   * Install a skill from a GitHub repository
   */
  async installFromRepo(
    repoOwner: string,
    repoName: string,
    skillDirectory: string
  ): Promise<string> {
    try {
      log.info(`Installing skill: ${repoOwner}/${repoName}/${skillDirectory}`);

      // Create skills directory if it doesn't exist
      if (!fs.existsSync(this.skillsBasePath)) {
        fs.mkdirSync(this.skillsBasePath, { recursive: true });
      }

      // Create unique directory name for this skill
      const localDirName = `${repoOwner}-${repoName}-${skillDirectory}`;
      const skillPath = path.join(this.skillsBasePath, localDirName);

      // Check if already installed
      if (fs.existsSync(skillPath)) {
        throw errors.alreadyExists('Skill', `${repoOwner}/${repoName}/${skillDirectory}`);
      }

      // Create skill directory
      fs.mkdirSync(skillPath, { recursive: true });

      // Download skill files
      await this.downloadSkillFiles(repoOwner, repoName, skillDirectory, skillPath);

      log.info(`Skill installed successfully: ${skillPath}`);
      return skillPath;
    } catch (error) {
      log.error('Failed to install skill:', error);
      throw errors.fileSystemError('install', skillDirectory, error);
    }
  }

  /**
   * Download all files for a skill
   */
  private async downloadSkillFiles(
    owner: string,
    repo: string,
    directory: string,
    localPath: string
  ): Promise<void> {
    // Files to download (common skill files)
    const filesToDownload = [
      'README.md',
      'skill.json',
      'package.json',
      'index.js',
      'index.ts',
      'main.py',
    ];

    let downloadedCount = 0;

    for (const file of filesToDownload) {
      try {
        const content = await githubService.getRawFile(owner, repo, `${directory}/${file}`);
        const filePath = path.join(localPath, file);
        fs.writeFileSync(filePath, content, 'utf-8');
        downloadedCount++;
        log.debug(`Downloaded: ${file}`);
      } catch (error) {
        // Check if it's a rate limit error
        if (error instanceof Error && error.message.includes('rate limit')) {
          throw error; // Re-throw rate limit errors
        }
        // File might not exist, that's ok
        log.debug(`File not found: ${directory}/${file}`);
      }
    }

    // Verify at least one file was downloaded
    if (downloadedCount === 0) {
      throw new Error(
        `Failed to download any files for ${owner}/${repo}/${directory}. ` +
          'This may be due to GitHub API rate limits. Please try again later or add a GitHub token in Settings.'
      );
    }
  }

  /**
   * Install a skill from a local folder
   */
  installFromLocal(localPath: string, skillName: string): string {
    try {
      log.info(`Installing local skill from: ${localPath}`);

      // Verify source folder exists
      if (!fs.existsSync(localPath)) {
        throw errors.notFound('Local skill folder', localPath);
      }

      // Create skills directory if it doesn't exist
      if (!fs.existsSync(this.skillsBasePath)) {
        fs.mkdirSync(this.skillsBasePath, { recursive: true });
      }

      // Create unique directory name for this skill
      const safeName = skillName.replace(/[^a-zA-Z0-9-_]/g, '_');
      const localDirName = `local-${safeName}-${Date.now()}`;
      const skillPath = path.join(this.skillsBasePath, localDirName);

      // Check if already installed (check by path similarity)
      const existingSkills = fs.readdirSync(this.skillsBasePath);
      for (const existingDir of existingSkills) {
        const existingPath = path.join(this.skillsBasePath, existingDir);
        if (fs.realpathSync(existingPath) === fs.realpathSync(localPath)) {
          throw errors.alreadyExists('Skill', `Skill from ${localPath} is already installed`);
        }
      }

      // Copy skill files from local folder
      this.copySkillFiles(localPath, skillPath);

      log.info(`Local skill installed successfully: ${skillPath}`);
      return skillPath;
    } catch (error) {
      log.error('Failed to install local skill:', error);
      throw errors.fileSystemError('installLocal', localPath, error);
    }
  }

  /**
   * Copy all files from source to destination
   */
  private copySkillFiles(sourcePath: string, destPath: string): void {
    // Create destination directory
    fs.mkdirSync(destPath, { recursive: true });

    // Copy all files from source
    const entries = fs.readdirSync(sourcePath, { withFileTypes: true });

    for (const entry of entries) {
      const sourceEntryPath = path.join(sourcePath, entry.name);
      const destEntryPath = path.join(destPath, entry.name);

      if (entry.isDirectory()) {
        // Recursively copy subdirectories
        this.copySkillFiles(sourceEntryPath, destEntryPath);
      } else {
        // Copy file
        fs.copyFileSync(sourceEntryPath, destEntryPath);
        log.debug(`Copied file: ${entry.name}`);
      }
    }
  }

  /**
   * Uninstall a skill (remove directory)
   */
  uninstall(skillPath: string): void {
    try {
      if (!fs.existsSync(skillPath)) {
        throw errors.notFound('Skill directory', skillPath);
      }

      // Safety check: make sure it's under the skills base path
      if (!skillPath.startsWith(this.skillsBasePath)) {
        throw errors.validationFailed('Invalid skill path');
      }

      fs.rmSync(skillPath, { recursive: true, force: true });
      log.info(`Skill uninstalled: ${skillPath}`);
    } catch (error) {
      log.error('Failed to uninstall skill:', error);
      throw errors.fileSystemError('uninstall', skillPath, error);
    }
  }

  /**
   * Get the skills base path
   */
  getSkillsBasePath(): string {
    return this.skillsBasePath;
  }

  /**
   * Check if a skill exists at the given path
   */
  skillExists(skillPath: string): boolean {
    return fs.existsSync(skillPath);
  }

  /**
   * Read skill metadata from skill.json or package.json
   */
  readSkillMetadata(skillPath: string): Record<string, unknown> | null {
    try {
      // Try skill.json first
      const skillJsonPath = path.join(skillPath, 'skill.json');
      if (fs.existsSync(skillJsonPath)) {
        const content = fs.readFileSync(skillJsonPath, 'utf-8');
        return JSON.parse(content);
      }

      // Try package.json
      const packageJsonPath = path.join(skillPath, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const content = fs.readFileSync(packageJsonPath, 'utf-8');
        return JSON.parse(content);
      }

      return null;
    } catch (error) {
      log.warn('Failed to read skill metadata:', error);
      return null;
    }
  }
}

export const skillInstallService = new SkillInstallService();
