import { create } from 'zustand';
import { globalSettings } from '@/main';

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

// Use global settings if available, otherwise defaults
const initialEnableTitleMarquee = globalSettings?.enableTitleMarquee ?? false;
const initialCollapseBashBlocks = globalSettings?.collapseBashBlocks ?? true;
const initialShowThinkingContent = globalSettings?.showThinkingContent ?? true;

// Helper to sync to electron-store
const syncToStore = async (key: string, value: boolean) => {
  try {
    await window.electronAPI.invoke('settings:update', { [key]: value });
    console.log('[ExperienceStore] Saved', key, ':', value);
  } catch (error) {
    console.error('[ExperienceStore] Failed to save', key, ':', error);
  }
};

export const useExperienceStore = create<ExperienceState>()((set, get) => ({
  enableTitleMarquee: initialEnableTitleMarquee,
  collapseBashBlocks: initialCollapseBashBlocks,
  showThinkingContent: initialShowThinkingContent,

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
