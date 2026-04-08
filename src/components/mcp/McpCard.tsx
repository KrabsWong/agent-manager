/**
 * MCP Card Component
 * 
 * Displays a single MCP server with app enablement toggles
 */

import { Settings, Trash2, Terminal, Globe, Radio } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import type { McpServer, AppType } from '@/types';

interface McpCardProps {
  server: McpServer;
  onEdit: () => void;
  onDelete: () => void;
  onToggleApp: (appType: AppType, enabled: boolean) => void;
}

const APP_LABELS: Record<AppType, string> = {
  claude: 'Claude',
  codex: 'Codex',
  gemini: 'Gemini',
  opencode: 'OpenCode',
  openclaw: 'OpenClaw',
};

const APP_ORDER: AppType[] = ['claude', 'codex', 'gemini', 'opencode', 'openclaw'];

export function McpCard({ server, onEdit, onDelete, onToggleApp }: McpCardProps) {
  const getTransportIcon = () => {
    switch (server.transport) {
      case 'stdio':
        return <Terminal className="h-4 w-4" />;
      case 'http':
        return <Globe className="h-4 w-4" />;
      case 'sse':
        return <Radio className="h-4 w-4" />;
      default:
        return <Terminal className="h-4 w-4" />;
    }
  };

  const getTransportLabel = () => {
    switch (server.transport) {
      case 'stdio':
        return 'Stdio';
      case 'http':
        return 'HTTP';
      case 'sse':
        return 'SSE';
      default:
        return server.transport;
    }
  };

  const getEnabledAppsCount = () => {
    return Object.values(server.enabledApps).filter(Boolean).length;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <CardTitle className="text-lg">{server.name}</CardTitle>
              <Badge variant="outline" className="gap-1">
                {getTransportIcon()}
                {getTransportLabel()}
              </Badge>
            </div>
            {server.description && (
              <p className="text-sm text-muted-foreground">{server.description}</p>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={onEdit}>
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onDelete}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Transport-specific details */}
          <div className="text-sm text-muted-foreground">
            {server.transport === 'stdio' && server.command && (
              <div className="font-mono bg-muted px-2 py-1 rounded text-xs truncate">
                {server.command} {server.args?.join(' ') || ''}
              </div>
            )}
            {(server.transport === 'http' || server.transport === 'sse') && server.url && (
              <div className="font-mono bg-muted px-2 py-1 rounded text-xs truncate">
                {server.url}
              </div>
            )}
          </div>

          {/* App toggles */}
          <div className="border-t pt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Enabled Apps</span>
              <span className="text-xs text-muted-foreground">
                {getEnabledAppsCount()} of {APP_ORDER.length}
              </span>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {APP_ORDER.map((app) => (
                <div
                  key={app}
                  className="flex flex-col items-center gap-1 p-2 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <span className="text-xs font-medium text-center">{APP_LABELS[app]}</span>
                  <Switch
                    checked={server.enabledApps[app]}
                    onCheckedChange={(checked: boolean) => onToggleApp(app, checked)}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
