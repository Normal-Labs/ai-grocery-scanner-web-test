/**
 * Unit tests for ScanOrchestratorMultiTier logging functionality
 * 
 * Tests that tier usage is properly logged to the scan_logs table.
 * 
 * Requirements: 6.6, 6.7, 14.1, 14.2, 14.3
 */

import { ScanOrchestratorMultiTier } from '../ScanOrchestratorMultiTier';
import { CacheService } from '@/lib/mongodb/cache-service';
import { ProductRepositoryMultiTier } from '@/lib/supabase/repositories/ProductRepositoryMultiTier';
import { VisualExtractorService } from '@/lib/services/visual-extractor';
import { ImageAnalyzerService } from '@/lib/services/image-analyzer';
import { DiscoveryService } from '@/lib/services/discovery-service';
import { getSupabaseServerClient } from '@/lib/supabase/server-client';
import type { ScanRequest } from '@/lib/types/multi-tier';

// Mock all dependencies
jest.mock('@/lib/mongodb/cache-service');
jest.mock('@/lib/supabase/repositories/ProductRepositoryMultiTier');
jest.mock('@/lib/services/visual-extractor');
jest.mock('@/lib/services/image-analyzer');
jest.mock('@/lib/services/discovery-service');
jest.mock('@/lib/supabase/server-client');

