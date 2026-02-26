/**
 * Seed Test Product Script
 * 
 * This script adds a test product to the database so you can test
 * the Tier 1 success path without hitting Gemini API rate limits.
 * 
 * Usage: npx tsx scripts/seed-test-product.ts
 */

import { getSupabaseServerClient } from '../src/lib/supabase/server-client';

async function seedTestProduct() {
  console.log('🌱 Seeding test product...');
  
  const supabase = getSupabaseServerClient();
  
  // Test product data (based on the Banana Bread product you've been testing)
  const testProduct = {
    barcode: '0044000034207',
    name: 'Banana Bread Biscuits',
    brand: 'belVita',
    size: '5-1.76 OZ (50g) PACKS NET WT 8.8 OZ (250g)',
    category: 'Bakery',
    metadata: {
      keywords: ['banana', 'bread', 'biscuits', 'breakfast', 'belvita'],
      visualCharacteristics: {
        colors: ['yellow', 'brown'],
        packaging: 'box',
        shape: 'rectangular'
      }
    },
    flagged_for_review: false
  };
  
  const { data, error } = await supabase
    .from('products')
    .insert(testProduct as any)
    .select()
    .single();
  
  if (error) {
    console.error('❌ Error seeding product:', error);
    process.exit(1);
  }
  
  console.log('✅ Test product seeded successfully!');
  console.log('Product ID:', (data as any).id);
  console.log('Barcode:', (data as any).barcode);
  console.log('Name:', (data as any).name);
  console.log('\n📝 Now you can test scanning barcode 0044000034207');
  console.log('   It should succeed at Tier 1 (cache/database lookup)');
}

seedTestProduct().catch(console.error);
