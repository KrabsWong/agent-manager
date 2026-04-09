import { NavLink } from 'react-router-dom';
import {
  Puzzle,
  Palette,
  History,
  Settings,
  MessagesSquare,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { useSidebarStore } from '@/stores/sidebar';

// 主菜单项（显示在导航栏中）
const mainNavigation = [
  { name: 'nav.sessions', href: '/sessions', icon: History, end: false },
  { name: 'nav.mcpServers', href: '/mcp', icon: Puzzle, end: false },
  { name: 'nav.skills', href: '/skills', icon: Palette, end: false },
];

export function Sidebar() {
  const { t } = useTranslation();
  const { isCollapsed, toggle } = useSidebarStore();

  return (
    <div
      className={cn(
        'flex flex-col border-r bg-card transition-all duration-300 ease-in-out',
        isCollapsed ? 'w-[72px]' : 'w-64'
      )}
    >
      {/* Header: Logo + Title */}
      <div className="pt-8">
        <div className={cn('flex items-center pb-4', isCollapsed ? 'justify-center px-2' : 'px-6')}>
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 via-purple-500 to-pink-500 shadow-lg shadow-purple-500/20 flex-shrink-0">
              <MessagesSquare className="h-4 w-4 text-white" />
            </div>
            <span
              className={cn(
                'text-lg font-semibold whitespace-nowrap overflow-hidden transition-all duration-300 ease-out',
                isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'
              )}
            >
              Yes, Sessions
            </span>
          </div>
        </div>
        <div className={cn('border-b', isCollapsed ? 'mx-4' : 'mx-6')} />
      </div>

      {/* 主菜单导航 */}
      <nav className={cn('space-y-1', isCollapsed ? 'p-3' : 'p-4')}>
        {mainNavigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            end={item.end}
            className={({ isActive }) =>
              cn(
                'flex items-center rounded-lg transition-colors',
                isCollapsed
                  ? 'justify-center w-10 h-10 mx-auto'
                  : 'gap-3 px-3 py-2 text-sm font-medium',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )
            }
            title={isCollapsed ? t(item.name) : undefined}
          >
            <item.icon className="h-4 w-4 flex-shrink-0" />
            <span
              className={cn(
                'whitespace-nowrap overflow-hidden transition-all duration-300 ease-out',
                isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'
              )}
            >
              {t(item.name)}
            </span>
          </NavLink>
        ))}
      </nav>

      {/* 分隔线 + 设置区域 */}
      <div className={cn('border-t', isCollapsed ? 'mx-4' : 'mx-6')} />
      <div className={cn('space-y-1', isCollapsed ? 'p-3' : 'p-4')}>
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              'flex items-center rounded-lg transition-colors',
              isCollapsed
                ? 'justify-center w-10 h-10 mx-auto'
                : 'gap-3 px-3 py-2 text-sm font-medium',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )
          }
          title={t('nav.settings')}
        >
          <Settings className="h-4 w-4 flex-shrink-0" />
          <span
            className={cn(
              'whitespace-nowrap overflow-hidden transition-all duration-300 ease-out',
              isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'
            )}
          >
            {t('nav.settings')}
          </span>
        </NavLink>
      </div>

      {/* 底部：收起/展开按钮 */}
      <div className="flex-1" />
      <div className={cn('border-t', isCollapsed ? 'p-3' : 'p-4')}>
        <button
          onClick={toggle}
          className={cn(
            'flex items-center justify-center rounded-lg transition-colors text-muted-foreground hover:bg-accent hover:text-accent-foreground mx-auto',
            isCollapsed ? 'w-10 h-10' : 'w-full py-2'
          )}
          title={isCollapsed ? t('sidebar.expand') : t('sidebar.collapse')}
        >
          {isCollapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
}
