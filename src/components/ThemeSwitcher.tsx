import { useTranslation } from 'react-i18next';
import { Monitor, Sun, Moon } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import type { AppSettings } from '@/types';

type Theme = AppSettings['theme'];

const themeIcons = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

const themeLabelKeys = {
  light: 'settings.themeLight',
  dark: 'settings.themeDark',
  system: 'settings.themeSystem',
};

export function ThemeSwitcher() {
  const { t } = useTranslation();
  const { theme, setTheme, resolvedTheme } = useTheme();

  const Icon = themeIcons[theme];

  return (
    <div className="flex items-center justify-between">
      <div>
        <label className="text-sm font-medium">{t('settings.theme') || 'Theme'}</label>
        <p className="text-xs text-muted-foreground">
          {t('settings.themeDescription') || 'Choose your preferred color scheme'}
        </p>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2 h-8">
            <Icon className="h-3.5 w-3.5" />
            <span className="text-xs">{t(themeLabelKeys[theme])}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {(Object.keys(themeIcons) as Theme[]).map((themeKey) => {
            const ThemeIcon = themeIcons[themeKey];
            return (
              <DropdownMenuItem key={themeKey} onClick={() => setTheme(themeKey)} className="gap-2">
                <ThemeIcon className="h-4 w-4" />
                <span>{t(themeLabelKeys[themeKey])}</span>
                {theme === themeKey && (
                  <span className="ml-auto text-xs text-muted-foreground">
                    {resolvedTheme === 'dark' ? t('settings.themeDark') : t('settings.themeLight')}
                  </span>
                )}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// Quick toggle button for sidebar/header
export function ThemeToggleButton() {
  const { toggleTheme, resolvedTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="h-9 w-9"
      title={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {resolvedTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
