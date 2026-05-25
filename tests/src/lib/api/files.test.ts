import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fileApi, filePreviewApi, treeApi } from '@/lib/api/files';
import type { TreeNode } from '@/types';

const invoke = vi.fn();

beforeEach(() => {
  invoke.mockReset();
  Object.defineProperty(window, 'electronAPI', {
    configurable: true,
    value: {
      invoke,
    },
  });
});

describe('file api wrappers', () => {
  it('opens file preview with the expected IPC channel and arguments', async () => {
    invoke.mockResolvedValue({ success: true });

    await filePreviewApi.open('/repo', 'Session title');

    expect(invoke).toHaveBeenCalledWith('file-preview:open', '/repo', 'Session title');
  });

  it('returns directory tree data', async () => {
    const tree: TreeNode[] = [{ name: 'src', path: '/repo/src', type: 'directory' }];
    invoke.mockResolvedValue({ success: true, data: tree });

    await expect(treeApi.getDirectoryTree('/repo')).resolves.toEqual(tree);
    expect(invoke).toHaveBeenCalledWith('tree:get', '/repo');
  });

  it('throws IPC error messages for directory tree failures', async () => {
    invoke.mockResolvedValue({
      success: false,
      error: { code: 'READ_FAILED', message: 'Cannot list directory' },
    });

    await expect(treeApi.getDirectoryTree('/repo')).rejects.toThrow('Cannot list directory');
  });

  it('returns text file contents', async () => {
    invoke.mockResolvedValue({ success: true, data: 'hello' });

    await expect(fileApi.read('/repo/README.md')).resolves.toBe('hello');
    expect(invoke).toHaveBeenCalledWith('file:read', '/repo/README.md');
  });

  it('returns image data URLs', async () => {
    invoke.mockResolvedValue({ success: true, data: 'data:image/png;base64,abc' });

    await expect(fileApi.readImage('/repo/image.png')).resolves.toBe('data:image/png;base64,abc');
    expect(invoke).toHaveBeenCalledWith('file:readImage', '/repo/image.png');
  });

  it('throws fallback errors when file read failures omit details', async () => {
    invoke.mockResolvedValue({ success: false });

    await expect(fileApi.read('/repo/missing.txt')).rejects.toThrow('Unknown error');
  });
});
