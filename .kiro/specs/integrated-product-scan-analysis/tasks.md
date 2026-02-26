# Implementation Plan: Integrated Product Scan and Dimension Analysis

## Overview

This implementation extends the existing multi-tier product identification system with AI-powered dimension analysis capabilities. The system analyzes products across 5 dimensions (Health, Processing, Allergens, Responsibly Produced, Environmental Impact) using Gemini AI, with aggressive caching (30-day TTL) and tier-based access control.

Key implementation approach:
- Reuse existing Multi-Tier Orchestrator, MongoDB cache service, and Supabase repository
- Progressive UI updates: return product info immediately, dimension analysis follows
- Cache-first strategy to minimize AI API costs
- Single AI call analyzes all 5 dimensions simultaneously
- Free tier gets 1 dimension (Health), premium tier gets all 5

## Tasks

- [x] 1. Set up Dimension Cache infrastructure
  - [x] 1.1 Create MongoDB collection schema for dimension_analysis
    - Create collection with unique index on productId
    - Add TTL index on expiresAt (30 days)
    - Add index on lastAccessedAt for access tracking
    - _Requirements: 10.1, 10.2, 10.3, 10.7_
  
  - [x] 1.2 Implement DimensionCacheService class
    - Create src/lib/cache/DimensionCacheService.ts
    - Implement lookup(), store(), updateAccess(), invalidate(), bulkInvalidate() methods
    - Ensure atomic updates for concurrent access
    - _Requirements: 2.1, 2.3, 2.4, 2.5, 13.3, 13.4_
  
  - [ ]* 1.3 Write unit tests for DimensionCacheService
    - Test cache lookup with found/not found scenarios
    - Test TTL expiration logic
    - Test atomic access updates
    - Test bulk invalidation
    - _Requirements: 2.1, 2.2, 10.7_

- [x] 2. Implement Gemini AI client for dimension analysis
  - [x] 2.1 Create GeminiClient class with analyzeProduct method
    - Extended existing src/lib/services/gemini-client.ts
    - Implement analyzeDimensions() method with image and prompt parameters
    - Configure temperature=0.2 for consistent scoring
    - Handle API errors and rate limits
    - _Requirements: 3.1, 3.2, 7.3_
  
  - [x] 2.2 Implement prompt construction logic
    - Create buildDimensionAnalysisPrompt() method
    - Include all 5 dimensions with scoring criteria
    - Include product context (name, brand, category)
    - Request JSON format with specific schema
    - Limit explanations to 100 words per dimension
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6_
  
  - [ ]* 2.3 Write unit tests for GeminiClient
    - Test prompt construction with various product data
    - Test API error handling
    - Test response parsing
    - Mock Gemini API responses
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6_

- [x] 3. Implement Dimension Analyzer Service
  - [x] 3.1 Create DimensionAnalyzer class with cache-first logic
    - Create src/lib/analyzer/DimensionAnalyzer.ts
    - Implement analyze() method with cache lookup first
    - Check cache TTL (30 days) before returning cached results
    - Update lastAccessedAt on cache hits
    - _Requirements: 2.1, 2.2, 2.5, 2.6, 7.1_
  
  - [x] 3.2 Implement fresh analysis logic
    - Implement performFreshAnalysis() method
    - Call Gemini AI with product image and prompt
    - Parse and validate AI response
    - Store result in cache with 30-day TTL
    - _Requirements: 3.1, 3.2, 3.3, 3.5, 3.6_
  
  - [x] 3.3 Implement AI response validation
    - Create parseAIResponse() method to parse JSON
    - Create validateDimensionScores() method
    - Validate all 5 dimensions present
    - Validate scores are 0-100
    - Validate overallConfidence is 0.0-1.0
    - Handle malformed responses gracefully
    - _Requirements: 3.4, 11.5, 12.7_
  
  - [ ]* 3.4 Write property test for cache-first lookup
    - **Property 1: Cache-First Dimension Lookup**
    - **Validates: Requirements 2.1, 7.1**
    - Generate random Product_IDs
    - Verify cache is queried before AI invocation
    - _Requirements: 2.1, 7.1_
  
  - [ ]* 3.5 Write property test for score range validation
    - **Property 13: Score Range Validation**
    - **Validates: Requirements 3.4, 15.3**
    - Generate random scores (-100 to 200)
    - Verify validation accepts 0-100, rejects others
    - _Requirements: 3.4, 15.3_
  
  - [ ]* 3.6 Write unit tests for DimensionAnalyzer
    - Test cache hit scenario (< 30 days)
    - Test cache miss scenario
    - Test expired cache scenario (> 30 days)
    - Test AI error handling
    - Test partial AI responses
    - _Requirements: 2.2, 3.1, 11.2, 11.6_

