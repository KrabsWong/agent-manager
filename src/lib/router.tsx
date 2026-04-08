import { createBrowserRouter } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { ProvidersPage } from '@/pages/Providers';
import { McpPage } from '@/pages/Mcp';
import { SkillsPage } from '@/pages/Skills';
import { PromptsPage } from '@/pages/Prompts';
import { ProxyPage } from '@/pages/Proxy';
import { SettingsPage } from '@/pages/Settings';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        path: '/',
        element: <ProvidersPage />,
      },
      {
        path: '/providers',
        element: <ProvidersPage />,
      },
      {
        path: '/mcp',
        element: <McpPage />,
      },
      {
        path: '/skills',
        element: <SkillsPage />,
      },
      {
        path: '/prompts',
        element: <PromptsPage />,
      },
      {
        path: '/proxy',
        element: <ProxyPage />,
      },
      {
        path: '/settings',
        element: <SettingsPage />,
      },
    ],
  },
]);
