/**
 * Supabase Type Definitions
 * 
 * This file contains TypeScript type definitions for the Supabase database schema.
 * It includes types for all tables (products, stores, store_inventory) and their
 * Insert/Update variants, as well as helper types for geospatial operations.
 * 
 * Requirements: 2.1, 3.2, 4.1, 7.4
 */

// ============================================================================
// DATABASE SCHEMA TYPE
// ============================================================================

/**
 * Main database schema type that maps to Supabase tables
 * This follows the Supabase convention for type-safe database access
 */
export interface Database {
  public: {
    Tables: {
      products: {
        Row: Product;
        Insert: ProductInsert;
        Update: ProductUpdate;
      };
      stores: {
        Row: Store;
        Insert: StoreInsert;
        Update: StoreUpdate;
      };
      store_inventory: {
        Row: StoreInventory;
        Insert: StoreInventoryInsert;
        Update: StoreInventoryUpdate;
      };
    };
  };
}

// ============================================================================
// PRODUCT TYPES
// ============================================================================

/**
 * Product table row type
 * Represents a product in the canonical product registry
 * 
 * Requirement 2.1: Products table with id, barcode, name, brand, timestamps
 */
export interface Product {
  /** Unique identifier (UUID) */
  id: string;
  /** Product barcode (nullable for products without barcodes) */
  barcode: string | null;
  /** Product name */
  name: string;
  /** Product brand (nullable) */
  brand: string | null;
  /** Timestamp of last scan */
  last_scanned_at: string;
  /** Timestamp of creation */
  created_at: string;
  /** Timestamp of last update */
  updated_at: string;
}

/**
 * Product insert type
 * Used when creating new products
 */
export interface ProductInsert {
  /** Product barcode (optional, nullable) */
  barcode?: string | null;
  /** Product name (required) */
  name: string;
  /** Product brand (optional, nullable) */
  brand?: string | null;
  /** Timestamp of last scan (optional, defaults to NOW()) */
  last_scanned_at?: string;
}

/**
 * Product update type
 * Used when updating existing products
 */
export interface ProductUpdate {
  /** Product barcode (optional) */
  barcode?: string | null;
  /** Product name (optional) */
  name?: string;
  /** Product brand (optional) */
  brand?: string | null;
  /** Timestamp of last scan (optional) */
  last_scanned_at?: string;
  /** Timestamp of last update (optional, auto-updated by trigger) */
  updated_at?: string;
}

// ============================================================================
// STORE TYPES
// ============================================================================

/**
 * Store table row type
 * Represents a physical store location with geospatial data
 * 
 * Requirement 3.2: Stores table with id, name, address, location, timestamps
 */
export interface Store {
  /** Unique identifier (UUID) */
  id: string;
  /** Store name */
  name: string;
  /** Store address */
  address: string;
  /** Geographic location as GeoJSON string (POINT type with SRID 4326) */
  location: string;
  /** Timestamp of creation */
  created_at: string;
  /** Timestamp of last update */
  updated_at: string;
}

/**
 * Store insert type
 * Used when creating new stores
 */
export interface StoreInsert {
  /** Store name (required) */
  name: string;
  /** Store address (required) */
  address: string;
  /** Geographic location as GeoJSON string (required)
   * Format: {"type":"Point","coordinates":[longitude, latitude]}
   * Note: PostGIS uses [lng, lat] order, not [lat, lng]
   */
  location: string;
}

/**
 * Store update type
 * Used when updating existing stores
 */
export interface StoreUpdate {
  /** Store name (optional) */
  name?: string;
  /** Store address (optional) */
  address?: string;
  /** Geographic location as GeoJSON string (optional) */
  location?: string;
  /** Timestamp of last update (optional, auto-updated by trigger) */
  updated_at?: string;
}

// ============================================================================
// STORE INVENTORY TYPES
// ============================================================================

/**
 * Store inventory table row type
 * Represents the relationship between products and stores
 * 
 * Requirement 4.1: Store_inventory table with id, product_id, store_id, timestamps
 */
export interface StoreInventory {
  /** Unique identifier (UUID) */
  id: string;
  /** Foreign key to products table */
  product_id: string;
  /** Foreign key to stores table */
  store_id: string;
  /** Timestamp when product was last seen at this store */
  last_seen_at: string;
  /** Timestamp of creation */
  created_at: string;
  /** Timestamp of last update */
  updated_at: string;
}

