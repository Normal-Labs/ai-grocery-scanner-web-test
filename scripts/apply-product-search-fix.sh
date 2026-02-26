#!/bin/bash

# Apply the product search fix migration
# This script applies the improved product matching logic

echo "🔧 Applying product search fix migration..."
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

# Apply the migration
echo "📦 Applying migration: 20260227000000_fix_product_search.sql"
supabase db push

echo ""
echo "✅ Migration applied successfully!"
echo ""
echo "📝 What changed:"
echo "  - Improved product search matching logic"
echo "  - Better handling of NULL brand and size values"
echo "  - Bidirectional name matching (product name contains search OR search contains product name)"
echo "  - More accurate similarity scoring"
echo ""
echo "🎯 Result:"
echo "  - Duplicate products will be detected more accurately"
echo "  - Scanning the same product image will now reuse existing product data"
echo "  - Minimum similarity threshold of 0.6 (60%) required for match"
echo ""
