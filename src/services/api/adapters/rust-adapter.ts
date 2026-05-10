/**
 * Rust Backend Adapter
 *
 * Implements IBackendAdapter using HTTP API calls to Rust microservice
 */

import type { IBackendAdapter, IStorageAdapter } from '../interface';
import type {
  ApiResponse,
  Session,
  SessionDetail,
  AppSettings,
  TreeNode,
  GitStatusResult,
  GitFileDiffResult,
  TerminalInfo,
} from '../types';

const RUST_SERVICE_URL = 'http://localhost:3000';

/**
 * HTTP Client for Rust service
 */
class RustHttpClient {
  private baseUrl: string;

  constructor(baseUrl: string = RUST_SERVICE_URL) {
    this.baseUrl = baseUrl;
  }

  async get<T>(path: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data: ApiResponse<T> = await response.json();
    
    if (!data.success) {
      throw new Error(data.error?.message || 'Unknown error');
    }

    return data.data as T;
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data: ApiResponse<T> = await response.json();
    
    if (!data.success) {
      throw new Error(data.error?.message || 'Unknown error');
    }

    return data.data as T;
  }
}

/**
 * Rust Storage Adapter
 */
export class RustStorageAdapter implements IStorageAdapter {
  private client: RustHttpClient;
  private cache: Map<string, unknown> = new Map();

  constructor(client: RustHttpClient) {
    this.client = client;
  }

  async get<T>(key: string, defaultValue?: T): Promise<T> {
    if (this.cache.has(key)) {
      return this.cache.get(key) as T;
    }

    if (key === 'settings') {
      const settings = await this.client.get<AppSettings>('/api/settings');
      this.cache.set(key, settings);
      return settings as T;
    }

    if (defaultValue !== undefined) {
      return defaultValue;
    }

    throw new Error(`Storage key "${key}" not found`);
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.cache.set(key, value);

    if (key === 'settings') {
      await this.client.post('/api/settings', value);
    }
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }
}

/**
 * Rust Backend Adapter
 */
export class RustBackendAdapter implements IBackendAdapter {
  private client: RustHttpClient;
  private wsConnections: Map<string, WebSocket> = new Map();

  constructor(baseUrl: string = RUST_SERVICE_URL) {
    this.client = new RustHttpClient(baseUrl);
  }

  readonly sessions = {
    getAll: async (appType: string): Promise<Session[]> => {
      return this.client.get<Session[]>(`/api/sessions/${appType}`);
    },

    getDetail: async (sessionId: string, appType: string): Promise<SessionDetail | null> => {
      return this.client.get<SessionDetail | null>(`/api/sessions/${appType}/${sessionId}`);
    },

    getStats: async (_appType: string) => {
      console.warn('[Rust] sessions.getStats not implemented');
      return { totalSessions: 0, totalMessages: 0 };
    },

    getSupportStatus: async (_appType: string) => {
      console.warn('[Rust] sessions.getSupportStatus not implemented');
      return { supported: true, status: 'full', isAvailable: true };
    },

    resume: async (_sessionId: string, _appType: string, _workingDir?: string): Promise<void> => {
      console.warn('[Rust] sessions.resume not implemented');
    },

    getTerminalInfo: async (): Promise<TerminalInfo> => {
      try {
        const response = await this.client.get<{
          preferred: string;
          ghostty_installed: boolean;
          kitty_installed: boolean;
        }>('/api/terminal/info');
        return {
          preferred: response.preferred as 'auto' | 'ghostty' | 'kitty' | 'terminal',
          ghosttyInstalled: response.ghostty_installed,
          kittyInstalled: response.kitty_installed,
        };
      } catch (error) {
        console.error('[Rust] Failed to get terminal info:', error);
        return { preferred: 'auto', ghosttyInstalled: false, kittyInstalled: false };
      }
    },
  };

  readonly settings = {
    get: async (): Promise<AppSettings> => {
      return this.client.get<AppSettings>('/api/settings');
    },

    update: async (settings: Partial<AppSettings>): Promise<void> => {
      await this.client.post('/api/settings', settings);
    },

    reset: async (): Promise<void> => {
      console.warn('[Rust] settings.reset not implemented');
    },
  };

