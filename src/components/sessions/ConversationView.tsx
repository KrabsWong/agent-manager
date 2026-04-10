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

import { useMemo, useState, memo, useRef, useEffect } from 'react';
import {
  User,
  Wrench,
  Terminal,
  Puzzle,
  Bot,
  FileText,
  ChevronDown,
  ChevronRight,
  Maximize2,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import type { CSSProperties } from 'react';

// Tokyo Night 主题配色
const tokyoNightTheme: { [key: string]: CSSProperties } = {
  'code[class*="language-"]': {
    color: '#a9b1d6',
    background: 'transparent',
    fontFamily:
      "'JetBrains Mono', 'Fira Code', Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace",
    fontSize: '0.875rem',
    textAlign: 'left',
    whiteSpace: 'pre',
    wordSpacing: 'normal',
    wordBreak: 'normal',
    wordWrap: 'normal',
    lineHeight: '1.5',
    tabSize: 2,
  },
  'pre[class*="language-"]': {
    color: '#a9b1d6',
    background: '#1a1b26',
    fontFamily:
      "'JetBrains Mono', 'Fira Code', Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace",
    fontSize: '0.875rem',
    textAlign: 'left',
    whiteSpace: 'pre',
    wordSpacing: 'normal',
    wordBreak: 'normal',
    wordWrap: 'normal',
    lineHeight: '1.5',
    tabSize: 2,
    padding: '1rem',
    margin: 0,
    overflow: 'auto',
    borderRadius: '0.375rem',
  },
  comment: { color: '#565f89', fontStyle: 'italic' },
  prolog: { color: '#565f89' },
  doctype: { color: '#565f89' },
  cdata: { color: '#565f89' },
  punctuation: { color: '#7aa2f7' },
  property: { color: '#73daca' },
  tag: { color: '#f7768e' },
  boolean: { color: '#ff9e64' },
  number: { color: '#ff9e64' },
  constant: { color: '#ff9e64' },
  symbol: { color: '#ff9e64' },
  deleted: { color: '#f7768e' },
  selector: { color: '#9ece6a' },
  'attr-name': { color: '#e0af68' },
  string: { color: '#9ece6a' },
  char: { color: '#9ece6a' },
  builtin: { color: '#bb9af7' },
  inserted: { color: '#9ece6a' },
  operator: { color: '#bb9af7' },
  entity: { color: '#7aa2f7', cursor: 'help' },
  url: { color: '#73daca' },
  variable: { color: '#f7768e' },
  atrule: { color: '#e0af68' },
  'attr-value': { color: '#9ece6a' },
  function: { color: '#7aa2f7' },
  'class-name': { color: '#e0af68' },
  keyword: { color: '#bb9af7' },
  regex: { color: '#e0af68' },
  important: { color: '#f7768e', fontWeight: 'bold' },
  bold: { fontWeight: 'bold' },
  italic: { fontStyle: 'italic' },
};
import { getAppIcon, APP_LABELS } from '@/components/AppIcons';
import { cn } from '@/lib/utils';
import { parseMessageContent, hasSpecialParser, type ParsedContent } from './parsers';
import type { AppType } from '@/types';
import type { SessionMessage } from '@/types/session';

// Constants for performance optimization
const MAX_CODE_LINES = 100; // 代码块超过此行数默认折叠
const CODE_LINES_INCREMENT = 200; // 每次展开增加的代码行数
const MAX_SYNTAX_HIGHLIGHT_LINES = 500; // 超过此行数禁用语法高亮，避免卡顿
const MAX_TEXT_LENGTH = 8000; // 文本超过此字符数默认截断

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

    // Use collapsible code block for large code
    return <CollapsibleCodeBlock content={content} language={language} />;
  },
};

/**
 * Collapsible Code Block - Performance optimization for large code blocks
 * Uses incremental loading to avoid UI freezing on large files
 */
interface CollapsibleCodeBlockProps {
  content: string;
  language: string;
}

