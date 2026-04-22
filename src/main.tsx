import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { queryClient } from './lib/query/queryClient';
import { router } from './lib/router';
import { ThemeProvider } from './components/ThemeProvider';
import { Toaster } from './components/ui/toaster';
import { ErrorBoundary } from './components/ErrorBoundary';
import type { AppSettings } from './types';
import './index.css';

// Global settings cache
export let globalSettings: AppSettings | null = null;

// Load settings before rendering
const loadSettingsAndRender = async () => {
  console.log('[Main] Waiting for electronAPI...');
  
  // Wait for electronAPI to be ready (max 5 seconds)
  let retries = 0;
  while (!window.electronAPI && retries < 50) {
    await new Promise(r => setTimeout(r, 100));
    retries++;
  }
  
  if (!window.electronAPI) {
    console.error('[Main] electronAPI not available after 5 seconds');
    renderApp();
    return;
  }
  
  try {
    console.log('[Main] Loading settings from electron-store...');
    const settings = await window.electronAPI.invoke('settings:get') as AppSettings;
    globalSettings = settings;
    console.log('[Main] Settings loaded:', settings);
    
    // Apply language immediately
    if (settings.language) {
      const { default: i18n } = await import('./lib/i18n');
      await i18n.changeLanguage(settings.language);
      console.log('[Main] Language applied:', settings.language);
    }
  } catch (error) {
    console.error('[Main] Failed to load settings:', error);
  }
  
  renderApp();
};

const renderApp = () => {
  console.log('[Main] Rendering app...');
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
};

// Start loading
loadSettingsAndRender();
