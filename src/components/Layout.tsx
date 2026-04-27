import { useState } from 'react';
import '@/lib/i18n';
import { Header } from './Header';
import { SessionsPage } from '@/pages/Sessions';
import { useSettingsStore } from '@/stores/settings';
import { DEFAULT_APP } from '@/config/apps';
import type { AppType } from '@/types';

export function Layout() {
  const { defaultApp, sidebarCollapsed, toggleSidebar } = useSettingsStore();
  // 如果用户设置了默认应用则使用，否则使用第一个可用应用
  const initialApp = defaultApp || DEFAULT_APP;
  const [selectedApp, setSelectedApp] = useState<AppType>(initialApp);

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Draggable title bar area for frameless window - z-30 低于 Header */}
      <div className="fixed top-0 left-0 right-0 h-20 z-30 app-drag-region" />

      {/* 顶部导航栏 */}
      <Header
        selectedApp={selectedApp}
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={toggleSidebar}
      />

      {/* 主内容区 - 直接显示 Sessions */}
      <main className="flex-1 overflow-hidden">
        <SessionsPage selectedApp={selectedApp} onAppChange={setSelectedApp} />
      </main>
    </div>
  );
}
