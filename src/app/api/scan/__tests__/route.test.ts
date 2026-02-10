/**
 * Unit tests for Scan API endpoint
 * 
 * Tests the /api/scan endpoint including authentication, validation,
 * cache-first flow, error handling, and rate limiting.
 * 
 * Requirements: 1.2, 1.5, 5.1, 5.2, 5.3, 5.4, 10.1, 10.2, 10.3, 10.6
 * 
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { POST } from '../route';
import { getSupabaseClient } from '@/lib/supabase/client';
import { scanOrchestrator } from '@/lib/orchestrator/ScanOrchestrator';
import type { ScanResult } from '@/lib/orchestrator/types';
import type { Product } from '@/lib/supabase/types';

// Mock dependencies
jest.mock('@/lib/supabase/client');
jest.mock('@/lib/orchestrator/ScanOrchestrator');

const mockGetSupabaseClient = getSupabaseClient as jest.MockedFunction<typeof getSupabaseClient>;
const mockScanOrchestrator = scanOrchestrator as jest.Mocked<typeof scanOrchestrator>;

describe('POST /api/scan', () => {
  // Test data
  const validBarcode = '012345678901';
  const validImageData = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
  const validUserId = 'user-123';
  const validToken = 'valid-token-123';
  
  const mockProduct: Product = {
    id: 'product-123',
    barcode: validBarcode,
    name: 'Test Product',
    brand: 'Test Brand',
    last_scanned_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockScanResult: ScanResult = {
    fromCache: true,
    analysis: {
      products: [{
        productName: 'Test Product',
        insights: {
          health: { score: 8, summary: 'Healthy', details: [] },
          preservatives: { score: 7, summary: 'Low preservatives', details: [] },
          allergies: { score: 9, summary: 'No common allergens', details: [] },
          sustainability: { score: 6, summary: 'Moderate', details: [] },
          carbon: { score: 5, summary: 'Average', details: [] },
        },
      }],
    },
    product: mockProduct,
  };

  // Mock Supabase client
  const mockSupabaseAuth = {
    getUser: jest.fn(),
  };

  const mockSupabaseClient = {
    auth: mockSupabaseAuth,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset rate limiter by clearing the module cache
    jest.resetModules();
    
    // Setup default mocks
    mockGetSupabaseClient.mockReturnValue(mockSupabaseClient as any);
    mockSupabaseAuth.getUser.mockResolvedValue({
      data: { user: { id: validUserId } },
      error: null,
    } as any);
    mockScanOrchestrator.processScan.mockResolvedValue(mockScanResult);
  });

  /**
   * Helper to create a mock NextRequest
   */
  function createMockRequest(body: any, authToken?: string, ip?: string): NextRequest {
    const headers = new Headers({
      'content-type': 'application/json',
    });
    
    if (authToken) {
      headers.set('authorization', `Bearer ${authToken}`);
    }

    // Use unique IP for each test to avoid rate limiting interference
    if (ip) {
      headers.set('x-forwarded-for', ip);
    } else {
      // Generate a random IP for each request
      const randomIP = `10.0.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
      headers.set('x-forwarded-for', randomIP);
    }

    return new NextRequest('http://localhost:3000/api/scan', {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
  }

  describe('Authentication', () => {
    it('should reject unauthenticated requests', async () => {
      // Requirement 1.5: Prompt for authentication before allowing scans
      const request = createMockRequest({
        barcode: validBarcode,
        imageData: validImageData,
        tier: 'free',
        dimension: 'health',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Authentication required');
    });

    it('should reject requests with invalid token', async () => {
      // Requirement 10.6: Provide clear error messages for authentication failures
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' },
      } as any);

      const request = createMockRequest(
        {
          barcode: validBarcode,
          imageData: validImageData,
          tier: 'free',
          dimension: 'health',
        },
        'invalid-token'
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Authentication required');
    });

    it('should accept authenticated requests', async () => {
      // Requirement 1.2: Associate scans with authenticated user_id
      const request = createMockRequest(
        {
          barcode: validBarcode,
          imageData: validImageData,
          tier: 'free',
          dimension: 'health',
        },
        validToken
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockScanOrchestrator.processScan).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: validUserId,
        })
      );
    });
  });

  describe('Request Validation', () => {
    it('should reject missing barcode', async () => {
      const request = createMockRequest(
        {
          imageData: validImageData,
          tier: 'free',
          dimension: 'health',
        },
        validToken
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('barcode');
    });

    it('should reject invalid barcode format', async () => {
      const request = createMockRequest(
        {
          barcode: 'invalid',
          imageData: validImageData,
          tier: 'free',
          dimension: 'health',
        },
        validToken
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid barcode format');
    });

    it('should reject missing imageData', async () => {
      const request = createMockRequest(
        {
          barcode: validBarcode,
          tier: 'free',
          dimension: 'health',
        },
        validToken
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('imageData');
    });

    it('should reject invalid imageData format', async () => {
      const request = createMockRequest(
        {
          barcode: validBarcode,
          imageData: 'not-base64',
          tier: 'free',
          dimension: 'health',
        },
        validToken
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid base64 image format');
    });

    it('should reject invalid tier', async () => {
      const request = createMockRequest(
        {
          barcode: validBarcode,
          imageData: validImageData,
          tier: 'invalid',
          dimension: 'health',
        },
        validToken
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid tier');
    });

    it('should reject free tier without dimension', async () => {
      const request = createMockRequest(
        {
          barcode: validBarcode,
          imageData: validImageData,
          tier: 'free',
        },
        validToken
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Dimension is required for free tier');
    });

    it('should accept premium tier without dimension', async () => {
      const request = createMockRequest(
        {
          barcode: validBarcode,
          imageData: validImageData,
          tier: 'premium',
        },
        validToken
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should reject invalid location format', async () => {
      const request = createMockRequest(
        {
          barcode: validBarcode,
          imageData: validImageData,
          tier: 'free',
          dimension: 'health',
          location: { invalid: 'format' },
        },
        validToken
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid location format');
    });

    it('should reject invalid latitude', async () => {
      const request = createMockRequest(
        {
          barcode: validBarcode,
          imageData: validImageData,
          tier: 'free',
          dimension: 'health',
          location: { latitude: 100, longitude: 0 },
        },
        validToken
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid latitude');
    });

    it('should reject invalid longitude', async () => {
      const request = createMockRequest(
        {
          barcode: validBarcode,
          imageData: validImageData,
          tier: 'free',
          dimension: 'health',
          location: { latitude: 0, longitude: 200 },
        },
        validToken
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid longitude');
    });

    it('should accept valid location', async () => {
      const request = createMockRequest(
        {
          barcode: validBarcode,
          imageData: validImageData,
          tier: 'free',
          dimension: 'health',
          location: { latitude: 37.7749, longitude: -122.4194 },
        },
        validToken
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockScanOrchestrator.processScan).toHaveBeenCalledWith(
        expect.objectContaining({
          location: { latitude: 37.7749, longitude: -122.4194 },
        })
      );
    });
  });

  describe('Cache-First Flow', () => {
    it('should return cached result when available', async () => {
      // Requirement 5.1, 5.2, 5.3: Cache hit behavior
      const cachedResult: ScanResult = {
        ...mockScanResult,
        fromCache: true,
      };
      mockScanOrchestrator.processScan.mockResolvedValue(cachedResult);

      const request = createMockRequest(
        {
          barcode: validBarcode,
          imageData: validImageData,
          tier: 'free',
          dimension: 'health',
        },
        validToken
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.fromCache).toBe(true);
      expect(mockScanOrchestrator.processScan).toHaveBeenCalledTimes(1);
    });

    it('should trigger Research Agent on cache miss', async () => {
      // Requirement 5.4: Trigger Research Agent when cache miss occurs
      const newResult: ScanResult = {
        ...mockScanResult,
        fromCache: false,
      };
      mockScanOrchestrator.processScan.mockResolvedValue(newResult);

      const request = createMockRequest(
        {
          barcode: validBarcode,
          imageData: validImageData,
          tier: 'premium',
        },
        validToken
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.fromCache).toBe(false);
      expect(mockScanOrchestrator.processScan).toHaveBeenCalledTimes(1);
    });

    it('should include store ID when location is provided', async () => {
      const resultWithStore: ScanResult = {
        ...mockScanResult,
        storeId: 'store-123',
      };
      mockScanOrchestrator.processScan.mockResolvedValue(resultWithStore);

      const request = createMockRequest(
        {
          barcode: validBarcode,
          imageData: validImageData,
          tier: 'free',
          dimension: 'health',
          location: { latitude: 37.7749, longitude: -122.4194 },
        },
        validToken
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.storeId).toBe('store-123');
    });
  });

  describe('Error Handling', () => {
    it('should handle MongoDB unavailable error', async () => {
      // Requirement 10.1: Handle database unavailability gracefully
      // Requirement 10.2: Provide user-friendly error messages
      mockScanOrchestrator.processScan.mockRejectedValue({
        code: 'CACHE_UNAVAILABLE',
        message: 'MongoDB connection failed',
        source: 'mongodb',
        recoverable: true,
      });

      const request = createMockRequest(
        {
          barcode: validBarcode,
          imageData: validImageData,
          tier: 'free',
          dimension: 'health',
        },
        validToken
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Cache service temporarily unavailable');
      expect(response.headers.get('Retry-After')).toBe('5');
    });

    it('should handle Supabase unavailable error', async () => {
      // Requirement 10.1: Handle database unavailability gracefully
      mockScanOrchestrator.processScan.mockRejectedValue({
        code: 'DB_CONNECTION_FAILED',
        message: 'Supabase connection failed',
        source: 'supabase',
        recoverable: true,
      });

      const request = createMockRequest(
        {
          barcode: validBarcode,
          imageData: validImageData,
          tier: 'free',
          dimension: 'health',
        },
        validToken
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Database temporarily unavailable');
    });

    it('should handle Research Agent failure', async () => {
      mockScanOrchestrator.processScan.mockRejectedValue({
        code: 'RESEARCH_AGENT_FAILED',
        message: 'Research Agent API error',
        source: 'research-agent',
        recoverable: false,
      });

      const request = createMockRequest(
        {
          barcode: validBarcode,
          imageData: validImageData,
          tier: 'free',
          dimension: 'health',
        },
        validToken
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Unable to analyze product');
    });

    it('should handle generic errors', async () => {
      mockScanOrchestrator.processScan.mockRejectedValue(
        new Error('Unexpected error')
      );

      const request = createMockRequest(
        {
          barcode: validBarcode,
          imageData: validImageData,
          tier: 'free',
          dimension: 'health',
        },
        validToken
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('unexpected error');
    });
  });

  describe('Rate Limiting', () => {
    // Clear rate limiter before each test in this suite
    beforeEach(() => {
      // We need to import and clear the rate limiter
      // Since it's module-level, we'll use a workaround with unique IPs
    });

    it('should allow requests within rate limit', async () => {
      // Requirement 10.3: Implement rate limiting
      // Use unique IP for this test
      const uniqueIP = '192.168.1.100';

      // Make 5 requests (within limit of 10)
      for (let i = 0; i < 5; i++) {
        const uniqueRequest = new NextRequest('http://localhost:3000/api/scan', {
          method: 'POST',
          headers: new Headers({
            'content-type': 'application/json',
            'authorization': `Bearer ${validToken}`,
            'x-forwarded-for': uniqueIP,
          }),
          body: JSON.stringify({
            barcode: validBarcode,
            imageData: validImageData,
            tier: 'free',
            dimension: 'health',
          }),
        });
        
        const response = await POST(uniqueRequest);
        expect(response.status).toBe(200);
      }
    });

    it('should reject requests exceeding rate limit', async () => {
      // Requirement 10.3: Implement rate limiting
      // Use unique IP for this test
      const uniqueIP = '192.168.1.101';

      // Make 11 requests (exceeds limit of 10)
      let lastResponse;
      for (let i = 0; i < 11; i++) {
        const uniqueRequest = new NextRequest('http://localhost:3000/api/scan', {
          method: 'POST',
          headers: new Headers({
            'content-type': 'application/json',
            'authorization': `Bearer ${validToken}`,
            'x-forwarded-for': uniqueIP,
          }),
          body: JSON.stringify({
            barcode: validBarcode,
            imageData: validImageData,
            tier: 'free',
            dimension: 'health',
          }),
        });
        
        lastResponse = await POST(uniqueRequest);
      }

      expect(lastResponse!.status).toBe(429);
      const data = await lastResponse!.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Too many requests');
      expect(lastResponse!.headers.get('Retry-After')).toBe('60');
    });
  });

  describe('Complete Scan Flow', () => {
    it('should successfully process a complete scan with all fields', async () => {
      const completeResult: ScanResult = {
        fromCache: false,
        analysis: {
          products: [{
            productName: 'Complete Test Product',
            insights: {
              health: { score: 8, summary: 'Healthy', details: [] },
              preservatives: { score: 7, summary: 'Low preservatives', details: [] },
              allergies: { score: 9, summary: 'No common allergens', details: [] },
              sustainability: { score: 6, summary: 'Moderate', details: [] },
              carbon: { score: 5, summary: 'Average', details: [] },
            },
          }],
        },
        product: mockProduct,
        storeId: 'store-456',
      };
      mockScanOrchestrator.processScan.mockResolvedValue(completeResult);

      const request = createMockRequest(
        {
          barcode: validBarcode,
          imageData: validImageData,
          tier: 'premium',
          location: { latitude: 37.7749, longitude: -122.4194 },
        },
        validToken
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.fromCache).toBe(false);
      expect(data.data.product.barcode).toBe(validBarcode);
      expect(data.data.storeId).toBe('store-456');
      
      expect(mockScanOrchestrator.processScan).toHaveBeenCalledWith({
        barcode: validBarcode,
        imageData: validImageData,
        userId: validUserId,
        location: { latitude: 37.7749, longitude: -122.4194 },
        tier: 'premium',
        dimension: undefined,
      });
    });
  });
});
