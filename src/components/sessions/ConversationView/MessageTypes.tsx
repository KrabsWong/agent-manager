/**
 * Message Type Components
 *
 * SystemMessage, UserMessage, AssistantMessage, FileAttachment, ParsedContentBlock
 */

import { useState, useMemo, memo, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import {
  User,
  Info,
  FileText,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Terminal,
  Folder,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { useSettingsStore } from '@/stores/settings';
import { getAppIcon } from '@/components/AppIcons';
import { APP_LABELS } from '@/config/apps';
import { parseMessageContent, hasSpecialParser } from '../parsers';
import { MermaidDiagram } from './MermaidDiagram';
import { CollapsibleCodeBlock } from './CodeBlock';
import { markdownUrlTransform } from './markdown';
import { parseClaudeCodeXML, formatTimestamp, getLanguageFromPath } from './utils';
import type { AppType } from '@/types';
import type {
  SystemMessageProps,
  UserMessageProps,
  AssistantMessageProps,
  FileAttachmentProps,
  ParsedContentBlockProps,
} from './types';

// Markdown components
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

// System Message
export const SystemMessage = memo(function SystemMessage({
  content,
  timestamp,
  metadata,
  model,
}: SystemMessageProps) {
  const { t } = useTranslation();

  const detectSubtype = (): string | undefined => {
    if (metadata?.subtype) return metadata.subtype;

    if (content.match(/\[Pasted ~?\d+ lines?\]/i)) {
      return 'pasted';
    }
    if (
      content.match(/system-reminder|caveat/i) ||
      content.includes('DO NOT respond to these messages')
    ) {
      return 'caveat';
    }
    if (content.match(/local-command-stdout|command-name/i)) {
      return 'command_output';
    }
    if (content.match(/^[\w-]+\s+\S+/)) {
      return 'command';
    }
    return undefined;
  };

  const getSubtypeConfig = () => {
    const subtype = detectSubtype();

    switch (subtype) {
      case 'caveat':
        return {
          icon: <Info className="h-3.5 w-3.5 text-amber-500" />,
          label: t('sessions.caveat'),
          bgColor: 'bg-amber-50/50 dark:bg-amber-900/20',
          borderColor: 'border-amber-200 dark:border-amber-800',
          textColor: 'text-amber-700 dark:text-amber-400',
        };
      case 'pasted':
        return {
          icon: <FileText className="h-3.5 w-3.5 text-green-500" />,
          label: t('sessions.pasted'),
          bgColor: 'bg-green-50/50 dark:bg-green-900/20',
          borderColor: 'border-green-200 dark:border-green-800',
          textColor: 'text-green-700 dark:text-green-400',
        };
      case 'command':
        return {
          icon: <Terminal className="h-3.5 w-3.5 text-purple-500" />,
          label: t('sessions.command'),
          bgColor: 'bg-purple-50/50 dark:bg-purple-900/20',
          borderColor: 'border-purple-200 dark:border-purple-800',
          textColor: 'text-purple-700 dark:text-purple-400',
        };
      case 'command_output':
        return {
          icon: <Terminal className="h-3.5 w-3.5 text-gray-500" />,
          label: t('sessions.commandOutput'),
          bgColor: 'bg-gray-50/50 dark:bg-gray-900/20',
          borderColor: 'border-gray-200 dark:border-gray-800',
          textColor: 'text-gray-700 dark:text-gray-400',
        };
      default:
        return {
          icon: <Info className="h-3.5 w-3.5 text-muted-foreground" />,
          label: t('sessions.system'),
          bgColor: 'bg-primary-muted',
          borderColor: 'border-primary-border',
          textColor: 'text-muted-foreground',
        };
    }
  };

  const config = getSubtypeConfig();

  const cleanContent = content
    .replace(/\[Pasted ~?(\d+) lines?\]/gi, 'Pasted $1 lines')
    .replace(/<<?system-reminder>?>/gi, '')
    .replace(/<<?\/system-reminder>?>/gi, '')
    .replace(/<local-command-stdout>/gi, '')
    .replace(/<\/local-command-stdout>/gi, '')
    .replace(/<command-name>/gi, 'Command: ')
    .replace(/<\/command-name>/gi, '')
    .replace(/<local-command-stderr>/gi, 'Error: ')
    .replace(/<\/local-command-stderr>/gi, '')
    .trim();

  if (!cleanContent) {
    return null;
  }

  return (
    <div className={`rounded-lg border ${config.borderColor} ${config.bgColor} overflow-hidden`}>
      <div className="flex items-center gap-2 px-3 py-1.5">
        {config.icon}
        <span className={`text-xs font-medium ${config.textColor}`}>{config.label}</span>
        {model && (
          <span
            className="text-xs px-1.5 py-0.5 rounded bg-primary-muted text-primary"
            title={t('sessions.model')}
          >
            {model}
          </span>
        )}
        <span className="text-xs text-muted-foreground/60 ml-auto">
          {formatTimestamp(timestamp)}
        </span>
      </div>
      <div className={`px-3 pb-2 text-sm ${config.textColor} opacity-80`}>{cleanContent}</div>
    </div>
  );
});

// User Message
export const UserMessage = memo(function UserMessage({
  content,
  timestamp,
  appType,
  model,
}: UserMessageProps) {
  const { t } = useTranslation();
  const needsSpecialParsing = hasSpecialParser(appType);
  const parsedContents = needsSpecialParsing
    ? parseMessageContent(content, appType)
    : [{ type: 'text' as const, content }];
  const { chatLayout } = useSettingsStore();
  const isBubble = chatLayout === 'bubble';

  if (isBubble) {
    // Bubble layout: right-aligned with highlighted primary background
    return (
      <div className="flex gap-3 flex-row-reverse">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
          <User className="h-4 w-4 text-primary-foreground" />
        </div>
        <div className="flex-1 min-w-0 flex flex-col items-end">
          <div className="flex items-center gap-2 mb-1 flex-row-reverse">
            <span className="font-medium text-sm">{t('sessions.you')}</span>
            {model && (
              <span
                className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary"
                title={t('sessions.model')}
              >
                {model}
              </span>
            )}
            <span className="text-xs text-muted-foreground">{formatTimestamp(timestamp)}</span>
          </div>
          <div className="bg-primary-muted rounded-2xl rounded-tr-sm p-3 text-sm space-y-2 max-w-[85%] border border-primary/20">
            {parsedContents.map((item, index) => (
              <ParsedContentBlock key={index} item={item} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Left layout (default)
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-muted flex items-center justify-center">
        <User className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm">{t('sessions.you')}</span>
          {model && (
            <span
              className="text-xs px-1.5 py-0.5 rounded bg-primary-muted text-primary"
              title={t('sessions.model')}
            >
              {model}
            </span>
          )}
          <span className="text-xs text-muted-foreground">{formatTimestamp(timestamp)}</span>
        </div>
        <div className="bg-primary-muted rounded-lg p-3 text-sm space-y-2">
          {parsedContents.map((item, index) => (
            <ParsedContentBlock key={index} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
});

// Parsed Content Block
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
    <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:break-words [&_p]:overflow-wrap-anywhere [&_pre]:bg-[#1e1e1e] [&_pre]:p-0 [&_pre]:whitespace-pre-wrap [&_pre]:break-words [&_pre]:overflow-x-auto [&_*]:break-words [&_*]:overflow-wrap-anywhere">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={markdownComponents}
        urlTransform={markdownUrlTransform}
      >
        {item.content}
      </ReactMarkdown>
    </div>
  );
}

// File Attachment
function FileAttachment({ path, type, content }: FileAttachmentProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const fileName = path.split('/').pop() || path;

  return (
    <div className="border rounded-md overflow-hidden bg-background/50">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-primary-muted transition-colors text-left"
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

      {isExpanded && (
        <div className="border-t">
          <div className="px-3 py-2 prose prose-sm dark:prose-invert max-w-none [&_pre]:bg-[#1e1e1e] [&_pre]:p-0 [&_pre]:whitespace-pre-wrap [&_pre]:break-words [&_pre]:overflow-x-auto">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={markdownComponents}
              urlTransform={markdownUrlTransform}
            >
              {content}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}

// Claude Code XML Viewer
function ClaudeCodeXMLViewer({
  data,
}: {
  data: Array<{
    type: 'file' | 'directory' | 'text';
    path?: string;
    content?: string;
    entries?: string[];
  }>;
}) {
  const { t } = useTranslation();
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set([0]));

  const toggleExpanded = (index: number) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    setExpandedItems(new Set(data.map((_, i) => i)));
  };

  const collapseAll = () => {
    setExpandedItems(new Set());
  };

  const fileName = (path: string) => path.split('/').pop() || path;

  const getDisplayPath = (path: string): string => {
    if (!path) return '';
    const parts = path.split('/').filter(Boolean);
    if (parts.length <= 1) return '.';
    parts.pop();
    if (parts.length > 3) {
      parts.splice(0, parts.length - 3);
    }
    return parts.join('/');
  };

  return (
    <div className="space-y-3">
      {data.length > 1 && (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={expandAll}
            className="text-xs text-primary hover:text-primary-hover transition-colors"
          >
            {t('sessions.expandAll')}
          </button>
          <span className="text-muted-foreground/30">|</span>
          <button
            onClick={collapseAll}
            className="text-xs text-primary hover:text-primary-hover transition-colors"
          >
            {t('sessions.collapseAll')}
          </button>
        </div>
      )}

      {data.map((item, index) => {
        const isExpanded = expandedItems.has(index);
        const displayPath = getDisplayPath(item.path || '');

        return (
          <div
            key={index}
            className="rounded-lg border border-primary-border overflow-hidden bg-background/50"
          >
            <button
              onClick={() => toggleExpanded(index)}
              className="w-full flex items-center justify-between px-3 py-2 bg-primary-muted border-b hover:bg-primary-light transition-colors text-left"
            >
              <div className="flex items-center gap-2 min-w-0">
                {item.type === 'directory' ? (
                  <Folder className="h-4 w-4 text-blue-500 flex-shrink-0" />
                ) : (
                  <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                )}
                <span className="text-sm font-medium truncate">{fileName(item.path || '')}</span>
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  {item.type === 'directory' ? t('sessions.directory') : t('sessions.file')}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span
                  className="text-xs text-muted-foreground/70 truncate max-w-[200px]"
                  title={item.path}
                >
                  {displayPath}
                </span>
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-primary" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-primary" />
                )}
              </div>
            </button>

            {isExpanded && (
              <div className="border-t">
                {item.type === 'directory' && item.entries && (
                  <div className="px-3 py-2 text-sm">
                    <div className="text-muted-foreground text-xs mb-2">
                      ({t('sessions.itemCount', { count: item.entries.length })})
                    </div>
                    <div className="space-y-1">
                      {item.entries.map((entry, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          {entry.endsWith('/') ? (
                            <Folder className="h-3.5 w-3.5 text-blue-500" />
                          ) : (
                            <FileText className="h-3.5 w-3.5 text-primary" />
                          )}
                          <span>{entry}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {item.type === 'file' && item.content && (
                  <div className="max-h-96 overflow-auto">
                    <CollapsibleCodeBlock
                      content={item.content}
                      language={getLanguageFromPath(item.path || '')}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Assistant Message
export const AssistantMessage = memo(function AssistantMessage({
  content,
  reasoningContent,
  timestamp,
  appType = 'claude',
  model,
  hideAvatar = false,
}: AssistantMessageProps) {
  const { t } = useTranslation();
  const assistantName = APP_LABELS[appType as AppType] || APP_LABELS.claude;
  const [isReasoningExpanded, setIsReasoningExpanded] = useState(false);
  const { showThinkingContent, chatLayout } = useSettingsStore();
  const isBubble = chatLayout === 'bubble';

  const parsedXML = useMemo(
    () => (appType === 'claude' ? parseClaudeCodeXML(content) : null),
    [content, appType]
  );

  const contentSection = (
    <div className={content && reasoningContent && showThinkingContent ? 'space-y-2' : undefined}>
      {reasoningContent && showThinkingContent && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/20 overflow-hidden">
          <button
            onClick={() => setIsReasoningExpanded(!isReasoningExpanded)}
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-amber-100/50 dark:hover:bg-amber-900/30 transition-colors"
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
            <div className="px-3 pb-3 text-sm text-amber-800/80 dark:text-amber-300/80 leading-relaxed prose prose-sm dark:prose-invert max-w-none [&_p]:break-words [&_pre]:bg-[#1e1e1e] [&_pre]:p-0 [&_pre]:whitespace-pre-wrap [&_pre]:break-words [&_pre]:overflow-x-auto border-t border-amber-200/50 dark:border-amber-800/50 pt-2">
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

      <div className="text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none [&_p]:break-words [&_pre]:bg-[#1e1e1e] [&_pre]:p-0 [&_pre]:whitespace-pre-wrap [&_pre]:break-words [&_pre]:overflow-x-auto">
        {parsedXML && parsedXML.length > 0 ? (
          <ClaudeCodeXMLViewer data={parsedXML} />
        ) : (
          <>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={markdownComponents}
              urlTransform={markdownUrlTransform}
            >
              {content}
            </ReactMarkdown>
          </>
        )}
      </div>
    </div>
  );

  if (hideAvatar) {
    return contentSection;
  }

  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-muted flex items-center justify-center">
        {getAppIcon(appType as AppType, 18)}
      </div>
      <div className={cn('min-w-0', isBubble ? 'flex-1 max-w-[calc(100%-120px)]' : 'flex-1')}>
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm">{assistantName}</span>
          {model && (
            <span
              className="text-xs px-1.5 py-0.5 rounded bg-primary-muted text-primary"
              title={t('sessions.model')}
            >
              {model}
            </span>
          )}
          <span className="text-xs text-muted-foreground">{formatTimestamp(timestamp)}</span>
        </div>
        {contentSection}
      </div>
    </div>
  );
});
