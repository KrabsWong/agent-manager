import { NavLink } from 'react-router-dom';
import { Plug, Puzzle, Palette, FileText, Globe, History, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'nav.providers', href: '/providers', icon: Plug },
  { name: 'nav.mcpServers', href: '/mcp', icon: Puzzle },
  { name: 'nav.skills', href: '/skills', icon: Palette },
  { name: 'nav.prompts', href: '/prompts', icon: FileText },
  { name: 'nav.proxy', href: '/proxy', icon: Globe },
  { name: 'nav.sessions', href: '/sessions', icon: History },
  { name: 'nav.settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const { t } = useTranslation();
  return (
    <div className="flex w-64 flex-col border-r bg-card">
      <div className="flex h-16 items-center border-b px-6">
        <h1 className="text-lg font-semibold">CC Switch</h1>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {navigation.map((item) => (
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
    </div>
  );
}
