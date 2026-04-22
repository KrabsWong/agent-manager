const { contextBridge, ipcRenderer } = require('electron');

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
  preferredTerminal?: 'auto' | 'ghostty' | 'kitty' | 'terminal';
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
    __INITIAL_SETTINGS__?: InitialSettings;
  }
}

// Try to get initial settings synchronously via ipcRenderer.sendSync
// This allows React to read settings immediately without async loading
let initialSettings: InitialSettings = {};
try {
  // Use internal Electron IPC to get settings synchronously
  initialSettings = ipcRenderer.sendSync('settings:getSync') || {};
} catch (error) {
  // Fallback: settings will be loaded asynchronously
  console.log('[Preload] Failed to get initial settings synchronously, will load async');
}

contextBridge.exposeInMainWorld('__INITIAL_SETTINGS__', initialSettings);

contextBridge.exposeInMainWorld('electronAPI', {
  invoke: (channel: string, ...args: unknown[]) =>
    ipcRenderer.invoke(channel, ...args),
  on: (channel: string, callback: (...args: unknown[]) => void) =>
    ipcRenderer.on(channel, (_event: unknown, ...args: unknown[]) => callback(...args)),
  removeAllListeners: (channel: string) =>
    ipcRenderer.removeAllListeners(channel),
});
