/**
 * Application Icons Configuration
 * Spring-themed icons for each supported AI CLI application
 */

import { Bot, Terminal, Sparkles, Code2 } from 'lucide-react';
import type { AppType } from '@/types';

export const APP_ICONS: Record<AppType, React.ComponentType<{ className?: string }>> = {
  claude: Bot,
  'claude-internal': Bot,
  codex: Terminal,
  codebuddy: Bot,
  gemini: Sparkles,
  opencode: Code2,
};

export const APP_COLORS: Record<AppType, string> = {
  claude: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  'claude-internal': 'text-emerald-600 bg-emerald-50 border-emerald-200',
  codex: 'text-teal-600 bg-teal-50 border-teal-200',
  codebuddy: 'text-cyan-600 bg-cyan-50 border-cyan-200',
  gemini: 'text-green-600 bg-green-50 border-green-200',
  opencode: 'text-lime-600 bg-lime-50 border-lime-200',
};

export const APP_DESCRIPTIONS: Record<AppType, string> = {
  claude: 'Anthropic Claude Code - AI assistant for coding',
  'claude-internal': 'Anthropic Claude Code Internal - AI assistant for coding',
  codex: 'OpenAI Codex CLI - Code generation and editing',
  codebuddy: 'Codebuddy - AI coding assistant',
  gemini: 'Google Gemini CLI - Multimodal AI assistant',
  opencode: 'OpenCode - Open source AI coding assistant',
};
