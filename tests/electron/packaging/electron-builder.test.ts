import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

const projectRoot = path.resolve(__dirname, '../../..');

describe('electron-builder packaging', () => {
  it('bundles better-sqlite3 runtime dependencies for packaged OpenCode support', () => {
    const config = fs.readFileSync(path.join(projectRoot, 'electron-builder.yml'), 'utf-8');

    expect(config).toContain('from: node_modules/better-sqlite3');
    expect(config).toContain('from: node_modules/bindings');
    expect(config).toContain('from: node_modules/file-uri-to-path');
  });
});
