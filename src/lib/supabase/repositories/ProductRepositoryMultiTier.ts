/**
 * Product Repository for Multi-Tier Product Identification
 * 
 * Repository class for product data access operations in the multi-tier system.
 * Provides methods for finding, creating, updating, and querying products
 * with support for metadata-based searches and barcode associations.
 * 
 * Requirements: 1.5, 2.5, 3.4, 12.1, 12.4, 12.5
 */

import { getSupabaseServerClient } from '../server-client';
import type { Product, ProductInsert, ProductUpdate } from '../types';
import { ProductMetadata } from '@/lib/types/multi-tier';

/**
 * Product search result with similarity score
 */
export interface ProductSearchResult extends Product {
  similarity_score: number;
}

/**
 * Product Repository class for multi-tier system
 * 
 * Implements data access operations for products with support for:
 * - Barcode-based lookups
 * - Metadata-based fuzzy searches
 * - Transaction support for consistency
 * - Barcode association updates
 */
export class ProductRepositoryMultiTier {
  /**
   * Find product by barcode
   * Requirement 1.5: Query products by barcode
   * 
   * @param barcode - Product barcode to search for
   * @returns Promise resolving to Product or null if not found
   */
  async findByBarcode(barcode: string): Promise<Product | null> {
    try {
      const supabase = getSupabaseServerClient();
      
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('barcode', barcode)
        .maybeSingle();

      if (error) {
        console.error('[Product Repository] Error finding by barcode:', error);
        throw new Error(`Failed to find product by barcode: ${error.message}`);
      }

      if (data) {
        console.log(`[Product Repository] ✅ Found product by barcode: ${data.name}`);
      } else {
        console.log(`[Product Repository] ❌ No product found for barcode: ${barcode}`);
      }

      return data;
    } catch (error) {
      console.error('[Product Repository] Unexpected error in findByBarcode:', error);
      throw error;
    }
  }

