import {
  _electron as electron,
  expect,
  test,
  type ElectronApplication,
  type Page,
} from '@playwright/test';
import { execFile } from 'child_process';
import { mkdtemp, mkdir, realpath, rm, writeFile } from 'fs/promises';
import os from 'os';
import path from 'path';
import { promisify } from 'util';
import { fileURLToPath } from 'url';

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
};

type Session = {
  id: string;
  appType: string;
};

type ElectronApiWindow = Window & {
  electronAPI?: {
    invoke: (channel: string, ...args: unknown[]) => Promise<unknown>;
  };
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, '..');
const execFileAsync = promisify(execFile);

function testEnv(overrides: Record<string, string> = {}): Record<string, string> {
  const env: Record<string, string> = {};

  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) {
      env[key] = value;
    }
  }

  env.NODE_ENV = 'test';
  env.ELECTRON_DISABLE_SECURITY_WARNINGS = '1';
  return { ...env, ...overrides };
}

async function createCodebuddyFixture(options: { withGitChanges?: boolean } = {}): Promise<{
  homeDir: string;
  projectDir: string;
  packagePath: string;
  sessionId: string;
}> {
  const homeDir = await mkdtemp(path.join(os.tmpdir(), 'yes-sessions-e2e-home-'));
  const projectDir = path.join(homeDir, 'fixture-project');
  const packagePath = path.join(projectDir, 'package.json');
  const codebuddyProjectDir = path.join(homeDir, '.codebuddy', 'projects', 'fixture-project');
  const sessionId = 'fixture-session';
  const start = Date.UTC(2026, 4, 25, 9, 0, 0);

  await mkdir(projectDir, { recursive: true });
  await mkdir(codebuddyProjectDir, { recursive: true });
  await writeFile(packagePath, '{\n  "name": "yes-sessions",\n  "fixture": true\n}\n');

  if (options.withGitChanges) {
    await execFileAsync('git', ['init'], { cwd: projectDir });
    await execFileAsync('git', ['config', 'user.email', 'e2e@example.com'], { cwd: projectDir });
    await execFileAsync('git', ['config', 'user.name', 'Yes Sessions E2E'], { cwd: projectDir });
    await writeFile(packagePath, '{\n  "name": "yes-sessions",\n  "fixture": false\n}\n');
    await execFileAsync('git', ['add', 'package.json'], { cwd: projectDir });
    await execFileAsync('git', ['commit', '-m', 'Initial fixture'], { cwd: projectDir });
    await writeFile(packagePath, '{\n  "name": "yes-sessions",\n  "fixture": true\n}\n');
  }

  const lines = [
    {
      id: 'm1',
      timestamp: start,
      type: 'message',
      role: 'user',
      cwd: projectDir,
      providerData: { model: 'fixture-model' },
      content: [{ type: 'input_text', text: 'Summarize fixture project' }],
    },
    {
      id: 'call-1',
      timestamp: start + 1000,
      type: 'function_call',
      name: 'Read',
      callId: 'call-1',
      arguments: JSON.stringify({ file_path: path.join(projectDir, 'package.json') }),
    },
    {
      id: 'result-1',
      timestamp: start + 2000,
      type: 'function_call_result',
      name: 'Read',
      callId: 'call-1',
      output: { type: 'text', text: '{ "name": "yes-sessions" }' },
    },
    {
      id: 'm2',
      timestamp: start + 3000,
      type: 'message',
      role: 'assistant',
      content: [{ type: 'output_text', text: 'Fixture package is yes-sessions.' }],
    },
  ];

  await writeFile(
    path.join(codebuddyProjectDir, `${sessionId}.jsonl`),
    lines.map((line) => JSON.stringify(line)).join('\n')
  );

  return {
    homeDir,
    projectDir: await realpath(projectDir),
    packagePath: await realpath(packagePath),
    sessionId,
  };
}

async function waitForMainWindow(app: ElectronApplication): Promise<Page> {
  const deadline = Date.now() + 15_000;

  while (Date.now() < deadline) {
    for (const page of app.windows()) {
      const url = page.url();
      if (url.includes('dist/index.html') || url.includes('localhost:5173')) {
        await page.waitForLoadState('domcontentloaded');
        return page;
      }
    }

    await app.waitForEvent('window', { timeout: 500 }).catch(() => undefined);
  }

  throw new Error('Main Electron window did not load');
}

