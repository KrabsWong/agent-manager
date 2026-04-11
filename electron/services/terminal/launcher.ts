/**
 * Terminal Launcher Service
 *
 * Handles launching terminal applications to resume sessions
 * - Detects and prefers Ghostty if available
 * - Falls back to system default Terminal on macOS
 * - Supports both Claude Code and OpenCode resume commands
 */

import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import log from 'electron-log';
import type { AppType } from '../../../src/types';

const execAsync = promisify(exec);

/**
 * Check if Ghostty is installed
 */
export async function isGhosttyInstalled(): Promise<boolean> {
  try {
    await execAsync('which ghostty');
    return true;
  } catch {
    return false;
  }
}

/**
 * Build the resume command args for a given app type
 * Returns the command and arguments separately for Ghostty
 */
export function buildResumeCommand(
  appType: AppType,
  sessionId: string
): { command: string; args: string[] } {
  switch (appType) {
    case 'claude':
      // Claude Code: claude --resume=<SESSION_ID>
      return { command: 'claude', args: [`--resume=${sessionId}`] };

    case 'opencode':
      // OpenCode: opencode -s <SESSION_ID>
      return { command: 'opencode', args: ['-s', sessionId] };

    case 'codebuddy':
      // CodeBuddy: codebuddy --resume=<SESSION_ID>
      return { command: 'codebuddy', args: [`--resume=${sessionId}`] };

    default:
      throw new Error(`Resume not supported for app type: ${appType}`);
  }
}

/**
 * Launch Ghostty with a command
 */
function launchGhostty(command: string, commandArgs: string[], workingDir?: string): void {
  // Ghostty on macOS
  // Ghostty's -e flag passes command to login, not shell
  // So we need to use: ghostty -e zsh -c "command args"
  const fullCommand = `${command} ${commandArgs.join(' ')}`;
  const args: string[] = ['-e', 'zsh', '-ic'];

  // Check if workingDir exists before using it
  const effectiveWorkingDir = workingDir && fs.existsSync(workingDir) ? workingDir : undefined;

  if (effectiveWorkingDir) {
    // Use cd command first, then the actual command, then start interactive shell
    args.push(`cd "${effectiveWorkingDir}" && ${fullCommand}; exec zsh -i`);
  } else {
    if (workingDir && !effectiveWorkingDir) {
      log.warn(`Working directory does not exist: ${workingDir}, launching without cd`);
    }
    // Execute command then start interactive shell
    args.push(`${fullCommand}; exec zsh -i`);
  }

  const child = spawn('ghostty', args, {
    detached: true,
    stdio: 'ignore',
  });

  child.unref();
  log.info(
    `Launched Ghostty with command: ${fullCommand}, workingDir: ${effectiveWorkingDir || 'none'}`
  );
}

/**
 * Launch Terminal.app (macOS default) with a command
 */
function launchTerminal(command: string): void {
  // Use AppleScript to open Terminal.app with a command
  const script = `
    tell application "Terminal"
      if not (exists window 1) then
        do script "${command.replace(/"/g, '\\"')}"
      else
        do script "${command.replace(/"/g, '\\"')}" in window 1
      end if
      activate
    end tell
  `;

  const child = spawn('osascript', ['-e', script], {
    detached: true,
    stdio: 'ignore',
  });

  child.unref();
  log.info(`Launched Terminal.app with command: ${command}`);
}

/**
 * Resume a session in terminal
 *
 * @param appType - The type of AI application (claude, opencode, etc.)
 * @param sessionId - The session ID to resume
 * @param workingDir - Optional working directory to cd into first
 * @returns Promise that resolves when terminal is launched
 */
export async function resumeSessionInTerminal(
  appType: AppType,
  sessionId: string,
  workingDir?: string
): Promise<void> {
  try {
    const { command, args } = buildResumeCommand(appType, sessionId);
    const hasGhostty = await isGhosttyInstalled();

    if (hasGhostty) {
      launchGhostty(command, args, workingDir);
    } else {
      // Terminal.app still uses the old approach with AppleScript
      const fullCommand = workingDir
        ? `cd "${workingDir}" && ${command} ${args.join(' ')}`
        : `${command} ${args.join(' ')}`;
      launchTerminal(fullCommand);
    }

    log.info(`Resumed ${appType} session ${sessionId} in ${hasGhostty ? 'Ghostty' : 'Terminal'}`);
  } catch (error) {
    log.error(`Failed to resume session:`, error);
    throw error;
  }
}

/**
 * Get available terminal options for UI display
 */
export async function getTerminalInfo(): Promise<{
  preferred: 'ghostty' | 'terminal';
  ghosttyInstalled: boolean;
}> {
  const ghosttyInstalled = await isGhosttyInstalled();
  return {
    preferred: ghosttyInstalled ? 'ghostty' : 'terminal',
    ghosttyInstalled,
  };
}
