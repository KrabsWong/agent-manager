/**
 * IPC Channel Handlers
 * 
 * Central registry for all IPC communication between main and renderer processes
 */

import { ipcMain, IpcMainInvokeEvent } from 'electron';
import log from 'electron-log';
import type { IpcChannel, ApiResponse } from '../../src/types';
import { wrapIPCErrorsAsync } from '../utils/errors';

// Handler function type
type IpcHandler<T = unknown> = (
  event: IpcMainInvokeEvent,
  ...args: unknown[]
) => Promise<T> | T;

/**
 * IPC Handler Registry
 */
class IpcRegistry {
  private handlers = new Map<IpcChannel, IpcHandler>();

  /**
   * Register an IPC handler
   */
  register<T>(channel: IpcChannel, handler: IpcHandler<T>): void {
    if (this.handlers.has(channel)) {
      log.warn(`Handler for channel "${channel}" already exists, overwriting`);
    }

    this.handlers.set(channel, handler);

    // Register with Electron's IPC main
    ipcMain.handle(channel, async (event, ...args) => {
      log.debug(`IPC call: ${channel}`, args);

      try {
        const result = await wrapIPCErrorsAsync(async () => handler(event, ...args));
        
        const response: ApiResponse<T> = {
          success: true,
          data: result,
        };

        return response;
      } catch (error) {
        log.error(`IPC error in ${channel}:`, error);

        const response: ApiResponse<T> = {
          success: false,
          error: error as {
            code: string;
            message: string;
            details?: unknown;
          },
        };

        return response;
      }
    });

    log.info(`Registered IPC handler: ${channel}`);
  }

  /**
   * Remove an IPC handler
   */
  unregister(channel: IpcChannel): void {
    this.handlers.delete(channel);
    ipcMain.removeHandler(channel);
    log.info(`Unregistered IPC handler: ${channel}`);
  }

  /**
   * Check if a handler is registered
   */
  has(channel: IpcChannel): boolean {
    return this.handlers.has(channel);
  }

  /**
   * Get all registered channels
   */
  getChannels(): IpcChannel[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Remove all handlers
   */
  clear(): void {
    for (const channel of this.handlers.keys()) {
      ipcMain.removeHandler(channel);
    }
    this.handlers.clear();
    log.info('All IPC handlers cleared');
  }
}

// Export singleton instance
export const ipcRegistry = new IpcRegistry();

// Re-export types
export type { IpcHandler };
