import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ExperienceState {
  // 标题跑马灯效果
  enableTitleMarquee: boolean;
  // 切换跑马灯效果
  toggleTitleMarquee: () => void;
  // 设置跑马灯效果
  setTitleMarquee: (enabled: boolean) => void;
  // Bash 输出块默认收起
  collapseBashBlocks: boolean;
  // 切换 Bash 输出块收起状态
  toggleCollapseBashBlocks: () => void;
  // 设置 Bash 输出块收起状态
  setCollapseBashBlocks: (enabled: boolean) => void;
  // 是否显示 Thinking 内容
  showThinkingContent: boolean;
  // 切换 Thinking 内容显示
  toggleShowThinkingContent: () => void;
  // 设置 Thinking 内容显示
  setShowThinkingContent: (enabled: boolean) => void;
}

export const useExperienceStore = create<ExperienceState>()(
  persist(
    (set) => ({
      enableTitleMarquee: false, // 默认关闭
      toggleTitleMarquee: () => set((state) => ({ enableTitleMarquee: !state.enableTitleMarquee })),
      setTitleMarquee: (enabled) => set({ enableTitleMarquee: enabled }),
      collapseBashBlocks: true, // 默认收起
      toggleCollapseBashBlocks: () =>
        set((state) => ({ collapseBashBlocks: !state.collapseBashBlocks })),
      setCollapseBashBlocks: (enabled) => set({ collapseBashBlocks: enabled }),
      showThinkingContent: true, // 默认显示 thinking 内容
      toggleShowThinkingContent: () =>
        set((state) => ({ showThinkingContent: !state.showThinkingContent })),
      setShowThinkingContent: (enabled) => set({ showThinkingContent: enabled }),
    }),
    {
      name: 'experience-storage',
    }
  )
);
