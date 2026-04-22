import { create } from 'zustand';

interface ExperienceState {
  enableTitleMarquee: boolean;
  collapseBashBlocks: boolean;
  showThinkingContent: boolean;

  toggleTitleMarquee: () => void;
  setTitleMarquee: (enabled: boolean) => void;
  toggleCollapseBashBlocks: () => void;
  setCollapseBashBlocks: (enabled: boolean) => void;
  toggleShowThinkingContent: () => void;
  setShowThinkingContent: (enabled: boolean) => void;
}

const getInitialSettings = () => {
  if (typeof window !== 'undefined' && window.__INITIAL_SETTINGS__) {
    return {
      enableTitleMarquee: window.__INITIAL_SETTINGS__.enableTitleMarquee ?? false,
      collapseBashBlocks: window.__INITIAL_SETTINGS__.collapseBashBlocks ?? true,
      showThinkingContent: window.__INITIAL_SETTINGS__.showThinkingContent ?? true,
    };
  }
  return {
    enableTitleMarquee: false,
    collapseBashBlocks: true,
    showThinkingContent: true,
  };
};

const syncToStore = async (key: string, value: boolean) => {
  try {
    await window.electronAPI.invoke('settings:update', { [key]: value });
    console.log('[ExperienceStore] Saved', key, ':', value);
  } catch (error) {
    console.error('[ExperienceStore] Failed to save', key, ':', error);
  }
};

const initialExperienceSettings = getInitialSettings();

export const useExperienceStore = create<ExperienceState>()((set, get) => ({
  enableTitleMarquee: initialExperienceSettings.enableTitleMarquee,
  collapseBashBlocks: initialExperienceSettings.collapseBashBlocks,
  showThinkingContent: initialExperienceSettings.showThinkingContent,

  toggleTitleMarquee: () => {
    const newValue = !get().enableTitleMarquee;
    set({ enableTitleMarquee: newValue });
    syncToStore('enableTitleMarquee', newValue);
  },

  setTitleMarquee: (enabled) => {
    set({ enableTitleMarquee: enabled });
    syncToStore('enableTitleMarquee', enabled);
  },

  toggleCollapseBashBlocks: () => {
    const newValue = !get().collapseBashBlocks;
    set({ collapseBashBlocks: newValue });
    syncToStore('collapseBashBlocks', newValue);
  },

  setCollapseBashBlocks: (enabled) => {
    set({ collapseBashBlocks: enabled });
    syncToStore('collapseBashBlocks', enabled);
  },

  toggleShowThinkingContent: () => {
    const newValue = !get().showThinkingContent;
    set({ showThinkingContent: newValue });
    syncToStore('showThinkingContent', newValue);
  },

  setShowThinkingContent: (enabled) => {
    set({ showThinkingContent: enabled });
    syncToStore('showThinkingContent', enabled);
  },
}));
