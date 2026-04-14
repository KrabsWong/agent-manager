/**
 * Yes, Sessions - Shared Types
 * 这些类型在前后端共享，确保类型一致性
 */

// ============ App Types ============
export type AppType = 'claude' | 'codex' | 'gemini' | 'opencode' | 'codebuddy';

export const APP_TYPES: AppType[] = ['claude', 'codex', 'codebuddy', 'gemini', 'opencode'];

// ============ Settings Types ============
export type AccentColor =
  | 'default'
  | 'pink'
  | 'rose'
  | 'red'
  | 'orange'
  | 'amber'
  | 'yellow'
  | 'lime'
  | 'green'
  | 'emerald'
  | 'teal'
  | 'cyan'
  | 'sky'
  | 'blue'
  | 'indigo'
  | 'violet'
  | 'purple'
  | 'fuchsia'
  | 'slate'
  | 'zinc'
  | 'neutral';

export interface AppSettings {
  // General
  language: 'en' | 'zh' | 'ja';
  theme: 'light' | 'dark' | 'system';
  accentColor: AccentColor;
  autoStart: boolean;
  lightweightMode: boolean;

  // Display
  collapseBashBlocks: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  language: 'en',
  theme: 'system',
  accentColor: 'default',
  autoStart: false,
  lightweightMode: false,
  collapseBashBlocks: true,
};

// ============ IPC Channel Types ============
export type IpcChannel =
  // Sessions
  | 'sessions:getAll'
  | 'sessions:getDetail'
  | 'sessions:getStats'
  | 'sessions:getSupportStatus'
  | 'sessions:resume'
  | 'sessions:getTerminalInfo'
  // Settings
  | 'settings:get'
  | 'settings:update'
  | 'settings:reset'
  // App
  | 'app:getVersion'
  | 'app:checkForUpdates'
  | 'app:quit'
  | 'app:minimize'
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

// ============ Session Types ============
export type {
  Session,
  SessionDetail,
  SessionMessage,
  SessionStats,
  AppSupportStatus,
} from './session';
