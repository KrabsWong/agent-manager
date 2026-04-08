/**
 * Sessions Page
 *
 * View and browse local conversation sessions from AI applications
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { History, AlertCircle, Clock, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  useSessions,
  useSessionDetail,
  useSessionStats,
  useSessionSupportStatus,
} from '@/hooks/useSessions';
import { ConversationView } from '@/components/sessions/ConversationView';
import type { AppType, Session } from '@/types';

const APP_TYPES: AppType[] = ['claude', 'codex', 'gemini', 'opencode', 'openclaw'];

const APP_LABELS: Record<AppType, string> = {
  claude: 'Claude Code',
  codex: 'Codex CLI',
  gemini: 'Gemini CLI',
  opencode: 'OpenCode',
  openclaw: 'OpenClaw',
};

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

  const { data: sessions, isLoading, error } = useSessions(selectedApp);
  const { data: stats } = useSessionStats(selectedApp);
  const { data: supportStatus } = useSessionSupportStatus(selectedApp);
  const { data: sessionDetail, isLoading: isLoadingDetail } = useSessionDetail(
    selectedSession?.id || ''
  );

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const isSupported = supportStatus?.supported ?? false;

  const handleSessionSelect = (session: Session) => {
    setSelectedSession(session);
  };

  return (
    <div className="space-y-6 h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <History className="h-6 w-6" />
            {t('sessions.title') || 'Sessions'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('sessions.description') || 'View conversation history from your AI applications'}
          </p>
        </div>
        <Select
          value={selectedApp}
          onValueChange={(value) => {
            setSelectedApp(value as AppType);
            setSelectedSession(null);
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder={t('sessions.selectApp') || 'Select Application'} />
          </SelectTrigger>
          <SelectContent>
            {APP_TYPES.map((app) => (
              <SelectItem key={app} value={app}>
                {APP_LABELS[app]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      {isSupported && stats && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('sessions.totalSessions') || 'Total Sessions'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSessions}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('sessions.totalMessages') || 'Total Messages'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalMessages}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('sessions.lastActivity') || 'Last Activity'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.lastSessionDate ? new Date(stats.lastSessionDate).toLocaleDateString() : '-'}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-[380px_1fr] gap-4 h-full min-h-0">
        {/* Session List */}
        <ScrollArea className="border rounded-lg bg-card">
          <div className="p-4 space-y-2">
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
              sessions?.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  isSelected={selectedSession?.id === session.id}
                  onClick={() => handleSessionSelect(session)}
                  formatDate={formatDate}
                />
              ))
            )}
          </div>
        </ScrollArea>

        {/* Session Detail */}
        <div className="border rounded-lg bg-card overflow-hidden flex flex-col">
          {selectedSession ? (
            <>
              {/* Header */}
              <div className="flex items-center justify-between border-b p-4 shrink-0">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{selectedSession.fileName}</h3>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(selectedSession.updatedAt)} · {selectedSession.messageCount}{' '}
                    {t('sessions.messages') || 'messages'}
                  </p>
                </div>
                <Badge variant="outline">{selectedApp}</Badge>
              </div>

              {/* Conversation */}
              <ScrollArea className="flex-1 p-4">
                {isLoadingDetail ? (
                  <div className="flex items-center justify-center h-64 text-muted-foreground">
                    {t('sessions.loadingConversation') || 'Loading conversation...'}
                  </div>
                ) : sessionDetail?.messages ? (
                  <ConversationView messages={sessionDetail.messages} />
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
 * Session Card Component
 */
interface SessionCardProps {
  session: Session;
  isSelected: boolean;
  onClick: () => void;
  formatDate: (timestamp: number) => string;
}

function SessionCard({ session, isSelected, onClick, formatDate }: SessionCardProps) {
  const { t } = useTranslation();

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-lg border transition-all duration-200 ${
        isSelected ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-accent/50'
      }`}
    >
      {/* Title: First Message Preview */}
      <p className="font-medium text-sm line-clamp-1 mb-2">
        {session.firstMessage
          ? truncateText(session.firstMessage, 100)
          : session.fileName || 'Untitled Session'}
      </p>

      {/* Metadata */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {formatDate(session.updatedAt)}
        </span>
        <span className="flex items-center gap-1">
          <MessageSquare className="h-3 w-3" />
          {session.messageCount} {t('sessions.messages') || 'messages'}
        </span>
      </div>
    </button>
  );
}
