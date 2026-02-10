/**
 * Error handling utilities for the orchestration layer
 * Provides retry logic with exponential backoff and transient error detection
 */

/**
 * Retry an operation with exponential backoff
 * 
 * @param operation - The async operation to retry
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @param baseDelay - Base delay in milliseconds for exponential backoff (default: 1000ms)
 * @returns The result of the operation
 * @throws The last error if all retries are exhausted
 * 
 * @example
 * ```typescript
 * const result = await withRetry(
 *   async () => await database.query('SELECT * FROM products'),
 *   3,
 *   1000
 * );
 * ```
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Don't retry non-transient errors
      if (!isTransientError(error)) {
        throw error;
      }

      // Don't delay after the last attempt
      if (attempt < maxRetries - 1) {
        // Exponential backoff: baseDelay * 2^attempt
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  // All retries exhausted, throw the last error
  throw lastError!;
}

/**
 * Determine if an error is transient and should be retried
 * 
 * Transient errors include:
 * - Network timeouts
 * - Connection failures
 * - Network errors
 * - Connection refused errors
 * - Temporary database unavailability
 * 
 * @param error - The error to check
 * @returns true if the error is transient, false otherwise
 * 
 * @example
 * ```typescript
 * try {
 *   await database.query('SELECT * FROM products');
 * } catch (error) {
 *   if (isTransientError(error)) {
 *     // Retry the operation
 *   } else {
 *     // Handle permanent error
 *   }
 * }
 * ```
 */
export function isTransientError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('timeout') ||
      message.includes('connection') ||
      message.includes('network') ||
      message.includes('econnrefused') ||
      message.includes('enotfound') ||
      message.includes('etimedout') ||
      message.includes('econnreset') ||
      message.includes('socket hang up') ||
      message.includes('temporary') ||
      message.includes('unavailable')
    );
  }
  return false;
}
