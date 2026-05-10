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
        execCommand: (command: string, options?: {
          background?: boolean;
          cwd?: string;
          envs?: Record<string, string>;
        }) => Promise<{ pid: number; stdOut: string; stdErr: string; exitCode: number }>;
        spawnProcess: (command: string, options?: {
          cwd?: string;
          envs?: Record<string, string>;
        }) => Promise<{ id: number; pid: number }>;
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
        console.log(`[Neutralino Storage] Loaded ${key}:`, value);
        return value;
      }
    } catch (error) {
      console.warn(`[Neutralino Storage] Key "${key}" not found, using default`);
    }

    if (defaultValue !== undefined) {
      this.cache.set(key, defaultValue);
      return defaultValue;
    }

    throw new Error(`Storage key "${key}" not found`);
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.cache.set(key, value);

    try {
      if (typeof window !== 'undefined' && window.Neutralino) {
        const jsonValue = JSON.stringify(value);
        await window.Neutralino.storage.setData(key, jsonValue);
        console.log(`[Neutralino Storage] Saved ${key}:`, value);
      } else {
        console.warn('[Neutralino Storage] Neutralino not available, data only in cache');
      }
    } catch (error) {
      console.error(`[Neutralino Storage] Failed to save ${key}:`, error);
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
    try {
      if (typeof window !== 'undefined' && window.Neutralino) {
        await window.Neutralino.storage.setData(key, '');
      }
    } catch (error) {
      console.warn(`[Neutralino Storage] Failed to delete ${key}:`, error);
    }
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }
}

function getResumeCommand(appType: string, sessionId: string): string {
  switch (appType) {
    case 'claude':
    case 'claude-internal':
      return `claude --resume ${sessionId}`;
    case 'opencode':
      return `opencode -s ${sessionId}`;
    case 'codebuddy':
      return `codebuddy --resume ${sessionId}`;
    default:
      return '';
  }
}

async function checkCommandExists(command: string): Promise<boolean> {
  if (typeof window !== 'undefined' && window.Neutralino) {
    try {
      const result = await window.Neutralino.os.execCommand(`which ${command} || ls /Applications/Ghostty.app 2>/dev/null`);
      return result.exitCode === 0 && (result.stdOut.trim().length > 0 || result.stdErr.trim().length > 0);
    } catch {
      return false;
    }
  }
  return false;
}

async function resolveTerminal(preferred: string): Promise<'ghostty' | 'kitty' | 'terminal'> {
  if (preferred !== 'auto') {
    if (preferred === 'ghostty') {
      const exists = await checkCommandExists('ghostty');
      if (!exists) {
        console.warn('[Neutralino] Ghostty not found, falling back to Terminal.app');
        return 'terminal';
      }
    } else if (preferred === 'kitty') {
      const exists = await checkCommandExists('kitty');
      if (!exists) {
        console.warn('[Neutralino] Kitty not found, falling back to Terminal.app');
        return 'terminal';
      }
    }
    return preferred as 'ghostty' | 'kitty' | 'terminal';
  }

  const ghosttyInstalled = await checkCommandExists('ghostty');
  if (ghosttyInstalled) {
    return 'ghostty';
  }

  const kittyInstalled = await checkCommandExists('kitty');
  if (kittyInstalled) {
    return 'kitty';
  }

  return 'terminal';
}

