import { useState } from 'react';
import { Bot, ExternalLink, ChevronUp, Maximize2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { SessionMessage } from '@/types/session';

interface SubAgentCardProps {
  toolUse: SessionMessage | null;
  toolResult: SessionMessage | null;
  onViewSession?: (sessionId: string, appType: string) => void;
  className?: string;
}

const MAX_OUTPUT_LINES = 20; // 输出超过此行数默认折叠

export function SubAgentCard({ toolUse, toolResult, onViewSession, className }: SubAgentCardProps) {
  const { t } = useTranslation();
  const [isOutputExpanded, setIsOutputExpanded] = useState(false);

  const toolName = toolUse?.tool_name || toolResult?.tool_name || 'Agent';
  const toolInput = toolUse?.tool_input || {};
  const childSessionId = toolResult?.metadata?.childSessionId;
  const childSessionAppType = toolResult?.metadata?.childSessionAppType || 'codebuddy';

  // Extract description, subagent type and model from tool input
  const description =
    (toolInput.description as string) ||
    (toolInput.task as string) ||
    (toolInput.prompt as string) ||
    t('sessions.subAgentDefaultDesc', 'Sub-agent task');
  const subAgentType = (toolInput.subagent_type as string) || (toolInput.type as string);
  // Try to get model from tool input or tool result metadata
  // Filter out "default" as it's not a real model name
  const rawModel =
    (toolInput.model as string) || (toolResult?.metadata?.model as string) || toolResult?.model;
  const subAgentModel: string | undefined =
    rawModel && rawModel !== 'default' ? rawModel : undefined;

  // Determine status based on whether we have a result
  const hasResult = !!toolResult;
  const status = hasResult ? 'completed' : 'running';

  // Extract output content
  const outputContent = toolResult?.tool_output?.output || '';
  const outputLines = outputContent.split('\n');
  const totalOutputLines = outputLines.length;
  const shouldCollapseOutput = totalOutputLines > MAX_OUTPUT_LINES;
  const displayOutput =
    shouldCollapseOutput && !isOutputExpanded
      ? outputLines.slice(0, MAX_OUTPUT_LINES).join('\n') + '\n\n...'
      : outputContent;

  return (
    <div
      className={cn(
        'border rounded-lg overflow-hidden bg-gradient-to-br from-purple-50/50 to-blue-50/50 dark:from-purple-900/20 dark:to-blue-900/20',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-purple-100/50 dark:bg-purple-900/30 border-b border-purple-200 dark:border-purple-800">
        <Bot className="h-4 w-4 text-purple-600 dark:text-purple-400" />
        <span className="font-medium text-sm text-purple-700 dark:text-purple-300">
          {t('sessions.subAgent', 'Sub Agent')}
        </span>
        {subAgentType && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-purple-200 dark:bg-purple-800 text-purple-700 dark:text-purple-300">
            {subAgentType}
          </span>
        )}
        {subAgentModel && (
          <span
            className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 ml-1"
            title="AI Model"
          >
            {subAgentModel}
          </span>
        )}
        <span
          className={cn(
            'text-xs px-1.5 py-0.5 rounded-full ml-auto',
            status === 'completed'
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
          )}
        >
          {status === 'completed'
            ? t('sessions.completed', 'Completed')
            : t('sessions.running', 'Running')}
        </span>
      </div>

      {/* Content */}
      <div className="p-3 space-y-3">
        {/* Description */}
        <div className="text-sm text-foreground">
          <span className="text-muted-foreground text-xs uppercase tracking-wider block mb-1">
            {t('sessions.task', 'Task')}
          </span>
          <p className="line-clamp-3">{description}</p>
        </div>

        {/* Output content */}
        {hasResult && outputContent && (
          <div className="border-t border-purple-200/50 dark:border-purple-800/50 pt-3">
            <span className="text-muted-foreground text-xs uppercase tracking-wider block mb-2">
              {t('sessions.output', 'Output')}
            </span>
            <pre className="text-xs font-mono bg-muted/50 rounded p-2 whitespace-pre-wrap break-all">
              {displayOutput}
            </pre>
            {shouldCollapseOutput && (
              <button
                onClick={() => setIsOutputExpanded(!isOutputExpanded)}
                className="flex items-center gap-1.5 mt-2 text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
              >
                {isOutputExpanded ? (
                  <>
                    <ChevronUp className="h-3.5 w-3.5" />
                    {t('sessions.collapse', 'Collapse')}
                  </>
                ) : (
                  <>
                    <Maximize2 className="h-3.5 w-3.5" />
                    {t('sessions.expandAll')} ({totalOutputLines} {t('sessions.lines', 'lines')})
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* Tool name if available */}
        {toolName !== 'Agent' && (
          <div className="text-xs text-muted-foreground">
            {t('sessions.agentType', 'Agent')}: {toolName}
          </div>
        )}

        {/* View Session Button */}
        {childSessionId && onViewSession && (
          <button
            onClick={() => onViewSession(childSessionId, childSessionAppType)}
            className="w-full flex items-center justify-center gap-1.5 mt-2 px-3 py-1.5 text-xs font-medium text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/30 hover:bg-purple-200 dark:hover:bg-purple-900/50 rounded-md transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            {t('sessions.viewSubAgentSession', 'View Sub-Agent Session')}
          </button>
        )}
      </div>
    </div>
  );
}
