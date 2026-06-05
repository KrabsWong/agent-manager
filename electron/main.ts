import electron from 'electron';
import type { BrowserWindow as BrowserWindowType } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import log from 'electron-log';
import { configStore } from './utils/config-store';
import { ipcRegistry } from './ipc/registry';
import { performanceMonitor } from './services/performance/monitor';
import { registerSessionsHandlers } from './handlers/sessions';
import { initializeGitWatcher } from './services/git-watcher';
import { registerAppHandlers } from './handlers/app';
import {
  attachNativeContextMenu,
  getWindowBackgroundColor,
  restoreAndFocusWindow,
} from './utils/native-window';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const { app, BrowserWindow, shell } = electron;

log.initialize();

// Load package.json for version info (lazy load after app is ready)
let packageJsonCache: { version: string } | null = null;
const getPackageJson = (): { version: string } => {
  if (!packageJsonCache) {
    try {
      // Try development path first
      const devPath = path.join(__dirname, '..', '..', 'package.json');
      if (fs.existsSync(devPath)) {
        packageJsonCache = JSON.parse(fs.readFileSync(devPath, 'utf-8'));
      } else {
        // Production path
        const prodPath = path.join(app.getAppPath(), 'package.json');
        packageJsonCache = JSON.parse(fs.readFileSync(prodPath, 'utf-8'));
      }
    } catch (error) {
      log.error('Failed to load package.json:', error);
      packageJsonCache = { version: '4.1.0' };
    }
  }
  return packageJsonCache ?? { version: '4.1.0' };
};

// Keep a global reference of the window object
let mainWindow: BrowserWindowType | null = null;
let splashWindow: BrowserWindowType | null = null;

// Create splash screen
const createSplashWindow = () => {
  splashWindow = new BrowserWindow({
    width: 400,
    height: 500,
    frame: false,
    alwaysOnTop: true,
    transparent: true,
    resizable: false,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Get user accent color preference
  const settings = configStore.getSettings();
  const accentColor = settings.accentColor || 'default';
  const theme = settings.theme || 'system';

  // Build splash URL with color params
  const splashPath = process.env.VITE_DEV_SERVER_URL
    ? path.join(__dirname, '../public/splash.html')
    : path.join(app.getAppPath(), 'dist', 'splash.html');

  const splashUrl = new URL(`file://${splashPath}`);
  splashUrl.searchParams.set('color', accentColor);
  splashUrl.searchParams.set('theme', theme);
  splashUrl.searchParams.set('version', getPackageJson().version);

  splashWindow.loadURL(splashUrl.toString());

  splashWindow.once('ready-to-show', () => {
    splashWindow?.show();
  });

  log.info('Splash window created with accent color:', accentColor);
};

const createWindow = () => {
  // Get saved window bounds
  const bounds = configStore.getWindowBounds();

  mainWindow = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: 'hiddenInset',
    backgroundColor: getWindowBackgroundColor(),
    show: false, // Don't show until ready
  });

  attachNativeContextMenu(mainWindow);

  // Restore maximized state
  if (bounds.maximized) {
    mainWindow.maximize();
  }

  // Disable refresh shortcuts (Cmd+R, Ctrl+R, F5) in production
  // In dev mode, allow refresh for debugging but with a warning
  mainWindow.webContents.on('before-input-event', (event, input) => {
    const isRefreshShortcut =
      (input.meta && input.key.toLowerCase() === 'r') || // Cmd+R (macOS)
      (input.control && input.key.toLowerCase() === 'r') || // Ctrl+R (Windows/Linux)
      input.key === 'F5'; // F5

    if (isRefreshShortcut) {
      if (process.env.VITE_DEV_SERVER_URL) {
        // In dev mode, allow but log a warning
        log.warn(
          'Page refresh detected in dev mode. Note: Main process changes require app restart.'
        );
      } else {
        // In production, prevent refresh
        event.preventDefault();
        log.info('Refresh shortcut blocked in production');
      }
    }
  });

  // Save window state on change
  mainWindow.on('resize', () => {
    if (mainWindow && !mainWindow.isMaximized()) {
      const [width, height] = mainWindow.getSize();
      configStore.setWindowBounds({ width, height });
    }
  });

  mainWindow.on('move', () => {
    if (mainWindow && !mainWindow.isMaximized()) {
      const [x, y] = mainWindow.getPosition();
      configStore.setWindowBounds({ x, y });
    }
  });

  mainWindow.on('maximize', () => {
    configStore.setWindowBounds({ maximized: true });
  });

  mainWindow.on('unmaximize', () => {
    configStore.setWindowBounds({ maximized: false });
  });

  // Show window when ready and close splash
  mainWindow.once('ready-to-show', () => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
      splashWindow = null;
      log.info('Splash window closed');
    }

    mainWindow?.show();

    // Check if first run
    if (configStore.isFirstRun()) {
      log.info('First run detected');
      // Could show welcome dialog here
      configStore.setFirstRunComplete();
    }
  });

  // Load app
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    // Use app.getAppPath() for correct path resolution in asar
    mainWindow.loadFile(path.join(app.getAppPath(), 'dist', 'index.html'));
  }

  // Disable dev tools in production
  if (!process.env.VITE_DEV_SERVER_URL) {
    mainWindow.webContents.on('devtools-opened', () => {
      mainWindow?.webContents.closeDevTools();
    });
  }

  log.info('Main window created');
};

// Initialize application
const initializeApp = () => {
  try {
    log.info('Initializing application...');

    // Create splash window first
    createSplashWindow();

    // Log startup time after splash and config initialization
    performanceMonitor.logStartupTime();

    // Register core IPC handlers first
    registerAppHandlers({
      dirname: __dirname,
      getPackageVersion: () => getPackageJson().version,
    });

    // Initialize git watcher service
    initializeGitWatcher();
    log.info('Git watcher service initialized');

    // Register remaining handlers asynchronously to speed up startup
    setImmediate(() => {
      registerSessionsHandlers();
      log.info('All IPC handlers registered');
    });

    // Create main window immediately (don't wait for all handlers)
    createWindow();
  } catch (error) {
    log.error('Failed to initialize application:', error);
    app.quit();
  }
};

// App event handlers
const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.whenReady().then(initializeApp);

  app.on('second-instance', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      restoreAndFocusWindow(mainWindow);
    }
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    restoreAndFocusWindow(mainWindow);
  } else if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Security: Prevent new window creation, but allow external links
app.on('web-contents-created', (_event, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    // Allow external links to open in system browser
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }

    // Deny all other window creation attempts
    log.warn(`Prevented new window creation: ${url}`);
    return { action: 'deny' };
  });
});

// Handle app quit
app.on('before-quit', () => {
  log.info('Application quitting...');
  ipcRegistry.clear();
});
