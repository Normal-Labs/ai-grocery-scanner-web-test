# Production Services vs Test Endpoints: Feature Comparison

## Overview

This document lists features and functionality present in production services that are NOT in the test endpoints. This helps identify what needs to be preserved or adapted during migration to Vertex AI.

---

## 1. image-classifier.ts (SIMPLEST)

### Features NOT in Test Endpoints

#### 1.1 Image Classification
- **What it does:** Classifies images into categories: `barcode`, `product_image`, `nutrition_label`, or `unknown`
- **Test equivalent:** None - test endpoints assume you know what type of image you're sending
- **Keep?** YES - This is routing logic for production

#### 1.2 In-Memory Caching by Image Hash
- **What it does:** Caches classification results by SHA-256 hash of image
- **Implementation:** `Map<string, ImageClassification>`
- **Test equivalent:** None - test endpoints don't cache
- **Keep?** YES - Performance optimization

#### 1.3 Confidence Threshold (60%)
- **What it does:** Returns `unknown` if confidence < 0.6
- **Test equivalent:** Test endpoints return results regardless of confidence
- **Keep?** YES - Quality control

#### 1.4 Metadata Detection
- **What it does:** Detects `hasNutritionalFacts`, `hasIngredientList`, `hasBarcodeVisible`
- **Test equivalent:** None
- **Keep?** YES - Useful for routing decisions

#### 1.5 Retry Logic with Exponential Backoff
- **What it does:** `withRetry()` method with exponential backoff for 429 errors
- **Test equivalent:** GeminiWrapper has retry logic but different implementation
- **Keep?** MAYBE - GeminiWrapper already has retry logic

#### 1.6 Cache Management Methods
- **What it does:** `clearCache()` and `getCacheStats()` methods
- **Test equivalent:** None
- **Keep?** YES - Useful for testing and monitoring

### Migration Notes
- Keep classification logic (unique to production)
- Keep caching (performance)
- Adapt retry logic to use GeminiWrapper's built-in retry
- Keep confidence threshold
- Keep metadata detection

---

## 2. nutrition-parser.ts

### Features NOT in Test Endpoints

#### 2.1 Structured Data Model with Confidence Scores
- **What it does:** Each field has `{ value, unit, confidence }` structure
- **Test equivalent:** Test endpoint returns flat JSON from Gemini
- **Keep?** YES - More detailed tracking

#### 2.2 Calorie Validation (4-9-4 Rule)
- **What it does:** Validates calories = (4×carbs + 4×protein + 9×fat) ±20%
- **Formula:** `calculatedCalories = (carbs * 4) + (protein * 4) + (fat * 9)`
- **Test equivalent:** None - test endpoint doesn't validate
- **Keep?** YES - Quality control (Requirement 10.1, 10.2)

#### 2.3 Daily Value Range Validation
- **What it does:** Validates vitamins/minerals are 0-200% DV
- **Test equivalent:** None
- **Keep?** YES - Data quality (Requirement 10.3)

#### 2.4 Serving Size Unit Validation
- **What it does:** Validates units are in allowed list: `g, mg, ml, oz, cup, tbsp, tsp, fl oz, serving`
- **Test equivalent:** None
- **Keep?** YES - Data quality (Requirement 10.4)

#### 2.5 Validation Status Enum
- **What it does:** Returns `valid`, `uncertain`, or `invalid` status
- **Test equivalent:** Test endpoint only returns confidence score
- **Keep?** YES - More granular quality tracking

#### 2.6 Low Confidence Field Detection
- **What it does:** Flags entire result as `uncertain` if any field < 0.8 confidence
- **Threshold:** 0.8 (80%)
- **Test equivalent:** None
- **Keep?** YES - Quality control (Requirement 2.9)

#### 2.7 Detailed Validation Errors
- **What it does:** Returns array of specific validation errors
- **Test equivalent:** None
- **Keep?** YES - Debugging and user feedback

#### 2.8 Vitamins and Minerals Support
- **What it does:** Extracts optional vitamins/minerals with confidence scores
- **Test equivalent:** Test endpoint extracts but doesn't track confidence per vitamin
- **Keep?** YES - More detailed tracking

### Migration Notes
- Keep validation logic (unique quality control)
- Keep confidence tracking per field
- Keep validation status enum
- Adapt prompt to match test endpoint's working prompt
- Use GeminiWrapper instead of @ai-sdk/google

---

## 3. ingredient-parser.ts

### Features NOT in Test Endpoints

#### 3.1 Allergen Detection with Pattern Matching
- **What it does:** Detects 8 major allergens using regex patterns
- **Allergens:** milk, eggs, fish, shellfish, tree_nuts, peanuts, wheat, soybeans
- **Test equivalent:** None - test endpoint returns raw ingredient list
- **Keep?** YES - Critical safety feature (Requirement 3.4)

#### 3.2 Preservative Detection
- **What it does:** Detects artificial preservatives: BHA, BHT, sodium benzoate, potassium sorbate, TBHQ
- **Test equivalent:** None
- **Keep?** YES - Health analysis feature (Requirement 3.5)

