/**
 * Neutralino Backend Adapter
 *
 * Implements IBackendAdapter using:
 * - Neutralino APIs for window, storage, shell operations
 * - HTTP API to Rust microservice for data operations
 */

import type { IBackendAdapter, IStorageAdapter } from '../interface';
import type {
  Session,
  SessionDetail,
  AppSettings,
  TreeNode,
  GitStatusResult,
  GitFileDiffResult,
  TerminalInfo,
} from '../types';

const RUST_SERVICE_URL = 'http://localhost:3000';

declare global {
  interface Window {
    Neutralino?: {
      init: () => Promise<void>;
      os: {
        open: (url: string) => Promise<void>;
        exec: (command: string, args?: string[]) => Promise<{ exitCode: number; stdOut: string; stdErr: string }>;
      };
      filesystem: {
        readFile: (filename: string) => Promise<string>;
        writeFile: (filename: string, data: string) => Promise<void>;
        readDirectory: (path: string) => Promise<Array<{ name: string; type: 'FILE' | 'DIRECTORY' }>>;
        createDirectory: (path: string) => Promise<void>;
      };
      storage: {
        getData: (key: string) => Promise<string>;
        setData: (key: string, data: string) => Promise<void>;
      };
      process: {
        exec: (command: string, args?: string[]) => Promise<{ pid: number }>;
        kill: (pid: number) => Promise<void>;
      };
      app: {
        exit: () => Promise<void>;
        getConfig: () => Promise<{ applicationId: string; version: string }>;
      };
      events: {
        on: (event: string, callback: () => void) => void;
        off: (event: string) => void;
      };
      computer: {
        memory: () => Promise<{ physical: { total: number; available: number } }>;
      };
    };
  }
}

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

    const data = await response.json();
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

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error?.message || 'Unknown error');
    }

    return data.data as T;
  }
}

/**
 * Neutralino Storage Adapter
 */
export class NeutralinoStorageAdapter implements IStorageAdapter {
  private cache: Map<string, unknown> = new Map();

