import { useState } from 'react';
import { Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { SettingsDialog } from './SettingsDialog';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { APP_ORDER, APP_LABELS, APP_COLORS, isAppSupported } from '@/config/apps';
import { getAppIcon } from './AppIcons';
import type { AppType } from '@/types';

interface HeaderProps {
  selectedApp: AppType;
  onAppChange: (app: AppType) => void;
}

export function Header({ selectedApp, onAppChange }: HeaderProps) {
  const { t } = useTranslation();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
      {/* 顶部导航栏 - pt-4 为系统按钮预留更多空间，z-50 确保在 drag region 之上 */}
      <header className="h-20 border-b border-border/50 bg-card flex items-center justify-between px-6 pt-4 relative z-50 app-no-drag">
        {/* 左侧：Logo + 标题 */}
        <div className="flex items-center gap-3">
          <img src="./logo.png" alt="Yes Sessions Logo" className="w-8 h-8 rounded-lg shadow-md" />
          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-base">Yes, Sessions</span>
          </div>
        </div>

        {/* 右侧：应用选择器 + 设置按钮 */}
        <div className="flex items-center gap-2">
          <Select value={selectedApp} onValueChange={(value) => onAppChange(value as AppType)}>
            <SelectTrigger className="w-52 h-9 app-no-drag">
              <div className="flex items-center gap-2">
                <span className={APP_COLORS[selectedApp]}>{getAppIcon(selectedApp)}</span>
                <span className="truncate">{APP_LABELS[selectedApp]}</span>
              </div>
            </SelectTrigger>
            <SelectContent className="min-w-[12rem] app-no-drag">
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
                      <span className={APP_COLORS[app]}>{getAppIcon(app)}</span>
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

          <button
            onClick={() => setSettingsOpen(true)}
            className={cn(
              'flex items-center justify-center w-9 h-9 rounded-lg transition-colors app-no-drag',
              'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              'focus:outline-none focus:ring-2 focus:ring-primary/50'
            )}
            title={t('nav.settings')}
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* 设置对话框 */}
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}
