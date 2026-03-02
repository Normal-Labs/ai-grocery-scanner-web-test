# Image Extraction Diagnostics

## Current Issues

Please describe the specific extraction problems you're experiencing:

### 1. Barcode Extraction
- [ ] Barcode not detected at all
- [ ] Wrong barcode number extracted
- [ ] Barcode detection inconsistent
- **Details**: 

### 2. Packaging Information Extraction
- [ ] Product name incorrect/missing
- [ ] Brand name incorrect/missing
- [ ] Size/quantity incorrect/missing
- [ ] Category incorrect/missing
- **Details**: 

### 3. Nutrition Label Extraction
- [ ] Nutrition facts not extracted
- [ ] Nutrition values incorrect
- [ ] Serving size incorrect
- [ ] Ingredient list not extracted
- [ ] Allergens not detected
- **Details**: 

### 4. Workflow Issues
- [ ] Images not being processed
- [ ] Errors during extraction
- [ ] Slow processing times
- [ ] Data not saving to database
- **Details**: 

## Recent Changes That May Have Caused Issues

Looking at the recent improvements, here are potential problem areas:

### Change #13: Barcode Extraction Fallback (Improvement #13)
**What changed**: Added Gemini Vision OCR as fallback for barcode extraction
**Potential issue**: OCR might be extracting wrong numbers or failing
**Test**: Try with BarcodeDetector disabled to see if OCR fallback works

### Change #14: Barcode Value Preservation (Improvement #14)
**What changed**: Pass barcode from BarcodeDetector through API to orchestrator
**Potential issue**: Barcode might be getting lost in the chain
**Test**: Check console logs for "Using barcode from detector" message

### Change #15: Ingredient Parsing Optional (Improvement #15)
**What changed**: Made ingredient parsing non-fatal using Promise.allSettled
**Potential issue**: Might be silently failing and returning empty data
**Test**: Check if ingredient list is always empty

## Diagnostic Steps

### Step 1: Check Console Logs
Look for these log messages during scanning:
- `[MultiImageOrchestrator] 📸 Processing image`
- `[MultiImageOrchestrator] 🔄 Routing to analyzer`
- `[MultiImageOrchestrator] ✅ Analysis complete`
- Any error messages with ❌

### Step 2: Check Network Tab
In browser DevTools Network tab:
- Check `/api/scan-multi-image` requests
- Look at request payload (is image data present?)
- Look at response (what data is returned?)
- Check for 400/500 errors

### Step 3: Check Database
After completing workflow:
- Check Supabase products table
- Verify all fields are populated
- Check MongoDB sessions collection
- Verify captured_images array has all 3 types

### Step 4: Test Individual Components

**Test Barcode Detection:**
```typescript
// In browser console after scanning barcode
console.log('Barcode detected:', scanData.barcode);
```

**Test Image Classification:**
```typescript
// Check if image type is correct
console.log('Image type:', imageType);
```

**Test Nutrition Parsing:**
```typescript
// Check if nutrition data is extracted
console.log('Nutrition data:', product.nutrition_data);
```

## Rollback Strategy

If we need to rollback specific changes:

### Rollback Barcode Extraction Changes
1. Remove OCR fallback from MultiImageOrchestrator
2. Rely only on BarcodeDetector API
3. Show error if barcode can't be detected

### Rollback Ingredient Parsing Changes
1. Revert Promise.allSettled back to Promise.all
2. Make ingredient parsing required again
3. Fail nutrition scan if ingredients can't be parsed

### Rollback Data Flow Changes
1. Revert barcode parameter passing
2. Go back to image-only approach
3. Let orchestrator extract barcode from image

## Recommended Approach

### Phase 1: Identify Root Cause
1. **Enable verbose logging**: Add more console.log statements
2. **Test with known-good images**: Use images that worked 3 days ago
3. **Compare before/after**: Check what data was extracted then vs now
4. **Isolate the problem**: Test each step individually

### Phase 2: Targeted Fix
1. **Fix only the broken component**: Don't change working parts
2. **Add validation**: Verify data at each step
3. **Add fallbacks**: Graceful degradation for failures
4. **Test incrementally**: Verify each fix before moving on

### Phase 3: Prevent Regression
1. **Add integration tests**: Test full workflow end-to-end
2. **Add unit tests**: Test each extractor individually
3. **Add monitoring**: Track extraction success rates
4. **Document expected behavior**: Clear specs for each extractor

## Questions to Answer

1. **When did extraction start failing?**
   - After which specific change?
   - Was it gradual or sudden?

2. **What percentage of scans are failing?**
   - All scans?
   - Only certain product types?
   - Only certain image types?

3. **What error messages are you seeing?**
   - In browser console?
   - In network responses?
   - In Vercel logs?

4. **Can you provide example images?**
   - Images that worked before but fail now
   - Images that never worked
   - Images that work inconsistently

## Next Steps

Please fill in the "Current Issues" section above with specific details about what's failing, and I'll help you:

1. Identify the root cause
2. Create a targeted fix
3. Test the fix thoroughly
4. Prevent future regressions

We'll take a methodical approach to avoid making things worse.
