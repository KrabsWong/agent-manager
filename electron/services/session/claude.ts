/**
 * Claude Code Session Service
 *
 * Reads and parses Claude Code conversation sessions from both:
 * - New format: ~/.claude/projects/ (with UUID)
 * - Old format: ~/.claude/transcripts/ (ses_*.jsonl)
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import log from 'electron-log';
import type { Session, SessionDetail, SessionMessage } from '../../../src/types/session';

const CLAUDE_PROJECTS_PATH = path.join(os.homedir(), '.claude', 'projects');
const CLAUDE_HISTORY_PATH = path.join(os.homedir(), '.claude', 'history.jsonl');
const CLAUDE_TRANSCRIPTS_PATH = path.join(os.homedir(), '.claude', 'transcripts');

interface HistoryEntry {
  display?: string;
  timestamp: number;
  project?: string;
  sessionId: string;
  pastedContents?: Record<string, unknown>;
}

interface ProjectMessage {
  type: string;
  uuid?: string;
  timestamp?: string;
  sessionId?: string;
  message?: {
    role?: string;
    content?: string | Array<{ type: string; text?: string; thinking?: string }>;
    tool_use?: Array<{
      id: string;
      name: string;
      input: Record<string, unknown>;
    }>;
    thinking?: string;
    reasoning_content?: string;
  };
  parentUuid?: string | null;
  promptId?: string;
  toolUseResult?: string;
  sourceToolAssistantUUID?: string;
}

export class ClaudeSessionService {
  /**
   * Check if Claude Code data exists
   */
  isAvailable(): boolean {
    return fs.existsSync(CLAUDE_PROJECTS_PATH) || fs.existsSync(CLAUDE_TRANSCRIPTS_PATH);
  }

  /**
   * Load history entries from history.jsonl
   */
  private loadHistory(): HistoryEntry[] {
    const entries: HistoryEntry[] = [];
    try {
      if (!fs.existsSync(CLAUDE_HISTORY_PATH)) {
        return entries;
      }
      const content = fs.readFileSync(CLAUDE_HISTORY_PATH, 'utf-8');
      const lines = content.split('\n').filter((line) => line.trim());

      for (const line of lines) {
        try {
          const entry = JSON.parse(line) as HistoryEntry;
          if (entry.sessionId && entry.timestamp) {
            entries.push(entry);
          }
        } catch {
          // Skip invalid lines
        }
      }
    } catch (error) {
      log.warn('Failed to load history:', error);
    }
    return entries;
  }

  /**
   * Escape project path for directory name
   */
  private escapeProjectPath(projectPath: string): string {
    return projectPath.replace(/\//g, '-');
  }

  /**
   * Get all sessions from new format (projects/)
   */
  private getNewFormatSessions(): Session[] {
    const sessions: Session[] = [];

    if (!fs.existsSync(CLAUDE_PROJECTS_PATH) || !fs.existsSync(CLAUDE_HISTORY_PATH)) {
      return sessions;
    }

    const historyEntries = this.loadHistory();
    const seenSessionIds = new Set<string>();

    // Process history entries in reverse to get latest first
    for (const entry of historyEntries.reverse()) {
      // Skip duplicates
      if (seenSessionIds.has(entry.sessionId)) {
        continue;
      }
      seenSessionIds.add(entry.sessionId);

      if (!entry.project) continue;

      const projectDir = this.escapeProjectPath(entry.project);
      const sessionFile = path.join(CLAUDE_PROJECTS_PATH, projectDir, `${entry.sessionId}.jsonl`);

      if (!fs.existsSync(sessionFile)) {
        continue;
      }

      try {
        const session = this.parseNewSessionFile(sessionFile, entry);
        if (session) {
          sessions.push(session);
        }
      } catch (error) {
        log.warn(`Failed to parse new session file ${sessionFile}:`, error);
      }
    }

    return sessions;
  }

  /**
   * Get all sessions from old format (transcripts/)
   */
  private getOldFormatSessions(): Session[] {
    const sessions: Session[] = [];

    if (!fs.existsSync(CLAUDE_TRANSCRIPTS_PATH)) {
      return sessions;
    }

    const files = fs.readdirSync(CLAUDE_TRANSCRIPTS_PATH);

    for (const file of files) {
      if (file.endsWith('.jsonl') && file.startsWith('ses_')) {
        try {
          const session = this.parseOldSessionFile(file);
          if (session) {
            sessions.push(session);
          }
        } catch (error) {
          log.warn(`Failed to parse old session file ${file}:`, error);
        }
      }
    }

    return sessions;
  }

  /**
   * Get all session files
   */
  getAllSessions(): Session[] {
    try {
      const newSessions = this.getNewFormatSessions();
      const oldSessions = this.getOldFormatSessions();

      // Combine and sort by updatedAt descending (newest first)
      const allSessions = [...newSessions, ...oldSessions];
      return allSessions.sort((a, b) => b.updatedAt - a.updatedAt);
    } catch (error) {
      log.error('Failed to get sessions:', error);
      return [];
    }
  }

  /**
   * Parse a new format session file (projects/)
   */
  private parseNewSessionFile(filePath: string, historyEntry: HistoryEntry): Session | null {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter((line) => line.trim());

    if (lines.length === 0) {
      return null;
    }

    let firstMessage = '';
    let lastMessage = '';
    let messageCount = 0;

    for (const line of lines) {
      try {
        const msg = JSON.parse(line) as ProjectMessage;
        if (msg.type === 'user' || msg.type === 'assistant') {
          messageCount++;
          if (!firstMessage) {
            firstMessage = this.extractNewMessagePreview(msg);
          }
          lastMessage = this.extractNewMessagePreview(msg);
        }
      } catch {
        // Ignore parse errors
      }
    }

    return {
      id: historyEntry.sessionId,
      appType: 'claude',
      fileName: `${historyEntry.sessionId}.jsonl`,
      filePath,
      directory: historyEntry.project,
      createdAt: historyEntry.timestamp,
      updatedAt: historyEntry.timestamp,
      messageCount,
      firstMessage: firstMessage || historyEntry.display || '',
      lastMessage,
    };
  }

  /**
   * Parse an old format session file (transcripts/)
   */
  private parseOldSessionFile(fileName: string): Session | null {
    const filePath = path.join(CLAUDE_TRANSCRIPTS_PATH, fileName);
    const stats = fs.statSync(filePath);

    // Extract session ID from filename (ses_<id>.jsonl) - keep ses_ prefix
    const id = fileName.replace('.jsonl', '');

    // Read file content
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter((line) => line.trim());

    if (lines.length === 0) {
      return null;
    }

    let firstMessage = '';
    let lastMessage = '';

    try {
      const firstLine = JSON.parse(lines[0]) as SessionMessage;
      firstMessage = this.extractOldMessagePreview(firstLine);
    } catch {
      // Ignore parse errors
    }

    try {
      const lastLine = JSON.parse(lines[lines.length - 1]) as SessionMessage;
      lastMessage = this.extractOldMessagePreview(lastLine);
    } catch {
      // Ignore parse errors
    }

    return {
      id,
      appType: 'claude',
      fileName,
      filePath,
      directory: undefined, // Old format doesn't have directory info
      createdAt: stats.birthtime.getTime(),
      updatedAt: stats.mtime.getTime(),
      messageCount: lines.length,
      firstMessage,
      lastMessage,
    };
  }

  /**
   * Extract preview from new format message
   */
  private extractNewMessagePreview(message: ProjectMessage): string {
    if (typeof message.message?.content === 'string') {
      const content = message.message.content;
      return content.substring(0, 100) + (content.length > 100 ? '...' : '');
    }
    if (Array.isArray(message.message?.content)) {
      const textParts = message.message.content
        .filter((item) => item.type === 'text' && item.text)
        .map((item) => item.text)
        .join(' ');
      return textParts.substring(0, 100) + (textParts.length > 100 ? '...' : '');
    }
    if (message.type === 'last-prompt') {
      const lastPrompt = (message as unknown as { lastPrompt?: string }).lastPrompt;
      return lastPrompt || '';
    }
    return '';
  }

  /**
   * Extract preview from old format message
   */
  private extractOldMessagePreview(message: SessionMessage): string {
    if (message.content) {
      return message.content.substring(0, 100) + (message.content.length > 100 ? '...' : '');
    }
    if (message.tool_name) {
      return `[Tool: ${message.tool_name}]`;
    }
    return '[Unknown message type]';
  }

  /**
   * Get detailed session with all messages
   */
  getSessionDetail(sessionId: string): SessionDetail | null {
    // Check if it's a new format session (UUID format)
    if (sessionId.includes('-')) {
      return this.getNewSessionDetail(sessionId);
    }

    // Otherwise it's an old format session (ses_xxx)
    return this.getOldSessionDetail(sessionId);
  }

  /**
   * Get new format session detail
   */
  private getNewSessionDetail(sessionId: string): SessionDetail | null {
    try {
      const historyEntries = this.loadHistory();
      const historyEntry = historyEntries.find((e) => e.sessionId === sessionId);

      if (!historyEntry || !historyEntry.project) {
        return null;
      }

      const projectDir = this.escapeProjectPath(historyEntry.project);
      const filePath = path.join(CLAUDE_PROJECTS_PATH, projectDir, `${sessionId}.jsonl`);

      if (!fs.existsSync(filePath)) {
        return null;
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n').filter((line) => line.trim());

      const rawMessages: SessionMessage[] = [];
      for (const line of lines) {
        try {
          const msg = JSON.parse(line) as ProjectMessage;
          const parsedMsg = this.parseNewProjectMessage(msg);
          if (parsedMsg) {
            rawMessages.push(parsedMsg);
          }
        } catch (error) {
          log.warn('Failed to parse message:', error);
        }
      }

      // Merge consecutive assistant messages (thinking + text)
      const messages = this.mergeAssistantMessages(rawMessages);

      return {
        id: sessionId,
        appType: 'claude',
        fileName: `${sessionId}.jsonl`,
        filePath,
        directory: historyEntry.project,
        createdAt: historyEntry.timestamp,
        updatedAt: historyEntry.timestamp,
        messageCount: messages.length,
        firstMessage: messages[0]?.content?.substring(0, 100) || '',
        lastMessage: messages[messages.length - 1]?.content?.substring(0, 100) || '',
        messages,
      };
    } catch (error) {
      log.error(`Failed to get new session detail ${sessionId}:`, error);
      return null;
    }
  }

  /**
   * Get old format session detail
   */
  private getOldSessionDetail(sessionId: string): SessionDetail | null {
    try {
      const fileName = `${sessionId}.jsonl`;
      const filePath = path.join(CLAUDE_TRANSCRIPTS_PATH, fileName);

      if (!fs.existsSync(filePath)) {
        return null;
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n').filter((line) => line.trim());

      const messages: SessionMessage[] = [];
      for (const line of lines) {
        try {
          const message = JSON.parse(line) as SessionMessage;
          messages.push(message);
        } catch (error) {
          log.warn('Failed to parse message:', error);
        }
      }

      const stats = fs.statSync(filePath);
      const firstMessage = messages[0];

      return {
        id: sessionId,
        appType: 'claude',
        fileName,
        filePath,
        directory: undefined,
        createdAt: stats.birthtime.getTime(),
        updatedAt: stats.mtime.getTime(),
        messageCount: messages.length,
        firstMessage: firstMessage?.content?.substring(0, 100) || '',
        lastMessage: messages[messages.length - 1]?.content?.substring(0, 100) || '',
        messages,
      };
    } catch (error) {
      log.error(`Failed to get old session detail ${sessionId}:`, error);
      return null;
    }
  }

  /**
   * Parse new format project message
   */
  private parseNewProjectMessage(msg: ProjectMessage): SessionMessage | null {
    if (!msg.type) return null;

    const timestamp = msg.timestamp || new Date().toISOString();

    if (msg.type === 'user') {
      let content = '';
      if (msg.message?.content && typeof msg.message.content === 'string') {
        content = msg.message.content;
      } else if (msg.message?.content && Array.isArray(msg.message.content)) {
        content = msg.message.content
          .filter((item: { type: string; text?: string }) => item.type === 'text')
          .map((item: { text?: string }) => item.text || '')
          .join('\n');
      } else if (msg.toolUseResult) {
        content = `[${msg.toolUseResult}]`;
      }

      // Check for local command messages and convert to system messages
      if (content.includes('<local-command-caveat>')) {
        const caveatMatch = content.match(/<local-command-caveat>(.*?)<\/local-command-caveat>/);
        const caveatText = caveatMatch ? caveatMatch[1] : 'Local command caveat';
        return {
          type: 'system',
          timestamp,
          content: caveatText,
          metadata: { subtype: 'caveat' },
        } as SessionMessage;
      }

      if (content.includes('<local-command-stdout>')) {
        const stdoutMatch = content.match(/<local-command-stdout>(.*?)<\/local-command-stdout>/);
        const stdoutText = stdoutMatch ? stdoutMatch[1] : content;
        return {
          type: 'system',
          timestamp,
          content: stdoutText,
          metadata: { subtype: 'command_output' },
        } as SessionMessage;
      }

      if (content.includes('<command-name>')) {
        const nameMatch = content.match(/<command-name>(.*?)<\/command-name>/);
        const msgMatch = content.match(/<command-message>(.*?)<\/command-message>/);
        const argsMatch = content.match(/<command-args>(.*?)<\/command-args>/);

        const cmdName = nameMatch ? nameMatch[1] : 'unknown';
        const cmdMsg = msgMatch ? msgMatch[1] : '';
        const cmdArgs = argsMatch ? argsMatch[1] : '';

        return {
          type: 'system',
          timestamp,
          content: `${cmdName} ${cmdMsg} ${cmdArgs}`.trim(),
          metadata: { subtype: 'command', command: cmdName },
        } as SessionMessage;
      }

      return {
        type: 'user',
        timestamp,
        content,
      };
    }

    if (msg.type === 'assistant') {
      const toolCalls: Array<{
        id: string;
        name: string;
        input: Record<string, unknown>;
      }> = [];

      // Check if this is a thinking-only message
      if (Array.isArray(msg.message?.content)) {
        // Check if this message only contains thinking content
        const thinkingItems = msg.message.content.filter(
          (item) => item.type === 'thinking' && item.thinking
        );
        const textItems = msg.message.content.filter((item) => item.type === 'text' && item.text);
        const toolUseItems = msg.message.content.filter((item) => item.type === 'tool_use');

        // If this message only has thinking items, return as reasoning content
        if (thinkingItems.length > 0 && textItems.length === 0) {
          const reasoningContent = thinkingItems.map((item) => item.thinking).join('\n');
          return {
            type: 'assistant',
            timestamp,
            content: '', // Empty content for thinking-only messages
            reasoning_content: reasoningContent,
          };
        }

        // Process tool_use items
        for (const item of toolUseItems) {
          toolCalls.push({
            id: (item as unknown as { id: string }).id || 'unknown',
            name: (item as unknown as { name: string }).name || 'unknown',
            input: (item as unknown as { input: Record<string, unknown> }).input || {},
          });
        }

        // If has tool calls, return as tool_use
        if (toolCalls.length > 0) {
          const content = textItems.map((item) => item.text).join('\n');
          return {
            type: 'tool_use',
            timestamp,
            tool_name: toolCalls[0].name,
            tool_input: toolCalls[0].input,
            content,
          };
        }

        // Regular text content
        const content = textItems.map((item) => item.text).join('\n');
        return {
          type: 'assistant',
          timestamp,
          content,
        };
      }

      // String content (fallback)
      if (typeof msg.message?.content === 'string') {
        return {
          type: 'assistant',
          timestamp,
          content: msg.message.content,
        };
      }

      // Empty fallback
      return {
        type: 'assistant',
        timestamp,
        content: '',
      };
    }

    // Handle tool results (tool_result type messages)
    if (msg.type === 'tool_result' || msg.toolUseResult) {
      const output = msg.message?.content || msg.toolUseResult || '';
      let outputText = '';

      if (typeof output === 'string') {
        outputText = output;
      } else if (Array.isArray(output)) {
        outputText = output
          .filter((item: { type?: string; text?: string }) => item.type === 'text' || item.text)
          .map((item: { text?: string }) => item.text || '')
          .join('\n');
      }

      return {
        type: 'tool_result',
        timestamp,
        tool_name: msg.message?.role || 'tool',
        content: outputText.substring(0, 300),
        tool_output: {
          output: outputText,
        },
      };
    }

    return null;
  }

  /**
   * Get session statistics
   */
  getStats(): {
    totalSessions: number;
    totalMessages: number;
    firstSessionDate?: number;
    lastSessionDate?: number;
  } {
    const sessions = this.getAllSessions();

    if (sessions.length === 0) {
      return { totalSessions: 0, totalMessages: 0 };
    }

    const totalMessages = sessions.reduce((sum, s) => sum + s.messageCount, 0);
    const dates = sessions.map((s) => s.createdAt).sort((a, b) => a - b);

    return {
      totalSessions: sessions.length,
      totalMessages,
      firstSessionDate: dates[0],
      lastSessionDate: dates[dates.length - 1],
    };
  }

  /**
   * Merge consecutive assistant messages (thinking + text)
   * Claude Code sends thinking and text as separate consecutive messages
   */
  private mergeAssistantMessages(messages: SessionMessage[]): SessionMessage[] {
    const merged: SessionMessage[] = [];
    let pendingThinking: SessionMessage | null = null;

    for (const msg of messages) {
      if (msg.type === 'assistant') {
        // If this is a thinking-only message (no content, only reasoning_content)
        if (!msg.content && msg.reasoning_content) {
          pendingThinking = msg;
          continue;
        }

        // If this is a text message and we have pending thinking, merge them
        if (msg.content && pendingThinking) {
          merged.push({
            ...msg,
            reasoning_content: pendingThinking.reasoning_content,
          });
          pendingThinking = null;
          continue;
        }

        // Regular assistant message
        merged.push(msg);
      } else {
        // Non-assistant message: flush pending thinking if any
        if (pendingThinking) {
          merged.push(pendingThinking);
          pendingThinking = null;
        }
        merged.push(msg);
      }
    }

    // Flush any remaining pending thinking
    if (pendingThinking) {
      merged.push(pendingThinking);
    }

    return merged;
  }
}

export const claudeSessionService = new ClaudeSessionService();
