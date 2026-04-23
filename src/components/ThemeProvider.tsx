/**
 * Theme Provider
 *
 * 从 useSettingsStore 读取主题状态，保持 DOM 操作和 context 提供
 */

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useSettingsStore, type Theme } from '@/stores/settings';
import {
  type AccentColor,
  applyAccentColor,
  resetAccentColor,
} from '@/lib/theme/colors';

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
  // 从 Store 读取状态
  const {
    theme: storeTheme,
    accentColor: storeAccentColor,
    setTheme: storeSetTheme,
    toggleTheme: storeToggleTheme,
    setAccentColor: storeSetAccentColor,
    resetAccentColor: storeResetAccentColor,
  } = useSettingsStore();

  // 计算 resolvedTheme
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => {
    if (storeTheme === 'dark') return 'dark';
    if (storeTheme === 'light') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // 初始化时应用主题
  useEffect(() => {
    const newResolvedTheme: ResolvedTheme =
      storeTheme === 'system'
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
        : storeTheme;

    setResolvedTheme(newResolvedTheme);

    // Apply to document
    if (newResolvedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Apply accent color
    applyAccentColor(storeAccentColor, newResolvedTheme === 'dark');
  }, [storeTheme, storeAccentColor]);

  // 监听系统主题变化
  useEffect(() => {
    if (storeTheme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      const newTheme = e.matches ? 'dark' : 'light';
      setResolvedTheme(newTheme);
      if (newTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      applyAccentColor(storeAccentColor, newTheme === 'dark');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [storeTheme, storeAccentColor]);

  // 包装 actions 以保持 API 兼容性
  const setTheme = async (theme: Theme) => {
    await storeSetTheme(theme);
  };

  const setAccentColor = async (color: AccentColor) => {
    await storeSetAccentColor(color);
  };

  const handleResetAccentColor = async () => {
    await storeResetAccentColor();
    resetAccentColor();
  };

  const toggleTheme = () => {
    storeToggleTheme();
  };

  return (
    <ThemeContext.Provider
      value={{
        theme: storeTheme,
        resolvedTheme,
        setTheme,
        toggleTheme,
        accentColor: storeAccentColor,
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
