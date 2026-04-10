/**
 * Virtual Session List Component
 *
 * Uses virtual scrolling to efficiently render large lists of sessions
 * Only renders visible items + small buffer for smooth scrolling
 */

import { useRef, useMemo, useContext, createContext, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  ChevronDown,
  ChevronRight,
  Clock,
  MessageSquare,
  ChevronsDown,
  ChevronsUp,
} from 'lucide-react';
import { MarqueeText } from '@/components/MarqueeText';
import type { Session } from '@/types';

// Context for collapse state (shared with parent)
const CollapseContext = createContext<{
  collapsedDates: Set<string>;
  toggleDate: (dateKey: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
  allExpanded: boolean;
  allCollapsed: boolean;
}>({
  collapsedDates: new Set(),
  toggleDate: () => {},
  expandAll: () => {},
  collapseAll: () => {},
  allExpanded: true,
  allCollapsed: false,
});

interface VirtualSessionListProps {
  sessions: Session[];
  selectedSession: Session | null;
  onSelect: (session: Session) => void;
  t: (key: string) => string;
  collapsedDates: Set<string>;
  toggleDate: (dateKey: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
  allExpanded: boolean;
  allCollapsed: boolean;
}

/**
 * Group sessions by date and prepare virtual list items
 */
function useGroupedSessions(
  sessions: Session[],
  collapsedDates: Set<string>,
  t: (key: string) => string
) {
  return useMemo(() => {
    // Group sessions by date
    const groups = new Map<string, Session[]>();

    for (const session of sessions) {
      const date = new Date(session.updatedAt);
      const dateKey = date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });

      if (!groups.has(dateKey)) {
        groups.set(dateKey, []);
      }
      groups.get(dateKey)!.push(session);
    }

    // Sort sessions within each group by updatedAt descending
    for (const [, groupSessions] of groups) {
      groupSessions.sort((a, b) => b.updatedAt - a.updatedAt);
    }

    // Sort date keys descending
    const sortedDates = Array.from(groups.keys()).sort((a, b) => {
      const dateA = new Date(a).getTime();
      const dateB = new Date(b).getTime();
      return dateB - dateA;
    });

    // Build virtual list items
    const items: Array<
      | { type: 'header'; dateKey: string; sessionsCount: number; isFirst: boolean }
      | { type: 'session'; session: Session; dateKey: string }
    > = [];

    sortedDates.forEach((dateKey, index) => {
      const sessionsCount = groups.get(dateKey)!.length;
      const isCollapsed = collapsedDates.has(dateKey);

      // Add header
      items.push({
        type: 'header',
        dateKey,
        sessionsCount,
        isFirst: index === 0,
      });

      // Add sessions if not collapsed
      if (!isCollapsed) {
        const dateSessions = groups.get(dateKey)!;
        dateSessions.forEach((session) => {
          items.push({
            type: 'session',
            session,
            dateKey,
          });
        });
      }
    });

    return { items, groups, sortedDates };
  }, [sessions, collapsedDates, t]);
}

/**
 * Format date group label (Today, Yesterday, or date)
 */
function formatDateGroupLabel(dateKey: string, t: (key: string) => string): string {
  const today = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  if (dateKey === today) {
    return t('sessions.today') || 'Today';
  }
  if (dateKey === yesterday) {
    return t('sessions.yesterday') || 'Yesterday';
  }

  return dateKey;
}

/**
 * Expand/Collapse Controls Component
 */
interface ExpandCollapseControlsProps {
  allExpanded: boolean;
  allCollapsed: boolean;
}

