export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number;
  halfOpenMaxCalls: number;
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime: number | null;
  consecutiveSuccesses: number;
}

export const DEFAULT_CIRCUIT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeout: 30000,
  halfOpenMaxCalls: 3,
};

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failures: number = 0;
  private successes: number = 0;
  private lastFailureTime: number | null = null;
  private consecutiveSuccesses: number = 0;
  private halfOpenCalls: number = 0;
  private providerId: string;
  private config: CircuitBreakerConfig;

  constructor(providerId: string, config?: Partial<CircuitBreakerConfig>) {
    this.providerId = providerId;
    this.config = { ...DEFAULT_CIRCUIT_CONFIG, ...config };
  }

  private checkTimeout(): void {
    if (this.state === 'OPEN' && this.lastFailureTime !== null) {
      const elapsed = Date.now() - this.lastFailureTime;
      if (elapsed >= this.config.resetTimeout) {
        this.state = 'HALF_OPEN';
        this.halfOpenCalls = 0;
      }
    }
  }

  getState(): CircuitState {
    this.checkTimeout();
    return this.state;
  }

  canExecute(): boolean {
    this.checkTimeout();

    switch (this.state) {
      case 'CLOSED':
        return true;
      case 'OPEN':
        return false;
      case 'HALF_OPEN':
        return this.halfOpenCalls < this.config.halfOpenMaxCalls;
      default:
        return false;
    }
  }

  recordSuccess(): void {
    this.successes++;
    this.consecutiveSuccesses++;

    if (this.state === 'HALF_OPEN') {
      this.halfOpenCalls++;
      if (this.consecutiveSuccesses >= this.config.halfOpenMaxCalls) {
        this.state = 'CLOSED';
        this.resetInternalState();
      }
    } else if (this.state === 'CLOSED') {
      this.failures = 0;
    }
  }

  recordFailure(): void {
    this.failures++;
    this.consecutiveSuccesses = 0;
    this.lastFailureTime = Date.now();

    if (this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
      this.halfOpenCalls = 0;
    } else if (this.state === 'CLOSED' && this.failures >= this.config.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  getStats(): CircuitBreakerStats {
    return {
      state: this.getState(),
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
      consecutiveSuccesses: this.consecutiveSuccesses,
    };
  }

  reset(): void {
    this.state = 'CLOSED';
    this.resetInternalState();
  }

  private resetInternalState(): void {
    this.failures = 0;
    this.consecutiveSuccesses = 0;
    this.lastFailureTime = null;
    this.halfOpenCalls = 0;
  }

  getProviderId(): string {
    return this.providerId;
  }
}

export class CircuitBreakerRegistry {
  private breakers: Map<string, CircuitBreaker> = new Map();

  get(providerId: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
    if (!this.breakers.has(providerId)) {
      this.breakers.set(providerId, new CircuitBreaker(providerId, config));
    }
    return this.breakers.get(providerId)!;
  }

  getAllStats(): Record<string, CircuitBreakerStats> {
    const stats: Record<string, CircuitBreakerStats> = {};
    for (const [providerId, breaker] of this.breakers.entries()) {
      stats[providerId] = breaker.getStats();
    }
    return stats;
  }

  reset(providerId: string): boolean {
    const breaker = this.breakers.get(providerId);
    if (breaker) {
      breaker.reset();
      return true;
    }
    return false;
  }

  resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }

  has(providerId: string): boolean {
    return this.breakers.has(providerId);
  }

  remove(providerId: string): boolean {
    return this.breakers.delete(providerId);
  }
}

export const circuitBreakerRegistry = new CircuitBreakerRegistry();

export default circuitBreakerRegistry;
