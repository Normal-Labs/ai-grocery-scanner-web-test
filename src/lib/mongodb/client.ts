/**
 * MongoDB Client Singleton
 * 
 * This file provides a singleton instance of the MongoDB client configured
 * for connecting to MongoDB Atlas. The client handles connection management
 * and error handling gracefully.
 * 
 * Requirements: 5.1
 */

import { MongoClient, Db } from 'mongodb';

/**
 * Singleton instance of the MongoDB client
 * Ensures only one connection pool is maintained throughout the application
 */
let mongoClientInstance: MongoClient | null = null;
let mongoDbInstance: Db | null = null;

/**
 * Get or create the MongoDB client singleton
 * 
 * This function ensures only one instance of the MongoDB client exists
 * throughout the application lifecycle. It handles connection errors
 * gracefully and provides clear error messages.
 * 
 * Requirements:
 * - 5.1: Initialize client using MONGODB_URI environment variable
 * - 5.1: Handle connection errors gracefully
 * 
 * @returns Promise resolving to configured MongoDB database instance
 * @throws Error if MONGODB_URI is not set or connection fails
 * 
 * @example
 * ```typescript
 * // Get database instance
 * const db = await getMongoClient();
 * const insights = db.collection('insights');
 * const result = await insights.findOne({ barcode: '123456789' });
 * ```
 */
export async function getMongoClient(): Promise<Db> {
  // Return existing database instance if already connected (singleton pattern)
  if (mongoDbInstance) {
    return mongoDbInstance;
  }

  // Get MongoDB URI from environment variable
  const mongoUri = process.env.MONGODB_URI;

  // Validate environment variable
  if (!mongoUri) {
    throw new Error(
      'Missing MONGODB_URI environment variable. ' +
      'Please add it to your .env.local file.'
    );
  }

  try {
    // Create new MongoDB client if not exists
    if (!mongoClientInstance) {
      mongoClientInstance = new MongoClient(mongoUri, {
        // Connection pool settings for optimal performance
        maxPoolSize: 10,
        minPoolSize: 2,
        // Timeout settings
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        // Retry settings for transient failures
        retryWrites: true,
        retryReads: true,
        // TLS/SSL settings for serverless environments (Vercel, AWS Lambda, etc.)
        tls: true,
        tlsAllowInvalidCertificates: false,
        tlsAllowInvalidHostnames: false,
      });

      // Connect to MongoDB
      await mongoClientInstance.connect();
      console.log('MongoDB client connected successfully');
    }

    // Extract database name from URI or use default
    const dbName = extractDatabaseName(mongoUri) || 'ai_grocery_scanner';
    mongoDbInstance = mongoClientInstance.db(dbName);

    return mongoDbInstance;
  } catch (error) {
    // Handle connection errors gracefully
    console.error('Failed to connect to MongoDB:', error);
    
    // Reset instances on connection failure
    mongoClientInstance = null;
    mongoDbInstance = null;

    // Provide helpful error message
    if (error instanceof Error) {
      throw new Error(
        `MongoDB connection failed: ${error.message}. ` +
        'Please check your MONGODB_URI and network connection.'
      );
    }
    
    throw new Error(
      'MongoDB connection failed. ' +
      'Please check your MONGODB_URI and network connection.'
    );
  }
}

/**
 * Extract database name from MongoDB URI
 * 
 * Parses the MongoDB connection string to extract the database name.
 * Returns null if no database name is specified in the URI.
 * 
 * @param uri - MongoDB connection string
 * @returns Database name or null
 * 
 * @example
 * ```typescript
 * extractDatabaseName('mongodb://localhost:27017/mydb') // returns 'mydb'
 * extractDatabaseName('mongodb://localhost:27017') // returns null
 * ```
 */
function extractDatabaseName(uri: string): string | null {
  try {
    // Match database name in URI (after last / and before ?)
    // Handle both mongodb:// and mongodb+srv:// protocols
    const match = uri.match(/\/([^/?]+)(\?|$)/);
    if (!match || !match[1]) {
      return null;
    }
    
    const dbName = match[1];
    
    // Check if it's actually a database name and not a host/port
    // Database names shouldn't contain colons (which would indicate host:port)
    if (dbName.includes(':')) {
      return null;
    }
    
    return dbName;
  } catch {
    return null;
  }
}

/**
 * Close the MongoDB connection
 * 
 * Gracefully closes the MongoDB connection and resets the singleton instances.
 * This should be called when the application is shutting down.
 * 
 * @example
 * ```typescript
 * // On application shutdown
 * await closeMongoClient();
 * ```
 */
export async function closeMongoClient(): Promise<void> {
  if (mongoClientInstance) {
    try {
      await mongoClientInstance.close();
      console.log('MongoDB client closed successfully');
    } catch (error) {
      console.error('Error closing MongoDB client:', error);
    } finally {
      mongoClientInstance = null;
      mongoDbInstance = null;
    }
  }
}

/**
 * Reset the MongoDB client singleton
 * 
 * This function is primarily used for testing purposes to reset the singleton
 * state between tests. It should not be used in production code.
 * 
 * @internal
 */
export function resetMongoClient(): void {
  mongoClientInstance = null;
  mongoDbInstance = null;
}

/**
 * Check if MongoDB client is connected
 * 
 * Helper function to check if the MongoDB client is currently connected.
 * Useful for health checks and monitoring.
 * 
 * @returns True if connected, false otherwise
 * 
 * @example
 * ```typescript
 * if (isMongoConnected()) {
 *   console.log('MongoDB is connected');
 * } else {
 *   console.log('MongoDB is not connected');
 * }
 * ```
 */
export function isMongoConnected(): boolean {
  return mongoClientInstance !== null && mongoDbInstance !== null;
}

/**
 * Ping MongoDB to verify connection
 * 
 * Sends a ping command to MongoDB to verify the connection is alive.
 * Useful for health checks and connection validation.
 * 
 * @returns Promise resolving to true if ping succeeds, false otherwise
 * 
 * @example
 * ```typescript
 * const isHealthy = await pingMongo();
 * if (isHealthy) {
 *   console.log('MongoDB connection is healthy');
 * }
 * ```
 */
export async function pingMongo(): Promise<boolean> {
  try {
    const db = await getMongoClient();
    await db.admin().ping();
    return true;
  } catch (error) {
    console.error('MongoDB ping failed:', error);
    return false;
  }
}

// Export the client getter as default
export default getMongoClient;
