#!/usr/bin/env tsx

/**
 * Delete a product and all related records
 * Usage: npx tsx scripts/delete-product.ts <product-id>
 * Example: npx tsx scripts/delete-product.ts 4899bd1b-bc76-45ab-b3ed-7bd4c9d32411
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const productId = process.argv[2];

if (!productId) {
  console.error('Usage: npx tsx scripts/delete-product.ts <product-id>');
  console.error('Example: npx tsx scripts/delete-product.ts 4899bd1b-bc76-45ab-b3ed-7bd4c9d32411');
  process.exit(1);
}

async function deleteProduct() {
  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);

  try {
    // Get product info first
    const { data: product, error: fetchError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (fetchError || !product) {
      console.error('❌ Product not found:', productId);
      process.exit(1);
    }

    console.log('📦 Product to delete:');
    console.log(`   Name: ${product.name}`);
    console.log(`   Brand: ${product.brand}`);
    console.log(`   Barcode: ${product.barcode || 'N/A'}`);
    console.log('');

    // Delete scan logs
    const { data: scanLogs, error: scanLogsError } = await supabase
      .from('scan_logs')
      .delete()
      .eq('product_id', productId)
      .select();

    if (scanLogsError) {
      console.error('❌ Error deleting scan logs:', scanLogsError);
    } else {
      console.log(`🗑️  Deleted ${scanLogs?.length || 0} scan log(s)`);
    }

    // Delete error reports
    const { data: errorReports, error: errorReportsError } = await supabase
      .from('error_reports')
      .delete()
      .eq('product_id', productId)
      .select();

    if (errorReportsError) {
      console.error('❌ Error deleting error reports:', errorReportsError);
    } else {
      console.log(`🗑️  Deleted ${errorReports?.length || 0} error report(s)`);
    }

    // Delete product
    const { error: deleteError } = await supabase
      .from('products')
      .delete()
      .eq('id', productId);

    if (deleteError) {
      console.error('❌ Error deleting product:', deleteError);
      process.exit(1);
    }

    console.log('✅ Product deleted successfully');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

deleteProduct();
