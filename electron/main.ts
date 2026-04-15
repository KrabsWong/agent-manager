import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import log from 'electron-log';
import { dbManager } from './database';
import { configStore } from './utils/config-store';
import { ipcRegistry } from './ipc/registry';
import { performanceMonitor } from './services/performance/monitor';
import { registerSessionsHandlers } from './handlers/sessions';
import { buildDirectoryTree } from './handlers/tree';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
let mainWindow: BrowserWindow | null = null;
let splashWindow: BrowserWindow | null = null;

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

  // Show window when ready and close splash
  mainWindow.once('ready-to-show', () => {
    // Ensure splash shows for at least 2.5 seconds
    setTimeout(() => {
      // Close splash window if exists
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
    }, 1500);
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

    // Initialize database first (critical path)
    dbManager.initialize();
    log.info('Database initialized');

    // Log startup time after database initialization
    performanceMonitor.logStartupTime();

    // Log database stats
    const stats = dbManager.getStats();
    log.info('Database stats:', stats);

    // Register core IPC handlers first
    registerAppHandlers();

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

// Register application-level IPC handlers
const registerAppHandlers = () => {
  // App version - use already loaded package.json
  ipcRegistry.register('app:getVersion', () => {
    return getPackageJson().version;
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

// Register shell handler for opening files/directories
ipcMain.handle('shell:openPath', async (_event, filePath: string) => {
  const result = await shell.openPath(filePath);
  if (result) {
    log.warn(`Failed to open path: ${filePath}, error: ${result}`);
  }
});

// Register tree handler for directory listing
ipcMain.handle('tree:get', async (_event, dirPath: string) => {
  try {
    const nodes = await buildDirectoryTree(dirPath);
    return { success: true, data: nodes };
  } catch (error) {
    log.error('Failed to build directory tree:', error);
    return { success: false, error: String(error) };
  }
});

// Register file read handler
import { readFile } from 'fs/promises';
ipcMain.handle('file:read', async (_event, filePath: string) => {
  try {
    // Validate file path (basic security)
    if (!filePath || typeof filePath !== 'string') {
      throw new Error('Invalid file path');
    }
    // Prevent reading directories
    const stats = await fs.promises.stat(filePath);
    if (stats.isDirectory()) {
      throw new Error('Cannot read directory as file');
    }
    // Limit file size (50MB for text files)
    if (stats.size > 50 * 1024 * 1024) {
      throw new Error('File too large (>50MB)');
    }
    const content = await readFile(filePath, 'utf-8');
    return content;
  } catch (error) {
    log.error('Failed to read file:', error);
    throw error;
  }
});

// Register image file read handler (returns base64)
ipcMain.handle('file:readImage', async (_event, filePath: string) => {
  try {
    // Validate file path (basic security)
    if (!filePath || typeof filePath !== 'string') {
      throw new Error('Invalid file path');
    }
    // Prevent reading directories
    const stats = await fs.promises.stat(filePath);
    if (stats.isDirectory()) {
      throw new Error('Cannot read directory as image');
    }
    // Limit file size (10MB)
    if (stats.size > 10 * 1024 * 1024) {
      throw new Error('Image too large (>10MB)');
    }
    // Read as base64
    const buffer = await readFile(filePath);
    const ext = filePath.split('.').pop()?.toLowerCase() || '';
    const mimeTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      svg: 'image/svg+xml',
      bmp: 'image/bmp',
      ico: 'image/x-icon',
      tiff: 'image/tiff',
      tif: 'image/tiff',
      avif: 'image/avif',
      heic: 'image/heic',
      heif: 'image/heif',
    };
    const mimeType = mimeTypes[ext] || 'image/png';
    const base64 = buffer.toString('base64');
    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    log.error('Failed to read image:', error);
    throw error;
  }
});

// Register git handlers
import { getGitStatus, getGitDiff, getFileDiffContent } from './handlers/git.js';

ipcMain.handle('git:status', async (_event, dirPath: string) => {
  try {
    const result = await getGitStatus(dirPath);
    return { success: true, data: result };
  } catch (error) {
    log.error('Failed to get git status:', error);
    return {
      success: false,
      error: {
        code: 'GIT_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
});

ipcMain.handle('git:diff', async (_event, dirPath: string, filePath?: string) => {
  try {
    const result = await getGitDiff(dirPath, filePath);
    return { success: true, data: result };
  } catch (error) {
    log.error('Failed to get git diff:', error);
    return {
      success: false,
      error: {
        code: 'GIT_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
});

ipcMain.handle('git:fileDiff', async (_event, dirPath: string, filePath: string) => {
  try {
    const result = await getFileDiffContent(dirPath, filePath);
    return { success: true, data: result };
  } catch (error) {
    log.error('Failed to get file diff content:', error);
    return {
      success: false,
      error: {
        code: 'GIT_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    };
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
  dbManager.close();
  ipcRegistry.clear();
});
