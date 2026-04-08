import { NavLink } from 'react-router-dom';
import { 
  Plug, 
  Puzzle, 
  Palette, 
  FileText, 
  Globe, 
  Settings 
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Providers', href: '/providers', icon: Plug },
  { name: 'MCP Servers', href: '/mcp', icon: Puzzle },
  { name: 'Skills', href: '/skills', icon: Palette },
  { name: 'Prompts', href: '/prompts', icon: FileText },
  { name: 'Proxy', href: '/proxy', icon: Globe },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
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
            {item.name}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
