/**
 * Unit tests for Supabase type definitions
 * 
 * Tests helper functions and type guards to ensure correct behavior
 */

import {
  createGeoJSONPoint,
  parseGeoJSONPoint,
  isProduct,
  isStore,
  isStoreInventory,
  isCoordinates,
  type Product,
  type Store,
  type StoreInventory,
  type Coordinates,
} from '../types';

describe('Supabase Types', () => {
  describe('createGeoJSONPoint', () => {
    it('should create valid GeoJSON string with correct coordinate order', () => {
      const result = createGeoJSONPoint(37.7749, -122.4194);
      const parsed = JSON.parse(result);
      
      expect(parsed.type).toBe('Point');
      expect(parsed.coordinates).toEqual([-122.4194, 37.7749]); // [lng, lat]
    });

    it('should handle positive coordinates', () => {
      const result = createGeoJSONPoint(51.5074, 0.1278);
      const parsed = JSON.parse(result);
      
      expect(parsed.coordinates).toEqual([0.1278, 51.5074]);
    });

    it('should handle boundary coordinates', () => {
      const result = createGeoJSONPoint(90, 180);
      const parsed = JSON.parse(result);
      
      expect(parsed.coordinates).toEqual([180, 90]);
    });

    it('should handle negative boundary coordinates', () => {
      const result = createGeoJSONPoint(-90, -180);
      const parsed = JSON.parse(result);
      
      expect(parsed.coordinates).toEqual([-180, -90]);
    });
  });

  describe('parseGeoJSONPoint', () => {
    it('should parse GeoJSON string to coordinates', () => {
      const geoJSON = '{"type":"Point","coordinates":[-122.4194,37.7749]}';
      const result = parseGeoJSONPoint(geoJSON);
      
      expect(result.latitude).toBe(37.7749);
      expect(result.longitude).toBe(-122.4194);
    });

    it('should handle positive coordinates', () => {
      const geoJSON = '{"type":"Point","coordinates":[0.1278,51.5074]}';
      const result = parseGeoJSONPoint(geoJSON);
      
      expect(result.latitude).toBe(51.5074);
      expect(result.longitude).toBe(0.1278);
    });

    it('should round-trip with createGeoJSONPoint', () => {
      const original: Coordinates = { latitude: 37.7749, longitude: -122.4194 };
      const geoJSON = createGeoJSONPoint(original.latitude, original.longitude);
      const parsed = parseGeoJSONPoint(geoJSON);
      
      expect(parsed.latitude).toBe(original.latitude);
      expect(parsed.longitude).toBe(original.longitude);
    });
  });

  describe('isProduct', () => {
    const validProduct: Product = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      barcode: '1234567890123',
      name: 'Test Product',
      brand: 'Test Brand',
      last_scanned_at: '2024-01-01T00:00:00Z',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    it('should return true for valid product', () => {
      expect(isProduct(validProduct)).toBe(true);
    });

    it('should return true for product with null barcode', () => {
      const product = { ...validProduct, barcode: null };
      expect(isProduct(product)).toBe(true);
    });

    it('should return true for product with null brand', () => {
      const product = { ...validProduct, brand: null };
      expect(isProduct(product)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isProduct(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isProduct(undefined)).toBe(false);
    });

    it('should return false for non-object', () => {
      expect(isProduct('not an object')).toBe(false);
      expect(isProduct(123)).toBe(false);
    });

    it('should return false for object missing required fields', () => {
      const incomplete = { id: '123', name: 'Test' };
      expect(isProduct(incomplete)).toBe(false);
    });

    it('should return false for object with wrong field types', () => {
      const wrongTypes = { ...validProduct, id: 123 };
      expect(isProduct(wrongTypes)).toBe(false);
    });
  });

  describe('isStore', () => {
    const validStore: Store = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Test Store',
      address: '123 Main St',
      location: '{"type":"Point","coordinates":[-122.4194,37.7749]}',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    it('should return true for valid store', () => {
      expect(isStore(validStore)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isStore(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isStore(undefined)).toBe(false);
    });

    it('should return false for non-object', () => {
      expect(isStore('not an object')).toBe(false);
    });

    it('should return false for object missing required fields', () => {
      const incomplete = { id: '123', name: 'Test' };
      expect(isStore(incomplete)).toBe(false);
    });

    it('should return false for object with wrong field types', () => {
      const wrongTypes = { ...validStore, location: 123 };
      expect(isStore(wrongTypes)).toBe(false);
    });
  });

  describe('isStoreInventory', () => {
    const validInventory: StoreInventory = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      product_id: '223e4567-e89b-12d3-a456-426614174000',
      store_id: '323e4567-e89b-12d3-a456-426614174000',
      last_seen_at: '2024-01-01T00:00:00Z',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    it('should return true for valid store inventory', () => {
      expect(isStoreInventory(validInventory)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isStoreInventory(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isStoreInventory(undefined)).toBe(false);
    });

    it('should return false for non-object', () => {
      expect(isStoreInventory('not an object')).toBe(false);
    });

    it('should return false for object missing required fields', () => {
      const incomplete = { id: '123', product_id: '456' };
      expect(isStoreInventory(incomplete)).toBe(false);
    });

    it('should return false for object with wrong field types', () => {
      const wrongTypes = { ...validInventory, product_id: 123 };
      expect(isStoreInventory(wrongTypes)).toBe(false);
    });
  });

  describe('isCoordinates', () => {
    it('should return true for valid coordinates', () => {
      const coords: Coordinates = { latitude: 37.7749, longitude: -122.4194 };
      expect(isCoordinates(coords)).toBe(true);
    });

    it('should return true for boundary coordinates', () => {
      expect(isCoordinates({ latitude: 90, longitude: 180 })).toBe(true);
      expect(isCoordinates({ latitude: -90, longitude: -180 })).toBe(true);
    });

    it('should return true for zero coordinates', () => {
      expect(isCoordinates({ latitude: 0, longitude: 0 })).toBe(true);
    });

    it('should return false for latitude out of range', () => {
      expect(isCoordinates({ latitude: 91, longitude: 0 })).toBe(false);
      expect(isCoordinates({ latitude: -91, longitude: 0 })).toBe(false);
    });

    it('should return false for longitude out of range', () => {
      expect(isCoordinates({ latitude: 0, longitude: 181 })).toBe(false);
      expect(isCoordinates({ latitude: 0, longitude: -181 })).toBe(false);
    });

    it('should return false for null', () => {
      expect(isCoordinates(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isCoordinates(undefined)).toBe(false);
    });

    it('should return false for non-object', () => {
      expect(isCoordinates('not an object')).toBe(false);
    });

    it('should return false for object missing required fields', () => {
      expect(isCoordinates({ latitude: 37.7749 })).toBe(false);
      expect(isCoordinates({ longitude: -122.4194 })).toBe(false);
    });

    it('should return false for object with wrong field types', () => {
      expect(isCoordinates({ latitude: '37.7749', longitude: -122.4194 })).toBe(false);
      expect(isCoordinates({ latitude: 37.7749, longitude: '-122.4194' })).toBe(false);
    });
  });

  describe('Type compatibility', () => {
    it('should allow Product to be used with Database type', () => {
      // This is a compile-time check, but we can verify the structure
      const product: Product = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        barcode: '1234567890123',
        name: 'Test Product',
        brand: 'Test Brand',
        last_scanned_at: '2024-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      // Verify all required fields are present
      expect(product.id).toBeDefined();
      expect(product.name).toBeDefined();
      expect(product.last_scanned_at).toBeDefined();
      expect(product.created_at).toBeDefined();
      expect(product.updated_at).toBeDefined();
    });

    it('should allow Store to be used with Database type', () => {
      const store: Store = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Store',
        address: '123 Main St',
        location: '{"type":"Point","coordinates":[-122.4194,37.7749]}',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      // Verify all required fields are present
      expect(store.id).toBeDefined();
      expect(store.name).toBeDefined();
      expect(store.address).toBeDefined();
      expect(store.location).toBeDefined();
      expect(store.created_at).toBeDefined();
      expect(store.updated_at).toBeDefined();
    });

    it('should allow StoreInventory to be used with Database type', () => {
      const inventory: StoreInventory = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        product_id: '223e4567-e89b-12d3-a456-426614174000',
        store_id: '323e4567-e89b-12d3-a456-426614174000',
        last_seen_at: '2024-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      // Verify all required fields are present
      expect(inventory.id).toBeDefined();
      expect(inventory.product_id).toBeDefined();
      expect(inventory.store_id).toBeDefined();
      expect(inventory.last_seen_at).toBeDefined();
      expect(inventory.created_at).toBeDefined();
      expect(inventory.updated_at).toBeDefined();
    });
  });
});
