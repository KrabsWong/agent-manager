/**
 * Virtual Session List Component
 *
 * Uses virtual scrolling to efficiently render large lists of sessions
 * Only renders visible items + small buffer for smooth scrolling
 */

import { useRef, useMemo, useContext, createContext, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ChevronDown, ChevronRight, ChevronsDown, ChevronsUp, Folder } from 'lucide-react';
import { MarqueeText } from '@/components/MarqueeText';
import type { Session } from '@/types';

export type ViewMode = 'date' | 'directory';

// Context for collapse state (shared with parent)
const CollapseContext = createContext<{
  collapsedGroups: Set<string>;
  toggleGroup: (groupKey: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
  allExpanded: boolean;
  allCollapsed: boolean;
}>({
  collapsedGroups: new Set(),
  toggleGroup: () => {},
  expandAll: () => {},
  collapseAll: () => {},
  allExpanded: true,
  allCollapsed: false,
});

interface VirtualSessionListProps {
  sessions: Session[];
  selectedSession: Session | null;
  onSelect: (session: Session) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: (key: string, defaultValue?: string) => any;
  collapsedGroups: Set<string>;
  toggleGroup: (groupKey: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
  allExpanded: boolean;
  allCollapsed: boolean;
  viewMode: ViewMode;
}

/**
 * Group sessions by date and prepare virtual list items
 */
function useDateGroupedSessions(
  sessions: Session[],
  collapsedGroups: Set<string>,
  t: (key: string, defaultValue?: string) => string
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
      | { type: 'header'; groupKey: string; sessionsCount: number; isFirst: boolean }
      | { type: 'session'; session: Session; groupKey: string }
    > = [];

    sortedDates.forEach((dateKey, index) => {
      const sessionsCount = groups.get(dateKey)!.length;

      // Add header
      items.push({
        type: 'header',
        groupKey: dateKey,
        sessionsCount,
        isFirst: index === 0,
      });

      // Add sessions if not collapsed
      if (!collapsedGroups.has(dateKey)) {
        const dateSessions = groups.get(dateKey)!;
        dateSessions.forEach((session) => {
          items.push({
            type: 'session',
            session,
            groupKey: dateKey,
          });
        });
      }
    });

    return { items, groups, sortedGroupKeys: sortedDates };
  }, [sessions, collapsedGroups, t]);
}

/**
 * Group sessions by directory and prepare virtual list items
 * Sessions within each directory are sorted by updatedAt descending
 */
function useDirectoryGroupedSessions(
  sessions: Session[],
  collapsedGroups: Set<string>,
  t: (key: string, defaultValue?: string) => string
) {
  return useMemo(() => {
    // Group sessions by directory
    const groups = new Map<string, Session[]>();

    for (const session of sessions) {
      // Extract directory from filePath or use directory field
      let dir = session.directory || '';
      if (!dir && session.filePath) {
        // Extract directory from file path
        const lastSlashIndex = session.filePath.lastIndexOf('/');
        if (lastSlashIndex > 0) {
          dir = session.filePath.substring(0, lastSlashIndex);
        } else {
          dir = '/';
        }
      }
      // Use special marker for sessions without directory info
      const dirKey = dir || t('sessions.noDirectoryGroup', '— No Directory —');

      if (!groups.has(dirKey)) {
        groups.set(dirKey, []);
      }
      groups.get(dirKey)!.push(session);
    }

    // Sort sessions within each group by updatedAt descending
    for (const [, groupSessions] of groups) {
      groupSessions.sort((a, b) => b.updatedAt - a.updatedAt);
    }

    // Sort directories by their most recent session's updatedAt descending
    const sortedDirs = Array.from(groups.keys()).sort((a, b) => {
      const sessionsA = groups.get(a)!;
      const sessionsB = groups.get(b)!;
      const latestA = sessionsA[0]?.updatedAt || 0;
      const latestB = sessionsB[0]?.updatedAt || 0;
      return latestB - latestA;
    });

    // Build virtual list items
    const items: Array<
      | { type: 'header'; groupKey: string; sessionsCount: number; isFirst: boolean }
      | { type: 'session'; session: Session; groupKey: string }
    > = [];

    sortedDirs.forEach((dirKey, index) => {
      const sessionsCount = groups.get(dirKey)!.length;

      // Add header
      items.push({
        type: 'header',
        groupKey: dirKey,
        sessionsCount,
        isFirst: index === 0,
      });

      // Add sessions if not collapsed
      if (!collapsedGroups.has(dirKey)) {
        const dirSessions = groups.get(dirKey)!;
        dirSessions.forEach((session) => {
          items.push({
            type: 'session',
            session,
            groupKey: dirKey,
          });
        });
      }
    });

    return { items, groups, sortedGroupKeys: sortedDirs };
  }, [sessions, collapsedGroups, t]);
}

/**
 * Format date group label (Today, Yesterday, or date)
 */
function formatDateGroupLabel(
  dateKey: string,
  t: (key: string, defaultValue?: string) => string
): string {
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
    return t('sessions.today', 'Today');
  }
  if (dateKey === yesterday) {
    return t('sessions.yesterday', 'Yesterday');
  }

  return dateKey;
}

/**
 * Get the last directory name from path
 */
function getLastDirectoryName(dirKey: string): string {
  const parts = dirKey.split('/').filter((p) => p.length > 0);
  return parts.length > 0 ? parts[parts.length - 1] : dirKey;
}

