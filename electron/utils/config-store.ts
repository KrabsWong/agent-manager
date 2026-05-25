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
import { normalizeAppSettings, SETTINGS_SCHEMA_VERSION } from '../../src/lib/settings/migration';

// Schema definition for electron-store
interface StoreSchema {
  settingsVersion: number;
  settings: AppSettings;
  windowBounds: {
    width: number;
    height: number;
    x?: number;
    y?: number;
    maximized?: boolean;
  };
  firstRun: boolean;
}

const schema = {
  settingsVersion: {
    type: 'number',
    default: SETTINGS_SCHEMA_VERSION,
  },
  settings: {
    type: 'object',
    // Only define defaults at the object level to avoid validation conflicts
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

    this.migrateSettings();
    log.info('Config store initialized');
  }

  // ============ Settings ============

  getSettings(): AppSettings {
    const settings = normalizeAppSettings(this.store.get('settings'));
    this.store.set('settings', settings);
    return settings;
  }

  updateSettings(settings: Partial<AppSettings>): void {
    const current = this.getSettings();
    const updated = normalizeAppSettings({ ...current, ...settings });
    this.store.set('settings', updated);
    this.store.set('settingsVersion', SETTINGS_SCHEMA_VERSION);
    log.info('Settings updated:', Object.keys(settings).join(', '));
  }

  resetSettings(): void {
    this.store.set('settings', DEFAULT_SETTINGS);
    this.store.set('settingsVersion', SETTINGS_SCHEMA_VERSION);
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

  // ============ Store Operations ============

  clear(): void {
    this.store.clear();
    log.warn('Config store cleared');
  }

  getPath(): string {
    return this.store.path;
  }

  private migrateSettings(): void {
    const version = this.store.get('settingsVersion') || 0;
    const settings = normalizeAppSettings(this.store.get('settings'));
    this.store.set('settings', settings);
    this.store.set('settingsVersion', SETTINGS_SCHEMA_VERSION);

    if (version !== SETTINGS_SCHEMA_VERSION) {
      log.info(`Settings migrated from schema version ${version} to ${SETTINGS_SCHEMA_VERSION}`);
    }
  }
}

// Export singleton instance
export const configStore = new ConfigStore();
