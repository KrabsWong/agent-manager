/**
 * Process Manager Service
 *
 * Manages Rust microservice lifecycle:
 * - Start: Launch Rust service as subprocess
 * - Stop: Graceful shutdown with SIGTERM
 * - Monitor: Health checks and auto-restart
 * - Cleanup: Kill on application exit
 */

export interface ProcessInfo {
  pid: number;
  name: string;
  startTime: number;
  status: 'running' | 'stopped' | 'error';
}

export class ProcessManager {
  private processes: Map<string, ProcessInfo> = new Map();
  private healthCheckInterval: number | null = null;
  private isNeutralino: boolean = false;

  constructor() {
    this.isNeutralino = typeof window !== 'undefined' && typeof window.Neutralino !== 'undefined';
    this.setupExitHandler();
  }

  /**
   * Setup exit handler to cleanup processes
   */
  private setupExitHandler(): void {
    if (this.isNeutralino && window.Neutralino) {
      window.Neutralino.events.on('windowClose', async () => {
        await this.stopAll();
        if (window.Neutralino) {
          await window.Neutralino.app.exit();
        }
      });

      window.Neutralino.events.on('appClose', async () => {
        await this.stopAll();
      });
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', async () => {
        await this.stopAll();
      });
    }
  }

  /**
   * Start Rust microservice
   */
  async startRustService(
    executablePath: string = './rust-service/yes-sessions-service'
  ): Promise<ProcessInfo> {
    const serviceName = 'rust-service';

    if (this.processes.has(serviceName)) {
      const existing = this.processes.get(serviceName)!;
      if (existing.status === 'running') {
        console.log(`[ProcessManager] ${serviceName} already running with PID: ${existing.pid}`);
        return existing;
      }
    }

    try {
      let pid: number;

      if (this.isNeutralino && window.Neutralino) {
        const result = await window.Neutralino.process.exec(executablePath);
        pid = result.pid;
      } else {
        pid = await this.startViaElectron(executablePath);
      }

      const processInfo: ProcessInfo = {
        pid,
        name: serviceName,
        startTime: Date.now(),
        status: 'running',
      };

      this.processes.set(serviceName, processInfo);
      console.log(`[ProcessManager] Started ${serviceName} with PID: ${pid}`);

      await this.startHealthCheck();
      await this.waitForServiceReady();

      return processInfo;
    } catch (error) {
      console.error(`[ProcessManager] Failed to start ${serviceName}:`, error);
      
      const processInfo: ProcessInfo = {
        pid: 0,
        name: serviceName,
        startTime: Date.now(),
        status: 'error',
      };
      
      this.processes.set(serviceName, processInfo);
      throw error;
    }
  }

  /**
   * Start process via Electron IPC (fallback)
   */
  private async startViaElectron(executablePath: string): Promise<number> {
    if (typeof window !== 'undefined' && window.electronAPI) {
      const result = await window.electronAPI.process.exec(executablePath);
      return result.pid;
    }
    throw new Error('No process execution method available');
  }

  /**
   * Stop Rust microservice
   */
  async stopRustService(): Promise<void> {
    const serviceName = 'rust-service';
    const processInfo = this.processes.get(serviceName);

    if (!processInfo) {
      console.log(`[ProcessManager] ${serviceName} not running`);
      return;
    }

    if (processInfo.status === 'stopped') {
      console.log(`[ProcessManager] ${serviceName} already stopped`);
      return;
    }

    try {
      if (this.isNeutralino && window.Neutralino) {
        await window.Neutralino.process.kill(processInfo.pid);
      } else if (typeof window !== 'undefined' && window.electronAPI) {
        await window.electronAPI.process.kill(processInfo.pid);
      }

      processInfo.status = 'stopped';
      console.log(`[ProcessManager] Stopped ${serviceName} (PID: ${processInfo.pid})`);
    } catch (error) {
      console.error(`[ProcessManager] Failed to stop ${serviceName}:`, error);
      throw error;
    }

    this.stopHealthCheck();
  }

  /**
   * Stop all managed processes
   */
  async stopAll(): Promise<void> {
    const promises: Promise<void>[] = [];

    for (const [name, info] of this.processes.entries()) {
      if (info.status === 'running') {
        promises.push(this.stopProcess(name));
      }
    }

    await Promise.allSettled(promises);
    this.processes.clear();
    this.stopHealthCheck();
    console.log('[ProcessManager] All processes stopped');
  }

  /**
   * Stop a specific process
   */
  private async stopProcess(name: string): Promise<void> {
    const info = this.processes.get(name);
    if (!info || info.status !== 'running') return;

    try {
      if (this.isNeutralino && window.Neutralino) {
        await window.Neutralino.process.kill(info.pid);
      } else if (typeof window !== 'undefined' && window.electronAPI) {
        await window.electronAPI.process.kill(info.pid);
      }

      info.status = 'stopped';
    } catch (error) {
      console.error(`[ProcessManager] Failed to stop ${name}:`, error);
    }
  }

  /**
   * Start health check monitoring
   */
  private async startHealthCheck(): void {
    if (this.healthCheckInterval) return;

    this.healthCheckInterval = setInterval(async () => {
      for (const [name, info] of this.processes.entries()) {
        if (info.status === 'running') {
          const healthy = await this.checkHealth(name);
          if (!healthy) {
            console.warn(`[ProcessManager] ${name} health check failed, attempting restart`);
            await this.restartService(name);
          }
        }
      }
    }, 5000);
  }

  /**
   * Stop health check monitoring
   */
  private stopHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * Check service health
   */
  private async checkHealth(name: string): Promise<boolean> {
    if (name === 'rust-service') {
      try {
        const response = await fetch('http://localhost:3000/health', {
          method: 'GET',
          signal: AbortSignal.timeout(2000),
        });
        return response.ok;
      } catch {
        return false;
      }
    }
    return false;
  }

  /**
   * Restart a service
   */
  private async restartService(name: string): Promise<void> {
    const info = this.processes.get(name);
    if (!info) return;

    await this.stopProcess(name);
    
    const executablePath = name === 'rust-service' 
      ? './rust-service/yes-sessions-service' 
      : '';
    
    if (executablePath) {
      await this.startRustService(executablePath);
    }
  }

  /**
   * Wait for service to be ready
   */
  private async waitForServiceReady(
    maxRetries: number = 50,
    delay: number = 100
  ): Promise<void> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await fetch('http://localhost:3000/health');
        if (response.ok) {
          console.log('[ProcessManager] Rust service is ready');
          return;
        }
      } catch {
      }

      await new Promise(resolve => setTimeout(resolve, delay));
    }

    throw new Error('[ProcessManager] Rust service failed to start within timeout');
  }

  /**
   * Get process info
   */
  getProcessInfo(name: string): ProcessInfo | undefined {
    return this.processes.get(name);
  }

  /**
   * Get all processes
   */
  getAllProcesses(): Map<string, ProcessInfo> {
    return new Map(this.processes);
  }

  /**
   * Check if Rust service is running
   */
  isRustServiceRunning(): boolean {
    const info = this.processes.get('rust-service');
    return info?.status === 'running';
  }
}