import type { ApiResponse, AppSettings } from '@/types';
import { extractData, extractVoid } from './core';

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
