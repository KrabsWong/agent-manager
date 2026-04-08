/**
 * Skill Card Component
 *
 * Displays an installed skill with app enablement toggles
 */

import { Trash2, Folder, Github, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bot, Terminal, Sparkles, Code2, Zap } from 'lucide-react';
import type { Skill, AppType } from '@/types';

interface SkillCardProps {
  skill: Skill;
  onDelete: () => void;
  onToggleApp: (appType: AppType, enabled: boolean) => void;
}

const APP_CONFIG: Record<AppType, { label: string; icon: React.ReactNode; color: string }> = {
  claude: {
    label: 'Claude',
    icon: <Bot className="h-3.5 w-3.5" />,
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200',
  },
  codex: {
    label: 'Codex',
    icon: <Terminal className="h-3.5 w-3.5" />,
    color: 'bg-teal-100 text-teal-700 border-teal-200 hover:bg-teal-200',
  },
  gemini: {
    label: 'Gemini',
    icon: <Sparkles className="h-3.5 w-3.5" />,
    color: 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200',
  },
  opencode: {
    label: 'OpenCode',
    icon: <Code2 className="h-3.5 w-3.5" />,
    color: 'bg-lime-100 text-lime-700 border-lime-200 hover:bg-lime-200',
  },
  openclaw: {
    label: 'OpenClaw',
    icon: <Zap className="h-3.5 w-3.5" />,
    color: 'bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200',
  },
};

const APP_ORDER: AppType[] = ['claude', 'codex', 'gemini', 'opencode', 'openclaw'];

export function SkillCard({ skill, onDelete, onToggleApp }: SkillCardProps) {
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <Card className="group">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <CardTitle className="text-lg truncate">{skill.name}</CardTitle>
              {skill.repoOwner && skill.repoName && (
                <Badge variant="outline" className="gap-1 text-xs shrink-0">
                  <Github className="h-3 w-3" />
                  <span className="truncate max-w-[120px]">
                    {skill.repoOwner}/{skill.repoName}
                  </span>
                </Badge>
              )}
            </div>
            {skill.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">{skill.description}</p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* App toggles - Modern chip style */}
          <div className="flex flex-wrap gap-2">
            {APP_ORDER.map((app) => {
              const isEnabled = skill.enabledApps[app];
              const config = APP_CONFIG[app];

              return (
                <button
                  key={app}
                  onClick={() => onToggleApp(app, !isEnabled)}
                  className={`
                    inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                    border transition-all duration-200
                    ${
                      isEnabled
                        ? config.color
                        : 'bg-muted text-muted-foreground border-transparent hover:bg-muted/80'
                    }
                  `}
                >
                  {isEnabled && <Check className="h-3 w-3" />}
                  {config.icon}
                  <span>{config.label}</span>
                </button>
              );
            })}
          </div>

          {/* Footer info */}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
            <div className="flex items-center gap-2">
              <Folder className="h-3 w-3" />
              <span className="truncate font-mono max-w-[200px]">{skill.directory}</span>
            </div>
            <span>Installed {formatDate(skill.installedAt)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
