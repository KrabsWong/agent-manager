export type ExternalTerminal = 'ghostty' | 'kitty' | 'terminal';
export type TerminalPreference = ExternalTerminal | 'auto';

export interface TerminalAvailability {
  ghosttyInstalled: boolean;
  kittyInstalled: boolean;
}

export interface TerminalLaunchSpec {
  executable: string;
  args: string[];
}

function launchTerminalScript(command: string): string {
  return `
    tell application "Terminal"
      if not (exists window 1) then
        do script "${command.replace(/"/g, '\\"')}"
      else
        do script "${command.replace(/"/g, '\\"')}" in window 1
      end if
      activate
    end tell
  `;
}

export function selectTerminal(
  userPreference: TerminalPreference,
  availability: TerminalAvailability
): ExternalTerminal {
  if (userPreference !== 'auto') {
    if (userPreference === 'ghostty' && availability.ghosttyInstalled) {
      return 'ghostty';
    }
    if (userPreference === 'kitty' && availability.kittyInstalled) {
      return 'kitty';
    }
    if (userPreference === 'terminal') {
      return 'terminal';
    }
  }

  if (availability.ghosttyInstalled) {
    return 'ghostty';
  }
  if (availability.kittyInstalled) {
    return 'kitty';
  }
  return 'terminal';
}

export function buildTerminalLaunchSpec(
  terminal: ExternalTerminal,
  command: string,
  commandArgs: string[],
  options: {
    workingDir?: string;
    workingDirExists?: boolean;
    kittyPath?: string;
  } = {}
): TerminalLaunchSpec {
  const fullCommand = `${command} ${commandArgs.join(' ')}`;
  const effectiveWorkingDir =
    options.workingDir && options.workingDirExists ? options.workingDir : undefined;

  switch (terminal) {
    case 'ghostty': {
      const shellCommand = effectiveWorkingDir
        ? `cd "${effectiveWorkingDir}" && ${fullCommand}; exec zsh -i`
        : `${fullCommand}; exec zsh -i`;
      return {
        executable: 'ghostty',
        args: ['-e', 'zsh', '-ic', shellCommand],
      };
    }

    case 'kitty': {
      const args: string[] = [];
      if (effectiveWorkingDir) {
        args.push('--working-directory', effectiveWorkingDir);
      }
      args.push('-e', 'zsh', '-ic', fullCommand);
      return {
        executable: options.kittyPath || 'kitty',
        args,
      };
    }

    case 'terminal':
      return {
        executable: 'osascript',
        args: ['-e', launchTerminalScript(fullCommand)],
      };
  }
}
