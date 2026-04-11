/**
 * Session Types
 *
 * Type definitions for session/conversation data
 */

export interface SessionMessage {
  type: 'user' | 'assistant' | 'tool_use' | 'tool_result' | 'system';
  timestamp: string;
  content?: string;
  reasoning_content?: string;
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  tool_output?: {
    output?: string;
    content?: Array<{ type: string; text?: string }>;
    preview?: string;
    truncated?: boolean;
    [key: string]: unknown;
  };
  metadata?: {
    subtype?: string;
    command?: string;
    childSessionId?: string; // For sub-agent calls, the child session ID
    childSessionAppType?: string; // The app type of the child session
    [key: string]: unknown;
  };
}

export interface Session {
  id: string;
  appType: string;
  fileName: string;
  filePath: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
  firstMessage?: string;
  lastMessage?: string;
  directory?: string;
  uuid?: string;
}

export interface SessionDetail extends Session {
  messages: SessionMessage[];
}

export interface SessionStats {
  totalSessions: number;
  totalMessages: number;
  firstSessionDate?: number;
  lastSessionDate?: number;
}

export type AppSupportStatus = 'full' | 'partial' | 'coming_soon' | 'not_supported';

export interface AppSessionSupport {
  appType: string;
  status: AppSupportStatus;
  description: string;
  features: string[];
}
