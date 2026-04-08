/**
 * Claude Code Session Service
 *
 * Reads and parses Claude Code conversation transcripts
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import log from 'electron-log';
import type { Session, SessionDetail, SessionMessage } from '../../../src/types/session';

const CLAUDE_TRANSCRIPTS_PATH = path.join(os.homedir(), '.claude', 'transcripts');

export class ClaudeSessionService {
  /**
   * Check if Claude Code transcripts exist
   */
  isAvailable(): boolean {
    return fs.existsSync(CLAUDE_TRANSCRIPTS_PATH);
  }

  /**
   * Get all session files
   */
  getAllSessions(): Session[] {
    try {
      if (!this.isAvailable()) {
        return [];
      }

      const files = fs.readdirSync(CLAUDE_TRANSCRIPTS_PATH);
      const sessions: Session[] = [];

      for (const file of files) {
        if (file.endsWith('.jsonl') && file.startsWith('ses_')) {
          try {
            const session = this.parseSessionFile(file);
            if (session) {
              sessions.push(session);
            }
          } catch (error) {
            log.warn(`Failed to parse session file ${file}:`, error);
          }
        }
      }

      // Sort by updatedAt descending (newest first)
      return sessions.sort((a, b) => b.updatedAt - a.updatedAt);
    } catch (error) {
      log.error('Failed to get sessions:', error);
      return [];
    }
  }

  /**
   * Parse a single session file
   */
  private parseSessionFile(fileName: string): Session | null {
    const filePath = path.join(CLAUDE_TRANSCRIPTS_PATH, fileName);
    const stats = fs.statSync(filePath);

    // Extract session ID from filename (ses_<id>.jsonl)
    const id = fileName.replace('ses_', '').replace('.jsonl', '');

    // Read first and last few lines to get message info
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter((line) => line.trim());

    if (lines.length === 0) {
      return null;
    }

    let firstMessage = '';
    let lastMessage = '';

    try {
      const firstLine = JSON.parse(lines[0]) as SessionMessage;
      firstMessage = this.extractMessagePreview(firstLine);
    } catch {
      // Ignore parse errors
    }

    try {
      const lastLine = JSON.parse(lines[lines.length - 1]) as SessionMessage;
      lastMessage = this.extractMessagePreview(lastLine);
    } catch {
      // Ignore parse errors
    }

    return {
      id,
      appType: 'claude',
      fileName,
      filePath,
      createdAt: stats.birthtime.getTime(),
      updatedAt: stats.mtime.getTime(),
      messageCount: lines.length,
      firstMessage,
      lastMessage,
    };
  }

  /**
   * Extract a preview from a message
   */
  private extractMessagePreview(message: SessionMessage): string {
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
    try {
      const fileName = `ses_${sessionId}.jsonl`;
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

      return {
        id: sessionId,
        appType: 'claude',
        fileName,
        filePath,
        createdAt: stats.birthtime.getTime(),
        updatedAt: stats.mtime.getTime(),
        messageCount: messages.length,
        firstMessage: messages[0]?.content?.substring(0, 100) || '',
        lastMessage: messages[messages.length - 1]?.content?.substring(0, 100) || '',
        messages,
      };
    } catch (error) {
      log.error(`Failed to get session detail ${sessionId}:`, error);
      return null;
    }
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
}

export const claudeSessionService = new ClaudeSessionService();