- [ ] 4. Checkpoint - Ensure dimension analyzer tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement Integration Layer
  - [x] 5.1 Create IntegrationLayer class
    - Create src/lib/integration/IntegrationLayer.ts
    - Coordinate Multi-Tier Orchestrator and Dimension Analyzer
    - Implement processScan() method
    - Pass barcode/image to Multi-Tier Orchestrator unchanged
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  
  - [x] 5.2 Implement progressive response delivery
    - Return product identification results immediately
    - Continue dimension analysis asynchronously
    - Set dimensionStatus to 'processing' initially
    - _Requirements: 1.5, 1.6, 8.4_
  
  - [x] 5.3 Implement tier-based access control
    - Create getUserTier() method to extract tier from auth context
    - Create filterByTier() method
    - Free tier: return only Health dimension, lock others
    - Premium tier: return all 5 dimensions
    - Cache full analysis regardless of tier
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.7_
  
  - [x] 5.4 Implement graceful error handling
    - Return product info even if dimension analysis fails
    - Set dimensionStatus='failed' on errors
    - Include retryable flag in error responses
    - Log errors without blocking product identification
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.7_
  
  - [ ]* 5.5 Write property test for input pass-through
    - **Property 2: Input Pass-Through to Multi-Tier Orchestrator**
    - **Validates: Requirements 1.2**
    - Generate random barcode/image data
    - Verify exact data passed to orchestrator
    - _Requirements: 1.2_
  
  - [ ]* 5.6 Write property test for dimension analysis trigger
    - **Property 3: Dimension Analysis Trigger**
    - **Validates: Requirements 1.4**
    - Generate random Product_IDs
    - Verify Dimension Analyzer invoked for each
    - _Requirements: 1.4_
  
  - [ ]* 5.7 Write property test for tier-based filtering
    - **Property 15: Free Tier Single Dimension**
    - **Property 16: Premium Tier All Dimensions**
    - **Validates: Requirements 5.1, 5.2, 5.4**
    - Generate random user tiers
    - Verify free tier gets 1 dimension, premium gets 5
    - _Requirements: 5.1, 5.2, 5.4_
  
  - [ ]* 5.8 Write unit tests for IntegrationLayer
    - Test progressive response delivery
    - Test tier-based filtering (free vs premium)
    - Test graceful degradation on dimension failure
    - Test upgrade prompt for free tier
    - Test skipDimensionAnalysis parameter
    - _Requirements: 1.5, 5.1, 5.2, 5.6, 8.3, 11.1_

- [x] 6. Extend /api/scan endpoint
  - [x] 6.1 Update scan API route to use IntegrationLayer
    - Modified src/app/api/scan-multi-tier/route.ts
    - Replace direct Multi-Tier Orchestrator calls with IntegrationLayer
    - Add optional skipDimensionAnalysis parameter
    - Add optional pollToken parameter for polling
    - Maintain backward compatibility with existing clients
    - _Requirements: 8.1, 8.2, 8.3, 8.5, 8.7_
  
  - [x] 6.2 Extend ScanResponse interface
    - Add dimensionAnalysis field (optional)
    - Add dimensionStatus field ('completed' | 'processing' | 'failed' | 'skipped')
    - Add dimensionCached field (boolean)
    - Add userTier field ('free' | 'premium')
    - Add availableDimensions field (string array)
    - Add upgradePrompt field (optional string)
    - _Requirements: 8.2, 8.6, 5.5, 5.6_
  
  - [ ]* 6.3 Write integration tests for /api/scan endpoint
    - Test complete scan flow with dimension analysis
    - Test backward compatibility (legacy requests)
    - Test skipDimensionAnalysis parameter
    - Test polling with pollToken
    - Test free tier vs premium tier responses
    - _Requirements: 8.1, 8.2, 8.3, 8.5, 8.7_

