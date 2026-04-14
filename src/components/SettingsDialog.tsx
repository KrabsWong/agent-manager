import { useTranslation } from 'react-i18next';
import { Type, Terminal } from 'lucide-react';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { ColorPicker } from '@/components/ColorPicker';
import { useTheme } from '@/components/ThemeProvider';
import { useVersion } from '@/hooks/useVersion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useExperienceStore } from '@/stores/experience';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { t } = useTranslation();
  const { accentColor, setAccentColor } = useTheme();
  const version = useVersion();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('settings.title')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t('settings.generalTitle')}</CardTitle>
              <CardDescription className="text-xs">
                {t('settings.generalDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <LanguageSwitcher />
              <ThemeSwitcher />
              <ColorPicker value={accentColor} onChange={setAccentColor} />
            </CardContent>
          </Card>

          <ExperienceSettings />
        </div>

        {/* Version */}
        {version && (
          <div className="text-center pt-4 text-[10px] text-muted-foreground">v{version}</div>
        )}
      </DialogContent>
    </Dialog>
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
