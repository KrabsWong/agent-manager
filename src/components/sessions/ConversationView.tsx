/**
 * Conversation View Component
 *
 * Renders a conversation session with support for:
 * - User messages
 * - Assistant responses (implied between tool_use and tool_result)
 * - Tool calls (tool_use)
 * - Tool results (tool_result)
 * - MCP calls and sub-agent calls (identified by tool_name patterns)
 */

import { useMemo } from 'react';
import { User, Bot, Wrench, Terminal, Puzzle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SessionMessage } from '@/types/session';

interface ConversationViewProps {
  messages: SessionMessage[];
  className?: string;
}

/**
 * Group messages into conversation turns
 * Each turn contains: user message, assistant reasoning (tool_use/tool_result pairs), and final response
 */
function groupMessagesIntoTurns(messages: SessionMessage[]): MessageTurn[] {
  const turns: MessageTurn[] = [];
  let currentTurn: MessageTurn | null = null;
  let pendingToolCalls: SessionMessage[] = [];

  for (const message of messages) {
    switch (message.type) {
      case 'user':
        // Start a new turn
        if (currentTurn) {
          turns.push(currentTurn);
        }
        currentTurn = {
          userMessage: message,
          toolCalls: [],
          assistantMessage: null,
        };
        pendingToolCalls = [];
        break;

      case 'tool_use':
        // Add to current turn's tool calls
        if (currentTurn) {
          pendingToolCalls.push(message);
          currentTurn.toolCalls.push({
            toolUse: message,
            toolResult: null,
          });
        }
        break;

      case 'tool_result':
        // Match with pending tool_use
        if (currentTurn && pendingToolCalls.length > 0) {
          const pendingIndex = pendingToolCalls.findIndex(
            (tc) => tc.tool_name === message.tool_name
          );
          if (pendingIndex >= 0) {
            currentTurn.toolCalls[pendingIndex].toolResult = message;
            pendingToolCalls.splice(pendingIndex, 1);
          } else {
            // Fallback: match by position
            const firstPending = currentTurn.toolCalls.find((tc) => !tc.toolResult);
            if (firstPending) {
              firstPending.toolResult = message;
            }
          }
        }
        break;

      case 'assistant':
        // This is the assistant's final response after tool calls
        if (currentTurn) {
          currentTurn.assistantMessage = message;
          turns.push(currentTurn);
          currentTurn = null;
        }
        break;
    }
  }

  // Add any remaining turn
  if (currentTurn) {
    turns.push(currentTurn);
  }

  return turns;
}

interface MessageTurn {
  userMessage: SessionMessage | null;
  toolCalls: { toolUse: SessionMessage; toolResult: SessionMessage | null }[];
  assistantMessage: SessionMessage | null;
}

export function ConversationView({ messages, className }: ConversationViewProps) {
  const turns = useMemo(() => groupMessagesIntoTurns(messages), [messages]);

  return (
    <div className={cn('space-y-6', className)}>
      {turns.map((turn, index) => (
        <ConversationTurn key={index} turn={turn} />
      ))}
    </div>
  );
}

interface ConversationTurnProps {
  turn: MessageTurn;
}

function ConversationTurn({ turn }: ConversationTurnProps) {
  return (
    <div className="space-y-3">
      {/* User Message */}
      {turn.userMessage?.content && (
        <UserMessage content={turn.userMessage.content} timestamp={turn.userMessage.timestamp} />
      )}

      {/* Tool Calls */}
      {turn.toolCalls.length > 0 && (
        <div className="space-y-2">
          {turn.toolCalls.map((toolCall, index) => (
            <ToolCallBlock
              key={index}
              toolUse={toolCall.toolUse}
              toolResult={toolCall.toolResult}
            />
          ))}
        </div>
      )}

      {/* Assistant Response */}
      {turn.assistantMessage?.content && (
        <AssistantMessage
          content={turn.assistantMessage.content}
          timestamp={turn.assistantMessage.timestamp}
        />
      )}
    </div>
  );
}

interface UserMessageProps {
  content: string;
  timestamp: string;
}

function UserMessage({ content, timestamp }: UserMessageProps) {
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
        <User className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm">You</span>
          <span className="text-xs text-muted-foreground">{formatTimestamp(timestamp)}</span>
        </div>
        <div className="bg-primary/5 rounded-lg p-3 text-sm">
          <MessageContent content={content} />
        </div>
      </div>
    </div>
  );
}

interface AssistantMessageProps {
  content: string;
  timestamp: string;
}

function AssistantMessage({ content, timestamp }: AssistantMessageProps) {
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center">
        <Sparkles className="h-4 w-4 text-purple-500" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm">Claude</span>
          <span className="text-xs text-muted-foreground">{formatTimestamp(timestamp)}</span>
        </div>
        <div className="text-sm leading-relaxed">
          <MessageContent content={content} />
        </div>
      </div>
    </div>
  );
}

interface ToolCallBlockProps {
  toolUse: SessionMessage;
  toolResult: SessionMessage | null;
}

function ToolCallBlock({ toolUse, toolResult }: ToolCallBlockProps) {
  const toolName = toolUse.tool_name || 'unknown';
  const toolType = getToolType(toolName);

  return (
    <div className="ml-11 border rounded-lg overflow-hidden bg-muted/30">
      {/* Tool Header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border-b">
        {getToolIcon(toolType)}
        <span className="font-medium text-sm">{getToolDisplayName(toolName)}</span>
        <span className="text-xs text-muted-foreground ml-auto">{toolName}</span>
      </div>

      {/* Tool Input */}
      <div className="px-3 py-2 border-b border-dashed">
        <div className="text-xs text-muted-foreground mb-1">Input</div>
        <ToolInputDisplay input={toolUse.tool_input} />
      </div>

      {/* Tool Output */}
      {toolResult?.tool_output && (
        <div className="px-3 py-2">
          <div className="text-xs text-muted-foreground mb-1">Output</div>
          <ToolOutputDisplay output={toolResult.tool_output} />
        </div>
      )}
    </div>
  );
}

