import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type NavItem = 'sessions' | 'mcp' | 'skills';

interface NavigationState {
  // 启用的导航项
  enabledItems: NavItem[];
  // 切换导航项的启用状态
  toggleItem: (item: NavItem) => void;
  // 设置启用的导航项
  setEnabledItems: (items: NavItem[]) => void;
  // 重置为默认
  resetToDefault: () => void;
}

const DEFAULT_ITEMS: NavItem[] = ['sessions'];

export const useNavigationStore = create<NavigationState>()(
  persist(
    (set) => ({
      enabledItems: DEFAULT_ITEMS,
      toggleItem: (item) =>
        set((state) => {
          const isEnabled = state.enabledItems.includes(item);
          if (isEnabled) {
            // 至少保留一个导航项
            if (state.enabledItems.length > 1) {
              return {
                enabledItems: state.enabledItems.filter((i) => i !== item),
              };
            }
            return state;
          } else {
            return {
              enabledItems: [...state.enabledItems, item],
            };
          }
        }),
      setEnabledItems: (items) => set({ enabledItems: items }),
      resetToDefault: () => set({ enabledItems: DEFAULT_ITEMS }),
    }),
    {
      name: 'navigation-storage',
    }
  )
);
