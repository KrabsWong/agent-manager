import log from 'electron-log';

export class PerformanceMonitor {
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
  }

  logStartupTime() {
    const startupTime = Date.now() - this.startTime;
    log.info(`Application startup time: ${startupTime}ms`);
  }

  logMemoryUsage() {
    const usage = process.memoryUsage();
    log.info('Memory usage:', {
      rss: `${(usage.rss / 1024 / 1024).toFixed(2)} MB`,
      heapTotal: `${(usage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
      heapUsed: `${(usage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
    });
  }
}

export const performanceMonitor = new PerformanceMonitor();
