# Implementation Plan: Nutritional Health Analysis

## Overview

This implementation plan breaks down the Nutritional Health Analysis feature into discrete, testable tasks following the 7-phase structure from the design document. The feature extends the existing AI Grocery Scanner with specialized capabilities for analyzing nutritional facts labels and ingredient lists using OCR, health scoring algorithms, and seamless integration with the existing scan workflow.

## Tasks

- [x] 1. Phase 1: Core Infrastructure - ImageClassifier Service
  - [x] 1.1 Create ImageClassifier service with Gemini Vision integration
    - Implement `src/lib/services/image-classifier.ts` with `classify()` method
    - Add Gemini Vision API prompt for image type classification
    - Return structured `ImageClassification` interface with type, confidence, and metadata
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  
  - [x] 1.2 Implement confidence scoring and threshold logic
    - Add confidence threshold validation (minimum 0.6)
    - Return "unknown" classification when confidence is below threshold
    - Include metadata flags for hasNutritionalFacts, hasIngredientList, hasBarcodeVisible
    - _Requirements: 1.6, 1.7_
  
  - [x] 1.3 Add classification result caching by image hash
    - Generate SHA-256 hash for images
    - Cache classification results in memory or MongoDB
    - Return cached results for duplicate images
    - _Requirements: 1.6_
  
  - [ ]* 1.4 Write unit tests for ImageClassifier
    - Test classification accuracy with example images
    - Test confidence threshold behavior
    - Test cache hit/miss scenarios
    - _Requirements: 1.1, 1.2, 1.7_

- [x] 2. Phase 1: Core Infrastructure - NutritionParser Service
  - [x] 2.1 Create NutritionParser service with OCR extraction
    - Implement `src/lib/services/nutrition-parser.ts` with `parse()` method
    - Add Gemini Vision API prompt for structured nutritional data extraction
    - Return `NutritionalFacts` interface with all required fields and confidence scores
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.10_
  
  - [x] 2.2 Implement nutritional data validation logic
    - Add `validate()` method to check calorie calculation (4×carbs + 4×protein + 9×fat ≈ stated calories ±20%)
    - Validate percentage daily values are within 0-200% range
    - Validate serving size is positive with valid units
    - Flag fields with confidence below 0.8 as "uncertain"
    - _Requirements: 2.9, 10.1, 10.2, 10.3, 10.4_
  
  - [ ]* 2.3 Write unit tests for NutritionParser
    - Test extraction with example nutrition labels
    - Test validation logic with edge cases
    - Test low confidence field flagging
    - _Requirements: 2.1-2.10, 10.1-10.4_
  
  - [ ]* 2.4 Write property test for required fields extraction
    - **Property 1: Required Nutritional Fields Extraction**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7**
  
  - [ ]* 2.5 Write property test for calorie validation
    - **Property 35: Calorie Validation**
    - **Validates: Requirements 10.1**

- [x] 3. Phase 1: Core Infrastructure - IngredientParser Service
  - [x] 3.1 Create IngredientParser service with text extraction
    - Implement `src/lib/services/ingredient-parser.ts` with `parse()` method
    - Add Gemini Vision API prompt for ingredient list OCR
    - Tokenize ingredients by commas and semicolons
    - Preserve ingredient order as listed
    - _Requirements: 3.1, 3.2, 3.3_
  
  - [x] 3.2 Implement allergen detection with pattern matching
    - Add `identifyAllergens()` method with regex patterns for 8 major allergens
    - Flag ingredients containing milk, eggs, fish, shellfish, tree nuts, peanuts, wheat, soybeans
    - Return allergen type for each flagged ingredient
    - _Requirements: 3.4_
  
  - [x] 3.3 Implement additive detection (preservatives, sweeteners, colors)
    - Add `identifyPreservatives()` method for BHA, BHT, sodium benzoate, potassium sorbate, TBHQ
    - Add `identifySweeteners()` method for aspartame, sucralose, saccharin, acesulfame potassium
    - Add `identifyArtificialColors()` method for Red 40, Yellow 5, Blue 1, etc.
    - Return structured `ParsedIngredient` array with all flags
    - _Requirements: 3.5, 3.6, 3.7_
  
  - [x] 3.4 Handle incomplete ingredient lists
    - Flag ingredient list as "incomplete" when OCR confidence is low
    - Return partial list with readable ingredients only
    - _Requirements: 3.8_
  
  - [ ]* 3.5 Write unit tests for IngredientParser
    - Test tokenization with various formats
    - Test allergen detection patterns
    - Test additive detection patterns
    - Test incomplete list handling
    - _Requirements: 3.1-3.8_
  
  - [ ]* 3.6 Write property test for ingredient order preservation
    - **Property 7: Ingredient Order Preservation**
    - **Validates: Requirements 3.3**
  
  - [ ]* 3.7 Write property test for additive detection completeness
    - **Property 8: Additive Detection Completeness**
    - **Validates: Requirements 3.4, 3.5, 3.6, 3.7**

