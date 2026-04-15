/**
 * Tree Handler
 *
 * Builds a directory tree structure for the context panel
 */

import * as fs from 'fs/promises';
import * as path from 'path';

export interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: TreeNode[];
}

const MAX_DEPTH = 3;
const MAX_ITEMS_PER_DIR = 100;

// Directories to ignore
const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  '.svn',
  '.hg',
  'dist',
  'build',
  'out',
  'coverage',
  '.next',
  '.nuxt',
  '.cache',
  'vendor',
]);

// Files to ignore
const IGNORED_FILES = new Set(['.DS_Store', 'Thumbs.db', 'desktop.ini']);

export async function buildDirectoryTree(dirPath: string, depth = 0): Promise<TreeNode[]> {
  if (depth > MAX_DEPTH) return [];

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    const nodes: TreeNode[] = [];

    for (const entry of entries) {
      const name = entry.name;

      // Skip hidden files and ignored items
      if (name.startsWith('.')) continue;
      if (entry.isDirectory() && IGNORED_DIRS.has(name)) continue;
      if (entry.isFile() && IGNORED_FILES.has(name)) continue;

      const fullPath = path.join(dirPath, name);
      const node: TreeNode = {
        name,
        path: fullPath,
        type: entry.isDirectory() ? 'directory' : 'file',
      };

      if (entry.isDirectory()) {
        node.children = await buildDirectoryTree(fullPath, depth + 1);
      }

      nodes.push(node);

      // Limit items per directory
      if (nodes.length >= MAX_ITEMS_PER_DIR) break;
    }

    // Sort: directories first, then alphabetically
    return nodes.sort((a, b) => {
      if (a.type === 'directory' && b.type === 'file') return -1;
      if (a.type === 'file' && b.type === 'directory') return 1;
      return a.name.localeCompare(b.name);
    });
  } catch {
    return [];
  }
}
