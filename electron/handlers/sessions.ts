/**
 * Sessions IPC Handlers
 *
 * Handles all session-related IPC communication
 */

import { ipcRegistry } from '../ipc/registry';
import { claudeSessionService } from '../services/session/claude';
import { opencodeSessionService } from '../services/session/opencode';
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
    };

    return supportMap[appType] || { supported: false, status: 'not_supported' };
  });

  log.info('Sessions IPC handlers registered');
}
