import log from 'electron-log';

class PerformanceMonitor {
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
  }

  logStartupTime() {
    const startupTime = Date.now() - this.startTime;
    log.info(`Application startup time: ${startupTime}ms`);
  }
}

export const performanceMonitor = new PerformanceMonitor();