/**
 * Store inventory insert type
 * Used when recording product sightings at stores
 */
export interface StoreInventoryInsert {
  /** Foreign key to products table (required) */
  product_id: string;
  /** Foreign key to stores table (required) */
  store_id: string;
  /** Timestamp when product was last seen (optional, defaults to NOW()) */
  last_seen_at?: string;
}

/**
 * Store inventory update type
 * Used when updating inventory records
 */
export interface StoreInventoryUpdate {
  /** Timestamp when product was last seen (optional) */
  last_seen_at?: string;
  /** Timestamp of last update (optional, auto-updated by trigger) */
  updated_at?: string;
}

// ============================================================================
// HELPER TYPES
// ============================================================================

/**
 * Geographic coordinates
 * Used for geolocation capture and spatial queries
 * 
 * Requirement 3.6: Capture user geolocation coordinates
 */
export interface Coordinates {
  /** Latitude in decimal degrees (-90 to 90) */
  latitude: number;
  /** Longitude in decimal degrees (-180 to 180) */
  longitude: number;
}

/**
 * Store with calculated distance
 * Used for proximity queries to include distance from query point
 * 
 * Requirement 3.5: Support queries for stores within specified radius
 */
export interface StoreWithDistance extends Store {
  /** Distance from query point in meters */
  distance_meters: number;
}

/**
 * GeoJSON Point type
 * Helper type for creating PostGIS-compatible location data
 */
export interface GeoJSONPoint {
  type: 'Point';
  /** Coordinates in [longitude, latitude] order (PostGIS convention) */
  coordinates: [number, number];
}

/**
 * Helper function to create GeoJSON string from coordinates
 * 
 * @param latitude - Latitude in decimal degrees
 * @param longitude - Longitude in decimal degrees
 * @returns GeoJSON string compatible with PostGIS geography(POINT, 4326)
 * 
 * @example
 * ```typescript
 * const location = createGeoJSONPoint(37.7749, -122.4194);
 * // Returns: '{"type":"Point","coordinates":[-122.4194,37.7749]}'
 * ```
 */
export function createGeoJSONPoint(latitude: number, longitude: number): string {
  const geoJSON: GeoJSONPoint = {
    type: 'Point',
    coordinates: [longitude, latitude], // PostGIS uses [lng, lat] order
  };
  return JSON.stringify(geoJSON);
}

/**
 * Helper function to parse GeoJSON string to coordinates
 * 
 * @param geoJSON - GeoJSON string from PostGIS
 * @returns Coordinates object with latitude and longitude
 * 
 * @example
 * ```typescript
 * const coords = parseGeoJSONPoint('{"type":"Point","coordinates":[-122.4194,37.7749]}');
 * // Returns: { latitude: 37.7749, longitude: -122.4194 }
 * ```
 */
export function parseGeoJSONPoint(geoJSON: string): Coordinates {
  const parsed: GeoJSONPoint = JSON.parse(geoJSON);
  return {
    latitude: parsed.coordinates[1],
    longitude: parsed.coordinates[0],
  };
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard to check if a value is a valid Product
 */
export function isProduct(value: unknown): value is Product {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    (typeof obj.barcode === 'string' || obj.barcode === null) &&
    typeof obj.name === 'string' &&
    (typeof obj.brand === 'string' || obj.brand === null) &&
    typeof obj.last_scanned_at === 'string' &&
    typeof obj.created_at === 'string' &&
    typeof obj.updated_at === 'string'
  );
}

/**
 * Type guard to check if a value is a valid Store
 */
export function isStore(value: unknown): value is Store {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.address === 'string' &&
    typeof obj.location === 'string' &&
    typeof obj.created_at === 'string' &&
    typeof obj.updated_at === 'string'
  );
}

/**
 * Type guard to check if a value is a valid StoreInventory
 */
export function isStoreInventory(value: unknown): value is StoreInventory {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    typeof obj.product_id === 'string' &&
    typeof obj.store_id === 'string' &&
    typeof obj.last_seen_at === 'string' &&
    typeof obj.created_at === 'string' &&
    typeof obj.updated_at === 'string'
  );
}

/**
 * Type guard to check if a value is valid Coordinates
 */
export function isCoordinates(value: unknown): value is Coordinates {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.latitude === 'number' &&
    typeof obj.longitude === 'number' &&
    obj.latitude >= -90 &&
    obj.latitude <= 90 &&
    obj.longitude >= -180 &&
    obj.longitude <= 180
  );
}
