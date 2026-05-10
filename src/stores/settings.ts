/**
 * Unified Settings Store
 *
 * 合并所有设置状态管理：
 * - 原 settings.ts: defaultApp
 * - 原 experience.ts: enableTitleMarquee, collapseBashBlocks, showThinkingContent
 * - 原 ThemeProvider: theme, accentColor
 */

import { create } from 'zustand';
import type { AppType, AppSettings } from '@/types';
import type { AccentColor } from '@/lib/theme/colors';
import { defaultAccentColor } from '@/lib/theme/colors';

export type Theme = AppSettings['theme'];

interface SettingsState {
  // ============ 原 settings.ts ============
  defaultApp: AppType | null;

  // ============ 原 experience.ts ============
  enableTitleMarquee: boolean;
  collapseBashBlocks: boolean;
  showThinkingContent: boolean;

  // ============ 对话布局 ============
  chatLayout: 'left' | 'bubble';

  // ============ 原 ThemeProvider ============
  theme: Theme;
  accentColor: AccentColor;

  // ============ Sidebar ============
  sidebarCollapsed: boolean;

  // ============ Terminal ============
  preferredTerminal: 'auto' | 'ghostty' | 'kitty' | 'terminal';

  // ============ Actions ============
  // 通用更新方法
  updateSettings: (settings: Partial<SettingsState>) => Promise<void>;
  updateSetting: <K extends keyof SettingsState>(
    key: K,
    value: SettingsState[K]
  ) => Promise<void>;
  settings: AppSettings;

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

  // Terminal actions
  setPreferredTerminal: (terminal: 'auto' | 'ghostty' | 'kitty' | 'terminal') => Promise<void>;
}

// 从 __INITIAL_SETTINGS__ 获取初始值
const getInitialSettings = (): Partial<SettingsState> => {
  if (typeof window !== 'undefined' && window.__INITIAL_SETTINGS__) {
    const s = window.__INITIAL_SETTINGS__;
    return {
      // 原 settings
      defaultApp: (s.defaultApp as AppType) || null,
      // 原 experience
      enableTitleMarquee: s.enableTitleMarquee ?? false,
      collapseBashBlocks: s.collapseBashBlocks ?? true,
      showThinkingContent: s.showThinkingContent ?? true,
      // 对话布局
      chatLayout: s.chatLayout ?? 'left',
      // 原 ThemeProvider
      theme: (s.theme as Theme) || 'system',
      accentColor: (s.accentColor as AccentColor) || defaultAccentColor,
      // Sidebar
      sidebarCollapsed: s.sidebarCollapsed ?? false,
      // Terminal
      preferredTerminal: (s.preferredTerminal as 'auto' | 'ghostty' | 'kitty' | 'terminal') || 'auto',
    };
  }
  return {
    defaultApp: null,
    enableTitleMarquee: false,
    collapseBashBlocks: true,
    showThinkingContent: true,
    chatLayout: 'left',
    theme: 'system',
    accentColor: defaultAccentColor,
    sidebarCollapsed: false,
    preferredTerminal: 'auto',
  };
};

// 同步到主进程
const syncToMain = async (key: string, value: unknown): Promise<void> => {
  try {
    await window.electronAPI.invoke('settings:update', { [key]: value });
    console.log('[SettingsStore] Saved', key, ':', value);
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
  accentColor: initialSettings.accentColor ?? defaultAccentColor,
  sidebarCollapsed: initialSettings.sidebarCollapsed ?? false,
  preferredTerminal: initialSettings.preferredTerminal ?? 'auto',

  // ============ 通用更新方法 ============
  updateSettings: async (newSettings) => {
    set(newSettings);
    
    // 检查运行环境
    if (typeof window !== 'undefined' && window.electronAPI) {
      // Electron 环境
      await window.electronAPI.invoke('settings:update', newSettings);
    } else {
      // Neutralino/Web 环境 - 使用 localStorage 或 Neutralino storage
      try {
        const currentSettings = localStorage.getItem('yes-sessions-settings');
        const settings = currentSettings ? JSON.parse(currentSettings) : {};
        const merged = { ...settings, ...newSettings };
        localStorage.setItem('yes-sessions-settings', JSON.stringify(merged));
        console.log('[Settings] Saved to localStorage:', newSettings);
      } catch (error) {
        console.error('[Settings] Failed to save:', error);
      }
    }
  },
  updateSetting: async <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
    // 排除 actions 自身
    if (typeof value === 'function') return;

    set({ [key]: value } as Partial<SettingsState>);
    await syncToMain(key as string, value);
  },

  // Computed: settings object
  get settings(): AppSettings {
    const state = get();
    return {
      language: 'en',
      theme: state.theme,
      accentColor: state.accentColor,
      autoStart: false,
      lightweightMode: false,
      defaultApp: state.defaultApp,
      collapseBashBlocks: state.collapseBashBlocks,
      enableTitleMarquee: state.enableTitleMarquee,
      showThinkingContent: state.showThinkingContent,
      sidebarCollapsed: state.sidebarCollapsed,
      preferredTerminal: state.preferredTerminal,
    };
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
    set({ accentColor: defaultAccentColor });
    await syncToMain('accentColor', defaultAccentColor);
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

  // ============ Terminal Actions ============
  setPreferredTerminal: async (terminal) => {
    set({ preferredTerminal: terminal });
    await syncToMain('preferredTerminal', terminal);
  },
}));

// 为保持兼容，导出旧的 hook 名称（已废弃，建议迁移到 useSettingsStore）
export const useExperienceStore = useSettingsStore;
