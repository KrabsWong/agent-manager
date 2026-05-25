import { describe, expect, it } from 'vitest';
import { buildTerminalLaunchSpec, selectTerminal } from '@/lib/terminal/externalTerminal';

describe('externalTerminal', () => {
  it('selects the preferred terminal when it is available', () => {
    expect(selectTerminal('ghostty', { ghosttyInstalled: true, kittyInstalled: true })).toBe(
      'ghostty'
    );
    expect(selectTerminal('kitty', { ghosttyInstalled: true, kittyInstalled: true })).toBe('kitty');
    expect(selectTerminal('terminal', { ghosttyInstalled: true, kittyInstalled: true })).toBe(
      'terminal'
    );
  });

  it('falls back from unavailable preferred terminals using auto-detect priority', () => {
    expect(selectTerminal('ghostty', { ghosttyInstalled: false, kittyInstalled: true })).toBe(
      'kitty'
    );
    expect(selectTerminal('kitty', { ghosttyInstalled: true, kittyInstalled: false })).toBe(
      'ghostty'
    );
    expect(selectTerminal('ghostty', { ghosttyInstalled: false, kittyInstalled: false })).toBe(
      'terminal'
    );
  });

  it('auto-detects Ghostty before Kitty and Terminal.app', () => {
    expect(selectTerminal('auto', { ghosttyInstalled: true, kittyInstalled: true })).toBe(
      'ghostty'
    );
    expect(selectTerminal('auto', { ghosttyInstalled: false, kittyInstalled: true })).toBe('kitty');
    expect(selectTerminal('auto', { ghosttyInstalled: false, kittyInstalled: false })).toBe(
      'terminal'
    );
  });

  it('builds Ghostty launch args with an existing working directory', () => {
    expect(
      buildTerminalLaunchSpec('ghostty', 'codebuddy', ['--resume=session-1'], {
        workingDir: '/repo/app',
        workingDirExists: true,
      })
    ).toEqual({
      executable: 'ghostty',
      args: ['-e', 'zsh', '-ic', 'cd "/repo/app" && codebuddy --resume=session-1; exec zsh -i'],
    });
  });

  it('builds Kitty launch args without a missing working directory', () => {
    expect(
      buildTerminalLaunchSpec('kitty', 'opencode', ['-s', 'session-1'], {
        workingDir: '/missing',
        workingDirExists: false,
        kittyPath: '/Applications/kitty.app/Contents/MacOS/kitty',
      })
    ).toEqual({
      executable: '/Applications/kitty.app/Contents/MacOS/kitty',
      args: ['-e', 'zsh', '-ic', 'opencode -s session-1'],
    });
  });

  it('builds Terminal.app AppleScript launch args', () => {
    const spec = buildTerminalLaunchSpec('terminal', 'claude', ['--resume=session-1']);

    expect(spec.executable).toBe('osascript');
    expect(spec.args[0]).toBe('-e');
    expect(spec.args[1]).toContain('tell application "Terminal"');
    expect(spec.args[1]).toContain('do script "claude --resume=session-1"');
  });
});
