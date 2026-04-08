import { NavLink } from 'react-router-dom';
import { Puzzle, Palette, History, Settings, MessagesSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

// 主菜单项（显示在导航栏中）
const mainNavigation = [
  { name: 'nav.sessions', href: '/sessions', icon: History },
  { name: 'nav.mcpServers', href: '/mcp', icon: Puzzle },
  { name: 'nav.skills', href: '/skills', icon: Palette },
];

export function Sidebar() {
  const { t } = useTranslation();
  return (
    <div className="flex w-64 flex-col border-r bg-card">
      <div className="pt-8">
        <div className="flex items-center gap-3 px-6 pb-4">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 via-purple-500 to-pink-500 shadow-lg shadow-purple-500/20">
            <MessagesSquare className="h-4 w-4 text-white" />
          </div>
          <h1 className="text-lg font-semibold">Yes, Sessions</h1>
        </div>
        <div className="border-b mx-6" />
      </div>

      {/* 主菜单导航 */}
      <nav className="flex-1 space-y-1 p-4">
        {mainNavigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )
            }
          >
            <item.icon className="h-4 w-4" />
            {t(item.name)}
          </NavLink>
        ))}
      </nav>

      {/* 底部设置图标 */}
      <div className="p-4 border-t">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              'flex items-center justify-center w-10 h-10 rounded-lg transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )
          }
          title={t('nav.settings')}
        >
          <Settings className="h-5 w-5" />
        </NavLink>
      </div>
    </div>
  );
}
