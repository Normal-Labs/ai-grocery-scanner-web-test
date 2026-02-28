/**
 * MongoDB Initialization Script
 * 
 * This script creates collections and indexes for the multi-tier product identification system.
 * Run this once to set up the MongoDB schema.
 * 
 * Requirements: 7.1, 7.2, 7.5
 */

import { getMongoClient } from './client';

/**
 * Initialize MongoDB collections and indexes
 * Creates cache_entries collection with required indexes
 */
export async function initializeMongoDB(): Promise<void> {
  const db = await getMongoClient();

  console.log('Initializing MongoDB collections and indexes...');

  // Create cache_entries collection if it doesn't exist
  const collections = await db.listCollections({ name: 'cache_entries' }).toArray();
  if (collections.length === 0) {
    await db.createCollection('cache_entries');
    console.log('✓ Created cache_entries collection');
  } else {
    console.log('✓ cache_entries collection already exists');
  }

  const cacheCollection = db.collection('cache_entries');

  // Create unique compound index on (key, keyType)
  // Requirement 7.1, 7.2: Index by barcode and image hash
  await cacheCollection.createIndex(
    { key: 1, keyType: 1 },
    { unique: true, name: 'idx_key_keyType' }
  );
  console.log('✓ Created unique index on (key, keyType)');

  // Create TTL index on expiresAt for automatic expiration
  // Requirement 7.5: Expire entries not accessed for 90 days
  await cacheCollection.createIndex(
    { expiresAt: 1 },
    { expireAfterSeconds: 0, name: 'idx_expiresAt_ttl' }
  );
  console.log('✓ Created TTL index on expiresAt');

  // Create index on lastAccessedAt for cache management queries
  // Requirement 7.4: Track last accessed timestamp
  await cacheCollection.createIndex(
    { lastAccessedAt: 1 },
    { name: 'idx_lastAccessedAt' }
  );
  console.log('✓ Created index on lastAccessedAt');

  console.log('MongoDB initialization complete!');
}

/**
 * Drop all collections (for testing/reset purposes)
 * WARNING: This will delete all data!
 */
export async function dropAllCollections(): Promise<void> {
  const db = await getMongoClient();

  console.log('Dropping all collections...');

  const collections = await db.listCollections().toArray();
  for (const collection of collections) {
    await db.collection(collection.name).drop();
    console.log(`✓ Dropped collection: ${collection.name}`);
  }

  console.log('All collections dropped!');
}

// Run initialization if this file is executed directly
if (require.main === module) {
  initializeMongoDB()
    .then(() => {
      console.log('Initialization successful');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Initialization failed:', error);
      process.exit(1);
    });
}
