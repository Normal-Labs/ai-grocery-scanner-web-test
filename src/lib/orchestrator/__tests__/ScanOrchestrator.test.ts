/**
 * Unit tests for ScanOrchestrator
 * 
 * Tests the cache-first scan flow, error handling, and multi-database coordination.
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 9.6, 10.4, 10.5
 */

import { ScanOrchestrator } from '../ScanOrchestrator';
import type { ProductRepository } from '../../supabase/repositories/ProductRepository';
import type { StoreRepository } from '../../supabase/repositories/StoreRepository';
import type { InventoryRepository } from '../../supabase/repositories/InventoryRepository';
import type { MongoDBCacheRepository } from '../../mongodb/cache';
import type { ScanRequest, ScanResult } from '../types';
import type { Product } from '../../supabase/types';
import type { CachedInsight } from '../../mongodb/types';
import type { AnalysisResult, ProductInsights } from '@/lib/types';

// Mock fetch globally
global.fetch = jest.fn();

describe('ScanOrchestrator', () => {
  let orchestrator: ScanOrchestrator;
  let mockProductRepo: any;
  let mockStoreRepo: any;
  let mockInventoryRepo: any;
  let mockCacheRepo: any;

  // Sample test data
  const sampleBarcode = '012345678901';
  const sampleUserId = 'user-123';
  const sampleImageData = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
  
  const sampleProduct: Product = {
    id: 'product-uuid-123',
    barcode: sampleBarcode,
    name: 'Organic Milk',
    brand: 'Happy Farms',
    last_scanned_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const sampleInsights: ProductInsights = {
    health: { rating: 'Good', explanation: 'Nutritious product' },
    preservatives: { rating: 'Low', explanation: 'Minimal preservatives' },
    allergies: { rating: 'None', explanation: 'No common allergens' },
    sustainability: { rating: 'Good', explanation: 'Sustainable sourcing' },
    carbon: { rating: 'Low', explanation: 'Low carbon footprint' },
  };

  const sampleCachedInsight: CachedInsight = {
    barcode: sampleBarcode,
    productName: 'Organic Milk',
    insights: sampleInsights,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    scanCount: 5,
  };

  const sampleAnalysisResult: AnalysisResult = {
    products: [{
      productName: 'Organic Milk',
      insights: sampleInsights,
    }],
  };

  const sampleScanRequest: ScanRequest = {
    barcode: sampleBarcode,
    imageData: sampleImageData,
    userId: sampleUserId,
    tier: 'premium',
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock repositories
    mockProductRepo = {
      findByBarcode: jest.fn(),
      upsert: jest.fn(),
      updateLastScanned: jest.fn(),
      getRecentlyScanned: jest.fn(),
    };

    mockStoreRepo = {
      findNearby: jest.fn(),
      findOrCreateNearby: jest.fn(),
      create: jest.fn(),
    };

    mockInventoryRepo = {
      recordSighting: jest.fn(),
      getStoresForProduct: jest.fn(),
      getProductsAtStore: jest.fn(),
      getProductsNearLocation: jest.fn(),
    };

    mockCacheRepo = {
      get: jest.fn(),
      set: jest.fn(),
      incrementScanCount: jest.fn(),
      invalidate: jest.fn(),
    };

    // Create orchestrator with mocked dependencies
    orchestrator = new ScanOrchestrator(
      mockProductRepo as unknown as ProductRepository,
      mockStoreRepo as unknown as StoreRepository,
      mockInventoryRepo as unknown as InventoryRepository,
      mockCacheRepo as unknown as MongoDBCacheRepository
    );
  });

  describe('processScan - Cache Hit Flow', () => {
    it('should return cached insight when cache hit occurs', async () => {
      // Requirement 5.1, 5.2, 5.3: Cache hit behavior
      
      // Setup: Cache returns existing insight
      mockCacheRepo.get.mockResolvedValue(sampleCachedInsight);
      mockProductRepo.findByBarcode.mockResolvedValue(sampleProduct);
      mockProductRepo.updateLastScanned.mockResolvedValue(undefined);
      mockCacheRepo.incrementScanCount.mockResolvedValue(undefined);

      // Execute
      const result = await orchestrator.processScan(sampleScanRequest);

      // Verify
      expect(result.fromCache).toBe(true);
      expect(result.analysis.products[0].productName).toBe('Organic Milk');
      expect(result.product.id).toBe('product-uuid-123');
      
      // Verify cache was checked
      expect(mockCacheRepo.get).toHaveBeenCalledWith(sampleBarcode);
      
      // Verify last_scanned_at was updated
      expect(mockProductRepo.updateLastScanned).toHaveBeenCalledWith(sampleBarcode);
      
      // Verify scan count was incremented
      expect(mockCacheRepo.incrementScanCount).toHaveBeenCalledWith(sampleBarcode);
      
      // Verify Research Agent was NOT called
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should create product in Supabase if not found on cache hit', async () => {
      // Requirement 5.2: Update Supabase on cache hit
      
      // Setup: Cache hit but product not in Supabase
      mockCacheRepo.get.mockResolvedValue(sampleCachedInsight);
      mockProductRepo.findByBarcode.mockResolvedValue(null);
      mockProductRepo.upsert.mockResolvedValue(sampleProduct);
      mockProductRepo.updateLastScanned.mockResolvedValue(undefined);
      mockCacheRepo.incrementScanCount.mockResolvedValue(undefined);

      // Execute
      const result = await orchestrator.processScan(sampleScanRequest);

      // Verify
      expect(result.fromCache).toBe(true);
      expect(mockProductRepo.upsert).toHaveBeenCalledWith({
        barcode: sampleBarcode,
        name: 'Organic Milk',
      });
    });

    it('should continue on cache hit even if Supabase update fails', async () => {
      // Requirement 10.5: Log errors but continue operation
      
      // Setup: Cache hit but Supabase update fails
      mockCacheRepo.get.mockResolvedValue(sampleCachedInsight);
      mockProductRepo.findByBarcode.mockResolvedValue(sampleProduct);
      mockProductRepo.updateLastScanned.mockRejectedValue(new Error('Supabase unavailable'));
      mockCacheRepo.incrementScanCount.mockResolvedValue(undefined);

      // Execute - should not throw
      const result = await orchestrator.processScan(sampleScanRequest);

      // Verify - scan still succeeds
      expect(result.fromCache).toBe(true);
      expect(result.analysis.products[0].productName).toBe('Organic Milk');
    });
  });

  describe('processScan - Cache Miss Flow', () => {
    it('should call Research Agent and save to both databases on cache miss', async () => {
      // Requirement 5.4, 5.5, 5.6: Cache miss behavior
      
      // Setup: Cache miss
      mockCacheRepo.get.mockResolvedValue(null);
      
      // Mock Research Agent response
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: sampleAnalysisResult,
        }),
      });
      
      mockCacheRepo.set.mockResolvedValue(undefined);
      mockProductRepo.upsert.mockResolvedValue(sampleProduct);

      // Execute
      const result = await orchestrator.processScan(sampleScanRequest);

      // Verify
      expect(result.fromCache).toBe(false);
      expect(result.analysis.products[0].productName).toBe('Organic Milk');
      expect(result.product.id).toBe('product-uuid-123');
      
      // Verify cache was checked
      expect(mockCacheRepo.get).toHaveBeenCalledWith(sampleBarcode);
      
      // Verify Research Agent was called
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/analyze'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining(sampleImageData),
        })
      );
      
      // Verify insight was saved to MongoDB
      expect(mockCacheRepo.set).toHaveBeenCalledWith(
        sampleBarcode,
        'Organic Milk',
        sampleInsights,
        30
      );
      
      // Verify product was saved to Supabase
      expect(mockProductRepo.upsert).toHaveBeenCalledWith({
        barcode: sampleBarcode,
        name: 'Organic Milk',
        brand: 'Organic', // Extracted from product name
      });
    });

    it('should throw error if Research Agent fails', async () => {
      // Requirement 10.5: Handle Research Agent failures
      
      // Setup: Cache miss and Research Agent fails
      mockCacheRepo.get.mockResolvedValue(null);
      
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ error: 'AI service unavailable' }),
      });

      // Execute and verify error
      try {
        await orchestrator.processScan(sampleScanRequest);
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.code).toBe('RESEARCH_AGENT_FAILED');
        expect(error.message).toContain('Research Agent failed');
        expect(error.source).toBe('research-agent');
      }
      
      // Verify cache and Supabase were not updated
      expect(mockCacheRepo.set).not.toHaveBeenCalled();
      expect(mockProductRepo.upsert).not.toHaveBeenCalled();
    });

    it('should throw error if product save to Supabase fails', async () => {
      // Requirement 5.6: Ensure product is saved to Supabase
      
      // Setup: Cache miss, Research Agent succeeds, but Supabase fails
      mockCacheRepo.get.mockResolvedValue(null);
      
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: sampleAnalysisResult,
        }),
      });
      
      mockCacheRepo.set.mockResolvedValue(undefined);
      mockProductRepo.upsert.mockRejectedValue(new Error('Database connection failed'));

      // Execute and verify error
      try {
        await orchestrator.processScan(sampleScanRequest);
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.code).toBe('PRODUCT_SAVE_FAILED');
        expect(error.message).toContain('Failed to save product to Supabase');
        expect(error.source).toBe('supabase');
      }
    });

    it('should continue if cache save fails on cache miss', async () => {
      // Requirement 10.5: Cache failures should not break the scan
      
      // Setup: Cache miss, Research Agent succeeds, cache save fails
      mockCacheRepo.get.mockResolvedValue(null);
      
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: sampleAnalysisResult,
        }),
      });
      
      mockCacheRepo.set.mockRejectedValue(new Error('MongoDB unavailable'));
      mockProductRepo.upsert.mockResolvedValue(sampleProduct);

      // Execute - should not throw
      const result = await orchestrator.processScan(sampleScanRequest);

      // Verify - scan still succeeds
      expect(result.fromCache).toBe(false);
      expect(result.product.id).toBe('product-uuid-123');
    });
  });

  describe('processScan - Location Processing', () => {
    it('should process location and record inventory when location provided', async () => {
      // Requirement 9.6: Process location and record inventory
      
      const requestWithLocation: ScanRequest = {
        ...sampleScanRequest,
        location: {
          latitude: 37.7749,
          longitude: -122.4194,
        },
      };

      const sampleStore = {
        id: 'store-uuid-456',
        name: 'Unknown Store',
        address: '37.7749, -122.4194',
        location: '{"type":"Point","coordinates":[-122.4194,37.7749]}',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Setup: Cache hit with location
      mockCacheRepo.get.mockResolvedValue(sampleCachedInsight);
      mockProductRepo.findByBarcode.mockResolvedValue(sampleProduct);
      mockProductRepo.updateLastScanned.mockResolvedValue(undefined);
      mockCacheRepo.incrementScanCount.mockResolvedValue(undefined);
      mockStoreRepo.findOrCreateNearby.mockResolvedValue(sampleStore);
      mockInventoryRepo.recordSighting.mockResolvedValue({
        id: 'inventory-uuid-789',
        product_id: sampleProduct.id,
        store_id: sampleStore.id,
        last_seen_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      // Execute
      const result = await orchestrator.processScan(requestWithLocation);

      // Verify
      expect(result.storeId).toBe('store-uuid-456');
      
      // Verify store was found/created
      expect(mockStoreRepo.findOrCreateNearby).toHaveBeenCalledWith(
        37.7749,
        -122.4194,
        'Unknown Store',
        '37.7749, -122.4194'
      );
      
      // Verify inventory was recorded
      expect(mockInventoryRepo.recordSighting).toHaveBeenCalledWith(
        sampleProduct.id,
        sampleStore.id
      );
    });

    it('should continue if location processing fails', async () => {
      // Requirement 10.5: Location failures should not break the scan
      
      const requestWithLocation: ScanRequest = {
        ...sampleScanRequest,
        location: {
          latitude: 37.7749,
          longitude: -122.4194,
        },
      };

      // Setup: Cache hit but location processing fails
      mockCacheRepo.get.mockResolvedValue(sampleCachedInsight);
      mockProductRepo.findByBarcode.mockResolvedValue(sampleProduct);
      mockProductRepo.updateLastScanned.mockResolvedValue(undefined);
      mockCacheRepo.incrementScanCount.mockResolvedValue(undefined);
      mockStoreRepo.findOrCreateNearby.mockRejectedValue(new Error('Geolocation service unavailable'));

      // Execute - should not throw
      const result = await orchestrator.processScan(requestWithLocation);

      // Verify - scan still succeeds without store
      expect(result.fromCache).toBe(true);
      expect(result.storeId).toBeUndefined();
    });
  });

  describe('processScan - Error Handling', () => {
    it('should handle MongoDB cache unavailable gracefully', async () => {
      // Requirement 10.2: Continue with degraded functionality when MongoDB unavailable
      
      // Setup: Cache throws error (MongoDB unavailable)
      mockCacheRepo.get.mockRejectedValue(new Error('MongoDB connection timeout'));
      
      // Mock Research Agent response (cache miss flow)
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: sampleAnalysisResult,
        }),
      });
      
      mockCacheRepo.set.mockResolvedValue(undefined);
      mockProductRepo.upsert.mockResolvedValue(sampleProduct);

      // Execute - should not throw
      const result = await orchestrator.processScan(sampleScanRequest);

      // Verify - scan succeeds with cache miss flow
      expect(result.fromCache).toBe(false);
      expect(result.product.id).toBe('product-uuid-123');
    });

    it('should include error context in thrown errors', async () => {
      // Requirement 10.5: Log errors with context
      
      // Setup: Cache miss and Research Agent fails
      mockCacheRepo.get.mockResolvedValue(null);
      
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ error: 'AI service unavailable' }),
      });

      // Execute and verify error has context
      try {
        await orchestrator.processScan(sampleScanRequest);
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.code).toBe('RESEARCH_AGENT_FAILED');
        expect(error.source).toBe('research-agent');
        expect(error.recoverable).toBe(false);
        expect(error.context).toMatchObject({
          barcode: sampleBarcode,
          tier: 'premium',
        });
      }
    });
  });

  describe('processScan - Free Tier', () => {
    it('should handle free tier scan with dimension', async () => {
      // Requirement 5.4: Support tier-based analysis
      
      const freeTierRequest: ScanRequest = {
        ...sampleScanRequest,
        tier: 'free',
        dimension: 'health',
      };

      // Setup: Cache miss
      mockCacheRepo.get.mockResolvedValue(null);
      
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: sampleAnalysisResult,
        }),
      });
      
      mockCacheRepo.set.mockResolvedValue(undefined);
      mockProductRepo.upsert.mockResolvedValue(sampleProduct);

      // Execute
      const result = await orchestrator.processScan(freeTierRequest);

      // Verify
      expect(result.fromCache).toBe(false);
      
      // Verify Research Agent was called with dimension
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/analyze'),
        expect.objectContaining({
          body: expect.stringContaining('"dimension":"health"'),
        })
      );
    });
  });

  describe('Brand Extraction', () => {
    it('should extract brand from product name', async () => {
      // Test the brand extraction heuristic
      
      // Setup: Cache miss with product name containing brand
      mockCacheRepo.get.mockResolvedValue(null);
      
      const analysisWithBrand: AnalysisResult = {
        products: [{
          productName: 'Coca-Cola Classic Soda',
          insights: sampleInsights,
        }],
      };
      
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: analysisWithBrand,
        }),
      });
      
      mockCacheRepo.set.mockResolvedValue(undefined);
      mockProductRepo.upsert.mockResolvedValue({
        ...sampleProduct,
        name: 'Coca-Cola Classic Soda',
        brand: 'Coca-Cola',
      });

      // Execute
      await orchestrator.processScan(sampleScanRequest);

      // Verify brand was extracted
      expect(mockProductRepo.upsert).toHaveBeenCalledWith({
        barcode: sampleBarcode,
        name: 'Coca-Cola Classic Soda',
        brand: 'Coca-Cola', // First word extracted as brand
      });
    });
  });
});
