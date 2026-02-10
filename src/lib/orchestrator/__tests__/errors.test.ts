/**
 * Unit tests for error handling utilities
 */

import { withRetry, isTransientError } from '../errors';

describe('isTransientError', () => {
  describe('transient errors', () => {
    it('should identify timeout errors as transient', () => {
      const error = new Error('Request timeout');
      expect(isTransientError(error)).toBe(true);
    });

    it('should identify connection errors as transient', () => {
      const error = new Error('Connection failed');
      expect(isTransientError(error)).toBe(true);
    });

    it('should identify network errors as transient', () => {
      const error = new Error('Network error occurred');
      expect(isTransientError(error)).toBe(true);
    });

    it('should identify ECONNREFUSED errors as transient', () => {
      const error = new Error('ECONNREFUSED: Connection refused');
      expect(isTransientError(error)).toBe(true);
    });

    it('should identify ENOTFOUND errors as transient', () => {
      const error = new Error('ENOTFOUND: DNS lookup failed');
      expect(isTransientError(error)).toBe(true);
    });

    it('should identify ETIMEDOUT errors as transient', () => {
      const error = new Error('ETIMEDOUT: Operation timed out');
      expect(isTransientError(error)).toBe(true);
    });

    it('should identify ECONNRESET errors as transient', () => {
      const error = new Error('ECONNRESET: Connection reset by peer');
      expect(isTransientError(error)).toBe(true);
    });

    it('should identify socket hang up errors as transient', () => {
      const error = new Error('socket hang up');
      expect(isTransientError(error)).toBe(true);
    });

    it('should identify temporary errors as transient', () => {
      const error = new Error('Temporary database unavailable');
      expect(isTransientError(error)).toBe(true);
    });

    it('should identify unavailable errors as transient', () => {
      const error = new Error('Service unavailable');
      expect(isTransientError(error)).toBe(true);
    });

    it('should be case-insensitive', () => {
      const error = new Error('TIMEOUT ERROR');
      expect(isTransientError(error)).toBe(true);
    });
  });

  describe('non-transient errors', () => {
    it('should identify validation errors as non-transient', () => {
      const error = new Error('Invalid barcode format');
      expect(isTransientError(error)).toBe(false);
    });

    it('should identify constraint violation errors as non-transient', () => {
      const error = new Error('Unique constraint violation');
      expect(isTransientError(error)).toBe(false);
    });

    it('should identify authentication errors as non-transient', () => {
      const error = new Error('Authentication failed');
      expect(isTransientError(error)).toBe(false);
    });

    it('should identify authorization errors as non-transient', () => {
      const error = new Error('Unauthorized access');
      expect(isTransientError(error)).toBe(false);
    });

    it('should identify not found errors as non-transient', () => {
      const error = new Error('Resource not found');
      expect(isTransientError(error)).toBe(false);
    });

    it('should return false for non-Error objects', () => {
      expect(isTransientError('string error')).toBe(false);
      expect(isTransientError(null)).toBe(false);
      expect(isTransientError(undefined)).toBe(false);
      expect(isTransientError(123)).toBe(false);
      expect(isTransientError({})).toBe(false);
    });
  });
});

