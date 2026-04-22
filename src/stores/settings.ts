import { create } from 'zustand';
import type { AppType } from '@/types';

interface SettingsState {
  defaultApp: AppType | null;
  setDefaultApp: (app: AppType | null) => void;
}

const getInitialDefaultApp = (): AppType | null => {
  if (typeof window !== 'undefined' && window.__INITIAL_SETTINGS__?.defaultApp) {
    return window.__INITIAL_SETTINGS__.defaultApp as AppType;
  }
  return null;
};

export const useSettingsStore = create<SettingsState>()((set) => ({
  defaultApp: getInitialDefaultApp(),

  setDefaultApp: async (app) => {
    set({ defaultApp: app });
    
    try {
      await window.electronAPI.invoke('settings:update', { defaultApp: app });
      console.log('[SettingsStore] Saved defaultApp:', app);
    } catch (error) {
      console.error('[SettingsStore] Failed to save defaultApp:', error);
    }
  },
}));
