import { NavLink } from 'react-router-dom';
import { History, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { useVersion } from '@/hooks/useVersion';

export function Sidebar() {
  const { t } = useTranslation();
  const version = useVersion();

  return (
    <div className="flex flex-col bg-card w-52">
      {/* Header: Logo + Title */}
      <div className="pt-8">
        <div className="flex items-center justify-center pb-4 px-6">
          <div className="flex items-center gap-3">
            <img
              src="./logo.png"
              alt="Yes Sessions Logo"
              className="w-10 h-10 rounded-lg shadow-lg"
            />
            <span className="text-lg font-semibold whitespace-nowrap">Yes, Sessions</span>
          </div>
        </div>
      </div>

      {/* 主菜单导航 */}
      <nav className="p-3 space-y-1">
        <NavLink
          to="/sessions"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )
          }
        >
          <History className="h-4 w-4 flex-shrink-0" />
          <span>{t('nav.sessions')}</span>
        </NavLink>
      </nav>

      {/* 设置区域 */}
      <div className="p-3 space-y-1">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )
          }
        >
          <Settings className="h-4 w-4 flex-shrink-0" />
          <span>{t('nav.settings')}</span>
        </NavLink>
      </div>

      {/* 底部填充 */}
      <div className="flex-1" />

      {/* 版本号 */}
      {version && (
        <div className="text-center text-xs text-muted-foreground/50 pb-3 px-4">
          <span>v{version}</span>
        </div>
      )}
    </div>
  );
}
