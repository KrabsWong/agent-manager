/**
 * API Layer - Frontend IPC Wrappers
 *
 * Provides type-safe wrappers around electronAPI.invoke
 */

import type { ApiResponse, AppSettings, Session, SessionDetail } from '@/types';

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
    preferred: 'ghostty' | 'kitty' | 'terminal';
    ghosttyInstalled: boolean;
    kittyInstalled: boolean;
  }> => {
    const response = (await window.electronAPI.invoke('sessions:getTerminalInfo')) as ApiResponse<{
      preferred: 'ghostty' | 'kitty' | 'terminal';
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

// Export all APIs
export const api = {
  sessions: sessionsApi,
  settings: settingsApi,
  app: appApi,
  config: configApi,
  shell: shellApi,
  tree: treeApi,
};