function buildTerminalCommand(terminal: 'ghostty' | 'kitty' | 'terminal', command: string, workingDir?: string): string {
  switch (terminal) {
    case 'ghostty': {
      // Ghostty's -e parameter needs a shell wrapper for complex commands with cd
      let shellCommand = command;
      if (workingDir) {
        // Escape single quotes in working directory
        const escapedDir = workingDir.replace(/'/g, "'\\''");
        shellCommand = `cd '${escapedDir}' && ${command}`;
      }
      // Wrap command in shell - use sh -c with double quotes for proper parsing
      const escapedShellCommand = shellCommand.replace(/"/g, '\\"');
      return `ghostty -e sh -c "${escapedShellCommand}"`;
    }
      
    case 'kitty':
      if (workingDir) {
        return `kitty --directory="${workingDir}" ${command}`;
      }
      return `kitty ${command}`;
      
    case 'terminal':
    default: {
      const escapedCommand = command.replace(/"/g, '\\"').replace(/'/g, "'\\''");
      if (workingDir) {
        const workingDirEscaped = workingDir.replace(/'/g, "'\\''");
        return `osascript -e 'tell application "Terminal" to do script "cd '${workingDirEscaped}' && ${escapedCommand}"'`;
      }
      return `osascript -e 'tell application "Terminal" to do script "${escapedCommand}"'`;
    }
  }
}

/**
 * Neutralino Backend Adapter
 */
export class NeutralinoBackendAdapter implements IBackendAdapter {
  private client: RustHttpClient;
  private storage: NeutralinoStorageAdapter;
  private rustServicePid: number | null = null;

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

    resume: async (sessionId: string, appType: string, workingDir?: string): Promise<void> => {
      try {
        const settings = await this.settings.get();
        const preferredTerminal = settings.preferredTerminal || 'auto';
        
        const resumeCommand = getResumeCommand(appType, sessionId);
        if (!resumeCommand) {
          console.warn(`[Neutralino] Resume not supported for app type: ${appType}`);
          return;
        }

        const terminal = await resolveTerminal(preferredTerminal);
        const fullCommand = buildTerminalCommand(terminal, resumeCommand, workingDir);
        
        console.log(`[Neutralino] Resuming session: ${fullCommand}`);
        
        if (typeof window !== 'undefined' && window.Neutralino) {
          await window.Neutralino.os.execCommand(fullCommand, { background: true });
        }
      } catch (error) {
        console.error('[Neutralino] Failed to resume session:', error);
        throw error;
      }
    },

    getTerminalInfo: async (): Promise<TerminalInfo> => {
      try {
        const settings = await this.settings.get();
        const userPreferred = settings.preferredTerminal || 'auto';
        
        let ghosttyInstalled = false;
        let kittyInstalled = false;
        
        if (typeof window !== 'undefined' && window.Neutralino) {
          try {
            const ghosttyResult = await window.Neutralino.os.execCommand('which ghostty || ls /Applications/Ghostty.app 2>/dev/null');
            ghosttyInstalled = ghosttyResult.exitCode === 0 && ghosttyResult.stdOut.trim().length > 0;
          } catch {
            ghosttyInstalled = false;
          }
          
          try {
            const kittyResult = await window.Neutralino.os.execCommand('which kitty');
            kittyInstalled = kittyResult.exitCode === 0;
          } catch {
            kittyInstalled = false;
          }
        }
        
        return {
          preferred: userPreferred as TerminalInfo['preferred'],
          ghosttyInstalled,
          kittyInstalled,
        };
      } catch (error) {
        console.error('[Neutralino] Failed to get terminal info:', error);
        return { preferred: 'auto', ghosttyInstalled: false, kittyInstalled: false };
      }
    },
  };

  readonly settings = {
    get: async (): Promise<AppSettings> => {
      try {
        const settings = await this.storage.get<AppSettings>('settings');
        return {
          language: settings.language || 'en',
          theme: settings.theme || 'system',
          accentColor: settings.accentColor || 'default',
          autoStart: settings.autoStart ?? false,
          lightweightMode: settings.lightweightMode ?? false,
          defaultApp: settings.defaultApp || null,
          collapseBashBlocks: settings.collapseBashBlocks ?? true,
          enableTitleMarquee: settings.enableTitleMarquee ?? false,
          showThinkingContent: settings.showThinkingContent ?? true,
          sidebarCollapsed: settings.sidebarCollapsed ?? false,
          preferredTerminal: settings.preferredTerminal || 'auto',
        };
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
      console.log('[Neutralino] Settings saved:', updated);
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
    open: async (dirPath: string, sessionTitle?: string, appType?: string): Promise<void> => {
      try {
        if (typeof window !== 'undefined' && window.Neutralino) {
          const neutralino = window.Neutralino as any; // Temporary: TypeScript cannot infer window property
          const settings = await this.settings.get();
          const theme = settings.theme || 'system';
          const accentColor = settings.accentColor || 'default';

          const params = new URLSearchParams();
          params.set('dir', dirPath);
          if (sessionTitle) params.set('session', sessionTitle);
          if (appType) params.set('app', appType);
          params.set('theme', theme);
          params.set('accentColor', accentColor);

          const url = `/resources/file-preview.html?${params.toString()}`;

          await neutralino.window.create(url, {
            title: sessionTitle || 'File Preview',
            width: 1400,
            height: 800,
            minWidth: 900,
            minHeight: 600,
            enableInspector: process.env.NODE_ENV === 'development',
          });
        }
      } catch (error) {
        console.error('[Neutralino] Failed to open file preview:', error);
        throw error;
      }
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
