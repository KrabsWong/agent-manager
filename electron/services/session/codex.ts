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
const SESSION_FILES_CACHE_TTL_MS = 5000;

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

interface ParseMessagesOptions {
  embedLocalImages?: boolean;
  localImageRoots?: string[];
}

class CodexSessionService {
  private sessionFilesCache: string[] | null = null;
  private sessionFilesCacheAt = 0;
  private sessionFileById = new Map<string, string>();

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
          this.sessionFileById.set(session.id, filePath);
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
      if (this.isInternalReviewSession(lines)) return null;

      const meta = this.extractSessionMeta(lines);
      const id = meta.id || this.extractSessionIdFromFilePath(filePath);
      if (!id) return null;

      const indexEntry = indexById.get(id);
      const messages = this.parseMessages(lines, {
        embedLocalImages: true,
        localImageRoots: this.getLocalImageRoots(meta.cwd),
      });
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
    if (
      this.sessionFilesCache &&
      Date.now() - this.sessionFilesCacheAt < SESSION_FILES_CACHE_TTL_MS
    ) {
      return this.sessionFilesCache;
    }

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
    this.sessionFilesCache = files;
    this.sessionFilesCacheAt = Date.now();
    return files;
  }

  private findSessionFile(sessionId: string): string | null {
    const cachedPath = this.sessionFileById.get(sessionId);
    if (cachedPath && fs.existsSync(cachedPath)) {
      return cachedPath;
    }

    return (
      this.getSessionFiles().find((filePath) => {
        const idFromName = this.extractSessionIdFromFilePath(filePath);
        if (idFromName === sessionId) {
          this.sessionFileById.set(sessionId, filePath);
          return true;
        }

        const lines = this.readJsonl(filePath, 1);
        const meta = this.extractSessionMeta(lines);
        if (meta.id === sessionId) {
          this.sessionFileById.set(sessionId, filePath);
          return true;
        }
        return false;
      }) || null
    );
  }

  private parseSessionFileSummary(
    filePath: string,
    indexById: Map<string, CodexIndexEntry>
  ): Session | null {
    const lines = this.readJsonl(filePath);
    if (lines.length === 0) return null;
    if (this.isInternalReviewSession(lines)) return null;

    const meta = this.extractSessionMeta(lines);
    const id = meta.id || this.extractSessionIdFromFilePath(filePath);
    if (!id) return null;

    const summary = this.parseSessionSummary(lines);
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
      messageCount: summary.messageCount,
      firstMessage: indexEntry?.thread_name || summary.firstMessage,
      lastMessage: summary.lastMessage,
    };
  }

  private parseSessionSummary(records: CodexRecord[]): {
    messageCount: number;
    firstMessage: string;
    lastMessage: string;
  } {
    let messageCount = 0;
    let firstMessage = '';
    let lastMessage = '';

    for (const record of records) {
      if (record.type !== 'response_item') continue;
      const payload = record.payload;
      if (!payload) continue;

      const preview = this.getSummaryPreview(payload);
      if (!preview) continue;

      messageCount++;
      if (!firstMessage) {
        firstMessage = preview;
      }
      lastMessage = preview;
    }

    return { messageCount, firstMessage, lastMessage };
  }

  private getSummaryPreview(payload: Record<string, unknown>): string {
    const payloadType = payload.type;

    if (payloadType === 'message') {
      const role = payload.role;
      if (role !== 'user' && role !== 'assistant') return '';

      const rawContent = this.extractContentText(payload.content);
      const content =
        role === 'user'
          ? this.normalizeUserContent(rawContent)
          : this.normalizeAssistantContent(rawContent, {});
      return content.substring(0, 100);
    }

    if (payloadType === 'reasoning') {
      return this.extractReasoningText(payload).substring(0, 100);
    }

    if (payloadType === 'function_call' || payloadType === 'custom_tool_call') {
      return `[Tool: ${this.getToolName(payload)}]`;
    }

    if (payloadType === 'function_call_output' || payloadType === 'custom_tool_call_output') {
      return '[Tool result]';
    }

    return '';
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

  private isInternalReviewSession(records: CodexRecord[]): boolean {
    return records.some((record) => {
      if (record.type !== 'turn_context') return false;
      return record.payload?.model === 'codex-auto-review';
    });
  }

  private parseMessages(
    records: CodexRecord[],
    options: ParseMessagesOptions = {}
  ): SessionMessage[] {
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
        const content =
          role === 'user'
            ? this.normalizeUserContent(rawContent)
            : this.normalizeAssistantContent(rawContent, options);
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
        const toolName = this.getToolName(payload);
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

      if (payloadType === 'custom_tool_call') {
        const toolName = this.getToolName(payload);
        const callId = typeof payload.call_id === 'string' ? payload.call_id : undefined;
        const toolInput = this.parseCustomToolInput(toolName, payload.input);
        const message: SessionMessage = {
          type: 'tool_use',
          timestamp,
          tool_name: toolName,
          tool_input: toolInput,
          callId,
          model: currentModel,
          metadata: this.getStatusMetadata(payload),
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
        const output =
          typeof payload.output === 'string' ? payload.output : this.stringify(payload.output);

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

      if (payloadType === 'custom_tool_call_output') {
        const callId = typeof payload.call_id === 'string' ? payload.call_id : undefined;
        const toolUse = callId ? pendingToolCalls.get(callId) : undefined;
        const output = this.extractCustomToolOutput(payload.output);

        messages.push({
          type: 'tool_result',
          timestamp,
          tool_name: toolUse?.tool_name || this.getToolName(payload),
          tool_output: { output },
          callId,
          model: currentModel,
          metadata: this.getStatusMetadata(payload),
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

    if (trimmed.startsWith('<skill>') || trimmed.startsWith('<skill ')) {
      return '';
    }

    if (trimmed.startsWith('The following is the Codex agent history')) {
      return '';
    }

    if (
      trimmed.startsWith('<environment_context>') ||
      trimmed.startsWith('<permissions instructions>') ||
      trimmed.startsWith('<app-context>') ||
      trimmed.startsWith('<collaboration_mode>') ||
      trimmed.startsWith('<skills_instructions>') ||
      trimmed.startsWith('<plugins_instructions>') ||
      trimmed.startsWith('<INSTRUCTIONS>')
    ) {
      return '';
    }

    if (trimmed.startsWith('<goal_context>')) {
      const objectiveMatch = trimmed.match(/<objective>\n?([\s\S]*?)\n?<\/objective>/);
      return objectiveMatch?.[1]?.trim() || '';
    }

    return content;
  }

  private normalizeAssistantContent(content: string, options: ParseMessagesOptions): string {
    if (!options.embedLocalImages) {
      return content;
    }

    return this.embedLocalMarkdownImages(content, options.localImageRoots || []);
  }

  private embedLocalMarkdownImages(content: string, roots: string[]): string {
    if (!content.includes('![') || roots.length === 0) {
      return content;
    }

    return content.replace(/(!\[[^\]]*]\()([^)\s]+)(\))/g, (match, prefix, imagePath, suffix) => {
      if (!path.isAbsolute(imagePath)) {
        return match;
      }

      const dataUrl = this.readLocalImageDataUrl(imagePath, roots);
      return dataUrl ? `${prefix}${dataUrl}${suffix}` : match;
    });
  }

  private readLocalImageDataUrl(filePath: string, roots: string[]): string | null {
    const ext = path.extname(filePath).slice(1).toLowerCase();
    const mimeType = this.getImageMimeType(ext);
    if (!mimeType) {
      return null;
    }

    try {
      const resolvedPath = fs.realpathSync(filePath);
      const resolvedRoots = roots
        .map((root) => {
          try {
            return fs.realpathSync(root);
          } catch {
            return null;
          }
        })
        .filter((root): root is string => Boolean(root));

      if (!this.isPathInsideAnyRoot(resolvedPath, resolvedRoots)) {
        return null;
      }

      const stats = fs.statSync(resolvedPath);
      if (!stats.isFile() || stats.size > 10 * 1024 * 1024) {
        return null;
      }

      const data = fs.readFileSync(resolvedPath);
      return `data:${mimeType};base64,${data.toString('base64')}`;
    } catch {
      return null;
    }
  }

  private getLocalImageRoots(cwd?: string): string[] {
    return [cwd, CODEX_HOME_PATH].filter((item): item is string => Boolean(item));
  }

  private getImageMimeType(ext: string): string | null {
    const mimeTypes: Record<string, string> = {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      webp: 'image/webp',
      svg: 'image/svg+xml',
      bmp: 'image/bmp',
      ico: 'image/x-icon',
      avif: 'image/avif',
    };

    return mimeTypes[ext] || null;
  }

  private isPathInsideAnyRoot(filePath: string, roots: string[]): boolean {
    return roots.some((root) => filePath === root || filePath.startsWith(root + path.sep));
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

  private parseCustomToolInput(toolName: string, inputValue: unknown): Record<string, unknown> {
    if (toolName === 'apply_patch' && typeof inputValue === 'string') {
      return { patch: inputValue };
    }

    return this.parseToolArguments(inputValue);
  }

  private extractCustomToolOutput(outputValue: unknown): string {
    if (typeof outputValue !== 'string') {
      return this.stringify(outputValue);
    }

    try {
      const parsed = JSON.parse(outputValue) as { output?: unknown };
      if (typeof parsed.output === 'string') {
        return parsed.output;
      }
    } catch {
      // Fall through to the raw output string.
    }

    return outputValue;
  }

  private getToolName(payload: Record<string, unknown>): string {
    const name = typeof payload.name === 'string' ? payload.name : 'tool';
    const namespace = typeof payload.namespace === 'string' ? payload.namespace : '';

    if (namespace.startsWith('mcp__')) {
      const serverName = namespace.replace(/^mcp__/, '').replace(/__$/, '');
      return `mcp:${serverName}.${name}`;
    }

    return name;
  }

  private getStatusMetadata(payload: Record<string, unknown>): SessionMessage['metadata'] {
    return typeof payload.status === 'string' ? { subtype: payload.status } : undefined;
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
    const match = path
      .basename(filePath)
      .match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.jsonl$/i);
    return match?.[1] || null;
  }
}

export const codexSessionService = new CodexSessionService();