function CollapsibleCodeBlock({ content, language }: CollapsibleCodeBlockProps) {
  const [displayedLines, setDisplayedLines] = useState(MAX_CODE_LINES);
  const codeBlockRef = useRef<HTMLDivElement>(null);
  const prevDisplayedLinesRef = useRef(displayedLines);
  const lines = content.split('\n');
  const totalLines = lines.length;
  const shouldCollapse = totalLines > MAX_CODE_LINES;
  const isFullyExpanded = displayedLines >= totalLines;
  const shouldHighlight = totalLines <= MAX_SYNTAX_HIGHLIGHT_LINES;

  // Calculate current display lines
  const currentDisplayLines = shouldCollapse ? Math.min(displayedLines, totalLines) : totalLines;
  const displayContent = lines.slice(0, currentDisplayLines).join('\n').replace(/\n$/, '');

  // Auto-scroll to bottom when loading more content
  useEffect(() => {
    if (
      codeBlockRef.current &&
      displayedLines > prevDisplayedLinesRef.current &&
      displayedLines > MAX_CODE_LINES
    ) {
      const element = codeBlockRef.current;
      element.scrollTop = element.scrollHeight;
    }
    prevDisplayedLinesRef.current = displayedLines;
  }, [displayedLines]);

  const handleCollapse = () => {
    setDisplayedLines(MAX_CODE_LINES);
    // Scroll back to top when collapsing
    if (codeBlockRef.current) {
      codeBlockRef.current.scrollTop = 0;
    }
  };

  // Determine if we should use incremental loading (only for highlighted code)
  const useIncrementalLoad = shouldHighlight;

  const handleExpand = () => {
    if (useIncrementalLoad) {
      // For highlighted code: load incrementally to avoid freezing
      setDisplayedLines((prev) => Math.min(prev + CODE_LINES_INCREMENT, totalLines));
    } else {
      // For non-highlighted large code: load all at once (it's fast without highlighting)
      setDisplayedLines(totalLines);
    }
  };

  return (
    <div className="relative">
      {!shouldHighlight && (
        <div className="absolute top-0 right-0 z-10 px-2 py-1 text-[10px] text-muted-foreground bg-[#1a1b26]/80 rounded-bl">
          已禁用高亮 ({totalLines} 行)
        </div>
      )}
      <div ref={codeBlockRef} className="overflow-auto max-h-[600px] rounded-md">
        {shouldHighlight ? (
          <SyntaxHighlighter
            language={language}
            style={tokyoNightTheme}
            className="rounded-md text-sm !m-0"
          >
            {displayContent}
          </SyntaxHighlighter>
        ) : (
          <pre className="rounded-md text-sm bg-[#1a1b26] text-[#a9b1d6] p-4 overflow-auto font-mono leading-relaxed">
            <code>{displayContent}</code>
          </pre>
        )}
      </div>
      {shouldCollapse && (
        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center py-2 bg-gradient-to-t from-[#1a1b26] to-transparent">
          <button
            onClick={isFullyExpanded ? handleCollapse : handleExpand}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/80 hover:bg-muted text-xs font-medium text-muted-foreground hover:text-foreground transition-colors border border-border/50 shadow-sm"
          >
            {isFullyExpanded ? (
              <>
                <ChevronDown className="h-3.5 w-3.5" />
                收起代码
              </>
            ) : useIncrementalLoad ? (
              <>
                <Maximize2 className="h-3.5 w-3.5" />
                加载更多 ({currentDisplayLines}/{totalLines} 行)
              </>
            ) : (
              <>
                <Maximize2 className="h-3.5 w-3.5" />
                展开全部 ({totalLines} 行)
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Group messages into turns and count messages per turn
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

// Constants for message pagination
const MAX_MESSAGES_PER_BATCH = 100; // 每次加载的最大原始消息条数

interface MessageTurnWithCount extends MessageTurn {
  messageCount: number; // 这轮对话包含的原始消息数量
}

/**
 * Group messages into turns and count messages per turn
 */
function groupMessagesIntoTurnsWithCount(messages: SessionMessage[]): MessageTurnWithCount[] {
  const turns = groupMessagesIntoTurns(messages);
  return turns.map((turn) => {
    let messageCount = 0;
    if (turn.userMessage) messageCount++;
    messageCount += turn.toolCalls.length * 2; // tool_use + tool_result
    if (turn.assistantMessage) messageCount++;
    return { ...turn, messageCount };
  });
}

interface ConversationViewProps {
  messages: SessionMessage[];
  className?: string;
  appType?: string;
  onLoadAll?: () => void;
}

export function ConversationView({
  messages,
  className,
  appType = 'claude',
  onLoadAll,
}: ConversationViewProps) {
  const turnsWithCount = useMemo(() => groupMessagesIntoTurnsWithCount(messages), [messages]);
  const [displayedTurns, setDisplayedTurns] = useState<MessageTurnWithCount[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [remainingCount, setRemainingCount] = useState(0);

  // Initialize displayed turns based on message count limit
  useEffect(() => {
    let count = 0;
    let index = 0;
    const totalMessages = turnsWithCount.reduce((sum, t) => sum + t.messageCount, 0);

    // Find how many turns we can display within the limit
    for (const turn of turnsWithCount) {
      if (count + turn.messageCount > MAX_MESSAGES_PER_BATCH && index > 0) {
        break;
      }
      count += turn.messageCount;
      index++;
    }

    setDisplayedTurns(turnsWithCount.slice(0, index));
    setHasMore(index < turnsWithCount.length);
    setRemainingCount(totalMessages - count);
  }, [turnsWithCount]);

  const handleLoadMore = () => {
    const currentCount = displayedTurns.reduce((sum, t) => sum + t.messageCount, 0);
    let newCount = currentCount;
    let newIndex = displayedTurns.length;
    const totalMessages = turnsWithCount.reduce((sum, t) => sum + t.messageCount, 0);

    // Add more turns until we hit the limit again
    for (let i = displayedTurns.length; i < turnsWithCount.length; i++) {
      const turn = turnsWithCount[i];
      if (
        newCount + turn.messageCount > currentCount + MAX_MESSAGES_PER_BATCH &&
        newIndex > displayedTurns.length
      ) {
        break;
      }
      newCount += turn.messageCount;
      newIndex++;
    }

    const newDisplayed = turnsWithCount.slice(0, newIndex);
    setDisplayedTurns(newDisplayed);
    setHasMore(newIndex < turnsWithCount.length);
    setRemainingCount(totalMessages - newCount);
  };

  const handleLoadAll = () => {
    setDisplayedTurns(turnsWithCount);
    setHasMore(false);
    setRemainingCount(0);
    onLoadAll?.();
  };

  const shouldPaginate = turnsWithCount.length > displayedTurns.length;

  return (
    <div className={cn('space-y-6', className)}>
      {displayedTurns.map((turn, index) => (
        <ConversationTurn key={index} turn={turn} appType={appType} />
      ))}
      {/* Load more buttons at BOTTOM */}
      {shouldPaginate && hasMore && (
        <div className="flex justify-center items-center gap-4 py-3">
          <button
            onClick={handleLoadMore}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronDown className="h-3.5 w-3.5" />
            加载更多 ({remainingCount} 条)
          </button>
          <span className="text-border">|</span>
          <button
            onClick={handleLoadAll}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            加载全部
          </button>
        </div>
      )}
    </div>
  );
}

interface ConversationTurnProps {
  turn: MessageTurn;
  appType: string;
}

const ConversationTurn = memo(function ConversationTurn({ turn, appType }: ConversationTurnProps) {
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
});

interface UserMessageProps {
  content: string;
  timestamp: string;
  appType?: string;
}

const UserMessage = memo(function UserMessage({ content, timestamp, appType }: UserMessageProps) {
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
});

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

const AssistantMessage = memo(function AssistantMessage({
  content,
  timestamp,
  appType = 'claude',
}: AssistantMessageProps) {
  const assistantName = APP_LABELS[appType as AppType] || APP_LABELS.claude;
  const [isExpanded, setIsExpanded] = useState(false);
  const shouldTruncate = content.length > MAX_TEXT_LENGTH;
  const displayContent =
    isExpanded || !shouldTruncate ? content : content.slice(0, MAX_TEXT_LENGTH) + '\n\n...';

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
            {displayContent}
          </ReactMarkdown>
          {shouldTruncate && !isExpanded && (
            <button
              onClick={() => setIsExpanded(true)}
              className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-muted hover:bg-muted/80 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors border border-border/50"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              展开全部 ({(content.length / 1000).toFixed(1)}K 字符)
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

interface ToolCallBlockProps {
  toolUse: SessionMessage;
  toolResult: SessionMessage | null;
}

function ToolCallBlock({ toolUse, toolResult }: ToolCallBlockProps) {
  const toolName = toolUse.tool_name || 'unknown';
  const toolType = getToolType(toolName);
  const summary = getToolSummary(toolName, toolUse.tool_input);

  return (
    <div className="border rounded-lg overflow-hidden bg-muted/30">
      {/* Tool Header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border-b">
        {getToolIcon(toolType)}
        <span className="font-medium text-sm">{getToolDisplayName(toolName)}</span>
        {summary && (
          <span
            className="text-xs text-muted-foreground ml-auto truncate max-w-[200px]"
            title={summary}
          >
            {summary}
          </span>
        )}
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

/**
 * Get a summary of the tool input for display in the header
 * E.g., file path for read/write, command for bash, pattern for grep
 */
function getToolSummary(toolName: string, input?: Record<string, unknown>): string | null {
  if (!input) return null;

  const name = toolName.toLowerCase();

  // File operations - show file path
  if (['read', 'write', 'edit'].includes(name)) {
    const filePath = input.file_path || input.path;
    if (typeof filePath === 'string') {
      // Extract just the filename from the path
      const parts = filePath.split('/');
      return parts[parts.length - 1] || filePath;
    }
  }

  // Glob - show pattern
  if (name === 'glob') {
    const pattern = input.pattern || input.glob;
    if (typeof pattern === 'string') {
      return pattern;
    }
  }

  // Grep - show pattern and path
  if (name === 'grep') {
    const pattern = input.pattern || input.regex;
    const path = input.path || input.file_path;
    if (typeof pattern === 'string') {
      const pathSuffix = typeof path === 'string' ? ` in ${path.split('/').pop()}` : '';
      return `"${pattern}"${pathSuffix}`;
    }
  }

  // Bash - show command preview
  if (name === 'bash') {
    const command = input.command;
    if (typeof command === 'string') {
      // Truncate long commands
      if (command.length > 50) {
        return command.substring(0, 50) + '...';
      }
      return command;
    }
  }

  // LS - show directory
  if (name === 'ls') {
    const dir = input.dir || input.directory || input.path;
    if (typeof dir === 'string') {
      const parts = dir.split('/');
      return parts[parts.length - 1] || dir;
    }
  }

  return null;
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
