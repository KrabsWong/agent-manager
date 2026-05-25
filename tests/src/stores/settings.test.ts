import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { InitialSettings } from '@/types';

const invoke = vi.fn();

async function loadStore(initialSettings?: InitialSettings) {
  vi.resetModules();
  invoke.mockReset();
  Object.defineProperty(window, 'electronAPI', {
    configurable: true,
    value: {
      invoke,
    },
  });
  Object.defineProperty(window, '__INITIAL_SETTINGS__', {
    configurable: true,
    value: initialSettings,
  });

  const module = await import('@/stores/settings');
  return module.useSettingsStore;
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('settings store', () => {
  it('uses defaults when initial settings are missing', async () => {
    const store = await loadStore();
    const state = store.getState();

    expect(state.defaultApp).toBeNull();
    expect(state.theme).toBe('system');
    expect(state.accentColor).toBe('default');
    expect(state.chatLayout).toBe('left');
    expect(state.collapseBashBlocks).toBe(true);
    expect(state.showThinkingContent).toBe(true);
    expect(state.sidebarCollapsed).toBe(false);
  });

  it('merges partial initial settings with defaults', async () => {
    const store = await loadStore({
      defaultApp: 'codebuddy',
      theme: 'dark',
      chatLayout: 'bubble',
    });
    const state = store.getState();

    expect(state.defaultApp).toBe('codebuddy');
    expect(state.theme).toBe('dark');
    expect(state.chatLayout).toBe('bubble');
    expect(state.accentColor).toBe('default');
    expect(state.collapseBashBlocks).toBe(true);
  });

  it('normalizes invalid initial settings before creating store state', async () => {
    const store = await loadStore({
      theme: 'invalid',
      chatLayout: 'grid',
      accentColor: 'missing',
    } as unknown as InitialSettings);
    const state = store.getState();

    expect(state.theme).toBe('system');
    expect(state.chatLayout).toBe('left');
    expect(state.accentColor).toBe('default');
  });

  it('updates arbitrary settings and syncs them to the main process', async () => {
    const store = await loadStore();
    invoke.mockResolvedValue({ success: true });

    await store.getState().updateSetting('chatLayout', 'bubble');

    expect(store.getState().chatLayout).toBe('bubble');
    expect(invoke).toHaveBeenCalledWith('settings:update', { chatLayout: 'bubble' });
  });

  it('toggles chat layout and sidebar collapsed state', async () => {
    const store = await loadStore({ chatLayout: 'left', sidebarCollapsed: false });
    invoke.mockResolvedValue({ success: true });

    await store.getState().toggleChatLayout();
    await store.getState().toggleSidebar();

    expect(store.getState().chatLayout).toBe('bubble');
    expect(store.getState().sidebarCollapsed).toBe(true);
    expect(invoke).toHaveBeenNthCalledWith(1, 'settings:update', { chatLayout: 'bubble' });
    expect(invoke).toHaveBeenNthCalledWith(2, 'settings:update', { sidebarCollapsed: true });
  });

  it('cycles theme in the documented order', async () => {
    const store = await loadStore({ theme: 'light' });
    invoke.mockResolvedValue({ success: true });

    await store.getState().toggleTheme();
    await store.getState().toggleTheme();
    await store.getState().toggleTheme();

    expect(store.getState().theme).toBe('light');
    expect(invoke).toHaveBeenNthCalledWith(1, 'settings:update', { theme: 'dark' });
    expect(invoke).toHaveBeenNthCalledWith(2, 'settings:update', { theme: 'system' });
    expect(invoke).toHaveBeenNthCalledWith(3, 'settings:update', { theme: 'light' });
  });

  it('keeps local state updates when main process sync fails', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const store = await loadStore();
    invoke.mockRejectedValue(new Error('write failed'));

    await store.getState().setDefaultApp('opencode');

    expect(store.getState().defaultApp).toBe('opencode');
    expect(error).toHaveBeenCalledWith(
      '[SettingsStore] Failed to save',
      'defaultApp',
      ':',
      expect.any(Error)
    );
  });
});
