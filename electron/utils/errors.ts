/**
 * Error Handling System
 *
 * Provides:
 * - Standardized error codes
 * - Type-safe error handling
 * - Error serialization for IPC
 */

import type { ErrorCode, AppError } from '../../src/types';

// Error codes with HTTP-like status semantics
const ERROR_CODES: Record<ErrorCode, { status: number; message: string }> = {
  UNKNOWN_ERROR: { status: 500, message: 'An unknown error occurred' },
  VALIDATION_ERROR: { status: 400, message: 'Validation failed' },
  INVALID_INPUT: { status: 400, message: 'Invalid input provided' },
};

/**
 * Custom application error class
 */
class AppRuntimeError extends Error {
  public readonly code: ErrorCode;
  public readonly status: number;
  public readonly details?: unknown;

  constructor(code: ErrorCode, message?: string, details?: unknown) {
    const errorDef = ERROR_CODES[code];
    super(message || errorDef.message);

    this.code = code;
    this.status = errorDef.status;
    this.details = details;

    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, AppRuntimeError);
  }

  /**
   * Serialize error for IPC transmission
   */
  toJSON(): AppError {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      stack: this.stack,
    };
  }
}

/**
 * Helper functions for common error scenarios
 */
export const errors = {
  validationFailed: (details: string) =>
    new AppRuntimeError('VALIDATION_ERROR', `Validation failed: ${details}`),

  invalidInput: (field: string, reason: string) =>
    new AppRuntimeError('INVALID_INPUT', `Invalid ${field}: ${reason}`),
};

/**
 * Converts main-process errors to a format safe for IPC transmission.
 */
export async function wrapIPCErrorsAsync<T>(handler: () => Promise<T>): Promise<T> {
  try {
    return await handler();
  } catch (error) {
    if (error instanceof AppRuntimeError) {
      throw error.toJSON();
    }

    const appError = new AppRuntimeError(
      'UNKNOWN_ERROR',
      error instanceof Error ? error.message : 'Unknown error',
      error
    );
    throw appError.toJSON();
  }
}
