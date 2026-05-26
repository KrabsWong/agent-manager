/**
 * Tool Call Block Component
 *
 * 工具调用显示和交互
 */

import { useState, memo, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Sparkles,
  Wrench,
  Terminal,
  Puzzle,
  Bot,
  ListTodo,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '@/stores/settings';
import { cn } from '@/lib/utils';
import { SubAgentCard } from '../SubAgentCard';
import { MermaidDiagram } from './MermaidDiagram';
import { CollapsibleCodeBlock } from './CodeBlock';
import { markdownUrlTransform } from './markdown';
import {
  getToolType,
  getToolDisplayName,
  getToolSummary,
  formatValue,
  formatTimestamp,
  computeDiff,
} from './utils';
import type { ToolType } from './types';
import type { ToolCallBlockProps, ToolInputDisplayProps, ToolOutputDisplayProps } from './types';

// Markdown components for tool content
type MarkdownCodeProps = ComponentPropsWithoutRef<'code'> & {
  inline?: boolean;
  className?: string;
  children?: ReactNode;
};

const markdownComponents = {
  code({ inline, className, children, ...props }: MarkdownCodeProps) {
    const match = /language-(\w+)/.exec(className || '');
    const language = match ? match[1] : 'text';
    const content = String(children);

    if (inline || !content.includes('\n')) {
      return (
        <code className="bg-primary-muted px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
          {children}
        </code>
      );
    }

    if (language === 'mermaid') {
      return <MermaidDiagram content={content} />;
    }

    return <CollapsibleCodeBlock content={content} language={language} />;
  },
};

// Get tool icon
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
    case 'plan':
      return <ListTodo className={cn(className, 'text-indigo-500')} />;
    default:
      return <Wrench className={cn(className, 'text-gray-500')} />;
  }
}

