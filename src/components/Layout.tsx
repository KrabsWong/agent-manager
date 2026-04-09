import { Outlet } from 'react-router-dom';
import '@/lib/i18n';
import { Sidebar } from './Sidebar';

export function Layout() {
  return (
    <div className="flex h-screen bg-background">
      {/* Draggable title bar area for frameless window */}
      <div className="fixed top-0 left-0 right-0 h-8 z-40 app-drag-region" />
      <Sidebar />
      <main className="flex-1 overflow-hidden pt-6">
        <div className="h-full px-6 pb-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
