/**
 * Codex Session Service
 *
 * Reads and parses Codex CLI conversation sessions from:
 * - ~/.codex/session_index.jsonl
 * - ~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import log from 'electron-log';
import type { Session, SessionDetail, SessionMessage } from '@/types/session';

const CODEX_HOME_PATH = path.join(os.homedir(), '.codex');
const CODEX_SESSIONS_PATH = path.join(CODEX_HOME_PATH, 'sessions');
const CODEX_SESSION_INDEX_PATH = path.join(CODEX_HOME_PATH, 'session_index.jsonl');

interface CodexIndexEntry {
  id: string;
  thread_name?: string;
  updated_at?: string;
}

interface CodexRecord {
  timestamp?: string;
  type?: string;
  payload?: Record<string, unknown>;
}

interface CodexSessionMeta {
  id?: string;
  timestamp?: string;
  cwd?: string;
  cli_version?: string;
  model_provider?: string;
}

class CodexSessionService {
  isAvailable(): boolean {
    return fs.existsSync(CODEX_SESSIONS_PATH);
  }

  getAllSessions(): Session[] {
    try {
      const indexById = this.loadSessionIndex();
      const files = this.getSessionFiles();
      const sessions: Session[] = [];

      for (const filePath of files) {
        const session = this.parseSessionFileSummary(filePath, indexById);
        if (session) {
          sessions.push(session);
        }
      }

      return sessions.sort((a, b) => b.updatedAt - a.updatedAt);
    } catch (error) {
      log.error('Failed to get Codex sessions:', error);
      return [];
    }
  }

  getSessionDetail(sessionId: string): SessionDetail | null {
    try {
      const indexById = this.loadSessionIndex();
      const filePath = this.findSessionFile(sessionId);
      if (!filePath) return null;

      const lines = this.readJsonl(filePath);
      const meta = this.extractSessionMeta(lines);
      const id = meta.id || this.extractSessionIdFromFilePath(filePath);
      if (!id) return null;

      const indexEntry = indexById.get(id);
      const messages = this.parseMessages(lines);
      const stats = fs.statSync(filePath);
      const createdAt = this.toTime(meta.timestamp) || stats.birthtimeMs || stats.mtimeMs;
      const updatedAt =
        this.toTime(indexEntry?.updated_at) ||
        this.toTime(lines[lines.length - 1]?.timestamp) ||
        stats.mtimeMs;
      const firstMessage = indexEntry?.thread_name || this.findFirstMessagePreview(messages);
      const lastMessage = this.findLastMessagePreview(messages);

      return {
        id,
        appType: 'codex',
        fileName: indexEntry?.thread_name || path.basename(filePath),
        filePath,
        directory: meta.cwd,
        createdAt,
        updatedAt,
        messageCount: messages.length,
        firstMessage,
        lastMessage,
        messages,
      };
    } catch (error) {
      log.error(`Failed to get Codex session detail ${sessionId}:`, error);
      return null;
    }
  }

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

    const dates = sessions.map((session) => session.createdAt).sort((a, b) => a - b);
    return {
      totalSessions: sessions.length,
      totalMessages: sessions.reduce((sum, session) => sum + session.messageCount, 0),
      firstSessionDate: dates[0],
      lastSessionDate: Math.max(...sessions.map((session) => session.updatedAt)),
    };
  }

  private loadSessionIndex(): Map<string, CodexIndexEntry> {
    const entries = new Map<string, CodexIndexEntry>();
    if (!fs.existsSync(CODEX_SESSION_INDEX_PATH)) {
      return entries;
    }

    const content = fs.readFileSync(CODEX_SESSION_INDEX_PATH, 'utf-8');
    for (const line of content.split('\n')) {
      if (!line.trim()) continue;
      try {
        const entry = JSON.parse(line) as CodexIndexEntry;
        if (entry.id) {
          entries.set(entry.id, entry);
        }
      } catch {
        // Skip invalid index lines.
      }
    }

    return entries;
  }

  private getSessionFiles(): string[] {
    if (!fs.existsSync(CODEX_SESSIONS_PATH)) {
      return [];
    }

    const files: string[] = [];
    const walk = (dirPath: string): void => {
      for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
        const entryPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
          walk(entryPath);
        } else if (entry.isFile() && entry.name.endsWith('.jsonl')) {
          files.push(entryPath);
        }
      }
    };

    walk(CODEX_SESSIONS_PATH);
    return files;
  }

  private findSessionFile(sessionId: string): string | null {
    return (
      this.getSessionFiles().find((filePath) => {
        const idFromName = this.extractSessionIdFromFilePath(filePath);
        if (idFromName === sessionId) return true;

        const lines = this.readJsonl(filePath, 1);
        const meta = this.extractSessionMeta(lines);
        return meta.id === sessionId;
      }) || null
    );
  }

  private parseSessionFileSummary(
    filePath: string,
    indexById: Map<string, CodexIndexEntry>
  ): Session | null {
    const lines = this.readJsonl(filePath);
    if (lines.length === 0) return null;

    const meta = this.extractSessionMeta(lines);
    const id = meta.id || this.extractSessionIdFromFilePath(filePath);
    if (!id) return null;

    const messages = this.parseMessages(lines);
    const indexEntry = indexById.get(id);
    const stats = fs.statSync(filePath);
    const createdAt = this.toTime(meta.timestamp) || stats.birthtimeMs || stats.mtimeMs;
    const updatedAt =
      this.toTime(indexEntry?.updated_at) ||
      this.toTime(lines[lines.length - 1]?.timestamp) ||
      stats.mtimeMs;

    return {
      id,
      appType: 'codex',
      fileName: indexEntry?.thread_name || path.basename(filePath),
      filePath,
      directory: meta.cwd,
      createdAt,
      updatedAt,
      messageCount: messages.length,
      firstMessage: indexEntry?.thread_name || this.findFirstMessagePreview(messages),
      lastMessage: this.findLastMessagePreview(messages),
    };
  }

  private readJsonl(filePath: string, limit?: number): CodexRecord[] {
    const records: CodexRecord[] = [];
    const content = fs.readFileSync(filePath, 'utf-8');

    for (const line of content.split('\n')) {
      if (!line.trim()) continue;
      try {
        records.push(JSON.parse(line) as CodexRecord);
      } catch {
        // Skip invalid JSONL records.
      }
      if (limit && records.length >= limit) break;
    }

    return records;
  }

  private extractSessionMeta(records: CodexRecord[]): CodexSessionMeta {
    const record = records.find((item) => item.type === 'session_meta');
    return (record?.payload || {}) as CodexSessionMeta;
  }

  private parseMessages(records: CodexRecord[]): SessionMessage[] {
    const messages: SessionMessage[] = [];
    const pendingToolCalls = new Map<string, SessionMessage>();
    let currentModel: string | undefined;

    for (const record of records) {
      if (record.type === 'turn_context') {
        const model = record.payload?.model;
        if (typeof model === 'string') {
          currentModel = model;
        }
        continue;
      }

      if (record.type !== 'response_item') continue;

      const payload = record.payload;
      if (!payload) continue;

      const payloadType = payload.type;
      const timestamp = record.timestamp || new Date().toISOString();

      if (payloadType === 'message') {
        const role = payload.role;
        if (role !== 'user' && role !== 'assistant') continue;

        const rawContent = this.extractContentText(payload.content);
        const content = role === 'user' ? this.normalizeUserContent(rawContent) : rawContent;
        if (!content) continue;

        messages.push({
          type: role === 'user' ? 'user' : 'assistant',
          timestamp,
          content,
          model: currentModel,
        });
        continue;
      }

      if (payloadType === 'reasoning') {
        const reasoning = this.extractReasoningText(payload);
        if (!reasoning) continue;

        messages.push({
          type: 'assistant',
          timestamp,
          reasoning_content: reasoning,
          model: currentModel,
        });
        continue;
      }

      if (payloadType === 'function_call') {
        const toolName = typeof payload.name === 'string' ? payload.name : 'tool';
        const callId = typeof payload.call_id === 'string' ? payload.call_id : undefined;
        const toolInput = this.parseToolArguments(payload.arguments);
        const message: SessionMessage = {
          type: 'tool_use',
          timestamp,
          tool_name: toolName,
          tool_input: toolInput,
          callId,
          model: currentModel,
        };

        messages.push(message);
        if (callId) {
          pendingToolCalls.set(callId, message);
        }
        continue;
      }

      if (payloadType === 'function_call_output') {
        const callId = typeof payload.call_id === 'string' ? payload.call_id : undefined;
        const toolUse = callId ? pendingToolCalls.get(callId) : undefined;
        const output = typeof payload.output === 'string' ? payload.output : this.stringify(payload.output);

        messages.push({
          type: 'tool_result',
          timestamp,
          tool_name: toolUse?.tool_name || 'tool',
          tool_output: { output },
          callId,
          model: currentModel,
        });
        continue;
      }
    }

    return messages;
  }

  private extractContentText(content: unknown): string {
    if (typeof content === 'string') return content;
    if (!Array.isArray(content)) return '';

    return content
      .map((item) => {
        if (!item || typeof item !== 'object') return '';
        const record = item as Record<string, unknown>;
        return typeof record.text === 'string' ? record.text : '';
      })
      .filter(Boolean)
      .join('\n\n');
  }

  private normalizeUserContent(content: string): string {
    const trimmed = content.trim();
    if (!trimmed) return '';

    if (trimmed.startsWith('# AGENTS.md instructions for')) {
      return '';
    }

    if (trimmed.startsWith('<goal_context>')) {
      const objectiveMatch = trimmed.match(/<objective>\n?([\s\S]*?)\n?<\/objective>/);
      return objectiveMatch?.[1]?.trim() || '';
    }

    return content;
  }

  private extractReasoningText(payload: Record<string, unknown>): string {
    if (typeof payload.content === 'string') return payload.content;
    if (Array.isArray(payload.summary)) {
      return payload.summary
        .map((item) => {
          if (typeof item === 'string') return item;
          if (!item || typeof item !== 'object') return '';
          const record = item as Record<string, unknown>;
          return typeof record.text === 'string' ? record.text : '';
        })
        .filter(Boolean)
        .join('\n\n');
    }
    return '';
  }

  private parseToolArguments(argumentsValue: unknown): Record<string, unknown> {
    if (argumentsValue && typeof argumentsValue === 'object' && !Array.isArray(argumentsValue)) {
      return argumentsValue as Record<string, unknown>;
    }

    if (typeof argumentsValue !== 'string' || !argumentsValue.trim()) {
      return {};
    }

    try {
      const parsed = JSON.parse(argumentsValue);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // Fall through to raw argument display.
    }

    return { arguments: argumentsValue };
  }

  private stringify(value: unknown): string {
    if (typeof value === 'string') return value;
    if (value === undefined) return '';

    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }

  private findFirstMessagePreview(messages: SessionMessage[]): string {
    return this.truncate(
      messages.find((message) => message.type === 'user' && message.content)?.content || ''
    );
  }

  private findLastMessagePreview(messages: SessionMessage[]): string {
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      const content =
        message.content ||
        message.reasoning_content ||
        message.tool_output?.output ||
        (message.tool_input ? JSON.stringify(message.tool_input) : '');
      if (content) {
        return this.truncate(content);
      }
    }
    return '';
  }

  private truncate(value: string, maxLength = 200): string {
    const normalized = value.replace(/\s+/g, ' ').trim();
    return normalized.length > maxLength ? normalized.slice(0, maxLength) + '...' : normalized;
  }

  private toTime(value?: string): number | undefined {
    if (!value) return undefined;
    const time = new Date(value).getTime();
    return Number.isFinite(time) ? time : undefined;
  }

  private extractSessionIdFromFilePath(filePath: string): string | null {
    const match = path.basename(filePath).match(
      /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.jsonl$/i
    );
    return match?.[1] || null;
  }
}

export const codexSessionService = new CodexSessionService();
