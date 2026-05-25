import { describe, expect, it } from 'vitest';
import {
  appSupportResult,
  appTypeArg,
  gitStatusResult,
  optionalStringArg,
  recordArg,
  sessionDetailResult,
  sessionStatsResult,
  sessionsResult,
  stringArg,
  treeNodesResult,
  validateArgs,
} from '@electron/ipc/validation';

describe('ipc argument validation', () => {
  it('accepts valid argument tuples', () => {
    expect(() =>
      validateArgs(
        stringArg('sessionId'),
        appTypeArg('appType'),
        optionalStringArg('workingDir')
      )(['abc', 'codebuddy', undefined])
    ).not.toThrow();
  });

  it('rejects invalid strings with structured input errors', () => {
    expect(() => validateArgs(stringArg('filePath'))([123])).toThrow(
      'Invalid filePath: expected a non-empty string'
    );
  });

  it('rejects invalid app types', () => {
    expect(() => validateArgs(appTypeArg('appType'))(['unknown'])).toThrow(
      'Invalid appType: expected a supported app type'
    );
  });

  it('accepts plain object records and rejects arrays', () => {
    expect(() => validateArgs(recordArg('settings'))([{ theme: 'dark' }])).not.toThrow();
    expect(() => validateArgs(recordArg('settings'))([[]])).toThrow(
      'Invalid settings: expected an object'
    );
  });

  it('accepts valid structured IPC results', () => {
    expect(() =>
      treeNodesResult()([
        {
          name: 'src',
          path: '/repo/src',
          type: 'directory',
          children: [{ name: 'index.ts', path: '/repo/src/index.ts', type: 'file' }],
        },
      ])
    ).not.toThrow();

    expect(() =>
      gitStatusResult()({
        isGitRepo: true,
        branch: 'main',
        ahead: 0,
        behind: 0,
        staged: [],
        unstaged: [{ path: 'README.md', status: 'modified', additions: 1, deletions: 0 }],
        untracked: [],
      })
    ).not.toThrow();

    expect(() =>
      sessionsResult()([
        {
          id: 'session-1',
          appType: 'codebuddy',
          fileName: 'session-1.jsonl',
          filePath: '/repo/session-1.jsonl',
          createdAt: 1,
          updatedAt: 2,
          messageCount: 1,
        },
      ])
    ).not.toThrow();

    expect(() =>
      sessionDetailResult()({
        id: 'session-1',
        appType: 'codebuddy',
        fileName: 'session-1.jsonl',
        filePath: '/repo/session-1.jsonl',
        createdAt: 1,
        updatedAt: 2,
        messageCount: 1,
        messages: [
          {
            type: 'assistant',
            timestamp: '2026-05-25T00:00:00.000Z',
            content: 'hello',
            metadata: { subtype: 'text' },
          },
        ],
      })
    ).not.toThrow();

    expect(() => sessionDetailResult()(null)).not.toThrow();

    expect(() =>
      appSupportResult()({
        supported: false,
        status: 'coming_soon',
        isAvailable: false,
      })
    ).not.toThrow();
  });

  it('accepts semantically valid session message variants', () => {
    const baseSession = {
      id: 'session-1',
      appType: 'codebuddy',
      fileName: 'session-1.jsonl',
      filePath: '/repo/session-1.jsonl',
      createdAt: 1,
      updatedAt: 2,
      messageCount: 5,
    };

    expect(() =>
      sessionDetailResult()({
        ...baseSession,
        messages: [
          {
            type: 'user',
            timestamp: '2026-05-25T00:00:00.000Z',
            content: 'read the package file',
          },
          {
            type: 'assistant',
            timestamp: '2026-05-25T00:00:01.000Z',
            content: '',
            reasoning_content: 'Need to inspect package.json first.',
          },
          {
            type: 'tool_use',
            timestamp: '2026-05-25T00:00:02.000Z',
            tool_name: 'read',
            tool_input: { file_path: '/repo/package.json' },
            callId: 'call-1',
          },
          {
            type: 'tool_result',
            timestamp: '2026-05-25T00:00:03.000Z',
            tool_name: 'read',
            tool_output: { output: '{ "name": "yes-sessions" }' },
            callId: 'call-1',
          },
          {
            type: 'system',
            timestamp: '2026-05-25T00:00:04.000Z',
            metadata: { subtype: 'caveat' },
            redacted_content: '[redacted]',
          },
        ],
      })
    ).not.toThrow();
  });

  it('rejects malformed structured IPC results', () => {
    expect(() => sessionStatsResult()({ totalSessions: '1', totalMessages: 0 })).toThrow(
      'Validation failed: Invalid IPC result: SessionStatsSummary'
    );

    expect(() =>
      sessionsResult()([
        {
          id: 'session-1',
          appType: 'codebuddy',
          fileName: 'session-1.jsonl',
          filePath: '/repo/session-1.jsonl',
          createdAt: '1',
          updatedAt: 2,
          messageCount: 1,
        },
      ])
    ).toThrow('Validation failed: Invalid IPC result: Session[]');

    expect(() =>
      sessionDetailResult()({
        id: 'session-1',
        appType: 'codebuddy',
        fileName: 'session-1.jsonl',
        filePath: '/repo/session-1.jsonl',
        createdAt: 1,
        updatedAt: 2,
        messageCount: 1,
        messages: [{ type: 'unknown', timestamp: '2026-05-25T00:00:00.000Z' }],
      })
    ).toThrow('Validation failed: Invalid IPC result: SessionDetail | null');

    expect(() =>
      appSupportResult()({
        supported: true,
        status: 'deprecated',
        isAvailable: true,
      })
    ).toThrow('Validation failed: Invalid IPC result: AppSupportSummary');
  });

  it('rejects structurally typed but semantically invalid session messages', () => {
    const baseSession = {
      id: 'session-1',
      appType: 'codebuddy',
      fileName: 'session-1.jsonl',
      filePath: '/repo/session-1.jsonl',
      createdAt: 1,
      updatedAt: 2,
      messageCount: 1,
    };

    expect(() =>
      sessionDetailResult()({
        ...baseSession,
        messages: [
          {
            type: 'tool_use',
            timestamp: '2026-05-25T00:00:00.000Z',
            tool_name: 'read',
          },
        ],
      })
    ).toThrow('Validation failed: Invalid IPC result: SessionDetail | null');

    expect(() =>
      sessionDetailResult()({
        ...baseSession,
        messages: [
          {
            type: 'tool_result',
            timestamp: '2026-05-25T00:00:00.000Z',
            tool_name: 'read',
            content: 'done',
          },
        ],
      })
    ).toThrow('Validation failed: Invalid IPC result: SessionDetail | null');

    expect(() =>
      sessionDetailResult()({
        ...baseSession,
        messages: [
          {
            type: 'assistant',
            timestamp: '2026-05-25T00:00:00.000Z',
          },
        ],
      })
    ).toThrow('Validation failed: Invalid IPC result: SessionDetail | null');
  });
});
