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

import { useMemo, useState } from 'react';
import {
  User,
  Wrench,
  Terminal,
  Puzzle,
  Bot,
  FileText,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { getAppIcon } from '@/components/AppIcons';
import { cn } from '@/lib/utils';
import { parseMessageContent, hasSpecialParser, type ParsedContent } from './parsers';
import type { AppType } from '@/types';
import type { SessionMessage } from '@/types/session';

// Custom components for ReactMarkdown to handle code blocks with syntax highlighting
const markdownComponents = {
  code({ node, inline, className, children, ...props }: any) {
    const match = /language-(\w+)/.exec(className || '');
    const language = match ? match[1] : 'text';
    const content = String(children);

    // Treat as inline code if:
    // 1. inline prop is true, OR
    // 2. content has no newlines (single line code should be inline)
    if (inline || !content.includes('\n')) {
      return (
        <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
          {children}
        </code>
      );
    }

    return (
      <SyntaxHighlighter
        language={language}
        style={vscDarkPlus}
        className="rounded-md text-sm !bg-[#1e1e1e]"
        customStyle={{
          margin: 0,
          padding: '1rem',
          fontSize: '0.875rem',
        }}
      >
        {content.replace(/\n$/, '')}
      </SyntaxHighlighter>
    );
  },
};

interface ConversationViewProps {
  messages: SessionMessage[];
  className?: string;
  appType?: string;
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
        if (currentTurn) {
          if (pendingToolCalls.length > 0) {
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

          // For Claude Code: every tool_result with output is an assistant response
          // We'll collect all tool_result contents as the assistant message
          if (message.tool_output) {
            const output = message.tool_output;
            let content = '';

            if (typeof output.output === 'string') {
              content = output.output;
            } else if (output.content && Array.isArray(output.content)) {
              content = output.content
                .filter((item: { type: string; text?: string }) => item.type === 'text')
                .map((item: { text?: string }) => item.text || '')
                .join('\n');
            }

            if (content) {
              // Append to existing assistant message or create new one
              if (currentTurn.assistantMessage) {
                currentTurn.assistantMessage.content += '\n\n' + content;
              } else {
                currentTurn.assistantMessage = {
                  type: 'assistant',
                  timestamp: message.timestamp,
                  content: content,
                };
              }
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

export function ConversationView({
  messages,
  className,
  appType = 'claude',
}: ConversationViewProps) {
  const turns = useMemo(() => groupMessagesIntoTurns(messages), [messages]);

  return (
    <div className={cn('space-y-6', className)}>
      {turns.map((turn, index) => (
        <ConversationTurn key={index} turn={turn} appType={appType} />
      ))}
    </div>
  );
}

interface ConversationTurnProps {
  turn: MessageTurn;
  appType: string;
}

function ConversationTurn({ turn, appType }: ConversationTurnProps) {
  return (
    <div className="space-y-3">
      {/* User Message */}
      {turn.userMessage?.content && (
        <UserMessage
          content={turn.userMessage.content}
          timestamp={turn.userMessage.timestamp}
          appType={appType}
        />
      )}

      {/* Tool Calls */}
      {turn.toolCalls.length > 0 && (
        <div className="space-y-2 ml-11">
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
          appType={appType}
        />
      )}
    </div>
  );
}

interface UserMessageProps {
  content: string;
  timestamp: string;
  appType?: string;
}

function UserMessage({ content, timestamp, appType }: UserMessageProps) {
  // 检查是否需要特殊解析
  const needsSpecialParsing = hasSpecialParser(appType);
  const parsedContents = needsSpecialParsing
    ? parseMessageContent(content, appType)
    : [{ type: 'text' as const, content }];

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
        <div className="bg-primary/5 rounded-lg p-3 text-sm space-y-2">
          {parsedContents.map((item, index) => (
            <ParsedContentBlock key={index} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}

interface ParsedContentBlockProps {
  item: ParsedContent;
}

function ParsedContentBlock({ item }: ParsedContentBlockProps) {
  if (item.type === 'file') {
    return (
      <FileAttachment
        path={item.metadata?.path || ''}
        type={item.metadata?.type || ''}
        content={item.content}
      />
    );
  }

  return (
    <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:break-words [&_pre]:bg-[#1e1e1e] [&_pre]:p-0 [&_pre]:whitespace-pre-wrap [&_pre]:break-words [&_pre]:overflow-x-auto">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {item.content}
      </ReactMarkdown>
    </div>
  );
}

interface FileAttachmentProps {
  path: string;
  type: string;
  content: string;
}

function FileAttachment({ path, type, content }: FileAttachmentProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const fileName = path.split('/').pop() || path;

  return (
    <div className="border rounded-md overflow-hidden bg-background/50">
      {/* File Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/50 transition-colors text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="h-4 w-4 text-primary flex-shrink-0" />
          <span className="text-sm font-medium truncate">{fileName}</span>
          <span className="text-xs text-muted-foreground flex-shrink-0">({type})</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-muted-foreground">{path}</span>
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* File Content */}
      {isExpanded && (
        <div className="border-t">
          <div className="px-3 py-2 prose prose-sm dark:prose-invert max-w-none [&_pre]:bg-[#1e1e1e] [&_pre]:p-0 [&_pre]:whitespace-pre-wrap [&_pre]:break-words [&_pre]:overflow-x-auto">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {content}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}

interface AssistantMessageProps {
  content: string;
  timestamp: string;
  appType?: string;
}

function AssistantMessage({ content, timestamp, appType = 'claude' }: AssistantMessageProps) {
  const assistantName =
    appType === 'opencode'
      ? 'OpenCode'
      : appType === 'gemini'
        ? 'Gemini'
        : appType === 'codex'
          ? 'Codex'
          : appType === 'openclaw'
            ? 'OpenClaw'
            : 'Claude';

  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
        {getAppIcon(appType as AppType, 18)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm">{assistantName}</span>
          <span className="text-xs text-muted-foreground">{formatTimestamp(timestamp)}</span>
        </div>
        <div className="text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none [&_p]:break-words [&_pre]:bg-[#1e1e1e] [&_pre]:p-0 [&_pre]:whitespace-pre-wrap [&_pre]:break-words [&_pre]:overflow-x-auto">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {content}
          </ReactMarkdown>
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
    <div className="border rounded-lg overflow-hidden bg-muted/30">
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

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
