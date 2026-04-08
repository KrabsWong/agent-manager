import { AppType, Provider } from '@/types';
import { circuitBreakerRegistry } from './circuit-breaker';

export interface FailoverQueue {
  appType: AppType;
  providers: string[]; // ordered list of provider IDs
  currentIndex: number;
  lastFailoverTime: number | null;
}

export class FailoverManager {
  private queues: Map<AppType, FailoverQueue> = new Map();

  setQueue(appType: AppType, providers: Provider[]): void {
    console.log(`[Failover] Setting queue for ${appType} with ${providers.length} providers`);

    const filteredProviders = providers
      .filter((provider) => !provider.inFailoverQueue)
      .sort((a, b) => a.sortIndex - b.sortIndex);

    const providerIds = filteredProviders.map((p) => p.id);

    this.queues.set(appType, {
      appType,
      providers: providerIds,
      currentIndex: 0,
      lastFailoverTime: null,
    });

    console.log(`[Failover] Queue set for ${appType}: ${providerIds.join(', ') || '(empty)'}`);
  }

  getCurrentProvider(appType: AppType): string | null {
    const queue = this.queues.get(appType);
    if (!queue || queue.providers.length === 0) {
      return null;
    }
    return queue.providers[queue.currentIndex] || null;
  }

  failover(appType: AppType): string | null {
    const queue = this.queues.get(appType);
    if (!queue || queue.providers.length === 0) {
      console.log(`[Failover] No queue or providers for ${appType}`);
      return null;
    }

    const currentProviderId = queue.providers[queue.currentIndex];
    console.log(`[Failover] Failing over from ${currentProviderId} for ${appType}`);

    if (currentProviderId) {
      const breaker = circuitBreakerRegistry.get(currentProviderId);
      breaker.recordFailure();
    }

    queue.currentIndex++;
    queue.lastFailoverTime = Date.now();

    if (queue.currentIndex >= queue.providers.length) {
      console.log(`[Failover] Exhausted all providers for ${appType}`);
      queue.currentIndex = queue.providers.length - 1;
      return null;
    }

    const nextProviderId = queue.providers[queue.currentIndex];
    console.log(`[Failover] Switched to ${nextProviderId} for ${appType}`);
    return nextProviderId;
  }

  shouldFailover(_appType: AppType, providerId: string): boolean {
    const breaker = circuitBreakerRegistry.get(providerId);
    return !breaker.canExecute();
  }

  getQueue(appType: AppType): FailoverQueue | null {
    const queue = this.queues.get(appType);
    return queue || null;
  }

  reset(appType: AppType): boolean {
    const queue = this.queues.get(appType);
    if (!queue) {
      console.log(`[Failover] No queue to reset for ${appType}`);
      return false;
    }

    queue.currentIndex = 0;
    queue.lastFailoverTime = null;
    console.log(`[Failover] Reset queue for ${appType} to first provider`);
    return true;
  }

  getAllQueues(): Record<AppType, FailoverQueue> {
    const result = {} as Record<AppType, FailoverQueue>;
    for (const [appType, queue] of this.queues.entries()) {
      result[appType] = queue;
    }
    return result;
  }
}

export const failoverManager = new FailoverManager();

export default failoverManager;
