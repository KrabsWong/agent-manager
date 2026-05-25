import { DEFAULT_SETTINGS, type AppSettings } from '../../types';
import { APP_ORDER } from '../../config/apps';
import { accentColors } from '../theme/colors';

export const SETTINGS_SCHEMA_VERSION = 1;

const appTypes = APP_ORDER satisfies Array<NonNullable<AppSettings['defaultApp']>>;

const languages = ['en', 'zh'] satisfies AppSettings['language'][];
const themes = ['light', 'dark', 'system'] satisfies AppSettings['theme'][];
const chatLayouts = ['left', 'bubble'] satisfies AppSettings['chatLayout'][];
const preferredTerminals = [
  'auto',
  'ghostty',
  'kitty',
  'terminal',
] satisfies AppSettings['preferredTerminal'][];
const accentColorIds = accentColors.map((color) => color.id);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function enumValue<T extends string>(value: unknown, validValues: readonly T[], fallback: T): T {
  return typeof value === 'string' && validValues.includes(value as T) ? (value as T) : fallback;
}

function booleanValue(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function nullableEnumValue<T extends string>(
  value: unknown,
  validValues: readonly T[],
  fallback: T | null
): T | null {
  if (value === null) return null;
  return typeof value === 'string' && validValues.includes(value as T) ? (value as T) : fallback;
}

export function normalizeAppSettings(value: unknown): AppSettings {
  const settings = isRecord(value) ? value : {};

  return {
    language: enumValue(settings.language, languages, DEFAULT_SETTINGS.language),
    theme: enumValue(settings.theme, themes, DEFAULT_SETTINGS.theme),
    accentColor: enumValue(settings.accentColor, accentColorIds, DEFAULT_SETTINGS.accentColor),
    autoStart: booleanValue(settings.autoStart, DEFAULT_SETTINGS.autoStart),
    lightweightMode: booleanValue(settings.lightweightMode, DEFAULT_SETTINGS.lightweightMode),
    defaultApp: nullableEnumValue(settings.defaultApp, appTypes, DEFAULT_SETTINGS.defaultApp),
    collapseBashBlocks: booleanValue(
      settings.collapseBashBlocks,
      DEFAULT_SETTINGS.collapseBashBlocks
    ),
    enableTitleMarquee: booleanValue(
      settings.enableTitleMarquee,
      DEFAULT_SETTINGS.enableTitleMarquee
    ),
    showThinkingContent: booleanValue(
      settings.showThinkingContent,
      DEFAULT_SETTINGS.showThinkingContent
    ),
    chatLayout: enumValue(settings.chatLayout, chatLayouts, DEFAULT_SETTINGS.chatLayout),
    sidebarCollapsed: booleanValue(settings.sidebarCollapsed, DEFAULT_SETTINGS.sidebarCollapsed),
    preferredTerminal: enumValue(
      settings.preferredTerminal,
      preferredTerminals,
      DEFAULT_SETTINGS.preferredTerminal
    ),
  };
}
