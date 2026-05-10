import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { queryClient } from './lib/query/queryClient';
import { router } from './lib/router';
import { ThemeProvider } from './components/ThemeProvider';
import { Toaster } from './components/ui/toaster';
import { ErrorBoundary } from './components/ErrorBoundary';
import { switchBackend } from './services/api';
import './index.css';
import './lib/i18n';

// Auto-detect backend: use rust for Neutralino (no Electron APIs), electron otherwise
const isElectron = typeof (window as any).process !== 'undefined' && (window as any).process?.versions?.electron;
const backend = isElectron ? 'electron' : 'rust';
switchBackend(backend);
console.log(`[API] Detected ${isElectron ? 'Electron' : 'Neutralino'} environment, using ${backend} backend`);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <RouterProvider router={router} />
          <Toaster />
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
