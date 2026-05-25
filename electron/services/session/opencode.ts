/**
 * OpenCode Session Service
 *
 * Reads and parses OpenCode conversation sessions from SQLite database
 */

import path from 'path';
import os from 'os';
import fs from 'fs';
import log from 'electron-log';
import type { Session, SessionDetail, SessionMessage } from '@/types/session';

const OPENCODE_DB_PATH = path.join(os.homedir(), '.local/share/opencode/opencode.db');

interface SqliteStatement {
  all(...params: unknown[]): unknown[];
  get(...params: unknown[]): unknown;
}

interface SqliteDatabase {
  prepare(sql: string): SqliteStatement;
  close(): void;
}

type SqliteDatabaseConstructor = new (
  filename: string,
  options?: { readonly?: boolean }
) => SqliteDatabase;

// Dynamic import for better-sqlite3 (ESM compatible)
let Database: SqliteDatabaseConstructor | null = null;
async function getDatabase(): Promise<SqliteDatabaseConstructor> {
  if (!Database) {
    const mod = await import('better-sqlite3');
    Database = (mod.default || mod) as SqliteDatabaseConstructor;
  }
  return Database;
}

interface OpenCodeSessionRow {
  id: string;
  directory: string;
  title: string;
  time_created: number;
  time_updated: number;
  summary_additions?: number;
  summary_deletions?: number;
  summary_files?: number;
}

interface OpenCodeMessageRow {
  id: string;
  session_id: string;
  time_created: number;
  data: string;
}

class OpenCodeSessionService {
  private db: SqliteDatabase | null = null;

  /**
   * Check if OpenCode database exists
   */
  isAvailable(): boolean {
    try {
      return fs.existsSync(OPENCODE_DB_PATH);
    } catch {
      return false;
    }
  }

  /**
   * Initialize database connection
   */
  private async getDb(): Promise<SqliteDatabase | null> {
    if (this.db) return this.db;

    try {
      // Use better-sqlite3 for synchronous operations
      const DatabaseConstructor = await getDatabase();
      this.db = new DatabaseConstructor(OPENCODE_DB_PATH, { readonly: true });
      return this.db;
    } catch (error) {
      log.error('Failed to open OpenCode database:', error);
      return null;
    }
  }

  /**
   * Get all sessions
   */
  async getAllSessions(): Promise<Session[]> {
    try {
      const db = await this.getDb();
      if (!db) return [];

      const stmt = db.prepare(`
        SELECT s.id, s.directory, s.title, s.time_created, s.time_updated,
               s.summary_additions, s.summary_deletions, s.summary_files,
               COUNT(m.id) as message_count
        FROM session s
        LEFT JOIN message m ON m.session_id = s.id
        WHERE s.time_archived IS NULL
        GROUP BY s.id
        ORDER BY s.time_updated DESC
      `);

      const rows = stmt.all() as Array<{
        id: string;
        directory: string;
        title: string;
        time_created: number;
        time_updated: number;
        summary_additions?: number;
        summary_deletions?: number;
        summary_files?: number;
        message_count: number;
      }>;

      return rows.map((row) => ({
        id: row.id,
        appType: 'opencode',
        fileName: row.title || row.id,
        filePath: OPENCODE_DB_PATH,
        directory: row.directory,
        createdAt: row.time_created,
        updatedAt: row.time_updated,
        messageCount: row.message_count,
        firstMessage: row.title || '',
        lastMessage: '',
      }));
    } catch (error) {
      log.error('Failed to get OpenCode sessions:', error);
      return [];
    }
  }

  /**
   * Get detailed session with all messages
   */
  async getSessionDetail(sessionId: string): Promise<SessionDetail | null> {
    try {
      const db = await this.getDb();
      if (!db) return null;

      // Get session info
      const sessionStmt = db.prepare(`
        SELECT id, directory, title, time_created, time_updated,
               summary_additions, summary_deletions, summary_files
        FROM session
        WHERE id = ?
      `);

      const sessionRow = sessionStmt.get(sessionId) as OpenCodeSessionRow | undefined;
      if (!sessionRow) return null;

      // Get messages with their parts
      const messageStmt = db.prepare(`
        SELECT id, time_created, data
        FROM message
        WHERE session_id = ?
        ORDER BY time_created ASC
      `);

      const messageRows = messageStmt.all(sessionId) as OpenCodeMessageRow[];

      // Get parts for all messages
      const partsStmt = db.prepare(`
        SELECT message_id, data
        FROM part
        WHERE session_id = ?
        ORDER BY time_created ASC
      `);

      const partRows = partsStmt.all(sessionId) as Array<{ message_id: string; data: string }>;

      // Group parts by message_id
      const partsByMessage = new Map<string, Array<Record<string, unknown>>>();
      for (const row of partRows) {
        if (!partsByMessage.has(row.message_id)) {
          partsByMessage.set(row.message_id, []);
        }
        try {
          const partData = JSON.parse(row.data);
          partsByMessage.get(row.message_id)!.push(partData);
        } catch {
          // Skip invalid part data
        }
      }

      let currentModel: string | undefined;
      const messages: SessionMessage[] = messageRows.map((row) => {
        try {
          const data = JSON.parse(row.data);
          const parts = partsByMessage.get(row.id) || [];
          // Track model changes - handle both string and object format
          if (data.model) {
            currentModel = this.extractModelString(data.model);
          }
          const parsedMsg = this.parseMessage(row.id, data, parts, row.time_created, currentModel);
          // Inherit model if not set
          if (!parsedMsg.model && currentModel) {
            parsedMsg.model = currentModel;
          }
          return parsedMsg;
        } catch {
          return {
            type: 'assistant',
            timestamp: new Date(row.time_created).toISOString(),
            content: '[Failed to parse message]',
            model: currentModel,
          } as SessionMessage;
        }
      });

      return {
        id: sessionRow.id,
        appType: 'opencode',
        fileName: sessionRow.title || sessionRow.id,
        filePath: OPENCODE_DB_PATH,
        directory: sessionRow.directory,
        createdAt: sessionRow.time_created,
        updatedAt: sessionRow.time_updated,
        messageCount: messages.length,
        firstMessage: sessionRow.title || '',
        lastMessage: messages[messages.length - 1]?.content || '',
        messages,
      };
    } catch (error) {
      log.error(`Failed to get OpenCode session detail ${sessionId}:`, error);
      return null;
    }
  }

