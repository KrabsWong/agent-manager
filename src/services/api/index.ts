/**
 * API Factory - Backend Adapter Selection
 * 
 * Provides a unified API instance that can switch between implementations
 */

import type { IBackendAdapter, IStorageAdapter } from './interface';
import { ElectronBackendAdapter, ElectronStorageAdapter } from './adapters/electron-adapter';

export type BackendType = 'electron' | 'rust' | 'neutralino';

let currentBackend: BackendType = 'electron';
let apiInstance: IBackendAdapter | null = null;
let storageInstance: IStorageAdapter | null = null;

/**
 * Get the current backend type
 */
export function getCurrentBackend(): BackendType {
  return currentBackend;
}

/**
 * Switch backend implementation (for future migration)
 * 
 * This allows switching from Electron to Rust/Neutralino without code changes
 */
export function switchBackend(backend: BackendType): void {
  if (backend === currentBackend) return;

  currentBackend = backend;
  apiInstance = null;
  storageInstance = null;

  console.log(`[API] Switched to ${backend} backend`);
}

/**
 * Get API instance
 */
export function getApi(): IBackendAdapter {
  if (!apiInstance) {
    apiInstance = createBackendAdapter(currentBackend);
  }
  return apiInstance;
}

/**
 * Get Storage instance
 */
export function getStorage(): IStorageAdapter {
  if (!storageInstance) {
    storageInstance = createStorageAdapter(currentBackend);
  }
  return storageInstance;
}

/**
 * Create backend adapter based on type
 */
function createBackendAdapter(type: BackendType): IBackendAdapter {
  switch (type) {
    case 'electron':
      return new ElectronBackendAdapter();
    case 'rust':
      // TODO: Implement in Phase 2
      throw new Error('Rust backend not implemented yet');
    case 'neutralino':
      // TODO: Implement in Phase 3
      throw new Error('Neutralino backend not implemented yet');
    default:
      throw new Error(`Unknown backend: ${type}`);
  }
}

/**
 * Create storage adapter based on type
 */
function createStorageAdapter(type: BackendType): IStorageAdapter {
  switch (type) {
    case 'electron':
      return new ElectronStorageAdapter();
    case 'rust':
      // TODO: Implement in Phase 2
      throw new Error('Rust storage not implemented yet');
    case 'neutralino':
      // TODO: Implement in Phase 3
      throw new Error('Neutralino storage not implemented yet');
    default:
      throw new Error(`Unknown backend: ${type}`);
  }
}

/**
 * Convenience: Export singleton instances
 */
export const api = getApi();
export const storage = getStorage();