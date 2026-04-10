/**
 * Application Icons
 *
 * SVG icons from @lobehub/icons CDN (lobehub.com/icons)
 */

import type { AppType } from '@/types';

// CDN base URL for lobe-icons (mono version)
const LOBE_ICONS_CDN = 'https://unpkg.com/@lobehub/icons-static-svg@latest/icons';

// Map of app types to their icon URLs
const APP_ICON_URLS: Record<AppType, string> = {
  claude: `${LOBE_ICONS_CDN}/claude.svg`,
  codex: `${LOBE_ICONS_CDN}/openai.svg`,
  gemini: `${LOBE_ICONS_CDN}/gemini.svg`,
  opencode: `${LOBE_ICONS_CDN}/opencode.svg`,
  openclaw: `${LOBE_ICONS_CDN}/openclaw.svg`,
};

// Map of app types to their brand colors
export const APP_COLORS: Record<AppType, string> = {
  claude: 'text-amber-600',
  codex: 'text-emerald-600',
  gemini: 'text-blue-500',
  opencode: 'text-indigo-500',
  openclaw: 'text-purple-600',
};

// Icon component that renders SVG from CDN
const IconFromCDN = ({
  appType,
  size = 16,
  className = '',
}: {
  appType: AppType;
  size?: number | string;
  className?: string;
}) => {
  const sizeNum = typeof size === 'string' ? parseInt(size) : size;
  const iconUrl = APP_ICON_URLS[appType];

  return (
    <img
      src={iconUrl}
      alt={APP_LABELS[appType]}
      width={sizeNum}
      height={sizeNum}
      className={`inline-block dark:invert ${className}`}
      style={{ display: 'inline-block', verticalAlign: 'middle' }}
    />
  );
};

// Helper function to get icon component
export function getAppIcon(
  appType: AppType,
  size: number | string = 16,
  className = ''
): React.ReactNode {
  return <IconFromCDN appType={appType} size={size} className={className} />;
}

// App labels
export const APP_LABELS: Record<AppType, string> = {
  claude: 'Claude Code',
  codex: 'Codex CLI',
  gemini: 'Gemini CLI',
  opencode: 'OpenCode',
  openclaw: 'OpenClaw',
};

// All app types
export const APP_TYPES: AppType[] = ['claude', 'codex', 'gemini', 'opencode', 'openclaw'];
