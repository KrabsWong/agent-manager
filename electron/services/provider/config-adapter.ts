/**
 * Provider Config Adapter
 *
 * Synchronizes provider configurations to app-specific config files
 * Handles format conversion for different AI CLI tools
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import log from 'electron-log';
import type { AppType, Provider } from '../../../src/types';

// Config file paths for each app
const CLAUDE_CONFIG_PATH = path.join(os.homedir(), '.claude', 'settings.json');
const CODEX_AUTH_PATH = path.join(os.homedir(), '.codex', 'auth.json');
const CODEX_CONFIG_PATH = path.join(os.homedir(), '.codex', 'config.toml');
const GEMINI_ENV_PATH = path.join(os.homedir(), '.gemini', '.env');
const GEMINI_SETTINGS_PATH = path.join(os.homedir(), '.gemini', 'settings.json');
const OPENCODE_CONFIG_PATH = path.join(os.homedir(), '.opencode', 'settings.json');
const OPENCLAW_CONFIG_PATH = path.join(os.homedir(), '.openclaw', 'settings.json');
const CODEBUDDY_CONFIG_PATH = path.join(os.homedir(), '.codebuddy', 'settings.json');

/**
 * Read JSON config file
 */
function readJsonConfig(configPath: string): Record<string, any> {
  try {
    if (!fs.existsSync(configPath)) {
      return {};
    }
    const content = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    log.error(`Failed to read config from ${configPath}:`, error);
    return {};
  }
}

/**
 * Write JSON config file
 */
function writeJsonConfig(configPath: string, config: Record<string, any>): void {
  try {
    const dir = path.dirname(configPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
    log.info(`Updated config at ${configPath}`);
  } catch (error) {
    log.error(`Failed to write config to ${configPath}:`, error);
    throw error;
  }
}

/**
 * Read text file
 */
function readTextFile(filePath: string): string {
  try {
    if (!fs.existsSync(filePath)) {
      return '';
    }
    return fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    log.error(`Failed to read file ${filePath}:`, error);
    return '';
  }
}

/**
 * Write text file
 */
function writeTextFile(filePath: string, content: string): void {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, content, 'utf-8');
    log.info(`Updated file at ${filePath}`);
  } catch (error) {
    log.error(`Failed to write file ${filePath}:`, error);
    throw error;
  }
}

/**
 * Parse env file content to object
 */
function parseEnvFile(content: string): Record<string, string> {
  const env: Record<string, string> = {};
  content.split('\n').forEach((line) => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      env[match[1].trim()] = match[2].trim();
    }
  });
  return env;
}

/**
 * Convert env object to file content
 */
function stringifyEnvFile(env: Record<string, string>): string {
  return Object.entries(env)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
}

/**
 * Convert provider config to Claude format
 * Claude uses: ~/.claude/settings.json
 */
function convertToClaudeFormat(provider: Provider): Record<string, any> {
  const config: Record<string, any> = {};
  const settings = provider.settingsConfig;

  // Handle API Key - goes to env
  const apiKey = settings.apiKey as string;
  const apiKeyField = (settings.apiKeyField as string) || 'ANTHROPIC_AUTH_TOKEN';
  if (apiKey) {
    if (!config.env) config.env = {};
    config.env[apiKeyField] = apiKey;
  }

  // Handle Base URL - goes to env
  const baseUrl = settings.baseUrl as string;
  if (baseUrl) {
    if (!config.env) config.env = {};
    config.env.ANTHROPIC_BASE_URL = baseUrl;
  }

  // Handle Model - top level
  const model = settings.model as string;
  if (model) {
    config.model = model;
  }

  // Handle Max Tokens - top level
  const maxTokens = settings.maxTokens as number;
  if (maxTokens) {
    config.maxTokens = maxTokens;
  }

  // Handle Temperature - top level
  const temperature = settings.temperature as number;
  if (temperature !== undefined) {
    config.temperature = temperature;
  }

  // Handle systemPrompt - top level
  const systemPrompt = settings.systemPrompt as string;
  if (systemPrompt) {
    config.systemPrompt = systemPrompt;
  }

  return config;
}

/**
 * Convert provider config to Codex format
 * Codex uses: ~/.codex/auth.json + ~/.codex/config.toml
 */
function convertToCodexFormat(provider: Provider): { auth: Record<string, any>; config: string } {
  const settings = provider.settingsConfig;

  // Auth goes to auth.json
  const auth: Record<string, any> = {};
  const apiKey = settings.apiKey as string;
  if (apiKey) {
    auth.OPENAI_API_KEY = apiKey;
  }

  // Config goes to config.toml
  const config = (settings.config as string) || '';

  return { auth, config };
}

/**
 * Convert provider config to Gemini format
 * Gemini uses: ~/.gemini/.env + ~/.gemini/settings.json
 */
