import type { ApiResponse } from '@/types';

export function extractData<T>(response: ApiResponse<T>): T {
  if (!response.success) {
    throw new Error(response.error?.message || 'Unknown error');
  }
  return response.data as T;
}

export function extractVoid(response: ApiResponse<void>): void {
  if (!response.success) {
    throw new Error(response.error?.message || 'Unknown error');
  }
}
