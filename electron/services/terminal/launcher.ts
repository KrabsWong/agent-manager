/**
 * Terminal Launcher Service
 *
 * Handles launching sessions in external terminals (Ghostty, Kitty, Terminal.app)
 */

import { shell } from 'electron';
import { execSync } from 'child_process';
import log from 'electron-log';

type AppType = 'claude' | 'claude-internal' | 'codex' | 'gemini' | 'opencode' | 'codebuddy' | 'vscode-extension';

interface TerminalInfo {
  preferred: 'auto' | 'ghostty' | 'kitty' | 'terminal';
  ghosttyInstalled: boolean;
  kittyInstalled: boolean;
}

/**
 * Check if Ghostty is installed
 */
function isGhosttyInstalled(): boolean {
  try {
    execSync('which ghostty', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if Kitty is installed
 */
function isKittyInstalled(): boolean {
  try {
    execSync('which kitty', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get terminal info
 */
export function getTerminalInfo(): TerminalInfo {
  const ghosttyInstalled = isGhosttyInstalled();
  const kittyInstalled = isKittyInstalled();

  return {
    preferred: 'auto',
    ghosttyInstalled,
    kittyInstalled,
  };
}

/**
 * Resume session in terminal
 */
export async function resumeSessionInTerminal(
  appType: AppType,
  sessionId: string,
  workingDir?: string
): Promise<void> {
  log.info(`Resuming session ${sessionId} for ${appType} in terminal`);

  const command = getResumeCommand(appType, sessionId);

  // Open in terminal
  if (workingDir) {
    shell.openPath(workingDir);
  } else {
    shell.openExternal(command);
  }
}

/**
 * Get resume command for different app types
 */
function getResumeCommand(appType: AppType, sessionId: string): string {
  switch (appType) {
    case 'claude':
      return `claude --resume ${sessionId}`;
    case 'claude-internal':
      return `claude --resume ${sessionId}`;
    case 'opencode':
      return `opencode -s ${sessionId}`;
    case 'codebuddy':
      return `codebuddy --resume ${sessionId}`;
    default:
      return '';
  }
}