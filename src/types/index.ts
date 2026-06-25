/**
 * Yes, Sessions - Shared Types
 * 这些类型在前后端共享，确保类型一致性
 */

import type { AccentColor } from '@/lib/theme/colors';
export type { AccentColor } from '@/lib/theme/colors';

// ============ App Types ============
export type AppType =
  | 'claude'
  | 'codex'
  | 'opencode'
  | 'codebuddy';

// 注意：应用顺序和配置请从 @/config/apps 导入
// import { APP_ORDER } from '@/config/apps'

export interface AppSettings {
  // General
  language: 'en' | 'zh';
  theme: 'light' | 'dark' | 'system';
  accentColor: AccentColor;
  autoStart: boolean;
  lightweightMode: boolean;
  defaultApp: AppType | null;

  // Display
  collapseBashBlocks: boolean;
  enableTitleMarquee: boolean;
  showThinkingContent: boolean;
  chatLayout: 'left' | 'bubble';
  sidebarCollapsed: boolean;

  // Terminal
  preferredTerminal: 'auto' | 'ghostty' | 'kitty' | 'terminal';
}

export const DEFAULT_SETTINGS: AppSettings = {
  language: 'en',
  theme: 'system',
  accentColor: 'default',
  autoStart: false,
  lightweightMode: false,
  defaultApp: null,
  collapseBashBlocks: true,
  enableTitleMarquee: false,
  showThinkingContent: true,
  chatLayout: 'left',
  sidebarCollapsed: false,
  preferredTerminal: 'auto',
};

export type InitialSettings = Partial<AppSettings>;

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
  // Git
  | 'git:status'
  | 'git:diff'
  | 'git:fileDiff'
  | 'git:watch:start'
  | 'git:watch:stop'
  // File Preview
  | 'file-preview:open'
  // File
  | 'file:read'
  | 'file:readImage'
  // Tree
  | 'tree:get';

export type IpcEventChannel = 'git:changed' | 'theme:changed';

export interface IElectronAPI {
  invoke: (channel: IpcChannel, ...args: unknown[]) => Promise<unknown>;
  on: (channel: IpcEventChannel, callback: (...args: unknown[]) => void) => void;
  removeAllListeners: (channel: IpcEventChannel) => void;
}

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

// ============ Error Types ============
export type ErrorCode = 'UNKNOWN_ERROR' | 'VALIDATION_ERROR' | 'INVALID_INPUT';

export interface AppError {
  code: ErrorCode;
  message: string;
  details?: unknown;
  stack?: string;
}

// ============ IPC Payload Types ============
export type {
  AppSupportSummary,
  GitFileChange,
  GitFileDiffResult,
  GitStatusResult,
  SessionStatsSummary,
  TerminalInfo,
  TreeNode,
} from './ipc';

// ============ Session Types ============
export type {
  Session,
  SessionDetail,
  SessionMessage,
  SessionStats,
  AppSupportStatus,
} from './session';
