import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Settings, Sparkles, Monitor } from 'lucide-react';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { ColorPicker } from '@/components/ColorPicker';
import { TerminalSelector } from '@/components/TerminalSelector';
import { useTheme } from '@/components/ThemeProvider';
import { useVersion } from '@/hooks/useVersion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  const [activeTab, setActiveTab] = useState('general');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>{t('settings.title')}</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Tab Navigation */}
          <div className="px-6 border-b">
            <TabsList className="w-full justify-start rounded-none bg-transparent p-0 h-10 gap-6">
              <TabsTrigger
                value="general"
                className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 py-2 h-10 gap-2"
              >
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">{t('settings.generalTitle')}</span>
                <span className="sm:hidden">
                  {t('settings.generalTitle')?.slice(0, 2) || '通用'}
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="experience"
                className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 py-2 h-10 gap-2"
              >
                <Sparkles className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {t('settings.experienceTitle') || 'Experience'}
                </span>
                <span className="sm:hidden">
                  {t('settings.experienceTitle')?.slice(0, 2) || '体验'}
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="terminal"
                className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 py-2 h-10 gap-2"
              >
                <Monitor className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {t('settings.terminalTitle') || 'Terminal'}
                </span>
                <span className="sm:hidden">
                  {t('settings.terminalTitle')?.slice(0, 2) || '终端'}
                </span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Tab Content */}
          <div className="px-6 py-4 overflow-y-auto max-h-[60vh]">
            <TabsContent value="general" className="mt-0 space-y-6">
              <GeneralSettings accentColor={accentColor} onAccentColorChange={setAccentColor} />
            </TabsContent>

            <TabsContent value="experience" className="mt-0">
              <ExperienceSettings />
            </TabsContent>

            <TabsContent value="terminal" className="mt-0">
              <TerminalSettings />
            </TabsContent>
          </div>
        </Tabs>

        {/* Version */}
        {version && (
          <div className="text-center py-3 text-[10px] text-muted-foreground border-t">
            v{version}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// 通用设置
import type { AccentColor } from '@/lib/theme/colors';

interface GeneralSettingsProps {
  accentColor: AccentColor;
  onAccentColorChange: (color: AccentColor) => void;
}

function GeneralSettings({ accentColor, onAccentColorChange }: GeneralSettingsProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      {/* Language Section */}
      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-medium">{t('settings.language')}</h3>
          <p className="text-xs text-muted-foreground">{t('settings.languageDescription')}</p>
        </div>
        <LanguageSwitcher />
      </section>

      {/* Divider */}
      <div className="h-px bg-border/60" />

      {/* Theme Section */}
      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-medium">{t('settings.theme')}</h3>
          <p className="text-xs text-muted-foreground">{t('settings.themeDescription')}</p>
        </div>
        <ThemeSwitcher />
      </section>

      {/* Divider */}
      <div className="h-px bg-border/60" />

      {/* Accent Color Section */}
      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-medium">{t('settings.accentColor') || 'Accent Color'}</h3>
          <p className="text-xs text-muted-foreground">
            {t('settings.selectAccentColor') || 'Select your preferred accent color'}
          </p>
        </div>
        <ColorPicker value={accentColor} onChange={onAccentColorChange} />
      </section>
    </div>
  );
}

// 体验特性设置
function ExperienceSettings() {
  const { t } = useTranslation();
  const { enableTitleMarquee, toggleTitleMarquee, collapseBashBlocks, toggleCollapseBashBlocks } =
    useExperienceStore();

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {t('settings.experienceDescription') ||
          'Optional features to enhance your browsing experience'}
      </p>

      {/* Title Marquee Toggle */}
      <button
        onClick={toggleTitleMarquee}
        className={cn(
          'w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left',
          enableTitleMarquee
            ? 'border-primary/50 bg-primary/5'
            : 'border-border hover:border-primary/30 hover:bg-accent/50'
        )}
      >
        <div
          className={cn(
            'flex items-center justify-center w-9 h-9 rounded-md transition-colors shrink-0',
            enableTitleMarquee
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground'
          )}
        >
          <span className="text-sm font-bold">T</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm">
            {t('settings.titleMarquee') || 'Title Marquee Effect'}
          </div>
          <div className="text-xs text-muted-foreground">
            {t('settings.titleMarqueeDesc') ||
              'Hover over long session titles to auto-scroll and see full text'}
          </div>
        </div>
        <div
          className={cn(
            'w-10 h-5 rounded-full transition-colors relative shrink-0',
            enableTitleMarquee ? 'bg-primary' : 'bg-muted'
          )}
        >
          <div
            className={cn(
              'absolute top-1 w-3 h-3 rounded-full bg-white transition-transform',
              enableTitleMarquee ? 'translate-x-6' : 'translate-x-1'
            )}
          />
        </div>
      </button>

      {/* Collapse Bash Blocks Toggle */}
      <button
        onClick={toggleCollapseBashBlocks}
        className={cn(
          'w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left',
          collapseBashBlocks
            ? 'border-primary/50 bg-primary/5'
            : 'border-border hover:border-primary/30 hover:bg-accent/50'
        )}
      >
        <div
          className={cn(
            'flex items-center justify-center w-9 h-9 rounded-md transition-colors shrink-0',
            collapseBashBlocks
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground'
          )}
        >
          <span className="text-sm font-mono">$_</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm">
            {t('settings.collapseBashBlocks') || 'Collapse Bash Output by Default'}
          </div>
          <div className="text-xs text-muted-foreground">
            {t('settings.collapseBashBlocksDesc') ||
              'Automatically collapse bash command output blocks to save space'}
          </div>
        </div>
        <div
          className={cn(
            'w-10 h-5 rounded-full transition-colors relative shrink-0',
            collapseBashBlocks ? 'bg-primary' : 'bg-muted'
          )}
        >
          <div
            className={cn(
              'absolute top-1 w-3 h-3 rounded-full bg-white transition-transform',
              collapseBashBlocks ? 'translate-x-6' : 'translate-x-1'
            )}
          />
        </div>
      </button>
    </div>
  );
}

// Terminal settings component
function TerminalSettings() {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium">{t('settings.terminalTitle') || 'Terminal'}</h3>
        <p className="text-xs text-muted-foreground">
          {t('settings.terminalDescription') || 'Choose your preferred terminal application'}
        </p>
      </div>
      <TerminalSelector />
    </div>
  );
}