  /**
   * Extract model string from various formats
   * OpenCode may store model as string or object {providerID, modelID}
   */
  private extractModelString(model: unknown): string | undefined {
    if (typeof model === 'string') {
      return model;
    }
    if (typeof model === 'object' && model !== null) {
      const modelObj = model as Record<string, unknown>;
      // Handle {providerID, modelID} format
      if (modelObj.modelID) {
        return String(modelObj.modelID);
      }
      // Handle {model: string} format
      if (modelObj.model) {
        return String(modelObj.model);
      }
    }
    return undefined;
  }

  /**
   * Parse OpenCode message format to SessionMessage
   */
  private parseMessage(
    _messageId: string,
    data: Record<string, unknown>,
    parts: Array<Record<string, unknown>>,
    timestamp: number,
    sessionModel?: string
  ): SessionMessage {
    const role = data.role as string;
    const timeStr = new Date(timestamp).toISOString();
    // Extract model from message data or use session model
    const messageModel = this.extractModelString(data.model) || sessionModel;

    // Extract content from all part types
    const contents: string[] = [];
    const reasoningContents: string[] = [];
    const toolCalls: Array<Record<string, unknown>> = [];

    for (const part of parts) {
      const partType = part.type as string;

      switch (partType) {
        case 'text':
          if (part.text) {
            contents.push(String(part.text));
          }
          break;
        case 'reasoning':
          if (part.text) {
            reasoningContents.push(String(part.text));
          }
          break;
        case 'tool':
          toolCalls.push(part);
          if (part.tool) {
            contents.push(`🔧 Tool: ${String(part.tool)}`);
          }
          if (part.state && typeof part.state === 'object') {
            const state = part.state as Record<string, unknown>;
            if (state.input) {
              contents.push(`Input: ${JSON.stringify(state.input, null, 2)}`);
            }
            if (state.output) {
              contents.push(`Output: ${JSON.stringify(state.output, null, 2)}`);
            }
          }
          break;
        case 'step-start':
        case 'step-finish':
          // Skip step markers - they're not useful for end users
          break;
      }
    }

    const content = contents.join('\n\n');
    const reasoningContent = reasoningContents.join('\n\n');

    // Check for tool calls in assistant messages
    if (role === 'assistant' && toolCalls.length > 0) {
      const toolCall = toolCalls[0];
      const state = (toolCall.state as Record<string, unknown>) || {};
      const toolOutput = state.output ? { output: JSON.stringify(state.output) } : undefined;

      return {
        type: 'tool_use',
        timestamp: timeStr,
        tool_name: (toolCall.tool as string) || 'tool',
        tool_input: (state.input as Record<string, unknown>) || {},
        tool_output: toolOutput,
        content,
        reasoning_content: reasoningContent || undefined,
        model: messageModel,
      } as SessionMessage;
    }

    return {
      type: role === 'user' ? 'user' : 'assistant',
      timestamp: timeStr,
      content,
      reasoning_content: reasoningContent || undefined,
      model: messageModel,
    } as SessionMessage;
  }

  /**
   * Get session statistics
   */
  async getStats(): Promise<{
    totalSessions: number;
    totalMessages: number;
    firstSessionDate?: number;
    lastSessionDate?: number;
  }> {
    try {
      const db = await this.getDb();
      if (!db) {
        return { totalSessions: 0, totalMessages: 0 };
      }

      const sessionCount = db
        .prepare('SELECT COUNT(*) as count FROM session WHERE time_archived IS NULL')
        .get() as { count: number };

      const messageCount = db.prepare('SELECT COUNT(*) as count FROM message').get() as {
        count: number;
      };

      const dateRange = db
        .prepare(
          'SELECT MIN(time_created) as first, MAX(time_updated) as last FROM session WHERE time_archived IS NULL'
        )
        .get() as { first: number; last: number };

      return {
        totalSessions: sessionCount.count,
        totalMessages: messageCount.count,
        firstSessionDate: dateRange.first,
        lastSessionDate: dateRange.last,
      };
    } catch (error) {
      log.error('Failed to get OpenCode session stats:', error);
      return { totalSessions: 0, totalMessages: 0 };
    }
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      try {
        this.db.close();
      } catch {
        // Ignore close errors
      }
      this.db = null;
    }
  }
}

export const opencodeSessionService = new OpenCodeSessionService();
