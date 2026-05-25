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
import type { AppType, TerminalInfo } from '@/types';
import { buildResumeCommand } from '../../../src/lib/terminal/resumeCommand';
import {
  buildTerminalLaunchSpec,
  selectTerminal,
  type ExternalTerminal,
  type TerminalLaunchSpec,
} from '../../../src/lib/terminal/externalTerminal';

const execAsync = promisify(exec);

/**
 * Check if Ghostty is installed
 */
async function isGhosttyInstalled(): Promise<boolean> {
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
async function isKittyInstalled(): Promise<boolean> {
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

function spawnDetached(spec: TerminalLaunchSpec): void {
  const child = spawn(spec.executable, spec.args, {
    detached: true,
    stdio: 'ignore',
  });

  child.unref();
}

/**
 * Get the terminal to use based on user preference and availability
 */
async function getTerminalToUse(): Promise<{
  terminal: ExternalTerminal;
  ghosttyInstalled: boolean;
  kittyInstalled: boolean;
}> {
  const settings = configStore.getSettings();
  const userPreference = settings.preferredTerminal;

  const [ghosttyInstalled, kittyInstalled] = await Promise.all([
    isGhosttyInstalled(),
    isKittyInstalled(),
  ]);

  const terminal = selectTerminal(userPreference, { ghosttyInstalled, kittyInstalled });

  if (
    (userPreference === 'ghostty' && !ghosttyInstalled) ||
    (userPreference === 'kitty' && !kittyInstalled)
  ) {
    log.warn(
      `Preferred terminal '${userPreference}' is not installed, falling back to auto-detection`
    );
  }

  return { terminal, ghosttyInstalled, kittyInstalled };
}

export async function resumeSessionInTerminal(
  appType: AppType,
  sessionId: string,
  workingDir?: string
): Promise<void> {
  try {
    // Get terminal based on user preference and availability
    const { terminal: terminalToUse } = await getTerminalToUse();

    const { command, args } = buildResumeCommand(appType, sessionId);

    const workingDirExists = workingDir ? fs.existsSync(workingDir) : false;
    if (workingDir && !workingDirExists) {
      log.warn(`Working directory does not exist: ${workingDir}, launching without cd`);
    }
    const spec = buildTerminalLaunchSpec(terminalToUse, command, args, {
      workingDir,
      workingDirExists,
      kittyPath: terminalToUse === 'kitty' ? getKittyPath() : undefined,
    });

    spawnDetached(spec);

    log.info(`Resumed ${appType} session ${sessionId} in ${terminalToUse}`);
  } catch (error) {
    log.error(`Failed to resume session:`, error);
    throw error;
  }
}

/**
 * Get available terminal options for UI display
 */
export async function getTerminalInfo(): Promise<TerminalInfo> {
  const settings = configStore.getSettings();
  const userPreference = settings.preferredTerminal;

  const [ghosttyInstalled, kittyInstalled] = await Promise.all([
    isGhosttyInstalled(),
    isKittyInstalled(),
  ]);

  const preferred = selectTerminal(userPreference, { ghosttyInstalled, kittyInstalled });

  return {
    preferred,
    ghosttyInstalled,
    kittyInstalled,
  };
}
