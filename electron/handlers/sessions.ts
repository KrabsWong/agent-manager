/**
 * Sessions IPC Handlers
 *
 * Handles all session-related IPC communication
 */

import { ipcRegistry } from '../ipc/registry';
import { claudeSessionService } from '../services/session/claude';
import { opencodeSessionService } from '../services/session/opencode';
import { codebuddySessionService } from '../services/session/codebuddy';
import { resumeSessionInTerminal, getTerminalInfo } from '../services/terminal/launcher';
import type { AppType } from '../../src/types';
import log from 'electron-log';

/**
 * Initialize Sessions IPC handlers
 */
export function registerSessionsHandlers(): void {
  // Get sessions for an app
  ipcRegistry.register('sessions:getAll', async (_event, ...args: unknown[]) => {
    const [appType] = args as [AppType];

    try {
      if (appType === 'claude') {
        return claudeSessionService.getAllSessions();
      }
      if (appType === 'opencode') {
        return await opencodeSessionService.getAllSessions();
      }
      if (appType === 'codebuddy') {
        return await codebuddySessionService.getAllSessions();
      }
      // Return empty array for unsupported apps
      return [];
    } catch (error) {
      log.error('Failed to get sessions:', error);
      throw error;
    }
  });

  // Get session detail
  ipcRegistry.register('sessions:getDetail', async (_event, ...args: unknown[]) => {
    const [sessionId, appType] = args as [string, AppType];

    try {
      if (appType === 'claude') {
        return claudeSessionService.getSessionDetail(sessionId);
      }
      if (appType === 'opencode') {
        return await opencodeSessionService.getSessionDetail(sessionId);
      }
      if (appType === 'codebuddy') {
        return await codebuddySessionService.getSessionDetail(sessionId);
      }
      // Try to infer from sessionId format or try both services
      const claudeSession = claudeSessionService.getSessionDetail(sessionId);
      if (claudeSession) {
        return claudeSession;
      }
      return await opencodeSessionService.getSessionDetail(sessionId);
    } catch (error) {
      log.error('Failed to get session detail:', error);
      throw error;
    }
  });

  // Get session stats
  ipcRegistry.register('sessions:getStats', async (_event, ...args: unknown[]) => {
    const [appType] = args as [AppType];

    try {
      if (appType === 'claude') {
        return claudeSessionService.getStats();
      }
      if (appType === 'opencode') {
        return await opencodeSessionService.getStats();
      }
      if (appType === 'codebuddy') {
        return await codebuddySessionService.getStats();
      }
      return { totalSessions: 0, totalMessages: 0 };
    } catch (error) {
      log.error('Failed to get session stats:', error);
      throw error;
    }
  });

  // Check if app is supported
  ipcRegistry.register('sessions:getSupportStatus', async (_event, ...args: unknown[]) => {
    const [appType] = args as [AppType];

    const supportMap: Record<AppType, { supported: boolean; status: string }> = {
      claude: { supported: true, status: 'full' },
      codex: { supported: false, status: 'coming_soon' },
      gemini: { supported: false, status: 'coming_soon' },
      opencode: { supported: opencodeSessionService.isAvailable(), status: 'full' },
      openclaw: { supported: false, status: 'coming_soon' },
      codebuddy: { supported: codebuddySessionService.isAvailable(), status: 'full' },
    };

    return supportMap[appType] || { supported: false, status: 'not_supported' };
  });

  // Resume session in terminal
  ipcRegistry.register('sessions:resume', async (_event, ...args: unknown[]) => {
    const [sessionId, appType, workingDir] = args as [string, AppType, string | undefined];

    try {
      await resumeSessionInTerminal(appType, sessionId, workingDir);
      return { success: true };
    } catch (error) {
      log.error('Failed to resume session:', error);
      throw error;
    }
  });

  // Get terminal info (for UI display)
  ipcRegistry.register('sessions:getTerminalInfo', async () => {
    return getTerminalInfo();
  });

  log.info('Sessions IPC handlers registered');
}
