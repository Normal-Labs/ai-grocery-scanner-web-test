/**
 * Clear All MongoDB Caches Script
 * 
 * This script clears all cache collections in MongoDB for testing purposes:
 * - cache_entries (product identification cache)
 * - nutrition_cache (nutrition analysis cache)
 * - scan_history (scan history)
 * 
 * Usage:
 *   npx tsx scripts/clear-all-caches.ts
 * 
 * Options:
 *   --cache-entries    Clear only cache_entries collection
 *   --nutrition-cache  Clear only nutrition_cache collection
 *   --scan-history     Clear only scan_history collection
 *   --all              Clear all collections (default)
 */

import { getMongoClient } from '../src/lib/mongodb/client';

async function clearAllCaches() {
  console.log('🗑️  MongoDB Cache Clearing Script');
  console.log('═══════════════════════════════════════════════════');
  
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    const clearCacheEntries = args.includes('--cache-entries') || args.includes('--all') || args.length === 0;
    const clearNutritionCache = args.includes('--nutrition-cache') || args.includes('--all') || args.length === 0;
    const clearScanHistory = args.includes('--scan-history') || args.includes('--all') || args.length === 0;
    
    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    const db = await getMongoClient();
    console.log('✅ Connected to MongoDB');
    console.log('');
    
    let totalDeleted = 0;
    
    // Clear cache_entries collection
    if (clearCacheEntries) {
      console.log('🗑️  Clearing cache_entries collection...');
      const cacheEntriesCollection = db.collection('cache_entries');
      const cacheEntriesCount = await cacheEntriesCollection.countDocuments();
      
      if (cacheEntriesCount > 0) {
        const result = await cacheEntriesCollection.deleteMany({});
        console.log(`   ✅ Deleted ${result.deletedCount} cache entries`);
        totalDeleted += result.deletedCount;
      } else {
        console.log('   ℹ️  Collection is already empty');
      }
      console.log('');
    }
    
    // Clear nutrition_cache collection
    if (clearNutritionCache) {
      console.log('🗑️  Clearing nutrition_cache collection...');
      const nutritionCacheCollection = db.collection('nutrition_cache');
      const nutritionCacheCount = await nutritionCacheCollection.countDocuments();
      
      if (nutritionCacheCount > 0) {
        const result = await nutritionCacheCollection.deleteMany({});
        console.log(`   ✅ Deleted ${result.deletedCount} nutrition cache entries`);
        totalDeleted += result.deletedCount;
      } else {
        console.log('   ℹ️  Collection is already empty');
      }
      console.log('');
    }
    
    // Clear scan_history collection
    if (clearScanHistory) {
      console.log('🗑️  Clearing scan_history collection...');
      const scanHistoryCollection = db.collection('scan_history');
      const scanHistoryCount = await scanHistoryCollection.countDocuments();
      
      if (scanHistoryCount > 0) {
        const result = await scanHistoryCollection.deleteMany({});
        console.log(`   ✅ Deleted ${result.deletedCount} scan history entries`);
        totalDeleted += result.deletedCount;
      } else {
        console.log('   ℹ️  Collection is already empty');
      }
      console.log('');
    }
    
    console.log('═══════════════════════════════════════════════════');
    console.log(`✅ Cache clearing complete! Total deleted: ${totalDeleted}`);
    console.log('');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing caches:', error);
    process.exit(1);
  }
}

// Run the script
clearAllCaches();
