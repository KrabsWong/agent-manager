import { useState } from 'react';
import '@/lib/i18n';
import { Header } from './Header';
import { SessionsPage } from '@/pages/Sessions';
import type { AppType } from '@/types';

export function Layout() {
  const [selectedApp, setSelectedApp] = useState<AppType>('codebuddy');

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Draggable title bar area for frameless window - 为系统按钮预留更多空间 */}
      <div className="fixed top-0 left-0 right-0 h-16 z-40 app-drag-region" />

      {/* 顶部导航栏 */}
      <Header selectedApp={selectedApp} onAppChange={setSelectedApp} />

      {/* 主内容区 - 直接显示 Sessions */}
      <main className="flex-1 overflow-hidden">
        <SessionsPage selectedApp={selectedApp} onAppChange={setSelectedApp} />
      </main>
    </div>
  );
}