// Tool Call Block
export const ToolCallBlock = memo(function ToolCallBlock({
  toolUse,
  toolResult,
  onViewSubAgentSession,
  defaultCollapsed = false,
}: ToolCallBlockProps) {
  const { t } = useTranslation();
  const { collapseBashBlocks, showThinkingContent } = useSettingsStore();

  const toolName = toolUse?.tool_name || toolResult?.tool_name || 'unknown';
  const toolType = getToolType(toolName);

  const [isReasoningExpanded, setIsReasoningExpanded] = useState(false);
  const reasoningContent = toolUse?.reasoning_content || toolResult?.reasoning_content;

  const shouldDefaultCollapse = collapseBashBlocks || defaultCollapsed;
  const [isExpanded, setIsExpanded] = useState(!shouldDefaultCollapse);

  if (toolType === 'subagent') {
    return (
      <SubAgentCard
        toolUse={toolUse}
        toolResult={toolResult}
        onViewSession={onViewSubAgentSession}
      />
    );
  }

  if (!toolUse && toolResult) {
    const summary = getToolSummary(toolName, undefined);

    return (
      <div className="border border-primary-border rounded-lg overflow-hidden bg-primary-muted">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center gap-2 px-3 py-2 bg-primary-light border-b border-primary-border text-left cursor-pointer hover:bg-primary-muted transition-colors"
        >
          {getToolIcon(toolType)}
          <span className="font-medium text-sm">{getToolDisplayName(toolName)}</span>
          {toolResult?.model && (
            <span
              className="text-xs px-1.5 py-0.5 rounded bg-primary-muted text-primary"
              title={t('sessions.model')}
            >
              {toolResult.model}
            </span>
          )}
          <span className="text-xs text-muted-foreground ml-auto">
            {formatTimestamp(toolResult.timestamp)}
          </span>
          {summary && (
            <span
              className="text-xs text-muted-foreground truncate flex-1 text-right mr-2"
              title={summary}
            >
              {summary}
            </span>
          )}
          <div className="flex-shrink-0">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
          <span
            className="text-[10px] text-amber-500/70 flex-shrink-0"
            title={t('sessions.inputNotAvailable', 'Input not available')}
          >
            ※
          </span>
        </button>

        {isExpanded && toolResult?.tool_output && (
          <div className="px-3 py-2">
            <div className="text-xs text-muted-foreground mb-1">{t('sessions.output')}</div>
            <ToolOutputDisplay output={toolResult.tool_output} />
          </div>
        )}
      </div>
    );
  }

  const summary = getToolSummary(toolName, toolUse?.tool_input);

  return (
    <div className="border border-primary-border rounded-lg overflow-hidden bg-primary-muted">
      {reasoningContent && showThinkingContent && (
        <div className="border-b border-amber-200/50 dark:border-amber-800/50 bg-amber-50/30 dark:bg-amber-900/10">
          <button
            onClick={() => setIsReasoningExpanded(!isReasoningExpanded)}
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-amber-100/50 dark:hover:bg-amber-900/20 transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
              {t('sessions.thinking')}
            </span>
            <span className="text-xs text-amber-600/70 dark:text-amber-500/70 ml-auto">
              {isReasoningExpanded ? t('sessions.collapse') : t('sessions.expand')}
            </span>
            {isReasoningExpanded ? (
              <ChevronDown className="h-3.5 w-3.5 text-amber-500" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-amber-500" />
            )}
          </button>
          {isReasoningExpanded && (
            <div className="px-3 pb-3 text-sm text-amber-800/80 dark:text-amber-300/80 leading-relaxed border-t border-amber-200/30 dark:border-amber-800/30 pt-2">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={markdownComponents}
                urlTransform={markdownUrlTransform}
              >
                {reasoningContent}
              </ReactMarkdown>
            </div>
          )}
        </div>
      )}

      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-primary-light border-b border-primary-border text-left cursor-pointer hover:bg-primary-muted transition-colors"
      >
        {getToolIcon(toolType)}
        <span className="font-medium text-sm">{getToolDisplayName(toolName)}</span>
        {(toolUse?.model || toolResult?.model) && (
          <span
            className="text-xs px-1.5 py-0.5 rounded bg-primary-muted text-primary"
            title={t('sessions.model')}
          >
            {toolUse?.model || toolResult?.model}
          </span>
        )}
        <span className="text-xs text-muted-foreground ml-auto">
          {formatTimestamp(toolUse?.timestamp || toolResult?.timestamp || '')}
        </span>
        {summary && (
          <span
            className="text-xs text-muted-foreground truncate flex-1 text-right mr-2"
            title={summary}
          >
            {summary}
          </span>
        )}
        <div className="flex-shrink-0">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {isExpanded && toolUse?.tool_input && (
        <div className="px-3 py-2 border-b border-dashed">
          <div className="text-xs text-muted-foreground mb-1">{t('sessions.input')}</div>
          <ToolInputDisplay input={toolUse.tool_input} toolName={toolName} />
        </div>
      )}

      {isExpanded && (toolResult?.tool_output || toolUse?.tool_output) && (
        <div className="px-3 py-2">
          <div className="text-xs text-muted-foreground mb-1">{t('sessions.output')}</div>
          <ToolOutputDisplay output={toolResult?.tool_output || toolUse?.tool_output} />
        </div>
      )}
    </div>
  );
});

// Tool Input Display
function ToolInputDisplay({ input, toolName = '' }: ToolInputDisplayProps) {
  const { t } = useTranslation();

  if (!input || Object.keys(input).length === 0) {
    return <span className="text-xs text-muted-foreground">{t('sessions.noInput')}</span>;
  }

  if (toolName.toLowerCase() === 'edit') {
    return <EditFileInputDisplay input={input} />;
  }

  const entries = Object.entries(input);

  return (
    <div className="text-xs space-y-1">
      {entries.map(([key, value]) => {
        const formattedValue = formatValue(value);
        return (
          <div key={key} className="flex gap-2">
            <span className="text-muted-foreground font-mono flex-shrink-0">{key}:</span>
            <span className="font-mono break-all whitespace-pre-wrap">{formattedValue}</span>
          </div>
        );
      })}
    </div>
  );
}

