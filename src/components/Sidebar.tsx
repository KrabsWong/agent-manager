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

  // 只有一个导航项时不需要显示收起按钮，也不需要可折叠功能
  const showCollapseButton = mainNavigation.length > 1;

  // 单导航时固定为图标模式（更紧凑），多导航时可折叠
  const sidebarWidth = !showCollapseButton ? 'w-14' : isCollapsed ? 'w-20' : 'w-52';
  const contentPadding = !showCollapseButton ? 'p-2' : isCollapsed ? 'p-3' : 'p-4';

  return (
    <div
      className={cn(
        'flex flex-col border-r bg-card transition-all duration-300 ease-in-out',
        sidebarWidth
      )}
    >
      {/* Header: Logo + Title */}
      <div className={!showCollapseButton ? 'pt-4' : 'pt-8'}>
        <div
          className={cn(
            'flex items-center justify-center pb-4',
            !showCollapseButton ? 'px-0' : isCollapsed ? 'px-0' : 'px-6'
          )}
        >
          <div
            className={cn(
              'flex items-center',
              !showCollapseButton ? 'gap-0' : isCollapsed ? 'gap-0' : 'gap-3'
            )}
          >
            <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 via-purple-500 to-pink-500 shadow-lg shadow-purple-500/20 flex-shrink-0">
              <MessagesSquare className="h-4 w-4 text-white" />
            </div>
            <span
              className={cn(
                'text-lg font-semibold whitespace-nowrap overflow-hidden transition-all duration-300 ease-out',
                !showCollapseButton || isCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'
              )}
            >
              Yes, Sessions
            </span>
          </div>
        </div>
        <div
          className={cn('border-b', !showCollapseButton ? 'mx-3' : isCollapsed ? 'mx-4' : 'mx-6')}
        />
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
                !showCollapseButton
                  ? 'justify-center w-9 h-9 mx-auto'
                  : isCollapsed
                    ? 'justify-center w-10 h-10 mx-auto'
                    : 'gap-3 px-3 py-2 text-sm font-medium',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )
            }
            title={!showCollapseButton || isCollapsed ? t(item.name) : undefined}
          >
            <item.icon className="h-4 w-4 flex-shrink-0" />
            <span
              className={cn(
                'whitespace-nowrap overflow-hidden transition-all duration-300 ease-out',
                !showCollapseButton || isCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'
              )}
            >
              {t(item.name)}
            </span>
          </NavLink>
        ))}
      </nav>

      {/* 分隔线 + 设置区域 */}
      <div
        className={cn('border-t', !showCollapseButton ? 'mx-3' : isCollapsed ? 'mx-4' : 'mx-6')}
      />
      <div className={cn('space-y-1', contentPadding)}>
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              'flex items-center rounded-lg transition-colors',
              !showCollapseButton
                ? 'justify-center w-9 h-9 mx-auto'
                : isCollapsed
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
              !showCollapseButton || isCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'
            )}
          >
            {t('nav.settings')}
          </span>
        </NavLink>
      </div>

      {/* 底部填充 - 单导航时占据剩余空间 */}
      {!showCollapseButton && <div className="flex-1" />}

      {/* 底部：收起/展开按钮（仅多导航时显示） */}
      {showCollapseButton && (
        <>
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
        </>
      )}
    </div>
  );
}
