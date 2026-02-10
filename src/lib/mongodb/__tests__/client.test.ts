/**
 * Unit tests for MongoDB client singleton
 * 
 * Tests verify:
 * - Singleton behavior (multiple calls return same instance)
 * - Environment variable configuration
 * - Connection error handling
 * - Helper functions (ping, close, reset)
 * 
 * Requirements: 5.1
 */

import { MongoClient } from 'mongodb';
import {
  getMongoClient,
  closeMongoClient,
  resetMongoClient,
  isMongoConnected,
  pingMongo,
} from '../client';

// Mock MongoDB client
let mockDb: any;
let mockClient: any;

jest.mock('mongodb', () => {
  return {
    MongoClient: jest.fn().mockImplementation(() => {
      mockDb = {
        collection: jest.fn(),
        admin: jest.fn(() => ({
          ping: jest.fn().mockResolvedValue({}),
        })),
      };

      mockClient = {
        connect: jest.fn().mockResolvedValue(undefined),
        close: jest.fn().mockResolvedValue(undefined),
        db: jest.fn(() => mockDb),
      };

      return mockClient;
    }),
  };
});

describe('MongoDB Client Singleton', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment and singleton before each test
    jest.clearAllMocks();
    resetMongoClient();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('getMongoClient', () => {
    it('should throw error if MONGODB_URI is not set', async () => {
      // Remove MONGODB_URI from environment
      delete process.env.MONGODB_URI;

      await expect(getMongoClient()).rejects.toThrow(
        'Missing MONGODB_URI environment variable'
      );
    });

    it('should create MongoDB client with correct configuration', async () => {
      process.env.MONGODB_URI = 'mongodb://localhost:27017/test_db';

      await getMongoClient();

      expect(MongoClient).toHaveBeenCalledWith(
        'mongodb://localhost:27017/test_db',
        expect.objectContaining({
          maxPoolSize: 10,
          minPoolSize: 2,
          serverSelectionTimeoutMS: 5000,
          socketTimeoutMS: 45000,
          retryWrites: true,
          retryReads: true,
        })
      );
    });

    it('should return same instance on multiple calls (singleton)', async () => {
      process.env.MONGODB_URI = 'mongodb://localhost:27017/test_db';

      const db1 = await getMongoClient();
      const db2 = await getMongoClient();

      expect(db1).toBe(db2);
      expect(MongoClient).toHaveBeenCalledTimes(1);
    });

    it('should extract database name from URI', async () => {
      process.env.MONGODB_URI = 'mongodb://localhost:27017/my_custom_db';

      const db = await getMongoClient();

      // Verify db() was called with extracted database name
      const mockClient = (MongoClient as jest.MockedClass<typeof MongoClient>).mock.results[0].value;
      expect(mockClient.db).toHaveBeenCalledWith('my_custom_db');
    });

    it('should use default database name if not in URI', async () => {
      process.env.MONGODB_URI = 'mongodb://localhost:27017';

      await getMongoClient();

      // Verify db() was called with default database name
      expect(mockClient.db).toHaveBeenCalledWith('ai_grocery_scanner');
    });

    it('should handle connection errors gracefully', async () => {
      process.env.MONGODB_URI = 'mongodb://localhost:27017/test_db';

      // Reset and create a new mock that fails
      resetMongoClient();
      jest.clearAllMocks();
      
      // Mock connection failure for next call
      (MongoClient as jest.MockedClass<typeof MongoClient>).mockImplementationOnce(() => {
        const failingClient: any = {
          connect: jest.fn().mockRejectedValue(new Error('Connection refused')),
          close: jest.fn(),
          db: jest.fn(),
        };
        return failingClient;
      });

      await expect(getMongoClient()).rejects.toThrow(
        'MongoDB connection failed: Connection refused'
      );

      // Verify singleton was reset on error
      expect(isMongoConnected()).toBe(false);
    });

    it('should handle non-Error connection failures', async () => {
      process.env.MONGODB_URI = 'mongodb://localhost:27017/test_db';

      // Reset and create a new mock that fails
      resetMongoClient();
      jest.clearAllMocks();

      // Mock connection failure with non-Error object
      (MongoClient as jest.MockedClass<typeof MongoClient>).mockImplementationOnce(() => {
        const failingClient: any = {
          connect: jest.fn().mockRejectedValue('Unknown error'),
          close: jest.fn(),
          db: jest.fn(),
        };
        return failingClient;
      });

      await expect(getMongoClient()).rejects.toThrow(
        'MongoDB connection failed. Please check your MONGODB_URI'
      );
    });

    it('should log successful connection', async () => {
      process.env.MONGODB_URI = 'mongodb://localhost:27017/test_db';
      resetMongoClient();
      jest.clearAllMocks();
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await getMongoClient();

      expect(consoleSpy).toHaveBeenCalledWith('MongoDB client connected successfully');
      consoleSpy.mockRestore();
    });
  });

  describe('closeMongoClient', () => {
    beforeEach(() => {
      resetMongoClient();
      jest.clearAllMocks();
    });

    it('should close MongoDB connection', async () => {
      process.env.MONGODB_URI = 'mongodb://localhost:27017/test_db';

      await getMongoClient();

      await closeMongoClient();

      expect(mockClient.close).toHaveBeenCalled();
      expect(isMongoConnected()).toBe(false);
    });

    it('should handle close errors gracefully', async () => {
      process.env.MONGODB_URI = 'mongodb://localhost:27017/test_db';

      await getMongoClient();
      mockClient.close = jest.fn().mockRejectedValue(new Error('Close failed'));

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await closeMongoClient();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error closing MongoDB client:',
        expect.any(Error)
      );
      expect(isMongoConnected()).toBe(false);

      consoleErrorSpy.mockRestore();
    });

    it('should do nothing if client is not connected', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await closeMongoClient();

      expect(consoleSpy).not.toHaveBeenCalledWith('MongoDB client closed successfully');
      consoleSpy.mockRestore();
    });

    it('should log successful close', async () => {
      process.env.MONGODB_URI = 'mongodb://localhost:27017/test_db';

      await getMongoClient();
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await closeMongoClient();

      expect(consoleSpy).toHaveBeenCalledWith('MongoDB client closed successfully');
      consoleSpy.mockRestore();
    });
  });

  describe('isMongoConnected', () => {
    beforeEach(() => {
      resetMongoClient();
      jest.clearAllMocks();
    });

    it('should return false when not connected', () => {
      expect(isMongoConnected()).toBe(false);
    });

    it('should return true when connected', async () => {
      process.env.MONGODB_URI = 'mongodb://localhost:27017/test_db';

      await getMongoClient();

      expect(isMongoConnected()).toBe(true);
    });

    it('should return false after close', async () => {
      process.env.MONGODB_URI = 'mongodb://localhost:27017/test_db';

      await getMongoClient();
      await closeMongoClient();

      expect(isMongoConnected()).toBe(false);
    });
  });

  describe('pingMongo', () => {
    beforeEach(() => {
      resetMongoClient();
      jest.clearAllMocks();
    });

    it('should return true when ping succeeds', async () => {
      process.env.MONGODB_URI = 'mongodb://localhost:27017/test_db';

      await getMongoClient();
      const result = await pingMongo();

      expect(result).toBe(true);
    });

    it('should return false when ping fails', async () => {
      process.env.MONGODB_URI = 'mongodb://localhost:27017/test_db';

      await getMongoClient();
      
      // Mock ping failure
      mockDb.admin = jest.fn(() => ({
        ping: jest.fn().mockRejectedValue(new Error('Ping failed')),
      }));

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const result = await pingMongo();

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'MongoDB ping failed:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it('should return false when not connected', async () => {
      delete process.env.MONGODB_URI;

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const result = await pingMongo();

      expect(result).toBe(false);
      consoleErrorSpy.mockRestore();
    });
  });

  describe('resetMongoClient', () => {
    beforeEach(() => {
      resetMongoClient();
      jest.clearAllMocks();
    });

    it('should reset singleton state', async () => {
      process.env.MONGODB_URI = 'mongodb://localhost:27017/test_db';

      await getMongoClient();
      expect(isMongoConnected()).toBe(true);

      resetMongoClient();
      expect(isMongoConnected()).toBe(false);
    });

    it('should allow new connection after reset', async () => {
      process.env.MONGODB_URI = 'mongodb://localhost:27017/test_db';

      await getMongoClient();
      resetMongoClient();
      await getMongoClient();

      expect(MongoClient).toHaveBeenCalledTimes(2);
    });
  });

  describe('Database name extraction', () => {
    beforeEach(() => {
      resetMongoClient();
      jest.clearAllMocks();
    });

    it('should handle MongoDB Atlas URI format', async () => {
      process.env.MONGODB_URI = 
        'mongodb+srv://user:pass@cluster.mongodb.net/production_db?retryWrites=true';

      await getMongoClient();

      expect(mockClient.db).toHaveBeenCalledWith('production_db');
    });

    it('should handle URI with query parameters', async () => {
      process.env.MONGODB_URI = 
        'mongodb://localhost:27017/my_db?authSource=admin';

      await getMongoClient();

      expect(mockClient.db).toHaveBeenCalledWith('my_db');
    });

    it('should handle URI without database name', async () => {
      process.env.MONGODB_URI = 'mongodb://localhost:27017/?authSource=admin';

      await getMongoClient();

      expect(mockClient.db).toHaveBeenCalledWith('ai_grocery_scanner');
    });
  });
});
