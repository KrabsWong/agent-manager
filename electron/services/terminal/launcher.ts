/**
 * Terminal Launcher Service
 *
 * Handles launching terminal applications to resume sessions
 * - Detects and prefers Ghostty if available
 * - Falls back to Kitty if available
 * - Falls back to system default Terminal on macOS
 * - Supports both Claude Code and OpenCode resume commands
 */

import { spawn, exec, execSync } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import log from 'electron-log';
import { configStore } from '../../utils/config-store';
import type { AppType } from '@/types';

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
 * Check if Kitty is installed
 * Kitty is often not in PATH on macOS, so check common locations
 */
export async function isKittyInstalled(): Promise<boolean> {
  // Check if kitty is in PATH
  try {
    await execAsync('which kitty');
    return true;
  } catch {
    // Check common macOS installation paths
    const kittyPaths = [
      '/Applications/kitty.app/Contents/MacOS/kitty',
      `${process.env.HOME}/Applications/kitty.app/Contents/MacOS/kitty`,
    ];

    for (const kittyPath of kittyPaths) {
      if (fs.existsSync(kittyPath)) {
        return true;
      }
    }
    return false;
  }
}

/**
 * Get the Kitty executable path
 */
function getKittyPath(): string {
  // Check if kitty is in PATH
  try {
    const result = execSync('which kitty', { encoding: 'utf-8' });
    if (result.trim()) {
      return result.trim();
    }
  } catch {
    // Fall through to check common paths
  }

  // Check common macOS installation paths
  const kittyPaths = [
    '/Applications/kitty.app/Contents/MacOS/kitty',
    `${process.env.HOME}/Applications/kitty.app/Contents/MacOS/kitty`,
  ];

  for (const kittyPath of kittyPaths) {
    if (fs.existsSync(kittyPath)) {
      return kittyPath;
    }
  }

  // Fallback to just 'kitty' and hope it's in PATH
  return 'kitty';
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

    case 'claude-internal':
      // Claude Code Internal: claude-internal --resume <SESSION_ID>
      return { command: 'claude-internal', args: ['--resume', sessionId] };

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
 * Launch Kitty with a command
 */
function launchKitty(command: string, commandArgs: string[], workingDir?: string): void {
  // Kitty: kitty --working-directory=<dir> <command>
  // Or use -e flag to execute command
  const fullCommand = `${command} ${commandArgs.join(' ')}`;

  const args: string[] = [];

  // Check if workingDir exists before using it
  const effectiveWorkingDir = workingDir && fs.existsSync(workingDir) ? workingDir : undefined;

  if (effectiveWorkingDir) {
    args.push('--working-directory', effectiveWorkingDir);
  } else if (workingDir && !effectiveWorkingDir) {
    log.warn(`Working directory does not exist: ${workingDir}, launching without cd`);
  }

  // Use -e to execute command
  args.push('-e', 'zsh', '-ic', fullCommand);

  const kittyPath = getKittyPath();
  const child = spawn(kittyPath, args, {
    detached: true,
    stdio: 'ignore',
  });

  child.unref();
  log.info(
    `Launched Kitty with command: ${fullCommand}, workingDir: ${effectiveWorkingDir || 'none'}`
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
/**
 * Get the terminal to use based on user preference and availability
 */
async function getTerminalToUse(): Promise<{
  terminal: 'ghostty' | 'kitty' | 'terminal' | 'builtin';
  ghosttyInstalled: boolean;
  kittyInstalled: boolean;
}> {
  const settings = configStore.getSettings();
  const userPreference = settings.preferredTerminal;

  const [ghosttyInstalled, kittyInstalled] = await Promise.all([
    isGhosttyInstalled(),
    isKittyInstalled(),
  ]);

  // If user has a specific preference (not auto), try to honor it
  if (userPreference !== 'auto') {
    // Check if the preferred terminal is installed
    if (userPreference === 'ghostty' && ghosttyInstalled) {
      return { terminal: 'ghostty', ghosttyInstalled, kittyInstalled };
    }
    if (userPreference === 'kitty' && kittyInstalled) {
      return { terminal: 'kitty', ghosttyInstalled, kittyInstalled };
    }
    if (userPreference === 'terminal') {
      return { terminal: 'terminal', ghosttyInstalled, kittyInstalled };
    }
    if (userPreference === 'builtin') {
      return { terminal: 'builtin', ghosttyInstalled, kittyInstalled };
    }
    // If preferred terminal is not installed, fall back to auto-detection
    log.warn(
      `Preferred terminal '${userPreference}' is not installed, falling back to auto-detection`
    );
  }

  // Auto-detect: Ghostty > Kitty > Terminal.app
  if (ghosttyInstalled) {
    return { terminal: 'ghostty', ghosttyInstalled, kittyInstalled };
  }
  if (kittyInstalled) {
    return { terminal: 'kitty', ghosttyInstalled, kittyInstalled };
  }
  return { terminal: 'terminal', ghosttyInstalled, kittyInstalled };
}

export async function resumeSessionInTerminal(
  appType: AppType,
  sessionId: string,
  workingDir?: string
): Promise<void> {
  try {
    // Get terminal based on user preference and availability
    const { terminal: terminalToUse } = await getTerminalToUse();

    // If using built-in terminal, don't launch external terminal
    // The frontend will handle the built-in terminal display
    if (terminalToUse === 'builtin') {
      log.info(`Using built-in terminal for ${appType} session ${sessionId}`);
      return;
    }

    const { command, args } = buildResumeCommand(appType, sessionId);

    let terminalUsed: string;

    switch (terminalToUse) {
      case 'ghostty':
        launchGhostty(command, args, workingDir);
        terminalUsed = 'Ghostty';
        break;
      case 'kitty':
        launchKitty(command, args, workingDir);
        terminalUsed = 'Kitty';
        break;
      case 'terminal':
      default:
        // Terminal.app still uses the old approach with AppleScript
        const fullCommand = workingDir
          ? `cd "${workingDir}" && ${command} ${args.join(' ')}`
          : `${command} ${args.join(' ')}`;
        launchTerminal(fullCommand);
        terminalUsed = 'Terminal';
        break;
    }

    log.info(`Resumed ${appType} session ${sessionId} in ${terminalUsed}`);
  } catch (error) {
    log.error(`Failed to resume session:`, error);
    throw error;
  }
}

/**
 * Get available terminal options for UI display
 */
export async function getTerminalInfo(): Promise<{
  preferred: 'auto' | 'ghostty' | 'kitty' | 'terminal' | 'builtin';
  ghosttyInstalled: boolean;
  kittyInstalled: boolean;
}> {
  const settings = configStore.getSettings();
  const userPreference = settings.preferredTerminal;

  const [ghosttyInstalled, kittyInstalled] = await Promise.all([
    isGhosttyInstalled(),
    isKittyInstalled(),
  ]);

  // Return user's preferred terminal or auto-detected
  let preferred: 'auto' | 'ghostty' | 'kitty' | 'terminal' | 'builtin';

  if (userPreference === 'auto') {
    // Auto-detect
    if (ghosttyInstalled) {
      preferred = 'ghostty';
    } else if (kittyInstalled) {
      preferred = 'kitty';
    } else {
      preferred = 'terminal';
    }
  } else {
    // User has a specific preference
    preferred = userPreference;
  }

  return {
    preferred,
    ghosttyInstalled,
    kittyInstalled,
  };
}
