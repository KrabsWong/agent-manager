import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';

const tempRoots: string[] = [];

vi.mock('electron-log', () => ({
  default: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

function writeJsonl(filePath: string, records: unknown[]): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, records.map((record) => JSON.stringify(record)).join('\n'));
}

async function importServiceWithHome(homePath: string) {
  vi.resetModules();
  vi.doMock('os', () => ({
    default: { homedir: () => homePath },
    homedir: () => homePath,
  }));

  return import('@electron/services/session/codex');
}

describe('codex session service', () => {
  afterEach(() => {
    vi.doUnmock('os');
    for (const root of tempRoots.splice(0)) {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('reads Codex session list and detail from local JSONL files', async () => {
    const homePath = fs.mkdtempSync(path.join(os.tmpdir(), 'yes-sessions-codex-'));
    tempRoots.push(homePath);

    const sessionId = '019e5ec7-7145-7262-b035-c3adffe30194';
    const codexHome = path.join(homePath, '.codex');
    const sessionFile = path.join(
      codexHome,
      'sessions',
      '2026',
      '05',
      '25',
      `rollout-2026-05-25T18-56-29-${sessionId}.jsonl`
    );

    writeJsonl(path.join(codexHome, 'session_index.jsonl'), [
      {
        id: sessionId,
        thread_name: 'Support Codex sessions',
        updated_at: '2026-05-25T11:05:00.000Z',
      },
    ]);

    writeJsonl(sessionFile, [
      {
        timestamp: '2026-05-25T10:56:29.541Z',
        type: 'session_meta',
        payload: {
          id: sessionId,
          timestamp: '2026-05-25T10:56:29.541Z',
          cwd: '/repo/yes-sessions',
        },
      },
      {
        timestamp: '2026-05-25T10:56:30.000Z',
        type: 'response_item',
        payload: {
          type: 'message',
          role: 'user',
          content: [{ type: 'input_text', text: '# AGENTS.md instructions for /repo' }],
        },
      },
      {
        timestamp: '2026-05-25T10:56:31.000Z',
        type: 'response_item',
        payload: {
          type: 'message',
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: '<goal_context>\n<objective>\nAdd Codex support\n</objective>\n</goal_context>',
            },
          ],
        },
      },
      {
        timestamp: '2026-05-25T10:56:32.000Z',
        type: 'turn_context',
        payload: { model: 'gpt-5.5' },
      },
      {
        timestamp: '2026-05-25T10:56:33.000Z',
        type: 'response_item',
        payload: {
          type: 'function_call',
          name: 'exec_command',
          arguments: '{"cmd":"git status --short"}',
          call_id: 'call-1',
        },
      },
      {
        timestamp: '2026-05-25T10:56:34.000Z',
        type: 'response_item',
        payload: {
          type: 'function_call_output',
          call_id: 'call-1',
          output: ' M src/config/apps.ts',
        },
      },
      {
        timestamp: '2026-05-25T10:56:35.000Z',
        type: 'response_item',
        payload: {
          type: 'message',
          role: 'assistant',
          content: [{ type: 'output_text', text: 'Codex support is wired.' }],
        },
      },
    ]);

    const { codexSessionService } = await importServiceWithHome(homePath);

    expect(codexSessionService.isAvailable()).toBe(true);

    const sessions = codexSessionService.getAllSessions();
    expect(sessions).toHaveLength(1);
    expect(sessions[0]).toMatchObject({
      id: sessionId,
      appType: 'codex',
      fileName: 'Support Codex sessions',
      firstMessage: 'Support Codex sessions',
      directory: '/repo/yes-sessions',
      messageCount: 4,
    });

    const detail = codexSessionService.getSessionDetail(sessionId);
    expect(detail?.messages).toEqual([
      {
        type: 'user',
        timestamp: '2026-05-25T10:56:31.000Z',
        content: 'Add Codex support',
        model: undefined,
      },
      {
        type: 'tool_use',
        timestamp: '2026-05-25T10:56:33.000Z',
        tool_name: 'exec_command',
        tool_input: { cmd: 'git status --short' },
        callId: 'call-1',
        model: 'gpt-5.5',
      },
      {
        type: 'tool_result',
        timestamp: '2026-05-25T10:56:34.000Z',
        tool_name: 'exec_command',
        tool_output: { output: ' M src/config/apps.ts' },
        callId: 'call-1',
        model: 'gpt-5.5',
      },
      {
        type: 'assistant',
        timestamp: '2026-05-25T10:56:35.000Z',
        content: 'Codex support is wired.',
        model: 'gpt-5.5',
      },
    ]);
  });
});