describe('ScanOrchestratorMultiTier - Logging', () => {
  let orchestrator: ScanOrchestratorMultiTier;
  let mockCacheService: jest.Mocked<CacheService>;
  let mockProductRepo: jest.Mocked<ProductRepositoryMultiTier>;
  let mockVisualExtractor: jest.Mocked<VisualExtractorService>;
  let mockImageAnalyzer: jest.Mocked<ImageAnalyzerService>;
  let mockDiscoveryService: jest.Mocked<DiscoveryService>;
  let mockSupabaseClient: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup Supabase client mock
    mockSupabaseClient = {
      from: jest.fn().mockReturnThis(),
      insert: jest.fn().mockResolvedValue({ error: null }),
    };
    (getSupabaseServerClient as jest.Mock).mockReturnValue(mockSupabaseClient);

    // Setup service mocks
    mockCacheService = new CacheService() as jest.Mocked<CacheService>;
    mockProductRepo = new ProductRepositoryMultiTier() as jest.Mocked<ProductRepositoryMultiTier>;
    mockVisualExtractor = new VisualExtractorService() as jest.Mocked<VisualExtractorService>;
    mockImageAnalyzer = new ImageAnalyzerService() as jest.Mocked<ImageAnalyzerService>;
    mockDiscoveryService = new DiscoveryService('test-key') as jest.Mocked<DiscoveryService>;

    // Create orchestrator instance
    orchestrator = new ScanOrchestratorMultiTier(
      mockCacheService,
      mockProductRepo,
      mockVisualExtractor,
      mockImageAnalyzer,
      mockDiscoveryService
    );
  });

  describe('Tier 1 logging', () => {
    it('should log successful Tier 1 cache hit', async () => {
      // Setup: Mock cache hit
      const mockProduct = {
        id: 'product-123',
        barcode: '123456789',
        name: 'Test Product',
        brand: 'Test Brand',
        category: 'Test',
        metadata: {},
      };

      mockCacheService.lookup = jest.fn().mockResolvedValue({
        hit: true,
        entry: {
          productData: mockProduct,
          tier: 1,
          confidenceScore: 1.0,
        },
      });

      const request: ScanRequest = {
        barcode: '123456789',
        userId: 'user-123',
        sessionId: 'session-456',
      };

      // Execute
      await orchestrator.scan(request);

      // Verify: scan_logs insert was called
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('scan_logs');
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-123',
          session_id: 'session-456',
          tier: 1,
          success: true,
          cached: true,
          barcode: '123456789',
          product_id: 'product-123',
          confidence_score: 1.0,
        })
      );
    });

    it('should log Tier 1 failure when barcode not found', async () => {
      // Setup: Mock cache miss and database miss
      mockCacheService.lookup = jest.fn().mockResolvedValue({ hit: false });
      mockProductRepo.withTransaction = jest.fn().mockImplementation(async (fn) => fn());
      mockProductRepo.findByBarcode = jest.fn().mockResolvedValue(null);

      const request: ScanRequest = {
        barcode: '123456789',
        userId: 'user-123',
        sessionId: 'session-456',
      };

      // Execute
      await orchestrator.scan(request);

      // Verify: Tier 1 failure was logged
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          tier: 1,
          success: false,
          error_code: 'NOT_FOUND',
        })
      );
    });
  });

  describe('Error handling', () => {
    it('should handle logging failures gracefully', async () => {
      // Setup: Mock cache hit but logging failure
      const mockProduct = {
        id: 'product-123',
        barcode: '123456789',
        name: 'Test Product',
        brand: 'Test Brand',
        category: 'Test',
        metadata: {},
      };

      mockCacheService.lookup = jest.fn().mockResolvedValue({
        hit: true,
        entry: {
          productData: mockProduct,
          tier: 1,
          confidenceScore: 1.0,
        },
      });

      // Mock logging failure
      mockSupabaseClient.insert = jest.fn().mockResolvedValue({
        error: { message: 'Database error' },
      });

      const request: ScanRequest = {
        barcode: '123456789',
        userId: 'user-123',
        sessionId: 'session-456',
      };

      // Execute - should not throw despite logging failure
      const result = await orchestrator.scan(request);

      // Verify: Scan still succeeded despite logging failure
      expect(result.success).toBe(true);
      expect(result.product).toEqual(mockProduct);
    });
  });

  describe('Cache hit tracking', () => {
    it('should track cache hits correctly', async () => {
      // Setup: Mock cache hit
      const mockProduct = {
        id: 'product-123',
        barcode: '123456789',
        name: 'Test Product',
        brand: 'Test Brand',
        category: 'Test',
        metadata: {},
      };

      mockCacheService.lookup = jest.fn().mockResolvedValue({
        hit: true,
        entry: {
          productData: mockProduct,
          tier: 1,
          confidenceScore: 1.0,
        },
      });

      const request: ScanRequest = {
        barcode: '123456789',
        userId: 'user-123',
        sessionId: 'session-456',
      };

      // Execute
      await orchestrator.scan(request);

      // Verify: cached flag is true
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          cached: true,
        })
      );
    });

    it('should track cache misses correctly', async () => {
      // Setup: Mock cache miss but database hit
      const mockProduct = {
        id: 'product-123',
        barcode: '123456789',
        name: 'Test Product',
        brand: 'Test Brand',
        category: 'Test',
        size: null,
        image_url: null,
        metadata: {},
      };

      mockCacheService.lookup = jest.fn().mockResolvedValue({ hit: false });
      mockProductRepo.withTransaction = jest.fn().mockImplementation(async (fn) => fn());
      mockProductRepo.findByBarcode = jest.fn().mockResolvedValue(mockProduct);
      mockCacheService.store = jest.fn().mockResolvedValue(undefined);

      const request: ScanRequest = {
        barcode: '123456789',
        userId: 'user-123',
        sessionId: 'session-456',
      };

      // Execute
      await orchestrator.scan(request);

      // Verify: cached flag is false
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          cached: false,
        })
      );
    });
  });

  describe('Processing time tracking', () => {
    it('should log processing time', async () => {
      // Setup: Mock cache hit
      const mockProduct = {
        id: 'product-123',
        barcode: '123456789',
        name: 'Test Product',
        brand: 'Test Brand',
        category: 'Test',
        metadata: {},
      };

      mockCacheService.lookup = jest.fn().mockResolvedValue({
        hit: true,
        entry: {
          productData: mockProduct,
          tier: 1,
          confidenceScore: 1.0,
        },
      });

      const request: ScanRequest = {
        barcode: '123456789',
        userId: 'user-123',
        sessionId: 'session-456',
      };

      // Execute
      await orchestrator.scan(request);

      // Verify: processing_time_ms is logged
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          processing_time_ms: expect.any(Number),
        })
      );

      // Verify: processing time is reasonable (< 1000ms for cache hit)
      const loggedData = mockSupabaseClient.insert.mock.calls[0][0];
      expect(loggedData.processing_time_ms).toBeLessThan(1000);
    });
  });
});
