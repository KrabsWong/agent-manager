/**
 * Prompt IPC Handlers
 * 
 * Handles all Prompt-related IPC communication
 */

import type { IpcMainInvokeEvent } from 'electron';
import { ipcRegistry } from '../ipc/registry';
import { getPromptService } from '../services/prompt/crud';
import { promptConfigAdapter } from '../services/prompt/config-adapter';
import type { AppType, CreatePromptInput } from '@/types';
import log from 'electron-log';

/**
 * Initialize Prompt IPC handlers
 */
export function registerPromptHandlers(): void {
  const service = getPromptService();

  // Get all prompts for an app
  ipcRegistry.register('prompts:getAll', async (
    _event: IpcMainInvokeEvent,
    ...args: unknown[]
  ) => {
    const [appType] = args as [AppType];
    return service.getAll(appType);
  });

  // Get single prompt by ID
  ipcRegistry.register('prompts:getById', async (
    _event: IpcMainInvokeEvent,
    ...args: unknown[]
  ) => {
    const [id, appType] = args as [string, AppType];
    return service.getById(id, appType);
  });

  // Create prompt
  ipcRegistry.register('prompts:create', async (
    _event: IpcMainInvokeEvent,
    ...args: unknown[]
  ) => {
    const [input] = args as [CreatePromptInput];
    const prompt = service.create(input);
    
    // Sync to app config after creation
    promptConfigAdapter.syncToApp(input.appType);
    
    return prompt;
  });

  // Update prompt
  ipcRegistry.register('prompts:update', async (
    _event: IpcMainInvokeEvent,
    ...args: unknown[]
  ) => {
    const [id, appType, input] = args as [string, AppType, Partial<CreatePromptInput>];
    const prompt = service.update(id, appType, input);
    
    // Sync to app config after update
    promptConfigAdapter.syncToApp(appType);
    
    return prompt;
  });

  // Delete prompt
  ipcRegistry.register('prompts:delete', async (
    _event: IpcMainInvokeEvent,
    ...args: unknown[]
  ) => {
    const [id, appType] = args as [string, AppType];
    service.delete(id, appType);
    
    // Sync to app config after delete
    promptConfigAdapter.syncToApp(appType);
    
    return { success: true };
  });

  // Set active prompt
  ipcRegistry.register('prompts:setActive', async (
    _event: IpcMainInvokeEvent,
    ...args: unknown[]
  ) => {
    const [id, appType] = args as [string, AppType];
    service.setActive(id, appType);
    
    // Sync to app config after setting active
    promptConfigAdapter.syncToApp(appType);
    
    return { success: true };
  });

  // Get active prompt
  ipcRegistry.register('prompts:getActive', async (
    _event: IpcMainInvokeEvent,
    ...args: unknown[]
  ) => {
    const [appType] = args as [AppType];
    return service.getActive(appType);
  });

  // Import prompt from app config
  ipcRegistry.register('prompts:importFromApp', async (
    _event: IpcMainInvokeEvent,
    ...args: unknown[]
  ) => {
    const [appType, name] = args as [AppType, string | undefined];
    return promptConfigAdapter.importFromApp(appType, name);
  });

  // Sync all prompts to all apps
  ipcRegistry.register('prompts:syncAll', async () => {
    promptConfigAdapter.syncAll();
    return { success: true };
  });

  // Open config folder for an app
  ipcRegistry.register('prompts:openConfigFolder', async (
    _event: IpcMainInvokeEvent,
    ...args: unknown[]
  ) => {
    const [appType] = args as [AppType];
    promptConfigAdapter.openConfigFolder(appType);
    return { success: true };
  });

  log.info('Prompt IPC handlers registered');
}
