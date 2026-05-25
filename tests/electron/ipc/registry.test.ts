import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IpcChannel } from '@/types';

const electronMock = vi.hoisted(() => {
  const handlers = new Map<string, (event: unknown, ...args: unknown[]) => Promise<unknown>>();
  return {
    handlers,
    ipcMain: {
      handle: vi.fn(
        (channel: string, handler: (event: unknown, ...args: unknown[]) => Promise<unknown>) => {
          handlers.set(channel, handler);
        }
      ),
      removeHandler: vi.fn((channel: string) => {
        handlers.delete(channel);
      }),
    },
  };
});

vi.mock('electron', () => ({
  default: {
    ipcMain: electronMock.ipcMain,
  },
  ipcMain: electronMock.ipcMain,
}));

vi.mock('electron-log', () => ({
  default: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

async function loadRegistry() {
  vi.resetModules();
  electronMock.handlers.clear();
  electronMock.ipcMain.handle.mockClear();
  electronMock.ipcMain.removeHandler.mockClear();
  const { ipcRegistry } = await import('@electron/ipc/registry');
  return ipcRegistry;
}

describe('ipc registry contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('wraps successful handler results in ApiResponse', async () => {
    const ipcRegistry = await loadRegistry();

    ipcRegistry.register('app:getVersion', () => '8.2.1');
    const handler = electronMock.handlers.get('app:getVersion');

    await expect(handler?.({}, 'ignored')).resolves.toEqual({
      success: true,
      data: '8.2.1',
    });
  });

  it('wraps thrown errors in serialized ApiResponse errors', async () => {
    const ipcRegistry = await loadRegistry();

    ipcRegistry.register('app:getVersion', () => {
      throw new Error('boom');
    });
    const handler = electronMock.handlers.get('app:getVersion');

    await expect(handler?.({})).resolves.toEqual({
      success: false,
      error: expect.objectContaining({
        code: 'UNKNOWN_ERROR',
        message: 'boom',
      }),
    });
  });

  it('validates arguments before invoking the handler', async () => {
    const ipcRegistry = await loadRegistry();
    const handlerSpy = vi.fn(() => 'ok');

    ipcRegistry.register('file:read', handlerSpy, {
      validateArgs: (args) => {
        if (typeof args[0] !== 'string') {
          throw new Error('invalid filePath');
        }
      },
    });
    const handler = electronMock.handlers.get('file:read');

    await expect(handler?.({}, 123)).resolves.toEqual({
      success: false,
      error: expect.objectContaining({
        code: 'UNKNOWN_ERROR',
        message: 'invalid filePath',
      }),
    });
    expect(handlerSpy).not.toHaveBeenCalled();
  });

  it('validates results before returning successful responses', async () => {
    const ipcRegistry = await loadRegistry();

    ipcRegistry.register('sessions:getStats', () => ({ totalSessions: 'bad' }), {
      validateResult: (result) => {
        if (
          typeof result !== 'object' ||
          result === null ||
          typeof (result as { totalSessions?: unknown }).totalSessions !== 'number'
        ) {
          throw new Error('invalid stats result');
        }
      },
    });
    const handler = electronMock.handlers.get('sessions:getStats');

    await expect(handler?.({})).resolves.toEqual({
      success: false,
      error: expect.objectContaining({
        code: 'UNKNOWN_ERROR',
        message: 'invalid stats result',
      }),
    });
  });

  it('overwrites duplicate registrations', async () => {
    const ipcRegistry = await loadRegistry();

    ipcRegistry.register('app:getVersion', () => 'old');
    ipcRegistry.register('app:getVersion', () => 'new');
    const handler = electronMock.handlers.get('app:getVersion');

    expect(electronMock.ipcMain.handle).toHaveBeenCalledTimes(2);
    await expect(handler?.({})).resolves.toEqual({ success: true, data: 'new' });
  });

  it('clears all registered handlers', async () => {
    const ipcRegistry = await loadRegistry();
    const channels: IpcChannel[] = ['app:getVersion', 'settings:get', 'file:read'];

    for (const channel of channels) {
      ipcRegistry.register(channel, () => channel);
    }
    ipcRegistry.clear();

    expect(electronMock.handlers.size).toBe(0);
    expect(electronMock.ipcMain.removeHandler).toHaveBeenCalledTimes(channels.length);
  });
});
