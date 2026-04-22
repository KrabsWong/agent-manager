import { createHashRouter, Navigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { RouteError } from '@/components/ErrorBoundary';

export const router = createHashRouter([
  {
    path: '/',
    element: <Layout />,
    errorElement: <RouteError />,
    children: [
      { path: '/', element: <Navigate to="/sessions" replace /> },
      { path: '*', element: <Navigate to="/sessions" replace /> },
    ],
  },
]);
