/**
 * Yes, Sessions - Shared Types
 * 这些类型在前后端共享，确保类型一致性
 */

// ============ App Types ============
export type AppType = 'claude' | 'codex' | 'gemini' | 'opencode' | 'openclaw';

export const APP_TYPES: AppType[] = ['claude', 'codex', 'gemini', 'opencode', 'openclaw'];

// ============ Provider Types ============
export type ProviderCategory =
  | 'official'
  | 'cn_official'
  | 'aggregator'
  | 'third_party'
  | 'cloud_provider'
  | 'custom';

export interface Provider {
  id: string;
  appType: AppType;
  name: string;
  settingsConfig: Record<string, unknown>;
  websiteUrl?: string;
  category?: ProviderCategory;
  createdAt: number;
  sortIndex: number;
  isCurrent: boolean;
  inFailoverQueue: boolean;
  notes?: string;
  icon?: string;
  iconColor?: string;
}

export interface CreateProviderInput {
  appType: AppType;
  name: string;
  settingsConfig: Record<string, unknown>;
  websiteUrl?: string;
  category?: ProviderCategory;
  sortIndex?: number;
  notes?: string;
  icon?: string;
  iconColor?: string;
}

export interface UpdateProviderInput extends Partial<CreateProviderInput> {
  id: string;
}

export interface SwitchProviderResult {
  success: boolean;
  providerId: string;
  previousProviderId?: string;
  error?: string;
}

// ============ MCP Types ============
export type McpTransportType = 'stdio' | 'http' | 'sse';

export interface McpServer {
  id: string;
  name: string;
  transport: McpTransportType;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  description?: string;
  enabledApps: {
    claude: boolean;
    codex: boolean;
    gemini: boolean;
    opencode: boolean;
    openclaw: boolean;
  };
}

export interface CreateMcpServerInput {
  name: string;
  transport: McpTransportType;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  description?: string;
}

// ============ Prompt Types ============
export interface Prompt {
  id: string;
  appType: AppType;
  name: string;
  content: string;
  description?: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface CreatePromptInput {
  appType: AppType;
  name: string;
  content: string;
  description?: string;
}

// ============ Skill Types ============
export interface Skill {
  id: string;
  name: string;
  description?: string;
  repoOwner?: string;
  repoName?: string;
  directory: string;
  installedAt: number;
  enabledApps: {
    claude: boolean;
    codex: boolean;
    gemini: boolean;
    opencode: boolean;
    openclaw: boolean;
  };
}

export interface SkillRepo {
  owner: string;
  name: string;
  url: string;
  lastScanned?: number;
}

// ============ Settings Types ============
export interface AppSettings {
  // General
  language: 'en' | 'zh' | 'ja';
  theme: 'light' | 'dark' | 'system';
  autoStart: boolean;
  lightweightMode: boolean;

  // Proxy
  proxyEnabled: boolean;
  proxyPort: number;
  proxyHost: string;

  // WebDAV
  webdavUrl?: string;
  webdavUsername?: string;
  webdavPassword?: string;
  webdavAutoSync: boolean;
  webdavSyncInterval: number;

  // GitHub
  githubToken?: string;

  // Backup
  autoBackup: boolean;
  backupRetention: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  language: 'en',
  theme: 'system',
  autoStart: false,
  lightweightMode: false,
  proxyEnabled: false,
  proxyPort: 15721,
  proxyHost: '127.0.0.1',
  webdavAutoSync: false,
  webdavSyncInterval: 30,
  githubToken: undefined,
  autoBackup: true,
  backupRetention: 10,
};

// ============ IPC Channel Types ============
export type IpcChannel =
  // Providers
  | 'providers:getAll'
  | 'providers:getById'
  | 'providers:create'
  | 'providers:update'
  | 'providers:delete'
  | 'providers:switch'
  | 'providers:reorder'
  | 'providers:deactivate'
  // MCP
  | 'mcp:getAll'
  | 'mcp:getById'
  | 'mcp:getByApp'
  | 'mcp:create'
  | 'mcp:update'
  | 'mcp:delete'
  | 'mcp:toggleApp'
  | 'mcp:syncAll'
  | 'mcp:openConfigFolder'
  // Prompts
  | 'prompts:getAll'
  | 'prompts:getById'
  | 'prompts:create'
  | 'prompts:update'
  | 'prompts:delete'
  | 'prompts:setActive'
  | 'prompts:getActive'
  | 'prompts:importFromApp'
  | 'prompts:syncAll'
  | 'prompts:openConfigFolder'
  // Skills
  | 'skills:getAll'
  | 'skills:getInstalled'
  | 'skills:install'
  | 'skills:installLocal'
  | 'skills:uninstall'
  | 'skills:toggleApp'
  | 'skills:scanRepo'
  | 'skills:getRepoInfo'
  | 'skills:openFolder'
  | 'skills:selectFolder'
  | 'skills:syncAll'
  // Sessions
  | 'sessions:getAll'
  | 'sessions:getDetail'
  | 'sessions:getStats'
  | 'sessions:getSupportStatus'
  | 'sessions:resume'
  | 'sessions:getTerminalInfo'
  // Proxy
  | 'proxy:getStatus'
  | 'proxy:start'
  | 'proxy:stop'
  | 'proxy:getCircuitBreakerStats'
  | 'proxy:resetCircuitBreaker'
  | 'proxy:getFailoverStatus'
  | 'proxy:resetFailover'
  | 'proxy:getUsageStats'
  | 'proxy:getTodayStats'
  | 'proxy:getStatsByProvider'
  | 'proxy:getRecentLogs'
  // Settings
  | 'settings:get'
  | 'settings:update'
  | 'settings:reset'
  // App
  | 'app:getVersion'
  | 'app:checkForUpdates'
  | 'app:quit'
  | 'app:minimize'
  | 'app:maximize'
  | 'app:restore'
  | 'app:close'
  | 'app:isMaximized'
  // Config Import/Export
  | 'config:export'
  | 'config:import'
  | 'config:backup';

// ============ API Response Types ============
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type Result<T, E = Error> = { success: true; data: T } | { success: false; error: E };

// ============ Error Types ============
export type ErrorCode =
  | 'UNKNOWN_ERROR'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'ALREADY_EXISTS'
  | 'DATABASE_ERROR'
  | 'FILE_SYSTEM_ERROR'
  | 'CONFIG_ERROR'
  | 'NETWORK_ERROR'
  | 'PERMISSION_DENIED'
  | 'INVALID_INPUT'
  | 'OPERATION_FAILED';

export interface AppError {
  code: ErrorCode;
  message: string;
  details?: unknown;
  stack?: string;
}

// ============ Event Types ============
export interface ProviderSwitchEvent {
  type: 'provider:switched';
  payload: {
    appType: AppType;
    providerId: string;
    previousProviderId?: string;
  };
}

export interface ProxyStatusEvent {
  type: 'proxy:statusChanged';
  payload: {
    isRunning: boolean;
    port?: number;
    error?: string;
  };
}

export type AppEvent = ProviderSwitchEvent | ProxyStatusEvent;

// ============ Session Types ============
export type {
  Session,
  SessionDetail,
  SessionMessage,
  SessionStats,
  AppSupportStatus,
} from './session';