function ExpandCollapseControls({ allExpanded, allCollapsed }: ExpandCollapseControlsProps) {
  const { expandAll, collapseAll } = useContext(CollapseContext);

  return (
    <div className="flex items-center gap-0.5">
      <button
        onClick={expandAll}
        disabled={allExpanded}
        className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
        title="Expand All"
      >
        <ChevronsDown className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={collapseAll}
        disabled={allCollapsed}
        className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
        title="Collapse All"
      >
        <ChevronsUp className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/**
 * Date Header Component
 */
interface DateHeaderProps {
  dateKey: string;
  sessionsCount: number;
  isFirst: boolean;
  isCollapsed: boolean;
  onToggle: () => void;
  allExpanded: boolean;
  allCollapsed: boolean;
  t: (key: string) => string;
}

function DateHeader({
  dateKey,
  sessionsCount,
  isFirst,
  isCollapsed,
  onToggle,
  allExpanded,
  allCollapsed,
  t,
}: DateHeaderProps) {
  return (
    <div className="w-full sticky top-0 bg-card z-10 py-2 px-2 flex items-center justify-between hover:bg-accent/50 rounded-md transition-colors">
      <button onClick={onToggle} className="flex items-center gap-2 flex-1 text-left">
        {isCollapsed ? (
          <ChevronRight className="h-4 w-4 text-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-foreground" />
        )}
        <h4 className="text-sm font-semibold text-foreground">
          {formatDateGroupLabel(dateKey, t)}
        </h4>
      </button>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground font-medium">{sessionsCount}</span>
        {isFirst && (
          <ExpandCollapseControls allExpanded={allExpanded} allCollapsed={allCollapsed} />
        )}
      </div>
    </div>
  );
}

/**
 * Session Card Component
 */
interface SessionCardProps {
  session: Session;
  isSelected: boolean;
  onClick: () => void;
}

function SessionCard({ session, isSelected, onClick }: SessionCardProps) {
  // Format time only (HH:MM)
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <button
      onClick={onClick}
      className={`w-full text-left py-1.5 px-2 rounded transition-all duration-150 relative group min-w-0 ${
        isSelected ? 'bg-primary/15 text-primary shadow-sm' : 'hover:bg-accent/30 text-foreground'
      }`}
    >
      {/* Left indicator bar for selected state - full height */}
      {isSelected && (
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary rounded-r-full" />
      )}

      {/* Title row: Message Preview + Time/Count */}
      <div className="flex items-center justify-between gap-2 min-w-0">
        {/* Title: First Message Preview with Marquee */}
        <MarqueeText
          text={session.firstMessage || session.fileName || 'Untitled Session'}
          className={`text-xs flex-1 min-w-0 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}
        />

        {/* Time and Count - right aligned with tag style */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
              isSelected ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
            }`}
          >
            <Clock className="h-3 w-3" />
            {formatTime(session.updatedAt)}
          </span>
          <span
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
              isSelected ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
            }`}
          >
            <MessageSquare className="h-3 w-3" />
            {session.messageCount}
          </span>
        </div>
      </div>
    </button>
  );
}

/**
 * Virtual Session List Component
 *
 * Renders a virtualized list of sessions grouped by date
 * Only renders visible items for optimal performance with large lists
 */
export function VirtualSessionList({
  sessions,
  selectedSession,
  onSelect,
  t,
  collapsedDates,
  toggleDate,
  expandAll,
  collapseAll,
  allExpanded,
  allCollapsed,
}: VirtualSessionListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const { items } = useGroupedSessions(sessions, collapsedDates, t);

  // Configure virtualizer
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: useCallback(
      (index: number) => {
        const item = items[index];
        return item.type === 'header' ? 40 : 36; // Header: 40px, Session: 36px
      },
      [items]
    ),
    overscan: 5, // Render 5 extra items above/below visible area for smooth scrolling
  });

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <CollapseContext.Provider
      value={{ collapsedDates, toggleDate, expandAll, collapseAll, allExpanded, allCollapsed }}
    >
      <div
        ref={parentRef}
        className="h-full overflow-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
        style={{ contain: 'strict' }}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualItems.map((virtualItem) => {
            const item = items[virtualItem.index];

            return (
              <div
                key={virtualItem.key}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualItem.start}px)`,
                }}
                data-index={virtualItem.index}
              >
                {item.type === 'header' ? (
                  <DateHeader
                    dateKey={item.dateKey}
                    sessionsCount={item.sessionsCount}
                    isFirst={item.isFirst}
                    isCollapsed={collapsedDates.has(item.dateKey)}
                    onToggle={() => toggleDate(item.dateKey)}
                    allExpanded={allExpanded}
                    allCollapsed={allCollapsed}
                    t={t}
                  />
                ) : (
                  <SessionCard
                    session={item.session}
                    isSelected={selectedSession?.id === item.session.id}
                    onClick={() => onSelect(item.session)}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </CollapseContext.Provider>
  );
}

export default VirtualSessionList;
