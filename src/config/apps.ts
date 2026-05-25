/**
 * Applications Configuration
 *
 * 所有应用相关信息的唯一数据源。
 * 其他任何地方需要使用应用信息时，都应该从这里导入。
 *
 * 注意：图标请使用 AppIcons.tsx 中的 getAppIcon 函数
 */

import type { AppSupportStatus, AppType } from '@/types';

// ============ 应用显示顺序（第一个是默认） ============
export const APP_ORDER: AppType[] = [
  'codebuddy',
  'claude-internal',
  'claude',
  'opencode',
  'vscode-extension',
  'codex',
  'gemini',
];

// ============ 应用显示名称 ============
export const APP_LABELS: Record<AppType, string> = {
  claude: 'Claude Code',
  'claude-internal': 'Claude Code Internal',
  codex: 'Codex CLI',
  gemini: 'Gemini CLI',
  opencode: 'OpenCode',
  codebuddy: 'Codebuddy',
  'vscode-extension': 'VSC Codebuddy Extension',
};

// ============ 应用颜色类名（用于图标） ============
export const APP_COLORS: Record<AppType, string> = {
  claude: 'text-amber-600',
  'claude-internal': 'text-amber-600',
  codex: 'text-emerald-600',
  gemini: 'text-blue-500',
  opencode: 'text-indigo-500',
  codebuddy: 'text-slate-700 dark:text-slate-300',
  'vscode-extension': 'text-blue-600',
};

// ============ 应用官网 ============
export const APP_WEBSITES: Record<AppType, string> = {
  claude: 'https://claude.ai/code',
  'claude-internal': 'https://claude.ai/code',
  codex: 'https://github.com/openai/codex',
  gemini: 'https://ai.google.dev/gemini-cli',
  opencode: 'https://opencode.com',
  codebuddy: 'https://codebuddy.ai',
  'vscode-extension': 'https://code.visualstudio.com',
};

// ============ 应用支持状态 ============
export const APP_SESSION_SUPPORT: Record<
  AppType,
  { supported: boolean; status: AppSupportStatus }
> = {
  claude: { supported: true, status: 'full' },
  'claude-internal': { supported: true, status: 'full' },
  opencode: { supported: true, status: 'full' },
  codebuddy: { supported: true, status: 'full' },
  'vscode-extension': { supported: true, status: 'full' },
  codex: { supported: false, status: 'coming_soon' },
  gemini: { supported: false, status: 'coming_soon' },
};

// ============ 快捷访问 ============

/**
 * 获取默认应用（列表第一个）
 */
export const DEFAULT_APP = APP_ORDER[0];

/**
 * 检查应用是否支持
 */
export function isAppSupported(app: AppType): boolean {
  return APP_SESSION_SUPPORT[app]?.supported ?? false;
}
