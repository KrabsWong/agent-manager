/**
 * ConversationView Types
 *
 * 所有类型定义集中管理
 */

import type { SessionMessage } from '@/types/session';

// Performance constants
export const MAX_CODE_LINES = 100;
export const CODE_LINES_INCREMENT = 200;
export const MAX_SYNTAX_HIGHLIGHT_LINES = 500;
export const MAX_TEXT_LENGTH = 8000;
export const MAX_MESSAGES_PER_BATCH = 100;
export const MAX_TOOL_OUTPUT_LINES = 20;

// Message grouping
export interface MessageTurn {
  userMessage: SessionMessage | null;
  userMessageOriginalIndex?: number; // Original index in messages array
  toolCalls: { toolUse: SessionMessage | null; toolResult: SessionMessage | null }[];
  assistantMessage: SessionMessage | null;
  systemMessages: SessionMessage[];
}

export interface MessageTurnWithCount extends MessageTurn {
  messageCount: number;
}

// Component Props
export interface ConversationViewProps {
  messages: SessionMessage[];
  className?: string;
  appType?: string;
  onViewSubAgentSession?: (sessionId: string, appType: string) => void;
  searchQuery?: string;
  onNewMessages?: (count: number, isAtBottom: boolean) => void;
}

export interface ConversationTurnProps {
  turn: MessageTurn;
  appType: string;
  onViewSubAgentSession?: (sessionId: string, appType: string) => void;
  searchQuery?: string;
  userMessageIndex?: number;
}

export interface SystemMessageProps {
  content: string;
  timestamp: string;
  metadata?: { subtype?: string; command?: string };
  model?: string;
  searchQuery?: string;
}

export interface UserMessageProps {
  content: string;
  timestamp: string;
  appType?: string;
  model?: string;
  searchQuery?: string;
}

export interface AssistantMessageProps {
  content: string;
  reasoningContent?: string;
  timestamp: string;
  appType?: string;
  model?: string;
  searchQuery?: string;
  hideAvatar?: boolean;
}

export interface ToolCallBlockProps {
  toolUse: SessionMessage | null;
  toolResult: SessionMessage | null;
  onViewSubAgentSession?: (sessionId: string, appType: string) => void;
  searchQuery?: string;
}

export interface FileAttachmentProps {
  path: string;
  type: string;
  content: string;
}

export interface ParsedContentBlockProps {
  item: {
    type: string;
    content: string;
    metadata?: Record<string, string>;
  };
  searchQuery?: string;
}

export interface MermaidDiagramProps {
  content: string;
}

export interface CollapsibleCodeBlockProps {
  content: string;
  language: string;
}

export interface ClaudeCodeXMLViewerProps {
  data: Array<{
    type: 'file' | 'directory' | 'text';
    path?: string;
    content?: string;
    entries?: string[];
  }>;
}

export type ToolType = 'mcp' | 'filesystem' | 'search' | 'code' | 'subagent' | 'plan' | 'generic';

export interface ToolInputDisplayProps {
  input?: Record<string, unknown>;
  searchQuery?: string;
  toolName?: string;
}

export interface ToolOutputDisplayProps {
  output: SessionMessage['tool_output'];
  searchQuery?: string;
  toolName?: string;
}