  /**
   * Find product by ID
   * 
   * @param id - Product ID (UUID)
   * @returns Promise resolving to Product or null if not found
   */
  async findById(id: string): Promise<Product | null> {
    try {
      const supabase = getSupabaseServerClient();
      
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.error('[Product Repository] Error finding by ID:', error);
        throw new Error(`Failed to find product by ID: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('[Product Repository] Unexpected error in findById:', error);
      throw error;
    }
  }

  /**
   * Search products by metadata (name, brand, size)
   * Requirement 2.5: Query by metadata for Tier 2 results
   * 
   * Uses the search_products_by_metadata function for fuzzy matching
   * 
   * @param metadata - Product metadata to search for
   * @returns Promise resolving to array of matching products with similarity scores
   */
  async searchByMetadata(metadata: ProductMetadata): Promise<ProductSearchResult[]> {
    try {
      const supabase = getSupabaseServerClient();
      
      console.log('[Product Repository] 🔍 Searching by metadata:', {
        name: metadata.productName,
        brand: metadata.brandName,
        size: metadata.size,
      });

      // Call the Supabase function for metadata search
      const { data, error } = await supabase.rpc('search_products_by_metadata', {
        p_name: metadata.productName || '',
        p_brand: metadata.brandName || null,
        p_size: metadata.size || null,
      });

      if (error) {
        console.error('[Product Repository] Error searching by metadata:', error);
        throw new Error(`Failed to search products by metadata: ${error.message}`);
      }

      console.log(`[Product Repository] Found ${data?.length || 0} matching products`);
      
      return (data || []) as ProductSearchResult[];
    } catch (error) {
      console.error('[Product Repository] Unexpected error in searchByMetadata:', error);
      throw error;
    }
  }

  /**
   * Create a new product
   * Requirement 12.1: Save products to Supabase
   * 
   * @param data - Product data to insert
   * @returns Promise resolving to the created Product
   */
  async create(data: ProductInsert): Promise<Product> {
    try {
      const supabase = getSupabaseServerClient();
      
      console.log('[Product Repository] 💾 Creating product:', data.name);

      const { data: product, error } = await supabase
        .from('products')
        .insert(data)
        .select()
        .single();

      if (error) {
        console.error('[Product Repository] Error creating product:', error);
        throw new Error(`Failed to create product: ${error.message}`);
      }

      if (!product) {
        throw new Error('Product created but no data returned');
      }

      console.log(`[Product Repository] ✅ Created product: ${product.id}`);
      
      return product;
    } catch (error) {
      console.error('[Product Repository] Unexpected error in create:', error);
      throw error;
    }
  }

  /**
   * Update an existing product
   * Requirement 12.1: Update products in Supabase
   * 
   * @param id - Product ID to update
   * @param data - Product data to update
   * @returns Promise resolving to the updated Product
   */
  async update(id: string, data: ProductUpdate): Promise<Product> {
    try {
      const supabase = getSupabaseServerClient();
      
      console.log('[Product Repository] 📝 Updating product:', id);

      const { data: product, error } = await supabase
        .from('products')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('[Product Repository] Error updating product:', error);
        throw new Error(`Failed to update product: ${error.message}`);
      }

      if (!product) {
        throw new Error('Product updated but no data returned');
      }

      console.log(`[Product Repository] ✅ Updated product: ${product.id}`);
      
      return product;
    } catch (error) {
      console.error('[Product Repository] Unexpected error in update:', error);
      throw error;
    }
  }

  /**
   * Upsert product by barcode
   * Insert if new, update if exists based on barcode uniqueness
   * Requirement 3.4: Save discovered barcodes
   * 
   * @param data - Product data to upsert
   * @returns Promise resolving to the created or updated Product
   */
  async upsertByBarcode(data: ProductInsert): Promise<Product> {
    try {
      const supabase = getSupabaseServerClient();
      
      console.log('[Product Repository] 🔄 Upserting product by barcode:', data.barcode);

      // Use the upsert_product function for atomic upsert
      const { data: result, error } = await supabase.rpc('upsert_product', {
        p_barcode: data.barcode || null,
        p_name: data.name,
        p_brand: data.brand,
        p_size: data.size || null,
        p_category: data.category || null,
        p_image_url: data.image_url || null,
        p_metadata: data.metadata || null,
      });

      if (error) {
        console.error('[Product Repository] Error upserting product:', error);
        throw new Error(`Failed to upsert product: ${error.message}`);
      }

      if (!result || result.length === 0) {
        throw new Error('Product upserted but no data returned');
      }

      const product = result[0] as Product;
      console.log(`[Product Repository] ✅ Upserted product: ${product.id}`);
      
      return product;
    } catch (error) {
      console.error('[Product Repository] Unexpected error in upsertByBarcode:', error);
      throw error;
    }
  }

  /**
   * Associate a barcode with an existing product
   * Used by Discovery Service (Tier 3) to save discovered barcodes
   * Requirement 3.4, 3.5: Save discovered barcode to Product Repository
   * 
   * @param productId - Product ID to update
   * @param barcode - Barcode to associate
   * @returns Promise resolving to the updated Product
   */
  async associateBarcode(productId: string, barcode: string): Promise<Product> {
    try {
      const supabase = getSupabaseServerClient();
      
      console.log(`[Product Repository] 🔗 Associating barcode ${barcode} with product ${productId}`);

      const { data: product, error } = await supabase
        .from('products')
        .update({ barcode })
        .eq('id', productId)
        .select()
        .single();

      if (error) {
        console.error('[Product Repository] Error associating barcode:', error);
        throw new Error(`Failed to associate barcode: ${error.message}`);
      }

      if (!product) {
        throw new Error('Barcode associated but no data returned');
      }

      console.log(`[Product Repository] ✅ Associated barcode with product`);
      
      return product;
    } catch (error) {
      console.error('[Product Repository] Unexpected error in associateBarcode:', error);
      throw error;
    }
  }

  /**
   * Flag a product for manual review
   * Used by Error Reporter when incorrect identification is reported
   * Requirement 5.5: Flag product for manual review
   * 
   * @param productId - Product ID to flag
   * @returns Promise that resolves when flagging is complete
   */
  async flagForReview(productId: string): Promise<void> {
    try {
      const supabase = getSupabaseServerClient();
      
      console.log(`[Product Repository] 🚩 Flagging product ${productId} for review`);

      const { error } = await supabase
        .from('products')
        .update({ flagged_for_review: true })
        .eq('id', productId);

      if (error) {
        console.error('[Product Repository] Error flagging product:', error);
        throw new Error(`Failed to flag product for review: ${error.message}`);
      }

      console.log(`[Product Repository] ✅ Flagged product for review`);
    } catch (error) {
      console.error('[Product Repository] Unexpected error in flagForReview:', error);
      throw error;
    }
  }

  /**
   * Get products flagged for review
   * 
   * @param limit - Maximum number of products to return
   * @returns Promise resolving to array of flagged products
   */
  async getFlaggedProducts(limit: number = 50): Promise<Product[]> {
    try {
      const supabase = getSupabaseServerClient();
      
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('flagged_for_review', true)
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('[Product Repository] Error getting flagged products:', error);
        throw new Error(`Failed to get flagged products: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('[Product Repository] Unexpected error in getFlaggedProducts:', error);
      throw error;
    }
  }

  /**
   * Execute a transaction with retry logic
   * Requirement 12.4, 12.5: Transaction support with rollback
   * Requirement 12.7: Retry failed operations with exponential backoff
   * 
   * @param operation - Async operation to execute
   * @param maxRetries - Maximum number of retries (default: 3)
   * @returns Promise resolving to operation result
   */
  async withTransaction<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Execute the operation
        const result = await operation();
        
        if (attempt > 0) {
          console.log(`[Product Repository] ✅ Transaction succeeded on attempt ${attempt + 1}`);
        }
        
        return result;
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < maxRetries) {
          // Calculate exponential backoff delay
          const delay = Math.min(100 * Math.pow(2, attempt), 400);
          console.log(`[Product Repository] ⚠️  Transaction failed, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
          
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    console.error(`[Product Repository] ❌ Transaction failed after ${maxRetries + 1} attempts`);
    throw lastError || new Error('Transaction failed');
  }
}

// Export singleton instance
export const productRepositoryMultiTier = new ProductRepositoryMultiTier();