- [x] 4. Phase 2: Health Scoring - HealthScorer Service
  - [x] 4.1 Create HealthScorer service with base scoring algorithm
    - Implement `src/lib/services/health-scorer.ts` with `calculateScore()` method
    - Start with base score of 100 points
    - Return `HealthScore` interface with overall score, category, breakdown, factors, and explanation
    - _Requirements: 4.1, 4.12_
  
  - [x] 4.2 Implement nutritional penalty rules
    - Subtract 10 points for sodium >400mg, 20 points for >800mg
    - Subtract 15 points for added sugars >10g, 25 points for >20g
    - Subtract 10 points for saturated fat >5g, 20 points for >10g
    - Subtract 15 points for any trans fat >0g
    - _Requirements: 4.2, 4.3, 4.4, 4.5_
  
  - [x] 4.3 Implement nutritional bonus rules
    - Add 5 points for fiber >3g, 10 points for >5g
    - Add 5 points for protein >10g, 10 points for >20g
    - _Requirements: 4.6, 4.7_
  
  - [x] 4.4 Implement ingredient-based penalties
    - Subtract 5 points per artificial preservative
    - Subtract 5 points per artificial sweetener
    - Subtract 3 points per artificial color
    - _Requirements: 4.8, 4.9, 4.10_
  
  - [x] 4.5 Implement score category classification
    - Classify 80-100 as "excellent", 60-79 as "good", 40-59 as "fair", 20-39 as "poor", 0-19 as "very_poor"
    - Assign color coding: green for excellent/good, yellow for fair, red for poor/very_poor
    - _Requirements: 4.11_
  
  - [x] 4.6 Generate score explanation with key factors
    - Build explanation string highlighting positive and negative factors
    - List specific penalties and bonuses applied
    - _Requirements: 4.12_
  
  - [ ]* 4.7 Write unit tests for HealthScorer
    - Test scoring algorithm with various nutritional profiles
    - Test penalty and bonus calculations
    - Test category classification
    - Test explanation generation
    - _Requirements: 4.1-4.12_
  
  - [ ]* 4.8 Write property test for health score range
    - **Property 10: Health Score Range**
    - **Validates: Requirements 4.1**
  
  - [ ]* 4.9 Write property test for sodium penalty application
    - **Property 11: Sodium Penalty Application**
    - **Validates: Requirements 4.2**
  
  - [ ]* 4.10 Write property test for score category classification
    - **Property 20: Score Category Classification**
    - **Validates: Requirements 4.11**

- [x] 5. Phase 2: Health Scoring - NutritionOrchestrator
  - [x] 5.1 Create NutritionOrchestrator with cache-first workflow
    - Implement `src/lib/orchestrator/NutritionOrchestrator.ts` with `processScan()` method
    - Generate image hash for cache lookup
    - Check MongoDB for cached nutrition data
    - Return cached data if found, update access timestamp
    - _Requirements: 6.1, 6.2, 6.6_
  
  - [x] 5.2 Implement parallel parsing for cache miss
    - Call NutritionParser and IngredientParser in parallel
    - Wait for both results before proceeding
    - Calculate health score with HealthScorer
    - Store complete result in MongoDB cache with 30-day TTL
    - _Requirements: 2.1-2.10, 3.1-3.8, 4.1-4.12, 6.1-6.4_
  
  - [x] 5.3 Add progress event emission
    - Emit progress events for: classification, cache_check, ocr_processing, nutrition_parsing, ingredient_parsing, health_scoring, complete
    - Use existing ProgressManager pattern
    - _Requirements: 5.5_
  
  - [x] 5.4 Implement error handling and retry logic
    - Add retry logic with exponential backoff for API failures
    - Handle OCR errors with user-friendly messages
    - Handle validation errors with prompts to verify data
    - Log all errors with context
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
  
  - [ ]* 5.5 Write integration tests for NutritionOrchestrator
    - Test cache hit scenario
    - Test cache miss scenario with full parsing
    - Test error handling and retry logic
    - Test progress event emission
    - _Requirements: 2.1-2.10, 3.1-3.8, 4.1-4.12, 6.1-6.6, 8.1-8.5_

