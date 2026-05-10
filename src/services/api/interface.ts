/**
 * API Interface - Abstract interface for backend implementations
 * 
 * This allows switching between Electron IPC, Rust HTTP API, or Neutralino APIs
 * without changing frontend code.
 */

import type {
  Session,
  SessionDetail,
  AppSettings,
  TreeNode,
  GitStatusResult,
  GitFileDiffResult,
  TerminalInfo,
} from './types';

/**
 * Backend Adapter Interface
 * 
 * All methods must be implemented by each adapter:
 * - ElectronAdapter: Uses window.electronAPI (current)
 * - RustAdapter: Uses HTTP fetch to localhost:3000 (future)
 * - NeutralinoAdapter: Uses Neutralino APIs + HTTP (future)
 */
export interface IBackendAdapter {
  // Sessions API
  sessions: {
    getAll(appType: string): Promise<Session[]>;
    getDetail(sessionId: string, appType: string): Promise<SessionDetail | null>;
    getStats(appType: string): Promise<{
      totalSessions: number;
      totalMessages: number;
      firstSessionDate?: number;
      lastSessionDate?: number;
    }>;
    getSupportStatus(appType: string): Promise<{
      supported: boolean;
      status: string;
      isAvailable: boolean;
      notAvailableReason?: string;
    }>;
    resume(sessionId: string, appType: string, workingDir?: string): Promise<void>;
    getTerminalInfo(): Promise<TerminalInfo>;
  };

  // Settings API
  settings: {
    get(): Promise<AppSettings>;
    update(settings: Partial<AppSettings>): Promise<void>;
    reset(): Promise<void>;
  };

  // App API
  app: {
    getVersion(): Promise<string>;
  };

  // Config API
  config: {
    export(): Promise<Record<string, unknown>>;
    import(data: Record<string, unknown>): Promise<void>;
  };

  // Shell API
  shell: {
    openExternal(url: string): Promise<void>;
    openPath(filePath: string): Promise<void>;
  };

  // File Preview API
  filePreview: {
    open(dirPath: string, sessionTitle?: string, appType?: string): Promise<void>;
  };

  // File API
  file: {
    read(filePath: string): Promise<string>;
    readImage(filePath: string): Promise<string>;
  };

  // Tree API
  tree: {
    getDirectoryTree(dirPath: string): Promise<TreeNode[]>;
  };

  // Git API
  git: {
    getStatus(dirPath: string): Promise<GitStatusResult>;
    getDiff(dirPath: string, filePath?: string): Promise<string>;
    getFileDiff(dirPath: string, filePath: string): Promise<GitFileDiffResult>;
    startWatching(dirPath: string): Promise<void>;
    stopWatching(): Promise<void>;
    onChange(callback: (dirPath: string) => void): () => void;
  };
}

/**
 * Storage Interface for settings persistence
 */
export interface IStorageAdapter {
  get<T>(key: string, defaultValue?: T): Promise<T>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}