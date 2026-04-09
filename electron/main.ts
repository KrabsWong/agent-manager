import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import log from 'electron-log';
import { dbManager } from './database';
import { configStore } from './utils/config-store';
import { ipcRegistry } from './ipc/registry';
import { registerProviderHandlers } from './handlers/providers';
import { registerMcpHandlers } from './handlers/mcp';
import { registerSkillsHandlers } from './handlers/skills';
import { registerPromptHandlers } from './handlers/prompts';
import { initializePromptService } from './services/prompt/crud';
import { registerProxyHandlers } from './handlers/proxy';
import { initializeProxyServer } from './services/proxy/server';
import { initializeUsageTracker } from './services/proxy/usage-tracker';
import { performanceMonitor } from './services/performance/monitor';
import { registerSessionsHandlers } from './handlers/sessions';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

log.initialize();

// Keep a global reference of the window object
let mainWindow: BrowserWindow | null = null;

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
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 12, y: 12 },
    show: false, // Don't show until ready
  });

  // Restore maximized state
  if (bounds.maximized) {
    mainWindow.maximize();
  }

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

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
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
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  log.info('Main window created');
};

// Initialize application
const initializeApp = () => {
  try {
    log.info('Initializing application...');

    // Initialize database first (critical path)
    dbManager.initialize();
    log.info('Database initialized');

    // Log startup time after database initialization
    performanceMonitor.logStartupTime();

    // Initialize prompt service with database
    const db = dbManager.getDatabase();
    if (db) {
      initializePromptService(db);
      log.info('Prompt service initialized');

      // Initialize proxy services
      initializeUsageTracker(db);
      initializeProxyServer();
      log.info('Proxy services initialized');
    }

    // Log database stats
    const stats = dbManager.getStats();
    log.info('Database stats:', stats);

    // Register core IPC handlers first
    registerProviderHandlers();
    registerMcpHandlers();
    registerAppHandlers();

    // Register remaining handlers asynchronously to speed up startup
    setImmediate(() => {
      registerSkillsHandlers();
      registerPromptHandlers();
      registerProxyHandlers();
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

// Register application-level IPC handlers
const registerAppHandlers = () => {
  // App version
  ipcRegistry.register('app:getVersion', () => {
    return app.getVersion();
  });

  // Get settings
  ipcRegistry.register('settings:get', () => {
    return configStore.getSettings();
  });

  // Update settings
  ipcRegistry.register('settings:update', async (_event, ...args: unknown[]) => {
    const [settings] = args as [Record<string, unknown>];
    configStore.updateSettings(settings);
  });

  // Reset settings
  ipcRegistry.register('settings:reset', () => {
    configStore.resetSettings();
  });

  // Export config
  ipcRegistry.register('config:export', () => {
    return configStore.exportConfig();
  });

  // Import config
  ipcRegistry.register('config:import', async (_event, ...args: unknown[]) => {
    const [data] = args as [Record<string, unknown>];
    configStore.importConfig(data);
  });

  // Window control: minimize
  ipcRegistry.register('app:minimize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.minimize();
    }
  });

  // Window control: maximize
  ipcRegistry.register('app:maximize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.maximize();
    }
  });

  // Window control: restore
  ipcRegistry.register('app:restore', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.restore();
    }
  });

  // Window control: close
  ipcRegistry.register('app:close', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.close();
    }
  });

  // Window control: is maximized
  ipcRegistry.register('app:isMaximized', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      return mainWindow.isMaximized();
    }
    return false;
  });
};

// App event handlers
app.whenReady().then(initializeApp);

app.on('window-all-closed', () => {
  // Close database connection
  dbManager.close();

  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Register shell handler for opening external links
ipcMain.handle('shell:openExternal', async (_event, url: string) => {
  await shell.openExternal(url);
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
  dbManager.close();
  ipcRegistry.clear();
});
