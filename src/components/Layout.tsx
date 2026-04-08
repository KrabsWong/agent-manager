import { Outlet } from 'react-router-dom';
import '@/lib/i18n';
import { Sidebar } from './Sidebar';

export function Layout() {
  return (
    <div className="flex h-screen bg-background">
      {/* Draggable title bar area for frameless window */}
      <div className="fixed top-0 left-0 right-0 h-8 z-50 app-drag-region" />
      <Sidebar />
      <main className="flex-1 overflow-auto pt-8">
        <div className="container mx-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
