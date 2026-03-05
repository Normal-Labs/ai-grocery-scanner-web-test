# Verification Report: Production vs Test Extraction

## Date: 2026-03-05

## Executive Summary

**Finding:** Production services use OLD Gemini API, while test endpoints use NEW Vertex AI.

**Impact:** Production may experience 429 quota errors that test pages don't have.

**Recommendation:** Migrate production services to use `GeminiWrapper` (Vertex AI) like test endpoints.

## Detailed Findings

### ✅ Test Endpoints (Working Perfectly)

**Implementation:**
- Uses `GeminiWrapper` class from `src/lib/gemini-wrapper.ts`
- Uses Vertex AI SDK (`@google-cloud/vertexai`)
- Uses centralized prompts from `src/lib/prompts/extraction-prompts.ts`
- Authentication: Service account JSON or gcloud auth
- Model: `gemini-2.0-flash`
- No 429 quota errors

**Files:**
- `src/app/api/test-barcode-extraction/route.ts` ✅
- `src/app/api/test-packaging-extraction/route.ts` ✅
- `src/app/api/test-ingredients-extraction/route.ts` ✅
- `src/app/api/test-nutrition-extraction/route.ts` ✅
- `src/app/api/test-all-extraction/route.ts` ✅

**Pattern:**
```typescript
import { getGeminiWrapper } from '@/lib/gemini-wrapper';
import { ExtractionPrompts } from '@/lib/prompts/extraction-prompts';

const gemini = getGeminiWrapper();
const result = await gemini.callGemini({
  prompt: ExtractionPrompts.barcode,
  imageData: image,
  imageMimeType: 'image/jpeg',
});
```

### ❌ Production Services (Using Old API)

**Implementation:**
- Uses `@ai-sdk/google` package (OLD Gemini API)
- Uses `GEMINI_API_KEY` environment variable
- Uses inline prompts (not centralized)
- Authentication: API key only
- Model: `gemini-2.0-flash` (same model, different API)
- May experience 429 quota errors

**Files:**
- `src/lib/services/gemini-client.ts` ❌
- `src/lib/services/nutrition-parser.ts` ❌
- `src/lib/services/ingredient-parser.ts` ❌
- `src/lib/services/image-classifier.ts` ❌

**Pattern:**
```typescript
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';

constructor(apiKey?: string) {
  this.apiKey = apiKey || process.env.GEMINI_API_KEY || '';
  process.env.GOOGLE_GENERATIVE_AI_API_KEY = this.apiKey;
}

const result = await generateText({
  model: google(this.model),
  messages: [/* inline prompt */],
});
```

## API Comparison

| Aspect | Test Endpoints (Vertex AI) | Production Services (Old API) |
|--------|----------------------------|-------------------------------|
| **Package** | `@google-cloud/vertexai` | `@ai-sdk/google` |
| **Auth** | Service account JSON | API key |
| **Env Var** | `VERTEX_AI_PROJECT_ID` | `GEMINI_API_KEY` |
| **Prompts** | Centralized | Inline |
| **Quotas** | Paid tier (2000 RPM) | Free tier (15 RPM) |
| **429 Errors** | None | Possible |
| **Wrapper** | `GeminiWrapper` class | Direct API calls |

## Impact Analysis

### Current Issues

1. **Quota Limitations:**
   - Production services may hit Free Tier limits (15 RPM)
   - Test endpoints use Paid Tier (2000 RPM)
   - Users may experience 429 errors in production

2. **Inconsistent Implementation:**
   - Two different ways to call Gemini API
   - Harder to maintain
   - Different error handling patterns

3. **Prompt Management:**
   - Test endpoints use centralized prompts (easy to update)
   - Production uses inline prompts (scattered across files)
   - Inconsistent prompt quality

4. **Authentication:**
   - Test endpoints use service account (more secure)
   - Production uses API key (less secure)

### Affected Endpoints

**Production endpoints using old API:**
- `/api/scan-multi-tier` - Main production endpoint
- `/api/analyze-nutrition` - Nutrition analysis
- `/api/classify-image` - Image classification
- `/api/scan` - Legacy scan endpoint

**User-facing pages affected:**
- `/` (Main scanning page)
- `/scan` (Secondary scanning page)

## Migration Requirements

### Phase 1: Update Services to Use GeminiWrapper

