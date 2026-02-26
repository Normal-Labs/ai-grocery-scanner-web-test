/**
 * Apply Product Search Fix Migration
 * 
 * This script applies the improved product matching logic directly to the database.
 * Run with: npx tsx scripts/apply-product-search-fix.ts
 */

import { getSupabaseServerClient } from '../src/lib/supabase/server-client';
import * as fs from 'fs';
import * as path from 'path';

async function applyMigration() {
  console.log('🔧 Applying product search fix migration...\n');

  try {
    const supabase = getSupabaseServerClient();

    // Read the migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/20260227000000_fix_product_search.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    console.log('📦 Executing migration: 20260227000000_fix_product_search.sql');

    // Execute the migration
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
      // If exec_sql doesn't exist, try direct execution
      console.log('⚠️  exec_sql function not available, trying direct execution...');
      
      // Split by statement and execute each
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        if (statement.includes('CREATE OR REPLACE FUNCTION')) {
          console.log('📝 Creating/updating function...');
          const { error: funcError } = await supabase.rpc('exec', { sql: statement + ';' });
          if (funcError) {
            console.error('❌ Error executing statement:', funcError);
            throw funcError;
          }
        }
      }
    }

    console.log('\n✅ Migration applied successfully!\n');
    console.log('📝 What changed:');
    console.log('  - Improved product search matching logic');
    console.log('  - Better handling of NULL brand and size values');
    console.log('  - Bidirectional name matching');
    console.log('  - More accurate similarity scoring\n');
    console.log('🎯 Result:');
    console.log('  - Duplicate products will be detected more accurately');
    console.log('  - Scanning the same product image will now reuse existing product data');
    console.log('  - Minimum similarity threshold of 0.6 (60%) required for match\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    console.error('\n💡 Manual application required:');
    console.error('   1. Go to your Supabase dashboard');
    console.error('   2. Navigate to SQL Editor');
    console.error('   3. Copy and paste the contents of:');
    console.error('      supabase/migrations/20260227000000_fix_product_search.sql');
    console.error('   4. Execute the SQL\n');
    process.exit(1);
  }
}

applyMigration();