- [ ] 7. Implement cache invalidation logic
  - [ ] 7.1 Add cache invalidation on product updates
    - Hook into product update events
    - Call dimensionCache.invalidate() with Product_ID
    - Log invalidation events
    - Handle invalidation failures gracefully (best-effort)
    - _Requirements: 13.1, 13.5, 13.6, 13.7_
  
  - [ ] 7.2 Add cache invalidation on error reports
    - Create handleErrorReport() method in IntegrationLayer
    - Invalidate cache entry for reported Product_ID
    - Log invalidation reason
    - _Requirements: 13.2, 13.6_
  
  - [ ] 7.3 Add manual and bulk invalidation endpoints
    - Create DELETE /internal/dimension-cache/:productId endpoint
    - Create POST /internal/dimension-cache/bulk-invalidate endpoint
    - Support category-based and productIds-based bulk invalidation
    - _Requirements: 13.3, 13.4_
  
  - [ ]* 7.4 Write unit tests for cache invalidation
    - Test invalidation on product update
    - Test invalidation on error report
    - Test manual invalidation
    - Test bulk invalidation by category
    - Test bulk invalidation by product IDs
    - Test fresh analysis after invalidation
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

- [ ] 8. Checkpoint - Ensure integration and invalidation tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Implement metrics and monitoring
  - [ ] 9.1 Add dimension analysis metrics logging
    - Log cache hit/miss rates
    - Log processing times (cached vs fresh)
    - Log user tier distribution
    - Log API costs per dimension analysis
    - Log error rates by error type
    - Log dimension view counts
    - _Requirements: 7.5, 7.6, 14.1, 14.2, 14.3, 14.4, 14.5, 14.6_
  
  - [ ] 9.2 Extend /api/metrics endpoint
    - Add aggregated dimension analysis metrics
    - Include cache hit rates
    - Include average processing times
    - Include tier-based usage counts
    - Include total API costs
    - Include error rates
    - Include dimension popularity
    - _Requirements: 14.7_
  
  - [ ]* 9.3 Write unit tests for metrics logging
    - Test metric collection on cache hit
    - Test metric collection on cache miss
    - Test metric collection on errors
    - Test aggregated metrics calculation
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7_

- [x] 10. Extend database schema
  - [x] 10.1 Create Supabase migration for scan_logs extension
    - Create migration file in supabase/migrations/
    - Add dimension_analysis_cached column (BOOLEAN)
    - Add dimension_analysis_time_ms column (INTEGER)
    - Add dimension_analysis_status column (VARCHAR)
    - Add user_tier column (VARCHAR)
    - Add indexes on dimension_analysis_status and user_tier
    - _Requirements: 6.7, 14.1_
  
  - [ ] 10.2 Update scan logging to include dimension fields
    - Modify scan log creation to include new dimension fields
    - Log dimension cache status
    - Log dimension processing time
    - Log dimension analysis status
    - Log user tier
    - _Requirements: 6.7_

- [ ] 11. Implement SmartBadge UI components
  - [ ] 11.1 Create SmartBadge component
    - Create src/components/SmartBadge.tsx
    - Display dimension name and score
    - Implement color coding (red: 0-33, yellow: 34-66, green: 67-100)
    - Show loading state during analysis
    - Show locked indicator for unavailable dimensions (free tier)
    - Handle missing or incomplete dimension data
    - _Requirements: 9.1, 9.2, 9.3, 9.5, 9.6, 9.7_
  
  - [ ] 11.2 Add tap interaction for detailed explanations
    - Implement onTap handler
    - Display explanation text in modal or expanded view
    - Show keyFactors list
    - _Requirements: 9.4_
  
  - [ ]* 11.3 Write unit tests for SmartBadge component
    - Test color coding for various scores
    - Test loading state display
    - Test locked indicator for free tier
    - Test tap interaction
    - Test graceful handling of missing data
    - _Requirements: 9.2, 9.4, 9.5, 9.6, 9.7_

