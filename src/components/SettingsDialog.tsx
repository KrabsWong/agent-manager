import { useState } from 'react';
import type { ReactNode } from 'react';
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
import { useSettingsStore } from '@/stores/settings';
import { type AppType } from '@/types';
import { APP_ORDER, APP_LABELS, APP_COLORS, isAppSupported } from '@/config/apps';
import { getAppIcon } from '@/components/AppIcons';
import { useToast } from '@/hooks/useToast';
import type { AccentColor } from '@/lib/theme/colors';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
      <DialogContent
        data-testid="settings-dialog"
        className="sm:max-w-xl max-h-[85vh] overflow-hidden p-0"
      >
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>{t('settings.title')}</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Tab Navigation */}
          <div className="px-6 border-b">
            <TabsList className="w-full justify-start rounded-none bg-transparent p-0 h-10 gap-6">
              <TabsTrigger
                value="general"
                data-testid="settings-tab-general"
                className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none px-0 py-2 h-10 gap-2"
              >
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">{t('settings.generalTitle')}</span>
                <span className="sm:hidden">{t('settings.generalTitle').slice(0, 2)}</span>
              </TabsTrigger>
              <TabsTrigger
                value="experience"
                data-testid="settings-tab-experience"
                className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none px-0 py-2 h-10 gap-2"
              >
                <Sparkles className="h-4 w-4" />
                <span className="hidden sm:inline">{t('settings.experienceTitle')}</span>
                <span className="sm:hidden">{t('settings.experienceTitle').slice(0, 2)}</span>
              </TabsTrigger>
              <TabsTrigger
                value="terminal"
                data-testid="settings-tab-terminal"
                className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none px-0 py-2 h-10 gap-2"
              >
                <Monitor className="h-4 w-4" />
                <span className="hidden sm:inline">{t('settings.terminalTitle')}</span>
                <span className="sm:hidden">{t('settings.terminalTitle').slice(0, 2)}</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Tab Content */}
          <div className="px-6 py-4 overflow-y-auto max-h-[60vh]">
            <TabsContent
              value="general"
              data-testid="settings-panel-general"
              className="mt-0 space-y-6"
            >
              <GeneralSettings accentColor={accentColor} onAccentColorChange={setAccentColor} />
            </TabsContent>

            <TabsContent
              value="experience"
              data-testid="settings-panel-experience"
              className="mt-0"
            >
              <ExperienceSettings />
            </TabsContent>

            <TabsContent value="terminal" data-testid="settings-panel-terminal" className="mt-0">
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

interface GeneralSettingsProps {
  accentColor: AccentColor;
  onAccentColorChange: (color: AccentColor) => void;
}