function convertToGeminiFormat(provider: Provider): {
  env: Record<string, string>;
  settings: Record<string, any>;
} {
  const settings = provider.settingsConfig;
  const env: Record<string, string> = {};
  const geminiSettings: Record<string, any> = {};

  // API Key and Base URL go to .env
  const apiKey = settings.apiKey as string;
  if (apiKey) {
    env.GEMINI_API_KEY = apiKey;
  }

  const baseUrl = settings.baseUrl as string;
  if (baseUrl) {
    env.GOOGLE_GEMINI_BASE_URL = baseUrl;
  }

  // Model goes to both .env and settings.json
  const model = settings.model as string;
  if (model) {
    env.GEMINI_MODEL = model;
    geminiSettings.model = model;
  }

  return { env, settings: geminiSettings };
}

/**
 * Convert provider config to OpenCode format
 * OpenCode uses: ~/.opencode/settings.json
 */
function convertToOpenCodeFormat(provider: Provider): Record<string, any> {
  const settings = provider.settingsConfig;
  const providerKey =
    (settings.providerKey as string) || provider.name.toLowerCase().replace(/\s+/g, '_');

  const config: Record<string, any> = {
    providerKey,
    enabled: settings.enabled ?? true,
    options: {
      apiKey: settings.apiKey as string,
      baseUrl: settings.baseUrl as string,
      model: settings.model as string,
    },
  };

  return config;
}

/**
 * Convert provider config to OpenClaw format
 * OpenClaw uses: ~/.openclaw/settings.json
 */
function convertToOpenClawFormat(provider: Provider): Record<string, any> {
  const settings = provider.settingsConfig;
  const providerName = (settings.providerName as string) || provider.name;

  const config: Record<string, any> = {
    models: {
      providers: [
        {
          name: providerName,
          apiKey: settings.apiKey as string,
          baseUrl: settings.baseUrl as string,
          model: settings.model as string,
          default: (settings.isDefault as boolean) || false,
        },
      ],
    },
  };

  return config;
}

/**
 * Convert provider config to Codebuddy format
 * Codebuddy uses: ~/.codebuddy/settings.json
 */
function convertToCodebuddyFormat(provider: Provider): Record<string, any> {
  const settings = provider.settingsConfig;
  const providerKey =
    (settings.providerKey as string) || provider.name.toLowerCase().replace(/\s+/g, '_');

  const config: Record<string, any> = {
    providerKey,
    enabled: settings.enabled ?? true,
    options: {
      apiKey: settings.apiKey as string,
      baseUrl: settings.baseUrl as string,
      model: settings.model as string,
    },
  };

  return config;
}

/**
 * Sync provider config to app config file(s)
 */
export function syncProviderToApp(provider: Provider): void {
  const { appType } = provider;

  log.info(`Syncing provider ${provider.name} to ${appType}`);

  switch (appType) {
    case 'claude': {
      const providerConfig = convertToClaudeFormat(provider);
      const appConfig = readJsonConfig(CLAUDE_CONFIG_PATH);

      // Merge: update env and other fields
      if (providerConfig.env) {
        appConfig.env = { ...appConfig.env, ...providerConfig.env };
      }
      Object.keys(providerConfig).forEach((key) => {
        if (key !== 'env') {
          appConfig[key] = providerConfig[key];
        }
      });

      writeJsonConfig(CLAUDE_CONFIG_PATH, appConfig);
      break;
    }

    case 'codex': {
      const { auth, config } = convertToCodexFormat(provider);

      // Write auth to auth.json
      const existingAuth = readJsonConfig(CODEX_AUTH_PATH);
      writeJsonConfig(CODEX_AUTH_PATH, { ...existingAuth, ...auth });

      // Write config to config.toml
      if (config) {
        writeTextFile(CODEX_CONFIG_PATH, config);
      }
      break;
    }

    case 'gemini': {
      const { env, settings } = convertToGeminiFormat(provider);

      // Read existing env
      const existingEnvContent = readTextFile(GEMINI_ENV_PATH);
      const existingEnv = parseEnvFile(existingEnvContent);

      // Merge and write env
      const mergedEnv = { ...existingEnv, ...env };
      writeTextFile(GEMINI_ENV_PATH, stringifyEnvFile(mergedEnv));

      // Write settings to settings.json
      const existingSettings = readJsonConfig(GEMINI_SETTINGS_PATH);
      writeJsonConfig(GEMINI_SETTINGS_PATH, { ...existingSettings, ...settings });
      break;
    }

    case 'opencode': {
      const providerConfig = convertToOpenCodeFormat(provider);
      const appConfig = readJsonConfig(OPENCODE_CONFIG_PATH);

      // OpenCode uses provider key structure
      const providerKey = providerConfig.providerKey;
      if (!appConfig.providers) appConfig.providers = {};
      appConfig.providers[providerKey] = providerConfig.options;

      writeJsonConfig(OPENCODE_CONFIG_PATH, appConfig);
      break;
    }

    case 'openclaw': {
      const providerConfig = convertToOpenClawFormat(provider);
      const appConfig = readJsonConfig(OPENCLAW_CONFIG_PATH);

      // OpenClaw uses additive mode
      if (!appConfig.models) appConfig.models = {};
      if (!appConfig.models.providers) appConfig.models.providers = [];

      // Find existing provider or add new
      const providerName = providerConfig.models.providers[0].name;
      const existingIndex = appConfig.models.providers.findIndex(
        (p: any) => p.name === providerName
      );

      if (existingIndex >= 0) {
        appConfig.models.providers[existingIndex] = providerConfig.models.providers[0];
      } else {
        appConfig.models.providers.push(providerConfig.models.providers[0]);
      }

      writeJsonConfig(OPENCLAW_CONFIG_PATH, appConfig);
      break;
    }

    case 'codebuddy': {
      const providerConfig = convertToCodebuddyFormat(provider);
      const appConfig = readJsonConfig(CODEBUDDY_CONFIG_PATH);

      // Codebuddy uses provider key structure similar to OpenCode
      const providerKey = providerConfig.providerKey;
      if (!appConfig.providers) appConfig.providers = {};
      appConfig.providers[providerKey] = providerConfig.options;

      writeJsonConfig(CODEBUDDY_CONFIG_PATH, appConfig);
      break;
    }

    default:
      log.warn(`Unknown app type: ${appType}`);
  }
}

