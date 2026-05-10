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

function waitForNeutralino(timeout = 1000): Promise<boolean> {
  return new Promise((resolve) => {
    const start = Date.now();
    const check = () => {
      if ((window as any).Neutralino) {
        resolve(true);
      } else if (Date.now() - start > timeout) {
        resolve(false);
      } else {
        requestAnimationFrame(check);
      }
    };
    check();
  });
}

async function initApp() {
  const startTime = performance.now();
  const isElectron = typeof (window as any).process !== 'undefined' && (window as any).process?.versions?.electron;
  
  let backend: 'electron' | 'rust' | 'neutralino' = 'rust';
  let isNeutralino = false;
  
  if (!isElectron) {
    isNeutralino = await waitForNeutralino();
    if (isNeutralino) {
      backend = 'neutralino';
      try {
        await (window as any).Neutralino.init();
        console.log('[API] Neutralino initialized');
      } catch (error) {
        console.error('[API] Neutralino init failed:', error);
        backend = 'rust';
        isNeutralino = false;
      }
    }
  } else {
    backend = 'electron';
  }
  
  switchBackend(backend);
  console.log(`[API] Backend: ${backend} (init time: ${(performance.now() - startTime).toFixed(0)}ms)`);

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

  const loadingEl = document.getElementById('loading');
  if (loadingEl) {
    loadingEl.classList.add('hidden');
    setTimeout(() => loadingEl.remove(), 300);
  }
}

initApp().catch(console.error);
