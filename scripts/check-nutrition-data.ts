/**
 * Check Nutrition Data in Supabase
 * 
 * This script queries Supabase to check if nutrition data is being saved correctly.
 * 
 * Usage: npx tsx scripts/check-nutrition-data.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkNutritionData() {
  console.log('🔍 Checking nutrition data in Supabase...\n');
  
  try {
    // Get all products
    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) {
      console.error('❌ Error fetching products:', error);
      return;
    }
    
    if (!products || products.length === 0) {
      console.log('📭 No products found in database');
      return;
    }
    
    console.log(`📦 Found ${products.length} recent products:\n`);
    
    products.forEach((product: any, index: number) => {
      console.log(`${index + 1}. ${product.name} (${product.brand || 'Unknown Brand'})`);
      console.log(`   ID: ${product.id}`);
      console.log(`   Created: ${new Date(product.created_at).toLocaleString()}`);
      console.log(`   Updated: ${new Date(product.updated_at).toLocaleString()}`);
      console.log(`   Category: ${product.category || 'N/A'}`);
      console.log(`   Barcode: ${product.barcode || 'N/A'}`);
      
      // Check nutrition data
      if (product.nutrition_data) {
        console.log(`   ✅ HAS NUTRITION DATA:`);
        console.log(`      - Calories: ${product.nutrition_data.calories || 'N/A'}`);
        console.log(`      - Serving Size: ${product.nutrition_data.servingSize?.amount || 'N/A'} ${product.nutrition_data.servingSize?.unit || ''}`);
        console.log(`      - Macros: Fat ${product.nutrition_data.macros?.fat || 0}g, Carbs ${product.nutrition_data.macros?.carbs || 0}g, Protein ${product.nutrition_data.macros?.protein || 0}g`);
      } else {
        console.log(`   ❌ NO NUTRITION DATA`);
      }
      
      // Check health score
      if (product.health_score !== null && product.health_score !== undefined) {
        console.log(`   ✅ Health Score: ${product.health_score}`);
      } else {
        console.log(`   ❌ NO HEALTH SCORE`);
      }
      
      // Check allergens
      if (product.has_allergens) {
        console.log(`   ⚠️  Has Allergens: ${product.allergen_types?.join(', ') || 'Unknown'}`);
      } else {
        console.log(`   ✓ No Allergens`);
      }
      
      console.log('');
    });
    
    // Summary
    const withNutrition = products.filter((p: any) => p.nutrition_data).length;
    const withHealthScore = products.filter((p: any) => p.health_score !== null && p.health_score !== undefined).length;
    const withAllergens = products.filter((p: any) => p.has_allergens).length;
    
    console.log('📊 Summary:');
    console.log(`   Products with nutrition data: ${withNutrition}/${products.length}`);
    console.log(`   Products with health score: ${withHealthScore}/${products.length}`);
    console.log(`   Products with allergens: ${withAllergens}/${products.length}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkNutritionData();
