// 颜色 token 系统
// 提供预设颜色和颜色转换工具

export type AccentColor =
  | 'default'
  | 'pink'
  | 'rose'
  | 'red'
  | 'orange'
  | 'amber'
  | 'yellow'
  | 'lime'
  | 'green'
  | 'emerald'
  | 'teal'
  | 'cyan'
  | 'sky'
  | 'blue'
  | 'indigo'
  | 'violet'
  | 'purple'
  | 'fuchsia'
  | 'slate'
  | 'zinc'
  | 'neutral';

export interface ColorOption {
  id: AccentColor;
  name: string;
  base: string;
  light: {
    primary: string;
    foreground: string;
    secondary: string;
    accent: string;
  };
  dark: {
    primary: string;
    foreground: string;
    secondary: string;
    accent: string;
  };
}

interface HSL {
  h: number;
  s: number;
  l: number;
}

function parseHSL(hslStr: string): HSL {
  const parts = hslStr.trim().split(/\s+/);
  return {
    h: parseFloat(parts[0]),
    s: parseFloat(parts[1]),
    l: parseFloat(parts[2]),
  };
}

function toHSLString(hsl: HSL): string {
  return `${hsl.h} ${hsl.s}% ${hsl.l}%`;
}

// 预设颜色配置
export const accentColors: ColorOption[] = [
  {
    id: 'default',
    name: 'Default',
    base: '#000000',
    light: {
      primary: '222.2 47.4% 11.2%',
      foreground: '210 40% 98%',
      secondary: '210 40% 96.1%',
      accent: '210 40% 96.1%',
    },
    dark: {
      primary: '210 40% 98%',
      foreground: '222.2 47.4% 11.2%',
      secondary: '217.2 32.6% 17.5%',
      accent: '217.2 32.6% 17.5%',
    },
  },
  {
    id: 'pink',
    name: 'Pink',
    base: '#ec4899',
    light: {
      primary: '330 81% 60%',
      foreground: '0 0% 100%',
      secondary: '330 80% 94%',
      accent: '330 80% 96%',
    },
    dark: {
      primary: '330 80% 60%',
      foreground: '0 0% 100%',
      secondary: '330 60% 25%',
      accent: '330 60% 20%',
    },
  },
  {
    id: 'rose',
    name: 'Rose',
    base: '#f43f5e',
    light: {
      primary: '346 84% 60%',
      foreground: '0 0% 100%',
      secondary: '346 80% 94%',
      accent: '346 80% 96%',
    },
    dark: {
      primary: '346 80% 60%',
      foreground: '0 0% 100%',
      secondary: '346 60% 25%',
      accent: '346 60% 20%',
    },
  },
  {
    id: 'red',
    name: 'Red',
    base: '#ef4444',
    light: {
      primary: '0 84% 60%',
      foreground: '0 0% 100%',
      secondary: '0 80% 94%',
      accent: '0 80% 96%',
    },
    dark: {
      primary: '0 80% 60%',
      foreground: '0 0% 100%',
      secondary: '0 60% 25%',
      accent: '0 60% 20%',
    },
  },
  {
    id: 'orange',
    name: 'Orange',
    base: '#f97316',
    light: {
      primary: '24 95% 53%',
      foreground: '0 0% 100%',
      secondary: '24 90% 94%',
      accent: '24 90% 96%',
    },
    dark: {
      primary: '24 90% 55%',
      foreground: '0 0% 100%',
      secondary: '24 60% 25%',
      accent: '24 60% 20%',
    },
  },
  {
    id: 'amber',
    name: 'Amber',
    base: '#f59e0b',
    light: {
      primary: '38 92% 50%',
      foreground: '0 0% 100%',
      secondary: '38 90% 94%',
      accent: '38 90% 96%',
    },
    dark: {
      primary: '38 90% 55%',
      foreground: '0 0% 100%',
      secondary: '38 60% 25%',
      accent: '38 60% 20%',
    },
  },
  {
    id: 'yellow',
    name: 'Yellow',
    base: '#eab308',
    light: {
      primary: '48 96% 53%',
      foreground: '0 0% 100%',
      secondary: '48 90% 94%',
      accent: '48 90% 96%',
    },
    dark: {
      primary: '48 90% 55%',
      foreground: '0 0% 0%',
      secondary: '48 60% 25%',
      accent: '48 60% 20%',
    },
  },
  {
    id: 'lime',
    name: 'Lime',
    base: '#84cc16',
    light: {
      primary: '84 81% 44%',
      foreground: '0 0% 100%',
      secondary: '84 80% 94%',
      accent: '84 80% 96%',
    },
    dark: {
      primary: '84 80% 50%',
      foreground: '0 0% 0%',
      secondary: '84 60% 25%',
      accent: '84 60% 20%',
    },
  },
  {
    id: 'green',
    name: 'Green',
    base: '#22c55e',
    light: {
      primary: '142 71% 45%',
      foreground: '0 0% 100%',
      secondary: '142 70% 94%',
      accent: '142 70% 96%',
    },
    dark: {
      primary: '142 70% 50%',
      foreground: '0 0% 100%',
      secondary: '142 60% 25%',
      accent: '142 60% 20%',
    },
  },
  {
    id: 'emerald',
    name: 'Emerald',
    base: '#10b981',
    light: {
      primary: '160 84% 39%',
      foreground: '0 0% 100%',
      secondary: '160 80% 94%',
      accent: '160 80% 96%',
    },
    dark: {
      primary: '160 80% 45%',
      foreground: '0 0% 100%',
      secondary: '160 60% 25%',
      accent: '160 60% 20%',
    },
  },
  {
    id: 'teal',
    name: 'Teal',
    base: '#14b8a6',
    light: {
      primary: '168 76% 42%',
      foreground: '0 0% 100%',
      secondary: '168 70% 94%',
      accent: '168 70% 96%',
    },
    dark: {
      primary: '168 70% 45%',
      foreground: '0 0% 100%',
      secondary: '168 60% 25%',
      accent: '168 60% 20%',
    },
  },
  {
    id: 'cyan',
    name: 'Cyan',
    base: '#06b6d4',
    light: {
      primary: '189 94% 43%',
      foreground: '0 0% 100%',
      secondary: '189 80% 94%',
      accent: '189 80% 96%',
    },
    dark: {
      primary: '189 90% 48%',
      foreground: '0 0% 100%',
      secondary: '189 60% 25%',
      accent: '189 60% 20%',
    },
  },
  {
    id: 'sky',
    name: 'Sky',
    base: '#0ea5e9',
    light: {
      primary: '199 89% 48%',
      foreground: '0 0% 100%',
      secondary: '199 80% 94%',
      accent: '199 80% 96%',
    },
    dark: {
      primary: '199 85% 55%',
      foreground: '0 0% 100%',
      secondary: '199 60% 25%',
      accent: '199 60% 20%',
    },
  },
  {
    id: 'blue',
    name: 'Blue',
    base: '#3b82f6',
    light: {
      primary: '217 91% 60%',
      foreground: '0 0% 100%',
      secondary: '217 80% 94%',
      accent: '217 80% 96%',
    },
    dark: {
      primary: '217 85% 60%',
      foreground: '0 0% 100%',
      secondary: '217 60% 25%',
      accent: '217 60% 20%',
    },
  },
  {
    id: 'indigo',
    name: 'Indigo',
    base: '#6366f1',
    light: {
      primary: '239 84% 67%',
      foreground: '0 0% 100%',
      secondary: '239 80% 94%',
      accent: '239 80% 96%',
    },
    dark: {
      primary: '239 80% 65%',
      foreground: '0 0% 100%',
      secondary: '239 60% 25%',
      accent: '239 60% 20%',
    },
  },
  {
    id: 'violet',
    name: 'Violet',
    base: '#8b5cf6',
    light: {
      primary: '258 90% 66%',
      foreground: '0 0% 100%',
      secondary: '258 80% 94%',
      accent: '258 80% 96%',
    },
    dark: {
      primary: '258 85% 65%',
      foreground: '0 0% 100%',
      secondary: '258 60% 25%',
      accent: '258 60% 20%',
    },
  },
  {
    id: 'purple',
    name: 'Purple',
    base: '#a855f7',
    light: {
      primary: '270 67% 57%',
      foreground: '0 0% 100%',
      secondary: '270 60% 94%',
      accent: '270 60% 96%',
    },
    dark: {
      primary: '270 65% 60%',
      foreground: '0 0% 100%',
      secondary: '270 50% 25%',
      accent: '270 50% 20%',
    },
  },
  {
    id: 'fuchsia',
    name: 'Fuchsia',
    base: '#d946ef',
    light: {
      primary: '292 84% 61%',
      foreground: '0 0% 100%',
      secondary: '292 80% 94%',
      accent: '292 80% 96%',
    },
    dark: {
      primary: '292 80% 60%',
      foreground: '0 0% 100%',
      secondary: '292 60% 25%',
      accent: '292 60% 20%',
    },
  },
  {
    id: 'slate',
    name: 'Slate',
    base: '#64748b',
    light: {
      primary: '215 25% 47%',
      foreground: '0 0% 100%',
      secondary: '215 20% 94%',
      accent: '215 20% 96%',
    },
    dark: {
      primary: '215 20% 55%',
      foreground: '0 0% 100%',
      secondary: '215 20% 25%',
      accent: '215 20% 20%',
    },
  },
  {
    id: 'zinc',
    name: 'Zinc',
    base: '#71717a',
    light: {
      primary: '240 5% 46%',
      foreground: '0 0% 100%',
      secondary: '240 5% 94%',
      accent: '240 5% 96%',
    },
    dark: {
      primary: '240 5% 55%',
      foreground: '0 0% 100%',
      secondary: '240 5% 25%',
      accent: '240 5% 20%',
    },
  },
  {
    id: 'neutral',
    name: 'Neutral',
    base: '#737373',
    light: {
      primary: '0 0% 45%',
      foreground: '0 0% 100%',
      secondary: '0 0% 94%',
      accent: '0 0% 96%',
    },
    dark: {
      primary: '0 0% 55%',
      foreground: '0 0% 100%',
      secondary: '0 0% 25%',
      accent: '0 0% 20%',
    },
  },
];

