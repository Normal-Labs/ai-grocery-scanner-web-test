# Migration Plan: Test Extraction → Production Integration

## Executive Summary

The test extraction endpoints (`/test-all-extraction`, `/test-barcode-extraction`, etc.) are working perfectly with Vertex AI and centralized prompts. However, the production scanning pages (`/` and `/scan`) use a different multi-tier system that may still have references to old Gemini API patterns.

**Goal:** Ensure all production endpoints use the same Vertex AI + centralized prompts approach that's proven to work in the test pages.

## Current State Analysis

### ✅ What's Working (Test Pages)
- `/test-all` - Combined extraction in single API call
- `/test-barcode` - Barcode detection with BarcodeDetector + OCR fallback
- `/test-packaging` - Product metadata extraction
- `/test-ingredients` - Ingredient list extraction
- `/test-nutrition` - Nutrition facts extraction

**Implementation:**
- Uses `GeminiWrapper` class (Vertex AI)
- Uses centralized prompts from `src/lib/prompts/extraction-prompts.ts`
- Saves to `products_dev` table
- No 429 quota errors
- Fast and reliable

### ⚠️ What Needs Verification (Production Pages)

**Main Production Pages:**
1. `/` (src/app/page.tsx) - Main scanning interface
   - Uses `/api/scan-multi-tier` endpoint
   - Multi-tier system (4 tiers)
   - Dimension analysis (5 dimensions)
   - Product Hero mode

2. `/scan` (src/app/scan/page.tsx) - Secondary scanning interface
   - Image classification routing
   - Dimension analysis display

**Production Endpoints:**
- `/api/scan-multi-tier` - Primary production endpoint
- `/api/analyze-nutrition` - Nutrition analysis
- `/api/classify-image` - Image classification
- `/api/scan-multi-image` - Multi-image orchestrator

## Key Differences: Test vs Production

| Aspect | Test Pages | Production Pages |
|--------|-----------|------------------|
| **Extraction** | Single combined call | Multi-tier fallback system |
| **Database** | `products_dev` table | `products` table |
| **Caching** | None | MongoDB (90-day TTL) |
| **Prompts** | Centralized prompts | May use inline prompts |
| **API** | Vertex AI (verified) | Vertex AI (needs verification) |
| **Purpose** | Testing/validation | User-facing |

## Migration Strategy

### Phase 1: Verification ✅ (Current Phase)

**Objective:** Verify that production endpoints already use Vertex AI correctly.

**Tasks:**
1. ✅ Verify `GeminiWrapper` is used in all services
2. ✅ Verify centralized prompts are used
3. ⏳ Check for any hardcoded Gemini API calls
4. ⏳ Verify environment variables are correct
5. ⏳ Test production endpoints with real products

**Files to Check:**
- `src/lib/services/gemini-client.ts`
- `src/lib/services/nutrition-parser.ts`
- `src/lib/services/ingredient-parser.ts`
- `src/lib/services/image-classifier.ts`
- `src/lib/orchestrator/ScanOrchestratorMultiTier.ts`
- `src/app/api/scan-multi-tier/route.ts`

### Phase 2: Alignment (If Needed)

**Objective:** Align production extraction with test extraction patterns.

**Potential Changes:**
1. **Use Centralized Prompts Everywhere**
   - Replace any inline prompts with imports from `extraction-prompts.ts`
   - Ensure consistent prompt formatting

2. **Standardize Extraction Logic**
   - Consider using combined extraction approach from `/test-all-extraction`
   - Maintain multi-tier fallback for barcode lookup
   - Use same parsing logic as test endpoints

3. **Unified Error Handling**
   - Use same error patterns as test endpoints
   - Consistent logging format

### Phase 3: Testing

**Objective:** Validate that production works as well as test pages.

**Test Cases:**
1. Scan product with barcode → Verify Tier 1 success
2. Scan product without barcode → Verify Tier 2/3/4 fallback
3. Scan nutrition label → Verify nutrition extraction
4. Scan multiple products → Verify caching works
5. Monitor for 429 errors → Should be zero

