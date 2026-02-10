/**
 * Unit tests for orchestration type definitions
 * 
 * Tests type guards and error factory functions to ensure
 * type safety and correct error handling.
 * 
 * Requirements: 5.1, 5.7, 7.5
 */

import {
  ScanRequest,
  ScanResult,
  OrchestratorError,
  isScanRequest,
  isOrchestratorError,
  isScanResult,
  createMongoDBError,
  createSupabaseError,
  createResearchAgentError,
  createGeolocationError,
} from '../types';

describe('Orchestration Type Guards', () => {
  describe('isScanRequest', () => {
    it('should return true for valid ScanRequest', () => {
      const validRequest: ScanRequest = {
        barcode: '1234567890',
        imageData: 'data:image/jpeg;base64,/9j/4AAQ...',
        userId: 'user-123',
        tier: 'premium',
      };

      expect(isScanRequest(validRequest)).toBe(true);
    });

    it('should return true for ScanRequest with location', () => {
      const requestWithLocation: ScanRequest = {
        barcode: '1234567890',
        imageData: 'data:image/jpeg;base64,/9j/4AAQ...',
        userId: 'user-123',
        tier: 'free',
        dimension: 'health',
        location: {
          latitude: 37.7749,
          longitude: -122.4194,
        },
      };

      expect(isScanRequest(requestWithLocation)).toBe(true);
    });

    it('should return false for invalid barcode type', () => {
      const invalid = {
        barcode: 123,
        imageData: 'data:image/jpeg;base64,/9j/4AAQ...',
        userId: 'user-123',
        tier: 'premium',
      };

      expect(isScanRequest(invalid)).toBe(false);
    });

    it('should return false for invalid tier', () => {
      const invalid = {
        barcode: '1234567890',
        imageData: 'data:image/jpeg;base64,/9j/4AAQ...',
        userId: 'user-123',
        tier: 'invalid',
      };

      expect(isScanRequest(invalid)).toBe(false);
    });

    it('should return false for invalid location coordinates', () => {
      const invalid = {
        barcode: '1234567890',
        imageData: 'data:image/jpeg;base64,/9j/4AAQ...',
        userId: 'user-123',
        tier: 'premium',
        location: {
          latitude: 100, // Invalid: > 90
          longitude: -122.4194,
        },
      };

      expect(isScanRequest(invalid)).toBe(false);
    });

    it('should return false for invalid dimension', () => {
      const invalid = {
        barcode: '1234567890',
        imageData: 'data:image/jpeg;base64,/9j/4AAQ...',
        userId: 'user-123',
        tier: 'free',
        dimension: 'invalid',
      };

      expect(isScanRequest(invalid)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isScanRequest(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isScanRequest(undefined)).toBe(false);
    });
  });

  describe('isOrchestratorError', () => {
    it('should return true for valid OrchestratorError', () => {
      const validError: OrchestratorError = {
        code: 'CACHE_UNAVAILABLE',
        message: 'MongoDB cache is unavailable',
        source: 'mongodb',
        recoverable: true,
      };

      expect(isOrchestratorError(validError)).toBe(true);
    });

    it('should return true for error with context', () => {
      const errorWithContext: OrchestratorError = {
        code: 'DB_CONNECTION_FAILED',
        message: 'Failed to connect to Supabase',
        source: 'supabase',
        recoverable: true,
        context: { barcode: '1234567890', userId: 'user-123' },
      };

      expect(isOrchestratorError(errorWithContext)).toBe(true);
    });

    it('should return false for invalid source', () => {
      const invalid = {
        code: 'ERROR',
        message: 'Error message',
        source: 'invalid',
        recoverable: true,
      };

      expect(isOrchestratorError(invalid)).toBe(false);
    });

    it('should return false for missing required fields', () => {
      const invalid = {
        code: 'ERROR',
        message: 'Error message',
        source: 'mongodb',
        // Missing recoverable field
      };

      expect(isOrchestratorError(invalid)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isOrchestratorError(null)).toBe(false);
    });
  });

  describe('isScanResult', () => {
    it('should return true for valid ScanResult', () => {
      const validResult: ScanResult = {
        fromCache: true,
        analysis: {
          products: [
            {
              productName: 'Test Product',
              insights: {
                health: { rating: 'Good', explanation: 'Healthy product' },
                preservatives: { rating: 'Low', explanation: 'Few preservatives' },
                allergies: { rating: 'None', explanation: 'No common allergens' },
                sustainability: { rating: 'Good', explanation: 'Sustainable sourcing' },
                carbon: { rating: 'Low', explanation: 'Low carbon footprint' },
              },
            },
          ],
        },
        product: {
          id: 'prod-123',
          barcode: '1234567890',
          name: 'Test Product',
          brand: 'Test Brand',
          last_scanned_at: '2024-01-01T00:00:00Z',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      };

      expect(isScanResult(validResult)).toBe(true);
    });

    it('should return true for result with storeId', () => {
      const resultWithStore: ScanResult = {
        fromCache: false,
        analysis: {
          products: [
            {
              productName: 'Test Product',
              insights: {
                health: { rating: 'Good', explanation: 'Healthy product' },
                preservatives: { rating: 'Low', explanation: 'Few preservatives' },
                allergies: { rating: 'None', explanation: 'No common allergens' },
                sustainability: { rating: 'Good', explanation: 'Sustainable sourcing' },
                carbon: { rating: 'Low', explanation: 'Low carbon footprint' },
              },
            },
          ],
        },
        product: {
          id: 'prod-123',
          barcode: '1234567890',
          name: 'Test Product',
          brand: 'Test Brand',
          last_scanned_at: '2024-01-01T00:00:00Z',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        storeId: 'store-123',
      };

      expect(isScanResult(resultWithStore)).toBe(true);
    });

    it('should return false for missing required fields', () => {
      const invalid = {
        fromCache: true,
        analysis: { products: [] },
        // Missing product field
      };

      expect(isScanResult(invalid)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isScanResult(null)).toBe(false);
    });
  });
});

describe('Error Factory Functions', () => {
  describe('createMongoDBError', () => {
    it('should create MongoDB error with correct source', () => {
      const error = createMongoDBError(
        'CACHE_UNAVAILABLE',
        'MongoDB cache is unavailable'
      );

      expect(error.code).toBe('CACHE_UNAVAILABLE');
      expect(error.message).toBe('MongoDB cache is unavailable');
      expect(error.source).toBe('mongodb');
      expect(error.recoverable).toBe(true);
      expect(error.context).toBeUndefined();
    });

    it('should create MongoDB error with context', () => {
      const context = { barcode: '1234567890' };
      const error = createMongoDBError(
        'CACHE_MISS',
        'Cache miss for barcode',
        false,
        context
      );

      expect(error.code).toBe('CACHE_MISS');
      expect(error.recoverable).toBe(false);
      expect(error.context).toEqual(context);
    });
  });

  describe('createSupabaseError', () => {
    it('should create Supabase error with correct source', () => {
      const error = createSupabaseError(
        'DB_CONNECTION_FAILED',
        'Failed to connect to Supabase'
      );

      expect(error.code).toBe('DB_CONNECTION_FAILED');
      expect(error.message).toBe('Failed to connect to Supabase');
      expect(error.source).toBe('supabase');
      expect(error.recoverable).toBe(true);
    });

    it('should create Supabase error with custom recoverable flag', () => {
      const error = createSupabaseError(
        'CONSTRAINT_VIOLATION',
        'Unique constraint violated',
        false
      );

      expect(error.recoverable).toBe(false);
    });
  });

  describe('createResearchAgentError', () => {
    it('should create Research Agent error with correct source', () => {
      const error = createResearchAgentError(
        'ANALYSIS_FAILED',
        'Research Agent failed to analyze product'
      );

      expect(error.code).toBe('ANALYSIS_FAILED');
      expect(error.message).toBe('Research Agent failed to analyze product');
      expect(error.source).toBe('research-agent');
      expect(error.recoverable).toBe(false);
    });

    it('should default to non-recoverable', () => {
      const error = createResearchAgentError(
        'API_ERROR',
        'API request failed'
      );

      expect(error.recoverable).toBe(false);
    });
  });

  describe('createGeolocationError', () => {
    it('should create Geolocation error with correct source', () => {
      const error = createGeolocationError(
        'PERMISSION_DENIED',
        'User denied geolocation permission'
      );

      expect(error.code).toBe('PERMISSION_DENIED');
      expect(error.message).toBe('User denied geolocation permission');
      expect(error.source).toBe('geolocation');
      expect(error.recoverable).toBe(false);
    });

    it('should create error with context', () => {
      const context = { userId: 'user-123' };
      const error = createGeolocationError(
        'TIMEOUT',
        'Geolocation request timed out',
        true,
        context
      );

      expect(error.recoverable).toBe(true);
      expect(error.context).toEqual(context);
    });
  });
});

describe('Type Safety', () => {
  it('should enforce ScanRequest type structure', () => {
    const request: ScanRequest = {
      barcode: '1234567890',
      imageData: 'data:image/jpeg;base64,/9j/4AAQ...',
      userId: 'user-123',
      tier: 'premium',
    };

    // TypeScript should enforce these types at compile time
    expect(typeof request.barcode).toBe('string');
    expect(typeof request.imageData).toBe('string');
    expect(typeof request.userId).toBe('string');
    expect(['free', 'premium']).toContain(request.tier);
  });

  it('should enforce OrchestratorError type structure', () => {
    const error: OrchestratorError = {
      code: 'TEST_ERROR',
      message: 'Test error message',
      source: 'mongodb',
      recoverable: true,
    };

    expect(typeof error.code).toBe('string');
    expect(typeof error.message).toBe('string');
    expect(['mongodb', 'supabase', 'research-agent', 'geolocation']).toContain(
      error.source
    );
    expect(typeof error.recoverable).toBe('boolean');
  });
});
