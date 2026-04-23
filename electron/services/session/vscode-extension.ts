/**
 * VS Code Extension Session Service
 *
 * Reads and parses VS Code AI extension conversation sessions from:
 * - ~/Library/Application Support/Code/User/workspaceStorage/[hash]/[extension-id]/[chat-dir]/
 *
 * Currently supports:
 * - Gongfeng Copilot (gongfeng.gongfeng-copilot)
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import log from 'electron-log';
import type { Session, SessionDetail, SessionMessage } from '@/types/session';

const VSCODE_STORAGE_PATH = path.join(
  os.homedir(),
  'Library/Application Support/Code/User/workspaceStorage'
);

// Supported extensions and their configurations
const SUPPORTED_EXTENSIONS = [
  {
    id: 'gongfeng.gongfeng-copilot',
    chatDir: 'gongfeng-chat',
    historyFile: 'chat_history_list.json',
    tabFile: 'chat_tab_list.json',
  },
];

interface WorkspaceInfo {
  hash: string;
  path: string | null;
}

interface ChatHistoryEntry {
  conversationId: string;
  sessionName: string;
  createdTime: number;
  lastModifiedTime: number;
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  createdAt?: number;
  cost?: number;
  model?: string;
  name?: string; // for tool messages
  // Additional fields for tool calls
  tool_calls?: Array<{
    id?: string;
    name?: string;
    arguments?: string;
  }>;
  tool_call_id?: string;
  // Gongfeng Copilot parser events
  parser?: {
    events?: Array<{
      type: string;
      rawEvent?: Record<string, unknown>;
      content?: string;
      [key: string]: unknown;
    }>;
  };
}

interface ChatSessionFile {
  sessionId: string;
  sessionName: string;
  messages: ChatMessage[];
  model?: string;
  chatMode?: string;
}

interface ExtensionData {
  extensionId: string;
  workspaceHash: string;
  workspacePath: string | null;
  historyPath: string;
  chatDir: string;
}

export class VSCodeExtensionSessionService {
  /**
   * Check if VS Code extension data exists
   */
  isAvailable(): boolean {
    if (!fs.existsSync(VSCODE_STORAGE_PATH)) {
      return false;
    }

    // Check if any supported extension data exists
    const workspaces = this.getWorkspaces();
    for (const workspace of workspaces) {
      for (const ext of SUPPORTED_EXTENSIONS) {
        const extPath = path.join(
          VSCODE_STORAGE_PATH,
          workspace.hash,
          ext.id,
          ext.chatDir
        );
        if (fs.existsSync(extPath)) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Get all workspace directories
   */
  private getWorkspaces(): WorkspaceInfo[] {
    const workspaces: WorkspaceInfo[] = [];

    try {
      if (!fs.existsSync(VSCODE_STORAGE_PATH)) {
        return workspaces;
      }

      const entries = fs.readdirSync(VSCODE_STORAGE_PATH, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const hash = entry.name;
          const workspaceJsonPath = path.join(VSCODE_STORAGE_PATH, hash, 'workspace.json');
          let workspacePath: string | null = null;

          if (fs.existsSync(workspaceJsonPath)) {
            try {
              const content = fs.readFileSync(workspaceJsonPath, 'utf-8');
              const data = JSON.parse(content);
              workspacePath = data.path || data.folder || null;
            } catch {
              // Ignore parse errors
            }
          }

          workspaces.push({ hash, path: workspacePath });
        }
      }
    } catch (error) {
      log.warn('Failed to get VS Code workspaces:', error);
    }

    return workspaces;
  }

  /**
   * Find all extension data directories
   */
  private findExtensionData(): ExtensionData[] {
    const results: ExtensionData[] = [];
    const workspaces = this.getWorkspaces();

    for (const workspace of workspaces) {
      for (const ext of SUPPORTED_EXTENSIONS) {
        const extPath = path.join(VSCODE_STORAGE_PATH, workspace.hash, ext.id, ext.chatDir);
        const historyPath = path.join(extPath, ext.historyFile);

        if (fs.existsSync(extPath) && fs.existsSync(historyPath)) {
          results.push({
            extensionId: ext.id,
            workspaceHash: workspace.hash,
            workspacePath: workspace.path,
            historyPath,
            chatDir: extPath,
          });
        }
      }
    }

    return results;
  }

  /**
   * Load chat history from an extension
   */
  private loadChatHistory(historyPath: string): ChatHistoryEntry[] {
    try {
      if (!fs.existsSync(historyPath)) {
        return [];
      }

      const content = fs.readFileSync(historyPath, 'utf-8');
      const data = JSON.parse(content);

      if (Array.isArray(data)) {
        return data as ChatHistoryEntry[];
      }
      return [];
    } catch (error) {
      log.warn(`Failed to load chat history from ${historyPath}:`, error);
      return [];
    }
  }

  /**
   * Load session detail from file
   */
  private loadSessionFile(sessionFilePath: string): ChatSessionFile | null {
    try {
      if (!fs.existsSync(sessionFilePath)) {
        return null;
      }

      const content = fs.readFileSync(sessionFilePath, 'utf-8');
      const data = JSON.parse(content) as ChatSessionFile;
      
      // Debug log
      log.debug(`Loaded session file: ${sessionFilePath}, messages count: ${data.messages?.length || 0}`);
      
      return data;
    } catch (error) {
      log.warn(`Failed to load session file ${sessionFilePath}:`, error);
      return null;
    }
  }

  /**
   * Extract text content from a message (handles both direct content and parser.events)
   */
  private extractMessagePreview(msg: ChatMessage): string {
    // First try direct content
    if (msg.content?.trim()) {
      return msg.content.substring(0, 100);
    }

    // Then try parser.events (Gongfeng format)
    const events = msg.parser?.events;
    if (events && Array.isArray(events)) {
      // For user messages, look for TEXT_MESSAGE_CONTENT
      // For assistant messages, look for TEXT_MESSAGE_CONTENT
      const textEvents = events.filter(e => 
        e.type === 'TEXT_MESSAGE_CONTENT' && (e.rawEvent?.content || e.content)
      );
      if (textEvents.length > 0) {
        const lastEvent = textEvents[textEvents.length - 1];
        const content = (lastEvent.rawEvent?.content || lastEvent.content || '') as string;
        return content.substring(0, 100);
      }
    }

    return '';
  }

  /**
   * Get all sessions from all workspaces and extensions
   */
  getAllSessions(): Session[] {
    const sessions: Session[] = [];
    const extDataList = this.findExtensionData();

    for (const extData of extDataList) {
      const historyEntries = this.loadChatHistory(extData.historyPath);

      for (const entry of historyEntries) {
        const sessionFilePath = path.join(extData.chatDir, `${entry.conversationId}.json`);
        const sessionData = this.loadSessionFile(sessionFilePath);

        const messageCount = sessionData?.messages?.length || 0;
        
        // Get first user message and last assistant message for preview
        let firstMessage = '';
        let lastMessage = '';
        
        if (sessionData?.messages && sessionData.messages.length > 0) {
          // Find first user message
          const firstUserMsg = sessionData.messages.find(m => m.role === 'user');
          if (firstUserMsg) {
            firstMessage = this.extractMessagePreview(firstUserMsg);
          }
          
          // Find last assistant message
          for (let i = sessionData.messages.length - 1; i >= 0; i--) {
            if (sessionData.messages[i].role === 'assistant') {
              lastMessage = this.extractMessagePreview(sessionData.messages[i]);
              break;
            }
          }
        }

        sessions.push({
          id: entry.conversationId,
          appType: 'vscode-extension',
          fileName: entry.sessionName || entry.conversationId,
          filePath: sessionFilePath,
          directory: extData.workspacePath || extData.workspaceHash,
          createdAt: entry.createdTime,
          updatedAt: entry.lastModifiedTime,
          messageCount,
          firstMessage,
          lastMessage,
          uuid: entry.conversationId,
        });
      }
    }

    // Sort by updatedAt descending (newest first)
    return sessions.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  /**
   * Get detailed session with all messages
   */
  getSessionDetail(sessionId: string): SessionDetail | null {
    const extDataList = this.findExtensionData();

    for (const extData of extDataList) {
      const historyEntries = this.loadChatHistory(extData.historyPath);
      const historyEntry = historyEntries.find((e) => e.conversationId === sessionId);

      if (!historyEntry) {
        continue;
      }

      const sessionFilePath = path.join(extData.chatDir, `${sessionId}.json`);
      const sessionData = this.loadSessionFile(sessionFilePath);

      if (!sessionData) {
        continue;
      }

      // Debug log the raw messages
      log.debug(`Parsing session ${sessionId}, raw messages:`, sessionData.messages.map(m => ({ role: m.role, contentLength: m.content?.length })));

      const messages = this.parseMessages(sessionData.messages, sessionData.model);
      
      log.debug(`Parsed messages count: ${messages.length}`);

      return {
        id: sessionId,
        appType: 'vscode-extension',
        fileName: historyEntry.sessionName || sessionId,
        filePath: sessionFilePath,
        directory: extData.workspacePath || extData.workspaceHash,
        createdAt: historyEntry.createdTime,
        updatedAt: historyEntry.lastModifiedTime,
        messageCount: messages.length,
        firstMessage: messages[0]?.content?.substring(0, 100) || '',
        lastMessage: messages[messages.length - 1]?.content?.substring(0, 100) || '',
        messages,
      };
    }

    return null;
  }

  /**
   * Parse Gongfeng Copilot events from parser.events array or JSON Lines content
   * Extracts actual text content and tool calls from event stream
   */
  private parseGongfengEvents(events: any[]): {
    textContent: string;
    reasoningContent: string;
    toolCalls: Array<{ name: string; input: Record<string, unknown>; output?: string }>;
  } {
    const toolCalls: Array<{ name: string; input: Record<string, unknown>; output?: string }> = [];
    const textParts: string[] = [];
    const reasoningParts: string[] = [];

    for (const event of events) {
      if (!event || !event.type) continue;

      switch (event.type) {
        case 'TEXT_MESSAGE_CONTENT':
          // Actual AI response text
          if (event.rawEvent?.content || event.content) {
            textParts.push(event.rawEvent?.content || event.content);
          }
          break;

        case 'THINKING_TEXT_MESSAGE_CONTENT':
          // AI reasoning/thinking process
          if (event.rawEvent?.content || event.content) {
            reasoningParts.push(event.rawEvent?.content || event.content);
          }
          break;

        case 'TEXT_MESSAGE_START':
        case 'TEXT_MESSAGE_END':
        case 'THINKING_TEXT_MESSAGE_START':
        case 'THINKING_TEXT_MESSAGE_END':
          // Message boundaries, skip
          break;

        case 'RUN_STARTED':
        case 'RUN_COMPLETED':
        case 'STEP_STARTED':
        case 'STEP_COMPLETED':
          // Session lifecycle events, skip
          break;

        case 'TOOL_CALL_START':
          // Tool call started - store for later matching with result
          if (event.rawEvent?.name || event.toolCallName) {
            toolCalls.push({
              name: event.rawEvent?.name || event.toolCallName,
              input: event.rawEvent?.arguments || event.rawEvent?.document || {},
            });
          }
          break;

        case 'TOOL_CALL_ARGS':
          // Tool call arguments update
          if (toolCalls.length > 0) {
            const lastTool = toolCalls[toolCalls.length - 1];
            if (event.rawEvent?.document) {
              lastTool.input = { ...lastTool.input, ...event.rawEvent.document };
            }
          }
          break;

        case 'TOOL_CALL_END':
          // Tool call ended
          break;

        case 'TOOL_CALL_RESULT':
          // Tool call result - match with last tool call
          if (toolCalls.length > 0) {
            const lastTool = toolCalls[toolCalls.length - 1];
            const content = event.rawEvent?.content || event.content;
            if (content && !lastTool.output) {
              lastTool.output = typeof content === 'string'
                ? content
                : JSON.stringify(content);
            }
          }
          break;

        case 'CUSTOM':
          // Custom events (like remove-tool), skip
          break;

        default:
          // Unknown event type, log for debugging
          log.debug('Unknown Gongfeng event type:', event.type);
          break;
      }
    }

    return {
      textContent: textParts.join(''),
      reasoningContent: reasoningParts.join(''),
      toolCalls,
    };
  }

  /**
   * Parse JSON Lines format content (legacy format)
   */
  private parseGongfengContent(content: string): {
    textContent: string;
    reasoningContent: string;
    toolCalls: Array<{ name: string; input: Record<string, unknown>; output?: string }>;
  } {
    // Try to parse as JSON Lines first
    const lines = content.split('\n').filter(line => line.trim());
    const events: any[] = [];

    for (const line of lines) {
      try {
        events.push(JSON.parse(line));
      } catch {
        // Not valid JSON, ignore
      }
    }

    if (events.length > 0) {
      return this.parseGongfengEvents(events);
    }

    // Fallback: return as plain text
    return {
      textContent: content,
      reasoningContent: '',
      toolCalls: [],
    };
  }

  /**
   * Parse chat messages to SessionMessage format
   */
  private parseMessages(messages: ChatMessage[], defaultModel?: string): SessionMessage[] {
    const result: SessionMessage[] = [];
    let currentModel = defaultModel;

    // Sort messages by createdAt to ensure correct order
    const sortedMessages = [...messages].sort((a, b) => {
      const timeA = a.createdAt || 0;
      const timeB = b.createdAt || 0;
      return timeA - timeB;
    });

    for (let i = 0; i < sortedMessages.length; i++) {
      const msg = sortedMessages[i];

      // Handle timestamp - VS Code extension uses createdAt (milliseconds)
      let timestamp: string;
      if (msg.createdAt) {
        // Check if timestamp is in seconds or milliseconds
        // If less than year 2100 in seconds (4102444800), it's likely in milliseconds
        const timestampMs = msg.createdAt > 4102444800000 ? msg.createdAt : msg.createdAt * 1000;
        timestamp = new Date(timestampMs).toISOString();
      } else {
        // Use index-based fallback timestamp to maintain order
        timestamp = new Date(Date.now() - (sortedMessages.length - i) * 1000).toISOString();
      }

      // Update model if specified in message
      if (msg.model) {
        currentModel = msg.model;
      }

      // Parse based on role
      switch (msg.role) {
        case 'user':
          result.push({
            type: 'user',
            timestamp,
            content: msg.content || '',
            model: currentModel,
          });
          break;

        case 'assistant':
          // Check for Gongfeng's parser.events array (new format)
          const parserEvents = (msg as any).parser?.events;
          if (parserEvents && Array.isArray(parserEvents)) {
            const parsed = this.parseGongfengEvents(parserEvents);

            // Add tool calls first
            for (const toolCall of parsed.toolCalls) {
              result.push({
                type: 'tool_use',
                timestamp,
                tool_name: toolCall.name,
                tool_input: toolCall.input,
                content: '',
                model: currentModel,
              });

              // Add tool result if available
              if (toolCall.output) {
                result.push({
                  type: 'tool_result',
                  timestamp,
                  tool_name: toolCall.name,
                  content: toolCall.output.substring(0, 300),
                  tool_output: {
                    output: toolCall.output,
                  },
                  model: currentModel,
                });
              }
            }

            // Add assistant reasoning content if available
            if (parsed.reasoningContent.trim()) {
              result.push({
                type: 'assistant',
                timestamp,
                content: '',
                reasoning_content: parsed.reasoningContent,
                model: currentModel,
              });
            }

            // Add assistant text message if there's content
            if (parsed.textContent.trim()) {
              // If we already have an assistant message with reasoning, merge them
              const lastMsg = result[result.length - 1];
              if (lastMsg && lastMsg.type === 'assistant' && lastMsg.reasoning_content && !lastMsg.content) {
                lastMsg.content = parsed.textContent;
              } else {
                result.push({
                  type: 'assistant',
                  timestamp,
                  content: parsed.textContent,
                  model: currentModel,
                });
              }
            }
          } else if (msg.content && msg.content.includes('"type":"')) {
            // Legacy: Check if content is in Gongfeng's JSON Lines format
            const parsed = this.parseGongfengContent(msg.content);

            // Add tool calls first
            for (const toolCall of parsed.toolCalls) {
              result.push({
                type: 'tool_use',
                timestamp,
                tool_name: toolCall.name,
                tool_input: toolCall.input,
                content: '',
                model: currentModel,
              });

              // Add tool result if available
              if (toolCall.output) {
                result.push({
                  type: 'tool_result',
                  timestamp,
                  tool_name: toolCall.name,
                  content: toolCall.output.substring(0, 300),
                  tool_output: {
                    output: toolCall.output,
                  },
                  model: currentModel,
                });
              }
            }

            // Add assistant text message if there's content
            if (parsed.textContent.trim()) {
              result.push({
                type: 'assistant',
                timestamp,
                content: parsed.textContent,
                model: currentModel,
              });
            }
          } else if (msg.tool_calls && msg.tool_calls.length > 0) {
            // Standard tool calls format
            const toolCall = msg.tool_calls[0];
            result.push({
              type: 'tool_use',
              timestamp,
              tool_name: toolCall.name || 'tool',
              tool_input: toolCall.arguments ? (() => {
                try {
                  return JSON.parse(toolCall.arguments);
                } catch {
                  return { args: toolCall.arguments };
                }
              })() : {},
              content: msg.content || '',
              model: currentModel,
            });
          } else {
            // Regular assistant message
            result.push({
              type: 'assistant',
              timestamp,
              content: msg.content || '',
              model: currentModel,
            });
          }
          break;

        case 'system':
          result.push({
            type: 'system',
            timestamp,
            content: msg.content || '',
            model: currentModel,
          });
          break;

        case 'tool':
          // Tool result message
          result.push({
            type: 'tool_result',
            timestamp,
            tool_name: msg.name || 'tool',
            content: (msg.content || '').substring(0, 300),
            tool_output: {
              output: msg.content || '',
            },
            model: currentModel,
          });
          break;

        default:
          // Handle unknown role - treat as assistant if it has content
          if (msg.content) {
            result.push({
              type: 'assistant',
              timestamp,
              content: msg.content,
              model: currentModel,
            });
          }
          break;
      }
    }

    return result;
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

export const vscodeExtensionSessionService = new VSCodeExtensionSessionService();
