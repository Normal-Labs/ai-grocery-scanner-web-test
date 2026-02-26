/**
 * StoreRepository
 * 
 * Repository class for store data access operations.
 * Provides methods for finding stores by proximity, creating stores,
 * and managing store locations using PostGIS spatial queries.
 * 
 * Requirements: 3.5, 9.6, 7.5
 */

import { getSupabaseClient } from '../client';
import type { Store, StoreInsert, StoreWithDistance, Coordinates } from '../types';

/**
 * Helper function to create GeoJSON string from coordinates
 * (Local implementation since it was removed from types in multi-tier refactor)
 */
function createGeoJSONPoint(latitude: number, longitude: number): string {
  return JSON.stringify({
    type: 'Point',
    coordinates: [longitude, latitude], // PostGIS uses [lng, lat] order
  });
}

/**
 * Consistent error format for repository operations
 * Requirement 7.5: Handle errors consistently across all repository methods
 */
export interface RepositoryError {
  code: string;
  message: string;
  source: 'supabase';
  recoverable: boolean;
  context?: Record<string, unknown>;
}

/**
 * StoreRepository class
 * 
 * Implements data access operations for stores following the repository pattern.
 * All methods return consistent error formats and are designed to be framework-agnostic
 * for future reusability in mobile applications.
 * 
 * Requirements:
 * - 3.5: Support queries for stores within specified radius using PostGIS
 * - 9.6: Find or create store near coordinates with 100m threshold
 * - 7.1: Implement repository classes for data access operations
 * - 7.2: Create separate repository methods for stores operations
 * - 7.3: Design repository methods to be framework-agnostic
 * - 7.4: Return typed results from repository methods
 * - 7.5: Handle errors consistently across all repository methods
 */
export class StoreRepository {
  /**
   * Find stores within radius (meters) of coordinates
   * 
   * Uses PostGIS ST_DWithin for efficient spatial query with spatial index.
   * Returns stores ordered by distance from the query point.
   * 
   * Requirements:
   * - 3.5: Support queries for stores within specified radius
   * - 3.4: Use spatial index for efficient proximity queries
   * 
   * @param latitude - Latitude in decimal degrees (-90 to 90)
   * @param longitude - Longitude in decimal degrees (-180 to 180)
   * @param radiusMeters - Search radius in meters
   * @returns Promise resolving to array of stores with distance
   * 
   * @example
   * ```typescript
   * const repo = new StoreRepository();
   * const stores = await repo.findNearby(37.7749, -122.4194, 5000);
   * console.log('Found stores:', stores.map(s => `${s.name} (${s.distance_meters}m)`));
   * ```
   */
  async findNearby(
    latitude: number,
    longitude: number,
    radiusMeters: number
  ): Promise<StoreWithDistance[]> {
    try {
      // Validate coordinates
      if (latitude < -90 || latitude > 90) {
        throw this.createError(
          'INVALID_LATITUDE',
          `Latitude must be between -90 and 90, got ${latitude}`,
          false,
          { latitude, longitude, radiusMeters }
        );
      }
      if (longitude < -180 || longitude > 180) {
        throw this.createError(
          'INVALID_LONGITUDE',
          `Longitude must be between -180 and 180, got ${longitude}`,
          false,
          { latitude, longitude, radiusMeters }
        );
      }
      if (radiusMeters <= 0) {
        throw this.createError(
          'INVALID_RADIUS',
          `Radius must be positive, got ${radiusMeters}`,
          false,
          { latitude, longitude, radiusMeters }
        );
      }

      const supabase = getSupabaseClient();
      
      // Use the find_stores_nearby helper function from the migration
      // This function uses ST_DWithin for efficient spatial queries
      const { data, error } = await (supabase as any).rpc('find_stores_nearby', {
        lat: latitude,
        lng: longitude,
        radius_meters: radiusMeters,
      });

      if (error) {
        console.error('Error finding nearby stores:', {
          latitude,
          longitude,
          radiusMeters,
          error: error.message,
          code: error.code,
        });
        throw this.createError(
          'FIND_NEARBY_FAILED',
          `Failed to find nearby stores: ${error.message}`,
          true,
          { latitude, longitude, radiusMeters, errorCode: error.code }
        );
      }

      // Transform the data to match StoreWithDistance type
      // The RPC function returns location as a geography object, we need to convert it to GeoJSON string
      const stores: StoreWithDistance[] = (data || []).map((row: any) => ({
        id: row.id,
        name: row.name,
        address: row.address,
        location: typeof row.location === 'string' 
          ? row.location 
          : JSON.stringify(row.location),
        created_at: row.created_at,
        updated_at: row.updated_at,
        distance_meters: row.distance_meters,
      }));

      return stores;
    } catch (error) {
      if (this.isRepositoryError(error)) {
        throw error;
      }
      
      console.error('Unexpected error in findNearby:', error);
      throw this.createError(
        'FIND_NEARBY_UNEXPECTED',
        'An unexpected error occurred while finding nearby stores',
        false,
        { latitude, longitude, radiusMeters, error: String(error) }
      );
    }
  }

