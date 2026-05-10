/**
 * API Layer - Frontend IPC Wrappers (Backward Compatible)
 *
 * This file provides the same API interface as before, but now delegates to
 * the backend adapter system. Existing components don't need to change.
 *
 * Migration path:
 * Phase 1: Keep this file, delegate to adapter
 * Phase 2: Gradually migrate components to use getApi() directly
 * Phase 3: Deprecate this file after full migration
 */

import type { AppSettings, Session, SessionDetail } from '@/types';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { getApi } from '@/services/api';

/**
 * Sessions API - delegates to backend adapter
 */
export const sessionsApi = {
  getAll: async (appType: string): Promise<Session[]> => {
    return getApi().sessions.getAll(appType);
  },

  getDetail: async (sessionId: string, appType: string): Promise<SessionDetail | null> => {
    return getApi().sessions.getDetail(sessionId, appType);
  },

  getStats: async (appType: string) => {
    return getApi().sessions.getStats(appType);
  },

  getSupportStatus: async (appType: string) => {
    return getApi().sessions.getSupportStatus(appType);
  },

  resume: async (sessionId: string, appType: string, workingDir?: string): Promise<void> => {
    return getApi().sessions.resume(sessionId, appType, workingDir);
  },

  getTerminalInfo: async () => {
    return getApi().sessions.getTerminalInfo();
  },
};

/**
 * Settings API - delegates to backend adapter
 */
export const settingsApi = {
  get: async (): Promise<AppSettings> => {
    return getApi().settings.get();
  },

  update: async (settings: Partial<AppSettings>): Promise<void> => {
    return getApi().settings.update(settings);
  },

  reset: async (): Promise<void> => {
    return getApi().settings.reset();
  },
};

/**
 * App API - delegates to backend adapter
 */
export const appApi = {
  getVersion: async (): Promise<string> => {
    return getApi().app.getVersion();
  },
};

/**
 * Config API - delegates to backend adapter
 */
export const configApi = {
  export: async (): Promise<Record<string, unknown>> => {
    return getApi().config.export();
  },

  import: async (data: Record<string, unknown>): Promise<void> => {
    return getApi().config.import(data);
  },
};

/**
 * Shell API - delegates to backend adapter
 */
export const shellApi = {
  openExternal: async (url: string): Promise<void> => {
    return getApi().shell.openExternal(url);
  },

  openPath: async (filePath: string): Promise<void> => {
    return getApi().shell.openPath(filePath);
  },
};

/**
 * File Preview API - delegates to backend adapter
 */
export const filePreviewApi = {
  open: async (dirPath: string, sessionTitle?: string, appType?: string): Promise<void> => {
    return getApi().filePreview.open(dirPath, sessionTitle, appType);
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
 * Tree API - delegates to backend adapter
 */
export const treeApi = {
  getDirectoryTree: async (dirPath: string): Promise<TreeNode[]> => {
    return getApi().tree.getDirectoryTree(dirPath);
  },
};

/**
 * File API - delegates to backend adapter
 */
export const fileApi = {
  read: async (filePath: string): Promise<string> => {
    return getApi().file.read(filePath);
  },

  readImage: async (filePath: string): Promise<string> => {
    return getApi().file.readImage(filePath);
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
 * Git API - delegates to backend adapter
 */
export const gitApi = {
  getStatus: async (dirPath: string): Promise<GitStatusResult> => {
    return getApi().git.getStatus(dirPath);
  },

  getDiff: async (dirPath: string, filePath?: string): Promise<string> => {
    return getApi().git.getDiff(dirPath, filePath);
  },

  getFileDiff: async (dirPath: string, filePath: string): Promise<GitFileDiffResult> => {
    return getApi().git.getFileDiff(dirPath, filePath);
  },

  startWatching: async (dirPath: string): Promise<void> => {
    return getApi().git.startWatching(dirPath);
  },

  stopWatching: async (): Promise<void> => {
    return getApi().git.stopWatching();
  },

  onChange: (callback: (dirPath: string) => void): (() => void) => {
    return getApi().git.onChange(callback);
  },
};

/**
 * PTY Terminal API - delegates to backend adapter
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
      const api = getApi();
      await api.pty.create(sessionId, { cwd });

      // Create xterm terminal with scrollback buffer
      const terminal = new Terminal({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        scrollback: 10000,
        allowProposedApi: true,
        convertEol: true,
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
      const cleanup = api.pty.onData(sessionId, (data: string) => {
        terminal.write(data);
      });

      // Listen for PTY exit
      api.pty.onExit(sessionId, (exitCode: number) => {
        terminal.writeln(`\r\n\x1b[31mProcess exited with code ${exitCode}\x1b[0m`);
        this.sessions.delete(sessionId);
        cleanup();
      });

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
    await getApi().pty.write(sessionId, data);
  }

  /**
   * Resize PTY
   */
  async resize(sessionId: string, cols: number, rows: number): Promise<void> {
    await getApi().pty.resize(sessionId, cols, rows);
  }

  /**
   * Kill PTY session
   */
  async kill(sessionId: string): Promise<void> {
    await getApi().pty.kill(sessionId);
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

/**
 * Export unified API object (for compatibility)
 */
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

/**
 * Export new backend adapter API (for future use)
 */
export { getApi, getStorage, switchBackend, getCurrentBackend } from '@/services/api/index';
export type { IBackendAdapter, IStorageAdapter } from '@/services/api/interface';
export type { BackendType } from '@/services/api/index';