// 获取默认颜色
export const defaultAccentColor: AccentColor = 'default';

// 根据颜色 ID 获取颜色配置
export function getColorById(id: AccentColor): ColorOption {
  return accentColors.find((color) => color.id === id) || accentColors[0];
}

// 应用颜色到 CSS 变量
export function applyAccentColor(colorId: AccentColor, isDark: boolean): void {
  // 如果是默认颜色，重置为 CSS 默认变量
  if (colorId === 'default') {
    resetAccentColor();
    return;
  }

  const color = getColorById(colorId);
  const theme = isDark ? color.dark : color.light;
  const primaryHSL = parseHSL(theme.primary);

  const root = document.documentElement;
  root.style.setProperty('--primary', theme.primary);
  root.style.setProperty('--primary-foreground', theme.foreground);
  root.style.setProperty('--secondary', theme.secondary);
  root.style.setProperty('--secondary-foreground', isDark ? '0 0% 100%' : color.light.primary);
  root.style.setProperty('--accent', theme.accent);
  root.style.setProperty('--accent-foreground', isDark ? '0 0% 100%' : color.light.primary);
  root.style.setProperty('--ring', theme.primary);

  // 派生色：从 primary 计算出的变体
  root.style.setProperty('--primary-hover', toHSLString({ h: primaryHSL.h, s: primaryHSL.s, l: isDark ? Math.min(primaryHSL.l + 8, 90) : Math.max(primaryHSL.l - 8, 10) }));
  root.style.setProperty('--primary-light', toHSLString({ h: primaryHSL.h, s: Math.min(primaryHSL.s, 70), l: isDark ? 20 : 94 }));
  root.style.setProperty('--primary-muted', toHSLString({ h: primaryHSL.h, s: Math.min(primaryHSL.s, 40), l: isDark ? 15 : 96 }));
  root.style.setProperty('--primary-border', toHSLString({ h: primaryHSL.h, s: Math.min(primaryHSL.s, 50), l: isDark ? 30 : 88 }));
  root.style.setProperty('--primary-ring', toHSLString({ h: primaryHSL.h, s: Math.min(primaryHSL.s, 60), l: isDark ? 50 : 70 }));
}

// 重置为默认颜色
export function resetAccentColor(): void {
  const root = document.documentElement;
  root.style.removeProperty('--primary');
  root.style.removeProperty('--primary-foreground');
  root.style.removeProperty('--secondary');
  root.style.removeProperty('--secondary-foreground');
  root.style.removeProperty('--accent');
  root.style.removeProperty('--accent-foreground');
  root.style.removeProperty('--ring');
  root.style.removeProperty('--primary-hover');
  root.style.removeProperty('--primary-light');
  root.style.removeProperty('--primary-muted');
  root.style.removeProperty('--primary-border');
  root.style.removeProperty('--primary-ring');
}
