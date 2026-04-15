/**
 * Sessions Page
 *
 * View and browse local conversation sessions from AI applications
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertCircle,
  Copy,
  Check,
  Play,
  AlertTriangle,
  ChevronUp,
  ExternalLink,
  Search,
  X,
  RefreshCw,
  ArrowUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
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
import { VirtualSessionList, type ViewMode } from '@/components/sessions/VirtualSessionList';
import { SessionContextPanel } from '@/components/sessions/SessionContextPanel';
import { APP_LABELS, APP_WEBSITES } from '@/components/AppIcons';
import type { AppType, Session } from '@/types';

interface SessionsPageProps {
  selectedApp: AppType;
  onAppChange: (app: AppType) => void;
}

/**
 * Truncate text to a specific length with ellipsis
 */
function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text || '';
  return text.substring(0, maxLength).trim() + '...';
}

export function SessionsPage({ selectedApp, onAppChange }: SessionsPageProps) {
  const { t } = useTranslation();
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [copied, setCopied] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);

  // View mode and collapse state for session list
  const [viewMode, setViewMode] = useState<ViewMode>('date');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // Scroll to top button visibility
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // New messages notification
  const [newMessagesCount, setNewMessagesCount] = useState(0);
  const [showNewMessagesTip, setShowNewMessagesTip] = useState(false);
  const [shouldLoadAll, setShouldLoadAll] = useState(false);

  // Listen to scroll events for scroll-to-top button and hide new messages tip when at bottom
  useEffect(() => {
    const setupScrollListener = () => {
      const container = scrollContainerRef.current;
      if (!container) {
        // Retry after a short delay if ref is not ready
        setTimeout(setupScrollListener, 100);
        return;
      }

      const handleScroll = () => {
        setShowScrollToTop(container.scrollTop > 300);

        // Hide new messages tip if user scrolls to bottom
        if (showNewMessagesTip) {
          const isAtBottom =
            container.scrollHeight - container.scrollTop - container.clientHeight < 50;
          if (isAtBottom) {
            setShowNewMessagesTip(false);
            setNewMessagesCount(0);
          }
        }
      };

      container.addEventListener('scroll', handleScroll);
      // Check initial scroll position
      handleScroll();

      return () => container.removeEventListener('scroll', handleScroll);
    };

    const cleanup = setupScrollListener();
    return cleanup;
  }, [selectedSession, showNewMessagesTip]); // Re-bind when session or tip visibility changes

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

  // Reset selected session and close Monaco when app changes
  useEffect(() => {
    setSelectedSession(null);
    setIsPreviewingFile(false);
  }, [selectedApp]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const isSupported = supportStatus?.supported ?? false;

  const handleSessionSelect = (session: Session) => {
    setSelectedSession(session);
    // Clear search when switching sessions
    setSearchQuery('');
  };

  // Calculate matching messages count for search display
  const matchCount = useMemo(() => {
    if (!searchQuery.trim() || !sessionDetail?.messages) return 0;

    const query = searchQuery.toLowerCase();
    let count = 0;

    sessionDetail.messages.forEach((msg) => {
      const searchableContent = [
        msg.content,
        msg.reasoning_content,
        msg.redacted_content,
        msg.sub_agent_session_id,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      if (searchableContent.includes(query)) {
        count++;
      }
    });

    return count;
  }, [searchQuery, sessionDetail?.messages]);

  // Toggle collapse state for a group
  const toggleGroup = (groupKey: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }
      return next;
    });
  };

  // Expand/collapse all groups
  const expandAll = () => setCollapsedGroups(new Set());
  const collapseAll = () => {
    if (!sessions) return;
    const allGroups = new Set<string>();
    sessions.forEach((session) => {
      const groupKey =
        viewMode === 'date'
          ? new Date(session.updatedAt).toLocaleDateString('zh-CN', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
            })
          : session.directory || t('sessions.noDirectoryGroup', '— No Directory —');
      allGroups.add(groupKey);
    });
    setCollapsedGroups(allGroups);
  };

  const allExpanded = collapsedGroups.size === 0;
  const allCollapsed =
    sessions && sessions.length > 0
      ? collapsedGroups.size ===
        new Set(
          sessions.map((s) =>
            viewMode === 'date'
              ? new Date(s.updatedAt).toLocaleDateString('zh-CN', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                })
              : s.directory || t('sessions.noDirectoryGroup', '— No Directory —')
          )
        ).size
      : false;

  // Handle resuming session
  const handleResumeSession = async () => {
    if (!selectedSession) return;
    await resumeMutation.mutateAsync({
      sessionId: selectedSession.id,
      appType: selectedApp,
      workingDir: selectedSession.directory,
    });
  };

  // Check if terminal supports resume (any modern terminal or Terminal.app)
  const canResume =
    terminalInfo?.ghosttyInstalled ||
    terminalInfo?.kittyInstalled ||
    terminalInfo?.preferred === 'terminal';

  // Track if user is previewing a file to auto-hide session list and resize detail
  const [isPreviewingFile, setIsPreviewingFile] = useState(false);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Main Content */}
      <div className={cn('flex gap-0 flex-1 min-h-0 p-4 transition-all duration-300')}>
        {/* Session List - hidden when previewing file */}
        {!isPreviewingFile && (
          <div className="flex flex-col min-h-0 border-r bg-card/50 overflow-hidden w-[320px] shrink-0">
            {/* List Header */}
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/40 bg-card">
              {/* Stats */}
              {isSupported && stats && (
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span>
                    {stats.totalSessions} {t('sessions.sessionsLabel', 'Sessions')}
                  </span>
                  <span className="text-border">·</span>
                  <span>
                    {stats.totalMessages} {t('sessions.messagesLabel', 'Messages')}
                  </span>
                </div>
              )}

              {/* View Mode Toggle - Icon buttons */}
              <div className="flex items-center bg-muted/60 rounded-md p-0.5">
                <button
                  onClick={() => setViewMode('date')}
                  className={`px-2 py-1 text-[10px] font-medium rounded-sm transition-all ${
                    viewMode === 'date'
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title={t('sessions.viewByDate', 'Group by date')}
                >
                  {t('sessions.date', 'Date')}
                </button>
                <button
                  onClick={() => setViewMode('directory')}
                  className={`px-2 py-1 text-[10px] font-medium rounded-sm transition-all ${
                    viewMode === 'directory'
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title={t('sessions.viewByDirectory', 'Group by directory')}
                >
                  {t('sessions.directory', 'Directory')}
                </button>
              </div>
            </div>

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
              <div className="flex flex-col items-center justify-center h-64 space-y-4 p-4">
                <div className="text-muted-foreground text-center">
                  <p className="text-lg font-medium mb-2">
                    {t('sessions.comingSoon') || 'Coming Soon'}
                  </p>
                  <p className="text-sm">
                    {t('sessions.unsupportedApp') ||
                      `Session viewing is not yet supported for ${APP_LABELS[selectedApp]}.`}
                  </p>
                </div>
                <Button variant="outline" onClick={() => onAppChange('claude')}>
                  {t('sessions.switchToClaude') || 'Switch to Claude Code'}
                </Button>
              </div>
            ) : !supportStatus?.isAvailable ? (
              <div className="flex flex-col items-center justify-center h-64 space-y-4 p-4">
                <div className="text-muted-foreground text-center">
                  <p className="text-lg font-medium mb-2">
                    {t('sessions.notInstalled') || 'Not Installed'}
                  </p>
                  <p className="text-sm">
                    {t('sessions.notInstalledDesc', { app: APP_LABELS[selectedApp] }) ||
                      `Install ${APP_LABELS[selectedApp]} to view your conversation history.`}
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => window.open(APP_WEBSITES[selectedApp], '_blank')}
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  {t('sessions.visitWebsite') || 'Visit Website'}
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
              <div className="flex-1 min-h-0 p-2">
                <VirtualSessionList
                  sessions={sessions || []}
                  selectedSession={selectedSession}
                  onSelect={handleSessionSelect}
                  t={t as (key: string, defaultValue?: string) => string}
                  collapsedGroups={collapsedGroups}
                  toggleGroup={toggleGroup}
                  expandAll={expandAll}
                  collapseAll={collapseAll}
                  allExpanded={allExpanded}
                  allCollapsed={allCollapsed}
                  viewMode={viewMode}
                />
              </div>
            )}
          </div>
        )}

        {/* Session Detail */}
        <div
          className={cn(
            'overflow-hidden flex flex-col h-full min-h-0 relative transition-all duration-300 border-r',
            isPreviewingFile ? 'w-[500px] shrink-0' : 'flex-1'
          )}
        >
          {selectedSession ? (
            <>
              {/* Header */}
              <div className="flex items-start justify-between border-b p-4 shrink-0 gap-4">
                <div className="flex-1 min-w-0">
                  {/* Title row with Live indicator */}
                  <div className="flex items-center gap-2">
                    {/* Live refresh indicator - always shown at the front */}
                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 shrink-0">
                      <RefreshCw className="h-3 w-3 animate-spin text-primary" />
                      <span className="text-[10px] text-primary font-medium">
                        {t('sessions.liveRefresh', 'Live')}
                      </span>
                    </div>
                    <h3 className="font-semibold truncate">
                      {selectedSession.firstMessage
                        ? truncateText(selectedSession.firstMessage, 100)
                        : selectedSession.fileName || 'Untitled Session'}
                    </h3>
                  </div>

                  {/* Metadata row - Time, Messages, Session ID, Work */}
                  <div className="flex flex-col gap-1 mt-2">
                    {/* Time and Messages */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{formatDate(selectedSession.updatedAt)}</span>
                      <span className="text-border">·</span>
                      <span>
                        {sessionDetail?.messages
                          ? `${sessionDetail.messages.length}/${selectedSession.messageCount} ${t('sessions.messages', 'messages')}`
                          : `${selectedSession.messageCount} ${t('sessions.messages', 'messages')}`}
                      </span>
                    </div>

                    {/* Session ID */}
                    {selectedSession.id && (
                      <div className="flex items-center gap-2">
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

                    {/* Working Directory */}
                    {selectedSession.directory && (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                          Work:
                        </span>
                        <span className="text-xs text-muted-foreground font-mono truncate">
                          {selectedSession.directory}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                {/* Search and Resume Buttons */}
                <div className="flex items-center gap-2">
                  {/* Search Input - Compact inline */}
                  <div className="flex items-center">
                    {isSearchExpanded ? (
                      <div className="flex items-center gap-1.5">
                        <div className="relative">
                          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={t('search.placeholder', 'Search...')}
                            className="w-48 pl-7 pr-6 py-1 text-xs border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary/50"
                            autoFocus
                          />
                          {searchQuery && (
                            <button
                              onClick={() => setSearchQuery('')}
                              className="absolute right-1.5 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            setIsSearchExpanded(false);
                            setSearchQuery('');
                          }}
                          className="p-1 text-muted-foreground hover:text-foreground rounded"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                        {searchQuery && (
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                            {matchCount} {t('search.matchesShort', 'matches')}
                          </span>
                        )}
                      </div>
                    ) : (
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0"
                              onClick={() => setIsSearchExpanded(true)}
                            >
                              <Search className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom">
                            <p>{t('search.placeholder', 'Search in conversation')}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>

                  {/* Resume Button */}
                  <TooltipProvider delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="default"
                          size="sm"
                          className="flex items-center gap-1.5 shrink-0 bg-foreground text-background hover:bg-foreground/90"
                          onClick={handleResumeSession}
                          disabled={!canResume || resumeMutation.isPending}
                        >
                          {resumeMutation.isPending ? (
                            <>
                              <RefreshCw className="h-4 w-4 animate-spin" />
                              <span>{t('sessions.opening', 'Opening...')}</span>
                            </>
                          ) : (
                            <>
                              <Play className="h-4 w-4" />
                              <span>{t('sessions.resume', 'Resume')}</span>
                            </>
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        <p>
                          {!canResume
                            ? t(
                                'sessions.installTerminalTip',
                                'Install Ghostty or Kitty for best experience'
                              )
                            : t('sessions.resumeInTerminal', {
                                terminal:
                                  terminalInfo?.preferred === 'ghostty'
                                    ? 'Ghostty'
                                    : terminalInfo?.preferred === 'kitty'
                                      ? 'Kitty'
                                      : 'Terminal',
                              })}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>

              {/* Messages */}
              <div
                ref={scrollContainerRef}
                id="conversation-scroll-container"
                className="flex-1 overflow-y-auto p-4 min-h-0 relative"
              >
                {isLoadingDetail ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-muted-foreground flex items-center gap-2">
                      <RefreshCw className="h-5 w-5 animate-spin" />
                      {t('sessions.loadingConversation') || 'Loading conversation...'}
                    </div>
                  </div>
                ) : sessionDetail?.messages && sessionDetail.messages.length > 0 ? (
                  <ConversationView
                    messages={sessionDetail.messages}
                    searchQuery={searchQuery}
                    appType={selectedApp}
                    shouldLoadAll={shouldLoadAll}
                    onLoadAllComplete={() => {
                      setShouldLoadAll(false);
                      // Keep the tip visible until user scrolls to bottom
                    }}
                    onNewMessages={(count) => {
                      setNewMessagesCount((prev) => prev + count);
                      setShowNewMessagesTip(true);
                    }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <AlertTriangle className="h-8 w-8 opacity-50" />
                      <p>{t('sessions.noMessages') || 'No messages found'}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* New messages notification - absolute at bottom center */}
              {showNewMessagesTip && (
                <button
                  onClick={() => {
                    // Trigger load all and scroll to bottom
                    setShouldLoadAll(true);
                    // Scroll after a short delay to allow loading
                    setTimeout(() => {
                      if (scrollContainerRef.current) {
                        scrollContainerRef.current.scrollTo({
                          top: scrollContainerRef.current.scrollHeight,
                          behavior: 'smooth',
                        });
                      }
                    }, 100);
                  }}
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-all"
                >
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-foreground opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-foreground"></span>
                  </span>
                  <span className="text-xs font-medium">{newMessagesCount} 条新内容</span>
                </button>
              )}

              {/* Scroll to top button - absolute at bottom right of detail area */}
              {showScrollToTop && (
                <button
                  onClick={() => {
                    if (scrollContainerRef.current) {
                      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  }}
                  className="absolute bottom-4 right-4 p-2 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all z-50"
                  title={t('common.scrollToTop', 'Scroll to top')}
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
              )}
            </>
          ) : (
            /* Empty State */
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                  <ChevronUp className="h-8 w-8 opacity-50" />
                </div>
                <div className="text-center">
                  <p className="text-lg font-medium mb-1">
                    {t('sessions.emptyStateTitle') || 'No Session Selected'}
                  </p>
                  <p className="text-sm max-w-md">
                    {t('sessions.emptyStateDesc') ||
                      'Choose a session from the list on the left to view conversation details.'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Session Context Panel */}
        {selectedSession && (
          <SessionContextPanel
            sessionDirectory={selectedSession.directory}
            onPreviewStart={() => setIsPreviewingFile(true)}
            onPreviewEnd={() => setIsPreviewingFile(false)}
            isPreviewingFile={isPreviewingFile}
            className={isPreviewingFile ? 'flex-1 min-w-0' : 'shrink-0'}
          />
        )}
      </div>
    </div>
  );
}
