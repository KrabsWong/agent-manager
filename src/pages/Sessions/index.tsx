/**
 * Sessions Page
 *
 * View and browse local conversation sessions from AI applications
 */

import { useState, useEffect, useMemo } from 'react';
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

  const { data: sessions, isLoading, error } = useSessions(selectedApp);
  const { data: stats } = useSessionStats(selectedApp);
  const { data: supportStatus } = useSessionSupportStatus(selectedApp);
  const {
    data: sessionDetail,
    isLoading: isLoadingDetail,
    isFetching: isFetchingDetail,
  } = useSessionDetail(selectedSession?.id || '', selectedApp);
  const { data: terminalInfo } = useTerminalInfo();
  const resumeMutation = useResumeSession();

  // Auto-select first session when sessions are loaded
  useEffect(() => {
    if (sessions && sessions.length > 0 && !selectedSession) {
      setSelectedSession(sessions[0]);
    }
  }, [sessions, selectedSession]);

  // Reset selected session when app changes
  useEffect(() => {
    setSelectedSession(null);
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
          ? new Date(session.updatedAt).toLocaleDateString()
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
              ? new Date(s.updatedAt).toLocaleDateString()
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

  // Check if terminal supports resume
  const canResume = terminalInfo?.ghosttyInstalled || terminalInfo?.preferred === 'terminal';

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Main Content */}
      <div className="grid grid-cols-[320px_1fr] gap-0 flex-1 min-h-0 p-4">
        {/* Session List */}
        <div className="flex flex-col min-h-0 border-r bg-card/50 overflow-hidden w-[320px]">
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

        {/* Session Detail */}
        <div className="overflow-hidden flex flex-col h-full min-h-0">
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
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <span>
                      {formatDate(selectedSession.updatedAt)} ·{' '}
                      {sessionDetail?.messages
                        ? `${sessionDetail.messages.length}/${selectedSession.messageCount} ${t('sessions.messages', 'messages')}`
                        : `${selectedSession.messageCount} ${t('sessions.messages', 'messages')}`}
                    </span>
                    {isFetchingDetail && !isLoadingDetail && (
                      <span className="inline-flex items-center gap-1 text-xs text-primary">
                        <RefreshCw className="h-3 w-3 animate-spin" />
                        updating...
                      </span>
                    )}
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
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-1.5 shrink-0"
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
                            ? t('sessions.installGhosttyTip', 'Install Ghostty for best experience')
                            : t('sessions.resumeInTerminal', {
                                terminal:
                                  terminalInfo?.preferred === 'ghostty' ? 'Ghostty' : 'Terminal',
                              })}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>

              {/* Messages */}
              <div
                id="conversation-scroll-container"
                className="flex-1 overflow-y-auto p-4 min-h-0 relative"
                onScroll={(e) => {
                  const container = e.currentTarget;
                  setShowScrollToTop(container.scrollTop > 300);
                }}
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
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <AlertTriangle className="h-8 w-8 opacity-50" />
                      <p>{t('sessions.noMessages') || 'No messages found'}</p>
                    </div>
                  </div>
                )}

                {/* Scroll to top button */}
                {showScrollToTop && (
                  <button
                    onClick={() => {
                      const container = document.getElementById('conversation-scroll-container');
                      if (container) {
                        container.scrollTo({ top: 0, behavior: 'smooth' });
                      }
                    }}
                    className="absolute bottom-4 right-4 p-2 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all z-10"
                    title={t('common.scrollToTop', 'Scroll to top')}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                )}
              </div>
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
      </div>
    </div>
  );
}
