/**
 * Unit tests for InventoryRepository
 * 
 * Tests inventory data access operations including recording sightings,
 * querying stores for products, querying products at stores, and finding
 * products near locations.
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 7.5
 */

import { InventoryRepository } from '../InventoryRepository';
import { getSupabaseClient } from '../../client';
import type { 
  StoreInventory, 
  Store, 
  Product,
  StoreWithDistance 
} from '../../types';

// Mock the Supabase client
jest.mock('../../client');

describe('InventoryRepository', () => {
  let repository: InventoryRepository;
  let mockSupabaseClient: any;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Create mock Supabase client
    mockSupabaseClient = {
      from: jest.fn(() => mockSupabaseClient),
      select: jest.fn(() => mockSupabaseClient),
      eq: jest.fn(() => mockSupabaseClient),
      upsert: jest.fn(() => mockSupabaseClient),
      single: jest.fn(),
      rpc: jest.fn(),
    };

    // Mock getSupabaseClient to return our mock
    (getSupabaseClient as jest.Mock).mockReturnValue(mockSupabaseClient);

    // Create repository instance
    repository = new InventoryRepository();
  });

  describe('recordSighting', () => {
    const mockInventory: StoreInventory = {
      id: 'inventory-123',
      product_id: 'product-123',
      store_id: 'store-456',
      last_seen_at: '2024-01-01T00:00:00Z',
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

    it('should record new product sighting at store', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: mockInventory,
        error: null,
      });

      const result = await repository.recordSighting('product-123', 'store-456');

      expect(result).toEqual(mockInventory);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('store_inventory');
      expect(mockSupabaseClient.upsert).toHaveBeenCalledWith(
        {
          product_id: 'product-123',
          store_id: 'store-456',
          last_seen_at: '2024-01-01T00:00:00Z',
        },
        {
          onConflict: 'product_id,store_id',
          ignoreDuplicates: false,
        }
      );
      expect(mockSupabaseClient.select).toHaveBeenCalled();
      expect(mockSupabaseClient.single).toHaveBeenCalled();
    });

    it('should update existing sighting timestamp', async () => {
      const updatedInventory = {
        ...mockInventory,
        last_seen_at: '2024-01-01T00:00:00Z',
      };

      mockSupabaseClient.single.mockResolvedValue({
        data: updatedInventory,
        error: null,
      });

      const result = await repository.recordSighting('product-123', 'store-456');

      expect(result).toEqual(updatedInventory);
      expect(mockSupabaseClient.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          last_seen_at: '2024-01-01T00:00:00Z',
        }),
        {
          onConflict: 'product_id,store_id',
          ignoreDuplicates: false,
        }
      );
    });

    it('should throw error for empty product ID', async () => {
      await expect(repository.recordSighting('', 'store-456')).rejects.toMatchObject({
        code: 'INVALID_PRODUCT_ID',
        message: 'Product ID cannot be empty',
        source: 'supabase',
        recoverable: false,
      });
    });

    it('should throw error for empty store ID', async () => {
      await expect(repository.recordSighting('product-123', '')).rejects.toMatchObject({
        code: 'INVALID_STORE_ID',
        message: 'Store ID cannot be empty',
        source: 'supabase',
        recoverable: false,
      });
    });

    it('should throw error for whitespace-only product ID', async () => {
      await expect(repository.recordSighting('   ', 'store-456')).rejects.toMatchObject({
        code: 'INVALID_PRODUCT_ID',
        message: 'Product ID cannot be empty',
        source: 'supabase',
        recoverable: false,
      });
    });

    it('should throw error for whitespace-only store ID', async () => {
      await expect(repository.recordSighting('product-123', '   ')).rejects.toMatchObject({
        code: 'INVALID_STORE_ID',
        message: 'Store ID cannot be empty',
        source: 'supabase',
        recoverable: false,
      });
    });

    it('should throw error on foreign key violation', async () => {
      const dbError = {
        message: 'Foreign key constraint violation',
        code: '23503',
      };

      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: dbError,
      });

      await expect(
        repository.recordSighting('invalid-product', 'invalid-store')
      ).rejects.toMatchObject({
        code: 'FOREIGN_KEY_VIOLATION',
        message: expect.stringContaining('Invalid product_id or store_id'),
        source: 'supabase',
        recoverable: false,
        context: {
          productId: 'invalid-product',
          storeId: 'invalid-store',
          errorCode: '23503',
        },
      });
    });

    it('should throw RepositoryError on database error', async () => {
      const dbError = {
        message: 'Database connection failed',
        code: 'PGRST301',
      };

      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: dbError,
      });

      await expect(
        repository.recordSighting('product-123', 'store-456')
      ).rejects.toMatchObject({
        code: 'RECORD_SIGHTING_FAILED',
        message: expect.stringContaining('Database connection failed'),
        source: 'supabase',
        recoverable: true,
      });
    });

    it('should throw error when no data returned', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: null,
      });

      await expect(
        repository.recordSighting('product-123', 'store-456')
      ).rejects.toMatchObject({
        code: 'RECORD_SIGHTING_NO_DATA',
        message: expect.stringContaining('no inventory data was returned'),
        source: 'supabase',
        recoverable: false,
      });
    });

    it('should handle unexpected errors', async () => {
      mockSupabaseClient.single.mockRejectedValue(new Error('Unexpected error'));

      await expect(
        repository.recordSighting('product-123', 'store-456')
      ).rejects.toMatchObject({
        code: 'RECORD_SIGHTING_UNEXPECTED',
        message: expect.stringContaining('unexpected error'),
        source: 'supabase',
        recoverable: false,
      });
    });
  });

  describe('getStoresForProduct', () => {
    const mockStores: Store[] = [
      {
        id: 'store-1',
        name: 'Whole Foods Market',
        address: '123 Main St',
        location: '{"type":"Point","coordinates":[-122.4194,37.7749]}',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
      {
        id: 'store-2',
        name: 'Trader Joes',
        address: '456 Oak Ave',
        location: '{"type":"Point","coordinates":[-122.4200,37.7750]}',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ];

    it('should get all stores carrying a product', async () => {
      const mockData = mockStores.map(store => ({ stores: store }));

      mockSupabaseClient.eq.mockResolvedValue({
        data: mockData,
        error: null,
      });

      const result = await repository.getStoresForProduct('product-123');

      expect(result).toEqual(mockStores);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('store_inventory');
      expect(mockSupabaseClient.select).toHaveBeenCalledWith(
        expect.stringContaining('stores')
      );
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('product_id', 'product-123');
    });

    it('should return empty array when no stores found', async () => {
      mockSupabaseClient.eq.mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await repository.getStoresForProduct('product-123');

      expect(result).toEqual([]);
    });

    it('should return empty array when data is null', async () => {
      mockSupabaseClient.eq.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await repository.getStoresForProduct('product-123');

      expect(result).toEqual([]);
    });

    it('should filter out null stores', async () => {
      const mockData = [
        { stores: mockStores[0] },
        { stores: null },
        { stores: mockStores[1] },
      ];

      mockSupabaseClient.eq.mockResolvedValue({
        data: mockData,
        error: null,
      });

      const result = await repository.getStoresForProduct('product-123');

      expect(result).toEqual(mockStores);
      expect(result).toHaveLength(2);
    });

    it('should throw error for empty product ID', async () => {
      await expect(repository.getStoresForProduct('')).rejects.toMatchObject({
        code: 'INVALID_PRODUCT_ID',
        message: 'Product ID cannot be empty',
        source: 'supabase',
        recoverable: false,
      });
    });

    it('should throw RepositoryError on database error', async () => {
      const dbError = {
        message: 'Query failed',
        code: 'PGRST301',
      };

      mockSupabaseClient.eq.mockResolvedValue({
        data: null,
        error: dbError,
      });

      await expect(
        repository.getStoresForProduct('product-123')
      ).rejects.toMatchObject({
        code: 'GET_STORES_FOR_PRODUCT_FAILED',
        message: expect.stringContaining('Query failed'),
        source: 'supabase',
        recoverable: true,
      });
    });

    it('should handle unexpected errors', async () => {
      mockSupabaseClient.eq.mockRejectedValue(new Error('Unexpected error'));

      await expect(
        repository.getStoresForProduct('product-123')
      ).rejects.toMatchObject({
        code: 'GET_STORES_FOR_PRODUCT_UNEXPECTED',
        message: expect.stringContaining('unexpected error'),
        source: 'supabase',
        recoverable: false,
      });
    });
  });

  describe('getProductsAtStore', () => {
    const mockProducts: Product[] = [
      {
        id: 'product-1',
        barcode: '111111111111',
        name: 'Organic Milk',
        brand: 'Happy Farms',
        last_scanned_at: '2024-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
      {
        id: 'product-2',
        barcode: '222222222222',
        name: 'Whole Wheat Bread',
        brand: 'Bakery Fresh',
        last_scanned_at: '2024-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ];

    it('should get all products at a store', async () => {
      const mockData = mockProducts.map(product => ({ products: product }));

      mockSupabaseClient.eq.mockResolvedValue({
        data: mockData,
        error: null,
      });

      const result = await repository.getProductsAtStore('store-456');

      expect(result).toEqual(mockProducts);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('store_inventory');
      expect(mockSupabaseClient.select).toHaveBeenCalledWith(
        expect.stringContaining('products')
      );
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('store_id', 'store-456');
    });

    it('should return empty array when no products found', async () => {
      mockSupabaseClient.eq.mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await repository.getProductsAtStore('store-456');

      expect(result).toEqual([]);
    });

    it('should return empty array when data is null', async () => {
      mockSupabaseClient.eq.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await repository.getProductsAtStore('store-456');

      expect(result).toEqual([]);
    });

    it('should filter out null products', async () => {
      const mockData = [
        { products: mockProducts[0] },
        { products: null },
        { products: mockProducts[1] },
      ];

      mockSupabaseClient.eq.mockResolvedValue({
        data: mockData,
        error: null,
      });

      const result = await repository.getProductsAtStore('store-456');

      expect(result).toEqual(mockProducts);
      expect(result).toHaveLength(2);
    });

    it('should throw error for empty store ID', async () => {
      await expect(repository.getProductsAtStore('')).rejects.toMatchObject({
        code: 'INVALID_STORE_ID',
        message: 'Store ID cannot be empty',
        source: 'supabase',
        recoverable: false,
      });
    });

    it('should throw RepositoryError on database error', async () => {
      const dbError = {
        message: 'Query failed',
        code: 'PGRST301',
      };

      mockSupabaseClient.eq.mockResolvedValue({
        data: null,
        error: dbError,
      });

      await expect(
        repository.getProductsAtStore('store-456')
      ).rejects.toMatchObject({
        code: 'GET_PRODUCTS_AT_STORE_FAILED',
        message: expect.stringContaining('Query failed'),
        source: 'supabase',
        recoverable: true,
      });
    });

    it('should handle unexpected errors', async () => {
      mockSupabaseClient.eq.mockRejectedValue(new Error('Unexpected error'));

      await expect(
        repository.getProductsAtStore('store-456')
      ).rejects.toMatchObject({
        code: 'GET_PRODUCTS_AT_STORE_UNEXPECTED',
        message: expect.stringContaining('unexpected error'),
        source: 'supabase',
        recoverable: false,
      });
    });
  });

  describe('getProductsNearLocation', () => {
    const mockRpcData = [
      {
        product_id: 'product-1',
        product_barcode: '111111111111',
        product_name: 'Organic Milk',
        product_brand: 'Happy Farms',
        product_last_scanned_at: '2024-01-01T00:00:00Z',
        product_created_at: '2024-01-01T00:00:00Z',
        product_updated_at: '2024-01-01T00:00:00Z',
        store_id: 'store-1',
        store_name: 'Whole Foods Market',
        store_address: '123 Main St',
        store_location: '{"type":"Point","coordinates":[-122.4194,37.7749]}',
        store_created_at: '2024-01-01T00:00:00Z',
        store_updated_at: '2024-01-01T00:00:00Z',
        distance_meters: 500,
      },
      {
        product_id: 'product-1',
        product_barcode: '111111111111',
        product_name: 'Organic Milk',
        product_brand: 'Happy Farms',
        product_last_scanned_at: '2024-01-01T00:00:00Z',
        product_created_at: '2024-01-01T00:00:00Z',
        product_updated_at: '2024-01-01T00:00:00Z',
        store_id: 'store-2',
        store_name: 'Trader Joes',
        store_address: '456 Oak Ave',
        store_location: '{"type":"Point","coordinates":[-122.4200,37.7750]}',
        store_created_at: '2024-01-01T00:00:00Z',
        store_updated_at: '2024-01-01T00:00:00Z',
        distance_meters: 1000,
      },
    ];

    it('should get products available at nearby stores', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: mockRpcData,
        error: null,
      });

      const result = await repository.getProductsNearLocation(37.7749, -122.4194, 5000);

      expect(result).toHaveLength(1);
      expect(result[0].product.id).toBe('product-1');
      expect(result[0].stores).toHaveLength(2);
      expect(result[0].stores[0].distance_meters).toBe(500);
      expect(result[0].stores[1].distance_meters).toBe(1000);
      
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('find_products_near_location', {
        lat: 37.7749,
        lng: -122.4194,
        radius_meters: 5000,
      });
    });

    it('should group products and sort stores by distance', async () => {
      const unsortedData = [
        { ...mockRpcData[1] }, // distance: 1000
        { ...mockRpcData[0] }, // distance: 500
      ];

      mockSupabaseClient.rpc.mockResolvedValue({
        data: unsortedData,
        error: null,
      });

      const result = await repository.getProductsNearLocation(37.7749, -122.4194, 5000);

      expect(result[0].stores[0].distance_meters).toBe(500);
      expect(result[0].stores[1].distance_meters).toBe(1000);
    });

    it('should return empty array when no products found', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await repository.getProductsNearLocation(37.7749, -122.4194, 5000);

      expect(result).toEqual([]);
    });

    it('should return empty array when data is null', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await repository.getProductsNearLocation(37.7749, -122.4194, 5000);

      expect(result).toEqual([]);
    });

    it('should throw error for invalid latitude (too low)', async () => {
      await expect(
        repository.getProductsNearLocation(-91, -122.4194, 5000)
      ).rejects.toMatchObject({
        code: 'INVALID_LATITUDE',
        message: expect.stringContaining('Latitude must be between -90 and 90'),
        source: 'supabase',
        recoverable: false,
      });
    });

    it('should throw error for invalid latitude (too high)', async () => {
      await expect(
        repository.getProductsNearLocation(91, -122.4194, 5000)
      ).rejects.toMatchObject({
        code: 'INVALID_LATITUDE',
        message: expect.stringContaining('Latitude must be between -90 and 90'),
        source: 'supabase',
        recoverable: false,
      });
    });

    it('should throw error for invalid longitude (too low)', async () => {
      await expect(
        repository.getProductsNearLocation(37.7749, -181, 5000)
      ).rejects.toMatchObject({
        code: 'INVALID_LONGITUDE',
        message: expect.stringContaining('Longitude must be between -180 and 180'),
        source: 'supabase',
        recoverable: false,
      });
    });

    it('should throw error for invalid longitude (too high)', async () => {
      await expect(
        repository.getProductsNearLocation(37.7749, 181, 5000)
      ).rejects.toMatchObject({
        code: 'INVALID_LONGITUDE',
        message: expect.stringContaining('Longitude must be between -180 and 180'),
        source: 'supabase',
        recoverable: false,
      });
    });

    it('should throw error for invalid radius (zero)', async () => {
      await expect(
        repository.getProductsNearLocation(37.7749, -122.4194, 0)
      ).rejects.toMatchObject({
        code: 'INVALID_RADIUS',
        message: expect.stringContaining('Radius must be positive'),
        source: 'supabase',
        recoverable: false,
      });
    });

    it('should throw error for invalid radius (negative)', async () => {
      await expect(
        repository.getProductsNearLocation(37.7749, -122.4194, -1000)
      ).rejects.toMatchObject({
        code: 'INVALID_RADIUS',
        message: expect.stringContaining('Radius must be positive'),
        source: 'supabase',
        recoverable: false,
      });
    });

    it('should throw RepositoryError on database error', async () => {
      const dbError = {
        message: 'RPC call failed',
        code: 'PGRST301',
      };

      mockSupabaseClient.rpc.mockResolvedValue({
        data: null,
        error: dbError,
      });

      await expect(
        repository.getProductsNearLocation(37.7749, -122.4194, 5000)
      ).rejects.toMatchObject({
        code: 'GET_PRODUCTS_NEAR_LOCATION_FAILED',
        message: expect.stringContaining('RPC call failed'),
        source: 'supabase',
        recoverable: true,
      });
    });

    it('should handle unexpected errors', async () => {
      mockSupabaseClient.rpc.mockRejectedValue(new Error('Unexpected error'));

      await expect(
        repository.getProductsNearLocation(37.7749, -122.4194, 5000)
      ).rejects.toMatchObject({
        code: 'GET_PRODUCTS_NEAR_LOCATION_UNEXPECTED',
        message: expect.stringContaining('unexpected error'),
        source: 'supabase',
        recoverable: false,
      });
    });

    it('should handle store location as object', async () => {
      const dataWithObjectLocation = [
        {
          ...mockRpcData[0],
          store_location: { type: 'Point', coordinates: [-122.4194, 37.7749] },
        },
      ];

      mockSupabaseClient.rpc.mockResolvedValue({
        data: dataWithObjectLocation,
        error: null,
      });

      const result = await repository.getProductsNearLocation(37.7749, -122.4194, 5000);

      expect(result).toHaveLength(1);
      expect(result[0].stores[0].location).toBe(
        '{"type":"Point","coordinates":[-122.4194,37.7749]}'
      );
    });
  });

  describe('Error handling consistency', () => {
    it('should return consistent error format across all methods', async () => {
      const dbError = {
        message: 'Test error',
        code: 'TEST_CODE',
      };

      // Test recordSighting error format
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: dbError,
      });

      try {
        await repository.recordSighting('product-123', 'store-456');
      } catch (error: any) {
        expect(error).toHaveProperty('code');
        expect(error).toHaveProperty('message');
        expect(error).toHaveProperty('source', 'supabase');
        expect(error).toHaveProperty('recoverable');
        expect(error).toHaveProperty('context');
      }

      // Test getStoresForProduct error format
      mockSupabaseClient.eq.mockResolvedValue({
        data: null,
        error: dbError,
      });

      try {
        await repository.getStoresForProduct('product-123');
      } catch (error: any) {
        expect(error).toHaveProperty('code');
        expect(error).toHaveProperty('message');
        expect(error).toHaveProperty('source', 'supabase');
        expect(error).toHaveProperty('recoverable');
        expect(error).toHaveProperty('context');
      }

      // Test getProductsAtStore error format
      try {
        await repository.getProductsAtStore('store-456');
      } catch (error: any) {
        expect(error).toHaveProperty('code');
        expect(error).toHaveProperty('message');
        expect(error).toHaveProperty('source', 'supabase');
        expect(error).toHaveProperty('recoverable');
        expect(error).toHaveProperty('context');
      }

      // Test getProductsNearLocation error format
      mockSupabaseClient.rpc.mockResolvedValue({
        data: null,
        error: dbError,
      });

      try {
        await repository.getProductsNearLocation(37.7749, -122.4194, 5000);
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
      const { inventoryRepository } = require('../InventoryRepository');
      
      expect(inventoryRepository).toBeInstanceOf(InventoryRepository);
    });
  });
});
