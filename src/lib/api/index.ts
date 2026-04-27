/**
 * API Layer - Frontend IPC Wrappers
 *
 * Provides type-safe wrappers around electronAPI.invoke
 */

import type { ApiResponse, AppSettings, Session, SessionDetail } from '@/types';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';

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
 * Extract data from API response or throw error (for void operations)
 */
function extractVoid(response: ApiResponse<void>): void {
  if (!response.success) {
    throw new Error(response.error?.message || 'Unknown error');
  }
}

/**
 * Sessions API
 */
export const sessionsApi = {
  getAll: async (appType: string): Promise<Session[]> => {
    const response = (await window.electronAPI.invoke('sessions:getAll', appType)) as ApiResponse<
      Session[]
    >;
    return extractData(response);
  },

  getDetail: async (sessionId: string, appType: string): Promise<SessionDetail | null> => {
    const response = (await window.electronAPI.invoke(
      'sessions:getDetail',
      sessionId,
      appType
    )) as ApiResponse<SessionDetail | null>;
    return extractData(response);
  },

  getStats: async (
    appType: string
  ): Promise<{
    totalSessions: number;
    totalMessages: number;
    firstSessionDate?: number;
    lastSessionDate?: number;
  }> => {
    const response = (await window.electronAPI.invoke(
      'sessions:getStats',
      appType
    )) as ApiResponse<{
      totalSessions: number;
      totalMessages: number;
      firstSessionDate?: number;
      lastSessionDate?: number;
    }>;
    return extractData(response);
  },

  getSupportStatus: async (
    appType: string
  ): Promise<{
    supported: boolean;
    status: string;
    isAvailable: boolean;
    notAvailableReason?: string;
  }> => {
    const response = (await window.electronAPI.invoke(
      'sessions:getSupportStatus',
      appType
    )) as ApiResponse<{
      supported: boolean;
      status: string;
      isAvailable: boolean;
      notAvailableReason?: string;
    }>;
    return extractData(response);
  },

  resume: async (sessionId: string, appType: string, workingDir?: string): Promise<void> => {
    const response = (await window.electronAPI.invoke(
      'sessions:resume',
      sessionId,
      appType,
      workingDir
    )) as ApiResponse<void>;
    return extractData(response);
  },

  getTerminalInfo: async (): Promise<{
    preferred: 'auto' | 'ghostty' | 'kitty' | 'terminal' | 'builtin';
    ghosttyInstalled: boolean;
    kittyInstalled: boolean;
  }> => {
    const response = (await window.electronAPI.invoke('sessions:getTerminalInfo')) as ApiResponse<{
      preferred: 'auto' | 'ghostty' | 'kitty' | 'terminal' | 'builtin';
      ghosttyInstalled: boolean;
      kittyInstalled: boolean;
    }>;
    return extractData(response);
  },
};

/**
 * Settings API
 */
export const settingsApi = {
  get: async (): Promise<AppSettings> => {
    const response = (await window.electronAPI.invoke('settings:get')) as ApiResponse<AppSettings>;
    return extractData(response);
  },

  update: async (settings: Partial<AppSettings>): Promise<void> => {
    const response = (await window.electronAPI.invoke(
      'settings:update',
      settings
    )) as ApiResponse<void>;
    return extractVoid(response);
  },

  reset: async (): Promise<void> => {
    const response = (await window.electronAPI.invoke('settings:reset')) as ApiResponse<void>;
    return extractData(response);
  },
};

/**
 * App API
 */
export const appApi = {
  getVersion: async (): Promise<string> => {
    const response = (await window.electronAPI.invoke('app:getVersion')) as ApiResponse<string>;
    return extractData(response);
  },
};

/**
 * Config Import/Export API
 */
export const configApi = {
  export: async (): Promise<Record<string, unknown>> => {
    const response = (await window.electronAPI.invoke('config:export')) as ApiResponse<
      Record<string, unknown>
    >;
    return extractData(response);
  },

  import: async (data: Record<string, unknown>): Promise<void> => {
    const response = (await window.electronAPI.invoke('config:import', data)) as ApiResponse<void>;
    return extractData(response);
  },
};

/**
 * Shell API
 */
export const shellApi = {
  openExternal: async (url: string): Promise<void> => {
    await window.electronAPI.invoke('shell:openExternal', url);
  },
  openPath: async (filePath: string): Promise<void> => {
    await window.electronAPI.invoke('shell:openPath', filePath);
  },
};

/**
 * File Preview API
 */
export const filePreviewApi = {
  open: async (dirPath: string, sessionTitle?: string, appType?: string): Promise<void> => {
    await window.electronAPI.invoke('file-preview:open', dirPath, sessionTitle, appType);
  },
};

// Tree API types
export interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: TreeNode[];
}

/**
 * Tree API
 */
export const treeApi = {
  getDirectoryTree: async (dirPath: string): Promise<TreeNode[]> => {
    const response = (await window.electronAPI.invoke('tree:get', dirPath)) as {
      success: boolean;
      data?: TreeNode[];
      error?: string;
    };
    if (!response.success) {
      throw new Error(response.error || 'Failed to get directory tree');
    }
    return response.data || [];
  },
};

/**
 * File API
 */
export const fileApi = {
  read: async (filePath: string): Promise<string> => {
    const response = (await window.electronAPI.invoke('file:read', filePath)) as {
      success: boolean;
      data?: string;
      error?: { message: string };
    };
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to read file');
    }
    return response.data || '';
  },
  readImage: async (filePath: string): Promise<string> => {
    const response = (await window.electronAPI.invoke('file:readImage', filePath)) as {
      success: boolean;
      data?: string;
      error?: { message: string };
    };
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to read image');
    }
    return response.data || '';
  },
};