  /**
   * Find or create store near coordinates
   * 
   * Returns existing store if within threshold (100m), otherwise creates new store.
   * This prevents duplicate stores for the same physical location.
   * 
   * Requirement 9.6: Find or create store near coordinates with 100m threshold
   * 
   * @param latitude - Latitude in decimal degrees
   * @param longitude - Longitude in decimal degrees
   * @param name - Store name
   * @param address - Store address
   * @returns Promise resolving to existing or newly created Store
   * 
   * @example
   * ```typescript
   * const repo = new StoreRepository();
   * const store = await repo.findOrCreateNearby(
   *   37.7749,
   *   -122.4194,
   *   'Whole Foods Market',
   *   '123 Main St, San Francisco, CA'
   * );
   * console.log('Store ID:', store.id);
   * ```
   */
  async findOrCreateNearby(
    latitude: number,
    longitude: number,
    name: string,
    address: string
  ): Promise<Store> {
    try {
      // Validate inputs
      if (latitude < -90 || latitude > 90) {
        throw this.createError(
          'INVALID_LATITUDE',
          `Latitude must be between -90 and 90, got ${latitude}`,
          false,
          { latitude, longitude, name, address }
        );
      }
      if (longitude < -180 || longitude > 180) {
        throw this.createError(
          'INVALID_LONGITUDE',
          `Longitude must be between -180 and 180, got ${longitude}`,
          false,
          { latitude, longitude, name, address }
        );
      }
      if (!name || name.trim().length === 0) {
        throw this.createError(
          'INVALID_NAME',
          'Store name cannot be empty',
          false,
          { latitude, longitude, name, address }
        );
      }
      if (!address || address.trim().length === 0) {
        throw this.createError(
          'INVALID_ADDRESS',
          'Store address cannot be empty',
          false,
          { latitude, longitude, name, address }
        );
      }

      // First, check if there's an existing store within 100m
      const THRESHOLD_METERS = 100;
      let nearbyStores;
      try {
        nearbyStores = await this.findNearby(latitude, longitude, THRESHOLD_METERS);
      } catch (error) {
        // Re-throw repository errors from findNearby as findOrCreateNearby errors
        if (this.isRepositoryError(error)) {
          throw this.createError(
            'FIND_OR_CREATE_NEARBY_FAILED',
            `Failed to find nearby stores: ${error.message}`,
            error.recoverable,
            { latitude, longitude, name, address, originalError: error }
          );
        }
        throw error;
      }

      // If we found a store within 100m, return it
      if (nearbyStores.length > 0) {
        // Return the closest store
        const closestStore = nearbyStores[0];
        console.log('Found existing store within 100m:', {
          storeId: closestStore.id,
          storeName: closestStore.name,
          distance: closestStore.distance_meters,
        });
        
        // Remove distance_meters property to return a Store type
        const { distance_meters, ...store } = closestStore;
        return store;
      }

      // No store found within threshold, create a new one
      console.log('No store found within 100m, creating new store:', {
        latitude,
        longitude,
        name,
        address,
      });

      return await this.create({
        name,
        address,
        location: createGeoJSONPoint(latitude, longitude),
      });
    } catch (error) {
      if (this.isRepositoryError(error)) {
        throw error;
      }
      
      console.error('Unexpected error in findOrCreateNearby:', error);
      throw this.createError(
        'FIND_OR_CREATE_NEARBY_UNEXPECTED',
        'An unexpected error occurred while finding or creating nearby store',
        false,
        { latitude, longitude, name, address, error: String(error) }
      );
    }
  }

