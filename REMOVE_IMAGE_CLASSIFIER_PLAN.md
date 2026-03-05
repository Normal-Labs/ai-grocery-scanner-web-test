# Remove ImageClassifier - Migration Plan

## Current Flow (2 API Calls)

```
User captures image
    ↓
1. POST /api/classify-image (ImageClassifier)
    ↓
   Returns: { type: 'nutrition_label' | 'product_image' | 'barcode' }
    ↓
2. Route based on type:
   - nutrition_label → POST /api/analyze-nutrition
   - product_image → POST /api/scan-multi-tier
   - barcode → POST /api/scan-multi-tier
```

**Problems:**
- 2 API calls (slow, expensive)
- Can misclassify
- Uses old Gemini API (429 errors)
- Extra complexity

## New Flow (1 API Call)

```
User captures image
    ↓
1. POST /api/scan-multi-tier (with combined extraction)
    ↓
   Returns ALL data:
   - barcode (if visible)
   - packaging info (if visible)
   - ingredients (if visible)
   - nutrition facts (if visible)
   - dimension analysis
```

**Benefits:**
- 1 API call (fast, cheap)
- No classification errors
- Uses Vertex AI (no 429 errors)
- Simpler code
- More data returned

## Migration Steps

### Step 1: Update `/api/scan-multi-tier` to Use Combined Extraction ✅

Already done in test endpoints! Just need to apply to production.

### Step 2: Remove Classification from Frontend Pages

**Files to update:**
- `src/app/page.tsx` - Main scan page
- `src/app/scan/page.tsx` - Secondary scan page

**Changes:**
1. Remove `/api/classify-image` call
2. Call `/api/scan-multi-tier` directly
3. Remove routing logic (no longer needed)
4. Display all extracted data

### Step 3: Update MultiImageOrchestrator

**File:** `src/lib/multi-image/MultiImageOrchestrator.ts`

**Changes:**
1. Remove `ImageClassifier` import
2. Remove classification logic
3. Use combined extraction for all images
4. Simplify workflow

### Step 4: Delete ImageClassifier Files

**Files to delete:**
- `src/lib/services/image-classifier.ts`
- `src/lib/services/__tests__/image-classifier.test.ts`
- `src/app/api/classify-image/route.ts`

### Step 5: Update Documentation

**Files to update:**
- `MIGRATION_PLAN.md`
- `VERIFICATION_REPORT.md`
- `PRODUCTION_VS_TEST_FEATURES.md`
- `CHANGELOG.md`

## Detailed Changes

### Change 1: src/app/page.tsx

**Before:**
```typescript
// Step 1: Classify image
const classifyResponse = await fetch('/api/classify-image', { ... });
const classification = await classifyResponse.json();

// Step 2: Route based on classification
if (imageType === 'nutrition_label') {
  // Route to nutrition
} else {
  // Route to product scan
}
```

**After:**
```typescript
// Single call to scan-multi-tier with combined extraction
const response = await fetch('/api/scan-multi-tier', {
  method: 'POST',
  body: JSON.stringify({
    barcode: scanData.barcode,
    image: scanData.image,
    imageMimeType: 'image/jpeg',
    userId: user?.id || 'anonymous',
    sessionId: Date.now().toString(),
  }),
});

const data = await response.json();
// Data includes: product, nutrition, ingredients, dimensions
```

### Change 2: src/app/scan/page.tsx

Same changes as page.tsx

### Change 3: src/lib/multi-image/MultiImageOrchestrator.ts

**Before:**
```typescript
// Classify image type
const classification = await this.imageClassifier.classify(imageData.base64);
imageType = classification.type;

// Route based on type
if (imageType === 'nutrition_label') {
  // Nutrition flow
} else {
  // Product flow
}
```

**After:**
```typescript
// Use combined extraction - no classification needed
const result = await this.extractAllData(imageData);

// Result includes all data types
// No routing needed - all data extracted at once
```

## Testing Plan

### Unit Tests
- [ ] Test combined extraction in scan-multi-tier
- [ ] Test frontend without classification
- [ ] Test MultiImageOrchestrator without classifier

### Integration Tests
- [ ] Test full scan flow (barcode → product → nutrition)
- [ ] Test with various image types
- [ ] Verify no 429 errors
- [ ] Verify performance improvement

### Manual Tests
- [ ] Scan product with barcode
- [ ] Scan nutrition label
- [ ] Scan product packaging
- [ ] Scan ingredient list
- [ ] Test on mobile devices

## Rollback Plan

If issues arise:
1. Revert frontend changes (restore classification calls)
2. Keep ImageClassifier files
3. Restore `/api/classify-image` endpoint
4. Document issues for future attempt

## Success Criteria

- [ ] No classification API calls
- [ ] Single scan-multi-tier call per image
- [ ] All data extracted correctly
- [ ] No 429 errors
- [ ] Faster response times (< 10s)
- [ ] Lower API costs (50% reduction)
- [ ] All tests passing

## Timeline

- **Step 1:** Update scan-multi-tier (already done in test endpoints)
- **Step 2:** Update frontend pages (2 hours)
- **Step 3:** Update MultiImageOrchestrator (2 hours)
- **Step 4:** Delete ImageClassifier files (30 minutes)
- **Step 5:** Update documentation (1 hour)
- **Testing:** (2 hours)

**Total: ~8 hours (1 day)**

## Risk Assessment

**Low Risk:**
- Frontend changes (easy to revert)
- Documentation updates

**Medium Risk:**
- MultiImageOrchestrator changes (more complex)
- Removing classification logic

**High Risk:**
- None (can always rollback)

## Next Actions

1. ✅ Verify classify-image usage (DONE)
2. ⏳ Update frontend pages to remove classification
3. ⏳ Update MultiImageOrchestrator
4. ⏳ Delete ImageClassifier files
5. ⏳ Test thoroughly
6. ⏳ Update documentation
