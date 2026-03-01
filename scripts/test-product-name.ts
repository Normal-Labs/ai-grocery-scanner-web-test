/**
 * Test script to verify product name extraction
 * 
 * Usage: npx tsx scripts/test-product-name.ts
 */

import { IngredientList } from '../src/lib/services/ingredient-parser';

// Mock ingredient lists for testing
const testCases: Array<{ name: string; ingredientList: IngredientList; expected: string }> = [
  {
    name: 'Case 1: INGREDIENTS prefix with actual ingredient (should strip prefix from tokenization)',
    ingredientList: {
      rawText: 'INGREDIENTS: Whole Wheat Flour, Sugar, Salt',
      ingredients: [
        { name: 'Whole Wheat Flour', position: 1, isAllergen: true, allergenType: 'wheat' as any, isPreservative: false, isSweetener: false, isArtificialColor: false },
        { name: 'Sugar', position: 2, isAllergen: false, isPreservative: false, isSweetener: false, isArtificialColor: false },
        { name: 'Salt', position: 3, isAllergen: false, isPreservative: false, isSweetener: false, isArtificialColor: false },
      ],
      allergens: [],
      preservatives: [],
      sweeteners: [],
      artificialColors: [],
      isComplete: true,
      confidence: 0.95,
    },
    expected: 'Whole Wheat Flour & Sugar Product',
  },
  {
    name: 'Case 2: Multiple ingredients without INGREDIENTS prefix',
    ingredientList: {
      rawText: 'Oats, Honey, Almonds, Cinnamon',
      ingredients: [
        { name: 'Oats', position: 1, isAllergen: false, isPreservative: false, isSweetener: false, isArtificialColor: false },
        { name: 'Honey', position: 2, isAllergen: false, isPreservative: false, isSweetener: false, isArtificialColor: false },
        { name: 'Almonds', position: 3, isAllergen: true, allergenType: 'tree_nuts' as any, isPreservative: false, isSweetener: false, isArtificialColor: false },
      ],
      allergens: [],
      preservatives: [],
      sweeteners: [],
      artificialColors: [],
      isComplete: true,
      confidence: 0.95,
    },
    expected: 'Oats & Honey Product',
  },
  {
    name: 'Case 3: Single ingredient',
    ingredientList: {
      rawText: 'Organic Quinoa',
      ingredients: [
        { name: 'Organic Quinoa', position: 1, isAllergen: false, isPreservative: false, isSweetener: false, isArtificialColor: false },
      ],
      allergens: [],
      preservatives: [],
      sweeteners: [],
      artificialColors: [],
      isComplete: true,
      confidence: 0.95,
    },
    expected: 'Organic Quinoa Product',
  },
  {
    name: 'Case 4: INGREDIENTS prefix with Fig Paste (real example)',
    ingredientList: {
      rawText: 'INGREDIENTS: Whole Wheat Flour, Fig Paste, Sugar',
      ingredients: [
        { name: 'Whole Wheat Flour', position: 1, isAllergen: true, allergenType: 'wheat' as any, isPreservative: false, isSweetener: false, isArtificialColor: false },
        { name: 'Fig Paste', position: 2, isAllergen: false, isPreservative: false, isSweetener: false, isArtificialColor: false },
        { name: 'Sugar', position: 3, isAllergen: false, isPreservative: false, isSweetener: false, isArtificialColor: false },
      ],
      allergens: [],
      preservatives: [],
      sweeteners: [],
      artificialColors: [],
      isComplete: true,
      confidence: 0.95,
    },
    expected: 'Whole Wheat Flour & Fig Paste Product',
  },
];

// Helper function to extract product name (copied from NutritionOrchestrator)
function extractProductName(ingredients: IngredientList): string | undefined {
  const rawText = ingredients.rawText;
  
  // Pattern 1: "INGREDIENTS: [product name]" - extract product name before ingredient list
  const ingredientsMatch = rawText.match(/^INGREDIENTS:\s*([^,;.]+)/i);
  if (ingredientsMatch) {
    const extracted = ingredientsMatch[1].trim();
    // If it looks like an actual ingredient (lowercase, common ingredient words), skip it
    const commonIngredients = /^(whole|wheat|flour|sugar|salt|water|milk|eggs|butter|oil)/i;
    if (!commonIngredients.test(extracted)) {
      return capitalizeProductName(extracted);
    }
  }
  
  // Pattern 2: If we have multiple ingredients, create a descriptive name from first 2-3 ingredients
  if (ingredients.ingredients.length >= 2) {
    const firstTwo = ingredients.ingredients.slice(0, 2).map(i => i.name);
    const descriptiveName = firstTwo.join(' & ');
    return capitalizeProductName(descriptiveName) + ' Product';
  }
  
  // Pattern 3: Single ingredient - use it as base
  if (ingredients.ingredients.length === 1) {
    const ingredient = ingredients.ingredients[0].name;
    return capitalizeProductName(ingredient) + ' Product';
  }
  
  return undefined;
}

function capitalizeProductName(name: string): string {
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

// Run tests
console.log('🧪 Testing Product Name Extraction\n');

let passed = 0;
let failed = 0;

for (const testCase of testCases) {
  const result = extractProductName(testCase.ingredientList) || 'Unknown Product';
  const success = result === testCase.expected;
  
  console.log(`${success ? '✅' : '❌'} ${testCase.name}`);
  console.log(`   Input: "${testCase.ingredientList.rawText}"`);
  console.log(`   Expected: "${testCase.expected}"`);
  console.log(`   Got: "${result}"`);
  console.log();
  
  if (success) {
    passed++;
  } else {
    failed++;
  }
}

console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);

if (failed === 0) {
  console.log('✅ All tests passed!');
} else {
  console.log('❌ Some tests failed');
  process.exit(1);
}
