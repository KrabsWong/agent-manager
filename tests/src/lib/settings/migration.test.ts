import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, type AppSettings } from '@/types';
import { normalizeAppSettings, SETTINGS_SCHEMA_VERSION } from '@/lib/settings/migration';

describe('settings migration', () => {
  it('fills missing settings with current defaults', () => {
    expect(
      normalizeAppSettings({
        theme: 'dark',
        defaultApp: 'codebuddy',
        chatLayout: 'bubble',
      })
    ).toEqual({
      ...DEFAULT_SETTINGS,
      theme: 'dark',
      defaultApp: 'codebuddy',
      chatLayout: 'bubble',
    });
  });

  it('normalizes invalid persisted values to safe defaults', () => {
    const settings = normalizeAppSettings({
      language: 'fr',
      theme: 'neon',
      accentColor: 'invisible',
      autoStart: 'yes',
      lightweightMode: 1,
      defaultApp: 'unknown',
      collapseBashBlocks: 'false',
      enableTitleMarquee: 'true',
      showThinkingContent: 0,
      chatLayout: 'grid',
      sidebarCollapsed: 'no',
      preferredTerminal: 'warp',
    });

    expect(settings).toEqual(DEFAULT_SETTINGS);
  });

  it('preserves null defaultApp as an explicit value', () => {
    expect(normalizeAppSettings({ defaultApp: null }).defaultApp).toBeNull();
  });

  it('returns defaults for non-object input', () => {
    expect(normalizeAppSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(normalizeAppSettings('bad')).toEqual(DEFAULT_SETTINGS);
  });

  it('returns the complete AppSettings shape', () => {
    const settings: AppSettings = normalizeAppSettings({
      language: 'zh',
      accentColor: 'blue',
      preferredTerminal: 'terminal',
      sidebarCollapsed: true,
    });

    expect(Object.keys(settings).sort()).toEqual(Object.keys(DEFAULT_SETTINGS).sort());
    expect(settings.language).toBe('zh');
    expect(settings.accentColor).toBe('blue');
    expect(settings.preferredTerminal).toBe('terminal');
    expect(settings.sidebarCollapsed).toBe(true);
  });

  it('migrates the removed built-in terminal preference back to the default', () => {
    expect(normalizeAppSettings({ preferredTerminal: 'builtin' }).preferredTerminal).toBe(
      DEFAULT_SETTINGS.preferredTerminal
    );
  });

  it('exposes a positive schema version for persistent stores', () => {
    expect(SETTINGS_SCHEMA_VERSION).toBeGreaterThan(0);
  });
});
