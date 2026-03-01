# Nutrition Analysis Feature - Testing Guide

## Overview

This guide will help you test the complete Nutritional Health Analysis feature end-to-end.

## Prerequisites

1. **Dev server must be running:**
   ```bash
   npm run dev
   ```

2. **Environment variables set:**
   - `GEMINI_API_KEY` or `GOOGLE_GENERATIVE_AI_API_KEY`
   - Supabase credentials
   - MongoDB connection string

3. **Browser:**
   - Use Chrome, Firefox, or Safari
   - Recommended: Use incognito/private mode for clean testing

## Test Scenarios

### Scenario 1: Scan a Nutrition Label (Primary Flow)

**Steps:**
1. Open http://localhost:3000
2. Click the "Scan" button (bottom of page)
3. Take a photo of a nutrition label or upload an image
4. Wait for progress tracker to show steps:
   - ✅ Image classified as nutrition label
   - ✅ Checking for cached nutrition data...
   - ✅ Extracting text from nutrition label...
   - ✅ Parsing nutritional facts...
   - ✅ Analyzing ingredients and allergens...
   - ✅ Calculating health score...
   - ✅ Analysis complete!

**Expected Results:**

✅ **Health Score Display:**
- Large health score badge (0-100)
- Color-coded by category:
  - Green: Excellent (80-100) or Good (60-79)
  - Yellow: Fair (40-59)
  - Orange/Red: Poor (20-39) or Very Poor (0-19)
- Category label with emoji
- Explanation text

✅ **Score Breakdown (Expandable):**
- Click "View Score Breakdown" to expand
- Shows all factors that affected the score
- Positive factors in green boxes
- Negative factors in red boxes
- Points impact for each factor

✅ **Allergen Warning (if present):**
- Red banner at top
- ⚠️ icon
- List of all allergens detected
- Allergen types in red badges

✅ **Additives Info (if present):**
- Orange banner
- ℹ️ icon
- Grouped by type (preservatives, sweeteners, colors)

✅ **Nutrition Facts Table:**
- Serving size and servings per container
- Calories prominently displayed
- All macronutrients with proper indentation
- Confidence indicators (⚠️ or ❓) for uncertain fields
- Vitamins & minerals section (if present)
- Validation status at bottom

✅ **Ingredient List:**
- All ingredients in order
- Allergens highlighted in red with ⚠️ icon
- Additives highlighted in orange with icons:
  - 🧪 Preservatives
  - 🍬 Sweeteners
  - 🎨 Artificial Colors
- Allergen warning section
- Additives info section
- Optional detailed breakdown (expandable)

✅ **Database Entry:**
- Check Supabase `products` table
- Should have:
  - `name`: Clean product name (no "INGREDIENTS:" prefix)
  - `nutrition_data`: Complete nutritional facts
  - `health_score`: Score value (0-100)
  - `has_allergens`: true/false
  - `allergen_types`: Array of unique allergens (no duplicates)

---

### Scenario 2: Scan Same Nutrition Label Again (Cache Test)

**Steps:**
1. Scan the same nutrition label again
2. Watch for cache indicator

**Expected Results:**

✅ **Instant Results:**
- Much faster response time (<1 second)
- Cache indicator shows: "💾 Retrieved from cache (instant result)"
- All data identical to first scan
- MongoDB cache hit logged in server console

---

### Scenario 3: Scan Product with Allergens

**Steps:**
1. Scan a product containing common allergens (milk, eggs, wheat, nuts, etc.)

**Expected Results:**

✅ **Prominent Allergen Warning:**
- Red banner at top of results
- Large ⚠️ icon
- Clear text: "Allergen Warning"
- List of all allergens in red badges
- Allergens highlighted in ingredient list

---

### Scenario 4: Scan Product with Additives

**Steps:**
1. Scan a product with artificial preservatives, sweeteners, or colors

**Expected Results:**

✅ **Additives Information:**
- Orange banner below allergen warning (if present)
- ℹ️ icon
- Grouped display:
  - Preservatives section (if present)
  - Sweeteners section (if present)
  - Artificial Colors section (if present)
- Additives highlighted in ingredient list with appropriate icons

---

### Scenario 5: Scan Product with High Health Score

**Steps:**
1. Scan a healthy product (high fiber, high protein, low sodium, low sugar)

**Expected Results:**

✅ **Excellent/Good Score:**
- Green health score badge
- Score 60-100
- Positive factors in score breakdown:
  - High Fiber (+5 or +10 points)
  - High Protein (+5 or +10 points)
- Few or no negative factors

---

### Scenario 6: Scan Product with Low Health Score

**Steps:**
1. Scan an unhealthy product (high sodium, high sugar, trans fat, additives)

**Expected Results:**

✅ **Poor/Very Poor Score:**
- Red/Orange health score badge
- Score 0-39
- Negative factors in score breakdown:
  - High Sodium (-10 or -20 points)
  - High Sugar (-15 or -25 points)
  - Trans Fat Present (-15 points)
  - Artificial Preservatives (-5 per item)
  - Artificial Sweeteners (-5 per item)
  - Artificial Colors (-3 per item)

---

### Scenario 7: Scan Regular Product (Not Nutrition Label)

**Steps:**
1. Scan a product barcode or product packaging (not nutrition label)

**Expected Results:**

✅ **Regular Product Display:**
- Shows existing product scan interface
- NOT the nutrition insights display
- Product name, brand, category
- Dimension analysis (if available)
- No nutrition facts or ingredient list

---

### Scenario 8: Test Progress Tracking

**Steps:**
1. Scan a nutrition label
2. Watch the progress tracker during analysis

**Expected Results:**

