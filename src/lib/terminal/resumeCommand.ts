import type { AppType } from '@/types';

export interface ResumeCommand {
  command: string;
  args: string[];
}

export function buildResumeCommand(appType: AppType, sessionId: string): ResumeCommand {
  switch (appType) {
    case 'claude':
      return { command: 'claude', args: [`--resume=${sessionId}`] };

    case 'claude-internal':
      return { command: 'claude-internal', args: ['--resume', sessionId] };

    case 'opencode':
      return { command: 'opencode', args: ['-s', sessionId] };

    case 'codebuddy':
      return { command: 'codebuddy', args: [`--resume=${sessionId}`] };

    case 'codex':
      return { command: 'codex', args: ['resume', sessionId] };

    default:
      throw new Error(`Resume not supported for app type: ${appType}`);
  }
}
