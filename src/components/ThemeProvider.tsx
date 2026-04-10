import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { AppSettings } from '@/types';
import {
  type AccentColor,
  defaultAccentColor,
  applyAccentColor,
  resetAccentColor,
} from '@/lib/theme/colors';

type Theme = AppSettings['theme'];
type ResolvedTheme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  accentColor: AccentColor;
  setAccentColor: (color: AccentColor) => void;
  resetAccentColor: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light');
  const [accentColor, setAccentColorState] = useState<AccentColor>(defaultAccentColor);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load theme and accent color from settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = (await window.electronAPI.invoke('settings:get')) as
          | { theme?: Theme; accentColor?: AccentColor }
          | undefined;

        if (settings?.theme) {
          setThemeState(settings.theme);
        }
        if (settings?.accentColor) {
          setAccentColorState(settings.accentColor);
        }
        setIsLoaded(true);
      } catch (error) {
        console.error('Failed to load theme settings:', error);
        setIsLoaded(true);
      }
    };

    loadSettings();
  }, []);

  // Apply theme and accent color to document
  useEffect(() => {
    if (!isLoaded) return;

    const applyTheme = () => {
      let newResolvedTheme: ResolvedTheme;

      if (theme === 'system') {
        // Check system preference
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        newResolvedTheme = systemDark ? 'dark' : 'light';
      } else {
        newResolvedTheme = theme;
      }

      setResolvedTheme(newResolvedTheme);

      // Apply class to document
      if (newResolvedTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }

      // Apply accent color
      applyAccentColor(accentColor, newResolvedTheme === 'dark');
    };

    applyTheme();
  }, [theme, accentColor, isLoaded]);

  // Listen for system theme changes
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      const newTheme = e.matches ? 'dark' : 'light';
      setResolvedTheme(newTheme);
      if (newTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      // Re-apply accent color with new theme
      applyAccentColor(accentColor, newTheme === 'dark');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, accentColor]);

  const setTheme = async (newTheme: Theme) => {
    try {
      setThemeState(newTheme);
      await window.electronAPI.invoke('settings:update', { theme: newTheme });
    } catch (error) {
      console.error('Failed to save theme:', error);
    }
  };

  const setAccentColor = async (newColor: AccentColor) => {
    try {
      setAccentColorState(newColor);
      await window.electronAPI.invoke('settings:update', { accentColor: newColor });
      // Apply immediately
      applyAccentColor(newColor, resolvedTheme === 'dark');
    } catch (error) {
      console.error('Failed to save accent color:', error);
    }
  };

  const handleResetAccentColor = () => {
    try {
      setAccentColorState(defaultAccentColor);
      window.electronAPI.invoke('settings:update', { accentColor: defaultAccentColor });
      resetAccentColor();
    } catch (error) {
      console.error('Failed to reset accent color:', error);
    }
  };

  const toggleTheme = () => {
    const themes: Theme[] = ['light', 'dark', 'system'];
    const currentIndex = themes.indexOf(theme);
    const nextTheme = themes[(currentIndex + 1) % themes.length];
    setTheme(nextTheme);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        resolvedTheme,
        setTheme,
        toggleTheme,
        accentColor,
        setAccentColor,
        resetAccentColor: handleResetAccentColor,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
