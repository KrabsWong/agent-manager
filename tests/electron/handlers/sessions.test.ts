import { beforeEach, describe, expect, it, vi } from 'vitest';
import { APP_SESSION_SUPPORT } from '@/config/apps';
import type { AppType, Session, SessionDetail, SessionStats } from '@/types';

interface MockSessionService {
  readonly appType: AppType;
  getAllSessions(): Session[];
  getSessionDetail(sessionId: string): SessionDetail | null;
  getStats(): SessionStats;
  isAvailable(): boolean;
}

const mocks = vi.hoisted(() => {
  const services = new Map<AppType, MockSessionService>();

  const makeService = (appType: AppType, available = true): MockSessionService => ({
    appType,
    getAllSessions: vi.fn(() => []),
    getSessionDetail: vi.fn(() => null),
    getStats: vi.fn(() => ({ totalSessions: 0, totalMessages: 0 })),
    isAvailable: vi.fn(() => available),
  });

  return {
    register: vi.fn(),
    services,
    makeService,
    sessionRegistry: {
      register: vi.fn((service: MockSessionService) => {
        services.set(service.appType, service);
      }),
      get: vi.fn((appType: AppType) => services.get(appType)),
      getSupportedAppTypes: vi.fn(() => Array.from(services.keys())),
    },
  };
});

vi.mock('@electron/ipc/registry', () => ({
  ipcRegistry: {
    register: mocks.register,
  },
}));

vi.mock('@electron/services/session/registry', () => ({
  sessionServiceRegistry: mocks.sessionRegistry,
}));

vi.mock('@electron/services/session/claude', () => ({
  claudeSessionService: mocks.makeService('claude'),
}));

vi.mock('@electron/services/session/claude-internal', () => ({
  claudeInternalSessionService: mocks.makeService('claude-internal'),
}));

vi.mock('@electron/services/session/opencode', () => ({
  opencodeSessionService: mocks.makeService('opencode'),
}));

vi.mock('@electron/services/session/codebuddy', () => ({
  codebuddySessionService: mocks.makeService('codebuddy'),
}));

vi.mock('@electron/services/session/codex', () => ({
  codexSessionService: mocks.makeService('codex'),
}));

vi.mock('@electron/services/session/vscode-extension', () => ({
  vscodeExtensionSessionService: mocks.makeService('vscode-extension'),
}));

vi.mock('@electron/services/terminal/launcher', () => ({
  getTerminalInfo: vi.fn(() => ({
    preferred: 'auto',
    ghosttyInstalled: false,
    kittyInstalled: false,
  })),
  resumeSessionInTerminal: vi.fn(),
}));

vi.mock('electron-log', () => ({
  default: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('sessions handler registration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.services.clear();
  });

  it('uses shared app support metadata for support status responses', async () => {
    const { registerSessionsHandlers } = await import('@electron/handlers/sessions');

    registerSessionsHandlers();

    const supportRegistration = mocks.register.mock.calls.find(
      ([channel]) => channel === 'sessions:getSupportStatus'
    );
    const supportHandler = supportRegistration?.[1] as
      | ((event: unknown, appType: AppType) => unknown)
      | undefined;

    await expect(supportHandler?.({}, 'codebuddy')).resolves.toEqual({
      ...APP_SESSION_SUPPORT.codebuddy,
      isAvailable: true,
    });
    await expect(supportHandler?.({}, 'codex')).resolves.toEqual({
      ...APP_SESSION_SUPPORT.codex,
      isAvailable: true,
    });
  });
});
