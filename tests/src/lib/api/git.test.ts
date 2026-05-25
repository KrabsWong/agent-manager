import { beforeEach, describe, expect, it, vi } from 'vitest';
import { gitApi } from '@/lib/api/git';
import type { GitStatusResult } from '@/types';

const invoke = vi.fn();
const on = vi.fn();
const removeAllListeners = vi.fn();

beforeEach(() => {
  invoke.mockReset();
  on.mockReset();
  removeAllListeners.mockReset();
  Object.defineProperty(window, 'electronAPI', {
    configurable: true,
    value: {
      invoke,
      on,
      removeAllListeners,
    },
  });
});

describe('git api wrappers', () => {
  it('returns git status data', async () => {
    const status: GitStatusResult = {
      isGitRepo: true,
      branch: 'main',
      ahead: 1,
      behind: 0,
      staged: [],
      unstaged: [],
      untracked: [],
    };
    invoke.mockResolvedValue({ success: true, data: status });

    await expect(gitApi.getStatus('/repo')).resolves.toEqual(status);
    expect(invoke).toHaveBeenCalledWith('git:status', '/repo');
  });

  it('passes optional file paths to git diff requests', async () => {
    invoke.mockResolvedValue({ success: true, data: 'diff --git a/file b/file' });

    await expect(gitApi.getDiff('/repo', 'src/index.ts')).resolves.toContain('diff --git');
    expect(invoke).toHaveBeenCalledWith('git:diff', '/repo', 'src/index.ts');
  });

  it('returns file diff content', async () => {
    invoke.mockResolvedValue({
      success: true,
      data: { original: 'old', modified: 'new', hasChanges: true },
    });

    await expect(gitApi.getFileDiff('/repo', 'README.md')).resolves.toEqual({
      original: 'old',
      modified: 'new',
      hasChanges: true,
    });
    expect(invoke).toHaveBeenCalledWith('git:fileDiff', '/repo', 'README.md');
  });

  it('throws IPC error messages for failures', async () => {
    invoke.mockResolvedValue({
      success: false,
      error: { code: 'NOT_REPO', message: 'Not a git repository' },
    });

    await expect(gitApi.getStatus('/repo')).rejects.toThrow('Not a git repository');
  });

  it('starts and stops git watching', async () => {
    invoke.mockResolvedValue({ success: true });

    await gitApi.startWatching('/repo');
    await gitApi.stopWatching();

    expect(invoke).toHaveBeenNthCalledWith(1, 'git:watch:start', '/repo');
    expect(invoke).toHaveBeenNthCalledWith(2, 'git:watch:stop');
  });

  it('subscribes to git change events and removes listeners on cleanup', () => {
    const callback = vi.fn();

    const cleanup = gitApi.onChange(callback);
    const handler = on.mock.calls[0][1] as (_event: unknown, data: { dirPath: string }) => void;
    handler({}, { dirPath: '/repo' });
    cleanup();

    expect(on).toHaveBeenCalledWith('git:changed', expect.any(Function));
    expect(callback).toHaveBeenCalledWith('/repo');
    expect(removeAllListeners).toHaveBeenCalledWith('git:changed');
  });
});
