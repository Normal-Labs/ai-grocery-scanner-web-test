/**
 * Unit tests for ProductRepository
 * 
 * Tests product data access operations including finding by barcode,
 * upserting products, updating timestamps, and querying recent scans.
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.6, 7.5
 */

import { ProductRepository } from '../ProductRepository';
import { getSupabaseClient } from '../../client';
import type { Product, ProductInsert } from '../../types';

// Mock the Supabase client
jest.mock('../../client');

describe('ProductRepository', () => {
  let repository: ProductRepository;
  let mockSupabaseClient: any;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Create mock Supabase client
    mockSupabaseClient = {
      from: jest.fn(() => mockSupabaseClient),
      select: jest.fn(() => mockSupabaseClient),
      eq: jest.fn(() => mockSupabaseClient),
      maybeSingle: jest.fn(),
      upsert: jest.fn(() => mockSupabaseClient),
      single: jest.fn(),
      update: jest.fn(() => mockSupabaseClient),
      order: jest.fn(() => mockSupabaseClient),
      limit: jest.fn(),
    };

    // Mock getSupabaseClient to return our mock
    (getSupabaseClient as jest.Mock).mockReturnValue(mockSupabaseClient);

    // Create repository instance
    repository = new ProductRepository();
  });

  describe('findByBarcode', () => {
    const mockProduct: Product = {
      id: 'product-123',
      barcode: '012345678901',
      name: 'Organic Milk',
      brand: 'Happy Farms',
      last_scanned_at: '2024-01-01T00:00:00Z',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    it('should find product by barcode', async () => {
      mockSupabaseClient.maybeSingle.mockResolvedValue({
        data: mockProduct,
        error: null,
      });

      const result = await repository.findByBarcode('012345678901');

      expect(result).toEqual(mockProduct);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('products');
      expect(mockSupabaseClient.select).toHaveBeenCalledWith('*');
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('barcode', '012345678901');
      expect(mockSupabaseClient.maybeSingle).toHaveBeenCalled();
    });

    it('should return null when product not found', async () => {
      mockSupabaseClient.maybeSingle.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await repository.findByBarcode('999999999999');

      expect(result).toBeNull();
    });

    it('should throw RepositoryError on database error', async () => {
      const dbError = {
        message: 'Database connection failed',
        code: 'PGRST301',
      };

      mockSupabaseClient.maybeSingle.mockResolvedValue({
        data: null,
        error: dbError,
      });

      await expect(repository.findByBarcode('012345678901')).rejects.toMatchObject({
        code: 'FIND_BY_BARCODE_FAILED',
        message: expect.stringContaining('Database connection failed'),
        source: 'supabase',
        recoverable: true,
        context: {
          barcode: '012345678901',
          errorCode: 'PGRST301',
        },
      });
    });

    it('should handle unexpected errors', async () => {
      mockSupabaseClient.maybeSingle.mockRejectedValue(new Error('Unexpected error'));

      await expect(repository.findByBarcode('012345678901')).rejects.toMatchObject({
        code: 'FIND_BY_BARCODE_UNEXPECTED',
        message: expect.stringContaining('unexpected error'),
        source: 'supabase',
        recoverable: false,
      });
    });
  });

  describe('upsert', () => {
    const mockProductInsert: ProductInsert = {
      barcode: '012345678901',
      name: 'Organic Milk',
      brand: 'Happy Farms',
    };

    const mockProduct: Product = {
      id: 'product-123',
      barcode: '012345678901',
      name: 'Organic Milk',
      brand: 'Happy Farms',
      last_scanned_at: '2024-01-01T00:00:00Z',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    beforeEach(() => {
      // Mock Date.now() for consistent timestamps
      jest.spyOn(Date.prototype, 'toISOString').mockReturnValue('2024-01-01T00:00:00Z');
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should insert new product', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: mockProduct,
        error: null,
      });

      const result = await repository.upsert(mockProductInsert);

      expect(result).toEqual(mockProduct);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('products');
      expect(mockSupabaseClient.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          ...mockProductInsert,
          last_scanned_at: '2024-01-01T00:00:00Z',
        }),
        {
          onConflict: 'barcode',
          ignoreDuplicates: false,
        }
      );
      expect(mockSupabaseClient.select).toHaveBeenCalled();
      expect(mockSupabaseClient.single).toHaveBeenCalled();
    });

    it('should update existing product on conflict', async () => {
      const updatedProduct = {
        ...mockProduct,
        last_scanned_at: '2024-01-01T00:00:00Z',
      };

      mockSupabaseClient.single.mockResolvedValue({
        data: updatedProduct,
        error: null,
      });

      const result = await repository.upsert(mockProductInsert);

      expect(result).toEqual(updatedProduct);
      expect(mockSupabaseClient.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          last_scanned_at: '2024-01-01T00:00:00Z',
        }),
        {
          onConflict: 'barcode',
          ignoreDuplicates: false,
        }
      );
    });

    it('should handle products with null barcode', async () => {
      const productWithoutBarcode: ProductInsert = {
        barcode: null,
        name: 'Fresh Produce',
        brand: null,
      };

      const resultProduct: Product = {
        id: 'product-456',
        barcode: null,
        name: 'Fresh Produce',
        brand: null,
        last_scanned_at: '2024-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockSupabaseClient.single.mockResolvedValue({
        data: resultProduct,
        error: null,
      });

      const result = await repository.upsert(productWithoutBarcode);

      expect(result).toEqual(resultProduct);
      expect(result.barcode).toBeNull();
    });

    it('should throw RepositoryError on database error', async () => {
      const dbError = {
        message: 'Unique constraint violation',
        code: '23505',
      };

      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: dbError,
      });

      await expect(repository.upsert(mockProductInsert)).rejects.toMatchObject({
        code: 'UPSERT_FAILED',
        message: expect.stringContaining('Unique constraint violation'),
        source: 'supabase',
        recoverable: true,
      });
    });

    it('should throw error when no data returned', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: null,
      });

      await expect(repository.upsert(mockProductInsert)).rejects.toMatchObject({
        code: 'UPSERT_NO_DATA',
        message: expect.stringContaining('no product data was returned'),
        source: 'supabase',
        recoverable: false,
      });
    });

    it('should handle unexpected errors', async () => {
      mockSupabaseClient.single.mockRejectedValue(new Error('Unexpected error'));

      await expect(repository.upsert(mockProductInsert)).rejects.toMatchObject({
        code: 'UPSERT_UNEXPECTED',
        message: expect.stringContaining('unexpected error'),
        source: 'supabase',
        recoverable: false,
      });
    });
  });

  describe('updateLastScanned', () => {
    beforeEach(() => {
      // Mock Date.now() for consistent timestamps
      jest.spyOn(Date.prototype, 'toISOString').mockReturnValue('2024-01-01T12:00:00Z');
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should update last_scanned_at timestamp', async () => {
      mockSupabaseClient.eq.mockResolvedValue({
        data: null,
        error: null,
      });

      await repository.updateLastScanned('012345678901');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('products');
      expect(mockSupabaseClient.update).toHaveBeenCalledWith({
        last_scanned_at: '2024-01-01T12:00:00Z',
      });
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('barcode', '012345678901');
    });

    it('should throw RepositoryError on database error', async () => {
      const dbError = {
        message: 'Update failed',
        code: 'PGRST301',
      };

      mockSupabaseClient.eq.mockResolvedValue({
        data: null,
        error: dbError,
      });

      await expect(repository.updateLastScanned('012345678901')).rejects.toMatchObject({
        code: 'UPDATE_LAST_SCANNED_FAILED',
        message: expect.stringContaining('Update failed'),
        source: 'supabase',
        recoverable: true,
        context: {
          barcode: '012345678901',
          errorCode: 'PGRST301',
        },
      });
    });

    it('should handle unexpected errors', async () => {
      mockSupabaseClient.eq.mockRejectedValue(new Error('Unexpected error'));

      await expect(repository.updateLastScanned('012345678901')).rejects.toMatchObject({
        code: 'UPDATE_LAST_SCANNED_UNEXPECTED',
        message: expect.stringContaining('unexpected error'),
        source: 'supabase',
        recoverable: false,
      });
    });
  });

  describe('getRecentlyScanned', () => {
    const mockProducts: Product[] = [
      {
        id: 'product-1',
        barcode: '111111111111',
        name: 'Product 1',
        brand: 'Brand A',
        last_scanned_at: '2024-01-03T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-03T00:00:00Z',
      },
      {
        id: 'product-2',
        barcode: '222222222222',
        name: 'Product 2',
        brand: 'Brand B',
        last_scanned_at: '2024-01-02T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      },
    ];

    it('should get recently scanned products with default limit', async () => {
      mockSupabaseClient.limit.mockResolvedValue({
        data: mockProducts,
        error: null,
      });

      const result = await repository.getRecentlyScanned('user-123');

      expect(result).toEqual(mockProducts);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('products');
      expect(mockSupabaseClient.select).toHaveBeenCalledWith('*');
      expect(mockSupabaseClient.order).toHaveBeenCalledWith('last_scanned_at', {
        ascending: false,
      });
      expect(mockSupabaseClient.limit).toHaveBeenCalledWith(10);
    });

    it('should get recently scanned products with custom limit', async () => {
      mockSupabaseClient.limit.mockResolvedValue({
        data: mockProducts.slice(0, 5),
        error: null,
      });

      const result = await repository.getRecentlyScanned('user-123', 5);

      expect(result).toHaveLength(2);
      expect(mockSupabaseClient.limit).toHaveBeenCalledWith(5);
    });

    it('should return empty array when no products found', async () => {
      mockSupabaseClient.limit.mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await repository.getRecentlyScanned('user-123');

      expect(result).toEqual([]);
    });

    it('should return empty array when data is null', async () => {
      mockSupabaseClient.limit.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await repository.getRecentlyScanned('user-123');

      expect(result).toEqual([]);
    });

    it('should throw RepositoryError on database error', async () => {
      const dbError = {
        message: 'Query failed',
        code: 'PGRST301',
      };

      mockSupabaseClient.limit.mockResolvedValue({
        data: null,
        error: dbError,
      });

      await expect(repository.getRecentlyScanned('user-123', 10)).rejects.toMatchObject({
        code: 'GET_RECENTLY_SCANNED_FAILED',
        message: expect.stringContaining('Query failed'),
        source: 'supabase',
        recoverable: true,
        context: {
          userId: 'user-123',
          limit: 10,
          errorCode: 'PGRST301',
        },
      });
    });

    it('should handle unexpected errors', async () => {
      mockSupabaseClient.limit.mockRejectedValue(new Error('Unexpected error'));

      await expect(repository.getRecentlyScanned('user-123')).rejects.toMatchObject({
        code: 'GET_RECENTLY_SCANNED_UNEXPECTED',
        message: expect.stringContaining('unexpected error'),
        source: 'supabase',
        recoverable: false,
      });
    });
  });

  describe('Error handling consistency', () => {
    it('should return consistent error format across all methods', async () => {
      const dbError = {
        message: 'Test error',
        code: 'TEST_CODE',
      };

      // Test findByBarcode error format
      mockSupabaseClient.maybeSingle.mockResolvedValue({
        data: null,
        error: dbError,
      });

      try {
        await repository.findByBarcode('test');
      } catch (error: any) {
        expect(error).toHaveProperty('code');
        expect(error).toHaveProperty('message');
        expect(error).toHaveProperty('source', 'supabase');
        expect(error).toHaveProperty('recoverable');
        expect(error).toHaveProperty('context');
      }

      // Test upsert error format
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: dbError,
      });

      try {
        await repository.upsert({ name: 'Test', barcode: 'test' });
      } catch (error: any) {
        expect(error).toHaveProperty('code');
        expect(error).toHaveProperty('message');
        expect(error).toHaveProperty('source', 'supabase');
        expect(error).toHaveProperty('recoverable');
        expect(error).toHaveProperty('context');
      }

      // Test updateLastScanned error format
      mockSupabaseClient.eq.mockResolvedValue({
        data: null,
        error: dbError,
      });

      try {
        await repository.updateLastScanned('test');
      } catch (error: any) {
        expect(error).toHaveProperty('code');
        expect(error).toHaveProperty('message');
        expect(error).toHaveProperty('source', 'supabase');
        expect(error).toHaveProperty('recoverable');
        expect(error).toHaveProperty('context');
      }

      // Test getRecentlyScanned error format
      mockSupabaseClient.limit.mockResolvedValue({
        data: null,
        error: dbError,
      });

      try {
        await repository.getRecentlyScanned('user-123');
      } catch (error: any) {
        expect(error).toHaveProperty('code');
        expect(error).toHaveProperty('message');
        expect(error).toHaveProperty('source', 'supabase');
        expect(error).toHaveProperty('recoverable');
        expect(error).toHaveProperty('context');
      }
    });
  });

  describe('Singleton instance', () => {
    it('should export a singleton instance', () => {
      const { productRepository } = require('../ProductRepository');
      
      expect(productRepository).toBeInstanceOf(ProductRepository);
    });
  });
});