describe('withRetry', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('successful operations', () => {
    it('should return result on first attempt if operation succeeds', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const result = await withRetry(operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should return result after retries if operation eventually succeeds', async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('timeout'))
        .mockRejectedValueOnce(new Error('connection failed'))
        .mockResolvedValue('success');

      const resultPromise = withRetry(operation, 3, 100);
      
      // Fast-forward through all timers
      await jest.runAllTimersAsync();
      
      const result = await resultPromise;

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });
  });

  describe('retry behavior', () => {
    it('should retry transient errors up to maxRetries times', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('timeout'));

      const resultPromise = withRetry(operation, 3, 100).catch(e => e);
      
      // Fast-forward through all timers
      await jest.runAllTimersAsync();

      const error = await resultPromise;
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe('timeout');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should not retry non-transient errors', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Invalid input'));

      await expect(withRetry(operation, 3, 100)).rejects.toThrow('Invalid input');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should throw the last error after all retries are exhausted', async () => {
      let callCount = 0;
      const operation = jest.fn().mockImplementation(async () => {
        callCount++;
        throw new Error(`timeout ${callCount}`);
      });

      const resultPromise = withRetry(operation, 3, 100).catch(e => e);
      
      // Fast-forward through all timers
      await jest.runAllTimersAsync();

      const error = await resultPromise;
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe('timeout 3');
      expect(operation).toHaveBeenCalledTimes(3);
    });
  });

  describe('exponential backoff', () => {
    it('should use exponential backoff between retries', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('timeout'));
      const baseDelay = 100;

      const resultPromise = withRetry(operation, 3, baseDelay).catch(e => e);

      // First attempt fails immediately
      await Promise.resolve();
      expect(operation).toHaveBeenCalledTimes(1);

      // First retry after baseDelay * 2^0 = 100ms
      await jest.advanceTimersByTimeAsync(100);
      expect(operation).toHaveBeenCalledTimes(2);

      // Second retry after baseDelay * 2^1 = 200ms
      await jest.advanceTimersByTimeAsync(200);
      expect(operation).toHaveBeenCalledTimes(3);

      const error = await resultPromise;
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe('timeout');
    });

    it('should use custom baseDelay', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('timeout'));
      const baseDelay = 500;

      const resultPromise = withRetry(operation, 2, baseDelay).catch(e => e);

      // First attempt fails immediately
      await Promise.resolve();
      expect(operation).toHaveBeenCalledTimes(1);

      // First retry after 500ms
      await jest.advanceTimersByTimeAsync(500);
      expect(operation).toHaveBeenCalledTimes(2);

      const error = await resultPromise;
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe('timeout');
    });

    it('should not delay after the last attempt', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('timeout'));

      const resultPromise = withRetry(operation, 2, 100).catch(e => e);

      // First attempt
      await Promise.resolve();
      expect(operation).toHaveBeenCalledTimes(1);

      // Second attempt after 100ms
      await jest.advanceTimersByTimeAsync(100);
      expect(operation).toHaveBeenCalledTimes(2);

      // Should throw immediately without additional delay
      const error = await resultPromise;
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe('timeout');
    });
  });

  describe('default parameters', () => {
    it('should use default maxRetries of 3', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('timeout'));

      const resultPromise = withRetry(operation).catch(e => e);
      
      // Fast-forward through all timers
      await jest.runAllTimersAsync();

      const error = await resultPromise;
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe('timeout');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should use default baseDelay of 1000ms', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('timeout'));

      const resultPromise = withRetry(operation).catch(e => e);

      // First attempt
      await Promise.resolve();
      expect(operation).toHaveBeenCalledTimes(1);

      // First retry after 1000ms
      await jest.advanceTimersByTimeAsync(1000);
      expect(operation).toHaveBeenCalledTimes(2);

      // Second retry after 2000ms
      await jest.advanceTimersByTimeAsync(2000);
      expect(operation).toHaveBeenCalledTimes(3);

      const error = await resultPromise;
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe('timeout');
    });
  });

  describe('edge cases', () => {
    it('should handle maxRetries of 1', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('timeout'));

      await expect(withRetry(operation, 1, 100)).rejects.toThrow('timeout');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should handle operations that throw non-Error objects', async () => {
      const operation = jest.fn().mockRejectedValue('string error');

      await expect(withRetry(operation, 3, 100)).rejects.toBe('string error');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should handle operations that return promises', async () => {
      const operation = jest.fn().mockResolvedValue(Promise.resolve('nested'));

      const result = await withRetry(operation);

      expect(result).toBe('nested');
    });
  });
});
