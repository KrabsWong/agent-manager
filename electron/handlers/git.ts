/**
 * Git Handlers
 *
 * Provides git status and diff functionality for the context panel
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import log from 'electron-log';
import type { GitStatusResult, GitFileChange } from '../../src/lib/api';

const execAsync = promisify(exec);

/**
 * Check if a directory is a git repository
 */
async function isGitRepo(dirPath: string): Promise<boolean> {
  try {
    const gitDir = path.join(dirPath, '.git');
    const exists = fs.existsSync(gitDir);
    if (!exists) return false;

    // Also verify it's a valid git repo by running git status
    await execAsync('git rev-parse --git-dir', { cwd: dirPath });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get current git branch
 */
async function getBranch(dirPath: string): Promise<string> {
  try {
    const { stdout } = await execAsync('git rev-parse --abbrev-ref HEAD', {
      cwd: dirPath,
    });
    return stdout.trim();
  } catch (error) {
    log.error('Failed to get git branch:', error);
    return 'unknown';
  }
}

/**
 * Get ahead/behind counts relative to upstream
 */
async function getAheadBehind(dirPath: string): Promise<{ ahead: number; behind: number }> {
  try {
    const { stdout } = await execAsync(
      'git rev-list --left-right --count HEAD...@{u} 2>/dev/null || echo "0\t0"',
      { cwd: dirPath }
    );
    const [ahead, behind] = stdout.trim().split('\t').map(Number);
    return { ahead: ahead || 0, behind: behind || 0 };
  } catch {
    return { ahead: 0, behind: 0 };
  }
}

/**
 * Parse git status --porcelain output
 */
function parsePorcelainStatus(output: string): GitFileChange[] {
  const changes: GitFileChange[] = [];
  const lines = output.split('\n').filter((line) => line.length > 0);

  for (const line of lines) {
    if (line.length < 4) continue;

    const indexStatus = line[0];
    const worktreeStatus = line[1];
    const filePath = line.slice(3);

    let status: GitFileChange['status'] = 'unknown';

    // Determine status from index and worktree status codes
    // https://git-scm.com/docs/git-status#_short_format
    if (indexStatus === '?' && worktreeStatus === '?') {
      status = 'untracked';
    } else if (indexStatus !== ' ' && indexStatus !== '?') {
      // Staged changes
      if (indexStatus === 'A') status = 'added';
      else if (indexStatus === 'M') status = 'modified';
      else if (indexStatus === 'D') status = 'deleted';
      else if (indexStatus === 'R') status = 'renamed';
      else status = 'modified';
    } else if (worktreeStatus !== ' ') {
      // Unstaged changes
      if (worktreeStatus === 'M') status = 'modified';
      else if (worktreeStatus === 'D') status = 'deleted';
      else if (worktreeStatus === '?') status = 'untracked';
      else status = 'modified';
    }

    changes.push({
      path: filePath,
      status,
      additions: 0,
      deletions: 0,
    });
  }

  return changes;
}

/**
 * Get diff stats for a file
 */
async function getFileDiffStats(
  dirPath: string,
  filePath: string,
  staged: boolean
): Promise<{ additions: number; deletions: number }> {
  try {
    const stagedFlag = staged ? '--staged' : '';
    const { stdout } = await execAsync(`git diff ${stagedFlag} --numstat -- "${filePath}"`, {
      cwd: dirPath,
    });

    const line = stdout.trim().split('\n')[0];
    if (!line) return { additions: 0, deletions: 0 };

    const parts = line.split('\t');
    if (parts.length < 2) return { additions: 0, deletions: 0 };

    // Handle binary files
    if (parts[0] === '-') return { additions: 0, deletions: 0 };

    return {
      additions: parseInt(parts[0], 10) || 0,
      deletions: parseInt(parts[1], 10) || 0,
    };
  } catch (error) {
    log.error(`Failed to get diff stats for ${filePath}:`, error);
    return { additions: 0, deletions: 0 };
  }
}

/**
 * Get line count for an untracked file
 */
async function getUntrackedFileLineCount(dirPath: string, filePath: string): Promise<number> {
  try {
    const fullPath = path.join(dirPath, filePath);

    // Check if it's a binary file first
    try {
      const { stdout: fileType } = await execAsync(`file -b --mime-type "${fullPath}"`);
      if (!fileType.includes('text') && !fileType.includes('json') && !fileType.includes('xml')) {
        return 0; // Binary file
      }
    } catch {
      // If file command fails, try to read it anyway
    }

    // Count lines using wc -l
    const { stdout } = await execAsync(`wc -l < "${fullPath}"`);
    const lineCount = parseInt(stdout.trim(), 10);
    return isNaN(lineCount) ? 0 : lineCount;
  } catch (error) {
    log.error(`Failed to get line count for untracked file ${filePath}:`, error);
    return 0;
  }
}

/**
 * Get git status for a directory
 */
export async function getGitStatus(dirPath: string): Promise<GitStatusResult> {
  try {
    // Check if it's a git repo
    const isRepo = await isGitRepo(dirPath);
    if (!isRepo) {
      return {
        isGitRepo: false,
        branch: '',
        ahead: 0,
        behind: 0,
        staged: [],
        unstaged: [],
        untracked: [],
      };
    }

    // Get branch and ahead/behind
    const [branch, aheadBehind] = await Promise.all([getBranch(dirPath), getAheadBehind(dirPath)]);

    // Get status with all untracked files (not just directories)
    const { stdout: statusOutput } = await execAsync('git status --porcelain -uall', {
      cwd: dirPath,
    });

    const allChanges = parsePorcelainStatus(statusOutput);

    // Categorize changes
    const staged: GitFileChange[] = [];
    const unstaged: GitFileChange[] = [];
    const untracked: GitFileChange[] = [];

    for (const change of allChanges) {
      if (change.status === 'untracked') {
        untracked.push(change);
      } else {
        // Check if it's staged by looking at the porcelain status line again
        const lines = statusOutput.split('\n').filter((l) => l.length > 0);
        const line = lines.find((l) => l.slice(3) === change.path);
        if (line && line[0] !== ' ' && line[0] !== '?') {
          staged.push(change);
        } else {
          unstaged.push(change);
        }
      }
    }

    // Get diff stats for each file
    for (const file of staged) {
      const stats = await getFileDiffStats(dirPath, file.path, true);
      file.additions = stats.additions;
      file.deletions = stats.deletions;
    }

    for (const file of unstaged) {
      const stats = await getFileDiffStats(dirPath, file.path, false);
      file.additions = stats.additions;
      file.deletions = stats.deletions;
    }

    // Get line count for untracked files (they show as additions)
    for (const file of untracked) {
      const lineCount = await getUntrackedFileLineCount(dirPath, file.path);
      file.additions = lineCount;
      file.deletions = 0;
    }

    return {
      isGitRepo: true,
      branch,
      ahead: aheadBehind.ahead,
      behind: aheadBehind.behind,
      staged,
      unstaged,
      untracked,
    };
  } catch (error) {
    log.error('Failed to get git status:', error);
    throw new Error(`Failed to get git status: ${error}`);
  }
}

/**
 * Get git diff for a file or entire repository
 */
export async function getGitDiff(dirPath: string, filePath?: string): Promise<string> {
  try {
    const isRepo = await isGitRepo(dirPath);
    if (!isRepo) {
      throw new Error('Not a git repository');
    }

    const fileArg = filePath ? `-- "${filePath}"` : '';
    const { stdout } = await execAsync(`git diff ${fileArg}`, { cwd: dirPath });

    return stdout;
  } catch (error) {
    log.error('Failed to get git diff:', error);
    throw new Error(`Failed to get git diff: ${error}`);
  }
}

export interface FileDiffResult {
  original: string;
  modified: string;
  hasChanges: boolean;
}

/**
 * Check if a file is an image based on extension
 */
function isImageFile(filePath: string): boolean {
  const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.svg', '.ico'];
  const ext = path.extname(filePath).toLowerCase();
  return imageExtensions.includes(ext);
}

/**
 * Get original (HEAD) and modified (working tree) versions of a file
 * For image files, returns base64 encoded content
 */
export async function getFileDiffContent(
  dirPath: string,
  filePath: string
): Promise<FileDiffResult> {
  try {
    const isRepo = await isGitRepo(dirPath);
    if (!isRepo) {
      throw new Error('Not a git repository');
    }

    const fullPath = path.join(dirPath, filePath);
    const isImage = isImageFile(filePath);

    let modified = '';
    let original = '';

    if (isImage) {
      // For image files, read as binary and convert to base64
      try {
        const buffer = await fs.promises.readFile(fullPath);
        modified = buffer.toString('base64');
      } catch (err) {
        // File might be deleted in working tree
        modified = '';
      }

      // Get the HEAD version as base64
      try {
        const { stdout } = await execAsync(
          `git show HEAD:"${filePath}" | base64`,
          { cwd: dirPath }
        );
        original = stdout.trim();
      } catch (err) {
        // File might be new (not in HEAD)
        original = '';
      }
    } else {
      // For text files, read as utf-8
      try {
        modified = await fs.promises.readFile(fullPath, 'utf-8');
      } catch (err) {
        // File might be deleted in working tree
        modified = '';
      }

      // Get the HEAD version
      try {
        const { stdout } = await execAsync(`git show HEAD:"${filePath}"`, { cwd: dirPath });
        original = stdout;
      } catch (err) {
        // File might be new (not in HEAD)
        original = '';
      }
    }

    // Check if there are actual changes
    const { stdout: diffOutput } = await execAsync(`git diff HEAD -- "${filePath}"`, {
      cwd: dirPath,
    });

    return {
      original,
      modified,
      hasChanges: diffOutput.length > 0,
    };
  } catch (error) {
    log.error('Failed to get file diff content:', error);
    throw new Error(`Failed to get file diff content: ${error}`);
  }
}
