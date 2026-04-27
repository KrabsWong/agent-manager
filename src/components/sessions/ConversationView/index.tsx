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

import { useMemo, useRef, useEffect, memo } from 'react';
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

import {
  groupMessagesIntoTurnsWithCount,
  verifyMessageCount,
} from './utils';
import { SystemMessage, UserMessage, AssistantMessage } from './MessageTypes';
import { ToolCallBlock } from './ToolCallBlock';
import { useSettingsStore } from '@/stores/settings';

// Conversation Turn Component
const ConversationTurn = memo(function ConversationTurn({
  turn,
  appType,
  onViewSubAgentSession,
  searchQuery = '',
  userMessageIndex,
}: ConversationTurnProps & { userMessageIndex?: number }) {
  const { chatLayout } = useSettingsStore();
  const isBubble = chatLayout === 'bubble';
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
        <div id={userMessageIndex !== undefined ? `user-message-${userMessageIndex}` : undefined}>
          <UserMessage
            content={turn.userMessage.content}
            timestamp={turn.userMessage.timestamp}
            appType={appType}
            model={turn.userMessage.model}
            searchQuery={searchQuery}
          />
        </div>
      )}

      {/* Agent Response */}
      {turn.toolCalls.length > 0 ? (
        <div className="flex gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-muted flex items-center justify-center">
            {getAppIcon(appType as AppType, 18)}
          </div>
          <div className={cn("min-w-0", isBubble ? "flex-1 max-w-[calc(100%-120px)]" : "flex-1")}>
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
  onViewSubAgentSession,
  searchQuery = '',
  onNewMessages,
}: Omit<ConversationViewProps, 'onLoadAll' | 'shouldLoadAll' | 'onLoadAllComplete'>) {
  const turnsWithCount = useMemo(() => {
    const turns = groupMessagesIntoTurnsWithCount(messages, appType);
    verifyMessageCount(turns, messages, appType);
    return turns;
  }, [messages, appType]);

  const prevMessagesLengthRef = useRef(messages.length);
  const prevLastMessageHashRef = useRef<string>('');
  const isAtBottomRef = useRef(true);
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
        // Auto-scroll when new messages arrive and user is at bottom
        setTimeout(() => {
          autoScrollToBottom('smooth');
        }, 50);
      }
      if (onNewMessages) {
        onNewMessages(newCount, isAtBottomRef.current);
      }
    } else if (
      currentMessagesLength === prevMessagesLength &&
      currentMessagesLength > 0 &&
      currentLastMessageHash !== prevLastMessageHash
    ) {
      // Content update (streaming)
      if (isAtBottomRef.current) {
        setTimeout(() => {
          autoScrollToBottom('smooth');
        }, 50);
      }
    }

    prevMessagesLengthRef.current = currentMessagesLength;
    prevLastMessageHashRef.current = currentLastMessageHash;
  }, [messages, onNewMessages]);

  // Auto-scroll when turns change
  useEffect(() => {
    const currentTurnCount = turnsWithCount.length;
    const lastTurn = turnsWithCount[turnsWithCount.length - 1];
    const currentLastTurnHash = getTurnHash(lastTurn);
    const prevLastTurnHash = prevLastTurnHashRef.current;

    const hasNewTurn =
      currentTurnCount > 0 &&
      prevLastTurnHash !== '' &&
      currentTurnCount > prevLastTurnHash.split(':').length;
    const hasContentUpdate = currentLastTurnHash !== prevLastTurnHash && prevLastTurnHash !== '';

    if (isAtBottomRef.current && (hasNewTurn || hasContentUpdate)) {
      setTimeout(() => {
        autoScrollToBottom('smooth');
      }, 50);
    }

    prevLastTurnHashRef.current = currentLastTurnHash;
  }, [turnsWithCount]);

  // Filter turns based on search
  const filteredTurns = useMemo(() => {
    if (!searchQuery.trim()) {
      return turnsWithCount;
    }

    return turnsWithCount.filter((turn) => {
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
  }, [turnsWithCount, searchQuery]);

  return (
    <div className={cn('space-y-6 relative', className)}>
      {filteredTurns.map((turn, index) => (
        <ConversationTurn
          key={index}
          turn={turn}
          appType={appType}
          onViewSubAgentSession={onViewSubAgentSession}
          searchQuery={searchQuery}
          userMessageIndex={turn.userMessageOriginalIndex}
        />
      ))}
    </div>
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
