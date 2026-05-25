import electron from 'electron';
import { ipcRegistry } from '../ipc/registry';
import { recordArg, validateArgs } from '../ipc/validation';
import { configStore } from '../utils/config-store';

const { BrowserWindow, ipcMain } = electron;

export function registerSettingsHandlers(): void {
  ipcRegistry.register('settings:get', () => {
    return configStore.getSettings();
  });

  ipcMain.on('settings:getSync', (event) => {
    event.returnValue = configStore.getSettings();
  });

  ipcRegistry.register(
    'settings:update',
    async (_event, ...args: unknown[]) => {
      const [settings] = args as [Record<string, unknown>];
      const oldSettings = configStore.getSettings();
      configStore.updateSettings(settings);

      if (settings.theme !== undefined || settings.accentColor !== undefined) {
        const theme = (settings.theme as 'light' | 'dark' | 'system') || oldSettings.theme;
        const accentColor =
          (settings.accentColor as string) || oldSettings.accentColor || 'default';

        BrowserWindow.getAllWindows().forEach((win) => {
          win.webContents.send('theme:changed', { theme, accentColor });
        });
      }
    },
    { validateArgs: validateArgs(recordArg('settings')) }
  );

  ipcRegistry.register('settings:reset', () => {
    configStore.resetSettings();
  });
}
