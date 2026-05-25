import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  register: vi.fn(),
  registerSettingsHandlers: vi.fn(),
  registerFilePreviewHandlers: vi.fn(),
  registerFileHandlers: vi.fn(),
  registerGitHandlers: vi.fn(),
}));

vi.mock('@electron/ipc/registry', () => ({
  ipcRegistry: {
    register: mocks.register,
  },
}));

vi.mock('@electron/handlers/settings', () => ({
  registerSettingsHandlers: mocks.registerSettingsHandlers,
}));

vi.mock('@electron/handlers/file-preview', () => ({
  registerFilePreviewHandlers: mocks.registerFilePreviewHandlers,
}));

vi.mock('@electron/handlers/file', () => ({
  registerFileHandlers: mocks.registerFileHandlers,
}));

vi.mock('@electron/handlers/git', () => ({
  registerGitHandlers: mocks.registerGitHandlers,
}));

describe('app handler registration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers app version and all domain handler groups', async () => {
    const { registerAppHandlers } = await import('@electron/handlers/app');

    registerAppHandlers({
      dirname: '/dist-electron',
      getPackageVersion: () => '8.2.1',
    });

    expect(mocks.register).toHaveBeenCalledWith('app:getVersion', expect.any(Function));
    expect(mocks.registerSettingsHandlers).toHaveBeenCalledOnce();
    expect(mocks.registerFilePreviewHandlers).toHaveBeenCalledWith({
      dirname: '/dist-electron',
    });
    expect(mocks.registerFileHandlers).toHaveBeenCalledOnce();
    expect(mocks.registerGitHandlers).toHaveBeenCalledOnce();
  });

  it('uses the provided package version callback', async () => {
    const { registerAppHandlers } = await import('@electron/handlers/app');

    registerAppHandlers({
      dirname: '/dist-electron',
      getPackageVersion: () => '8.2.1',
    });

    const versionHandler = mocks.register.mock.calls[0][1] as () => string;

    expect(versionHandler()).toBe('8.2.1');
  });
});
