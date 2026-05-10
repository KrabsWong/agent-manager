/**
 * Electron Backend Adapter
 * 
 * Implements IBackendAdapter using Electron IPC (current implementation)
 * 
 * This adapter wraps the existing electronAPI.invoke calls
 */

import type { IBackendAdapter, IStorageAdapter } from '../interface';
import type { ApiResponse, Session, SessionDetail, AppSettings, TreeNode, GitStatusResult, GitFileDiffResult, TerminalInfo } from '../types';

/**
 * Extract data from API response or throw error
 */
function extractData<T>(response: ApiResponse<T>): T {
  if (!response.success) {
    throw new Error(response.error?.message || 'Unknown error');
  }
  return response.data as T;
}

/**
 * Electron Storage Adapter
 * 
 * Uses existing settings API for persistence
 * 
 * Note: This adapter uses the same storage backend as settings API.
 * For generic key-value storage, consider using localStorage or
 * implement new storage handlers in Electron main process.
 */
export class ElectronStorageAdapter implements IStorageAdapter {
  private cache: Map<string, unknown> = new Map();

  async get<T>(key: string, defaultValue?: T): Promise<T> {
    // Check cache first
    if (this.cache.has(key)) {
      return this.cache.get(key) as T;
    }

    // For settings key, use existing settings API
    if (key === 'settings') {
      const response = await window.electronAPI.invoke('settings:get') as ApiResponse<AppSettings>;
      const value = extractData(response);
      this.cache.set(key, value);
      return value as T;
    }

    // For other keys, return defaultValue or throw error
    // TODO: Implement generic storage handlers in Electron main process
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Storage key "${key}" not found and no default value provided`);
  }

  async set<T>(key: string, value: T): Promise<void> {
    // Update cache
    this.cache.set(key, value);

    // For settings key, use existing settings API
    if (key === 'settings') {
      const response = await window.electronAPI.invoke('settings:update', value) as ApiResponse<void>;
      extractData(response);
      return;
    }

    // For other keys, store in memory only for now
    // TODO: Implement generic storage handlers in Electron main process
    console.warn(`Storage key "${key}" stored in memory only (not persisted)`);
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
    // TODO: Implement storage:delete handler
    console.warn(`Storage key "${key}" deleted from cache only`);
  }

  async clear(): Promise<void> {
    this.cache.clear();
    // TODO: Implement storage:clear handler
    console.warn('Storage cleared from cache only');
  }
}

/**
 * Electron Backend Adapter
 * 
 * Wraps all electronAPI.invoke calls
 */
export class ElectronBackendAdapter implements IBackendAdapter {
  readonly sessions = {
    async getAll(appType: string): Promise<Session[]> {
      const response = await window.electronAPI.invoke('sessions:getAll', appType) as ApiResponse<Session[]>;
      return extractData(response);
    },

    async getDetail(sessionId: string, appType: string): Promise<SessionDetail | null> {
      const response = await window.electronAPI.invoke('sessions:getDetail', sessionId, appType) as ApiResponse<SessionDetail | null>;
      return extractData(response);
    },

    async getStats(appType: string) {
      const response = await window.electronAPI.invoke('sessions:getStats', appType) as ApiResponse<{
        totalSessions: number;
        totalMessages: number;
        firstSessionDate?: number;
        lastSessionDate?: number;
      }>;
      return extractData(response);
    },

    async getSupportStatus(appType: string) {
      const response = await window.electronAPI.invoke('sessions:getSupportStatus', appType) as ApiResponse<{
        supported: boolean;
        status: string;
        isAvailable: boolean;
        notAvailableReason?: string;
      }>;
      return extractData(response);
    },

    async resume(sessionId: string, appType: string, workingDir?: string): Promise<void> {
      const response = await window.electronAPI.invoke('sessions:resume', sessionId, appType, workingDir) as ApiResponse<void>;
      return extractData(response);
    },

    async getTerminalInfo(): Promise<TerminalInfo> {
      const response = await window.electronAPI.invoke('sessions:getTerminalInfo') as ApiResponse<TerminalInfo>;
      return extractData(response);
    },
  };

  readonly settings = {
    async get(): Promise<AppSettings> {
      const response = await window.electronAPI.invoke('settings:get') as ApiResponse<AppSettings>;
      return extractData(response);
    },

    async update(settings: Partial<AppSettings>): Promise<void> {
      const response = await window.electronAPI.invoke('settings:update', settings) as ApiResponse<void>;
      return extractData(response);
    },

    async reset(): Promise<void> {
      const response = await window.electronAPI.invoke('settings:reset') as ApiResponse<void>;
      return extractData(response);
    },
  };

  readonly app = {
    async getVersion(): Promise<string> {
      const response = await window.electronAPI.invoke('app:getVersion') as ApiResponse<string>;
      return extractData(response);
    },
  };

  readonly config = {
    async export(): Promise<Record<string, unknown>> {
      const response = await window.electronAPI.invoke('config:export') as ApiResponse<Record<string, unknown>>;
      return extractData(response);
    },

    async import(data: Record<string, unknown>): Promise<void> {
      const response = await window.electronAPI.invoke('config:import', data) as ApiResponse<void>;
      return extractData(response);
    },
  };

  readonly shell = {
    async openExternal(url: string): Promise<void> {
      await window.electronAPI.invoke('shell:openExternal', url);
    },

    async openPath(filePath: string): Promise<void> {
      await window.electronAPI.invoke('shell:openPath', filePath);
    },
  };

  readonly filePreview = {
    async open(dirPath: string, sessionTitle?: string, appType?: string): Promise<void> {
      await window.electronAPI.invoke('file-preview:open', dirPath, sessionTitle, appType);
    },
  };

  readonly file = {
    async read(filePath: string): Promise<string> {
      const response = await window.electronAPI.invoke('file:read', filePath) as ApiResponse<string>;
      return extractData(response);
    },

    async readImage(filePath: string): Promise<string> {
      const response = await window.electronAPI.invoke('file:readImage', filePath) as ApiResponse<string>;
      return extractData(response);
    },
  };

  readonly tree = {
    async getDirectoryTree(dirPath: string): Promise<TreeNode[]> {
      const response = await window.electronAPI.invoke('tree:get', dirPath) as ApiResponse<TreeNode[]>;
      return extractData(response);
    },
  };

  readonly git = {
    async getStatus(dirPath: string): Promise<GitStatusResult> {
      const response = await window.electronAPI.invoke('git:status', dirPath) as ApiResponse<GitStatusResult>;
      return extractData(response);
    },

    async getDiff(dirPath: string, filePath?: string): Promise<string> {
      const response = await window.electronAPI.invoke('git:diff', dirPath, filePath) as ApiResponse<string>;
      return extractData(response);
    },

    async getFileDiff(dirPath: string, filePath: string): Promise<GitFileDiffResult> {
      const response = await window.electronAPI.invoke('git:fileDiff', dirPath, filePath) as ApiResponse<GitFileDiffResult>;
      return extractData(response);
    },

    async startWatching(dirPath: string): Promise<void> {
      const response = await window.electronAPI.invoke('git:watch:start', dirPath) as ApiResponse<void>;
      return extractData(response);
    },

    async stopWatching(): Promise<void> {
      const response = await window.electronAPI.invoke('git:watch:stop') as ApiResponse<void>;
      return extractData(response);
    },

    onChange(callback: (dirPath: string) => void): () => void {
      const handler = (_event: unknown, ...args: unknown[]) => {
        const data = args[0] as { dirPath: string };
        callback(data.dirPath);
      };
      window.electronAPI.on('git:changed', handler);
      return () => {
        window.electronAPI.removeAllListeners('git:changed');
      };
    },
  };

  readonly pty = {
    async create(sessionId: string, options?: { cwd?: string }): Promise<{ sessionId: string; shell: string }> {
      const response = await window.electronAPI.invoke('pty:create', sessionId, options) as {
        success: boolean;
        sessionId?: string;
        shell?: string;
        error?: string;
      };

      if (!response.success) {
        throw new Error(response.error || 'Failed to create PTY session');
      }

      return {
        sessionId: response.sessionId!,
        shell: response.shell!,
      };
    },

    async write(sessionId: string, data: string): Promise<void> {
      await window.electronAPI.invoke('pty:write', sessionId, data);
    },

    async resize(sessionId: string, cols: number, rows: number): Promise<void> {
      await window.electronAPI.invoke('pty:resize', sessionId, cols, rows);
    },

    async kill(sessionId: string): Promise<void> {
      await window.electronAPI.invoke('pty:kill', sessionId);
    },

    onData(sessionId: string, callback: (data: string) => void): () => void {
      const handler = (...args: unknown[]) => {
        const data = args[0] as { sessionId: string; data: string };
        if (data.sessionId === sessionId) {
          callback(data.data);
        }
      };
      window.electronAPI.on('pty:data', handler);
      return () => {
        window.electronAPI.removeAllListeners('pty:data');
      };
    },

    onExit(sessionId: string, callback: (exitCode: number) => void): () => void {
      const handler = (...args: unknown[]) => {
        const data = args[0] as { sessionId: string; exitCode: number };
        if (data.sessionId === sessionId) {
          callback(data.exitCode);
        }
      };
      window.electronAPI.on('pty:exit', handler);
      return () => {
        window.electronAPI.removeAllListeners('pty:exit');
      };
    },
  };
}