// Edit File Input Display with Diff
function EditFileInputDisplay({ input }: { input: Record<string, unknown> }) {
  const { t } = useTranslation();

  const filePath = String(input.file_path || input.path || '');
  const oldString = String(input.old_string || input.oldString || '');
  const newString = String(input.new_string || input.newString || '');

  const oldLines = oldString ? oldString.split('\n') : [];
  const newLines = newString ? newString.split('\n') : [];

  const diff = computeDiff(oldLines, newLines);

  const removedCount = diff.filter((d) => d.type === 'removed').length;
  const addedCount = diff.filter((d) => d.type === 'added').length;

  const removedText =
    removedCount === 1
      ? `-1 ${t('sessions.line', 'line')}`
      : `-${removedCount} ${t('sessions.lines', 'lines')}`;
  const addedText =
    addedCount === 1
      ? `+1 ${t('sessions.line', 'line')}`
      : `+${addedCount} ${t('sessions.lines', 'lines')}`;

  return (
    <div className="space-y-3">
      {filePath && (
        <div className="flex gap-2 text-xs">
          <span className="text-muted-foreground font-mono flex-shrink-0">file:</span>
          <span className="font-mono text-primary">{filePath}</span>
        </div>
      )}

      <div className="rounded-lg overflow-hidden border border-primary-border">
        <div className="flex items-center justify-between px-3 py-1.5 bg-primary-muted border-b border-primary-border">
          <span className="text-xs font-medium text-muted-foreground">
            {t('sessions.changes', 'Changes')}
          </span>
          <div className="flex items-center gap-3 text-[10px]">
            {removedCount > 0 && (
              <span className="flex items-center gap-1">
                <span className="font-mono text-red-500">{removedText}</span>
              </span>
            )}
            {addedCount > 0 && (
              <span className="flex items-center gap-1">
                <span className="font-mono text-green-500">{addedText}</span>
              </span>
            )}
          </div>
        </div>

        {diff.length > 0 && (
          <div className="max-h-[400px] overflow-auto">
            <div className="text-xs font-mono">
              {diff.map((item, index) => {
                if (item.type === 'unchanged') {
                  return (
                    <div key={index} className="flex hover:bg-primary-muted">
                      <span className="w-12 flex-shrink-0 text-right pr-2 py-0.5 text-[10px] text-primary/40 select-none border-r border-primary-border/30">
                        {(item.oldIndex ?? 0) + 1}
                      </span>
                      <span className="w-6 flex-shrink-0 text-center py-0.5 text-muted-foreground/30">
                        {' '}
                      </span>
                      <pre className="flex-1 px-2 py-0.5 text-muted-foreground/60 whitespace-pre-wrap break-all">
                        {item.oldLine || ' '}
                      </pre>
                    </div>
                  );
                } else if (item.type === 'removed') {
                  return (
                    <div
                      key={index}
                      className="flex bg-red-500/5 dark:bg-red-500/10 hover:bg-red-500/10"
                    >
                      <span className="w-12 flex-shrink-0 text-right pr-2 py-0.5 text-[10px] text-red-400/60 select-none border-r border-red-200/30 dark:border-red-800/30 bg-red-50/30 dark:bg-red-950/20">
                        {(item.oldIndex ?? 0) + 1}
                      </span>
                      <span className="w-6 flex-shrink-0 text-center py-0.5 text-red-500 font-bold">
                        -
                      </span>
                      <pre className="flex-1 px-2 py-0.5 text-red-700 dark:text-red-300 whitespace-pre-wrap break-all">
                        {item.oldLine || ' '}
                      </pre>
                    </div>
                  );
                } else {
                  return (
                    <div
                      key={index}
                      className="flex bg-green-500/5 dark:bg-green-500/10 hover:bg-green-500/10"
                    >
                      <span className="w-12 flex-shrink-0 text-right pr-2 py-0.5 text-[10px] text-green-400/60 select-none border-r border-green-200/30 dark:border-green-800/30 bg-green-50/30 dark:bg-green-950/20">
                        {(item.newIndex ?? 0) + 1}
                      </span>
                      <span className="w-6 flex-shrink-0 text-center py-0.5 text-green-500 font-bold">
                        +
                      </span>
                      <pre className="flex-1 px-2 py-0.5 text-green-700 dark:text-green-300 whitespace-pre-wrap break-all">
                        {item.newLine || ' '}
                      </pre>
                    </div>
                  );
                }
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Tool Output Display
function ToolOutputDisplay({ output }: ToolOutputDisplayProps) {
  const { t } = useTranslation();

  if (!output) {
    return <span className="text-xs text-muted-foreground">{t('sessions.noOutput')}</span>;
  }

  let text = '';
  if (typeof output.output === 'string') {
    text = output.output;
  } else if (output.content && Array.isArray(output.content)) {
    text = output.content
      .filter((item) => item.type === 'text')
      .map((item) => item.text)
      .join('\n');
  }

  if (!text) {
    const jsonStr = JSON.stringify(output, null, 2);
    return (
      <pre className="text-xs font-mono bg-primary-muted rounded p-2 whitespace-pre-wrap break-all">
        {jsonStr}
      </pre>
    );
  }

  return (
    <div className="relative">
      <pre className="text-xs font-mono bg-primary-muted rounded p-2 whitespace-pre-wrap break-all">
        {text}
      </pre>
    </div>
  );
}
