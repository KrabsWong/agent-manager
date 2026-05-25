import type { ApiResponse, TreeNode } from '@/types';
import { extractData } from './core';

export const filePreviewApi = {
  open: async (dirPath: string, sessionTitle?: string): Promise<void> => {
    await window.electronAPI.invoke('file-preview:open', dirPath, sessionTitle);
  },
};

export const treeApi = {
  getDirectoryTree: async (dirPath: string): Promise<TreeNode[]> => {
    const response = (await window.electronAPI.invoke('tree:get', dirPath)) as ApiResponse<
      TreeNode[]
    >;
    return extractData(response);
  },
};

export const fileApi = {
  read: async (filePath: string): Promise<string> => {
    const response = (await window.electronAPI.invoke(
      'file:read',
      filePath
    )) as ApiResponse<string>;
    return extractData(response);
  },

  readImage: async (filePath: string): Promise<string> => {
    const response = (await window.electronAPI.invoke(
      'file:readImage',
      filePath
    )) as ApiResponse<string>;
    return extractData(response);
  },
};
