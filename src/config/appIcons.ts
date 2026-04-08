/**
 * Application Icons Configuration
 * Spring-themed icons for each supported AI CLI application
 */

import { Bot, Terminal, Sparkles, Code2, Cpu } from 'lucide-react';
import type { AppType } from '@/types';

export const APP_ICONS: Record<AppType, React.ComponentType<{ className?: string }>> = {
  claude: Bot,
  codex: Terminal,
  gemini: Sparkles,
  opencode: Code2,
  openclaw: Cpu,
};

export const APP_COLORS: Record<AppType, string> = {
  claude: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  codex: 'text-teal-600 bg-teal-50 border-teal-200',
  gemini: 'text-green-600 bg-green-50 border-green-200',
  opencode: 'text-lime-600 bg-lime-50 border-lime-200',
  openclaw: 'text-emerald-700 bg-emerald-50 border-emerald-200',
};

export const APP_DESCRIPTIONS: Record<AppType, string> = {
  claude: 'Anthropic Claude Code - AI assistant for coding',
  codex: 'OpenAI Codex CLI - Code generation and editing',
  gemini: 'Google Gemini CLI - Multimodal AI assistant',
  opencode: 'OpenCode - Open source AI coding assistant',
  openclaw: 'OpenClaw - Universal AI CLI tool',
};
