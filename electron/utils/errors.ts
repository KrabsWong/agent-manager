/**
 * Error Handling System
 * 
 * Provides:
 * - Standardized error codes
 * - Type-safe error handling
 * - Error serialization for IPC
 * - Localized error messages
 */

import type { ErrorCode, AppError } from '../../src/types';

// Error codes with HTTP-like status semantics
export const ERROR_CODES: Record<ErrorCode, { status: number; message: string }> = {
  UNKNOWN_ERROR: { status: 500, message: 'An unknown error occurred' },
  VALIDATION_ERROR: { status: 400, message: 'Validation failed' },
  NOT_FOUND: { status: 404, message: 'Resource not found' },
  ALREADY_EXISTS: { status: 409, message: 'Resource already exists' },
  DATABASE_ERROR: { status: 500, message: 'Database operation failed' },
  FILE_SYSTEM_ERROR: { status: 500, message: 'File system operation failed' },
  CONFIG_ERROR: { status: 500, message: 'Configuration error' },
  NETWORK_ERROR: { status: 503, message: 'Network request failed' },
  PERMISSION_DENIED: { status: 403, message: 'Permission denied' },
  INVALID_INPUT: { status: 400, message: 'Invalid input provided' },
  OPERATION_FAILED: { status: 500, message: 'Operation failed' },
};

/**
 * Custom application error class
 */
export class CCError extends Error {
  public readonly code: ErrorCode;
  public readonly status: number;
  public readonly details?: unknown;

  constructor(
    code: ErrorCode,
    message?: string,
    details?: unknown
  ) {
    const errorDef = ERROR_CODES[code];
    super(message || errorDef.message);
    
    this.code = code;
    this.status = errorDef.status;
    this.details = details;
    
    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, CCError);
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

  /**
   * Create error from serialized form
   */
  static fromJSON(error: AppError): CCError {
    const err = new CCError(error.code, error.message, error.details);
    if (error.stack) {
      err.stack = error.stack;
    }
    return err;
  }
}

/**
 * Helper functions for common error scenarios
 */
export const errors = {
  notFound: (resource: string, id?: string) =>
    new CCError('NOT_FOUND', `${resource}${id ? ` (${id})` : ''} not found`),

  alreadyExists: (resource: string, identifier?: string) =>
    new CCError('ALREADY_EXISTS', `${resource}${identifier ? ` (${identifier})` : ''} already exists`),

  validationFailed: (details: string) =>
    new CCError('VALIDATION_ERROR', `Validation failed: ${details}`),

  databaseError: (operation: string, cause?: unknown) =>
    new CCError('DATABASE_ERROR', `Database ${operation} failed`, cause),

  configError: (message: string) =>
    new CCError('CONFIG_ERROR', message),

  invalidInput: (field: string, reason: string) =>
    new CCError('INVALID_INPUT', `Invalid ${field}: ${reason}`),

  permissionDenied: (operation: string) =>
    new CCError('PERMISSION_DENIED', `Permission denied for ${operation}`),

  fileSystemError: (operation: string, path: string, cause?: unknown) =>
    new CCError('FILE_SYSTEM_ERROR', `File system ${operation} failed for ${path}`, cause),

  networkError: (operation: string, cause?: unknown) =>
    new CCError('NETWORK_ERROR', `Network ${operation} failed`, cause),
};

/**
 * Wrap async functions with error handling
 */
export function withErrorHandling<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  errorCode: ErrorCode = 'OPERATION_FAILED'
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  return async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    try {
      return (await fn(...args)) as ReturnType<T>;
    } catch (error) {
      if (error instanceof CCError) {
        throw error;
      }
      
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new CCError(errorCode, message, error);
    }
  };
}

/**
 * Result type for operations that can fail
 * Similar to Rust's Result<T, E>
 */
export type Result<T, E = CCError> =
  | { ok: true; value: T }
  | { ok: false; error: E };

/**
 * Create a successful result
 */
export function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

/**
 * Create an error result
 */
export function err<E = CCError>(error: E): Result<never, E> {
  return { ok: false, error };
}

/**
 * IPC error wrapper
 * Converts errors to a format safe for IPC transmission
 */
export function wrapIPCErrors<T>(handler: () => T): T {
  try {
    return handler();
  } catch (error) {
    if (error instanceof CCError) {
      throw error.toJSON();
    }
    
    const ccError = new CCError(
      'UNKNOWN_ERROR',
      error instanceof Error ? error.message : 'Unknown error',
      error
    );
    throw ccError.toJSON();
  }
}

/**
 * Async version of wrapIPCErrors
 */
export async function wrapIPCErrorsAsync<T>(handler: () => Promise<T>): Promise<T> {
  try {
    return await handler();
  } catch (error) {
    if (error instanceof CCError) {
      throw error.toJSON();
    }
    
    const ccError = new CCError(
      'UNKNOWN_ERROR',
      error instanceof Error ? error.message : 'Unknown error',
      error
    );
    throw ccError.toJSON();
  }
}
