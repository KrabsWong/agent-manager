import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sessionsApi } from '@/lib/api/sessions';
import type { AppSupportSummary, Session, SessionStatsSummary, TerminalInfo } from '@/types';

const invoke = vi.fn();

beforeEach(() => {
  invoke.mockReset();
  Object.defineProperty(window, 'electronAPI', {
    configurable: true,
    value: {
      invoke,
    },
  });
});

describe('sessions api wrappers', () => {
  it('returns session lists and details through typed IPC channels', async () => {
    const session: Session = {
      id: 'session-1',
      appType: 'codebuddy',
      fileName: 'session-1.jsonl',
      filePath: '/repo/session-1.jsonl',
      createdAt: 1,
      updatedAt: 2,
      messageCount: 1,
    };

    invoke
      .mockResolvedValueOnce({ success: true, data: [session] })
      .mockResolvedValueOnce({ success: true, data: { ...session, messages: [] } });

    await expect(sessionsApi.getAll('codebuddy')).resolves.toEqual([session]);
    await expect(sessionsApi.getDetail('session-1', 'codebuddy')).resolves.toEqual({
      ...session,
      messages: [],
    });
    expect(invoke).toHaveBeenNthCalledWith(1, 'sessions:getAll', 'codebuddy');
    expect(invoke).toHaveBeenNthCalledWith(2, 'sessions:getDetail', 'session-1', 'codebuddy');
  });

  it('returns stats, support status, and terminal info', async () => {
    const stats: SessionStatsSummary = { totalSessions: 2, totalMessages: 10 };
    const support: AppSupportSummary = {
      supported: true,
      status: 'full',
      isAvailable: true,
    };
    const terminalInfo: TerminalInfo = {
      preferred: 'auto',
      ghosttyInstalled: false,
      kittyInstalled: true,
    };

    invoke
      .mockResolvedValueOnce({ success: true, data: stats })
      .mockResolvedValueOnce({ success: true, data: support })
      .mockResolvedValueOnce({ success: true, data: terminalInfo });

    await expect(sessionsApi.getStats('codebuddy')).resolves.toEqual(stats);
    await expect(sessionsApi.getSupportStatus('codebuddy')).resolves.toEqual(support);
    await expect(sessionsApi.getTerminalInfo()).resolves.toEqual(terminalInfo);
    expect(invoke).toHaveBeenNthCalledWith(1, 'sessions:getStats', 'codebuddy');
    expect(invoke).toHaveBeenNthCalledWith(2, 'sessions:getSupportStatus', 'codebuddy');
    expect(invoke).toHaveBeenNthCalledWith(3, 'sessions:getTerminalInfo');
  });

  it('resumes sessions and propagates IPC errors', async () => {
    invoke.mockResolvedValueOnce({ success: true }).mockResolvedValueOnce({
      success: false,
      error: { code: 'TERMINAL_ERROR', message: 'Terminal unavailable' },
    });

    await expect(sessionsApi.resume('session-1', 'codebuddy', '/repo')).resolves.toBeUndefined();
    await expect(sessionsApi.getAll('codebuddy')).rejects.toThrow('Terminal unavailable');
    expect(invoke).toHaveBeenNthCalledWith(1, 'sessions:resume', 'session-1', 'codebuddy', '/repo');
  });
});
