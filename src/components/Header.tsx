import { useState } from 'react';
import { Settings, PanelLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { SettingsDialog } from './SettingsDialog';
import { APP_LABELS, APP_COLORS } from '@/config/apps';
import { getAppIcon } from './AppIcons';
import type { AppType } from '@/types';

interface HeaderProps {
  selectedApp: AppType;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}

export function Header({ selectedApp, sidebarCollapsed, onToggleSidebar }: HeaderProps) {
  const { t } = useTranslation();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
      {/* 顶部导航栏 - pl-[76px] 为 macOS 红黄绿按钮预留空间，z-50 确保在 drag region 之上 */}
      <header className="h-10 border-b border-border/50 bg-card flex items-start justify-between pl-[76px] pr-4 pt-1.5 relative z-50">
        {/* 左侧：[收起/展开按钮] [Yes Sessions] - [App图标+名字]（收起时） */}
        <div className="flex items-center gap-3">
          {/* 收起/展开按钮 */}
          <button
            onClick={onToggleSidebar}
            className={cn(
              'flex items-center justify-center w-8 h-8 rounded-lg transition-colors app-no-drag',
              'text-muted-foreground hover:bg-primary-muted hover:text-primary'
            )}
            title={sidebarCollapsed ? t('sidebar.expand') : t('sidebar.collapse')}
          >
            <PanelLeft className={cn(
              "h-4 w-4 transition-transform duration-200",
              sidebarCollapsed && "-scale-x-100"
            )} />
          </button>

          {/* Yes Sessions 文字 */}
          <span className="font-semibold text-base">Yes Sessions</span>

          {/* 收起状态下显示 App 图标和名字 - 带渐变动效 */}
          <div
            className={cn(
              "flex items-center gap-2 overflow-hidden transition-all duration-300 ease-in-out",
              sidebarCollapsed
                ? "opacity-100 max-w-[200px] translate-x-0"
                : "opacity-0 max-w-0 -translate-x-2 pointer-events-none"
            )}
          >
            <span className="text-muted-foreground shrink-0">-</span>
            <div className="flex items-center gap-2 shrink-0">
              <span className={APP_COLORS[selectedApp]}>
                {getAppIcon(selectedApp, 18)}
              </span>
              <span className="font-medium text-base whitespace-nowrap">{APP_LABELS[selectedApp]}</span>
            </div>
          </div>
        </div>

        {/* 右侧：设置按钮 */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSettingsOpen(true)}
            className={cn(
              'flex items-center justify-center w-9 h-9 rounded-lg transition-colors app-no-drag',
              'text-muted-foreground hover:bg-primary-muted hover:text-primary',
              'focus:outline-none focus:ring-2 focus:ring-primary-ring'
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
