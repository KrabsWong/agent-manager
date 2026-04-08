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
import { useSessions, useSessionStats, useSessionSupportStatus } from '@/hooks/useSessions';
import type { AppType, Session } from '@/types';

const APP_TYPES: AppType[] = ['claude', 'codex', 'gemini', 'opencode', 'openclaw'];

const APP_LABELS: Record<AppType, string> = {
  claude: 'Claude Code',
  codex: 'Codex CLI',
  gemini: 'Gemini CLI',
  opencode: 'OpenCode',
  openclaw: 'OpenClaw',
};

export function SessionsPage() {
  const { t } = useTranslation();
  const [selectedApp, setSelectedApp] = useState<AppType>('claude');
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  const { data: sessions, isLoading, error } = useSessions(selectedApp);
  const { data: stats } = useSessionStats(selectedApp);
  const { data: supportStatus } = useSessionSupportStatus(selectedApp);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const isSupported = supportStatus?.supported ?? false;

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
        <Select value={selectedApp} onValueChange={(value) => setSelectedApp(value as AppType)}>
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
                Total Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSessions}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Messages
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalMessages}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Last Activity
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
      <div className="grid grid-cols-2 gap-6 h-full">
        {/* Session List */}
        <div className="space-y-4 overflow-auto">
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
                Switch to Claude Code
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
            <div className="space-y-2">
              {sessions?.map((session) => (
                <button
                  key={session.id}
                  onClick={() => setSelectedSession(session)}
                  className={`w-full text-left p-4 rounded-lg border transition-all duration-200 ${
                    selectedSession?.id === session.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-card hover:bg-accent/50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{session.fileName}</p>
                      {session.firstMessage && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                          {session.firstMessage}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDate(session.updatedAt)}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      {session.messageCount} messages
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Session Detail */}
        <div className="border rounded-lg bg-card p-4 overflow-auto">
          {selectedSession ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <h3 className="font-semibold">{selectedSession.fileName}</h3>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(selectedSession.updatedAt)}
                  </p>
                </div>
                <Badge variant="outline">{selectedSession.messageCount} messages</Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                <p>Select a session to view its conversation details.</p>
                <p className="mt-2">Session file: {selectedSession.filePath}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a session to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
