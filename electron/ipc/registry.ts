/**
 * IPC Channel Handlers
 *
 * Central registry for all IPC communication between main and renderer processes
 */

import electron from 'electron';
import type { IpcMainInvokeEvent } from 'electron';
import log from 'electron-log';
import type { IpcChannel, ApiResponse } from '../../src/types';
import { wrapIPCErrorsAsync } from '../utils/errors';

const { ipcMain } = electron;

// Handler function type
type IpcHandler<T = unknown> = (event: IpcMainInvokeEvent, ...args: unknown[]) => Promise<T> | T;

type IpcArgsValidator = (args: unknown[]) => void;
type IpcResultValidator<T = unknown> = (result: T) => void;

interface IpcRegisterOptions {
  validateArgs?: IpcArgsValidator;
  validateResult?: IpcResultValidator;
}

/**
 * IPC Handler Registry
 */
class IpcRegistry {
  private handlers = new Map<IpcChannel, IpcHandler>();

  /**
   * Register an IPC handler
   */
  register<T>(channel: IpcChannel, handler: IpcHandler<T>, options: IpcRegisterOptions = {}): void {
    if (this.handlers.has(channel)) {
      log.warn(`Handler for channel "${channel}" already exists, overwriting`);
    }

    this.handlers.set(channel, handler);

    // Register with Electron's IPC main
    ipcMain.handle(channel, async (event, ...args) => {
      log.debug(`IPC call: ${channel}`, args);

      try {
        const result = await wrapIPCErrorsAsync(async () => {
          options.validateArgs?.(args);
          const handlerResult = await handler(event, ...args);
          options.validateResult?.(handlerResult);
          return handlerResult;
        });

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