✅ **Progress Steps Appear:**
- Steps appear sequentially
- Each step shows checkmark when complete
- Progress messages are clear and informative
- No blank loading screen
- Smooth transitions between steps

---

### Scenario 9: Test Expandable Sections

**Steps:**
1. After scanning, test all expandable sections:
   - Click "View Score Breakdown"
   - Click "Nutrition Facts" header
   - Click "Ingredients" header
   - Click "View Detailed Breakdown" (in ingredients)

**Expected Results:**

✅ **Smooth Expansion:**
- Sections expand/collapse smoothly
- Arrow icons change direction (▶ to ▼)
- Content displays correctly when expanded
- No layout shifts or jumps

---

### Scenario 10: Test Accessibility

**Steps:**
1. Use keyboard navigation:
   - Tab through all interactive elements
   - Press Enter/Space on buttons
2. Use screen reader (if available)
3. Check color contrast

**Expected Results:**

✅ **Accessible Interface:**
- All interactive elements focusable with Tab
- Focus indicators visible
- Buttons work with Enter/Space
- ARIA labels present
- Screen reader announces content correctly
- Color contrast meets WCAG 2.1 AA

---

## Browser Console Checks

### Expected Logs (Successful Scan)

```
[Scan Page] 📤 Starting scan workflow
[Scan Page] 🔍 Classifying image...
[Scan Page] ✅ Image classified as: nutrition_label
[Scan Page] 🥗 Routing to nutrition analysis...
[Scan Page] 📥 Nutrition analysis complete
```

### Server Console Checks

```
[Classify Image API] 📸 Received classification request
[ImageClassifier] Model: gemini-2.0-flash
[ImageClassifier] ✅ Classification complete
[Analyze Nutrition API] 🥗 Received nutrition analysis request
[NutritionOrchestrator] Processing nutrition scan
[NutritionParser] 🔍 Parsing nutrition label...
[IngredientParser] 🔍 Parsing ingredient list...
[HealthScorer] 🎯 Calculating health score...
[Analyze Nutrition API] ✅ Analysis complete
```

---

## Database Verification

### Supabase Products Table

Check that the entry has:

```sql
SELECT 
  name,
  nutrition_data,
  health_score,
  has_allergens,
  allergen_types
FROM products
ORDER BY created_at DESC
LIMIT 1;
```

**Expected:**
- `name`: Clean product name (e.g., "Whole Wheat Flour & Fig Paste Product")
- `nutrition_data`: JSON with servingSize, calories, macros, sodium
- `health_score`: Integer 0-100
- `has_allergens`: Boolean
- `allergen_types`: Array of strings (no duplicates)

### MongoDB Cache

Check cache entry:

```javascript
db.nutrition_cache.findOne({}, { sort: { createdAt: -1 } })
```

**Expected:**
- `imageHash`: SHA-256 hash
- `productName`: Product name
- `nutritionalFacts`: Complete nutrition data
- `ingredients`: Parsed ingredient list
- `healthScore`: Score object
- `expiresAt`: 30 days from creation

---

## Common Issues & Solutions

### Issue: Classification fails with 500 error

**Solution:**
- Check server logs for actual error
- Verify GEMINI_API_KEY is set
- Ensure using `gemini-2.0-flash` model (not `-exp`)
- Restart dev server

### Issue: Nutrition data not saving to database

**Solution:**
- Check Supabase connection
- Verify migration ran successfully
- Check server logs for database errors
- Ensure products table has nutrition columns

### Issue: Duplicate allergens in database

**Solution:**
- This was fixed - should not occur
- If it does, check `src/app/api/analyze-nutrition/route.ts` line 186
- Should use `Array.from(new Set(...))` for deduplication

### Issue: Product name has "INGREDIENTS:" prefix

**Solution:**
- This was fixed - should not occur
- If it does, check `src/lib/services/ingredient-parser.ts`
- Should strip prefix in `tokenizeIngredients()` method

### Issue: Progress tracker not showing

**Solution:**
- Check browser console for errors
- Verify `ProgressTracker` component is imported
- Check that `progressSteps` state is being updated

### Issue: UI components not displaying

**Solution:**
- Check that `nutritionResult` state is set
- Verify conditional rendering in `src/app/page.tsx`
- Check browser console for React errors
- Ensure all components are imported correctly

---

## Performance Benchmarks

### Target Performance

- Image classification: < 2 seconds
- OCR processing: < 3 seconds
- Health scoring: < 100ms
- Cache lookup: < 50ms
- End-to-end scan: < 5 seconds (fresh) or < 1 second (cached)

### Measuring Performance

Check browser console for timing logs:
```
[Scan Page] 📥 Scan complete: { processingTimeMs: 4523 }
```

---

## Success Criteria

✅ All test scenarios pass  
✅ No console errors  
✅ Database entries correct  
✅ Progress tracking works  
✅ UI displays correctly  
✅ Accessibility features work  
✅ Performance within targets  
✅ Cache working correctly  

---

## Next Steps After Testing

1. **If all tests pass:**
   - Feature is ready for production
   - Consider adding more test coverage
   - Document any edge cases found

2. **If issues found:**
   - Document the issue
   - Check relevant logs
   - Review code in affected area
   - Apply fixes and retest

3. **Optional enhancements:**
   - Add more premium features (Phase 6)
   - Optimize performance (Phase 7)
   - Add user corrections (Phase 7)
   - Implement comparison features

---

## Contact

If you encounter issues not covered in this guide, check:
- Server console logs
- Browser console logs
- Network tab in DevTools
- Database entries

Document the issue with:
- Steps to reproduce
- Expected vs actual behavior
- Console logs
- Screenshots
