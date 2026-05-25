import { ipcRegistry } from '../ipc/registry';
import { registerFileHandlers } from './file';
import { registerFilePreviewHandlers } from './file-preview';
import { registerGitHandlers } from './git';
import { registerSettingsHandlers } from './settings';

interface RegisterAppHandlersOptions {
  dirname: string;
  getPackageVersion: () => string;
}

export function registerAppHandlers({
  dirname,
  getPackageVersion,
}: RegisterAppHandlersOptions): void {
  ipcRegistry.register('app:getVersion', () => {
    return getPackageVersion();
  });

  registerSettingsHandlers();
  registerFilePreviewHandlers({ dirname });
  registerFileHandlers();
  registerGitHandlers();
}
