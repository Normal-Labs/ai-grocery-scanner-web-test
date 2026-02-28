/**
 * InventoryRepository
 * 
 * Repository class for store inventory data access operations.
 * Provides methods for recording product sightings at stores, querying
 * which stores carry specific products, and finding products near locations.
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 7.5
 */

import { getSupabaseClient } from '../client';
import type { 
  StoreInventory, 
  StoreInventoryInsert, 
  Store, 
  Product,
  StoreWithDistance 
} from '../types';

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
 * Product with stores result type
 * Used for getProductsNearLocation to return products with their available stores
 */
export interface ProductWithStores {
  product: Product;
  stores: StoreWithDistance[];
}

/**
 * InventoryRepository class
 * 
 * Implements data access operations for store inventory following the repository pattern.
 * All methods return consistent error formats and are designed to be framework-agnostic
 * for future reusability in mobile applications.
 * 
 * Requirements:
 * - 4.1: Create store_inventory table with product_id, store_id, timestamps
 * - 4.2: Enforce foreign key constraints
 * - 4.3: Create composite unique index on (product_id, store_id)
 * - 4.4: Record or update store_inventory entry when product is scanned at location
 * - 4.5: Return all stores carrying a specific product
 * - 4.6: Return products available at stores within specified radius
 * - 7.1: Implement repository classes for data access operations
 * - 7.2: Create separate repository methods for inventory operations
 * - 7.3: Design repository methods to be framework-agnostic
 * - 7.4: Return typed results from repository methods
 * - 7.5: Handle errors consistently across all repository methods
 */
export class InventoryRepository {
  /**
   * Record product sighting at store
   * 
   * Upserts a store_inventory entry, creating a new record if the product-store
   * combination doesn't exist, or updating the last_seen_at timestamp if it does.
   * 
   * Requirements:
   * - 4.3: Composite unique index on (product_id, store_id)
   * - 4.4: Record or update store_inventory entry when product is scanned
   * 
   * @param productId - UUID of the product
   * @param storeId - UUID of the store
   * @returns Promise resolving to the created or updated StoreInventory record
   * 
   * @example
   * ```typescript
   * const repo = new InventoryRepository();
   * const inventory = await repo.recordSighting(
   *   'product-uuid-123',
   *   'store-uuid-456'
   * );
   * console.log('Recorded sighting at:', inventory.last_seen_at);
   * ```
   */
  async recordSighting(
    productId: string,
    storeId: string
  ): Promise<StoreInventory> {
    try {
      // Validate inputs
      if (!productId || productId.trim().length === 0) {
        throw this.createError(
          'INVALID_PRODUCT_ID',
          'Product ID cannot be empty',
          false,
          { productId, storeId }
        );
      }
      if (!storeId || storeId.trim().length === 0) {
        throw this.createError(
          'INVALID_STORE_ID',
          'Store ID cannot be empty',
          false,
          { productId, storeId }
        );
      }

      const supabase = getSupabaseClient();
      
      // Prepare the data with current timestamp for last_seen_at
      const insertData: StoreInventoryInsert = {
        product_id: productId,
        store_id: storeId,
        last_seen_at: new Date().toISOString(),
      };

      // Use upsert with onConflict on the composite unique index (product_id, store_id)
      // If the combination exists, update last_seen_at; otherwise, insert new record
      const { data: inventory, error } = await supabase
        .from('store_inventory')
        .upsert(insertData as any, {
          onConflict: 'product_id,store_id',
          ignoreDuplicates: false,
        })
        .select()
        .single();

      if (error) {
        console.error('Error recording sighting:', {
          productId,
          storeId,
          error: error.message,
          code: error.code,
        });
        
        // Check for foreign key constraint violations
        if (error.code === '23503') {
          throw this.createError(
            'FOREIGN_KEY_VIOLATION',
            `Invalid product_id or store_id: ${error.message}`,
            false,
            { productId, storeId, errorCode: error.code }
          );
        }
        
        throw this.createError(
          'RECORD_SIGHTING_FAILED',
          `Failed to record sighting: ${error.message}`,
          true,
          { productId, storeId, errorCode: error.code }
        );
      }

      if (!inventory) {
        throw this.createError(
          'RECORD_SIGHTING_NO_DATA',
          'Record sighting succeeded but no inventory data was returned',
          false,
          { productId, storeId }
        );
      }

      return inventory;
    } catch (error) {
      if (this.isRepositoryError(error)) {
        throw error;
      }
      
      console.error('Unexpected error in recordSighting:', error);
      throw this.createError(
        'RECORD_SIGHTING_UNEXPECTED',
        'An unexpected error occurred while recording sighting',
        false,
        { productId, storeId, error: String(error) }
      );
    }
  }

