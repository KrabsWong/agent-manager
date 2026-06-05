import electron from 'electron';
import type { BrowserWindow as BrowserWindowType } from 'electron';
import path from 'path';
import { ipcRegistry } from '../ipc/registry';
import { optionalStringArg, stringArg, validateArgs } from '../ipc/validation';
import { configStore } from '../utils/config-store';
import {
  attachNativeContextMenu,
  getWindowBackgroundColor,
  restoreAndFocusWindow,
} from '../utils/native-window';

const { app, BrowserWindow } = electron;

interface RegisterFilePreviewHandlersOptions {
  dirname: string;
}

const filePreviewWindows = new Map<string, BrowserWindowType>();

export function registerFilePreviewHandlers({ dirname }: RegisterFilePreviewHandlersOptions): void {
  ipcRegistry.register(
    'file-preview:open',
    async (_event, ...args: unknown[]) => {
      const [dirPath, sessionTitle] = args as [string, string | undefined];
      const existing = filePreviewWindows.get(dirPath);
      if (existing && !existing.isDestroyed()) {
        restoreAndFocusWindow(existing);
        return { success: true };
      }

      const win = new BrowserWindow({
        width: 1400,
        height: 800,
        minWidth: 900,
        minHeight: 600,
        webPreferences: {
          preload: path.join(dirname, 'preload.js'),
          contextIsolation: true,
          nodeIntegration: false,
        },
        titleBarStyle: 'hiddenInset',
        backgroundColor: getWindowBackgroundColor(),
        show: false,
      });

      attachNativeContextMenu(win);

      win.on('closed', () => {
        filePreviewWindows.delete(dirPath);
      });

      const settings = configStore.getSettings();
      const theme = settings.theme || 'system';
      const accentColor = settings.accentColor || 'default';

      if (process.env.VITE_DEV_SERVER_URL) {
        const url = new URL(process.env.VITE_DEV_SERVER_URL);
        url.pathname = '/file-preview.html';
        url.searchParams.set('dir', dirPath);
        url.searchParams.set('theme', theme);
        url.searchParams.set('accentColor', accentColor);
        if (sessionTitle) url.searchParams.set('session', sessionTitle);
        win.loadURL(url.toString());
        win.webContents.openDevTools();
      } else {
        const filePath = path.join(app.getAppPath(), 'dist', 'file-preview.html');
        const fileUrl = new URL(`file://${filePath}`);
        fileUrl.searchParams.set('dir', dirPath);
        fileUrl.searchParams.set('theme', theme);
        fileUrl.searchParams.set('accentColor', accentColor);
        if (sessionTitle) fileUrl.searchParams.set('session', sessionTitle);
        win.loadURL(fileUrl.toString());
      }

      win.once('ready-to-show', () => {
        win.show();
      });

      if (!process.env.VITE_DEV_SERVER_URL) {
        win.webContents.on('devtools-opened', () => {
          win.webContents.closeDevTools();
        });
      }

      filePreviewWindows.set(dirPath, win);

      return { success: true };
    },
    {
      validateArgs: validateArgs(stringArg('dirPath'), optionalStringArg('sessionTitle')),
    }
  );
}
