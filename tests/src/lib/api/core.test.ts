import { describe, expect, it } from 'vitest';
import { extractData, extractVoid } from '@/lib/api/core';
import type { ApiResponse } from '@/types';

describe('api response helpers', () => {
  it('returns response data for successful responses', () => {
    const response: ApiResponse<{ value: string }> = {
      success: true,
      data: { value: 'ok' },
    };

    expect(extractData(response)).toEqual({ value: 'ok' });
  });

  it('throws the response error message for failed data responses', () => {
    const response: ApiResponse<string> = {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid input' },
    };

    expect(() => extractData(response)).toThrow('Invalid input');
  });

  it('throws a fallback error message when a failed response omits details', () => {
    const response = { success: false } as ApiResponse<void>;

    expect(() => extractVoid(response)).toThrow('Unknown error');
  });

  it('accepts successful void responses', () => {
    expect(extractVoid({ success: true })).toBeUndefined();
  });
});
