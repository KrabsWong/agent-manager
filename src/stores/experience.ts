import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ExperienceState {
  // 标题跑马灯效果
  enableTitleMarquee: boolean;
  // 切换跑马灯效果
  toggleTitleMarquee: () => void;
  // 设置跑马灯效果
  setTitleMarquee: (enabled: boolean) => void;
}

export const useExperienceStore = create<ExperienceState>()(
  persist(
    (set) => ({
      enableTitleMarquee: false, // 默认关闭
      toggleTitleMarquee: () => set((state) => ({ enableTitleMarquee: !state.enableTitleMarquee })),
      setTitleMarquee: (enabled) => set({ enableTitleMarquee: enabled }),
    }),
    {
      name: 'experience-storage',
    }
  )
);
