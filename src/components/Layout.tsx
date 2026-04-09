import { Outlet } from 'react-router-dom';
import '@/lib/i18n';
import { Sidebar } from './Sidebar';
import { WindowControls } from './WindowControls';

export function Layout() {
  return (
    <div className="flex h-screen bg-background">
      {/* Title bar area with window controls */}
      <div className="fixed top-0 left-0 right-0 h-10 z-50 bg-background/80 backdrop-blur-sm border-b flex items-center justify-between px-3">
        {/* Left: App name */}
        <div className="flex items-center gap-2 app-drag-region flex-1">
          <span className="text-sm font-medium text-muted-foreground">Yes, Sessions</span>
        </div>
        {/* Center: Empty drag area */}
        <div className="flex-1 app-drag-region h-full" />
        {/* Right: Window controls */}
        <div className="flex items-center flex-1 justify-end">
          <WindowControls />
        </div>
      </div>
      <Sidebar />
      <main className="flex-1 overflow-hidden pt-10">
        <div className="h-full px-6 pb-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