  /**
   * Get all stores carrying a product
   * 
   * Queries the store_inventory table for all stores that have the specified product,
   * joining with the stores table to return full store information.
   * 
   * Requirement 4.5: Return all stores carrying a specific product
   * 
   * @param productId - UUID of the product
   * @returns Promise resolving to array of stores carrying the product
   * 
   * @example
   * ```typescript
   * const repo = new InventoryRepository();
   * const stores = await repo.getStoresForProduct('product-uuid-123');
   * console.log('Product available at:', stores.map(s => s.name));
   * ```
   */
  async getStoresForProduct(productId: string): Promise<Store[]> {
    try {
      // Validate input
      if (!productId || productId.trim().length === 0) {
        throw this.createError(
          'INVALID_PRODUCT_ID',
          'Product ID cannot be empty',
          false,
          { productId }
        );
      }

      const supabase = getSupabaseClient();
      
      // Query store_inventory and join with stores table
      const { data, error } = await supabase
        .from('store_inventory')
        .select(`
          stores (
            id,
            name,
            address,
            location,
            created_at,
            updated_at
          )
        `)
        .eq('product_id', productId);

      if (error) {
        console.error('Error getting stores for product:', {
          productId,
          error: error.message,
          code: error.code,
        });
        throw this.createError(
          'GET_STORES_FOR_PRODUCT_FAILED',
          `Failed to get stores for product: ${error.message}`,
          true,
          { productId, errorCode: error.code }
        );
      }

      // Extract stores from the nested structure
      // Supabase returns: [{ stores: { id, name, ... } }, ...]
      const stores: Store[] = (data || [])
        .map((row: any) => row.stores)
        .filter((store: any) => store !== null);

      return stores;
    } catch (error) {
      if (this.isRepositoryError(error)) {
        throw error;
      }
      
      console.error('Unexpected error in getStoresForProduct:', error);
      throw this.createError(
        'GET_STORES_FOR_PRODUCT_UNEXPECTED',
        'An unexpected error occurred while getting stores for product',
        false,
        { productId, error: String(error) }
      );
    }
  }

  /**
   * Get all products at a store
   * 
   * Queries the store_inventory table for all products at the specified store,
   * joining with the products table to return full product information.
   * 
   * Requirement 4.5: Return all products at a specific store
   * 
   * @param storeId - UUID of the store
   * @returns Promise resolving to array of products at the store
   * 
   * @example
   * ```typescript
   * const repo = new InventoryRepository();
   * const products = await repo.getProductsAtStore('store-uuid-456');
   * console.log('Products at store:', products.map(p => p.name));
   * ```
   */
  async getProductsAtStore(storeId: string): Promise<Product[]> {
    try {
      // Validate input
      if (!storeId || storeId.trim().length === 0) {
        throw this.createError(
          'INVALID_STORE_ID',
          'Store ID cannot be empty',
          false,
          { storeId }
        );
      }

      const supabase = getSupabaseClient();
      
      // Query store_inventory and join with products table
      const { data, error } = await supabase
        .from('store_inventory')
        .select(`
          products (
            id,
            barcode,
            name,
            brand,
            last_scanned_at,
            created_at,
            updated_at
          )
        `)
        .eq('store_id', storeId);

      if (error) {
        console.error('Error getting products at store:', {
          storeId,
          error: error.message,
          code: error.code,
        });
        throw this.createError(
          'GET_PRODUCTS_AT_STORE_FAILED',
          `Failed to get products at store: ${error.message}`,
          true,
          { storeId, errorCode: error.code }
        );
      }

      // Extract products from the nested structure
      // Supabase returns: [{ products: { id, name, ... } }, ...]
      const products: Product[] = (data || [])
        .map((row: any) => row.products)
        .filter((product: any) => product !== null);

      return products;
    } catch (error) {
      if (this.isRepositoryError(error)) {
        throw error;
      }
      
      console.error('Unexpected error in getProductsAtStore:', error);
      throw this.createError(
        'GET_PRODUCTS_AT_STORE_UNEXPECTED',
        'An unexpected error occurred while getting products at store',
        false,
        { storeId, error: String(error) }
      );
    }
  }

