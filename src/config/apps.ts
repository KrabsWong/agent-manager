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
  'claude',
  'opencode',
  'codex',
];

// ============ 应用显示名称 ============
export const APP_LABELS: Record<AppType, string> = {
  claude: 'Claude Code',
  codex: 'Codex CLI',
  opencode: 'OpenCode',
  codebuddy: 'Codebuddy',
};

// ============ 应用颜色类名（用于图标） ============
export const APP_COLORS: Record<AppType, string> = {
  claude: 'text-amber-600',
  codex: 'text-emerald-600',
  opencode: 'text-indigo-500',
  codebuddy: 'text-slate-700 dark:text-slate-300',
};

// ============ 应用官网 ============
export const APP_WEBSITES: Record<AppType, string> = {
  claude: 'https://claude.ai/code',
  codex: 'https://github.com/openai/codex',
  opencode: 'https://opencode.com',
  codebuddy: 'https://codebuddy.ai',
};

// ============ 应用支持状态 ============
export const APP_SESSION_SUPPORT: Record<
  AppType,
  { supported: boolean; status: AppSupportStatus }
> = {
  claude: { supported: true, status: 'full' },
  opencode: { supported: true, status: 'full' },
  codebuddy: { supported: true, status: 'full' },
  codex: { supported: true, status: 'full' },
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
