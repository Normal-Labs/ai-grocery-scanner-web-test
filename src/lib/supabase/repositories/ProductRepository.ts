/**
 * ProductRepository
 * 
 * Repository class for product data access operations.
 * Provides methods for finding, creating, updating, and querying products
 * in the Supabase products table.
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 7.1, 7.2, 7.5
 */

import { getSupabaseClient } from '../client';
import type { Product, ProductInsert } from '../types';

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
 * Result type for repository operations
 */
export interface RepositoryResult<T> {
  success: boolean;
  data?: T;
  error?: RepositoryError;
}

/**
 * ProductRepository class
 * 
 * Implements data access operations for products following the repository pattern.
 * All methods return consistent error formats and are designed to be framework-agnostic
 * for future reusability in mobile applications.
 * 
 * Requirements:
 * - 7.1: Implement repository classes for data access operations
 * - 7.2: Create separate repository methods for products operations
 * - 7.3: Design repository methods to be framework-agnostic
 * - 7.4: Return typed results from repository methods
 * - 7.5: Handle errors consistently across all repository methods
 */
export class ProductRepository {
  /**
   * Find product by barcode
   * 
   * Queries the products table for a product with the specified barcode.
   * Returns null if not found.
   * 
   * Requirements:
   * - 2.1: Query products table
   * - 2.2: Use barcode as lookup key (unique index)
   * 
   * @param barcode - Product barcode to search for
   * @returns Promise resolving to Product or null if not found
   * 
   * @example
   * ```typescript
   * const repo = new ProductRepository();
   * const product = await repo.findByBarcode('012345678901');
   * if (product) {
   *   console.log('Found product:', product.name);
   * }
   * ```
   */
  async findByBarcode(barcode: string): Promise<Product | null> {
    try {
      const supabase = getSupabaseClient();
      
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('barcode', barcode)
        .maybeSingle();

      if (error) {
        console.error('Error finding product by barcode:', {
          barcode,
          error: error.message,
          code: error.code,
        });
        throw this.createError(
          'FIND_BY_BARCODE_FAILED',
          `Failed to find product by barcode: ${error.message}`,
          true,
          { barcode, errorCode: error.code }
        );
      }

      return data;
    } catch (error) {
      if (this.isRepositoryError(error)) {
        throw error;
      }
      
      console.error('Unexpected error in findByBarcode:', error);
      throw this.createError(
        'FIND_BY_BARCODE_UNEXPECTED',
        'An unexpected error occurred while finding product',
        false,
        { barcode, error: String(error) }
      );
    }
  }

  /**
   * Upsert product (insert or update)
   * 
   * Inserts a new product or updates an existing one based on barcode uniqueness.
   * On conflict (duplicate barcode), updates the existing product and refreshes
   * the last_scanned_at timestamp.
   * 
   * Requirements:
   * - 2.2: Enforce unique index on barcode column
   * - 2.3: Update last_scanned_at timestamp when product is scanned
   * - 2.4: Insert new products with current timestamp
   * 
   * @param data - Product data to insert or update
   * @returns Promise resolving to the created or updated Product
   * 
   * @example
   * ```typescript
   * const repo = new ProductRepository();
   * const product = await repo.upsert({
   *   barcode: '012345678901',
   *   name: 'Organic Milk',
   *   brand: 'Happy Farms'
   * });
   * console.log('Product ID:', product.id);
   * ```
   */
  async upsert(data: ProductInsert): Promise<Product> {
    try {
      const supabase = getSupabaseClient();
      
      // Prepare the data with current timestamp for last_scanned_at
      const insertData = {
        ...data,
        last_scanned_at: new Date().toISOString(),
      };

      // Use upsert with onConflict on barcode
      // If barcode is null, this will insert a new record
      // If barcode exists, this will update the existing record
      const { data: product, error } = await supabase
        .from('products')
        .upsert(insertData as any, {
          onConflict: 'barcode',
          ignoreDuplicates: false,
        })
        .select()
        .single();

      if (error) {
        console.error('Error upserting product:', {
          data: insertData,
          error: error.message,
          code: error.code,
        });
        throw this.createError(
          'UPSERT_FAILED',
          `Failed to upsert product: ${error.message}`,
          true,
          { data: insertData, errorCode: error.code }
        );
      }

      if (!product) {
        throw this.createError(
          'UPSERT_NO_DATA',
          'Upsert succeeded but no product data was returned',
          false,
          { data: insertData }
        );
      }

      return product;
    } catch (error) {
      if (this.isRepositoryError(error)) {
        throw error;
      }
      
      console.error('Unexpected error in upsert:', error);
      throw this.createError(
        'UPSERT_UNEXPECTED',
        'An unexpected error occurred while upserting product',
        false,
        { data, error: String(error) }
      );
    }
  }

