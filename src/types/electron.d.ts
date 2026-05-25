/**
 * Type declarations for Electron API exposed to renderer process
 */

import type { IElectronAPI, InitialSettings } from './index';

declare global {
  interface Window {
    electronAPI: IElectronAPI;
    __INITIAL_SETTINGS__?: InitialSettings;
  }
}

export {};
