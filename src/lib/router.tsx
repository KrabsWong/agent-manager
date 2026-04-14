import { Suspense, lazy } from 'react';
import { createHashRouter, Navigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Spinner } from '@/components/ui/spinner';

// Lazy load all pages (using wrapper to handle named exports)
const SettingsPage = lazy(() =>
  import('@/pages/Settings').then((m) => ({ default: m.SettingsPage }))
);
const SessionsPage = lazy(() =>
  import('@/pages/Sessions').then((m) => ({ default: m.SessionsPage }))
);

// Loading fallback component
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-screen">
      <Spinner className="w-8 h-8" />
    </div>
  );
}

// Wrap lazy components with Suspense
function withSuspense(Component: React.ComponentType) {
  return (
    <Suspense fallback={<PageLoader />}>
      <Component />
    </Suspense>
  );
}

export const router = createHashRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { path: '/', element: <Navigate to="/sessions" replace /> },
      { path: '/sessions', element: withSuspense(SessionsPage) },
      { path: '/settings', element: withSuspense(SettingsPage) },
    ],
  },
]);
