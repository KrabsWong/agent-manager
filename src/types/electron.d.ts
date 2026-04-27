/**
 * Type declarations for Electron API exposed to renderer process
 */

export interface IElectronAPI {
  invoke: (channel: string, ...args: unknown[]) => Promise<unknown>;
  on: (channel: string, callback: (...args: unknown[]) => void) => void;
  removeAllListeners: (channel: string) => void;
}

export interface InitialSettings {
  theme?: 'light' | 'dark' | 'system';
  accentColor?: string;
  language?: 'en' | 'zh' | 'ja';
  defaultApp?: string;
  enableTitleMarquee?: boolean;
  collapseBashBlocks?: boolean;
  showThinkingContent?: boolean;
  preferredTerminal?: 'auto' | 'ghostty' | 'kitty' | 'terminal' | 'builtin';
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
    __INITIAL_SETTINGS__?: InitialSettings;
  }
}

export {};