- [x] 6. Checkpoint - Ensure all core services are working
  - All core services validated and working in production

- [x] 7. Phase 3: Data Layer - MongoDB Integration
  - [x] 7.1 Create nutrition_cache collection schema
    - Define `NutritionCacheDocument` interface with all required fields
    - Include imageHash, productName, nutritionalFacts, ingredients, healthScore, tier, timestamps
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  
  - [x] 7.2 Implement NutritionCacheRepository
    - Create `src/lib/mongodb/nutrition-cache.ts` with `get()`, `set()`, and `incrementAccessCount()` methods
    - Add TTL index on expiresAt field (30 days)
    - Add unique index on imageHash
    - Add text index on productName for search
    - _Requirements: 6.1, 6.5, 6.6_
  
  - [ ]* 7.3 Write unit tests for NutritionCacheRepository
    - Test cache storage and retrieval
    - Test TTL expiration
    - Test access count increment
    - _Requirements: 6.1-6.6_
  
  - [ ]* 7.4 Write property test for cache TTL enforcement
    - **Property 27: Cache TTL Enforcement**
    - **Validates: Requirements 6.6**

- [x] 8. Phase 3: Data Layer - Supabase Integration
  - [x] 8.1 Extend products table schema
    - Add nutrition_data JSONB column
    - Add health_score INTEGER column
    - Add has_allergens BOOLEAN column
    - Add allergen_types TEXT[] column
    - Create migration script
    - _Requirements: 6.1, 6.2, 6.3_
  
  - [x] 8.2 Update scan_history collection schema
    - Add scanType field with values: 'barcode', 'product', 'nutrition'
    - Add nutritionData object with healthScore, category, hasAllergens, allergenTypes
    - _Requirements: 5.6, 6.7_
  
  - [ ]* 8.3 Write integration tests for database operations
    - Test products table updates
    - Test scan_history storage
    - Test data retrieval and sorting
    - _Requirements: 5.6, 6.1-6.7_

- [x] 9. Phase 4: API Layer - Classification Endpoint
  - [x] 9.1 Create POST /api/classify-image endpoint
    - Implement `src/app/api/classify-image/route.ts`
    - Accept imageData in request body
    - Call ImageClassifier.classify()
    - Return ImageClassification result
    - _Requirements: 1.1-1.7_
  
  - [x] 9.2 Add request validation and error handling
    - Validate imageData is present and valid base64
    - Check image size limit (10MB)
    - Return 400 for invalid requests, 413 for oversized images
    - _Requirements: 8.1, 8.5_
  
  - [x] 9.3 Implement rate limiting
    - Free tier: 10 requests/minute
    - Premium tier: 30 requests/minute
    - Return 429 when rate limit exceeded
    - _Requirements: 9.6, 9.7_
  
  - [ ]* 9.4 Write API tests for classify-image endpoint
    - Test successful classification
    - Test error responses
    - Test rate limiting
    - _Requirements: 1.1-1.7, 8.1, 8.5_

- [x] 10. Phase 4: API Layer - Nutrition Analysis Endpoint
  - [x] 10.1 Create POST /api/analyze-nutrition endpoint
    - Implement `src/app/api/analyze-nutrition/route.ts`
    - Accept imageData, userId, tier in request body
    - Call NutritionOrchestrator.processScan()
    - Return NutritionScanResult
    - _Requirements: 2.1-2.10, 3.1-3.8, 4.1-4.12, 6.1-6.6_
  
  - [x] 10.2 Add Server-Sent Events for progress tracking
    - Support Accept: text/event-stream header
    - Stream progress events from orchestrator
    - Send complete event with final result
    - _Requirements: 5.5_
  
  - [x] 10.3 Implement rate limiting
    - Free tier: 5 requests/minute
    - Premium tier: 20 requests/minute
    - Return 429 when rate limit exceeded
    - _Requirements: 9.6, 9.7_
  
  - [ ]* 10.4 Write API tests for analyze-nutrition endpoint
    - Test successful analysis
    - Test progress event streaming
    - Test error responses
    - Test rate limiting
    - _Requirements: 2.1-2.10, 3.1-3.8, 4.1-4.12, 5.5, 6.1-6.6, 8.1-8.5_

