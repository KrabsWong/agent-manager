import { createHashRouter, Navigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';

export const router = createHashRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { path: '/', element: <Navigate to="/sessions" replace /> },
      { path: '*', element: <Navigate to="/sessions" replace /> },
    ],
  },
]);
