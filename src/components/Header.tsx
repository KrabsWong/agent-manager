import { useState } from 'react';
import { Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { SettingsDialog } from './SettingsDialog';

interface HeaderProps {
  // Empty props - app selector moved to sidebar
}

export function Header({}: HeaderProps) {
  const { t } = useTranslation();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
      {/* 顶部导航栏 - pt-4 为系统按钮预留更多空间，z-50 确保在 drag region 之上，Header 本身可拖动 */}
      <header className="h-16 border-b border-border/50 bg-card flex items-center justify-between px-6 pt-4 relative z-50">
        {/* 左侧：Logo + 标题 */}
        <div className="flex items-center gap-3">
          <img src="./logo.png" alt="Yes Sessions Logo" className="w-7 h-7 rounded-lg shadow-md" />
          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-base">Yes, Sessions</span>
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