/**
 * Format parent path for display on the right side
 * - More than 2 levels: "../aa/bb..."
 * - Exactly 2 levels: "/aa/bb"
 * - Only 1 level: "aa/..."
 * - Otherwise: empty
 */
function formatParentPath(dirKey: string): string {
  const parts = dirKey.split('/').filter((p) => p.length > 0);

  // Remove the last part (current directory name)
  const parentParts = parts.slice(0, -1);

  if (parentParts.length === 0) {
    // No parent or only root
    return '';
  } else if (parentParts.length === 1) {
    // Only 1 parent level
    return `${parentParts[0]}/...`;
  } else if (parentParts.length === 2) {
    // Exactly 2 parent levels, show from root
    return '/' + parentParts.join('/');
  } else {
    // More than 2 parent levels, show last 2 with ../ prefix
    return '../' + parentParts.slice(-2).join('/') + '...';
  }
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
  t: (key: string, defaultValue?: string) => string;
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
        <span className="text-[10px] text-muted-foreground/70 font-medium">×{sessionsCount}</span>
      </button>
      {isFirst && <ExpandCollapseControls allExpanded={allExpanded} allCollapsed={allCollapsed} />}
    </div>
  );
}

/**
 * Directory Header Component
 */
interface DirectoryHeaderProps {
  dirKey: string;
  sessionsCount: number;
  isFirst: boolean;
  isCollapsed: boolean;
  onToggle: () => void;
  allExpanded: boolean;
  allCollapsed: boolean;
}

function DirectoryHeader({
  dirKey,
  sessionsCount,
  isFirst,
  isCollapsed,
  onToggle,
  allExpanded,
  allCollapsed,
}: DirectoryHeaderProps) {
  const lastDirName = getLastDirectoryName(dirKey);
  const parentPath = formatParentPath(dirKey);

  return (
    <div className="w-full sticky top-0 bg-card z-10 py-2 px-2 flex items-center justify-between hover:bg-accent/50 rounded-md transition-colors">
      <button onClick={onToggle} className="flex items-center gap-2 flex-1 text-left min-w-0">
        {isCollapsed ? (
          <ChevronRight className="h-4 w-4 text-foreground shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-foreground shrink-0" />
        )}
        <Folder className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        {/* Left side: last directory name */}
        <h4 className="text-sm font-semibold text-foreground shrink-0" title={dirKey}>
          {lastDirName}
        </h4>
        {/* Right side: parent path */}
        {parentPath && (
          <span className="text-xs text-muted-foreground/60 truncate" title={dirKey}>
            {parentPath}
          </span>
        )}
        <span className="text-[10px] text-muted-foreground/70 font-medium shrink-0 ml-auto">
          ×{sessionsCount}
        </span>
      </button>
      {isFirst && <ExpandCollapseControls allExpanded={allExpanded} allCollapsed={allCollapsed} />}
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
  viewMode: ViewMode;
}

function SessionCard({ session, isSelected, onClick, viewMode }: SessionCardProps) {
  // Format time (HH:MM)
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Format date + time for directory view (MM/DD HH:MM)
  const formatDateTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const dateStr = date.toLocaleDateString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
    });
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `${dateStr} ${timeStr}`;
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

        {/* Time and Count - minimal text only */}
        <div className="flex items-center shrink-0">
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
              isSelected ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
            }`}
          >
            {viewMode === 'date'
              ? `@${formatTime(session.updatedAt)}`
              : formatDateTime(session.updatedAt)}{' '}
            ×{session.messageCount}
          </span>
        </div>
      </div>
    </button>
  );
}

/**
 * Virtual Session List Component
 *
 * Renders a virtualized list of sessions grouped by date or directory
 * Only renders visible items for optimal performance with large lists
 */
export function VirtualSessionList({
  sessions,
  selectedSession,
  onSelect,
  t,
  collapsedGroups,
  toggleGroup,
  expandAll,
  collapseAll,
  allExpanded,
  allCollapsed,
  viewMode,
}: VirtualSessionListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Use appropriate grouping based on view mode
  const dateGrouped = useDateGroupedSessions(sessions, collapsedGroups, t);
  const dirGrouped = useDirectoryGroupedSessions(sessions, collapsedGroups, t);

  const { items } = viewMode === 'date' ? dateGrouped : dirGrouped;

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
      value={{ collapsedGroups, toggleGroup, expandAll, collapseAll, allExpanded, allCollapsed }}
    >
      <div className="h-full flex flex-col">
        {/* Virtual List */}
        <div
          ref={parentRef}
          className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
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
                    viewMode === 'date' ? (
                      <DateHeader
                        dateKey={item.groupKey}
                        sessionsCount={item.sessionsCount}
                        isFirst={item.isFirst}
                        isCollapsed={collapsedGroups.has(item.groupKey)}
                        onToggle={() => toggleGroup(item.groupKey)}
                        allExpanded={allExpanded}
                        allCollapsed={allCollapsed}
                        t={t}
                      />
                    ) : (
                      <DirectoryHeader
                        dirKey={item.groupKey}
                        sessionsCount={item.sessionsCount}
                        isFirst={item.isFirst}
                        isCollapsed={collapsedGroups.has(item.groupKey)}
                        onToggle={() => toggleGroup(item.groupKey)}
                        allExpanded={allExpanded}
                        allCollapsed={allCollapsed}
                      />
                    )
                  ) : (
                    <SessionCard
                      session={item.session}
                      isSelected={selectedSession?.id === item.session.id}
                      onClick={() => onSelect(item.session)}
                      viewMode={viewMode}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </CollapseContext.Provider>
  );
}

export default VirtualSessionList;