  /**
   * Update last scanned timestamp
   * 
   * Updates the last_scanned_at timestamp for a product identified by barcode.
   * This is used when a cached insight is returned to track product activity.
   * 
   * Requirement 2.3: Update last_scanned_at timestamp when product is scanned
   * 
   * @param barcode - Product barcode to update
   * @returns Promise that resolves when update is complete
   * 
   * @example
   * ```typescript
   * const repo = new ProductRepository();
   * await repo.updateLastScanned('012345678901');
   * ```
   */
  async updateLastScanned(barcode: string): Promise<void> {
    try {
      const supabase = getSupabaseClient();
      
      const { error } = await (supabase as any)
        .from('products')
        .update({
          last_scanned_at: new Date().toISOString(),
        })
        .eq('barcode', barcode);

      if (error) {
        console.error('Error updating last scanned timestamp:', {
          barcode,
          error: error.message,
          code: error.code,
        });
        throw this.createError(
          'UPDATE_LAST_SCANNED_FAILED',
          `Failed to update last scanned timestamp: ${error.message}`,
          true,
          { barcode, errorCode: error.code }
        );
      }
    } catch (error) {
      if (this.isRepositoryError(error)) {
        throw error;
      }
      
      console.error('Unexpected error in updateLastScanned:', error);
      throw this.createError(
        'UPDATE_LAST_SCANNED_UNEXPECTED',
        'An unexpected error occurred while updating last scanned timestamp',
        false,
        { barcode, error: String(error) }
      );
    }
  }

  /**
   * Get recently scanned products for a user
   * 
   * Note: This method currently returns recently scanned products globally
   * since the products table doesn't have a user_id column. In a future
   * iteration, we may add a scan_history table to track user-specific scans.
   * 
   * For now, this returns the most recently scanned products across all users.
   * 
   * @param userId - User ID (currently unused, reserved for future use)
   * @param limit - Maximum number of products to return (default: 10)
   * @returns Promise resolving to array of recently scanned Products
   * 
   * @example
   * ```typescript
   * const repo = new ProductRepository();
   * const recent = await repo.getRecentlyScanned('user-123', 5);
   * console.log('Recent products:', recent.map(p => p.name));
   * ```
   */
  async getRecentlyScanned(userId: string, limit: number = 10): Promise<Product[]> {
    try {
      const supabase = getSupabaseClient();
      
      // Note: Currently returns global recently scanned products
      // TODO: Add scan_history table to track user-specific scans
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('last_scanned_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error getting recently scanned products:', {
          userId,
          limit,
          error: error.message,
          code: error.code,
        });
        throw this.createError(
          'GET_RECENTLY_SCANNED_FAILED',
          `Failed to get recently scanned products: ${error.message}`,
          true,
          { userId, limit, errorCode: error.code }
        );
      }

      return data || [];
    } catch (error) {
      if (this.isRepositoryError(error)) {
        throw error;
      }
      
      console.error('Unexpected error in getRecentlyScanned:', error);
      throw this.createError(
        'GET_RECENTLY_SCANNED_UNEXPECTED',
        'An unexpected error occurred while getting recently scanned products',
        false,
        { userId, limit, error: String(error) }
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
 * Create a singleton instance of ProductRepository
 * 
 * This provides a convenient way to access the repository without
 * creating new instances everywhere.
 * 
 * @example
 * ```typescript
 * import { productRepository } from '@/lib/supabase/repositories/ProductRepository';
 * 
 * const product = await productRepository.findByBarcode('012345678901');
 * ```
 */
export const productRepository = new ProductRepository();
