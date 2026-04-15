/**
 * Git Change Watcher Service
 *
 * Monitors .git/index file for changes and notifies renderer process
 * Only watches the currently active session directory
 */

import { ipcMain, BrowserWindow } from 'electron';
import fs from 'fs';
import path from 'path';

interface WatchTarget {
  dirPath: string;
  window: BrowserWindow;
}

class GitWatcherService {
  private currentWatcher: fs.FSWatcher | null = null;
  private currentTarget: WatchTarget | null = null;
  private debounceTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.registerIpcHandlers();
  }

  private registerIpcHandlers(): void {
    // Start watching a session directory
    ipcMain.handle('git:watch:start', async (event, dirPath: string) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (!window) return { success: false, error: 'No window found' };

      this.startWatching(dirPath, window);
      return { success: true };
    });

    // Stop watching
    ipcMain.handle('git:watch:stop', async () => {
      this.stopWatching();
      return { success: true };
    });
  }

  public startWatching(dirPath: string, window: BrowserWindow): void {
    // Stop any existing watcher first
    this.stopWatching();

    const gitIndexPath = path.join(dirPath, '.git', 'index');

    // Check if it's a git repo
    if (!fs.existsSync(gitIndexPath)) {
      console.log(`[GitWatcher] Not a git repo: ${dirPath}`);
      return;
    }

    console.log(`[GitWatcher] Starting watch on: ${dirPath}`);

    this.currentTarget = { dirPath, window };

    try {
      // Watch the entire directory for file changes, but debounce the git status check
      this.currentWatcher = fs.watch(dirPath, { recursive: true }, (_eventType, filename) => {
        // Ignore .git directory changes except index
        if (filename?.startsWith('.git/') && !filename.startsWith('.git/index')) {
          return;
        }

        // Debounce the notification
        this.debounceNotify();
      });

      // Also watch .git/index specifically for git operations
      const indexWatcher = fs.watch(gitIndexPath, () => {
        this.debounceNotify();
      });

      // Store both watchers
      this.currentWatcher = {
        close: () => {
          this.currentWatcher?.close();
          indexWatcher.close();
        },
      } as fs.FSWatcher;
    } catch (err) {
      console.error(`[GitWatcher] Failed to watch ${dirPath}:`, err);
      this.currentWatcher = null;
      this.currentTarget = null;
    }
  }

  public stopWatching(): void {
    if (this.currentWatcher) {
      console.log(`[GitWatcher] Stopping watch on: ${this.currentTarget?.dirPath}`);
      this.currentWatcher.close();
      this.currentWatcher = null;
      this.currentTarget = null;
    }

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  private debounceNotify(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.notifyChange();
    }, 300); // Debounce 300ms to batch rapid changes
  }

  private notifyChange(): void {
    if (!this.currentTarget?.window || this.currentTarget.window.isDestroyed()) {
      this.stopWatching();
      return;
    }

    // Send change notification to renderer
    this.currentTarget.window.webContents.send('git:changed', {
      dirPath: this.currentTarget.dirPath,
      timestamp: Date.now(),
    });

    console.log(`[GitWatcher] Notified change for: ${this.currentTarget.dirPath}`);
  }

  public destroy(): void {
    this.stopWatching();
  }
}

// Singleton instance
let serviceInstance: GitWatcherService | null = null;

export function initializeGitWatcher(): GitWatcherService {
  if (!serviceInstance) {
    serviceInstance = new GitWatcherService();
  }
  return serviceInstance;
}

export function getGitWatcher(): GitWatcherService | null {
  return serviceInstance;
}
