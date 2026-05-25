/**
 * Unified Settings Store
 *
 * 合并所有设置状态管理：
 * - 原 settings.ts: defaultApp
 * - 原 experience.ts: enableTitleMarquee, collapseBashBlocks, showThinkingContent
 * - 原 ThemeProvider: theme, accentColor
 */

import { create } from 'zustand';
import type { AppType, AppSettings, AccentColor } from '@/types';
import { normalizeAppSettings } from '@/lib/settings/migration';

export type Theme = AppSettings['theme'];

type SettingsStoreFields = Pick<
  AppSettings,
  | 'defaultApp'
  | 'enableTitleMarquee'
  | 'collapseBashBlocks'
  | 'showThinkingContent'
  | 'chatLayout'
  | 'theme'
  | 'accentColor'
  | 'sidebarCollapsed'
>;

interface SettingsActions {
  // ============ Actions ============
  // 通用更新方法
  updateSetting: <K extends keyof SettingsStoreFields>(
    key: K,
    value: SettingsStoreFields[K]
  ) => Promise<void>;

  // 原 settings actions
  setDefaultApp: (app: AppType | null) => Promise<void>;

  // 原 experience actions
  toggleTitleMarquee: () => Promise<void>;
  setTitleMarquee: (enabled: boolean) => Promise<void>;
  toggleCollapseBashBlocks: () => Promise<void>;
  setCollapseBashBlocks: (enabled: boolean) => Promise<void>;
  toggleShowThinkingContent: () => Promise<void>;
  setShowThinkingContent: (enabled: boolean) => Promise<void>;

  // 对话布局 actions
  setChatLayout: (layout: 'left' | 'bubble') => Promise<void>;
  toggleChatLayout: () => Promise<void>;

  // 原 ThemeProvider actions
  setTheme: (theme: Theme) => Promise<void>;
  toggleTheme: () => Promise<void>;
  setAccentColor: (color: AccentColor) => Promise<void>;
  resetAccentColor: () => Promise<void>;

  // Sidebar actions
  toggleSidebar: () => Promise<void>;
  setSidebarCollapsed: (collapsed: boolean) => Promise<void>;
}

type SettingsState = SettingsStoreFields & SettingsActions;

// 从 __INITIAL_SETTINGS__ 获取初始值
const getInitialSettings = (): SettingsStoreFields => {
  const s = normalizeAppSettings(
    typeof window !== 'undefined' && window.__INITIAL_SETTINGS__ ? window.__INITIAL_SETTINGS__ : {}
  );

  return {
    // 原 settings
    defaultApp: s.defaultApp,
    // 原 experience
    enableTitleMarquee: s.enableTitleMarquee,
    collapseBashBlocks: s.collapseBashBlocks,
    showThinkingContent: s.showThinkingContent,
    // 对话布局
    chatLayout: s.chatLayout,
    // 原 ThemeProvider
    theme: s.theme,
    accentColor: s.accentColor,
    // Sidebar
    sidebarCollapsed: s.sidebarCollapsed,
  };
};

// 同步到主进程
const syncToMain = async (key: string, value: unknown): Promise<void> => {
  try {
    await window.electronAPI.invoke('settings:update', { [key]: value });
  } catch (error) {
    console.error('[SettingsStore] Failed to save', key, ':', error);
  }
};

const initialSettings = getInitialSettings();

export const useSettingsStore = create<SettingsState>()((set, get) => ({
  // ============ State ============
  defaultApp: initialSettings.defaultApp ?? null,
  enableTitleMarquee: initialSettings.enableTitleMarquee ?? false,
  collapseBashBlocks: initialSettings.collapseBashBlocks ?? true,
  showThinkingContent: initialSettings.showThinkingContent ?? true,
  chatLayout: initialSettings.chatLayout ?? 'left',
  theme: initialSettings.theme ?? 'system',
  accentColor: initialSettings.accentColor ?? 'default',
  sidebarCollapsed: initialSettings.sidebarCollapsed ?? false,

  // ============ 通用更新方法 ============
  updateSetting: async <K extends keyof SettingsStoreFields>(
    key: K,
    value: SettingsStoreFields[K]
  ) => {
    set({ [key]: value } as Partial<SettingsState>);
    await syncToMain(key as string, value);
  },

  // ============ 原 settings actions ============
  setDefaultApp: async (app) => {
    set({ defaultApp: app });
    await syncToMain('defaultApp', app);
  },

  // ============ 原 experience actions ============
  toggleTitleMarquee: async () => {
    const newValue = !get().enableTitleMarquee;
    set({ enableTitleMarquee: newValue });
    await syncToMain('enableTitleMarquee', newValue);
  },

  setTitleMarquee: async (enabled) => {
    set({ enableTitleMarquee: enabled });
    await syncToMain('enableTitleMarquee', enabled);
  },

  toggleCollapseBashBlocks: async () => {
    const newValue = !get().collapseBashBlocks;
    set({ collapseBashBlocks: newValue });
    await syncToMain('collapseBashBlocks', newValue);
  },

  setCollapseBashBlocks: async (enabled) => {
    set({ collapseBashBlocks: enabled });
    await syncToMain('collapseBashBlocks', enabled);
  },

  toggleShowThinkingContent: async () => {
    const newValue = !get().showThinkingContent;
    set({ showThinkingContent: newValue });
    await syncToMain('showThinkingContent', newValue);
  },

  setShowThinkingContent: async (enabled) => {
    set({ showThinkingContent: enabled });
    await syncToMain('showThinkingContent', enabled);
  },

  // ============ 对话布局 Actions ============
  setChatLayout: async (layout) => {
    set({ chatLayout: layout });
    await syncToMain('chatLayout', layout);
  },

  toggleChatLayout: async () => {
    const newValue = get().chatLayout === 'left' ? 'bubble' : 'left';
    set({ chatLayout: newValue });
    await syncToMain('chatLayout', newValue);
  },

  // ============ 原 ThemeProvider actions ============
  setTheme: async (theme) => {
    set({ theme });
    await syncToMain('theme', theme);
  },

  toggleTheme: async () => {
    const themes: Theme[] = ['light', 'dark', 'system'];
    const currentTheme = get().theme;
    const currentIndex = themes.indexOf(currentTheme);
    const nextTheme = themes[(currentIndex + 1) % themes.length];
    set({ theme: nextTheme });
    await syncToMain('theme', nextTheme);
  },

  setAccentColor: async (color) => {
    set({ accentColor: color });
    await syncToMain('accentColor', color);
  },

  resetAccentColor: async () => {
    set({ accentColor: 'default' });
    await syncToMain('accentColor', 'default');
  },

  // ============ Sidebar Actions ============
  toggleSidebar: async () => {
    const newValue = !get().sidebarCollapsed;
    set({ sidebarCollapsed: newValue });
    await syncToMain('sidebarCollapsed', newValue);
  },

  setSidebarCollapsed: async (collapsed) => {
    set({ sidebarCollapsed: collapsed });
    await syncToMain('sidebarCollapsed', collapsed);
  },
}));
