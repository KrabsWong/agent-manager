import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppType } from '@/types';

interface SettingsState {
  // 默认展示的应用
  defaultApp: AppType | null;
  // 设置默认应用
  setDefaultApp: (app: AppType | null) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      defaultApp: null, // 默认未选择，将按顺序展示第一个
      setDefaultApp: (app) => set({ defaultApp: app }),
    }),
    {
      name: 'settings-storage',
    }
  )
);
