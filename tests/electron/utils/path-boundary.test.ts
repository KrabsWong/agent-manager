import path from 'path';
import { describe, expect, it } from 'vitest';
import { isPathInsideAnyRoot } from '@electron/utils/path-boundary';

describe('path boundary helpers', () => {
  const root = path.resolve('/tmp/project');

  it('allows a root path and nested paths', () => {
    expect(isPathInsideAnyRoot(root, [root])).toBe(true);
    expect(isPathInsideAnyRoot(path.join(root, 'src/index.ts'), [root])).toBe(true);
  });

  it('rejects sibling paths with the same prefix', () => {
    expect(isPathInsideAnyRoot(path.resolve('/tmp/project-copy/file.txt'), [root])).toBe(false);
  });

  it('rejects parent traversal after path resolution', () => {
    expect(isPathInsideAnyRoot(path.join(root, '../secret.txt'), [root])).toBe(false);
  });

  it('checks paths against multiple roots', () => {
    expect(isPathInsideAnyRoot('/tmp/other/file.txt', [root, '/tmp/other'])).toBe(true);
    expect(isPathInsideAnyRoot('/tmp/unknown/file.txt', [root, '/tmp/other'])).toBe(false);
  });
});
