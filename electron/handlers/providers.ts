/**
 * Provider IPC Handlers
 * 
 * Handles all provider-related IPC communication
 */

import type { IpcMainInvokeEvent } from 'electron';
import { dbManager } from '../database';
import { ProviderService } from '../services/provider/crud';
import { ipcRegistry } from '../ipc/registry';
import log from 'electron-log';

/**
 * Initialize provider IPC handlers
 */
export function registerProviderHandlers(): void {
  const db = dbManager.getDatabase();
  const service = new ProviderService(db);

  // Get all providers for an app
  ipcRegistry.register('providers:getAll', async (
    _event: IpcMainInvokeEvent,
    ...args: unknown[]
  ) => {
    const [appType] = args as [string];
    return service.getAll(appType as import('../../src/types').AppType);
  });

  // Get provider by ID
  ipcRegistry.register('providers:getById', async (
    _event: IpcMainInvokeEvent,
    ...args: unknown[]
  ) => {
    const [id, appType] = args as [string, string];
    return service.getById(id, appType as import('../../src/types').AppType);
  });

  // Create provider
  ipcRegistry.register('providers:create', async (
    _event: IpcMainInvokeEvent,
    ...args: unknown[]
  ) => {
    const [input] = args as [import('../../src/types').CreateProviderInput];
    return service.create(input);
  });

  // Update provider
  ipcRegistry.register('providers:update', async (
    _event: IpcMainInvokeEvent,
    ...args: unknown[]
  ) => {
    const [id, appType, input] = args as [string, string, Partial<import('../../src/types').CreateProviderInput>];
    return service.update(id, appType as import('../../src/types').AppType, input);
  });

  // Delete provider
  ipcRegistry.register('providers:delete', async (
    _event: IpcMainInvokeEvent,
    ...args: unknown[]
  ) => {
    const [id, appType] = args as [string, string];
    service.delete(id, appType as import('../../src/types').AppType);
  });

  // Switch provider
  ipcRegistry.register('providers:switch', async (
    _event: IpcMainInvokeEvent,
    ...args: unknown[]
  ) => {
    const [id, appType] = args as [string, string];
    return service.switch(id, appType as import('../../src/types').AppType);
  });

  // Reorder providers
  ipcRegistry.register('providers:reorder', async (
    _event: IpcMainInvokeEvent,
    ...args: unknown[]
  ) => {
    const [appType, providerIds] = args as [string, string[]];
    service.reorder(appType as import('../../src/types').AppType, providerIds);
  });

  log.info('Provider IPC handlers registered');
}
