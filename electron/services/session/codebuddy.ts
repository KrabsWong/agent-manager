/**
 * Codebuddy Session Service
 *
 * Reads and parses Codebuddy conversation sessions from projects directory
 * Each project can have multiple session .jsonl files with full message history
 */

import path from 'path';
import os from 'os';
import fs from 'fs';
import log from 'electron-log';
import type { Session, SessionDetail, SessionMessage } from '../../../src/types/session';

const CODEBUDDY_DIR = path.join(os.homedir(), '.codebuddy');
const PROJECTS_DIR = path.join(CODEBUDDY_DIR, 'projects');
const SESSIONS_DIR = path.join(CODEBUDDY_DIR, 'sessions');

interface CodebuddySessionFile {
  pid: number;
  lastHeartbeat: number;
  sessionId: string;
  cwd: string;
  startedAt: number;
  kind: string;
  url: string;
  endpoint: string;
  mode: string;
  version: string;
  os: string;
  arch: string;
  hostname: string;
  updatedAt: number;
  meta?: {
    currentTopic?: string;
  };
}

interface CodebuddyMessageEntry {
  id: string;
  timestamp: number;
  type:
    | 'message'
    | 'function_call'
    | 'function_call_result'
    | 'assistant'
    | 'file-history-snapshot'
    | 'topic';
  role?: 'user' | 'assistant' | 'system';
  content?: Array<{
    type: string;
    text: string;
  }>;
  message?: {
    content: string;
  };
  name?: string;
  arguments?: string; // JSON string for function_call
  callId?: string;
  output?: {
    type: string;
    text: string;
  };
  status?: string;
}

export class CodebuddySessionService {
  /**
   * Check if Codebuddy data exists
   */
  isAvailable(): boolean {
    try {
      return fs.existsSync(CODEBUDDY_DIR) && fs.existsSync(PROJECTS_DIR);
    } catch {
      return false;
    }
  }

  /**
   * Decode project directory name to actual path
   * Example: "Users-krabswang-Personal-project" -> "/Users/krabswang/Personal/project"
   */
  private decodeProjectDir(dirName: string): string {
    // Handle special cases
    if (dirName.startsWith('Users-')) {
      const parts = dirName.split('-');
      // Convert Users-username-path to /Users/username/path
      if (parts.length >= 2) {
        const userPart = parts[1];
        const remainingPath = parts.slice(2).join('/');
        return `/Users/${userPart}/${remainingPath}`;
      }
    }
    // Fallback: just replace dashes with slashes
    return '/' + dirName.replace(/-/g, '/');
  }