#### 3.3 Artificial Sweetener Detection
- **What it does:** Detects: aspartame, sucralose, saccharin, acesulfame potassium
- **Test equivalent:** None
- **Keep?** YES - Health analysis feature (Requirement 3.6)

#### 3.4 Artificial Color Detection
- **What it does:** Detects: Red 40, Yellow 5, Blue 1, etc.
- **Test equivalent:** None
- **Keep?** YES - Health analysis feature (Requirement 3.7)

#### 3.5 Ingredient Position Tracking
- **What it does:** Tracks position (1-indexed) of each ingredient
- **Why:** First ingredient = highest quantity
- **Test equivalent:** Test endpoint preserves order but doesn't track position
- **Keep?** YES - Important for analysis (Requirement 3.3)

#### 3.6 Tokenization by Commas and Semicolons
- **What it does:** Splits ingredient text by `,` and `;`
- **Test equivalent:** Test endpoint relies on Gemini to parse
- **Keep?** MAYBE - Test endpoint's approach might be better

#### 3.7 Ingredient Categorization
- **What it does:** Separates ingredients into: `allergens[]`, `preservatives[]`, `sweeteners[]`, `artificialColors[]`
- **Test equivalent:** None
- **Keep?** YES - Useful for UI display

#### 3.8 Completeness Flag
- **What it does:** Flags list as incomplete if confidence < 0.7
- **Test equivalent:** Test endpoint returns confidence but no flag
- **Keep?** YES - Quality indicator (Requirement 3.8)

#### 3.9 Helper Methods
- **What it does:** `identifyAllergens()`, `identifyPreservatives()`, `identifySweeteners()`, `identifyArtificialColors()`
- **Test equivalent:** None
- **Keep?** YES - Useful for standalone analysis

### Migration Notes
- Keep ALL detection logic (unique features)
- Keep position tracking
- Keep categorization
- Keep completeness flag
- Adapt prompt to match test endpoint's working prompt
- Use GeminiWrapper instead of @ai-sdk/google

---

## 4. gemini-client.ts (MOST COMPLEX)

### Features NOT in Test Endpoints

#### 4.1 Circuit Breaker for Dimension Analysis
- **What it does:** Opens circuit after 5 consecutive failures, resets after 60 seconds
- **States:** CLOSED, OPEN, HALF_OPEN
- **Test equivalent:** None
- **Keep?** YES - Resilience pattern (Requirements 11.2, 11.5)

#### 4.2 Text Extraction Method
- **What it does:** `extractText()` - OCR for Tier 2 (Visual Text Extraction)
- **Prompt:** Extracts product name, brand, size, other text
- **Test equivalent:** Test endpoints use specialized prompts
- **Keep?** YES - Part of multi-tier system

#### 4.3 Product Analysis Method
- **What it does:** `analyzeProduct()` - Comprehensive analysis for Tier 4
- **Returns:** ProductMetadata + VisualCharacteristics + confidence
- **Test equivalent:** Test endpoints do focused extraction
- **Keep?** YES - Part of multi-tier system

#### 4.4 Dimension Analysis Method
- **What it does:** `analyzeDimensions()` - Analyzes 5 dimensions
- **Dimensions:** Health, Processing, Allergens, Responsible Production, Environmental Impact
- **Test equivalent:** None
- **Keep?** YES - Core production feature (Requirements 12.1-12.6)

#### 4.5 Visual Characteristics Extraction
- **What it does:** Extracts colors, packaging type, shape
- **Test equivalent:** None
- **Keep?** YES - Part of product analysis

#### 4.6 Keywords Extraction
- **What it does:** Extracts product keywords for search/matching
- **Test equivalent:** None
- **Keep?** YES - Part of product analysis

#### 4.7 Retry Logic with Exponential Backoff
- **What it does:** `withRetry()` method with exponential backoff
- **Test equivalent:** GeminiWrapper has retry logic
- **Keep?** MAYBE - GeminiWrapper already has this

#### 4.8 Structured Prompts for Different Use Cases
- **What it does:** Different prompts for text extraction, product analysis, dimension analysis
- **Test equivalent:** Test endpoints use centralized prompts
- **Keep?** YES - But adapt to use centralized prompts

#### 4.9 JSON Parsing with Markdown Handling
- **What it does:** Strips markdown code blocks before parsing JSON
- **Test equivalent:** Test endpoints do this too
- **Keep?** YES - Necessary for Gemini responses

#### 4.10 Singleton Export Pattern
- **What it does:** Exports `geminiClient` singleton instance
- **Test equivalent:** Test endpoints use `getGeminiWrapper()` function
- **Keep?** ADAPT - Use factory function like test endpoints

### Migration Notes
- Keep circuit breaker (resilience)
- Keep all analysis methods (core features)
- Adapt to use GeminiWrapper instead of @ai-sdk/google
- Consider moving prompts to centralized location
- Keep retry logic or use GeminiWrapper's
- Keep JSON parsing logic

---

## Summary Table