function expectSuccessfulResponse<T>(response: ApiResponse<T>, channel: string): T {
  expect(response.success, `${channel} failed: ${response.error?.message ?? 'unknown error'}`).toBe(
    true
  );
  return response.data as T;
}

test('launches the built Electron app and serves core IPC channels', async () => {
  const electronApp = await electron.launch({
    args: [appRoot],
    env: testEnv(),
  });

  try {
    const mainWindow = await waitForMainWindow(electronApp);

    await expect
      .poll(() =>
        mainWindow.evaluate(() => {
          const win = window as ElectronApiWindow;
          return typeof win.electronAPI?.invoke === 'function';
        })
      )
      .toBe(true);

    const responses = await mainWindow.evaluate(async () => {
      const win = window as ElectronApiWindow;
      if (!win.electronAPI) {
        throw new Error('electronAPI is not available');
      }

      const invoke = (channel: string, ...args: unknown[]) =>
        win.electronAPI!.invoke(channel, ...args);

      const version = await invoke('app:getVersion');
      const settings = await invoke('settings:get');
      const terminalInfo = await invoke('sessions:getTerminalInfo');
      const supportStatus = await invoke('sessions:getSupportStatus', 'codebuddy');
      const stats = await invoke('sessions:getStats', 'codebuddy');
      const sessions = await invoke('sessions:getAll', 'codebuddy');

      let detail: unknown = null;
      const sessionData = (sessions as ApiResponse<Session[]>).data;
      if (
        (sessions as ApiResponse<Session[]>).success &&
        Array.isArray(sessionData) &&
        sessionData[0]
      ) {
        detail = await invoke('sessions:getDetail', sessionData[0].id, sessionData[0].appType);
      }

      return {
        version,
        settings,
        terminalInfo,
        supportStatus,
        stats,
        sessions,
        detail,
      };
    });

    const version = expectSuccessfulResponse<string>(
      responses.version as ApiResponse<string>,
      'app:getVersion'
    );
    expect(version).toMatch(/^\d+\.\d+\.\d+/);

    const settings = expectSuccessfulResponse<Record<string, unknown>>(
      responses.settings as ApiResponse<Record<string, unknown>>,
      'settings:get'
    );
    expect(settings).toHaveProperty('theme');
    expect(settings).toHaveProperty('language');

    const terminalInfo = expectSuccessfulResponse<Record<string, unknown>>(
      responses.terminalInfo as ApiResponse<Record<string, unknown>>,
      'sessions:getTerminalInfo'
    );
    expect(terminalInfo).toHaveProperty('preferred');

    const supportStatus = expectSuccessfulResponse<Record<string, unknown>>(
      responses.supportStatus as ApiResponse<Record<string, unknown>>,
      'sessions:getSupportStatus'
    );
    expect(supportStatus).toHaveProperty('supported');
    expect(supportStatus).toHaveProperty('isAvailable');

    const stats = expectSuccessfulResponse<Record<string, unknown>>(
      responses.stats as ApiResponse<Record<string, unknown>>,
      'sessions:getStats'
    );
    expect(typeof stats.totalSessions).toBe('number');
    expect(typeof stats.totalMessages).toBe('number');

    const sessions = expectSuccessfulResponse<Session[]>(
      responses.sessions as ApiResponse<Session[]>,
      'sessions:getAll'
    );
    expect(Array.isArray(sessions)).toBe(true);

    if (responses.detail) {
      const detail = expectSuccessfulResponse<Record<string, unknown>>(
        responses.detail as ApiResponse<Record<string, unknown>>,
        'sessions:getDetail'
      );
      expect(detail).toHaveProperty('messages');
      expect(Array.isArray(detail.messages)).toBe(true);
    }
  } finally {
    await electronApp.close();
  }
});

test('opens settings and switches between settings tabs', async () => {
  const electronApp = await electron.launch({
    args: [appRoot],
    env: testEnv(),
  });

  try {
    const mainWindow = await waitForMainWindow(electronApp);

    await mainWindow.getByTestId('settings-button').click();
    await expect(mainWindow.getByTestId('settings-dialog')).toBeVisible();
    await expect(mainWindow.getByTestId('settings-panel-general')).toBeVisible();

    await mainWindow.getByTestId('settings-tab-experience').click();
    await expect(mainWindow.getByTestId('settings-panel-experience')).toBeVisible();

    await mainWindow.getByTestId('settings-tab-terminal').click();
    await expect(mainWindow.getByTestId('settings-panel-terminal')).toBeVisible();

    await mainWindow.keyboard.press('Escape');
    await expect(mainWindow.getByTestId('settings-dialog')).toBeHidden();
  } finally {
    await electronApp.close();
  }
});

