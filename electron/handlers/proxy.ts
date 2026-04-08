/**
 * Proxy IPC Handlers
 *
 * Registers all proxy-related IPC channels
 */

import { ipcRegistry } from '../ipc/registry';
import { getProxyServer } from '../services/proxy/server';
import { proxyConfigAdapter } from '../services/proxy/config-adapter';
import { circuitBreakerRegistry } from '../services/proxy/circuit-breaker';
import { failoverManager } from '../services/proxy/failover';
import { getUsageTracker } from '../services/proxy/usage-tracker';
import { configStore } from '../utils/config-store';
import type { AppType } from '@/types';
import log from 'electron-log';

export function registerProxyHandlers() {
  // Get proxy status
  ipcRegistry.register('proxy:getStatus', async () => {
    const server = getProxyServer();
    return {
      isRunning: server.isRunning(),
      port: configStore.getSettings().proxyPort || 15721,
    };
  });

  // Start proxy server
  ipcRegistry.register('proxy:start', async () => {
    try {
      const server = getProxyServer();
      const settings = configStore.getSettings();
      await server.start(settings.proxyPort || 15721);

      // Enable proxy in app configs
      const proxyUrl = `http://${settings.proxyHost || '127.0.0.1'}:${settings.proxyPort || 15721}`;
      proxyConfigAdapter.enableForAll(proxyUrl);

      // Update settings
      configStore.updateSettings({ proxyEnabled: true });

      log.info('Proxy server started');
      return { success: true };
    } catch (error) {
      log.error('Failed to start proxy:', error);
      throw error;
    }
  });

  // Stop proxy server
  ipcRegistry.register('proxy:stop', async () => {
    try {
      const server = getProxyServer();
      server.stop();

      // Disable proxy in app configs
      proxyConfigAdapter.disableForAll();

      // Update settings
      configStore.updateSettings({ proxyEnabled: false });

      log.info('Proxy server stopped');
      return { success: true };
    } catch (error) {
      log.error('Failed to stop proxy:', error);
      throw error;
    }
  });

  // Get circuit breaker stats
  ipcRegistry.register('proxy:getCircuitBreakerStats', async () => {
    return circuitBreakerRegistry.getAllStats();
  });

  // Reset circuit breaker
  ipcRegistry.register('proxy:resetCircuitBreaker', async (_event, ...args: unknown[]) => {
    const [providerId] = args as [string];
    circuitBreakerRegistry.reset(providerId);
    return { success: true };
  });

  // Get failover queue status
  ipcRegistry.register('proxy:getFailoverStatus', async () => {
    return failoverManager.getAllQueues();
  });

  // Reset failover queue
  ipcRegistry.register('proxy:resetFailover', async (_event, ...args: unknown[]) => {
    const [appType] = args as [AppType];
    failoverManager.reset(appType);
    return { success: true };
  });

  // Get usage stats
  ipcRegistry.register('proxy:getUsageStats', async (_event, ...args: unknown[]) => {
    const [startDate, endDate] = args as [string, string];
    const tracker = getUsageTracker();
    return tracker.getDailyStats(startDate, endDate);
  });

  // Get today's stats
  ipcRegistry.register('proxy:getTodayStats', async () => {
    const tracker = getUsageTracker();
    return tracker.getTodayStats();
  });

  // Get stats by provider
  ipcRegistry.register('proxy:getStatsByProvider', async (_event, ...args: unknown[]) => {
    const [startDate, endDate] = args as [string, string];
    const tracker = getUsageTracker();
    return tracker.getStatsByProvider(startDate, endDate);
  });

  // Get recent logs
  ipcRegistry.register('proxy:getRecentLogs', async (_event, ...args: unknown[]) => {
    const [limit] = args as [number];
    const tracker = getUsageTracker();
    return tracker.getRecentLogs(limit || 100);
  });

  log.info('Proxy IPC handlers registered');
}
