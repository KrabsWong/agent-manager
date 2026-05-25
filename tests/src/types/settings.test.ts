import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, type AppSettings } from '@/types';

describe('default settings', () => {
  it('contains the current persisted settings shape', () => {
    const expectedKeys = [
      'accentColor',
      'autoStart',
      'chatLayout',
      'collapseBashBlocks',
      'defaultApp',
      'enableTitleMarquee',
      'language',
      'lightweightMode',
      'preferredTerminal',
      'showThinkingContent',
      'sidebarCollapsed',
      'theme',
    ].sort();

    expect(Object.keys(DEFAULT_SETTINGS).sort()).toEqual(expectedKeys);
  });

  it('defaults optional UI preferences to the documented baseline', () => {
    const settings: AppSettings = DEFAULT_SETTINGS;

    expect(settings.language).toBe('en');
    expect(settings.theme).toBe('system');
    expect(settings.accentColor).toBe('default');
    expect(settings.chatLayout).toBe('left');
    expect(settings.preferredTerminal).toBe('auto');
    expect(settings.collapseBashBlocks).toBe(true);
    expect(settings.showThinkingContent).toBe(true);
  });
});