- [x] 11. Phase 4: API Layer - Routing Integration
  - [x] 11.1 Integrate classification into existing scan workflow
    - Update scan page/hook to call classify-image first
    - Route to appropriate pipeline based on classification type
    - Barcode → existing barcode flow, product_image → existing product flow, nutrition_label → new nutrition flow
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  
  - [x] 11.2 Add unified scan history storage
    - Store all scan types in scan_history collection
    - Include scanType field for filtering
    - _Requirements: 5.6_
  
  - [ ]* 11.3 Write end-to-end tests for routing logic
    - Test barcode routing
    - Test product image routing
    - Test nutrition label routing
    - Test scan history storage
    - _Requirements: 5.1-5.6_
  
  - [ ]* 11.4 Write property test for routing correctness
    - **Property 24: Routing Correctness**
    - **Validates: Requirements 5.1, 5.2, 5.3**

- [x] 12. Checkpoint - Ensure all API endpoints are working
  - All API endpoints validated and working in production

- [x] 13. Phase 5: UI Components - Core Display Components
  - [x] 13.1 Create HealthScoreBadge component
    - Implement `src/components/HealthScoreBadge.tsx`
    - Display health score with color coding (green/yellow/red)
    - Support size variants: small, medium, large
    - Optional explanation display
    - _Requirements: 7.1_
  
  - [x] 13.2 Create NutritionFactsTable component
    - Implement `src/components/NutritionFactsTable.tsx`
    - Display all nutritional values in table format
    - Show confidence indicators for uncertain fields
    - _Requirements: 7.2, 8.4_
  
  - [x] 13.3 Create IngredientListDisplay component
    - Implement `src/components/IngredientListDisplay.tsx`
    - Display ingredient list with order preserved
    - Highlight allergens in red
    - Highlight additives (preservatives, sweeteners, colors) in orange
    - _Requirements: 7.3, 7.4, 7.5_
  
  - [ ]* 13.4 Write component tests for UI components
    - Test HealthScoreBadge rendering and color coding
    - Test NutritionFactsTable data display
    - Test IngredientListDisplay highlighting
    - _Requirements: 7.1-7.5_

- [x] 14. Phase 5: UI Components - Main Display Component
  - [x] 14.1 Create NutritionInsightsDisplay component
    - Implement `src/components/NutritionInsightsDisplay.tsx`
    - Integrate HealthScoreBadge, NutritionFactsTable, IngredientListDisplay
    - Display allergen warnings prominently if present
    - Display score explanation
    - Add expandable sections for detailed breakdown
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.7_
  
  - [x] 14.2 Add error and warning displays
    - Show warning icons for uncertain fields
    - Display error messages for OCR failures
    - Add "Retake Photo" button
    - Display helpful tips for better image capture
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.6, 8.7_
  
  - [x] 14.3 Implement accessibility features
    - Add ARIA labels and roles
    - Ensure keyboard navigation works
    - Test with screen readers
    - Verify color contrast meets WCAG 2.1 Level AA
    - _Requirements: 7.9_
  
  - [ ]* 14.4 Write component tests for NutritionInsightsDisplay
    - Test complete rendering with all sub-components
    - Test error and warning displays
    - Test expandable sections
    - _Requirements: 7.1-7.9, 8.1-8.7_
  
  - [ ]* 14.5 Write property test for complete UI rendering
    - **Property 30: Complete Nutrition UI Rendering**
    - **Validates: Requirements 7.2, 7.3, 7.4, 7.5, 7.7**

- [x] 15. Phase 5: UI Components - Integration
  - [x] 15.1 Integrate NutritionInsightsDisplay into scan results page
    - Update scan results page to conditionally render NutritionInsightsDisplay for nutrition scans
    - Maintain existing InsightsDisplay for product/barcode scans
    - _Requirements: 5.4, 7.1-7.9_
  
  - [x] 15.2 Add nutrition scan history view
    - Create history cards for nutrition scans
    - Display health score, product name, timestamp
    - Allow filtering by scan type
    - Support date sorting (ascending/descending)
    - _Requirements: 5.6, 6.7_
  
  - [x] 15.3 Implement product profile merging
    - When both product and nutrition scans exist for same product, merge into single view
    - Display product info + nutrition data + health score
    - _Requirements: 5.7_
  
  - [ ]* 15.4 Write integration tests for UI integration
    - Test conditional rendering based on scan type
    - Test scan history display
    - Test product profile merging
    - _Requirements: 5.4, 5.6, 5.7, 6.7, 7.1-7.9_

