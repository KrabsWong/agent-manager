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
  // Use synchronously injected initial settings if available
  const initialSettings = window.__INITIAL_SETTINGS__ || {};

  const [theme, setThemeState] = useState<Theme>(initialSettings.theme || 'system');
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light');
  const [accentColor, setAccentColorState] = useState<AccentColor>(
    (initialSettings.accentColor as AccentColor) || defaultAccentColor
  );
  const isLoaded = true;

  // Verify settings are correct on mount (in case preload failed)
  useEffect(() => {
    const verifySettings = async () => {
      try {
        const settings = (await window.electronAPI.invoke('settings:get')) as
          | { theme?: Theme; accentColor?: AccentColor }
          | undefined;

        if (settings?.theme && settings.theme !== theme) {
          setThemeState(settings.theme);
        }
        if (settings?.accentColor && settings.accentColor !== accentColor) {
          setAccentColorState(settings.accentColor as AccentColor);
        }
      } catch (error) {
        console.error('Failed to verify theme settings:', error);
      }
    };

    // Only verify if we didn't get initial settings from preload
    if (!window.__INITIAL_SETTINGS__) {
      verifySettings();
    }
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
