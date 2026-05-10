/**
 * Sessions Page
 *
 * View and browse local conversation sessions from AI applications
 */

import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertCircle,
  Play,
  AlertTriangle,
  ChevronUp,
  ExternalLink,
  Folder,
  RefreshCw,
} from 'lucide-react';
import { useSidebarResize } from '@/hooks/useSidebarResize';
import { useSettingsStore } from '@/stores/settings';
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
import { UserMessageNavigator } from '@/components/sessions/UserMessageNavigator';
import { api } from '@/lib/api';
import { VirtualSessionList, type ViewMode } from '@/components/sessions/VirtualSessionList';
import { APP_LABELS, APP_WEBSITES, APP_COLORS } from '@/config/apps';
import { getAppIcon } from '@/components/AppIcons';

import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { APP_ORDER, isAppSupported } from '@/config/apps';
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

  // Sidebar collapse state
  const { sidebarCollapsed } = useSettingsStore();

  // 侧边栏拖拽调整宽度
  const { isResizing, startResizing, style: sidebarStyle } = useSidebarResize({
    initialWidth: 320,
    minWidth: 160, // 当前宽度的一半
    collapsed: sidebarCollapsed,
  });

  // View mode and collapse state for session list
  const [viewMode, setViewMode] = useState<ViewMode>('date');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // New messages notification
  const [newMessagesCount, setNewMessagesCount] = useState(0);
  const [showNewMessagesTip, setShowNewMessagesTip] = useState(false);

  // Listen to scroll events for hiding new messages tip when at bottom
  useEffect(() => {
    const setupScrollListener = () => {
      const container = scrollContainerRef.current;
      if (!container) {
        // Retry after a short delay if ref is not ready
        setTimeout(setupScrollListener, 100);
        return;
      }

      const handleScroll = () => {
        // Hide new messages tip if user scrolls to bottom
        const { scrollHeight, scrollTop, clientHeight } = container;
        const scrollBottom = Math.ceil(scrollTop + clientHeight);
        const isAtBottom = scrollHeight - scrollBottom <= 50;

        if (showNewMessagesTip && isAtBottom) {
          setShowNewMessagesTip(false);
          setNewMessagesCount(0);
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

  // Reset selected session when app changes
  useEffect(() => {
    setSelectedSession(null);
  }, [selectedApp]);

  const isSupported = supportStatus?.supported ?? false;

  const handleSessionSelect = (session: Session) => {
    setSelectedSession(session);
  };

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
      const ts = typeof session.updatedAt === 'string' ? parseInt(session.updatedAt, 10) : session.updatedAt;
      const groupKey =
        viewMode === 'date'
          ? new Date(ts).toLocaleDateString('zh-CN', {
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
          sessions.map((s) => {
            const ts = typeof s.updatedAt === 'string' ? parseInt(s.updatedAt, 10) : s.updatedAt;
            return viewMode === 'date'
              ? new Date(ts).toLocaleDateString('zh-CN', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                })
              : s.directory || t('sessions.noDirectoryGroup', '— No Directory —');
          })
        ).size
      : false;

  // Handle resuming session
  const handleResumeSession = async () => {
    if (!selectedSession) return;
    // VS Code Extension doesn't support resume
    if (selectedApp === 'vscode-extension') return;

    await resumeMutation.mutateAsync({
      sessionId: selectedSession.id,
      appType: selectedApp,
      workingDir: selectedSession.directory,
    });
  };

  const canResume =
    selectedApp !== 'vscode-extension' &&
    (terminalInfo?.preferred === 'auto' ||
      terminalInfo?.ghosttyInstalled ||
      terminalInfo?.kittyInstalled ||
      terminalInfo?.preferred === 'terminal' ||
      terminalInfo?.preferred === 'ghostty' ||
      terminalInfo?.preferred === 'kitty');

  const handleOpenFilePreview = async () => {
    if (!selectedSession?.directory) return;
    const sessionTitle = selectedSession.firstMessage
      ? selectedSession.firstMessage.slice(0, 50)
      : selectedSession.fileName || 'Untitled';
    await api.filePreview.open(selectedSession.directory, sessionTitle, selectedApp);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Main Content */}
      <div className={cn('flex gap-0 flex-1 min-h-0 p-4')}>
        {/* Session List - Sidebar - with animation */}
        <div
          className={cn(
            "flex flex-col h-full min-h-0 border-r bg-card/50 overflow-hidden shrink-0 transition-[width,opacity] duration-300 ease-in-out",
            sidebarCollapsed && "border-r-0"
          )}
          style={sidebarStyle}
        >
          {/* Sidebar Content - with fade animation */}
          <div
            className={cn(
              "flex flex-col min-h-0 flex-1 transition-opacity duration-200 ease-in-out",
              sidebarCollapsed ? "opacity-0" : "opacity-100"
            )}
            style={{
              transitionDelay: sidebarCollapsed ? '0ms' : '150ms',
            }}
          >
            {/* App Selector - First item in sidebar */}
              <div className="px-3 py-2 border-b border-border/40 bg-card">
                <Select value={selectedApp} onValueChange={(value) => onAppChange(value as AppType)}>
                  <SelectTrigger className="w-full h-9">
                    <div className="flex items-center gap-2">
                      <span className={APP_COLORS[selectedApp]}>{getAppIcon(selectedApp, 16)}</span>
                      <span className="truncate font-medium">{APP_LABELS[selectedApp]}</span>
                    </div>
                  </SelectTrigger>
                  <SelectContent className="min-w-[18rem]">
                    {APP_ORDER.map((app) => {
                      const supported = isAppSupported(app);
                      return (
                        <SelectItem
                          key={app}
                          value={app}
                          disabled={!supported}
                          className={!supported ? 'opacity-50 cursor-not-allowed' : ''}
                        >
                          <div className="flex items-center gap-2">
                            <span className={APP_COLORS[app]}>{getAppIcon(app, 16)}</span>
                            <span>{APP_LABELS[app]}</span>
                            {!supported && (
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
                <div className="flex items-center bg-primary-muted rounded-md p-0.5">
                  <button
                    onClick={() => setViewMode('date')}
                    className={`px-2 py-1 text-[10px] font-medium rounded-sm transition-all ${
                      viewMode === 'date'
                        ? 'bg-card text-primary shadow-sm'
                        : 'text-muted-foreground hover:text-primary'
                    }`}
                    title={t('sessions.viewByDate', 'Group by date')}
                  >
                    {t('sessions.date', 'Date')}
                  </button>
                  <button
                    onClick={() => setViewMode('directory')}
                    className={`px-2 py-1 text-[10px] font-medium rounded-sm transition-all ${
                      viewMode === 'directory'
                        ? 'bg-card text-primary shadow-sm'
                        : 'text-muted-foreground hover:text-primary'
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
            </div> {/* Sidebar Content */}
          </div> {/* Sidebar Container */}

        {/* Resizable Divider - with animation */}
        <div
          onMouseDown={startResizing}
          className={cn(
            "shrink-0 cursor-col-resize transition-[width,opacity] duration-300 ease-in-out hover:bg-primary/50",
            isResizing && "bg-primary/50",
            sidebarCollapsed ? "w-0 opacity-0" : "w-1 opacity-100"
          )}
          title={t('common.resizeSidebar', '拖拽调整宽度')}
        />

        {/* Session Detail */}
        <div
          className="overflow-hidden flex flex-col h-full min-h-0 relative transition-all duration-300 flex-1"
        >
          {selectedSession ? (
            <>
              {/* Header */}
              <div className="flex items-start justify-between border-b p-4 shrink-0 gap-4">
                <div className="flex-1 min-w-0">
                  {/* Title row */}
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold truncate">
                      {selectedSession.firstMessage
                        ? truncateText(selectedSession.firstMessage, 100)
                        : selectedSession.fileName || 'Untitled Session'}
                    </h3>
                  </div>

                  {/* Metadata row - Session ID, Work */}
                  <div className="flex flex-col gap-1 mt-2">
                    {/* Session ID with Resume Button */}
                    {selectedSession.id && (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider shrink-0">
                          Session ID:
                        </span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(selectedSession.id || '');
                          }}
                          className="text-xs font-mono truncate hover:text-primary transition-colors"
                          title="Click to copy Session ID"
                        >
                          {selectedSession.id}
                        </button>
                        {/* Resume Button - small, right after Session ID */}
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="default"
                                size="sm"
                                className="h-6 px-2 py-0 text-[10px] flex items-center gap-1 shrink-0 bg-foreground text-background hover:bg-foreground/90 ml-1"
                                onClick={handleResumeSession}
                                disabled={!canResume || resumeMutation.isPending}
                              >
                                {resumeMutation.isPending ? (
                                  <>
                                    <RefreshCw className="h-3 w-3 animate-spin" />
                                    <span>{t('sessions.opening', 'Opening...')}</span>
                                  </>
                                ) : (
                                  <>
                                    <Play className="h-3 w-3" />
                                    <span>{t('sessions.resume', 'Resume')}</span>
                                  </>
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">
                              <p>
                                {!canResume
                                  ? t('sessions.installTerminalTip', 'Install Ghostty or Kitty for best experience')
                                  : t('sessions.resumeInTerminal', {
                                      terminal:
                                        terminalInfo?.preferred === 'ghostty'
                                          ? 'Ghostty'
                                          : terminalInfo?.preferred === 'kitty'
                                            ? 'Kitty'
                                            : terminalInfo?.preferred === 'terminal'
                                              ? 'Terminal'
                                              : 'Terminal',
                                    })}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    )}

                    {/* Last Updated */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider shrink-0">
                        Updated:
                      </span>
                      <span className="text-xs text-muted-foreground font-mono">
                        {new Date(typeof selectedSession.updatedAt === 'string' ? parseInt(selectedSession.updatedAt, 10) : selectedSession.updatedAt).toLocaleString('zh-CN', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

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
                  {/* File Preview Modal Button */}
                  <div className="flex items-center">
                    <TooltipProvider delayDuration={200}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            onClick={handleOpenFilePreview}
                          >
                            <Folder className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                          <p>{t('sessions.showFiles', 'Show files')}</p>
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
                  <>
                    <ConversationView
                      messages={sessionDetail.messages}
                      searchQuery=""
                      appType={selectedApp}
                      onNewMessages={(count, isAtBottom) => {
                        if (!isAtBottom) {
                          // User is not at bottom, show tip
                          setNewMessagesCount((prev) => prev + count);
                          setShowNewMessagesTip(true);
                        }
                        // If at bottom, auto-scroll is handled by ConversationView
                      }}
                    />
                    {/* User Message Navigator - Quick jump to user messages */}
                <UserMessageNavigator
                  messages={sessionDetail.messages}
                />
                  </>
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
                    // Scroll to bottom to see new messages
                    if (scrollContainerRef.current) {
                      scrollContainerRef.current.scrollTo({
                        top: scrollContainerRef.current.scrollHeight,
                        behavior: 'smooth',
                      });
                    }
                    // Hide the tip
                    setShowNewMessagesTip(false);
                    setNewMessagesCount(0);
                  }}
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary-hover transition-all"
                >
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-foreground opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-foreground"></span>
                  </span>
                  <span className="text-xs font-medium">{newMessagesCount} 条新内容</span>
                </button>
              )}
            </>
          ) : (
            /* Empty State */
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary-muted flex items-center justify-center">
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
