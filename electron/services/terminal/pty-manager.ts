/**
 * PTY Terminal Service
 *
 * Manages pseudo-terminal (PTY) instances for built-in terminal functionality
 * Uses node-pty to spawn real shell processes
 */

import * as pty from 'node-pty';
import * as os from 'os';
import log from 'electron-log';
import { ipcMain, BrowserWindow } from 'electron';

export interface PTYSession {
  id: string;
  pty: pty.IPty;
  shell: string;
  cwd: string;
  createdAt: number;
}

class PTYManager {
  private sessions: Map<string, PTYSession> = new Map();
  private static instance: PTYManager;

  static getInstance(): PTYManager {
    if (!PTYManager.instance) {
      PTYManager.instance = new PTYManager();
    }
    return PTYManager.instance;
  }

  /**
   * Get the default shell for the current platform
   */
  private getDefaultShell(): string {
    const platform = os.platform();

    if (platform === 'darwin') {
      // macOS: prefer zsh, fallback to bash
      return process.env.SHELL || '/bin/zsh';
    } else if (platform === 'linux') {
      return process.env.SHELL || '/bin/bash';
    } else if (platform === 'win32') {
      return process.env.COMSPEC || 'cmd.exe';
    }

    return '/bin/sh';
  }

  /**
   * Create a new PTY session
   */
  createSession(
    sessionId: string,
    options: {
      cwd?: string;
      shell?: string;
      env?: { [key: string]: string | undefined };
    } = {}
  ): PTYSession {
    // Check if session already exists
    if (this.sessions.has(sessionId)) {
      log.warn(`PTY session ${sessionId} already exists, returning existing`);
      return this.sessions.get(sessionId)!;
    }

    const shell = options.shell || this.getDefaultShell();
    const cwd = options.cwd || os.homedir();

    log.info(`Creating PTY session: ${sessionId}, shell: ${shell}, cwd: ${cwd}`);

    try {
      // Build environment variables, ensuring PATH and other important vars are set
      const env = {
        ...process.env,
        ...options.env,
        TERM: 'xterm-256color',
        COLORTERM: 'truecolor',
        // Ensure PATH includes common locations for CLI tools
        PATH: process.env.PATH || '/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin',
        HOME: process.env.HOME || os.homedir(),
        USER: process.env.USER || os.userInfo().username,
        SHELL: shell,
        LANG: process.env.LANG || 'en_US.UTF-8',
        LC_ALL: process.env.LC_ALL || 'en_US.UTF-8',
        // Interactive shell settings
        PS1: '\\$ ',
        PS2: '> ',
        PS4: '+ ',
      };

      // Use login shell (-l) to ensure proper environment loading
      // This is important for tools like opencode that rely on shell config
      const isLoginShell = shell.includes('zsh') || shell.includes('bash');
      const shellArgs = isLoginShell ? ['-l'] : [];

      const ptyProcess = pty.spawn(shell, shellArgs, {
        name: 'xterm-256color',
        cols: 120,
        rows: 30,
        cwd,
        env,
        // Use native encoding
        encoding: 'utf-8',
      });

      const session: PTYSession = {
        id: sessionId,
        pty: ptyProcess,
        shell,
        cwd,
        createdAt: Date.now(),
      };

      this.sessions.set(sessionId, session);

      // Handle data from PTY
      ptyProcess.onData((data) => {
        this.sendToRenderer(sessionId, 'pty:data', { sessionId, data });
      });

      // Handle PTY exit
      ptyProcess.onExit(({ exitCode, signal }) => {
        log.info(`PTY session ${sessionId} exited with code ${exitCode}, signal ${signal}`);
        this.sendToRenderer(sessionId, 'pty:exit', { sessionId, exitCode, signal });
        this.sessions.delete(sessionId);
      });

      log.info(`PTY session ${sessionId} created successfully`);
      return session;
    } catch (error) {
      log.error(`Failed to create PTY session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Write data to PTY
   */
  write(sessionId: string, data: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      log.warn(`Cannot write to non-existent PTY session: ${sessionId}`);
      return;
    }

    try {
      session.pty.write(data);
    } catch (error) {
      log.error(`Failed to write to PTY session ${sessionId}:`, error);
    }
  }

  /**
   * Resize PTY
   */
  resize(sessionId: string, cols: number, rows: number): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      log.warn(`Cannot resize non-existent PTY session: ${sessionId}`);
      return;
    }

    try {
      session.pty.resize(cols, rows);
    } catch (error) {
      log.error(`Failed to resize PTY session ${sessionId}:`, error);
    }
  }

  /**
   * Kill PTY session
   * Uses SIGKILL to forcefully terminate the process and all its children
   */
  kill(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      log.warn(`Cannot kill non-existent PTY session: ${sessionId}`);
      return;
    }

    try {
      // Get the PID of the PTY process
      const pid = session.pty.pid;
      
      // First try graceful kill
      try {
        session.pty.kill();
      } catch (e) {
        // Ignore errors from pty.kill()
      }
      
      // Force kill the process and its children using SIGKILL
      if (pid) {
        try {
          // Kill the entire process group to ensure all children are terminated
          process.kill(-pid, 'SIGKILL');
          log.info(`PTY session ${sessionId} (PID: ${pid}) and its process group killed with SIGKILL`);
        } catch (e) {
          // If killing process group fails, try killing just the process
          try {
            process.kill(pid, 'SIGKILL');
            log.info(`PTY session ${sessionId} (PID: ${pid}) killed with SIGKILL`);
          } catch (e2) {
            log.warn(`Failed to kill PTY process ${pid}, may already be terminated`);
          }
        }
      }
      
      this.sessions.delete(sessionId);
    } catch (error) {
      log.error(`Failed to kill PTY session ${sessionId}:`, error);
      // Still delete from sessions map to avoid memory leak
      this.sessions.delete(sessionId);
    }
  }

  /**
   * Get session info
   */
  getSession(sessionId: string): PTYSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Check if session exists
   */
  hasSession(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }

  /**
   * List all active sessions
   */
  listSessions(): string[] {
    return Array.from(this.sessions.keys());
  }

  /**
   * Kill all sessions
   */
  killAll(): void {
    for (const [sessionId, session] of this.sessions) {
      try {
        session.pty.kill();
      } catch (error) {
        log.error(`Error killing PTY session ${sessionId}:`, error);
      }
    }
    this.sessions.clear();
    log.info('All PTY sessions killed');
  }

  /**
   * Send data to renderer process
   */
  private sendToRenderer(_sessionId: string, channel: string, data: unknown): void {
    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
      windows[0].webContents.send(channel, data);
    }
  }
}

export const ptyManager = PTYManager.getInstance();

/**
 * Register IPC handlers for PTY
 */
export function registerPTYHandlers(): void {
  // Create PTY session
  ipcMain.handle('pty:create', (_event, sessionId: string, options: { cwd?: string }) => {
    try {
      const session = ptyManager.createSession(sessionId, options);
      return { success: true, sessionId: session.id, shell: session.shell };
    } catch (error) {
      log.error('Failed to create PTY session:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // Write to PTY
  ipcMain.handle('pty:write', (_event, sessionId: string, data: string) => {
    ptyManager.write(sessionId, data);
    return { success: true };
  });

  // Resize PTY
  ipcMain.handle('pty:resize', (_event, sessionId: string, cols: number, rows: number) => {
    ptyManager.resize(sessionId, cols, rows);
    return { success: true };
  });

  // Kill PTY session
  ipcMain.handle('pty:kill', (_event, sessionId: string) => {
    ptyManager.kill(sessionId);
    return { success: true };
  });

  // Get session info
  ipcMain.handle('pty:info', (_event, sessionId: string) => {
    const session = ptyManager.getSession(sessionId);
    if (session) {
      return {
        success: true,
        sessionId: session.id,
        shell: session.shell,
        cwd: session.cwd,
      };
    }
    return { success: false, error: 'Session not found' };
  });

  log.info('PTY IPC handlers registered');
}
