/**
 * Unit tests for StoreRepository
 * 
 * Tests store data access operations including finding nearby stores,
 * creating stores, and finding or creating stores with proximity threshold.
 * 
 * Requirements: 3.5, 9.6, 7.5
 */

import { StoreRepository } from '../StoreRepository';
import { getSupabaseClient } from '../../client';
import type { Store, StoreInsert, StoreWithDistance } from '../../types';
import { createGeoJSONPoint } from '../../types';

// Mock the Supabase client
jest.mock('../../client');

describe('StoreRepository', () => {
  let repository: StoreRepository;
  let mockSupabaseClient: any;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Create mock Supabase client
    mockSupabaseClient = {
      rpc: jest.fn(),
      from: jest.fn(() => mockSupabaseClient),
      insert: jest.fn(() => mockSupabaseClient),
      select: jest.fn(() => mockSupabaseClient),
      single: jest.fn(),
    };

    // Mock getSupabaseClient to return our mock
    (getSupabaseClient as jest.Mock).mockReturnValue(mockSupabaseClient);

    // Create repository instance
    repository = new StoreRepository();
  });

  describe('findNearby', () => {
    const mockStoresWithDistance: StoreWithDistance[] = [
      {
        id: 'store-1',
        name: 'Whole Foods Market',
        address: '123 Main St, San Francisco, CA',
        location: '{"type":"Point","coordinates":[-122.4194,37.7749]}',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        distance_meters: 250.5,
      },
      {
        id: 'store-2',
        name: 'Safeway',
        address: '456 Market St, San Francisco, CA',
        location: '{"type":"Point","coordinates":[-122.4200,37.7750]}',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        distance_meters: 450.2,
      },
    ];

    it('should find stores within radius', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: mockStoresWithDistance,
        error: null,
      });

      const result = await repository.findNearby(37.7749, -122.4194, 5000);

      expect(result).toEqual(mockStoresWithDistance);
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('find_stores_nearby', {
        lat: 37.7749,
        lng: -122.4194,
        radius_meters: 5000,
      });
    });

    it('should return empty array when no stores found', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await repository.findNearby(37.7749, -122.4194, 100);

      expect(result).toEqual([]);
    });

    it('should return empty array when data is null', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await repository.findNearby(37.7749, -122.4194, 5000);

      expect(result).toEqual([]);
    });

    it('should validate latitude bounds', async () => {
      await expect(
        repository.findNearby(91, -122.4194, 5000)
      ).rejects.toMatchObject({
        code: 'INVALID_LATITUDE',
        message: expect.stringContaining('between -90 and 90'),
        source: 'supabase',
        recoverable: false,
      });

      await expect(
        repository.findNearby(-91, -122.4194, 5000)
      ).rejects.toMatchObject({
        code: 'INVALID_LATITUDE',
        message: expect.stringContaining('between -90 and 90'),
        source: 'supabase',
        recoverable: false,
      });
    });

    it('should validate longitude bounds', async () => {
      await expect(
        repository.findNearby(37.7749, 181, 5000)
      ).rejects.toMatchObject({
        code: 'INVALID_LONGITUDE',
        message: expect.stringContaining('between -180 and 180'),
        source: 'supabase',
        recoverable: false,
      });

      await expect(
        repository.findNearby(37.7749, -181, 5000)
      ).rejects.toMatchObject({
        code: 'INVALID_LONGITUDE',
        message: expect.stringContaining('between -180 and 180'),
        source: 'supabase',
        recoverable: false,
      });
    });

    it('should validate radius is positive', async () => {
      await expect(
        repository.findNearby(37.7749, -122.4194, 0)
      ).rejects.toMatchObject({
        code: 'INVALID_RADIUS',
        message: expect.stringContaining('must be positive'),
        source: 'supabase',
        recoverable: false,
      });

      await expect(
        repository.findNearby(37.7749, -122.4194, -100)
      ).rejects.toMatchObject({
        code: 'INVALID_RADIUS',
        message: expect.stringContaining('must be positive'),
        source: 'supabase',
        recoverable: false,
      });
    });

    it('should throw RepositoryError on database error', async () => {
      const dbError = {
        message: 'PostGIS function not found',
        code: 'PGRST202',
      };

      mockSupabaseClient.rpc.mockResolvedValue({
        data: null,
        error: dbError,
      });

      await expect(
        repository.findNearby(37.7749, -122.4194, 5000)
      ).rejects.toMatchObject({
        code: 'FIND_NEARBY_FAILED',
        message: expect.stringContaining('PostGIS function not found'),
        source: 'supabase',
        recoverable: true,
        context: {
          latitude: 37.7749,
          longitude: -122.4194,
          radiusMeters: 5000,
          errorCode: 'PGRST202',
        },
      });
    });

    it('should handle unexpected errors', async () => {
      mockSupabaseClient.rpc.mockRejectedValue(new Error('Unexpected error'));

      await expect(
        repository.findNearby(37.7749, -122.4194, 5000)
      ).rejects.toMatchObject({
        code: 'FIND_NEARBY_UNEXPECTED',
        message: expect.stringContaining('unexpected error'),
        source: 'supabase',
        recoverable: false,
      });
    });

    it('should handle stores at exact radius boundary', async () => {
      const storeAtBoundary: StoreWithDistance = {
        id: 'store-boundary',
        name: 'Store at Boundary',
        address: '789 Edge St',
        location: '{"type":"Point","coordinates":[-122.4194,37.7749]}',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        distance_meters: 5000.0, // Exactly at boundary
      };

      mockSupabaseClient.rpc.mockResolvedValue({
        data: [storeAtBoundary],
        error: null,
      });

      const result = await repository.findNearby(37.7749, -122.4194, 5000);

      expect(result).toHaveLength(1);
      expect(result[0].distance_meters).toBe(5000.0);
    });
  });

  describe('findOrCreateNearby', () => {
    const mockStore: Store = {
      id: 'store-123',
      name: 'Whole Foods Market',
      address: '123 Main St, San Francisco, CA',
      location: '{"type":"Point","coordinates":[-122.4194,37.7749]}',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    it('should return existing store within 100m threshold', async () => {
      const nearbyStore: StoreWithDistance = {
        ...mockStore,
        distance_meters: 50, // Within 100m threshold
      };

      // Mock findNearby to return a store within threshold
      mockSupabaseClient.rpc.mockResolvedValue({
        data: [nearbyStore],
        error: null,
      });

      const result = await repository.findOrCreateNearby(
        37.7749,
        -122.4194,
        'New Store Name',
        'New Address'
      );

      expect(result).toEqual(mockStore);
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('find_stores_nearby', {
        lat: 37.7749,
        lng: -122.4194,
        radius_meters: 100,
      });
      // Should not call insert since store was found
      expect(mockSupabaseClient.insert).not.toHaveBeenCalled();
    });

    it('should create new store when none found within 100m', async () => {
      // Mock findNearby to return empty array (no stores within 100m)
      mockSupabaseClient.rpc.mockResolvedValue({
        data: [],
        error: null,
      });

      // Mock insert to return new store
      mockSupabaseClient.single.mockResolvedValue({
        data: mockStore,
        error: null,
      });

      const result = await repository.findOrCreateNearby(
        37.7749,
        -122.4194,
        'Whole Foods Market',
        '123 Main St, San Francisco, CA'
      );

      expect(result).toEqual(mockStore);
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('find_stores_nearby', {
        lat: 37.7749,
        lng: -122.4194,
        radius_meters: 100,
      });
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('stores');
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith({
        name: 'Whole Foods Market',
        address: '123 Main St, San Francisco, CA',
        location: createGeoJSONPoint(37.7749, -122.4194),
      });
    });

    it('should return closest store when multiple found within threshold', async () => {
      const stores: StoreWithDistance[] = [
        {
          ...mockStore,
          id: 'store-1',
          distance_meters: 30,
        },
        {
          ...mockStore,
          id: 'store-2',
          distance_meters: 80,
        },
      ];

      mockSupabaseClient.rpc.mockResolvedValue({
        data: stores,
        error: null,
      });

      const result = await repository.findOrCreateNearby(
        37.7749,
        -122.4194,
        'New Store',
        'New Address'
      );

      expect(result.id).toBe('store-1'); // Should return closest store
      expect(mockSupabaseClient.insert).not.toHaveBeenCalled();
    });

    it('should validate latitude bounds', async () => {
      await expect(
        repository.findOrCreateNearby(91, -122.4194, 'Store', 'Address')
      ).rejects.toMatchObject({
        code: 'INVALID_LATITUDE',
        source: 'supabase',
        recoverable: false,
      });
    });

    it('should validate longitude bounds', async () => {
      await expect(
        repository.findOrCreateNearby(37.7749, 181, 'Store', 'Address')
      ).rejects.toMatchObject({
        code: 'INVALID_LONGITUDE',
        source: 'supabase',
        recoverable: false,
      });
    });

    it('should validate store name is not empty', async () => {
      await expect(
        repository.findOrCreateNearby(37.7749, -122.4194, '', 'Address')
      ).rejects.toMatchObject({
        code: 'INVALID_NAME',
        message: expect.stringContaining('cannot be empty'),
        source: 'supabase',
        recoverable: false,
      });

      await expect(
        repository.findOrCreateNearby(37.7749, -122.4194, '   ', 'Address')
      ).rejects.toMatchObject({
        code: 'INVALID_NAME',
        source: 'supabase',
        recoverable: false,
      });
    });

    it('should validate store address is not empty', async () => {
      await expect(
        repository.findOrCreateNearby(37.7749, -122.4194, 'Store', '')
      ).rejects.toMatchObject({
        code: 'INVALID_ADDRESS',
        message: expect.stringContaining('cannot be empty'),
        source: 'supabase',
        recoverable: false,
      });

      await expect(
        repository.findOrCreateNearby(37.7749, -122.4194, 'Store', '   ')
      ).rejects.toMatchObject({
        code: 'INVALID_ADDRESS',
        source: 'supabase',
        recoverable: false,
      });
    });

    it('should handle unexpected errors', async () => {
      mockSupabaseClient.rpc.mockRejectedValue(new Error('Unexpected error'));

      await expect(
        repository.findOrCreateNearby(37.7749, -122.4194, 'Store', 'Address')
      ).rejects.toMatchObject({
        code: 'FIND_OR_CREATE_NEARBY_FAILED',
        message: expect.stringContaining('unexpected error'),
        source: 'supabase',
        recoverable: false,
      });
    });
  });

  describe('create', () => {
    const mockStoreInsert: StoreInsert = {
      name: 'Whole Foods Market',
      address: '123 Main St, San Francisco, CA',
      location: createGeoJSONPoint(37.7749, -122.4194),
    };

    const mockStore: Store = {
      id: 'store-123',
      name: 'Whole Foods Market',
      address: '123 Main St, San Francisco, CA',
      location: '{"type":"Point","coordinates":[-122.4194,37.7749]}',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    it('should create new store', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: mockStore,
        error: null,
      });

      const result = await repository.create(mockStoreInsert);

      expect(result).toEqual(mockStore);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('stores');
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(mockStoreInsert);
      expect(mockSupabaseClient.select).toHaveBeenCalled();
      expect(mockSupabaseClient.single).toHaveBeenCalled();
    });

    it('should validate store name is not empty', async () => {
      await expect(
        repository.create({ ...mockStoreInsert, name: '' })
      ).rejects.toMatchObject({
        code: 'INVALID_NAME',
        message: expect.stringContaining('cannot be empty'),
        source: 'supabase',
        recoverable: false,
      });

      await expect(
        repository.create({ ...mockStoreInsert, name: '   ' })
      ).rejects.toMatchObject({
        code: 'INVALID_NAME',
        source: 'supabase',
        recoverable: false,
      });
    });

    it('should validate store address is not empty', async () => {
      await expect(
        repository.create({ ...mockStoreInsert, address: '' })
      ).rejects.toMatchObject({
        code: 'INVALID_ADDRESS',
        message: expect.stringContaining('cannot be empty'),
        source: 'supabase',
        recoverable: false,
      });

      await expect(
        repository.create({ ...mockStoreInsert, address: '   ' })
      ).rejects.toMatchObject({
        code: 'INVALID_ADDRESS',
        source: 'supabase',
        recoverable: false,
      });
    });

    it('should validate location is not empty', async () => {
      await expect(
        repository.create({ ...mockStoreInsert, location: '' })
      ).rejects.toMatchObject({
        code: 'INVALID_LOCATION',
        message: expect.stringContaining('cannot be empty'),
        source: 'supabase',
        recoverable: false,
      });
    });

    it('should validate GeoJSON format', async () => {
      await expect(
        repository.create({ ...mockStoreInsert, location: 'invalid json' })
      ).rejects.toMatchObject({
        code: 'INVALID_GEOJSON',
        message: expect.stringContaining('Invalid GeoJSON format'),
        source: 'supabase',
        recoverable: false,
      });

      await expect(
        repository.create({ ...mockStoreInsert, location: '{"type":"LineString"}' })
      ).rejects.toMatchObject({
        code: 'INVALID_GEOJSON',
        message: expect.stringContaining('Invalid GeoJSON format'),
        source: 'supabase',
        recoverable: false,
      });

      await expect(
        repository.create({ ...mockStoreInsert, location: '{"type":"Point","coordinates":[1]}' })
      ).rejects.toMatchObject({
        code: 'INVALID_GEOJSON',
        message: expect.stringContaining('Invalid GeoJSON format'),
        source: 'supabase',
        recoverable: false,
      });
    });

    it('should throw RepositoryError on database error', async () => {
      const dbError = {
        message: 'Insert failed',
        code: 'PGRST301',
      };

      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: dbError,
      });

      await expect(repository.create(mockStoreInsert)).rejects.toMatchObject({
        code: 'CREATE_FAILED',
        message: expect.stringContaining('Insert failed'),
        source: 'supabase',
        recoverable: true,
        context: {
          data: mockStoreInsert,
          errorCode: 'PGRST301',
        },
      });
    });

    it('should throw error when no data returned', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: null,
      });

      await expect(repository.create(mockStoreInsert)).rejects.toMatchObject({
        code: 'CREATE_NO_DATA',
        message: expect.stringContaining('no store data was returned'),
        source: 'supabase',
        recoverable: false,
      });
    });

    it('should handle unexpected errors', async () => {
      mockSupabaseClient.single.mockRejectedValue(new Error('Unexpected error'));

      await expect(repository.create(mockStoreInsert)).rejects.toMatchObject({
        code: 'CREATE_UNEXPECTED',
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

      // Test findNearby error format
      mockSupabaseClient.rpc.mockResolvedValue({
        data: null,
        error: dbError,
      });

      try {
        await repository.findNearby(37.7749, -122.4194, 5000);
      } catch (error: any) {
        expect(error).toHaveProperty('code');
        expect(error).toHaveProperty('message');
        expect(error).toHaveProperty('source', 'supabase');
        expect(error).toHaveProperty('recoverable');
        expect(error).toHaveProperty('context');
      }

      // Test create error format
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: dbError,
      });

      try {
        await repository.create({
          name: 'Test',
          address: 'Test Address',
          location: createGeoJSONPoint(37.7749, -122.4194),
        });
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
      const { storeRepository } = require('../StoreRepository');
      
      expect(storeRepository).toBeInstanceOf(StoreRepository);
    });
  });
});
