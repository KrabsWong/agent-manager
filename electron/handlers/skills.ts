/**
 * Skills IPC Handlers
 *
 * Handles all skills-related IPC communication
 */

import type { IpcMainInvokeEvent } from 'electron';
import { dbManager } from '../database';
import { SkillsService } from '../services/skills/crud';
import { githubService } from '../services/skills/github';
import { skillInstallService } from '../services/skills/install';
import { skillsConfigAdapter } from '../services/skills/config-adapter';
import { ipcRegistry } from '../ipc/registry';
import type { AppType } from '../../src/types';
import log from 'electron-log';

/**
 * Initialize Skills IPC handlers
 */
export function registerSkillsHandlers(): void {
  const db = dbManager.getDatabase();
  const service = new SkillsService(db);

  // Get all installed skills
  ipcRegistry.register('skills:getAll', async () => {
    return service.getAll();
  });

  // Get installed skills only
  ipcRegistry.register('skills:getInstalled', async () => {
    return service.getAll();
  });

  // Install a skill from GitHub
  ipcRegistry.register('skills:install', async (_event: IpcMainInvokeEvent, ...args: unknown[]) => {
    const [repoUrl, directory] = args as [string, string | undefined];

    // Parse repo URL (format: owner/repo)
    const parts = repoUrl.replace('https://github.com/', '').split('/');
    if (parts.length < 2) {
      throw new Error('Invalid repository URL format. Use: owner/repo');
    }

    const [owner, repo] = parts;
    const skillDir = directory || repo;
    let skillPath: string | null = null;

    try {
      // Install skill files
      skillPath = await skillInstallService.installFromRepo(owner, repo, skillDir);

      // Get skill info
      const metadata = skillInstallService.readSkillMetadata(skillPath);
      const skillName = (metadata?.name as string) || skillDir;
      const skillDescription = metadata?.description as string | undefined;

      // Create skill record in database
      const skill = service.create({
        name: skillName,
        description: skillDescription,
        repoOwner: owner,
        repoName: repo,
        directory: skillPath,
      });

      // Sync to apps (none enabled by default)
      const allSkills = service.getAll();
      skillsConfigAdapter.syncToAllApps(allSkills);

      return skill;
    } catch (error) {
      log.error('Failed to install skill:', error);

      // Cleanup: remove installed files if database creation failed
      if (skillPath) {
        try {
          skillInstallService.uninstall(skillPath);
          log.info(`Cleaned up skill files at: ${skillPath}`);
        } catch (cleanupError) {
          log.error('Failed to cleanup skill files:', cleanupError);
        }
      }

      throw error;
    }
  });

  // Install a skill from local folder
  ipcRegistry.register(
    'skills:installLocal',
    async (_event: IpcMainInvokeEvent, ...args: unknown[]) => {
      const [localPath, skillName] = args as [string, string];

      try {
        log.info(`Installing local skill from: ${localPath}`);

        // Install skill files from local folder
        const skillPath = await skillInstallService.installFromLocal(localPath, skillName);

        // Get skill info
        const metadata = skillInstallService.readSkillMetadata(skillPath);
        const finalSkillName = skillName || (metadata?.name as string) || 'Local Skill';
        const skillDescription = metadata?.description as string | undefined;

        // Create skill record in database
        const skill = service.create({
          name: finalSkillName,
          description: skillDescription,
          directory: skillPath,
        });

        // Sync to apps (none enabled by default)
        const allSkills = service.getAll();
        skillsConfigAdapter.syncToAllApps(allSkills);

        log.info(`Local skill installed successfully: ${finalSkillName}`);
        return skill;
      } catch (error) {
        log.error('Failed to install local skill:', error);
        throw error;
      }
    }
  );

  // Uninstall a skill
  ipcRegistry.register(
    'skills:uninstall',
    async (_event: IpcMainInvokeEvent, ...args: unknown[]) => {
      const [id] = args as [string];

      const skill = service.getById(id);
      if (!skill) {
        throw new Error('Skill not found');
      }

      // Remove files
      skillInstallService.uninstall(skill.directory);

      // Remove from database
      service.delete(id);

      // Sync to apps
      const allSkills = service.getAll();
      skillsConfigAdapter.syncToAllApps(allSkills);
    }
  );

  // Toggle skill for an app
  ipcRegistry.register(
    'skills:toggleApp',
    async (_event: IpcMainInvokeEvent, ...args: unknown[]) => {
      const [id, appType, enabled] = args as [string, AppType, boolean];
      service.toggleApp(id, appType, enabled);

      // Sync to specific app
      const allSkills = service.getAll();
      skillsConfigAdapter.syncToApp(appType, allSkills);
    }
  );

  // Scan a GitHub repository for skills
  ipcRegistry.register(
    'skills:scanRepo',
    async (_event: IpcMainInvokeEvent, ...args: unknown[]) => {
      const [owner, name] = args as [string, string];
      return githubService.scanRepo(owner, name);
    }
  );

  // Get repository info
  ipcRegistry.register(
    'skills:getRepoInfo',
    async (_event: IpcMainInvokeEvent, ...args: unknown[]) => {
      const [owner, name] = args as [string, string];
      return githubService.getRepoInfo(owner, name);
    }
  );

  // Open skills folder
  ipcRegistry.register('skills:openFolder', async () => {
    skillsConfigAdapter.openSkillsFolder();
  });

  // Select local skill folder
  ipcRegistry.register('skills:selectFolder', async () => {
    const { dialog } = require('electron');
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Select Skill Folder',
      buttonLabel: 'Select Folder',
    });

    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0];
    }
    return null;
  });

  // Sync all skills to all apps
  ipcRegistry.register('skills:syncAll', async () => {
    const allSkills = service.getAll();
    skillsConfigAdapter.syncToAllApps(allSkills);
    log.info('Manual sync of all skills to all apps');
  });

  log.info('Skills IPC handlers registered');
}
