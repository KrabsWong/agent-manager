/**
 * Applications Configuration
 *
 * 所有应用相关信息的唯一数据源。
 * 其他任何地方需要使用应用信息时，都应该从这里导入。
 *
 * 注意：图标请使用 AppIcons.tsx 中的 getAppIcon 函数
 */

import type { AppType } from '@/types';

// ============ 应用显示顺序（第一个是默认） ============
export const APP_ORDER: AppType[] = [
  'codebuddy',
  'claude-internal',
  'claude',
  'opencode',
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
};

// ============ 应用颜色类名（用于图标） ============
export const APP_COLORS: Record<AppType, string> = {
  claude: 'text-amber-600',
  'claude-internal': 'text-amber-600',
  codex: 'text-emerald-600',
  gemini: 'text-blue-500',
  opencode: 'text-indigo-500',
  codebuddy: 'text-slate-700 dark:text-slate-300',
};

// ============ 应用官网 ============
export const APP_WEBSITES: Record<AppType, string> = {
  claude: 'https://claude.ai/code',
  'claude-internal': 'https://claude.ai/code',
  codex: 'https://github.com/openai/codex',
  gemini: 'https://ai.google.dev/gemini-cli',
  opencode: 'https://opencode.com',
  codebuddy: 'https://codebuddy.ai',
};

// ============ 应用支持状态 ============
export const APP_SUPPORT_STATUS: Record<AppType, boolean> = {
  claude: true,
  'claude-internal': true,
  opencode: true,
  codebuddy: true,
  codex: false,
  gemini: false,
};

// ============ 应用详细描述 ============
export const APP_DESCRIPTIONS: Record<AppType, string> = {
  claude: 'Anthropic 推出的 AI 编程助手',
  'claude-internal': 'Anthropic 内部版 Claude Code',
  codex: 'OpenAI 的编程助手（即将推出）',
  gemini: 'Google 的 Gemini 代码助手（即将推出）',
  opencode: '社区驱动的开源 AI 编程工具',
  codebuddy: 'Codebuddy 智能编程助手',
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
  return APP_SUPPORT_STATUS[app] ?? false;
}

/**
 * 获取支持的应用列表
 */
export function getSupportedApps(): AppType[] {
  return APP_ORDER.filter(isAppSupported);
}

/**
 * 获取不支持的应用列表
 */
export function getUnsupportedApps(): AppType[] {
  return APP_ORDER.filter((app) => !isAppSupported(app));
}

/**
 * 获取应用的显示信息（不含图标，图标请使用 getAppIcon）
 */
export function getAppInfo(app: AppType) {
  return {
    label: APP_LABELS[app],
    color: APP_COLORS[app],
    website: APP_WEBSITES[app],
    description: APP_DESCRIPTIONS[app],
    isSupported: isAppSupported(app),
  };
}

/**
 * 获取所有应用的信息（不含图标）
 */
export function getAllAppsInfo() {
  return APP_ORDER.map((app) => ({
    type: app,
    ...getAppInfo(app),
  }));
}

// ============ 向后兼容的别名 ============
/** @deprecated 请使用 APP_ORDER */
export const APP_TYPES = APP_ORDER;