  /**
   * Get products available at nearby stores
   * 
   * Combines spatial query for nearby stores with inventory lookup to find
   * all products available at stores within the specified radius.
   * Returns products grouped with their available stores and distances.
   * 
   * Requirement 4.6: Return products available at stores within specified radius
   * 
   * @param latitude - Latitude in decimal degrees (-90 to 90)
   * @param longitude - Longitude in decimal degrees (-180 to 180)
   * @param radiusMeters - Search radius in meters
   * @returns Promise resolving to array of products with their available stores
   * 
   * @example
   * ```typescript
   * const repo = new InventoryRepository();
   * const results = await repo.getProductsNearLocation(37.7749, -122.4194, 5000);
   * results.forEach(({ product, stores }) => {
   *   console.log(`${product.name} available at ${stores.length} nearby stores`);
   * });
   * ```
   */
  async getProductsNearLocation(
    latitude: number,
    longitude: number,
    radiusMeters: number
  ): Promise<ProductWithStores[]> {
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
      
      // Use the find_products_near_location helper function from the migration
      // This function combines spatial query with inventory lookup
      const { data, error } = await (supabase as any).rpc('find_products_near_location', {
        lat: latitude,
        lng: longitude,
        radius_meters: radiusMeters,
      });

      if (error) {
        console.error('Error finding products near location:', {
          latitude,
          longitude,
          radiusMeters,
          error: error.message,
          code: error.code,
        });
        throw this.createError(
          'GET_PRODUCTS_NEAR_LOCATION_FAILED',
          `Failed to find products near location: ${error.message}`,
          true,
          { latitude, longitude, radiusMeters, errorCode: error.code }
        );
      }

      // The RPC function returns rows with product and store information
      // We need to group by product and collect stores
      const productMap = new Map<string, ProductWithStores>();

      for (const row of data || []) {
        const productId = row.product_id;
        
        // Create product object
        const product: Product = {
          id: row.product_id,
          barcode: row.product_barcode,
          name: row.product_name,
          brand: row.product_brand,
          size: null,
          category: null,
          image_url: null,
          metadata: null,
          flagged_for_review: false,
          created_at: row.product_created_at,
          updated_at: row.product_updated_at,
        };

        // Create store with distance object
        const store: StoreWithDistance = {
          id: row.store_id,
          name: row.store_name,
          address: row.store_address,
          latitude: row.store_latitude || 0,
          longitude: row.store_longitude || 0,
          created_at: row.store_created_at,
          updated_at: row.store_updated_at,
          distance: row.distance_meters / 1000, // Convert meters to kilometers
        };

        // Add to map, grouping stores by product
        if (!productMap.has(productId)) {
          productMap.set(productId, {
            product,
            stores: [store],
          });
        } else {
          productMap.get(productId)!.stores.push(store);
        }
      }

      // Convert map to array and sort stores by distance within each product
      const results = Array.from(productMap.values()).map(item => ({
        product: item.product,
        stores: item.stores.sort((a, b) => a.distance - b.distance),
      }));

      return results;
    } catch (error) {
      if (this.isRepositoryError(error)) {
        throw error;
      }
      
      console.error('Unexpected error in getProductsNearLocation:', error);
      throw this.createError(
        'GET_PRODUCTS_NEAR_LOCATION_UNEXPECTED',
        'An unexpected error occurred while finding products near location',
        false,
        { latitude, longitude, radiusMeters, error: String(error) }
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
 * Create a singleton instance of InventoryRepository
 * 
 * This provides a convenient way to access the repository without
 * creating new instances everywhere.
 * 
 * @example
 * ```typescript
 * import { inventoryRepository } from '@/lib/supabase/repositories/InventoryRepository';
 * 
 * const inventory = await inventoryRepository.recordSighting(
 *   'product-uuid',
 *   'store-uuid'
 * );
 * ```
 */
export const inventoryRepository = new InventoryRepository();