/**
 * Remove provider config from app config file(s)
 */
export function removeProviderFromApp(provider: Provider): void {
  const { appType } = provider;
  const settings = provider.settingsConfig;

  log.info(`Removing provider ${provider.name} from ${appType}`);

  switch (appType) {
    case 'claude': {
      const appConfig = readJsonConfig(CLAUDE_CONFIG_PATH);
      const apiKeyField = (settings.apiKeyField as string) || 'ANTHROPIC_AUTH_TOKEN';

      if (appConfig.env) {
        delete appConfig.env[apiKeyField];
        delete appConfig.env.ANTHROPIC_BASE_URL;
      }

      writeJsonConfig(CLAUDE_CONFIG_PATH, appConfig);
      break;
    }

    case 'codex': {
      const auth = readJsonConfig(CODEX_AUTH_PATH);
      if (auth.OPENAI_API_KEY) {
        delete auth.OPENAI_API_KEY;
        writeJsonConfig(CODEX_AUTH_PATH, auth);
      }
      break;
    }

    case 'gemini': {
      const envContent = readTextFile(GEMINI_ENV_PATH);
      const env = parseEnvFile(envContent);

      delete env.GEMINI_API_KEY;
      delete env.GOOGLE_GEMINI_BASE_URL;
      delete env.GEMINI_MODEL;

      writeTextFile(GEMINI_ENV_PATH, stringifyEnvFile(env));
      break;
    }

    case 'opencode': {
      const appConfig = readJsonConfig(OPENCODE_CONFIG_PATH);
      const providerKey =
        (settings.providerKey as string) || provider.name.toLowerCase().replace(/\s+/g, '_');

      if (appConfig.providers) {
        delete appConfig.providers[providerKey];
        writeJsonConfig(OPENCODE_CONFIG_PATH, appConfig);
      }
      break;
    }

    case 'openclaw': {
      const appConfig = readJsonConfig(OPENCLAW_CONFIG_PATH);
      const providerName = (settings.providerName as string) || provider.name;

      if (appConfig.models?.providers) {
        appConfig.models.providers = appConfig.models.providers.filter(
          (p: any) => p.name !== providerName
        );
        writeJsonConfig(OPENCLAW_CONFIG_PATH, appConfig);
      }
      break;
    }

    case 'codebuddy': {
      const appConfig = readJsonConfig(CODEBUDDY_CONFIG_PATH);
      const providerKey =
        (settings.providerKey as string) || provider.name.toLowerCase().replace(/\s+/g, '_');

      if (appConfig.providers) {
        delete appConfig.providers[providerKey];
        writeJsonConfig(CODEBUDDY_CONFIG_PATH, appConfig);
      }
      break;
    }

    default:
      log.warn(`Unknown app type: ${appType}`);
  }
}

/**
 * Sync all active providers to app config
 */
export function syncAllProvidersToApp(providers: Provider[], appType: AppType): void {
  log.info(`Syncing all providers to ${appType}`);

  // For OpenClaw, clear existing providers first
  if (appType === 'openclaw') {
    const appConfig = readJsonConfig(OPENCLAW_CONFIG_PATH);
    if (appConfig.models) {
      appConfig.models.providers = [];
      writeJsonConfig(OPENCLAW_CONFIG_PATH, appConfig);
    }
  }

  // Sync each provider
  providers.forEach((provider) => {
    if (provider.appType === appType) {
      syncProviderToApp(provider);
    }
  });
}
