import { useTranslation } from 'react-i18next';
import { History, Puzzle, Palette, RotateCcw, Type, Terminal } from 'lucide-react';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { ColorPicker } from '@/components/ColorPicker';
import { useTheme } from '@/components/ThemeProvider';
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
  const { accentColor, setAccentColor } = useTheme();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t('settings.title')}</h1>

      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t('settings.generalTitle')}</CardTitle>
          <CardDescription className="text-xs">{t('settings.generalDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <LanguageSwitcher />
          <ThemeSwitcher />
          <ColorPicker value={accentColor} onChange={setAccentColor} />
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">
                {t('settings.navigationTitle') || 'Navigation'}
              </CardTitle>
              <CardDescription className="text-xs">
                {t('settings.navigationDescription') ||
                  'Customize which sections appear in the sidebar'}
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetToDefault}
              className="gap-1.5 h-7 px-2 text-xs"
            >
              <RotateCcw className="h-3 w-3" />
              {t('settings.reset') || 'Reset'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
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
                    'w-full flex items-center gap-3 p-2.5 rounded-md border transition-all text-left',
                    isEnabled
                      ? 'border-primary/50 bg-primary/5'
                      : 'border-border/60 hover:border-primary/30 hover:bg-accent/50',
                    isLastEnabled && 'opacity-70 cursor-not-allowed'
                  )}
                >
                  <div
                    className={cn(
                      'flex items-center justify-center w-8 h-8 rounded-md transition-colors shrink-0',
                      isEnabled
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{t(option.label) || option.id}</div>
                    <div className="text-xs text-muted-foreground leading-tight">
                      {t(option.description) || ''}
                    </div>
                  </div>
                  <div
                    className={cn(
                      'w-9 h-5 rounded-full transition-colors relative shrink-0',
                      isEnabled ? 'bg-primary' : 'bg-muted'
                    )}
                  >
                    <div
                      className={cn(
                        'absolute top-1 w-3 h-3 rounded-full bg-white transition-transform',
                        isEnabled ? 'translate-x-5' : 'translate-x-1'
                      )}
                    />
                  </div>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
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
  const { enableTitleMarquee, toggleTitleMarquee, collapseBashBlocks, toggleCollapseBashBlocks } =
    useExperienceStore();

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          {t('settings.experienceTitle') || 'Experience Features'}
        </CardTitle>
        <CardDescription className="text-xs">
          {t('settings.experienceDescription') ||
            'Optional features to enhance your browsing experience'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <button
          onClick={toggleTitleMarquee}
          className={cn(
            'w-full flex items-center gap-3 p-2.5 rounded-md border transition-all text-left',
            enableTitleMarquee
              ? 'border-primary/50 bg-primary/5'
              : 'border-border/60 hover:border-primary/30 hover:bg-accent/50'
          )}
        >
          <div
            className={cn(
              'flex items-center justify-center w-8 h-8 rounded-md transition-colors shrink-0',
              enableTitleMarquee
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            )}
          >
            <Type className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm">
              {t('settings.titleMarquee') || 'Title Marquee Effect'}
            </div>
            <div className="text-xs text-muted-foreground leading-tight">
              {t('settings.titleMarqueeDesc') ||
                'Hover over long session titles to auto-scroll and see full text'}
            </div>
          </div>
          <div
            className={cn(
              'w-9 h-5 rounded-full transition-colors relative shrink-0',
              enableTitleMarquee ? 'bg-primary' : 'bg-muted'
            )}
          >
            <div
              className={cn(
                'absolute top-1 w-3 h-3 rounded-full bg-white transition-transform',
                enableTitleMarquee ? 'translate-x-5' : 'translate-x-1'
              )}
            />
          </div>
        </button>

        <button
          onClick={toggleCollapseBashBlocks}
          className={cn(
            'w-full flex items-center gap-3 p-2.5 rounded-md border transition-all text-left',
            collapseBashBlocks
              ? 'border-primary/50 bg-primary/5'
              : 'border-border/60 hover:border-primary/30 hover:bg-accent/50'
          )}
        >
          <div
            className={cn(
              'flex items-center justify-center w-8 h-8 rounded-md transition-colors shrink-0',
              collapseBashBlocks
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            )}
          >
            <Terminal className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm">
              {t('settings.collapseBashBlocks') || 'Collapse Bash Output by Default'}
            </div>
            <div className="text-xs text-muted-foreground leading-tight">
              {t('settings.collapseBashBlocksDesc') ||
                'Automatically collapse bash command output blocks to save space'}
            </div>
          </div>
          <div
            className={cn(
              'w-9 h-5 rounded-full transition-colors relative shrink-0',
              collapseBashBlocks ? 'bg-primary' : 'bg-muted'
            )}
          >
            <div
              className={cn(
                'absolute top-1 w-3 h-3 rounded-full bg-white transition-transform',
                collapseBashBlocks ? 'translate-x-5' : 'translate-x-1'
              )}
            />
          </div>
        </button>
      </CardContent>
    </Card>
  );
}
