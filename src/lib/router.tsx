import { Suspense, lazy } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Spinner } from '@/components/ui/spinner';

// Lazy load all pages (using wrapper to handle named exports)
const ProvidersPage = lazy(() =>
  import('@/pages/Providers').then((m) => ({ default: m.ProvidersPage }))
);
const McpPage = lazy(() => import('@/pages/Mcp').then((m) => ({ default: m.McpPage })));
const SkillsPage = lazy(() => import('@/pages/Skills').then((m) => ({ default: m.SkillsPage })));
const PromptsPage = lazy(() => import('@/pages/Prompts').then((m) => ({ default: m.PromptsPage })));
const ProxyPage = lazy(() => import('@/pages/Proxy').then((m) => ({ default: m.ProxyPage })));
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

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { path: '/', element: withSuspense(SessionsPage) },
      { path: '/providers', element: withSuspense(ProvidersPage) },
      { path: '/mcp', element: withSuspense(McpPage) },
      { path: '/skills', element: withSuspense(SkillsPage) },
      { path: '/prompts', element: withSuspense(PromptsPage) },
      { path: '/proxy', element: withSuspense(ProxyPage) },
      { path: '/sessions', element: withSuspense(SessionsPage) },
      { path: '/settings', element: withSuspense(SettingsPage) },
    ],
  },
]);