  /**
   * Create new store
   * 
   * Inserts a new store with the provided data.
   * 
   * Requirements:
   * - 3.2: Create stores table with name, address, location
   * - 3.3: Define location column as geography(POINT, 4326)
   * 
   * @param data - Store data to insert
   * @returns Promise resolving to the created Store
   * 
   * @example
   * ```typescript
   * const repo = new StoreRepository();
   * const store = await repo.create({
   *   name: 'Whole Foods Market',
   *   address: '123 Main St, San Francisco, CA',
   *   location: createGeoJSONPoint(37.7749, -122.4194)
   * });
   * console.log('Created store:', store.id);
   * ```
   */
  async create(data: StoreInsert): Promise<Store> {
    try {
      // Validate inputs
      if (!data.name || data.name.trim().length === 0) {
        throw this.createError(
          'INVALID_NAME',
          'Store name cannot be empty',
          false,
          { data }
        );
      }
      if (!data.address || data.address.trim().length === 0) {
        throw this.createError(
          'INVALID_ADDRESS',
          'Store address cannot be empty',
          false,
          { data }
        );
      }
      if (!data.location) {
        throw this.createError(
          'INVALID_LOCATION',
          'Store location cannot be empty',
          false,
          { data }
        );
      }

      // Validate GeoJSON format
      try {
        const geoJSON = JSON.parse(data.location);
        if (geoJSON.type !== 'Point' || !Array.isArray(geoJSON.coordinates) || geoJSON.coordinates.length !== 2) {
          throw new Error('Invalid GeoJSON Point format');
        }
      } catch (parseError) {
        throw this.createError(
          'INVALID_GEOJSON',
          `Invalid GeoJSON format: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
          false,
          { data }
        );
      }

      const supabase = getSupabaseClient();
      
      const { data: store, error } = await (supabase as any)
        .from('stores')
        .insert(data)
        .select()
        .single();

      if (error) {
        console.error('Error creating store:', {
          data,
          error: error.message,
          code: error.code,
        });
        throw this.createError(
          'CREATE_FAILED',
          `Failed to create store: ${error.message}`,
          true,
          { data, errorCode: error.code }
        );
      }

      if (!store) {
        throw this.createError(
          'CREATE_NO_DATA',
          'Create succeeded but no store data was returned',
          false,
          { data }
        );
      }

      return store;
    } catch (error) {
      if (this.isRepositoryError(error)) {
        throw error;
      }
      
      console.error('Unexpected error in create:', error);
      throw this.createError(
        'CREATE_UNEXPECTED',
        'An unexpected error occurred while creating store',
        false,
        { data, error: String(error) }
      );
    }
  }

  /**
   * Create a consistent error object
   * 
   * Helper method to create RepositoryError objects with consistent structure.
   * 
   * Requirement 7.5: Handle errors consistently across all repository methods
   * 
   * @param code - Error code for identification
   * @param message - Human-readable error message
   * @param recoverable - Whether the error is recoverable (transient)
   * @param context - Additional context for debugging
   * @returns RepositoryError object
   */
  private createError(
    code: string,
    message: string,
    recoverable: boolean,
    context?: Record<string, unknown>
  ): RepositoryError {
    return {
      code,
      message,
      source: 'supabase',
      recoverable,
      context,
    };
  }

  /**
   * Type guard to check if an error is a RepositoryError
   * 
   * @param error - Error to check
   * @returns True if error is a RepositoryError
   */
  private isRepositoryError(error: unknown): error is RepositoryError {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      'message' in error &&
      'source' in error &&
      'recoverable' in error
    );
  }
}

/**
 * Create a singleton instance of StoreRepository
 * 
 * This provides a convenient way to access the repository without
 * creating new instances everywhere.
 * 
 * @example
 * ```typescript
 * import { storeRepository } from '@/lib/supabase/repositories/StoreRepository';
 * 
 * const stores = await storeRepository.findNearby(37.7749, -122.4194, 5000);
 * ```
 */
export const storeRepository = new StoreRepository();
