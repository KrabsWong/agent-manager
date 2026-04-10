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
import { useNavigationStore, type NavItem } from '@/stores/navigation';

// 所有可用的导航项
const allNavigation: {
  id: NavItem;
  name: string;
  href: string;
  icon: React.ElementType;
  end: boolean;
}[] = [
  { id: 'sessions', name: 'nav.sessions', href: '/sessions', icon: History, end: false },
  { id: 'mcp', name: 'nav.mcpServers', href: '/mcp', icon: Puzzle, end: false },
  { id: 'skills', name: 'nav.skills', href: '/skills', icon: Palette, end: false },
];

export function Sidebar() {
  const { t } = useTranslation();
  const { isCollapsed, toggle } = useSidebarStore();
  const { enabledItems } = useNavigationStore();

  // 根据启用的导航项过滤
  const mainNavigation = allNavigation.filter((item) => enabledItems.includes(item.id));

  // 只有一个导航项时不需要显示收起按钮
  const showCollapseButton = mainNavigation.length > 1;

  // 统一宽度：折叠时 w-14，展开时 w-52（单导航和多导航保持一致）
  const sidebarWidth = isCollapsed ? 'w-14' : 'w-52';
  const contentPadding = isCollapsed ? 'p-2' : 'p-3';

  return (
    <div
      className={cn('flex flex-col bg-card transition-all duration-300 ease-in-out', sidebarWidth)}
    >
      {/* Header: Logo + Title */}
      <div className="pt-8">
        <div className={cn('flex items-center justify-center pb-4', isCollapsed ? 'px-0' : 'px-6')}>
          <div className={cn('flex items-center', isCollapsed ? 'gap-0' : 'gap-3')}>
            <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 via-purple-500 to-pink-500 shadow-lg shadow-purple-500/20 flex-shrink-0">
              <MessagesSquare className="h-4 w-4 text-white" />
            </div>
            <span
              className={cn(
                'text-lg font-semibold whitespace-nowrap overflow-hidden transition-all duration-300 ease-out',
                isCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'
              )}
            >
              Yes, Sessions
            </span>
          </div>
        </div>
      </div>

      {/* 主菜单导航 */}
      <nav className={cn('space-y-1', contentPadding)}>
        {mainNavigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            end={item.end}
            className={({ isActive }) =>
              cn(
                'flex items-center rounded-lg transition-colors',
                isCollapsed
                  ? 'justify-center w-9 h-9 mx-auto'
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
                isCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'
              )}
            >
              {t(item.name)}
            </span>
          </NavLink>
        ))}
      </nav>

      {/* 设置区域 */}
      <div className={cn('space-y-1', contentPadding)}>
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              'flex items-center rounded-lg transition-colors',
              isCollapsed
                ? 'justify-center w-9 h-9 mx-auto'
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
              isCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'
            )}
          >
            {t('nav.settings')}
          </span>
        </NavLink>
      </div>

      {/* 底部填充 */}
      <div className="flex-1" />

      {/* 底部：收起/展开按钮（仅多导航时显示） */}
      {showCollapseButton && (
        <div className={isCollapsed ? 'p-2' : 'p-4'}>
          <button
            onClick={toggle}
            className={cn(
              'flex items-center justify-center rounded-lg transition-colors text-muted-foreground hover:bg-accent hover:text-accent-foreground mx-auto',
              isCollapsed ? 'w-9 h-9' : 'w-full py-2'
            )}
            title={isCollapsed ? t('sidebar.expand') : t('sidebar.collapse')}
          >
            {isCollapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <>
                <PanelLeftClose className="h-4 w-4 mr-2" />
                <span className="text-sm">{t('sidebar.collapse')}</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
