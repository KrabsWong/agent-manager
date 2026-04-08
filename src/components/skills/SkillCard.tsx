/**
 * Skill Card Component
 * 
 * Displays an installed skill with app enablement toggles
 */

import { Trash2, Folder, Github } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import type { Skill, AppType } from '@/types';

interface SkillCardProps {
  skill: Skill;
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

export function SkillCard({ skill, onDelete, onToggleApp }: SkillCardProps) {
  const getEnabledAppsCount = () => {
    return Object.values(skill.enabledApps).filter(Boolean).length;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <CardTitle className="text-lg">{skill.name}</CardTitle>
              {skill.repoOwner && skill.repoName && (
                <Badge variant="outline" className="gap-1">
                  <Github className="h-3 w-3" />
                  {skill.repoOwner}/{skill.repoName}
                </Badge>
              )}
            </div>
            {skill.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {skill.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={onDelete}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Installation info */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Folder className="h-3 w-3" />
            <span className="truncate font-mono">{skill.directory}</span>
            <span>•</span>
            <span>Installed {formatDate(skill.installedAt)}</span>
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
                    checked={skill.enabledApps[app]}
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
