import type { IElectronAPI, InitialSettings, IpcChannel, IpcEventChannel } from '../src/types';

// Electron preload runs more reliably with CommonJS in the packaged app.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { contextBridge, ipcRenderer } = require('electron');

// Try to get initial settings synchronously via ipcRenderer.sendSync
// This allows React to read settings immediately without async loading
let initialSettings: InitialSettings = {};
try {
  // Use internal Electron IPC to get settings synchronously
  initialSettings = ipcRenderer.sendSync('settings:getSync') || {};
} catch (error) {
  // Fallback: settings will be loaded asynchronously
  console.warn('[Preload] Failed to get initial settings synchronously, will load async');
}

contextBridge.exposeInMainWorld('__INITIAL_SETTINGS__', initialSettings);

const electronAPI: IElectronAPI = {
  invoke: (channel: IpcChannel, ...args: unknown[]) => ipcRenderer.invoke(channel, ...args),
  on: (channel: IpcEventChannel, callback: (...args: unknown[]) => void) =>
    ipcRenderer.on(channel, (_event: unknown, ...args: unknown[]) => callback(...args)),
  removeAllListeners: (channel: IpcEventChannel) => ipcRenderer.removeAllListeners(channel),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
