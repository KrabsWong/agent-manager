/**
 * MCP IPC Handlers
 * 
 * Handles all MCP-related IPC communication
 */

import type { IpcMainInvokeEvent } from 'electron';
import { dbManager } from '../database';
import { McpService } from '../services/mcp/crud';
import { mcpConfigAdapter } from '../services/mcp/config-adapter';
import { ipcRegistry } from '../ipc/registry';
import type { AppType } from '../../src/types';
import log from 'electron-log';

/**
 * Initialize MCP IPC handlers
 */
export function registerMcpHandlers(): void {
  const db = dbManager.getDatabase();
  const service = new McpService(db);

  // Get all MCP servers
  ipcRegistry.register('mcp:getAll', async () => {
    return service.getAll();
  });

  // Get MCP server by ID
  ipcRegistry.register('mcp:getById', async (
    _event: IpcMainInvokeEvent,
    ...args: unknown[]
  ) => {
    const [id] = args as [string];
    return service.getById(id);
  });

  // Create MCP server
  ipcRegistry.register('mcp:create', async (
    _event: IpcMainInvokeEvent,
    ...args: unknown[]
  ) => {
    const [input] = args as [import('../../src/types').CreateMcpServerInput];
    const server = service.create(input);
    
    // Sync to apps
    const allServers = service.getAll();
    mcpConfigAdapter.syncToAllApps(allServers);
    
    return server;
  });

  // Update MCP server
  ipcRegistry.register('mcp:update', async (
    _event: IpcMainInvokeEvent,
    ...args: unknown[]
  ) => {
    const [id, input] = args as [string, Partial<import('../../src/types').CreateMcpServerInput>];
    const server = service.update(id, input);
    
    // Sync to apps
    const allServers = service.getAll();
    mcpConfigAdapter.syncToAllApps(allServers);
    
    return server;
  });

  // Delete MCP server
  ipcRegistry.register('mcp:delete', async (
    _event: IpcMainInvokeEvent,
    ...args: unknown[]
  ) => {
    const [id] = args as [string];
    service.delete(id);
    
    // Sync to apps
    const allServers = service.getAll();
    mcpConfigAdapter.syncToAllApps(allServers);
  });

  // Toggle MCP server for an app
  ipcRegistry.register('mcp:toggleApp', async (
    _event: IpcMainInvokeEvent,
    ...args: unknown[]
  ) => {
    const [id, appType, enabled] = args as [string, AppType, boolean];
    service.toggleApp(id, appType, enabled);
    
    // Sync to specific app
    const allServers = service.getAll();
    mcpConfigAdapter.syncToApp(appType, allServers);
  });

  // Get MCP servers for an app
  ipcRegistry.register('mcp:getByApp', async (
    _event: IpcMainInvokeEvent,
    ...args: unknown[]
  ) => {
    const [appType] = args as [AppType];
    return service.getByApp(appType);
  });

  // Sync all MCP servers to all apps
  ipcRegistry.register('mcp:syncAll', async () => {
    const allServers = service.getAll();
    mcpConfigAdapter.syncToAllApps(allServers);
    log.info('Manual sync of all MCP servers to all apps');
  });

  // Open config folder for an app
  ipcRegistry.register('mcp:openConfigFolder', async (
    _event: IpcMainInvokeEvent,
    ...args: unknown[]
  ) => {
    const [appType] = args as [AppType];
    mcpConfigAdapter.openConfigFolder(appType);
  });

  log.info('MCP IPC handlers registered');
}
