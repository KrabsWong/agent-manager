import { create } from 'zustand';
import type { AppType } from '@/types';
import { globalSettings } from '@/main';

interface SettingsState {
  defaultApp: AppType | null;
  setDefaultApp: (app: AppType | null) => void;
}

// Use global settings if available, otherwise null
const initialDefaultApp = globalSettings?.defaultApp || null;

export const useSettingsStore = create<SettingsState>()((set) => ({
  defaultApp: initialDefaultApp,

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
