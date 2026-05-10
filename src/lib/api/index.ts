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
};

/**
 * Export new backend adapter API (for future use)
 */
export { getApi, getStorage, switchBackend, getCurrentBackend } from '@/services/api/index';
export type { IBackendAdapter, IStorageAdapter } from '@/services/api/interface';
export type { BackendType } from '@/services/api/index';