#!/usr/bin/env tsx

/**
 * Clear MongoDB cache to test all tiers
 * Usage: npx tsx scripts/clear-cache.ts
 */

import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable is not set');
  process.exit(1);
}

async function clearCache() {
  const client = new MongoClient(MONGODB_URI!);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db();
    const result = await db.collection('cache_entries').deleteMany({});
    
    console.log(`🗑️  Cleared ${result.deletedCount} cache entries`);
    console.log('✅ Cache cleared successfully');
    
  } catch (error) {
    console.error('❌ Error clearing cache:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

clearCache();