**Success Criteria:**
- No 429 quota errors
- Fast response times (< 5s for cached, < 10s for new)
- Accurate extraction results
- Proper dimension analysis
- Cache working correctly

### Phase 4: Cleanup

**Objective:** Remove deprecated code and update documentation.

**Tasks:**
1. Remove old `GEMINI_API_KEY` references
2. Update `.env.local.example` to remove deprecated variables
3. Update documentation to reflect Vertex AI usage
4. Remove any unused code paths
5. Update specs if needed

## Recommended Approach

### Option A: Verify First (Recommended)

**Rationale:** The migration to Vertex AI may already be complete. Let's verify before making changes.

**Steps:**
1. Check if production endpoints already use `GeminiWrapper`
2. Test production pages with real products
3. Monitor for any issues
4. Only make changes if problems are found

**Pros:**
- Minimal risk
- Avoids unnecessary changes
- Respects existing architecture

**Cons:**
- May miss optimization opportunities

### Option B: Align with Test Pattern

**Rationale:** Test pages are proven to work perfectly. Align production to match.

**Steps:**
1. Refactor production endpoints to use combined extraction
2. Maintain multi-tier fallback for barcode lookup
3. Use centralized prompts everywhere
4. Standardize response formats

**Pros:**
- Consistent codebase
- Proven approach
- Easier to maintain

**Cons:**
- More changes required
- May conflict with existing specs
- Risk of breaking working code

### Option C: Hybrid Approach (Balanced)

**Rationale:** Keep multi-tier architecture but ensure it uses Vertex AI + centralized prompts.

**Steps:**
1. Verify Vertex AI usage in all tiers
2. Replace inline prompts with centralized prompts
3. Keep multi-tier fallback logic
4. Keep dimension analysis separate
5. Maintain existing cache strategy

**Pros:**
- Respects existing architecture
- Minimal changes
- Maintains spec compliance

**Cons:**
- More complex than Option B

## Recommendation

**Start with Option A (Verify First):**

1. Run verification checks on production endpoints
2. Test with real products
3. Monitor for issues
4. Document findings

**Then decide:**
- If everything works → Document and move on (Option C)
- If issues found → Fix specific issues (Option C)
- If major problems → Consider refactor (Option B)

## Next Steps

1. **Immediate:** Run verification checks
   - Check `GeminiWrapper` usage in production services
   - Test production endpoints
   - Monitor for 429 errors

2. **Short-term:** Document findings
   - Create verification report
   - Identify any issues
   - Propose specific fixes

3. **Long-term:** Optimize if needed
   - Consider combined extraction for Tier 4
   - Standardize prompt usage
   - Update documentation

## Risk Assessment

**Low Risk:**
- Verification checks
- Documentation updates
- Environment variable cleanup

**Medium Risk:**
- Prompt standardization
- Error handling alignment
- Response format changes

**High Risk:**
- Refactoring multi-tier orchestrator
- Changing cache strategy
- Modifying dimension analysis

## Success Metrics

1. **No 429 Errors:** Zero quota limit errors
2. **Fast Response:** < 5s cached, < 10s new scans
3. **High Accuracy:** > 90% correct extractions
4. **Cost Efficiency:** Minimize API calls through caching
5. **User Satisfaction:** Smooth scanning experience

## Questions to Answer

1. Do production endpoints already use `GeminiWrapper`?
2. Are centralized prompts used in production?
3. Are there any hardcoded Gemini API calls?
4. Is the multi-tier system working correctly?
5. Are there any 429 errors in production?
6. Is dimension analysis using Vertex AI?
7. Is nutrition analysis using Vertex AI?

## Conclusion

The test pages prove that Vertex AI + centralized prompts work perfectly. The goal is to ensure production pages use the same reliable approach while respecting the existing multi-tier architecture and specs.

**Recommended First Action:** Run verification checks to understand current state before making any changes.
