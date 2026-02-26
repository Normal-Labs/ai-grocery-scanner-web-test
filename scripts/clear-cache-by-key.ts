#!/usr/bin/env tsx

/**
 * Clear specific cache entry by barcode or image hash
 * Usage: 
 *   npx tsx scripts/clear-cache-by-key.ts barcode 0044000034207
 *   npx tsx scripts/clear-cache-by-key.ts imageHash abc123...
 */

import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable is not set');
  process.exit(1);
}

const keyType = process.argv[2]; // 'barcode' or 'imageHash'
const keyValue = process.argv[3];

if (!keyType || !keyValue) {
  console.error('Usage: npx tsx scripts/clear-cache-by-key.ts <barcode|imageHash> <value>');
  console.error('Example: npx tsx scripts/clear-cache-by-key.ts barcode 0044000034207');
  process.exit(1);
}

if (keyType !== 'barcode' && keyType !== 'imageHash') {
  console.error('❌ Key type must be "barcode" or "imageHash"');
  process.exit(1);
}

async function clearCacheByKey() {
  const client = new MongoClient(MONGODB_URI!);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db();
    const result = await db.collection('cache_entries').deleteMany({
      key: keyValue,
      keyType: keyType
    });
    
    console.log(`🗑️  Cleared ${result.deletedCount} cache entries for ${keyType}: ${keyValue}`);
    
    if (result.deletedCount === 0) {
      console.log('ℹ️  No cache entries found for this key');
    } else {
      console.log('✅ Cache cleared successfully');
    }
    
  } catch (error) {
    console.error('❌ Error clearing cache:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

clearCacheByKey();
