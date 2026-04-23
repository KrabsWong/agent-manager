/**
 * Conversation View Component
 *
 * Renders a conversation session with support for:
 * - User messages
 * - Assistant responses
 * - Tool calls (tool_use)
 * - Tool results (tool_result)
 * - MCP calls and sub-agent calls
 */

import { useMemo, useState, useRef, useEffect, useCallback, memo } from 'react';
import { ChevronDown, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAppIcon } from '@/components/AppIcons';
import { APP_LABELS } from '@/config/apps';
import type { AppType } from '@/types';
import type { SessionMessage } from '@/types/session';
import type {
  ConversationViewProps,
  ConversationTurnProps,
  MessageTurnWithCount,
} from './types';
import { MAX_MESSAGES_PER_BATCH } from './types';
import {
  groupMessagesIntoTurnsWithCount,
  verifyMessageCount,
} from './utils';
import { SystemMessage, UserMessage, AssistantMessage } from './MessageTypes';
import { ToolCallBlock } from './ToolCallBlock';

// Conversation Turn Component
const ConversationTurn = memo(function ConversationTurn({
  turn,
  appType,
  onViewSubAgentSession,
  searchQuery = '',
}: ConversationTurnProps) {
  return (
    <div className="space-y-3">
      {/* System Messages */}
      {turn.systemMessages.length > 0 && (
        <div className="space-y-1">
          {turn.systemMessages.map((sysMsg, index) => (
            <SystemMessage
              key={index}
              content={sysMsg.content || ''}
              timestamp={sysMsg.timestamp}
              metadata={sysMsg.metadata}
              model={sysMsg.model}
              searchQuery={searchQuery}
            />
          ))}
        </div>
      )}

      {/* User Message */}
      {turn.userMessage?.content && (
        <UserMessage
          content={turn.userMessage.content}
          timestamp={turn.userMessage.timestamp}
          appType={appType}
          model={turn.userMessage.model}
          searchQuery={searchQuery}
        />
      )}

      {/* Agent Response */}
      {turn.toolCalls.length > 0 ? (
        <div className="flex gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-muted flex items-center justify-center">
            {getAppIcon(appType as AppType, 18)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm">
                {APP_LABELS[appType as AppType] || APP_LABELS.claude}
              </span>
              {turn.assistantMessage?.model && (
                <span
                  className="text-xs px-1.5 py-0.5 rounded bg-primary-muted text-primary"
                  title="AI Model"
                >
                  {turn.assistantMessage.model}
                </span>
              )}
            </div>
            <div className="space-y-2">
              {turn.toolCalls.map((toolCall, index) => (
                <ToolCallBlock
                  key={index}
                  toolUse={toolCall.toolUse}
                  toolResult={toolCall.toolResult}
                  onViewSubAgentSession={onViewSubAgentSession}
                  searchQuery={searchQuery}
                />
              ))}
            </div>
            {(turn.assistantMessage?.content || turn.assistantMessage?.reasoning_content) && (
              <div className="mt-3">
                <AssistantMessage
                  hideAvatar
                  content={turn.assistantMessage.content || ''}
                  reasoningContent={turn.assistantMessage.reasoning_content}
                  timestamp={turn.assistantMessage.timestamp}
                  appType={appType}
                  model={turn.assistantMessage.model}
                  searchQuery={searchQuery}
                />
              </div>
            )}
          </div>
        </div>
      ) : (turn.assistantMessage?.content || turn.assistantMessage?.reasoning_content) ? (
        <AssistantMessage
          content={turn.assistantMessage.content || ''}
          reasoningContent={turn.assistantMessage.reasoning_content}
          timestamp={turn.assistantMessage.timestamp}
          appType={appType}
          model={turn.assistantMessage.model}
          searchQuery={searchQuery}
        />
      ) : null}
    </div>
  );
});

// Main Conversation View Component
export function ConversationView({
  messages,
  className,
  appType = 'claude',
  onLoadAll,
  onViewSubAgentSession,
  searchQuery = '',
  onNewMessages,
  shouldLoadAll,
  onLoadAllComplete,
}: ConversationViewProps) {
  const turnsWithCount = useMemo(() => {
    const turns = groupMessagesIntoTurnsWithCount(messages, appType);
    verifyMessageCount(turns, messages, appType);
    return turns;
  }, [messages, appType]);

  const [displayedTurns, setDisplayedTurns] = useState<MessageTurnWithCount[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [remainingCount, setRemainingCount] = useState(0);

  const prevMessagesLengthRef = useRef(messages.length);
  const prevLastMessageHashRef = useRef<string>('');
  const hasLoadedAllRef = useRef(false);
  const isAtBottomRef = useRef(true);
  const shouldAutoScrollRef = useRef(false);
  const prevLastTurnHashRef = useRef<string>('');

  const getTurnHash = (turn: MessageTurnWithCount | undefined): string => {
    if (!turn) return '';
    const userContent = turn.userMessage?.content || '';
    const assistantContent = turn.assistantMessage?.content || '';
    const reasoningContent = turn.assistantMessage?.reasoning_content || '';
    const toolCount = turn.toolCalls.length;
    return `${userContent.length}:${assistantContent.length}:${reasoningContent.length}:${toolCount}`;
  };

  const getMessageHash = (msg: SessionMessage | undefined): string => {
    if (!msg) return '';
    return `${msg.type}:${msg.content || ''}:${msg.reasoning_content || ''}:${JSON.stringify(
      msg.tool_output || {}
    )}`;
  };

  const autoScrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    const container = getScrollContainer();
    if (container) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior,
      });
    }
  };

  const getScrollContainer = () => {
    return document.getElementById('conversation-scroll-container');
  };

  // Initialize displayed turns
  useEffect(() => {
    if (hasLoadedAllRef.current) {
      setDisplayedTurns(turnsWithCount);
      setHasMore(false);
      setRemainingCount(0);
      return;
    }

    let count = 0;
    let index = 0;
    const totalMessages = turnsWithCount.reduce((sum, t) => sum + t.messageCount, 0);

    if (totalMessages !== messages.length) {
      console.warn(
        `[ConversationView] Message count mismatch: turns count=${totalMessages}, messages.length=${messages.length}`
      );
    }

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
  }, [turnsWithCount, messages.length]);

  const handleLoadMore = () => {
    const currentCount = displayedTurns.reduce((sum, t) => sum + t.messageCount, 0);
    let newCount = currentCount;
    let newIndex = displayedTurns.length;
    const totalMessages = turnsWithCount.reduce((sum, t) => sum + t.messageCount, 0);

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

  const handleLoadAll = useCallback(() => {
    hasLoadedAllRef.current = true;
    setDisplayedTurns(turnsWithCount);
    setHasMore(false);
    setRemainingCount(0);
    onLoadAll?.();
  }, [turnsWithCount, onLoadAll]);

  // Handle external load all request
  useEffect(() => {
    if (shouldLoadAll) {
      handleLoadAll();
      onLoadAllComplete?.();
    }
  }, [shouldLoadAll, handleLoadAll, onLoadAllComplete]);

  // Track scroll position
  useEffect(() => {
    const container = getScrollContainer();
    if (!container) return;

    const handleScroll = () => {
      const { scrollHeight, scrollTop, clientHeight } = container;
      const scrollBottom = Math.ceil(scrollTop + clientHeight);
      isAtBottomRef.current = scrollHeight - scrollBottom <= 50;
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Detect new messages
  useEffect(() => {
    const currentMessagesLength = messages.length;
    const prevMessagesLength = prevMessagesLengthRef.current;
    const lastMessage = messages[messages.length - 1];
    const currentLastMessageHash = getMessageHash(lastMessage);
    const prevLastMessageHash = prevLastMessageHashRef.current;

    if (currentMessagesLength > prevMessagesLength) {
      const newCount = currentMessagesLength - prevMessagesLength;
      if (isAtBottomRef.current) {
        shouldAutoScrollRef.current = true;
      }
      if (onNewMessages) {
        onNewMessages(newCount, isAtBottomRef.current);
      }
    } else if (
      currentMessagesLength === prevMessagesLength &&
      currentMessagesLength > 0 &&
      currentLastMessageHash !== prevLastMessageHash
    ) {
      if (isAtBottomRef.current) {
        shouldAutoScrollRef.current = true;
      }
    }

    prevMessagesLengthRef.current = currentMessagesLength;
    prevLastMessageHashRef.current = currentLastMessageHash;
  }, [messages, onNewMessages]);

  // Auto-scroll when displayedTurns changes
  useEffect(() => {
    const currentTurnCount = displayedTurns.length;
    const lastTurn = displayedTurns[displayedTurns.length - 1];
    const currentLastTurnHash = getTurnHash(lastTurn);
    const prevLastTurnHash = prevLastTurnHashRef.current;

    const hasNewTurn =
      currentTurnCount > 0 &&
      prevLastTurnHash !== '' &&
      currentTurnCount >= (displayedTurns.length > 0 ? displayedTurns.length - 1 : 0);
    const hasContentUpdate = currentLastTurnHash !== prevLastTurnHash && prevLastTurnHash !== '';

    if (isAtBottomRef.current && (hasNewTurn || hasContentUpdate)) {
      setTimeout(() => {
        autoScrollToBottom('smooth');
      }, 50);
    }

    prevLastTurnHashRef.current = currentLastTurnHash;
  }, [displayedTurns]);

  // Filter turns based on search
  const filteredTurns = useMemo(() => {
    if (!searchQuery.trim()) {
      return displayedTurns;
    }

    return displayedTurns.filter((turn) => {
      if (
        turn.userMessage?.content &&
        turn.userMessage.content.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return true;
      }

      if (
        turn.assistantMessage?.content &&
        turn.assistantMessage.content.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return true;
      }

      if (
        turn.assistantMessage?.reasoning_content &&
        turn.assistantMessage.reasoning_content.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return true;
      }

      for (const tc of turn.toolCalls) {
        const toolContent = [
          tc.toolUse?.tool_name,
          tc.toolUse?.tool_input ? JSON.stringify(tc.toolUse.tool_input) : '',
          tc.toolResult?.tool_output ? JSON.stringify(tc.toolResult.tool_output) : '',
        ].join(' ');

        if (toolContent.toLowerCase().includes(searchQuery.toLowerCase())) {
          return true;
        }
      }

      for (const sysMsg of turn.systemMessages) {
        if (sysMsg.content?.toLowerCase().includes(searchQuery.toLowerCase())) {
          return true;
        }
      }

      return false;
    });
  }, [displayedTurns, searchQuery]);

  const shouldPaginate = turnsWithCount.length > displayedTurns.length;

  return (
    <>
      <div className={cn('space-y-6 relative', className)}>
        {filteredTurns.map((turn, index) => (
          <ConversationTurn
            key={index}
            turn={turn}
            appType={appType}
            onViewSubAgentSession={onViewSubAgentSession}
            searchQuery={searchQuery}
          />
        ))}
        {/* Load more buttons at BOTTOM */}
        {shouldPaginate && hasMore && !searchQuery && (
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
        {/* End of session indicator */}
        {!hasMore && displayedTurns.length > 0 && (
          <div className="flex justify-center py-4">
            <span className="text-xs text-muted-foreground/50">— 已加载全部内容 —</span>
          </div>
        )}
      </div>
    </>
  );
}

// Export all components
export * from './types';
export * from './utils';
export { MermaidDiagram } from './MermaidDiagram';
export { CollapsibleCodeBlock } from './CodeBlock';
export { SystemMessage, UserMessage, AssistantMessage } from './MessageTypes';
export { ToolCallBlock } from './ToolCallBlock';

export default ConversationView;