  async get<T>(key: string, defaultValue?: T): Promise<T> {
    if (this.cache.has(key)) {
      return this.cache.get(key) as T;
    }

    try {
      if (typeof window !== 'undefined' && window.Neutralino) {
        const data = await window.Neutralino.storage.getData(key);
        const value = JSON.parse(data);
        this.cache.set(key, value);
        return value;
      }
    } catch (error) {
      console.warn(`[Neutralino] Storage key "${key}" not found:`, error);
    }

    if (defaultValue !== undefined) {
      return defaultValue;
    }

    throw new Error(`Storage key "${key}" not found`);
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.cache.set(key, value);

    try {
      if (typeof window !== 'undefined' && window.Neutralino) {
        await window.Neutralino.storage.setData(key, JSON.stringify(value));
      }
    } catch (error) {
      console.error(`[Neutralino] Failed to set storage key "${key}":`, error);
      throw error;
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
 * Neutralino Backend Adapter
 */
export class NeutralinoBackendAdapter implements IBackendAdapter {
  private client: RustHttpClient;
  private storage: NeutralinoStorageAdapter;
  private rustServicePid: number | null = null;
  private wsConnections: Map<string, WebSocket> = new Map();

  constructor(baseUrl: string = RUST_SERVICE_URL) {
    this.client = new RustHttpClient(baseUrl);
    this.storage = new NeutralinoStorageAdapter();
  }

  /**
   * Start Rust microservice as subprocess
   */
  async startRustService(): Promise<void> {
    if (this.rustServicePid) {
      console.log('[Neutralino] Rust service already running');
      return;
    }

    try {
      if (typeof window !== 'undefined' && window.Neutralino) {
        const result = await window.Neutralino.process.exec('./rust-service/yes-sessions-service');
        this.rustServicePid = result.pid;
        console.log(`[Neutralino] Rust service started with PID: ${this.rustServicePid}`);

        await this.waitForServiceReady();
      }
    } catch (error) {
      console.error('[Neutralino] Failed to start Rust service:', error);
      throw error;
    }
  }

  /**
   * Stop Rust microservice
   */
  async stopRustService(): Promise<void> {
    if (this.rustServicePid && typeof window !== 'undefined' && window.Neutralino) {
      try {
        await window.Neutralino.process.kill(this.rustServicePid);
        console.log('[Neutralino] Rust service stopped');
        this.rustServicePid = null;
      } catch (error) {
        console.error('[Neutralino] Failed to stop Rust service:', error);
      }
    }
  }

  /**
   * Wait for Rust service to be ready
   */
  private async waitForServiceReady(maxRetries = 50, delay = 100): Promise<void> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        await this.client.get('/health');
        console.log('[Neutralino] Rust service is ready');
        return;
      } catch {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    throw new Error('[Neutralino] Rust service failed to start within timeout');
  }

  readonly sessions = {
    getAll: async (appType: string): Promise<Session[]> => {
      return this.client.get<Session[]>(`/api/sessions/${appType}`);
    },

    getDetail: async (sessionId: string, appType: string): Promise<SessionDetail | null> => {
      return this.client.get<SessionDetail | null>(`/api/sessions/${appType}/${sessionId}`);
    },

    getStats: async (_appType: string) => {
      console.warn('[Neutralino] sessions.getStats not implemented');
      return { totalSessions: 0, totalMessages: 0 };
    },

    getSupportStatus: async (_appType: string) => {
      console.warn('[Neutralino] sessions.getSupportStatus not implemented');
      return { supported: true, status: 'full', isAvailable: true };
    },

    resume: async (_sessionId: string, _appType: string, _workingDir?: string): Promise<void> => {
      console.warn('[Neutralino] sessions.resume not implemented');
    },

    getTerminalInfo: async (): Promise<TerminalInfo> => {
      return { preferred: 'builtin', ghosttyInstalled: false, kittyInstalled: false };
    },
  };

  readonly settings = {
    get: async (): Promise<AppSettings> => {
      try {
        return await this.storage.get<AppSettings>('settings');
      } catch {
        return {
          language: 'en',
          theme: 'system',
          accentColor: 'default',
          autoStart: false,
          lightweightMode: false,
          defaultApp: null,
          collapseBashBlocks: true,
          enableTitleMarquee: false,
          showThinkingContent: true,
          sidebarCollapsed: false,
          preferredTerminal: 'auto',
        };
      }
    },

    update: async (settings: Partial<AppSettings>): Promise<void> => {
      const current = await this.settings.get();
      const updated = { ...current, ...settings };
      await this.storage.set('settings', updated);
    },

    reset: async (): Promise<void> => {
      await this.storage.delete('settings');
    },
  };

  readonly app = {
    getVersion: async (): Promise<string> => {
      if (typeof window !== 'undefined' && window.Neutralino) {
        const config = await window.Neutralino.app.getConfig();
        return config.version || '0.1.0';
      }
      return '0.1.0';
    },
  };

  readonly config = {
    export: async (): Promise<Record<string, unknown>> => {
      const settings = await this.settings.get();
      return { settings };
    },

    import: async (data: Record<string, unknown>): Promise<void> => {
      if (data.settings) {
        await this.settings.update(data.settings as Partial<AppSettings>);
      }
    },
  };

  readonly shell = {
    openExternal: async (url: string): Promise<void> => {
      if (typeof window !== 'undefined' && window.Neutralino) {
        await window.Neutralino.os.open(url);
      } else {
        window.open(url, '_blank');
      }
    },

    openPath: async (filePath: string): Promise<void> => {
      if (typeof window !== 'undefined' && window.Neutralino) {
        await window.Neutralino.os.open(filePath);
      }
    },
  };

  readonly filePreview = {
    open: async (_dirPath: string, _sessionTitle?: string, _appType?: string): Promise<void> => {
      console.warn('[Neutralino] filePreview.open not implemented');
    },
  };

  readonly file = {
    read: async (filePath: string): Promise<string> => {
      if (typeof window !== 'undefined' && window.Neutralino) {
        return window.Neutralino.filesystem.readFile(filePath);
      }
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
      console.warn('[Neutralino] git.getStatus not implemented');
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
      console.warn('[Neutralino] git.getDiff not implemented');
      return '';
    },

    getFileDiff: async (_dirPath: string, _filePath: string): Promise<GitFileDiffResult> => {
      console.warn('[Neutralino] git.getFileDiff not implemented');
      return { original: '', modified: '', hasChanges: false };
    },

    startWatching: async (_dirPath: string): Promise<void> => {
      console.warn('[Neutralino] git.startWatching not implemented');
    },

    stopWatching: async (): Promise<void> => {
      console.warn('[Neutralino] git.stopWatching not implemented');
    },

    onChange: (_callback: (dirPath: string) => void): (() => void) => {
      console.warn('[Neutralino] git.onChange not implemented');
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
      console.warn('[Neutralino] pty.write requires WebSocket');
    },

    resize: async (_sessionId: string, _cols: number, _rows: number): Promise<void> => {
      console.warn('[Neutralino] pty.resize requires WebSocket');
    },

    kill: async (_sessionId: string): Promise<void> => {
      console.warn('[Neutralino] pty.kill requires WebSocket');
    },

    onData: (sessionId: string, _callback: (data: string) => void): (() => void) => {
      console.warn('[Neutralino] pty.onData requires WebSocket');
      return () => {
        const ws = this.wsConnections.get(sessionId);
        if (ws) {
          ws.close();
          this.wsConnections.delete(sessionId);
        }
      };
    },

    onExit: (_sessionId: string, _callback: (exitCode: number) => void): (() => void) => {
      console.warn('[Neutralino] pty.onExit requires WebSocket');
      return () => {};
    },
  };

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.get('/health');
      return true;
    } catch (error) {
      console.error('[Neutralino] Health check failed:', error);
      return false;
    }
  }

  /**
   * Initialize Neutralino
   */
  async init(): Promise<void> {
    if (typeof window !== 'undefined' && window.Neutralino) {
      await window.Neutralino.init();
      
      window.Neutralino.events.on('windowClose', () => {
        this.stopRustService();
      });
    }
  }
}