  /**
   * Read session .jsonl file and get message count and last message
   */
  private readSessionJsonl(filePath: string): {
    count: number;
    lastMessage: string;
    firstMessage: string;
    createdAt: number;
    updatedAt: number;
  } {
    try {
      if (!fs.existsSync(filePath)) {
        return { count: 0, lastMessage: '', firstMessage: '', createdAt: 0, updatedAt: 0 };
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n').filter((line) => line.trim());

      if (lines.length === 0) {
        return { count: 0, lastMessage: '', firstMessage: '', createdAt: 0, updatedAt: 0 };
      }

      const firstEntry = JSON.parse(lines[0]) as CodebuddyMessageEntry;
      const lastEntry = JSON.parse(lines[lines.length - 1]) as CodebuddyMessageEntry;

      // Extract text from first user message
      let firstMessage = '';
      const firstUserEntry = lines.find((line) => {
        try {
          const entry = JSON.parse(line) as CodebuddyMessageEntry;
          return entry.type === 'message' && entry.role === 'user';
        } catch {
          return false;
        }
      });
      if (firstUserEntry) {
        const entry = JSON.parse(firstUserEntry) as CodebuddyMessageEntry;
        firstMessage = entry.content?.[0]?.text?.substring(0, 100) || '';
      }

      // Extract text from last user message
      let lastMessage = '';
      const lastUserEntry = [...lines].reverse().find((line) => {
        try {
          const entry = JSON.parse(line) as CodebuddyMessageEntry;
          return entry.type === 'message' && entry.role === 'user';
        } catch {
          return false;
        }
      });
      if (lastUserEntry) {
        const entry = JSON.parse(lastUserEntry) as CodebuddyMessageEntry;
        lastMessage = entry.content?.[0]?.text?.substring(0, 100) || '';
      }

      return {
        count: lines.length,
        lastMessage,
        firstMessage,
        createdAt: firstEntry.timestamp || Date.now(),
        updatedAt: lastEntry.timestamp || Date.now(),
      };
    } catch (error) {
      log.warn(`Failed to read session jsonl ${filePath}:`, error);
      return { count: 0, lastMessage: '', firstMessage: '', createdAt: 0, updatedAt: 0 };
    }
  }

  /**
   * Get all sessions from projects directory
   * Each .jsonl file in a project is a separate session
   */
  async getAllSessions(): Promise<Session[]> {
    try {
      if (!fs.existsSync(PROJECTS_DIR)) {
        return [];
      }

      // Read active session info if available
      let activeSession: CodebuddySessionFile | null = null;
      if (fs.existsSync(SESSIONS_DIR)) {
        const files = fs.readdirSync(SESSIONS_DIR).filter((f) => f.endsWith('.json'));
        for (const file of files) {
          try {
            const filePath = path.join(SESSIONS_DIR, file);
            const content = fs.readFileSync(filePath, 'utf-8');
            activeSession = JSON.parse(content) as CodebuddySessionFile;
            break;
          } catch (error) {
            log.warn(`Failed to parse Codebuddy session file ${file}:`, error);
          }
        }
      }

      const sessions: Session[] = [];
      const projectDirs = fs.readdirSync(PROJECTS_DIR);

      for (const projectDirName of projectDirs) {
        const projectPath = path.join(PROJECTS_DIR, projectDirName);

        // Skip if not a directory
        if (!fs.statSync(projectPath).isDirectory()) {
          continue;
        }

        // Decode project path
        const projectCwd = this.decodeProjectDir(projectDirName);

        // Find all .jsonl files in this project (these are sessions)
        const entries = fs.readdirSync(projectPath);

        for (const entry of entries) {
          const entryPath = path.join(projectPath, entry);

          // Check if it's a .jsonl file (session transcript)
          if (entry.endsWith('.jsonl') && fs.statSync(entryPath).isFile()) {
            const sessionId = entry.replace('.jsonl', '');
            const jsonlData = this.readSessionJsonl(entryPath);

            // Check if this is the active session
            const isActiveSession = activeSession && activeSession.sessionId === sessionId;

            sessions.push({
              id: sessionId,
              appType: 'codebuddy',
              fileName:
                isActiveSession && activeSession!.meta?.currentTopic
                  ? activeSession!.meta.currentTopic
                  : jsonlData.firstMessage || `Session ${sessionId.substring(0, 8)}`,
              filePath: entryPath,
              directory: projectCwd,
              createdAt: jsonlData.createdAt,
              updatedAt: isActiveSession
                ? activeSession!.updatedAt || activeSession!.lastHeartbeat
                : jsonlData.updatedAt,
              messageCount: jsonlData.count,
              firstMessage: jsonlData.firstMessage,
              lastMessage:
                isActiveSession && activeSession!.meta?.currentTopic
                  ? activeSession!.meta.currentTopic
                  : jsonlData.lastMessage,
              uuid: sessionId,
            });
          }

          // Also check subdirectories for nested .jsonl files (subagents)
          if (fs.statSync(entryPath).isDirectory()) {
            const subEntries = fs.readdirSync(entryPath);
            for (const subEntry of subEntries) {
              if (subEntry.endsWith('.jsonl')) {
                const subEntryPath = path.join(entryPath, subEntry);
                const sessionId = subEntry.replace('.jsonl', '');
                const jsonlData = this.readSessionJsonl(subEntryPath);

                sessions.push({
                  id: sessionId,
                  appType: 'codebuddy',
                  fileName:
                    jsonlData.firstMessage || `Subagent Session ${sessionId.substring(0, 8)}`,
                  filePath: subEntryPath,
                  directory: projectCwd,
                  createdAt: jsonlData.createdAt,
                  updatedAt: jsonlData.updatedAt,
                  messageCount: jsonlData.count,
                  firstMessage: jsonlData.firstMessage,
                  lastMessage: jsonlData.lastMessage,
                  uuid: sessionId,
                });
              }
            }
          }
        }
      }

      // Sort by updatedAt desc
      sessions.sort((a, b) => b.updatedAt - a.updatedAt);

      return sessions;
    } catch (error) {
      log.error('Failed to get Codebuddy sessions:', error);
      return [];
    }
  }

  /**
   * Get detailed session with messages
   */
  async getSessionDetail(sessionId: string): Promise<SessionDetail | null> {
    try {
      // Try to find the session file by sessionId
      if (!fs.existsSync(PROJECTS_DIR)) {
        return null;
      }

      const projectDirs = fs.readdirSync(PROJECTS_DIR);
      let foundSession: { path: string; projectCwd: string } | null = null;

      for (const projectDirName of projectDirs) {
        const projectPath = path.join(PROJECTS_DIR, projectDirName);

        if (!fs.statSync(projectPath).isDirectory()) {
          continue;
        }

        // Check main directory
        const entries = fs.readdirSync(projectPath);
        for (const entry of entries) {
          if (entry === `${sessionId}.jsonl`) {
            foundSession = {
              path: path.join(projectPath, entry),
              projectCwd: this.decodeProjectDir(projectDirName),
            };
            break;
          }

          // Check subdirectories
          const entryPath = path.join(projectPath, entry);
          if (fs.statSync(entryPath).isDirectory()) {
            const subEntries = fs.readdirSync(entryPath);
            if (subEntries.includes(`${sessionId}.jsonl`)) {
              foundSession = {
                path: path.join(entryPath, `${sessionId}.jsonl`),
                projectCwd: this.decodeProjectDir(projectDirName),
              };
              break;
            }
          }
        }

        if (foundSession) break;
      }

      if (!foundSession) {
        return null;
      }

      // Read and parse the session file
      const content = fs.readFileSync(foundSession.path, 'utf-8');
      const lines = content.split('\n').filter((line) => line.trim());

      const messages: SessionMessage[] = [];
      let firstMessage = '';
      let lastMessage = '';

      for (const line of lines) {
        try {
          const entry = JSON.parse(line) as CodebuddyMessageEntry;

          if (entry.type === 'message' && entry.role === 'user') {
            const text = entry.content?.[0]?.text || '';
            if (!firstMessage) firstMessage = text.substring(0, 100);
            lastMessage = text.substring(0, 100);

            messages.push({
              type: 'user',
              timestamp: new Date(entry.timestamp).toISOString(),
              content: text,
            });
          } else if (entry.type === 'message' && entry.role === 'assistant') {
            // Assistant response - content is an array with output_text items
            let text = '';
            if (entry.content && Array.isArray(entry.content)) {
              // Concatenate all output_text items
              text = entry.content
                .filter((c) => c.type === 'output_text')
                .map((c) => c.text)
                .join('');
            }
            // Fallback to message.content if available
            if (!text && entry.message?.content) {
              text = entry.message.content;
            }
            messages.push({
              type: 'assistant',
              timestamp: new Date(entry.timestamp).toISOString(),
              content: text,
            });
          } else if (entry.type === 'function_call') {
            // Parse tool arguments from the arguments JSON string
            let toolInput: Record<string, unknown> = {};
            let toolContent = `Tool: ${entry.name}`;

            if (entry.arguments) {
              try {
                toolInput = JSON.parse(entry.arguments) as Record<string, unknown>;
                // Build content based on tool type
                if (entry.name === 'WebFetch' && toolInput.url) {
                  toolContent = `🌐 WebFetch: ${toolInput.url}`;
                } else if (entry.name === 'Read' && toolInput.file_path) {
                  toolContent = `📄 Read: ${toolInput.file_path}`;
                } else if (entry.name === 'Write' && toolInput.file_path) {
                  toolContent = `📝 Write: ${toolInput.file_path}`;
                } else if (entry.name === 'Bash' && toolInput.command) {
                  toolContent = `⚡ Bash: ${toolInput.command}`;
                } else if (entry.name === 'Agent' && toolInput.description) {
                  toolContent = `🤖 Agent: ${toolInput.description}`;
                } else if (entry.name) {
                  toolContent = `🔧 ${entry.name}`;
                }
              } catch {
                // If parsing fails, use raw arguments
                toolContent = `🔧 ${entry.name}: ${entry.arguments?.substring(0, 100)}`;
              }
            }

            messages.push({
              type: 'tool_use',
              timestamp: new Date(entry.timestamp).toISOString(),
              tool_name: entry.name || 'tool',
              tool_input: toolInput,
              content: toolContent,
            });
          } else if (entry.type === 'function_call_result') {
            // Tool execution result
            const outputText = entry.output?.text || '';
            const truncatedOutput =
              outputText.length > 300 ? outputText.substring(0, 300) + '...' : outputText;

            messages.push({
              type: 'tool_result',
              timestamp: new Date(entry.timestamp).toISOString(),
              tool_name: entry.name || 'tool',
              content: truncatedOutput,
              tool_output: {
                output: outputText,
              },
            });
          }
          // Skip: file-history-snapshot, topic - these are metadata not for display
        } catch {
          // Skip invalid lines
        }
      }

      const firstEntry = JSON.parse(lines[0]) as CodebuddyMessageEntry;
      const lastEntry = JSON.parse(lines[lines.length - 1]) as CodebuddyMessageEntry;

      return {
        id: sessionId,
        appType: 'codebuddy',
        fileName: firstMessage || `Session ${sessionId.substring(0, 8)}`,
        filePath: foundSession.path,
        directory: foundSession.projectCwd,
        createdAt: firstEntry.timestamp,
        updatedAt: lastEntry.timestamp,
        messageCount: messages.length,
        firstMessage,
        lastMessage,
        uuid: sessionId,
        messages,
      };
    } catch (error) {
      log.error(`Failed to get Codebuddy session detail ${sessionId}:`, error);
      return null;
    }
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
      const sessions = await this.getAllSessions();

      if (sessions.length === 0) {
        return { totalSessions: 0, totalMessages: 0 };
      }

      const totalMessages = sessions.reduce((sum, s) => sum + s.messageCount, 0);
      const dates = sessions.map((s) => s.createdAt);
      const updatedDates = sessions.map((s) => s.updatedAt);

      return {
        totalSessions: sessions.length,
        totalMessages: totalMessages,
        firstSessionDate: Math.min(...dates),
        lastSessionDate: Math.max(...updatedDates),
      };
    } catch (error) {
      log.error('Failed to get Codebuddy session stats:', error);
      return { totalSessions: 0, totalMessages: 0 };
    }
  }
}

export const codebuddySessionService = new CodebuddySessionService();