  readonly app = {
    getVersion: async (): Promise<string> => {
      const health = await this.client.get<{ version: string }>('/health');
      return health.version || '0.1.0';
    },
  };

  readonly config = {
    export: async (): Promise<Record<string, unknown>> => {
      console.warn('[Rust] config.export not implemented');
      return {};
    },

    import: async (_data: Record<string, unknown>): Promise<void> => {
      console.warn('[Rust] config.import not implemented');
    },
  };

  readonly shell = {
    openExternal: async (url: string): Promise<void> => {
      await this.client.get(`/api/shell/openExternal?url=${encodeURIComponent(url)}`);
    },

    openPath: async (filePath: string): Promise<void> => {
      await this.client.get(`/api/shell/openPath?path=${encodeURIComponent(filePath)}`);
    },
  };

  readonly filePreview = {
    open: async (_dirPath: string, _sessionTitle?: string, _appType?: string): Promise<void> => {
      console.warn('[Rust] filePreview.open not implemented');
    },
  };

  readonly file = {
    read: async (filePath: string): Promise<string> => {
      return this.client.get<string>(`/api/file/read?file_path=${encodeURIComponent(filePath)}`);
    },

    readImage: async (filePath: string): Promise<string> => {
      return this.client.get<string>(`/api/file/readImage?file_path=${encodeURIComponent(filePath)}`);
    },
  };

  readonly tree = {
    getDirectoryTree: async (dirPath: string): Promise<TreeNode[]> => {
      return this.client.get<TreeNode[]>(`/api/tree?dir_path=${encodeURIComponent(dirPath)}`);
    },
  };

  readonly git = {
    getStatus: async (_dirPath: string): Promise<GitStatusResult> => {
      console.warn('[Rust] git.getStatus not implemented');
      return {
        isGitRepo: false,
        branch: '',
        ahead: 0,
        behind: 0,
        staged: [],
        unstaged: [],
        untracked: [],
      };
    },

    getDiff: async (_dirPath: string, _filePath?: string): Promise<string> => {
      console.warn('[Rust] git.getDiff not implemented');
      return '';
    },

    getFileDiff: async (_dirPath: string, _filePath: string): Promise<GitFileDiffResult> => {
      console.warn('[Rust] git.getFileDiff not implemented');
      return { original: '', modified: '', hasChanges: false };
    },

    startWatching: async (_dirPath: string): Promise<void> => {
      console.warn('[Rust] git.startWatching not implemented');
    },

    stopWatching: async (): Promise<void> => {
      console.warn('[Rust] git.stopWatching not implemented');
    },

    onChange: (_callback: (dirPath: string) => void): (() => void) => {
      console.warn('[Rust] git.onChange not implemented');
      return () => {};
    },
  };

  readonly pty = {
    create: async (
      sessionId: string,
      options?: { cwd?: string }
    ): Promise<{ sessionId: string; shell: string }> => {
      return this.client.post('/api/terminal', { sessionId, cwd: options?.cwd });
    },

    write: async (_sessionId: string, _data: string): Promise<void> => {
      console.warn('[Rust] pty.write requires WebSocket');
    },

    resize: async (_sessionId: string, _cols: number, _rows: number): Promise<void> => {
      console.warn('[Rust] pty.resize requires WebSocket');
    },

    kill: async (_sessionId: string): Promise<void> => {
      console.warn('[Rust] pty.kill requires WebSocket');
    },

    onData: (sessionId: string, _callback: (data: string) => void): (() => void) => {
      console.warn('[Rust] pty.onData requires WebSocket');
      return () => {
        const ws = this.wsConnections.get(sessionId);
        if (ws) {
          ws.close();
          this.wsConnections.delete(sessionId);
        }
      };
    },

    onExit: (_sessionId: string, _callback: (exitCode: number) => void): (() => void) => {
      console.warn('[Rust] pty.onExit requires WebSocket');
      return () => {};
    },
  };

  async healthCheck(): Promise<boolean> {
    try {
      await this.client.get('/health');
      return true;
    } catch (error) {
      console.error('[Rust] Health check failed:', error);
      return false;
    }
  }
}