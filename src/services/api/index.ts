/**
 * API Factory - Backend Adapter Selection
 * 
 * Provides a unified API instance that can switch between implementations
 */

import type { IBackendAdapter, IStorageAdapter } from './interface';
import { RustBackendAdapter, RustStorageAdapter } from './adapters/rust-adapter';
import { NeutralinoBackendAdapter, NeutralinoStorageAdapter } from './adapters/neutralino-adapter';

export type BackendType = 'rust' | 'neutralino';

let currentBackend: BackendType = 'rust';
let apiInstance: IBackendAdapter | null = null;
let storageInstance: IStorageAdapter | null = null;

/**
 * Get the current backend type
 */
export function getCurrentBackend(): BackendType {
  return currentBackend;
}

/**
 * Switch backend implementation
 * 
 * This allows switching between Rust and Neutralino without code changes
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
    case 'rust':
      return new RustBackendAdapter();
    case 'neutralino':
      return new NeutralinoBackendAdapter();
    default:
      throw new Error(`Unknown backend: ${type}`);
  }
}

/**
 * Create storage adapter based on type
 */
function createStorageAdapter(type: BackendType): IStorageAdapter {
  switch (type) {
    case 'rust':
      return new RustStorageAdapter(new RustBackendAdapter()['client']);
    case 'neutralino':
      return new NeutralinoStorageAdapter();
    default:
      throw new Error(`Unknown storage: ${type}`);
  }
}

/**
 * Convenience: Export singleton instances
 */
export const api = getApi();
export const storage = getStorage();