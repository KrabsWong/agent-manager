import type { ApiResponse } from '@/types';
import { extractData } from './core';

export const appApi = {
  getVersion: async (): Promise<string> => {
    const response = (await window.electronAPI.invoke('app:getVersion')) as ApiResponse<string>;
    return extractData(response);
  },
};
