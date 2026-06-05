import electron from 'electron';
import type { BrowserWindow as BrowserWindowType, MenuItemConstructorOptions } from 'electron';
import { configStore } from './config-store';

const { Menu, nativeTheme } = electron;

export function getWindowBackgroundColor(): string {
  const settings = configStore.getSettings();
  const isDark =
    settings.theme === 'dark' || (settings.theme === 'system' && nativeTheme.shouldUseDarkColors);

  return isDark ? '#020817' : '#ffffff';
}

export function restoreAndFocusWindow(window: BrowserWindowType): void {
  if (window.isDestroyed()) return;
  if (window.isMinimized()) {
    window.restore();
  }
  if (!window.isVisible()) {
    window.show();
  }
  window.focus();
}

export function attachNativeContextMenu(window: BrowserWindowType): void {
  window.webContents.on('context-menu', (event, params) => {
    event.preventDefault();

    const template: MenuItemConstructorOptions[] = params.isEditable
      ? [
          { role: 'undo' },
          { role: 'redo' },
          { type: 'separator' },
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' },
          { type: 'separator' },
          { role: 'selectAll' },
        ]
      : params.selectionText.trim()
        ? [{ role: 'copy' }, { type: 'separator' }, { role: 'selectAll' }]
        : [];

    if (template.length === 0) return;

    Menu.buildFromTemplate(template).popup({ window });
  });
}
