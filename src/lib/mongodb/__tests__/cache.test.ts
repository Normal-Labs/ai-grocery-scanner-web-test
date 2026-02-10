/**
 * Unit tests for MongoDBCacheRepository
 * 
 * Tests cache operations including get, set, incrementScanCount,
 * invalidate, and edge cases like expiration and error handling.
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 10.2
 * 
 * NOTE: These tests use mocks to avoid MongoDB ESM module issues with Jest.
 * The implementation follows the same pattern as client.ts which has passing tests.
 * For integration testing with real MongoDB, use a separate test environment.
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ProductInsights } from '@/lib/types';

// Mock collection
let mockCollection: any;
let mockDb: any;

// Mock MongoDB module
jest.mock('mongodb', () => ({
  MongoClient: jest.fn(),
}));

// Mock getMongoClient with inline function
jest.mock('../client', () => ({
  getMongoClient: jest.fn(async () => {
    // This will be set in beforeEach
    if (!global.mockDb) {
      throw new Error('mockDb not set');
    }
    return global.mockDb;
  }),
  closeMongoClient: jest.fn(),
}));

// Import after mocks are set up
import { MongoDBCacheRepository } from '../cache';

// Extend global to include mockDb
declare global {
  var mockDb: any;
}

describe('MongoDBCacheRepository', () => {
  let repository: MongoDBCacheRepository;

  // Sample product insights for testing
  const sampleInsights: ProductInsights = {
    health: {
      rating: 'Good',
      explanation: 'Contains natural ingredients with high nutritional value.'
    },
    preservatives: {
      rating: 'Low',
      explanation: 'Contains minimal preservatives, mostly natural.'
    },
    allergies: {
      rating: 'None',
      explanation: 'No common allergens detected.'
    },
    sustainability: {
      rating: 'Good',
      explanation: 'Sustainably sourced with eco-friendly packaging.'
    },
    carbon: {
      rating: 'Low',
      explanation: 'Low carbon footprint due to local sourcing.'
    }
  };

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    
    // Setup mock collection with default implementations
    mockCollection = {
      createIndex: jest.fn().mockResolvedValue('index_created'),
      findOne: jest.fn().mockResolvedValue(null),
      updateOne: jest.fn().mockResolvedValue({ acknowledged: true }),
      deleteOne: jest.fn().mockResolvedValue({ acknowledged: true }),
      countDocuments: jest.fn().mockResolvedValue(0),
      find: jest.fn(() => ({
        sort: jest.fn(() => ({
          limit: jest.fn(() => ({
            project: jest.fn(() => ({
              toArray: jest.fn().mockResolvedValue([])
            }))
          }))
        }))
      })),
      insertOne: jest.fn().mockResolvedValue({ acknowledged: true }),
      indexes: jest.fn().mockResolvedValue([
        { name: '_id_' },
        { name: 'barcode_unique' },
        { name: 'expiresAt_ttl' },
        { name: 'createdAt_desc' }
      ])
    };
    
    // Setup mock DB
    mockDb = {
      collection: jest.fn(() => mockCollection),
    };
    
    // Set global mockDb for the mock function to use
    global.mockDb = mockDb;
    
    repository = new MongoDBCacheRepository();
  });

  describe('set and get operations', () => {
    it('should save and retrieve a cached insight', async () => {
      // Arrange
      const barcode = '123456789';
      const productName = 'Organic Milk';
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const mockInsight = {
        barcode,
        productName,
        insights: sampleInsights,
        createdAt: now,
        expiresAt,
        scanCount: 0
      };

      // Mock successful set
      mockCollection.updateOne = jest.fn().mockResolvedValue({ acknowledged: true });
      
      // Mock successful get
      mockCollection.findOne = jest.fn().mockResolvedValue(mockInsight);

      // Act
      await repository.set(barcode, productName, sampleInsights);
      const result = await repository.get(barcode);

      // Assert
      expect(mockCollection.updateOne).toHaveBeenCalledWith(
        { barcode },
        expect.objectContaining({
          $set: expect.objectContaining({
            barcode,
            productName,
            insights: sampleInsights
          }),
          $setOnInsert: expect.objectContaining({
            scanCount: 0
          })
        }),
        { upsert: true }
      );
      
      expect(mockCollection.findOne).toHaveBeenCalledWith({
        barcode,
        expiresAt: { $gt: expect.any(Date) }
      });
      
      expect(result).toEqual(mockInsight);
    });

    it('should return null for non-existent barcode', async () => {
      // Arrange
      mockCollection.findOne = jest.fn().mockResolvedValue(null);

      // Act
      const result = await repository.get('nonexistent');

      // Assert
      expect(result).toBeNull();
      expect(mockCollection.findOne).toHaveBeenCalledWith({
        barcode: 'nonexistent',
        expiresAt: { $gt: expect.any(Date) }
      });
    });

    it('should set custom TTL', async () => {
      // Arrange
      const barcode = '123456789';
      const productName = 'Organic Milk';
      const ttlDays = 7;

      // Act
      await repository.set(barcode, productName, sampleInsights, ttlDays);

      // Assert
      expect(mockCollection.updateOne).toHaveBeenCalledWith(
        { barcode },
        expect.objectContaining({
          $set: expect.objectContaining({
            barcode,
            productName,
            insights: sampleInsights,
            expiresAt: expect.any(Date)
          })
        }),
        { upsert: true }
      );
      
      // Verify TTL is approximately 7 days
      const call = (mockCollection.updateOne as jest.Mock).mock.calls[0];
      const expiresAt = call[1].$set.expiresAt;
      const now = new Date();
      const expectedExpiry = new Date(now.getTime() + ttlDays * 24 * 60 * 60 * 1000);
      const timeDiff = Math.abs(expiresAt.getTime() - expectedExpiry.getTime());
      expect(timeDiff).toBeLessThan(1000); // Within 1 second
    });
  });

  describe('expiration handling', () => {
    it('should not return expired insights', async () => {
      // Arrange
      mockCollection.findOne = jest.fn().mockResolvedValue(null);

      // Act
      const result = await repository.get('123456789');

      // Assert
      expect(result).toBeNull();
      expect(mockCollection.findOne).toHaveBeenCalledWith({
        barcode: '123456789',
        expiresAt: { $gt: expect.any(Date) }
      });
    });

    it('should return insights that have not expired', async () => {
      // Arrange
      const barcode = '123456789';
      const productName = 'Organic Milk';
      const now = new Date();
      const futureDate = new Date(now.getTime() + 1000 * 60 * 60); // 1 hour from now
      
      const mockInsight = {
        barcode,
        productName,
        insights: sampleInsights,
        createdAt: now,
        expiresAt: futureDate,
        scanCount: 0
      };
      
      mockCollection.findOne = jest.fn().mockResolvedValue(mockInsight);

      // Act
      const result = await repository.get(barcode);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.barcode).toBe(barcode);
    });
  });

  describe('incrementScanCount', () => {
    it('should increment scan count', async () => {
      // Arrange
      const barcode = '123456789';
      mockCollection.updateOne = jest.fn().mockResolvedValue({ acknowledged: true });

      // Act
      await repository.incrementScanCount(barcode);

      // Assert
      expect(mockCollection.updateOne).toHaveBeenCalledWith(
        { barcode },
        { $inc: { scanCount: 1 } }
      );
    });

    it('should handle incrementing non-existent barcode gracefully', async () => {
      // Arrange
      mockCollection.updateOne = jest.fn().mockResolvedValue({ acknowledged: true, matchedCount: 0 });

      // Act & Assert - should not throw
      await expect(
        repository.incrementScanCount('nonexistent')
      ).resolves.not.toThrow();
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockCollection.updateOne = jest.fn().mockRejectedValue(new Error('Database error'));

      // Act & Assert - should not throw
      await expect(
        repository.incrementScanCount('123456789')
      ).resolves.not.toThrow();
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error incrementing scan count:',
        expect.any(Error)
      );
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('invalidate', () => {
    it('should remove cached insight', async () => {
      // Arrange
      const barcode = '123456789';
      mockCollection.deleteOne = jest.fn().mockResolvedValue({ acknowledged: true, deletedCount: 1 });

      // Act
      await repository.invalidate(barcode);

      // Assert
      expect(mockCollection.deleteOne).toHaveBeenCalledWith({ barcode });
    });

    it('should handle invalidating non-existent barcode gracefully', async () => {
      // Arrange
      mockCollection.deleteOne = jest.fn().mockResolvedValue({ acknowledged: true, deletedCount: 0 });

      // Act & Assert - should not throw
      await expect(
        repository.invalidate('nonexistent')
      ).resolves.not.toThrow();
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockCollection.deleteOne = jest.fn().mockRejectedValue(new Error('Database error'));

      // Act & Assert - should not throw
      await expect(
        repository.invalidate('123456789')
      ).resolves.not.toThrow();
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error invalidating cached insight:',
        expect.any(Error)
      );
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', async () => {
      // Arrange
      const mockStats = [
        { barcode: '111111111', productName: 'Product 1', scanCount: 3 },
        { barcode: '222222222', productName: 'Product 2', scanCount: 2 },
        { barcode: '333333333', productName: 'Product 3', scanCount: 1 }
      ];
      
      mockCollection.countDocuments = jest.fn().mockResolvedValue(3);
      mockCollection.find = jest.fn(() => ({
        sort: jest.fn(() => ({
          limit: jest.fn(() => ({
            project: jest.fn(() => ({
              toArray: jest.fn().mockResolvedValue(mockStats)
            }))
          }))
        }))
      }));

      // Act
      const stats = await repository.getStats();

      // Assert
      expect(stats.totalEntries).toBe(3);
      expect(stats.mostScanned).toHaveLength(3);
      expect(stats.mostScanned[0].barcode).toBe('111111111');
      expect(stats.mostScanned[0].scanCount).toBe(3);
      expect(stats.mostScanned[1].barcode).toBe('222222222');
      expect(stats.mostScanned[1].scanCount).toBe(2);
      expect(stats.mostScanned[2].barcode).toBe('333333333');
      expect(stats.mostScanned[2].scanCount).toBe(1);
    });

    it('should return empty stats for empty cache', async () => {
      // Arrange
      mockCollection.countDocuments = jest.fn().mockResolvedValue(0);
      mockCollection.find = jest.fn(() => ({
        sort: jest.fn(() => ({
          limit: jest.fn(() => ({
            project: jest.fn(() => ({
              toArray: jest.fn().mockResolvedValue([])
            }))
          }))
        }))
      }));

      // Act
      const stats = await repository.getStats();

      // Assert
      expect(stats.totalEntries).toBe(0);
      expect(stats.mostScanned).toHaveLength(0);
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockCollection.countDocuments = jest.fn().mockRejectedValue(new Error('Database error'));

      // Act
      const stats = await repository.getStats();

      // Assert
      expect(stats.totalEntries).toBe(0);
      expect(stats.mostScanned).toHaveLength(0);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error getting cache stats:',
        expect.any(Error)
      );
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('error handling', () => {
    it('should handle MongoDB unavailable gracefully on get', async () => {
      // Arrange
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockCollection.findOne = jest.fn().mockRejectedValue(new Error('Connection refused'));

      // Act
      const result = await repository.get('123456789');

      // Assert
      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error getting cached insight:',
        expect.any(Error)
      );
      
      consoleErrorSpy.mockRestore();
    });

    it('should handle MongoDB unavailable gracefully on set', async () => {
      // Arrange
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockCollection.updateOne = jest.fn().mockRejectedValue(new Error('Connection refused'));

      // Act & Assert - should not throw
      await expect(
        repository.set('123456789', 'Organic Milk', sampleInsights)
      ).resolves.not.toThrow();
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error setting cached insight:',
        expect.any(Error)
      );
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('cache-first behavior', () => {
    it('should support cache hit scenario', async () => {
      // Arrange - simulate a product being cached
      const barcode = '123456789';
      const productName = 'Organic Milk';
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const mockInsight = {
        barcode,
        productName,
        insights: sampleInsights,
        createdAt: now,
        expiresAt,
        scanCount: 0
      };

      mockCollection.findOne = jest.fn().mockResolvedValue(mockInsight);
      mockCollection.updateOne = jest.fn().mockResolvedValue({ acknowledged: true });

      // Act - simulate a scan (cache hit)
      const cachedInsight = await repository.get(barcode);
      
      if (cachedInsight) {
        await repository.incrementScanCount(barcode);
      }

      // Assert
      expect(cachedInsight).not.toBeNull();
      expect(cachedInsight?.productName).toBe(productName);
      expect(mockCollection.updateOne).toHaveBeenCalledWith(
        { barcode },
        { $inc: { scanCount: 1 } }
      );
    });

    it('should support cache miss scenario', async () => {
      // Arrange
      const barcode = '999999999';
      mockCollection.findOne = jest.fn().mockResolvedValue(null);
      mockCollection.updateOne = jest.fn().mockResolvedValue({ acknowledged: true });

      // Act - simulate a scan (cache miss)
      const cachedInsight = await repository.get(barcode);

      // Assert
      expect(cachedInsight).toBeNull();
      
      // In real scenario, this would trigger Research Agent
      // and then save the result:
      await repository.set(barcode, 'New Product', sampleInsights);
      
      // Verify set was called
      expect(mockCollection.updateOne).toHaveBeenCalledWith(
        { barcode },
        expect.objectContaining({
          $set: expect.objectContaining({
            barcode,
            productName: 'New Product',
            insights: sampleInsights
          })
        }),
        { upsert: true }
      );
    });
  });

  describe('index creation', () => {
    it('should create required indexes', async () => {
      // Arrange
      mockCollection.createIndex = jest.fn().mockResolvedValue('index_created');

      // Act - trigger index creation by calling get
      await repository.get('test');

      // Assert - verify indexes were created
      expect(mockCollection.createIndex).toHaveBeenCalledWith(
        { barcode: 1 },
        { unique: true, name: 'barcode_unique' }
      );
      expect(mockCollection.createIndex).toHaveBeenCalledWith(
        { expiresAt: 1 },
        { expireAfterSeconds: 0, name: 'expiresAt_ttl' }
      );
      expect(mockCollection.createIndex).toHaveBeenCalledWith(
        { createdAt: -1 },
        { name: 'createdAt_desc' }
      );
    });

    it('should handle index creation errors gracefully', async () => {
      // Arrange
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockCollection.createIndex = jest.fn()
        .mockRejectedValueOnce(new Error('Index creation failed'))
        .mockResolvedValue('index_created');

      // Act - should not throw
      await expect(repository.get('test')).resolves.not.toThrow();

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error creating indexes:',
        expect.any(Error)
      );
      
      consoleErrorSpy.mockRestore();
    });

    it('should ignore "already exists" errors', async () => {
      // Arrange
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const alreadyExistsError = new Error('Index already exists');
      mockCollection.createIndex = jest.fn().mockRejectedValue(alreadyExistsError);

      // Act - should not throw
      await expect(repository.get('test')).resolves.not.toThrow();

      // Assert - should not log error for "already exists"
      expect(consoleErrorSpy).not.toHaveBeenCalled();
      
      consoleErrorSpy.mockRestore();
    });
  });
});
