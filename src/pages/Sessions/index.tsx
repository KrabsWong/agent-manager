/**
 * Sessions Page
 *
 * View and browse local conversation sessions from AI applications
 */

import { useState, createContext, useContext, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  History,
  AlertCircle,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Play,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  useSessions,
  useSessionDetail,
  useSessionStats,
  useSessionSupportStatus,
  useResumeSession,
  useTerminalInfo,
} from '@/hooks/useSessions';
import { ConversationView } from '@/components/sessions/ConversationView';
import { APP_LABELS, getAppIcon, APP_COLORS } from '@/components/AppIcons';
import type { AppType, Session } from '@/types';

/**
 * Truncate text to a specific length with ellipsis
 */
function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text || '';
  return text.substring(0, maxLength).trim() + '...';
}

export function SessionsPage() {
  const { t } = useTranslation();
  const [selectedApp, setSelectedApp] = useState<AppType>('claude');
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [copied, setCopied] = useState(false);

  // Collapse state for session list
  const [collapsedDates, setCollapsedDates] = useState<Set<string>>(new Set());

  const { data: sessions, isLoading, error } = useSessions(selectedApp);
  const { data: stats } = useSessionStats(selectedApp);
  const { data: supportStatus } = useSessionSupportStatus(selectedApp);
  const { data: sessionDetail, isLoading: isLoadingDetail } = useSessionDetail(
    selectedSession?.id || '',
    selectedApp
  );
  const { data: terminalInfo } = useTerminalInfo();
  const resumeMutation = useResumeSession();

  // Auto-select first session when sessions are loaded
  useEffect(() => {
    if (sessions && sessions.length > 0 && !selectedSession) {
      setSelectedSession(sessions[0]);
    }
  }, [sessions, selectedSession]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const isSupported = supportStatus?.supported ?? false;

  const handleSessionSelect = (session: Session) => {
    setSelectedSession(session);
  };

  // Get all unique dates from sessions for expand/collapse all
  const allDates = sessions
    ? Array.from(
        new Set(
          sessions.map((s) => {
            const date = new Date(s.updatedAt);
            return date.toLocaleDateString('zh-CN', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
            });
          })
        )
      )
    : [];

  const toggleDate = (dateKey: string) => {
    setCollapsedDates((prev) => {
      const next = new Set(prev);
      if (next.has(dateKey)) {
        next.delete(dateKey);
      } else {
        next.add(dateKey);
      }
      return next;
    });
  };

  const expandAll = () => {
    setCollapsedDates(new Set());
  };

  const collapseAll = () => {
    setCollapsedDates(new Set(allDates));
  };

  const allExpanded = collapsedDates.size === 0;
  const allCollapsed = collapsedDates.size === allDates.length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <History className="h-6 w-6" />
              {t('sessions.title') || 'Sessions'}
            </h1>
            <span className="text-sm text-muted-foreground">
              {t('sessions.description') || 'View conversation history from your AI applications'}
            </span>
          </div>
          {/* Stats */}
          {isSupported && stats && (
            <div className="flex items-center gap-6 mt-3 text-sm">
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">
                  {t('sessions.totalSessions') || 'Total Sessions'}:
                </span>
                <span className="font-semibold text-foreground">{stats.totalSessions}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">
                  {t('sessions.totalMessages') || 'Total Messages'}:
                </span>
                <span className="font-semibold text-foreground">{stats.totalMessages}</span>
              </div>
              {stats.lastSessionDate && (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">
                    {t('sessions.lastActivity') || 'Last Activity'}:
                  </span>
                  <span className="font-semibold text-foreground">
                    {new Date(stats.lastSessionDate).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
        <Select
          value={selectedApp}
          onValueChange={(value) => {
            setSelectedApp(value as AppType);
            setSelectedSession(null);
          }}
        >
          <SelectTrigger className="w-48">
            <div className="flex items-center gap-2">
              <span className={APP_COLORS[selectedApp]}>{getAppIcon(selectedApp)}</span>
              <span>{APP_LABELS[selectedApp]}</span>
            </div>
          </SelectTrigger>
          <SelectContent className="min-w-[12rem]">
            {(['claude', 'opencode', 'codex', 'gemini', 'openclaw'] as AppType[]).map((app) => {
              const isSupported = app === 'claude' || app === 'opencode';
              return (
                <SelectItem
                  key={app}
                  value={app}
                  disabled={!isSupported}
                  className={!isSupported ? 'opacity-50 cursor-not-allowed' : ''}
                >
                  <div className="flex items-center gap-2">
                    <span className={APP_COLORS[app]}>{getAppIcon(app)}</span>
                    <span>{APP_LABELS[app]}</span>
                    {!isSupported && (
                      <span className="text-xs text-muted-foreground ml-2">
                        ({t('sessions.comingSoon')})
                      </span>
                    )}
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-[360px_1fr] gap-4 flex-1 min-h-0 mt-6">
        {/* Session List */}
        <CollapseContext.Provider
          value={{ collapsedDates, toggleDate, expandAll, collapseAll, allExpanded, allCollapsed }}
        >
          <div className="flex flex-col min-h-0 border rounded-lg bg-card overflow-hidden w-[360px]">
            {isSupported && sessions && sessions.length > 0 && (
              <ExpandCollapseControls sessions={sessions} t={t} />
            )}
            <ScrollArea className="flex-1 min-w-0">
              <div className="p-4 space-y-2 min-w-0">
                {isLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-muted-foreground">
                      {t('sessions.loading') || 'Loading sessions...'}
                    </div>
                  </div>
                ) : error ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-destructive flex items-center gap-2">
                      <AlertCircle className="h-5 w-5" />
                      {t('sessions.error') || 'Failed to load sessions'}
                    </div>
                  </div>
                ) : !isSupported ? (
                  <div className="flex flex-col items-center justify-center h-64 space-y-4">
                    <div className="text-muted-foreground text-center">
                      <p className="text-lg font-medium mb-2">
                        {t('sessions.comingSoon') || 'Coming Soon'}
                      </p>
                      <p className="text-sm">
                        {t('sessions.unsupportedApp') ||
                          `Session viewing is not yet supported for ${APP_LABELS[selectedApp]}.`}
                      </p>
                    </div>
                    <Button variant="outline" onClick={() => setSelectedApp('claude')}>
                      {t('sessions.switchToClaude') || 'Switch to Claude Code'}
                    </Button>
                  </div>
                ) : sessions?.length === 0 ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-muted-foreground text-center">
                      <p className="text-lg font-medium mb-2">
                        {t('sessions.noSessions') || 'No Sessions Found'}
                      </p>
                      <p className="text-sm">
                        {t('sessions.noSessionsDesc') ||
                          'No conversation history found for this application.'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <GroupedSessionList
                    sessions={sessions || []}
                    selectedSession={selectedSession}
                    onSelect={handleSessionSelect}
                    t={t}
                  />
                )}
              </div>
            </ScrollArea>
          </div>
        </CollapseContext.Provider>

        {/* Session Detail */}
        <div className="border rounded-lg bg-card overflow-hidden flex flex-col">
          {selectedSession ? (
            <>
              {/* Header */}
              <div className="flex items-start justify-between border-b p-4 shrink-0 gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">
                    {selectedSession.firstMessage
                      ? truncateText(selectedSession.firstMessage, 100)
                      : selectedSession.fileName || 'Untitled Session'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(selectedSession.updatedAt)} · {selectedSession.messageCount}{' '}
                    {t('sessions.messages') || 'messages'}
                  </p>
                  {/* Session ID - always show */}
                  {selectedSession.id && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                        Session ID:
                      </span>
                      <span className="text-xs font-mono truncate">{selectedSession.id}</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(selectedSession.id || '');
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
                        className="p-1 hover:bg-muted rounded-md transition-colors"
                        title="Copy Session ID"
                      >
                        {copied ? (
                          <Check className="h-3 w-3 text-green-500" />
                        ) : (
                          <Copy className="h-3 w-3 text-muted-foreground" />
                        )}
                      </button>
                    </div>
                  )}
                  {/* Working Directory (for OpenCode) */}
                  {selectedSession.directory && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                        Work:
                      </span>
                      <span className="text-xs text-muted-foreground font-mono truncate">
                        {selectedSession.directory}
                      </span>
                    </div>
                  )}
                </div>
                {/* Resume Button */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-block">
                        <Button
                          size="sm"
                          onClick={() => {
                            if (!selectedSession.directory) return;
                            resumeMutation.mutate({
                              sessionId: selectedSession.id,
                              appType: selectedApp,
                              workingDir: selectedSession.directory,
                            });
                          }}
                          disabled={resumeMutation.isPending || !selectedSession.directory}
                          className="flex items-center gap-1.5"
                        >
                          {!selectedSession.directory ? (
                            <AlertTriangle className="h-3.5 w-3.5" />
                          ) : (
                            <Play className="h-3.5 w-3.5" />
                          )}
                          {resumeMutation.isPending
                            ? t('sessions.resuming') || 'Opening...'
                            : t('sessions.resume') || 'Resume'}
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        {!selectedSession.directory
                          ? t('sessions.noWorkingDir') ||
                            'Cannot resume: working directory not found'
                          : terminalInfo?.ghosttyInstalled
                            ? 'Open in Ghostty'
                            : 'Open in Terminal'}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              {/* Conversation */}
              <ScrollArea className="flex-1 p-4">
                {isLoadingDetail ? (
                  <div className="flex items-center justify-center h-64 text-muted-foreground">
                    {t('sessions.loadingConversation') || 'Loading conversation...'}
                  </div>
                ) : sessionDetail?.messages ? (
                  <ConversationView messages={sessionDetail.messages} appType={selectedApp} />
                ) : (
                  <div className="flex items-center justify-center h-64 text-muted-foreground">
                    {t('sessions.noMessages') || 'No messages found'}
                  </div>
                )}
              </ScrollArea>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{t('sessions.selectSession') || 'Select a session to view details'}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Group sessions by date
 */
function groupSessionsByDate(sessions: Session[]): Map<string, Session[]> {
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

  return groups;
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
 * Grouped Session List Component
 */
interface GroupedSessionListProps {
  sessions: Session[];
  selectedSession: Session | null;
  onSelect: (session: Session) => void;
  t: (key: string) => string;
}

// Create a context for collapse state
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

/**
 * Expand/Collapse Controls Component
 */
interface ExpandCollapseControlsProps {
  sessions: Session[];
  t: (key: string) => string;
}

function ExpandCollapseControls({ sessions, t }: ExpandCollapseControlsProps) {
  const { expandAll, collapseAll, allExpanded, allCollapsed } = useContext(CollapseContext);

  if (sessions.length === 0) return null;

  return (
    <div className="flex items-center justify-end gap-2 p-3 border-b border-border/50 bg-card shrink-0">
      <button
        onClick={expandAll}
        disabled={allExpanded}
        className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        {t('sessions.expandAll') || 'Expand All'}
      </button>
      <span className="text-muted-foreground text-xs">|</span>
      <button
        onClick={collapseAll}
        disabled={allCollapsed}
        className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        {t('sessions.collapseAll') || 'Collapse All'}
      </button>
    </div>
  );
}

function GroupedSessionList({ sessions, selectedSession, onSelect, t }: GroupedSessionListProps) {
  const grouped = groupSessionsByDate(sessions);
  const sortedDates = Array.from(grouped.keys()).sort((a, b) => {
    const dateA = new Date(a).getTime();
    const dateB = new Date(b).getTime();
    return dateB - dateA;
  });

  const { collapsedDates, toggleDate } = useContext(CollapseContext);

  return (
    <div className="space-y-1">
      {sortedDates.map((dateKey) => {
        const isCollapsed = collapsedDates.has(dateKey);
        const sessionsCount = grouped.get(dateKey)!.length;

        return (
          <div key={dateKey}>
            {/* Date Header - Clickable */}
            <button
              onClick={() => toggleDate(dateKey)}
              className="w-full sticky top-0 bg-card z-10 py-2 px-2 flex items-center justify-between hover:bg-accent/50 rounded-md transition-colors"
            >
              <div className="flex items-center gap-2">
                {isCollapsed ? (
                  <ChevronRight className="h-4 w-4 text-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-foreground" />
                )}
                <h4 className="text-sm font-semibold text-foreground">
                  {formatDateGroupLabel(dateKey, t)}
                </h4>
              </div>
              <span className="text-sm text-muted-foreground font-medium">{sessionsCount}</span>
            </button>

            {/* Sessions for this date */}
            {!isCollapsed && (
              <div className="space-y-1 mt-1 pl-5">
                {grouped.get(dateKey)!.map((session) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    isSelected={selectedSession?.id === session.id}
                    onClick={() => onSelect(session)}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
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
  const { t } = useTranslation();

  // Format time only (HH:MM)
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <button
      onClick={onClick}
      className={`w-full text-left py-2 px-2 rounded-md transition-all duration-150 border-b border-border/50 last:border-b-0 relative group min-w-0 ${
        isSelected
          ? 'bg-primary/10 text-primary border-primary/10 shadow-sm shadow-primary/20'
          : 'hover:bg-accent/50 text-foreground hover:border-border'
      }`}
    >
      {/* Left indicator bar for selected state - full height */}
      {isSelected && (
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary rounded-r-full" />
      )}

      {/* Title: First Message Preview */}
      <p
        className={`text-xs truncate block ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}
      >
        {session.firstMessage || session.fileName || 'Untitled Session'}
      </p>

      {/* Metadata - more compact */}
      <div
        className={`flex items-center gap-2 text-[10px] mt-1 min-w-0 ${isSelected ? 'text-primary/70' : 'text-muted-foreground/70'}`}
      >
        <span className="truncate">{formatTime(session.updatedAt)}</span>
        <span>·</span>
        <span className="truncate">
          {session.messageCount} {t('sessions.messages') || 'messages'}
        </span>
      </div>
    </button>
  );
}
