/**
 * MCP Card Component
 *
 * Displays a single MCP server with app enablement toggles
 * Styled to match SkillCard for consistency
 */

import { Settings, Trash2, Terminal, Globe, Radio } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { APP_LABELS, getAppIcon, APP_COLORS } from '@/components/AppIcons';
import type { McpServer, AppType } from '@/types';

interface McpCardProps {
  server: McpServer;
  onEdit: () => void;
  onDelete: () => void;
  onToggleApp: (appType: AppType, enabled: boolean) => void;
  isToggling?: boolean;
}

const APP_ORDER: AppType[] = ['claude', 'codex', 'gemini', 'opencode', 'openclaw'];

export function McpCard({ server, onEdit, onDelete, onToggleApp, isToggling }: McpCardProps) {
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

  return (
    <Card className="group">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <CardTitle className="text-lg truncate">{server.name}</CardTitle>
              <Badge variant="outline" className="gap-1 text-xs shrink-0">
                {getTransportIcon()}
                {getTransportLabel()}
              </Badge>
            </div>
            {server.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">{server.description}</p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="icon" onClick={onEdit}>
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onDelete}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Transport-specific details */}
          <div className="text-sm text-muted-foreground">
            {server.transport === 'stdio' && server.command && (
              <div className="font-mono bg-muted px-2 py-1.5 rounded text-xs truncate">
                {server.command} {server.args?.join(' ') || ''}
              </div>
            )}
            {(server.transport === 'http' || server.transport === 'sse') && server.url && (
              <div className="font-mono bg-muted px-2 py-1.5 rounded text-xs truncate">
                {server.url}
              </div>
            )}
          </div>

          {/* App toggles - Same style as SkillCard */}
          <div className="flex flex-wrap gap-2">
            {APP_ORDER.map((app) => {
              const isEnabled = server.enabledApps[app];

              return (
                <button
                  key={app}
                  onClick={() => onToggleApp(app, !isEnabled)}
                  disabled={isToggling}
                  className={`
                    inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium
                    border transition-all duration-150
                    ${isToggling ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    ${
                      isEnabled
                        ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                        : 'bg-background text-muted-foreground border-border hover:border-muted-foreground/50 hover:bg-muted/50'
                    }
                  `}
                >
                  <span
                    className={`flex items-center justify-center ${isEnabled ? '[&_img]:brightness-0 [&_img]:invert' : APP_COLORS[app]}`}
                  >
                    {getAppIcon(app, 14)}
                  </span>
                  <span>{APP_LABELS[app]}</span>
                </button>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
