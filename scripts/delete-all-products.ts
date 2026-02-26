#!/usr/bin/env tsx

/**
 * Delete ALL products and related records (for testing)
 * Usage: npx tsx scripts/delete-all-products.ts
 * 
 * WARNING: This will delete ALL products, scan logs, and error reports!
 */

import { createClient } from '@supabase/supabase-js';
import { MongoClient } from 'mongodb';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MONGODB_URI = process.env.MONGODB_URI;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

if (!MONGODB_URI) {
  console.error('❌ Missing MONGODB_URI environment variable');
  process.exit(1);
}

async function deleteAllProducts() {
  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);
  const mongoClient = new MongoClient(MONGODB_URI!);

  try {
    // Get count of products
    const { count: productCount } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true });

    const { count: scanLogCount } = await supabase
      .from('scan_logs')
      .select('*', { count: 'exact', head: true });

    const { count: errorReportCount } = await supabase
      .from('error_reports')
      .select('*', { count: 'exact', head: true });

    console.log('⚠️  WARNING: This will delete:');
    console.log(`   ${productCount || 0} product(s)`);
    console.log(`   ${scanLogCount || 0} scan log(s)`);
    console.log(`   ${errorReportCount || 0} error report(s)`);
    console.log(`   All MongoDB cache entries`);
    console.log('');

    // In a real script, you'd want to prompt for confirmation
    // For now, we'll just proceed

    // Delete scan logs
    const { error: scanLogsError } = await supabase
      .from('scan_logs')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (scanLogsError) {
      console.error('❌ Error deleting scan logs:', scanLogsError);
    } else {
      console.log(`✅ Deleted ${scanLogCount || 0} scan log(s)`);
    }

    // Delete error reports
    const { error: errorReportsError } = await supabase
      .from('error_reports')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (errorReportsError) {
      console.error('❌ Error deleting error reports:', errorReportsError);
    } else {
      console.log(`✅ Deleted ${errorReportCount || 0} error report(s)`);
    }

    // Delete products
    const { error: productsError } = await supabase
      .from('products')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (productsError) {
      console.error('❌ Error deleting products:', productsError);
      process.exit(1);
    } else {
      console.log(`✅ Deleted ${productCount || 0} product(s)`);
    }

    // Clear MongoDB cache
    await mongoClient.connect();
    const db = mongoClient.db();
    const cacheResult = await db.collection('cache_entries').deleteMany({});
    console.log(`✅ Cleared ${cacheResult.deletedCount} cache entries from MongoDB`);

    console.log('');
    console.log('🎉 All data deleted successfully');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  } finally {
    await mongoClient.close();
  }
}

deleteAllProducts();