test('renders a fixture Codebuddy session from list to conversation detail', async () => {
  const fixture = await createCodebuddyFixture();
  const electronApp = await electron.launch({
    args: [appRoot],
    env: testEnv({
      HOME: fixture.homeDir,
      USERPROFILE: fixture.homeDir,
    }),
  });

  try {
    const mainWindow = await waitForMainWindow(electronApp);
    const sessionCard = mainWindow.locator(
      `[data-testid="session-card"][data-session-id="${fixture.sessionId}"]`
    );

    await expect(sessionCard).toBeVisible();
    await expect(sessionCard).toContainText('Summarize fixture project');

    await sessionCard.click();

    const conversation = mainWindow.getByTestId('conversation-detail');
    await expect(conversation).toContainText('Summarize fixture project');
    await expect(conversation).toContainText('Read');
    await expect(conversation).toContainText('package.json');
    await expect(conversation).toContainText('Fixture package is yes-sessions.');
  } finally {
    await electronApp.close();
    await rm(fixture.homeDir, { recursive: true, force: true });
  }
});

test('opens file preview window and reads a fixture project file', async () => {
  const fixture = await createCodebuddyFixture();
  const electronApp = await electron.launch({
    args: [appRoot],
    env: testEnv({
      HOME: fixture.homeDir,
      USERPROFILE: fixture.homeDir,
    }),
  });

  try {
    const mainWindow = await waitForMainWindow(electronApp);
    await expect(
      mainWindow.locator(`[data-testid="session-card"][data-session-id="${fixture.sessionId}"]`)
    ).toBeVisible();

    const previewWindowPromise = electronApp.waitForEvent('window');
    await mainWindow.getByTestId('open-file-preview-button').click();
    const previewWindow = await previewWindowPromise;
    await previewWindow.waitForLoadState('domcontentloaded');

    await expect(previewWindow.getByTestId('file-preview-window')).toBeVisible();
    await expect(previewWindow.getByTestId('file-preview-empty')).toBeVisible();

    await previewWindow
      .locator(`[data-testid="file-tree-file"][data-file-path="${fixture.packagePath}"]`)
      .click();
    await expect(previewWindow.getByTestId('file-preview-panel')).toBeVisible();
    await expect(previewWindow.getByTestId('file-preview-content')).toContainText('yes-sessions');
    await expect(previewWindow.getByTestId('file-preview-content')).toContainText('"fixture"');
  } finally {
    await electronApp.close();
    await rm(fixture.homeDir, { recursive: true, force: true });
  }
});

test('opens git diff in the file preview window for a fixture repository change', async () => {
  const fixture = await createCodebuddyFixture({ withGitChanges: true });
  const electronApp = await electron.launch({
    args: [appRoot],
    env: testEnv({
      HOME: fixture.homeDir,
      USERPROFILE: fixture.homeDir,
    }),
  });

  try {
    const mainWindow = await waitForMainWindow(electronApp);
    await expect(
      mainWindow.locator(`[data-testid="session-card"][data-session-id="${fixture.sessionId}"]`)
    ).toBeVisible();

    const previewWindowPromise = electronApp.waitForEvent('window');
    await mainWindow.getByTestId('open-file-preview-button').click();
    const previewWindow = await previewWindowPromise;
    await previewWindow.waitForLoadState('domcontentloaded');

    await previewWindow.getByTestId('git-tab').click();
    await expect(previewWindow.getByTestId('git-diff-view')).toBeVisible();

    await previewWindow
      .locator('[data-testid="git-change-row"][data-file-path="package.json"]')
      .click();
    await expect(previewWindow.getByTestId('git-diff-preview')).toBeVisible();
    await expect(previewWindow.getByTestId('git-diff-preview')).toContainText('"fixture": false');
    await expect(previewWindow.getByTestId('git-diff-preview')).toContainText('"fixture": true');
  } finally {
    await electronApp.close();
    await rm(fixture.homeDir, { recursive: true, force: true });
  }
});
