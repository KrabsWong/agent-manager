/**
 * Global type declarations for window object extensions
 */

declare global {
  interface Window {
    __INITIAL_SETTINGS__?: {
      language?: string;
      theme?: 'light' | 'dark' | 'system';
      accentColor?: string;
      defaultApp?: string;
      enableTitleMarquee?: boolean;
      collapseBashBlocks?: boolean;
      showThinkingContent?: boolean;
      sidebarCollapsed?: boolean;
      preferredTerminal?: 'auto' | 'ghostty' | 'kitty' | 'terminal';
      chatLayout?: 'left' | 'bubble';
    };
  }
}

export {};