// Git API types
export interface GitFileChange {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed' | 'untracked' | 'unknown';
  additions: number;
  deletions: number;
}

export interface GitStatusResult {
  isGitRepo: boolean;
  branch: string;
  ahead: number;
  behind: number;
  staged: GitFileChange[];
  unstaged: GitFileChange[];
  untracked: GitFileChange[];
}

export interface GitFileDiffResult {
  original: string;
  modified: string;
  hasChanges: boolean;
}

/**
 * Git API
 */
export const gitApi = {
  getStatus: async (dirPath: string): Promise<GitStatusResult> => {
    const response = (await window.electronAPI.invoke(
      'git:status',
      dirPath
    )) as ApiResponse<GitStatusResult>;
    return extractData(response);
  },

  getDiff: async (dirPath: string, filePath?: string): Promise<string> => {
    const response = (await window.electronAPI.invoke(
      'git:diff',
      dirPath,
      filePath
    )) as ApiResponse<string>;
    return extractData(response);
  },

  getFileDiff: async (dirPath: string, filePath: string): Promise<GitFileDiffResult> => {
    const response = (await window.electronAPI.invoke(
      'git:fileDiff',
      dirPath,
      filePath
    )) as ApiResponse<GitFileDiffResult>;
    return extractData(response);
  },

  startWatching: async (dirPath: string): Promise<void> => {
    const response = (await window.electronAPI.invoke(
      'git:watch:start',
      dirPath
    )) as ApiResponse<void>;
    return extractVoid(response);
  },

  stopWatching: async (): Promise<void> => {
    const response = (await window.electronAPI.invoke('git:watch:stop')) as ApiResponse<void>;
    return extractVoid(response);
  },

  onChange: (callback: (dirPath: string) => void): (() => void) => {
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

/**
 * PTY Terminal API
 */
export interface PTYSession {
  id: string;
  terminal: Terminal;
  fitAddon: FitAddon;
}

class PTYAPI {
  private sessions: Map<string, PTYSession> = new Map();

  /**
   * Create a new PTY session
   */
  async create(sessionId: string, cwd?: string): Promise<PTYSession | null> {
    try {
      const response = (await window.electronAPI.invoke('pty:create', sessionId, { cwd })) as {
        success: boolean;
        sessionId?: string;
        shell?: string;
        error?: string;
      };

      if (!response.success) {
        throw new Error(response.error || 'Failed to create PTY session');
      }

      // Create xterm terminal with scrollback buffer
      const terminal = new Terminal({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        scrollback: 10000,
        allowProposedApi: true,
        convertEol: true,  // Convert \n to \r\n
        theme: {
          background: '#1a1a1a',
          foreground: '#f0f0f0',
          cursor: '#f0f0f0',
          selectionBackground: '#404040',
          black: '#000000',
          red: '#e06c75',
          green: '#98c379',
          yellow: '#d19a66',
          blue: '#61afef',
          magenta: '#c678dd',
          cyan: '#56b6c2',
          white: '#abb2bf',
          brightBlack: '#5c6370',
          brightRed: '#e06c75',
          brightGreen: '#98c379',
          brightYellow: '#d19a66',
          brightBlue: '#61afef',
          brightMagenta: '#c678dd',
          brightCyan: '#56b6c2',
          brightWhite: '#ffffff',
        },
      });

      const fitAddon = new FitAddon();
      terminal.loadAddon(fitAddon);

      const session: PTYSession = {
        id: sessionId,
        terminal,
        fitAddon,
      };

      this.sessions.set(sessionId, session);

      // Listen for data from PTY
      const dataHandler = (...args: unknown[]) => {
        const data = args[0] as { sessionId: string; data: string };
        if (data.sessionId === sessionId) {
          terminal.write(data.data);
        }
      };

      window.electronAPI.on('pty:data', dataHandler);

      // Listen for PTY exit
      const exitHandler = (...args: unknown[]) => {
        const data = args[0] as { sessionId: string; exitCode: number; signal?: number };
        if (data.sessionId === sessionId) {
          terminal.writeln(`\r\n\x1b[31mProcess exited with code ${data.exitCode}\x1b[0m`);
          this.sessions.delete(sessionId);
        }
      };

      window.electronAPI.on('pty:exit', exitHandler);

      // Handle input from terminal
      terminal.onData((data) => {
        this.write(sessionId, data);
      });

      return session;
    } catch (error) {
      console.error('Failed to create PTY session:', error);
      return null;
    }
  }

  /**
   * Write data to PTY
   */
  async write(sessionId: string, data: string): Promise<void> {
    await window.electronAPI.invoke('pty:write', sessionId, data);
  }

  /**
   * Resize PTY
   */
  async resize(sessionId: string, cols: number, rows: number): Promise<void> {
    await window.electronAPI.invoke('pty:resize', sessionId, cols, rows);
  }

  /**
   * Kill PTY session
   */
  async kill(sessionId: string): Promise<void> {
    await window.electronAPI.invoke('pty:kill', sessionId);
    this.sessions.delete(sessionId);
  }

  /**
   * Get session
   */
  getSession(sessionId: string): PTYSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Check if session exists
   */
  hasSession(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }
}

export const ptyApi = new PTYAPI();

// Export all APIs
export const api = {
  sessions: sessionsApi,
  settings: settingsApi,
  app: appApi,
  config: configApi,
  shell: shellApi,
  filePreview: filePreviewApi,
  file: fileApi,
  tree: treeApi,
  git: gitApi,
  pty: ptyApi,
};
