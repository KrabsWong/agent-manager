import type { ApiResponse, GitFileDiffResult, GitStatusResult } from '@/types';
import { extractData, extractVoid } from './core';

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
