/**
 * Sessions IPC Handlers
 *
 * Handles all session-related IPC communication
 */

import { ipcRegistry } from '../ipc/registry';
import { claudeSessionService } from '../services/session/claude';
import type { AppType } from '../../src/types';
import log from 'electron-log';

/**
 * Initialize Sessions IPC handlers
 */
export function registerSessionsHandlers(): void {
  // Get sessions for an app
  ipcRegistry.register('sessions:getAll', async (_event, ...args: unknown[]) => {
    const [appType] = args as [AppType];

    if (appType !== 'claude') {
      // Return empty array for unsupported apps
      return [];
    }

    try {
      return claudeSessionService.getAllSessions();
    } catch (error) {
      log.error('Failed to get sessions:', error);
      throw error;
    }
  });

  // Get session detail
  ipcRegistry.register('sessions:getDetail', async (_event, ...args: unknown[]) => {
    const [sessionId] = args as [string];

    try {
      return claudeSessionService.getSessionDetail(sessionId);
    } catch (error) {
      log.error('Failed to get session detail:', error);
      throw error;
    }
  });

  // Get session stats
  ipcRegistry.register('sessions:getStats', async (_event, ...args: unknown[]) => {
    const [appType] = args as [AppType];

    if (appType !== 'claude') {
      return { totalSessions: 0, totalMessages: 0 };
    }

    try {
      return claudeSessionService.getStats();
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
      opencode: { supported: false, status: 'coming_soon' },
      openclaw: { supported: false, status: 'coming_soon' },
    };

    return supportMap[appType] || { supported: false, status: 'not_supported' };
  });

  log.info('Sessions IPC handlers registered');
}
