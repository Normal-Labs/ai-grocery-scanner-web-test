/**
 * Clear Product Cache Script
 * 
 * This script clears only the cache_entries collection (product identification cache)
 * in MongoDB for testing purposes.
 * 
 * Usage:
 *   npx tsx scripts/clear-product-cache.ts
 */

import { getMongoClient } from '../src/lib/mongodb/client';

async function clearProductCache() {
  console.log('🗑️  Product Cache Clearing Script');
  console.log('═══════════════════════════════════════════════════');
  
  try {
    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    const db = await getMongoClient();
    console.log('✅ Connected to MongoDB');
    console.log('');
    
    // Get cache_entries collection
    const collection = db.collection('cache_entries');
    
    // Count documents before deletion
    const countBefore = await collection.countDocuments();
    console.log(`📊 Found ${countBefore} cache entries`);
    
    if (countBefore === 0) {
      console.log('ℹ️  Cache is already empty, nothing to delete');
      console.log('');
      process.exit(0);
    }
    
    // Delete all documents
    console.log('🗑️  Deleting all cache entries...');
    const result = await collection.deleteMany({});
    
    console.log('');
    console.log('═══════════════════════════════════════════════════');
    console.log(`✅ Successfully deleted ${result.deletedCount} cache entries`);
    console.log('');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing cache:', error);
    process.exit(1);
  }
}

// Run the script
clearProductCache();
