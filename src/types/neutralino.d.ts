/**
 * Type declarations for Neutralino.js API
 */

declare global {
  interface Window {
    Neutralino?: {
      init: () => Promise<void>;
      
      os: {
        open: (url: string) => Promise<void>;
        exec: (
          command: string,
          args?: string[]
        ) => Promise<{
          exitCode: number;
          stdOut: string;
          stdErr: string;
        }>;
      };
      
      filesystem: {
        readFile: (filename: string) => Promise<string>;
        writeFile: (filename: string, data: string) => Promise<void>;
        readDirectory: (
          path: string
        ) => Promise<Array<{
          name: string;
          type: 'FILE' | 'DIRECTORY';
        }>>;
        createDirectory: (path: string) => Promise<void>;
        remove: (path: string) => Promise<void>;
      };
      
      storage: {
        getData: (key: string) => Promise<string>;
        setData: (key: string, data: string) => Promise<void>;
      };
      
      process: {
        exec: (
          command: string,
          args?: string[],
          options?: {
            cwd?: string;
            env?: Record<string, string>;
          }
        ) => Promise<{ pid: number }>;
        kill: (pid: number) => Promise<void>;
      };
      
      app: {
        exit: () => Promise<void>;
        restart: () => Promise<void>;
        getConfig: () => Promise<{
          applicationId: string;
          version: string;
          mode: string;
        }>;
      };
      
      events: {
        on: (
          event: 'ready' | 'windowClose' | 'appClose' | 'clientDisconnect',
          callback: () => void
        ) => void;
        off: (event: string) => void;
        dispatch: (event: string, data?: any) => void;
      };
      
      computer: {
        memory: () => Promise<{
          physical: { total: number; available: number };
          virtual: { total: number; available: number };
        }>;
        cpu: () => Promise<{
          modelName: string;
          numLogicalCores: number;
        }>;
      };
      
      window: {
        setTitle: (title: string) => Promise<void>;
        maximize: () => Promise<void>;
        minimize: () => Promise<void>;
        unmaximize: () => Promise<void>;
        setSize: (width: number, height: number) => Promise<void>;
        getPosition: () => Promise<{ x: number; y: number }>;
        setPosition: (x: number, y: number) => Promise<void>;
      };
      
      extensions: {
        exec: (
          extensionId: string,
          command: string,
          args?: string[]
        ) => Promise<{
          success: boolean;
          output?: string;
          error?: string;
        }>;
      };
    };
    
    electronAPI?: {
      process: {
        exec: (command: string, args?: string[]) => Promise<{ pid: number }>;
        kill: (pid: number) => Promise<void>;
      };
    };
  }
}

export interface ProcessInfo {
  pid: number;
  name: string;
  startTime: number;
  status: 'running' | 'stopped' | 'error';
}

export interface HealthCheckResult {
  healthy: boolean;
  lastCheck: number;
  error?: string;
}

export {};