function GeneralSettings({ accentColor, onAccentColorChange }: GeneralSettingsProps) {
  const { t } = useTranslation();
  const { defaultApp, setDefaultApp } = useSettingsStore();
  const { toast } = useToast();

  return (
    <div className="space-y-6">
      {/* Language Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium">{t('settings.language')}</h3>
            <p className="text-xs text-muted-foreground">{t('settings.languageDescription')}</p>
          </div>
          <LanguageSwitcher />
        </div>
      </section>

      {/* Divider */}
      <div className="h-px bg-border/60" />

      {/* Theme Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium">{t('settings.theme')}</h3>
            <p className="text-xs text-muted-foreground">{t('settings.themeDescription')}</p>
          </div>
          <ThemeSwitcher />
        </div>
      </section>

      {/* Divider */}
      <div className="h-px bg-border/60" />

      {/* Accent Color Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium">{t('settings.accentColor')}</h3>
            <p className="text-xs text-muted-foreground">{t('settings.selectAccentColor')}</p>
          </div>
          <ColorPicker value={accentColor} onChange={onAccentColorChange} />
        </div>
      </section>

      {/* Divider */}
      <div className="h-px bg-border/60" />

      {/* Default Application Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium">{t('settings.defaultApp')}</h3>
            <p className="text-xs text-muted-foreground">{t('settings.defaultAppDescription')}</p>
          </div>
          <Select
            value={defaultApp || APP_ORDER[0]}
            onValueChange={(value) => {
              const newApp = value as AppType;
              setDefaultApp(newApp);
              toast({
                title: t('settings.defaultAppChanged'),
                description: APP_LABELS[newApp],
              });
            }}
          >
            <SelectTrigger className="w-[220px] h-8 text-sm">
              <SelectValue placeholder={t('settings.selectDefaultApp')} />
            </SelectTrigger>
            <SelectContent>
              {APP_ORDER.map((app) => {
                const supported = isAppSupported(app);
                return (
                  <SelectItem
                    key={app}
                    value={app}
                    disabled={!supported}
                    className={!supported ? 'opacity-50 cursor-not-allowed' : ''}
                  >
                    <div className="flex items-center gap-2">
                      <span className={APP_COLORS[app]}>{getAppIcon(app, 14)}</span>
                      <span>{APP_LABELS[app]}</span>
                      {!supported && (
                        <span className="text-xs text-muted-foreground ml-2">
                          ({t('sessions.comingSoon')})
                        </span>
                      )}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </section>
    </div>
  );
}

interface ToggleSettingItemProps {
  enabled: boolean;
  icon: ReactNode;
  title: string;
  description: string;
  onToggle: () => void;
}

function ToggleSettingItem({
  enabled,
  icon,
  title,
  description,
  onToggle,
}: ToggleSettingItemProps) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        'w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left',
        enabled
          ? 'border-primary border-opacity-50 bg-primary-muted'
          : 'border-border hover:border-primary-border hover:bg-accent/50'
      )}
    >
      <div
        className={cn(
          'flex items-center justify-center w-9 h-9 rounded-md transition-colors shrink-0',
          enabled ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
        )}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm">{title}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
      <div
        className={cn(
          'w-10 h-5 rounded-full transition-colors relative shrink-0',
          enabled ? 'bg-primary' : 'bg-muted'
        )}
      >
        <div
          className={cn(
            'absolute top-1 w-3 h-3 rounded-full bg-white transition-transform',
            enabled ? 'translate-x-6' : 'translate-x-1'
          )}
        />
      </div>
    </button>
  );
}

// 体验特性设置
function ExperienceSettings() {
  const { t } = useTranslation();
  const {
    enableTitleMarquee,
    toggleTitleMarquee,
    collapseBashBlocks,
    toggleCollapseBashBlocks,
    showThinkingContent,
    toggleShowThinkingContent,
    chatLayout,
    toggleChatLayout,
  } = useSettingsStore();
  const { toast } = useToast();

  const handleToggleTitleMarquee = () => {
    const newValue = !enableTitleMarquee;
    toggleTitleMarquee();
    toast({
      title: newValue ? t('settings.featureEnabled') : t('settings.featureDisabled'),
      description: t('settings.titleMarquee'),
    });
  };

  const handleToggleCollapseBashBlocks = () => {
    const newValue = !collapseBashBlocks;
    toggleCollapseBashBlocks();
    toast({
      title: newValue ? t('settings.featureEnabled') : t('settings.featureDisabled'),
      description: t('settings.collapseBashBlocks'),
    });
  };

  const handleToggleShowThinkingContent = () => {
    const newValue = !showThinkingContent;
    toggleShowThinkingContent();
    toast({
      title: newValue ? t('settings.featureEnabled') : t('settings.featureDisabled'),
      description: t('settings.showThinkingContent'),
    });
  };

  const handleToggleChatLayout = () => {
    const newValue = chatLayout === 'left' ? 'bubble' : 'left';
    toggleChatLayout();
    toast({
      title: t('settings.layoutChanged'),
      description: newValue === 'bubble' ? t('settings.bubbleLayout') : t('settings.leftLayout'),
    });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{t('settings.experienceDescription')}</p>

      <ToggleSettingItem
        enabled={enableTitleMarquee}
        icon={<span className="text-sm font-bold">T</span>}
        title={t('settings.titleMarquee')}
        description={t('settings.titleMarqueeDesc')}
        onToggle={handleToggleTitleMarquee}
      />

      <ToggleSettingItem
        enabled={collapseBashBlocks}
        icon={<span className="text-sm font-mono">$_</span>}
        title={t('settings.collapseBashBlocks')}
        description={t('settings.collapseBashBlocksDesc')}
        onToggle={handleToggleCollapseBashBlocks}
      />

      <ToggleSettingItem
        enabled={showThinkingContent}
        icon={<span className="text-sm">💭</span>}
        title={t('settings.showThinkingContent')}
        description={t('settings.showThinkingContentDesc')}
        onToggle={handleToggleShowThinkingContent}
      />

      <ToggleSettingItem
        enabled={chatLayout === 'bubble'}
        icon={<span className="text-sm">💬</span>}
        title={t('settings.chatLayout')}
        description={t('settings.chatLayoutDesc')}
        onToggle={handleToggleChatLayout}
      />
    </div>
  );
}

// Terminal settings component
function TerminalSettings() {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium">{t('settings.terminalTitle')}</h3>
        <p className="text-xs text-muted-foreground">{t('settings.terminalDescription')}</p>
      </div>
      <TerminalSelector />
    </div>
  );
}