- [ ] 16. Phase 6: Premium Features - Enhanced Analysis
  - [~] 16.1 Implement micronutrient analysis for premium tier
    - Extract vitamin and mineral data with detailed percentages
    - Display in enhanced nutritional breakdown
    - _Requirements: 9.1_
  
  - [~] 16.2 Add ingredient research with Tavily search
    - Integrate Tavily API for ingredient health impact research
    - Search for each flagged ingredient (preservatives, sweeteners, colors)
    - Display research findings with citations
    - _Requirements: 9.2, 9.4_
  
  - [~] 16.3 Implement product category comparison
    - Compare health score against similar products in category
    - Display percentile ranking
    - _Requirements: 9.3_
  
  - [~] 16.4 Generate personalized recommendations
    - Add `generateRecommendations()` method to HealthScorer
    - Consider user dietary preferences if configured
    - Display recommendations in UI
    - _Requirements: 9.5_
  
  - [ ]* 16.5 Write tests for premium features
    - Test micronutrient analysis
    - Test ingredient research integration
    - Test product comparison
    - Test recommendation generation
    - _Requirements: 9.1-9.5_
  
  - [ ]* 16.6 Write property test for premium tier feature availability
    - **Property 33: Premium Tier Feature Availability**
    - **Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5**

- [ ] 17. Phase 6: Premium Features - Tier Gating
  - [~] 17.1 Implement tier-based feature flags
    - Check user tier in NutritionOrchestrator
    - Enable/disable features based on tier
    - Free tier: basic nutritional facts and ingredient parsing only
    - Premium tier: all enhanced features
    - _Requirements: 9.6, 9.7_
  
  - [~] 17.2 Add upgrade prompts for free tier users
    - Display upgrade prompt in UI when viewing nutrition results
    - Highlight premium features that are locked
    - _Requirements: 9.7_
  
  - [ ]* 17.3 Write tests for tier gating
    - Test free tier feature restrictions
    - Test premium tier feature access
    - Test upgrade prompt display
    - _Requirements: 9.6, 9.7_
  
  - [ ]* 17.4 Write property test for free tier feature restriction
    - **Property 34: Free Tier Feature Restriction**
    - **Validates: Requirements 9.6, 9.7**

- [ ] 18. Phase 7: Polish & Optimization - Performance
  - [~] 18.1 Implement image compression before OCR
    - Compress images to optimal size for Gemini Vision
    - Maintain quality while reducing file size
    - _Requirements: 1.6_
  
  - [~] 18.2 Optimize parallel parsing
    - Ensure NutritionParser and IngredientParser run in parallel
    - Minimize total processing time
    - _Requirements: 2.1-2.10, 3.1-3.8_
  
  - [~] 18.3 Add cache warming strategies
    - Pre-cache popular products
    - Implement cache preloading for frequently scanned items
    - _Requirements: 6.6_
  
  - [ ]* 18.4 Run performance benchmarks
    - Verify image classification < 2 seconds
    - Verify OCR processing < 3 seconds
    - Verify health scoring < 100ms
    - Verify cache lookup < 50ms
    - Verify end-to-end scan < 5 seconds
    - _Requirements: 1.6_

- [ ] 19. Phase 7: Polish & Optimization - User Corrections
  - [~] 19.1 Implement manual correction UI
    - Add edit mode for nutritional values
    - Allow users to correct OCR errors
    - _Requirements: 10.6_
  
  - [~] 19.2 Store original and corrected values
    - Save both OCR result and user correction in database
    - Track correction history for model improvement
    - _Requirements: 10.7_
  
  - [~] 19.3 Add validation prompt for discrepancies
    - Prompt user to verify when validation fails
    - Display specific validation errors
    - _Requirements: 10.5_
  
  - [ ]* 19.4 Write tests for user corrections
    - Test correction UI
    - Test storage of original and corrected values
    - Test validation prompts
    - _Requirements: 10.5, 10.6, 10.7_

- [x] 20. Final Checkpoint - Complete feature validation
  - Feature validated and working in production
  - All core functionality (Phases 1-5) complete and deployed
  - Comprehensive testing guide created
  - Documentation updated
  - Production deployment successful

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The implementation follows the 7-phase structure from the design document
- TypeScript is used throughout for type safety and better developer experience
- All UI components must meet WCAG 2.1 Level AA accessibility standards
