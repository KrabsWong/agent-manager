/**
 * Configuration Store
 *
 * Uses electron-store for persistent settings
 * Provides type-safe access to application settings
 */

import Store from 'electron-store';
import log from 'electron-log';
import type { AppSettings } from '../../src/types';
import { DEFAULT_SETTINGS } from '../../src/types';

// Schema definition for electron-store
interface StoreSchema {
  settings: AppSettings;
  windowBounds: {
    width: number;
    height: number;
    x?: number;
    y?: number;
    maximized?: boolean;
  };
  firstRun: boolean;
  lastBackupAt?: number;
}

const schema = {
  settings: {
    type: 'object',
    properties: {
      language: { type: 'string', default: 'en' },
      theme: { type: 'string', default: 'system' },
      accentColor: { type: 'string', default: 'default' },
      autoStart: { type: 'boolean', default: false },
      lightweightMode: { type: 'boolean', default: false },
      proxyEnabled: { type: 'boolean', default: false },
      proxyPort: { type: 'number', default: 15721 },
      proxyHost: { type: 'string', default: '127.0.0.1' },
      webdavUrl: { type: 'string' },
      webdavUsername: { type: 'string' },
      webdavPassword: { type: 'string' },
      webdavAutoSync: { type: 'boolean', default: false },
      webdavSyncInterval: { type: 'number', default: 30 },
      autoBackup: { type: 'boolean', default: true },
      backupRetention: { type: 'number', default: 10 },
    },
    default: DEFAULT_SETTINGS,
  },
  windowBounds: {
    type: 'object',
    properties: {
      width: { type: 'number', default: 1200 },
      height: { type: 'number', default: 800 },
      x: { type: 'number' },
      y: { type: 'number' },
      maximized: { type: 'boolean', default: false },
    },
    default: {
      width: 1200,
      height: 800,
      maximized: false,
    },
  },
  firstRun: {
    type: 'boolean',
    default: true,
  },
  lastBackupAt: {
    type: 'number',
  },
} as const;

/**
 * Configuration Store Manager
 */
class ConfigStore {
  private store: Store<StoreSchema>;

  constructor() {
    this.store = new Store<StoreSchema>({
      schema,
      name: 'yes-sessions-config',
      clearInvalidConfig: true, // Clear if config is corrupted
    });

    log.info('Config store initialized');
  }

  // ============ Settings ============

  getSettings(): AppSettings {
    return this.store.get('settings');
  }

  updateSettings(settings: Partial<AppSettings>): void {
    const current = this.getSettings();
    const updated = { ...current, ...settings };
    this.store.set('settings', updated);
    log.info('Settings updated:', Object.keys(settings).join(', '));
  }

  resetSettings(): void {
    this.store.set('settings', DEFAULT_SETTINGS);
    log.info('Settings reset to defaults');
  }

  // ============ Window State ============

  getWindowBounds(): StoreSchema['windowBounds'] {
    return this.store.get('windowBounds');
  }

  setWindowBounds(bounds: Partial<StoreSchema['windowBounds']>): void {
    const current = this.getWindowBounds();
    this.store.set('windowBounds', { ...current, ...bounds });
  }

  // ============ First Run ============

  isFirstRun(): boolean {
    return this.store.get('firstRun');
  }

  setFirstRunComplete(): void {
    this.store.set('firstRun', false);
    log.info('First run marked as complete');
  }

  // ============ Backup ============

  getLastBackupAt(): number | undefined {
    return this.store.get('lastBackupAt');
  }

  setLastBackupAt(timestamp: number): void {
    this.store.set('lastBackupAt', timestamp);
  }

  // ============ Import/Export ============

  exportConfig(): Record<string, unknown> {
    return {
      settings: this.getSettings(),
      exportedAt: Date.now(),
      version: '4.0.0',
    };
  }

  importConfig(data: Record<string, unknown>): void {
    if (data.settings) {
      this.store.set('settings', data.settings);
      log.info('Settings imported from file');
    }
  }

  // ============ Store Operations ============

  clear(): void {
    this.store.clear();
    log.warn('Config store cleared');
  }

  getPath(): string {
    return this.store.path;
  }
}

// Export singleton instance
export const configStore = new ConfigStore();

// Export for testing
export { ConfigStore };
export type { StoreSchema };
