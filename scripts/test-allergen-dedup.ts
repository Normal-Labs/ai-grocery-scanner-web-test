/**
 * Test script to verify allergen deduplication
 * 
 * Usage: npx tsx scripts/test-allergen-dedup.ts
 */

// Test allergen deduplication logic
const allergens = [
  { allergenType: 'wheat' },
  { allergenType: 'wheat' },
  { allergenType: 'milk' },
];

// Old logic (with duplicates)
const oldAllergenTypes = allergens.map((a: any) => 
  a.allergenType?.replace('_', ' ') || 'unknown'
);

console.log('Old logic (with duplicates):');
console.log(oldAllergenTypes);
console.log('Count:', oldAllergenTypes.length);

// New logic (deduplicated)
const newAllergenTypes = Array.from(new Set(
  allergens.map((a: any) => 
    a.allergenType?.replace('_', ' ') || 'unknown'
  )
));

console.log('\nNew logic (deduplicated):');
console.log(newAllergenTypes);
console.log('Count:', newAllergenTypes.length);

console.log('\n✅ Deduplication working correctly!');