| Service | Unique Features | Migration Complexity | Priority |
|---------|----------------|---------------------|----------|
| **image-classifier.ts** | Classification, caching, metadata detection | LOW | HIGH |
| **nutrition-parser.ts** | Validation (calorie, DV, units), confidence tracking | MEDIUM | HIGH |
| **ingredient-parser.ts** | Allergen/preservative/sweetener/color detection | MEDIUM | HIGH |
| **gemini-client.ts** | Circuit breaker, multi-tier methods, dimension analysis | HIGH | HIGH |

---

## Key Differences: Production vs Test

### What Production Has That Test Doesn't

1. **Classification & Routing** (image-classifier)
2. **Data Validation** (nutrition-parser)
3. **Safety Detection** (ingredient-parser - allergens)
4. **Health Analysis** (ingredient-parser - preservatives, sweeteners, colors)
5. **Dimension Analysis** (gemini-client - 5 dimensions)
6. **Circuit Breaker** (gemini-client - resilience)
7. **Multi-Tier Methods** (gemini-client - text extraction, product analysis)
8. **Caching** (image-classifier - in-memory cache)
9. **Position Tracking** (ingredient-parser - ingredient order)
10. **Confidence Thresholds** (all services - quality control)

### What Test Has That Production Doesn't

1. **Vertex AI Integration** (GeminiWrapper)
2. **Centralized Prompts** (extraction-prompts.ts)
3. **Combined Extraction** (single API call for all fields)
4. **Service Account Auth** (more secure)
5. **Proper Tier Quotas** (no 429 errors)
6. **Simpler Implementation** (less abstraction)

---

## Migration Strategy Recommendations

### Phase 1: image-classifier.ts (SIMPLEST)
**Keep:**
- Classification logic
- Caching by image hash
- Confidence threshold
- Metadata detection

**Change:**
- Replace `@ai-sdk/google` with `GeminiWrapper`
- Replace `GEMINI_API_KEY` with Vertex AI credentials
- Adapt retry logic to use GeminiWrapper's built-in retry

**Estimated Effort:** 2-3 hours

---

### Phase 2: nutrition-parser.ts
**Keep:**
- All validation logic (calorie, DV, units)
- Confidence tracking per field
- Validation status enum
- Low confidence detection

**Change:**
- Replace `@ai-sdk/google` with `GeminiWrapper`
- Use centralized prompt from `extraction-prompts.ts`
- Adapt response parsing to match test endpoint format

**Estimated Effort:** 4-6 hours

---

### Phase 3: ingredient-parser.ts
**Keep:**
- ALL detection patterns (allergens, preservatives, sweeteners, colors)
- Position tracking
- Categorization arrays
- Completeness flag
- Helper methods

**Change:**
- Replace `@ai-sdk/google` with `GeminiWrapper`
- Use centralized prompt from `extraction-prompts.ts`
- Adapt response parsing

**Estimated Effort:** 4-6 hours

---

### Phase 4: gemini-client.ts (MOST COMPLEX)
**Keep:**
- Circuit breaker for dimension analysis
- All analysis methods (extractText, analyzeProduct, analyzeDimensions)
- Visual characteristics extraction
- Keywords extraction
- JSON parsing logic

**Change:**
- Replace `@ai-sdk/google` with `GeminiWrapper`
- Move prompts to centralized location
- Replace singleton with factory function
- Adapt retry logic

**Estimated Effort:** 8-12 hours

---

## Total Estimated Migration Effort

- **image-classifier.ts:** 2-3 hours
- **nutrition-parser.ts:** 4-6 hours
- **ingredient-parser.ts:** 4-6 hours
- **gemini-client.ts:** 8-12 hours
- **Testing & Integration:** 8-12 hours

**Total:** 26-39 hours (3-5 days)

---

## Risk Assessment

### Low Risk
- image-classifier.ts (simple, well-isolated)
- Caching logic (no API changes)
- Validation logic (pure functions)

### Medium Risk
- nutrition-parser.ts (validation depends on response format)
- ingredient-parser.ts (detection patterns must work with new responses)

### High Risk
- gemini-client.ts (complex, many dependencies)
- Circuit breaker (must preserve resilience)
- Dimension analysis (critical production feature)

---

## Testing Requirements

### Unit Tests
- All validation functions
- All detection patterns
- Circuit breaker logic
- Caching logic

### Integration Tests
- Each service with GeminiWrapper
- End-to-end extraction flows
- Error handling and retries

### Regression Tests
- Compare old vs new responses
- Validate no functionality lost
- Performance benchmarks

---

## Conclusion

Production services have significant additional functionality beyond test endpoints:

1. **Classification & Routing** - Essential for multi-tier system
2. **Validation & Quality Control** - Critical for data integrity
3. **Safety Features** - Allergen detection is critical
4. **Health Analysis** - Preservatives, sweeteners, colors
5. **Dimension Analysis** - Core production feature
6. **Resilience** - Circuit breaker pattern

**All of these features must be preserved during migration to Vertex AI.**

The migration is not just "swap the API" - it requires careful adaptation to ensure all production features continue working while gaining the benefits of Vertex AI (better quotas, no 429 errors, service account auth).