- [ ] 12. Implement serialization and data integrity
  - [ ] 12.1 Add serialization validation to DimensionAnalyzer
    - Validate Analysis_Result before storing in cache
    - Validate deserialized data from cache
    - Ensure all required fields present
    - Ensure scores remain in 0-100 range
    - Ensure timestamps preserved correctly
    - _Requirements: 15.2, 15.3, 15.4, 15.5_
  
  - [ ]* 12.2 Write property test for serialization round-trip
    - **Property 53: Serialization Round-Trip**
    - **Validates: Requirements 15.1, 15.4**
    - Generate random Analysis_Result objects
    - Serialize to JSON, then deserialize
    - Verify all fields preserved exactly
    - _Requirements: 15.1, 15.4_
  
  - [ ]* 12.3 Write unit tests for serialization error handling
    - Test handling of malformed JSON
    - Test handling of missing fields
    - Test handling of invalid score ranges
    - Test retry logic on serialization errors
    - _Requirements: 15.6_

- [ ] 13. Implement error handling and retry logic
  - [ ] 13.1 Add circuit breaker for Gemini AI calls
    - Extend existing circuit breaker from multi-tier spec
    - Track dimension analysis failures separately
    - Open circuit after 5 consecutive failures
    - Half-open state after 60 seconds
    - _Requirements: 11.2, 11.5_
  
  - [ ] 13.2 Add retry logic for transient failures
    - Implement exponential backoff for AI rate limits
    - Implement linear backoff for cache operations
    - Set timeout for dimension analysis (10 seconds)
    - Return retryable flag in error responses
    - _Requirements: 11.4_
  
  - [ ]* 13.3 Write unit tests for error handling
    - Test circuit breaker behavior
    - Test retry logic with exponential backoff
    - Test timeout handling
    - Test graceful degradation on cache unavailability
    - Test user-friendly error messages
    - _Requirements: 11.2, 11.3, 11.4, 11.5, 11.7_

- [ ] 14. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 15. Integration and wiring
  - [ ] 15.1 Wire IntegrationLayer into API route
    - Instantiate IntegrationLayer with dependencies
    - Pass Multi-Tier Orchestrator instance
    - Pass DimensionAnalyzer instance
    - Pass MetricsService instance
    - _Requirements: 1.1, 8.1_
  
  - [ ] 15.2 Wire DimensionAnalyzer with dependencies
    - Instantiate DimensionCacheService with MongoDB client
    - Instantiate GeminiClient with API key
    - Pass ProductRepository instance
    - _Requirements: 2.1, 3.1_
  
  - [ ] 15.3 Configure environment variables
    - Add GEMINI_API_KEY to environment
    - Add DIMENSION_CACHE_TTL_DAYS (default: 30)
    - Add DIMENSION_ANALYSIS_TIMEOUT_MS (default: 10000)
    - Document all new environment variables
    - _Requirements: 3.1, 3.6_
  
  - [ ]* 15.4 Write end-to-end integration tests
    - Test complete scan flow: barcode → product → dimensions
    - Test free tier user flow
    - Test premium tier user flow
    - Test cache hit scenario
    - Test cache miss scenario
    - Test error scenarios with graceful degradation
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 5.1, 5.2, 11.1_

- [ ] 16. Performance optimization
  - [ ] 16.1 Add performance monitoring
    - Track product identification time
    - Track dimension analysis time (cached vs fresh)
    - Track total response time
    - Alert if cached responses exceed 5 seconds
    - Alert if fresh analysis exceeds 12 seconds
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.7_
  
  - [ ] 16.2 Optimize cache queries
    - Ensure indexes are used for lookups
    - Optimize TTL validation query
    - Batch access timestamp updates if needed
    - _Requirements: 2.5, 6.6_
  
  - [ ]* 16.3 Write performance tests
    - Test cache lookup time (target: <50ms)
    - Test cached scan total time (target: <5s)
    - Test fresh analysis total time (target: <12s)
    - Test concurrent scan handling
    - _Requirements: 2.5, 6.1, 6.2, 6.3_

- [ ] 17. Final checkpoint - Ensure all tests pass and performance targets met
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties (56 total in design)
- Unit tests validate specific examples and edge cases
- The implementation reuses existing Multi-Tier Orchestrator, MongoDB cache, and Supabase repository
- Progressive response delivery ensures fast UI updates (product info within 2s)
- Cache-first strategy minimizes AI API costs (30-day TTL)
- Tier-based access control: free tier gets Health dimension, premium gets all 5
- All dimension analysis is cached regardless of user tier for future premium access
