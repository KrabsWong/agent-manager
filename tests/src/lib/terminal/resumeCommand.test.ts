import { describe, expect, it } from 'vitest';
import { buildResumeCommand } from '@/lib/terminal/resumeCommand';

describe('resumeCommand', () => {
  it('builds resume command args for supported app types', () => {
    expect(buildResumeCommand('claude', 'session-1')).toEqual({
      command: 'claude',
      args: ['--resume=session-1'],
    });
    expect(buildResumeCommand('claude-internal', 'session-1')).toEqual({
      command: 'claude-internal',
      args: ['--resume', 'session-1'],
    });
    expect(buildResumeCommand('opencode', 'session-1')).toEqual({
      command: 'opencode',
      args: ['-s', 'session-1'],
    });
    expect(buildResumeCommand('codebuddy', 'session-1')).toEqual({
      command: 'codebuddy',
      args: ['--resume=session-1'],
    });
  });

  it('rejects unsupported app types', () => {
    expect(() => buildResumeCommand('vscode-extension', 'session-1')).toThrow(
      'Resume not supported'
    );
  });
});
