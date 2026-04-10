import { useTranslation } from 'react-i18next';
import { History, Puzzle, Palette, RotateCcw, Type } from 'lucide-react';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useNavigationStore, type NavItem } from '@/stores/navigation';
import { useExperienceStore } from '@/stores/experience';

const navOptions: { id: NavItem; label: string; icon: React.ElementType; description: string }[] = [
  {
    id: 'sessions',
    label: 'settings.nav.sessions',
    icon: History,
    description: 'settings.nav.sessionsDesc',
  },
  { id: 'mcp', label: 'settings.nav.mcp', icon: Puzzle, description: 'settings.nav.mcpDesc' },
  {
    id: 'skills',
    label: 'settings.nav.skills',
    icon: Palette,
    description: 'settings.nav.skillsDesc',
  },
];

export function SettingsPage() {
  const { t } = useTranslation();
  const { enabledItems, toggleItem, resetToDefault } = useNavigationStore();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('settings.title')}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t('settings.generalTitle')}</CardTitle>
          <CardDescription>{t('settings.generalDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <LanguageSwitcher />
          <div className="border-t pt-6">
            <ThemeSwitcher />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('settings.navigationTitle') || 'Navigation'}</CardTitle>
              <CardDescription>
                {t('settings.navigationDescription') ||
                  'Customize which sections appear in the sidebar'}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={resetToDefault} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              {t('settings.reset') || 'Reset'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {navOptions.map((option) => {
              const isEnabled = enabledItems.includes(option.id);
              const Icon = option.icon;
              const isLastEnabled = isEnabled && enabledItems.length === 1;

              return (
                <button
                  key={option.id}
                  onClick={() => toggleItem(option.id)}
                  disabled={isLastEnabled}
                  className={cn(
                    'w-full flex items-center gap-4 p-4 rounded-lg border transition-all text-left',
                    isEnabled
                      ? 'border-primary/50 bg-primary/5'
                      : 'border-border hover:border-primary/30 hover:bg-accent/50',
                    isLastEnabled && 'opacity-70 cursor-not-allowed'
                  )}
                >
                  <div
                    className={cn(
                      'flex items-center justify-center w-10 h-10 rounded-lg transition-colors',
                      isEnabled
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{t(option.label) || option.id}</div>
                    <div className="text-sm text-muted-foreground">
                      {t(option.description) || ''}
                    </div>
                  </div>
                  <div
                    className={cn(
                      'w-11 h-6 rounded-full transition-colors relative',
                      isEnabled ? 'bg-primary' : 'bg-muted'
                    )}
                  >
                    <div
                      className={cn(
                        'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
                        isEnabled ? 'translate-x-6' : 'translate-x-1'
                      )}
                    />
                  </div>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            {t('settings.navigationHint') ||
              'At least one navigation item must be enabled. When only one item is shown, the sidebar will be compact.'}
          </p>
        </CardContent>
      </Card>

      <ExperienceSettings />
    </div>
  );
}

// 体验特性设置组件
function ExperienceSettings() {
  const { t } = useTranslation();
  const { enableTitleMarquee, toggleTitleMarquee } = useExperienceStore();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('settings.experienceTitle') || 'Experience Features'}</CardTitle>
        <CardDescription>
          {t('settings.experienceDescription') ||
            'Optional features to enhance your browsing experience'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <button
            onClick={toggleTitleMarquee}
            className={cn(
              'w-full flex items-center gap-4 p-4 rounded-lg border transition-all text-left',
              enableTitleMarquee
                ? 'border-primary/50 bg-primary/5'
                : 'border-border hover:border-primary/30 hover:bg-accent/50'
            )}
          >
            <div
              className={cn(
                'flex items-center justify-center w-10 h-10 rounded-lg transition-colors',
                enableTitleMarquee
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              <Type className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium">
                {t('settings.titleMarquee') || 'Title Marquee Effect'}
              </div>
              <div className="text-sm text-muted-foreground">
                {t('settings.titleMarqueeDesc') ||
                  'Hover over long session titles to auto-scroll and see full text'}
              </div>
            </div>
            <div
              className={cn(
                'w-11 h-6 rounded-full transition-colors relative',
                enableTitleMarquee ? 'bg-primary' : 'bg-muted'
              )}
            >
              <div
                className={cn(
                  'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
                  enableTitleMarquee ? 'translate-x-6' : 'translate-x-1'
                )}
              />
            </div>
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