**Files to Update:**
1. `src/lib/services/gemini-client.ts`
2. `src/lib/services/nutrition-parser.ts`
3. `src/lib/services/ingredient-parser.ts`
4. `src/lib/services/image-classifier.ts`

**Changes Needed:**
- Replace `@ai-sdk/google` with `GeminiWrapper`
- Replace `GEMINI_API_KEY` with Vertex AI credentials
- Use centralized prompts from `extraction-prompts.ts`
- Update error handling to match test endpoints

### Phase 2: Update Prompts

**Current State:**
- Inline prompts scattered across service files
- Different prompt formats
- Hard to update and test

**Target State:**
- All prompts in `src/lib/prompts/extraction-prompts.ts`
- Consistent format
- Easy to update and test

**Prompts to Centralize:**
- OCR text extraction prompt (gemini-client.ts)
- Comprehensive image analysis prompt (gemini-client.ts)
- Dimension analysis prompts (if any)
- Classification prompts (image-classifier.ts)

### Phase 3: Update Tests

**Files to Update:**
- `src/lib/services/__tests__/gemini-client.test.ts`
- `src/lib/services/__tests__/nutrition-parser.test.ts`
- `src/lib/services/__tests__/ingredient-parser.test.ts`
- `src/lib/services/__tests__/image-classifier.test.ts`

**Changes Needed:**
- Mock `GeminiWrapper` instead of `@ai-sdk/google`
- Update test expectations
- Test with Vertex AI patterns

## Recommended Migration Path

### Option 1: Gradual Migration (Recommended)

**Approach:** Update one service at a time, test thoroughly.

**Steps:**
1. Start with `image-classifier.ts` (simplest)
2. Update to use `GeminiWrapper`
3. Test thoroughly
4. Move to `nutrition-parser.ts`
5. Then `ingredient-parser.ts`
6. Finally `gemini-client.ts` (most complex)

**Pros:**
- Lower risk
- Can rollback easily
- Test each change

**Cons:**
- Takes longer
- Temporary inconsistency

### Option 2: Complete Migration (Faster)

**Approach:** Update all services at once.

**Steps:**
1. Update all 4 service files
2. Update all tests
3. Test all endpoints
4. Deploy together

**Pros:**
- Faster completion
- Consistent immediately
- Single deployment

**Cons:**
- Higher risk
- Harder to debug if issues
- All-or-nothing

### Option 3: Wrapper Adapter (Safest)

**Approach:** Create adapter that wraps old API with new interface.

**Steps:**
1. Create `GeminiClientAdapter` class
2. Implements same interface as `GeminiWrapper`
3. Internally uses old `@ai-sdk/google`
4. Gradually migrate to real `GeminiWrapper`

**Pros:**
- Minimal code changes
- Can switch gradually
- Fallback option

**Cons:**
- Extra abstraction layer
- Temporary complexity
- Still need to migrate eventually

## Recommendation

**Use Option 1: Gradual Migration**

**Rationale:**
- Production is working (even if not optimal)
- Test endpoints prove Vertex AI works
- Lower risk approach
- Can validate each step

**Timeline:**
- Week 1: Migrate `image-classifier.ts` + test
- Week 2: Migrate `nutrition-parser.ts` + test
- Week 3: Migrate `ingredient-parser.ts` + test
- Week 4: Migrate `gemini-client.ts` + test
- Week 5: Final testing + deployment

## Next Steps

1. **Immediate:**
   - Review this report with team
   - Decide on migration approach
   - Create detailed migration tasks

2. **Short-term:**
   - Start with `image-classifier.ts` migration
   - Create PR with changes
   - Test thoroughly

3. **Long-term:**
   - Complete all service migrations
   - Update documentation
   - Remove old API dependencies

## Questions for Discussion

1. **Priority:** How urgent is this migration?
   - Are users experiencing 429 errors?
   - Is production working acceptably?

2. **Approach:** Which migration option to use?
   - Gradual (safer, slower)
   - Complete (faster, riskier)
   - Adapter (safest, more complex)

3. **Testing:** How to validate changes?
   - Unit tests
   - Integration tests
   - Manual testing
   - Staging environment

4. **Rollback:** What's the rollback plan?
   - Keep old code in separate branch
   - Feature flags
   - Quick revert process

## Conclusion

The test endpoints demonstrate that Vertex AI + centralized prompts work perfectly. Production services should be migrated to use the same approach for consistency, reliability, and better quota management.

**Key Takeaway:** We have a proven solution (test endpoints) that should be applied to production services.