type ToolType = 'mcp' | 'filesystem' | 'search' | 'code' | 'subagent' | 'generic';

function getToolType(toolName: string): ToolType {
  const name = toolName.toLowerCase();

  // MCP tools (from skills)
  if (name.includes('skill') || name.includes('mcp')) {
    return 'mcp';
  }

  // Sub-agent calls
  if (name.includes('agent') || name.includes('spawn') || name.includes('delegate')) {
    return 'subagent';
  }

  // Filesystem operations
  if (['read', 'write', 'glob', 'grep', 'edit', 'ls', 'mkdir'].includes(name)) {
    return 'filesystem';
  }

  // Search operations
  if (['search', 'fetch', 'curl'].includes(name)) {
    return 'search';
  }

  // Code operations
  if (['bash', 'python', 'node', 'npm'].includes(name)) {
    return 'code';
  }

  return 'generic';
}

function getToolIcon(toolType: ToolType) {
  const className = 'h-4 w-4';

  switch (toolType) {
    case 'mcp':
      return <Puzzle className={cn(className, 'text-blue-500')} />;
    case 'filesystem':
      return <Terminal className={cn(className, 'text-green-500')} />;
    case 'search':
      return <Wrench className={cn(className, 'text-yellow-500')} />;
    case 'code':
      return <Terminal className={cn(className, 'text-orange-500')} />;
    case 'subagent':
      return <Bot className={cn(className, 'text-purple-500')} />;
    default:
      return <Wrench className={cn(className, 'text-gray-500')} />;
  }
}

function getToolDisplayName(toolName: string): string {
  const displayNames: Record<string, string> = {
    read: 'Read File',
    write: 'Write File',
    edit: 'Edit File',
    glob: 'Find Files',
    grep: 'Search Content',
    ls: 'List Directory',
    mkdir: 'Create Directory',
    bash: 'Execute Command',
    skill: 'MCP Skill',
  };

  return displayNames[toolName] || toolName.charAt(0).toUpperCase() + toolName.slice(1);
}

function ToolInputDisplay({ input }: { input?: Record<string, unknown> }) {
  if (!input || Object.keys(input).length === 0) {
    return <span className="text-xs text-muted-foreground">No input</span>;
  }

  // Format specific inputs nicely
  const entries = Object.entries(input);

  return (
    <div className="text-xs space-y-1">
      {entries.map(([key, value]) => (
        <div key={key} className="flex gap-2">
          <span className="text-muted-foreground font-mono flex-shrink-0">{key}:</span>
          <span className="font-mono break-all">{formatValue(value)}</span>
        </div>
      ))}
    </div>
  );
}

function ToolOutputDisplay({ output }: { output: SessionMessage['tool_output'] }) {
  if (!output) {
    return <span className="text-xs text-muted-foreground">No output</span>;
  }

  // Handle different output formats
  if (typeof output.output === 'string') {
    return (
      <pre className="text-xs font-mono bg-muted/50 rounded p-2 whitespace-pre-wrap break-all">
        {output.output}
      </pre>
    );
  }

  if (output.content && Array.isArray(output.content)) {
    const text = output.content
      .filter((item) => item.type === 'text')
      .map((item) => item.text)
      .join('\n');

    if (text) {
      return (
        <pre className="text-xs font-mono bg-muted/50 rounded p-2 whitespace-pre-wrap break-all">
          {text}
        </pre>
      );
    }
  }

  // Fallback: show JSON
  return (
    <pre className="text-xs font-mono bg-muted/50 rounded p-2 whitespace-pre-wrap break-all">
      {JSON.stringify(output, null, 2)}
    </pre>
  );
}

function formatValue(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') {
    // Truncate long strings
    if (value.length > 100) {
      return value.substring(0, 100) + '...';
    }
    return value;
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

function MessageContent({ content }: { content: string }) {
  // Simple markdown-like rendering
  const lines = content.split('\n');

  return (
    <div className="space-y-2">
      {lines.map((line, index) => {
        // Code blocks
        if (line.startsWith('```')) {
          return null; // Handle multi-line code blocks separately if needed
        }

        // Headers
        if (line.startsWith('### ')) {
          return (
            <h3 key={index} className="font-semibold text-base mt-4">
              {line.substring(4)}
            </h3>
          );
        }
        if (line.startsWith('## ')) {
          return (
            <h2 key={index} className="font-semibold text-lg mt-4">
              {line.substring(3)}
            </h2>
          );
        }
        if (line.startsWith('# ')) {
          return (
            <h1 key={index} className="font-bold text-xl mt-4">
              {line.substring(2)}
            </h1>
          );
        }

        // Lists
        if (line.match(/^\s*[-*]\s/)) {
          return (
            <li key={index} className="ml-4">
              {line.replace(/^\s*[-*]\s/, '')}
            </li>
          );
        }

        // Numbered lists
        if (line.match(/^\s*\d+\.\s/)) {
          return (
            <li key={index} className="ml-4">
              {line.replace(/^\s*\d+\.\s/, '')}
            </li>
          );
        }

        // Empty lines
        if (!line.trim()) {
          return <div key={index} className="h-2" />;
        }

        // Regular text
        return <p key={index}>{line}</p>;
      })}
    </div>
  );
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
