# Implementation Plan: Multi-Tier Product Identification System

## Overview

This implementation plan breaks down the multi-tier product identification system into discrete coding tasks. The system implements a progressive 4-tier fallback strategy: (1) Direct barcode scanning with ML Kit, (2) Visual text extraction with Gemini OCR, (3) Discovery search via Barcode Lookup API, and (4) Comprehensive image analysis with Gemini AI. The implementation prioritizes incremental validation through property-based tests and unit tests at each stage.

## Tasks

- [x] 1. Set up project infrastructure and data models
  - [x] 1.1 Create Supabase database schema for products, error reports, and scan logs
    - Create products table with barcode, name, brand, size, category, metadata fields
    - Create error_reports table with scan context and user feedback fields
    - Create scan_logs table for performance tracking
    - Add indexes for barcode, name/brand, category, and full-text search
    - _Requirements: 1.5, 5.2, 14.1_
  
  - [x] 1.2 Create MongoDB collections and indexes for cache entries
    - Create cache_entries collection with key, keyType, productData, tier, confidence fields
    - Add unique index on (key, keyType)
    - Add TTL index on expiresAt field for 90-day expiration
    - Add index on lastAccessedAt for cache management
    - _Requirements: 7.1, 7.2, 7.5_
  
  - [x] 1.3 Create TypeScript interfaces and types for all data models
    - Define ScanRequest, ScanResponse, ProductData, ErrorDetails interfaces
    - Define ProductMetadata, CacheEntry, ErrorReport interfaces
    - Define ImageData type and barcode format enums
    - _Requirements: 1.2, 2.4, 4.3_
  
  - [ ]* 1.4 Write property test for data model interfaces
    - **Property 6: Structured Metadata Output**
    - **Validates: Requirements 2.4, 4.3**

- [x] 2. Implement Cache Service with MongoDB
  - [x] 2.1 Create Cache Service class with lookup, store, and invalidate methods
    - Implement cache lookup by barcode and image hash
    - Implement cache storage with tier, timestamp, and confidence score
    - Implement cache invalidation by key
    - Add access count tracking and lastAccessedAt updates
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  
  - [ ]* 2.2 Write property tests for Cache Service
    - **Property 2: Cache-First Lookup**
    - **Property 29: Result Caching by Key Type**
    - **Property 31: Cache Access Timestamp Update**
    - **Validates: Requirements 1.3, 7.1, 7.2, 7.4, 10.2**
  
  - [ ]* 2.3 Write unit tests for Cache Service
    - Test cache hit and miss scenarios
    - Test TTL expiration logic
    - Test concurrent access patterns
    - Test MongoDB connection failures
    - _Requirements: 7.5, 7.7_
  
  - [ ]* 2.4 Write property test for cache performance
    - **Property 34: Cache Lookup Performance**
    - **Validates: Requirements 7.7**

- [x] 3. Implement Product Repository with Supabase
  - [x] 3.1 Create Product Repository class with query and save methods
    - Implement query by barcode
    - Implement query by metadata (name, brand, size)
    - Implement full-text search for product matching
    - Implement product save and update with transaction support
    - Add barcode association updates
    - _Requirements: 1.5, 2.5, 3.4_
  
  - [ ]* 3.2 Write unit tests for Product Repository
    - Test barcode queries
    - Test metadata queries with fuzzy matching
    - Test transaction rollback on failures
    - Test Supabase connection errors
    - _Requirements: 12.4, 12.5_
  
  - [ ]* 3.3 Write property test for repository fallback
    - **Property 4: Repository Fallback**
    - **Validates: Requirements 1.5**

- [-] 4. Implement Visual Extractor service with Gemini OCR
  - [x] 4.1 Create Gemini API client for OCR text extraction
    - Implement authentication with API key
    - Implement text extraction endpoint call
    - Add error handling for API failures and rate limits
    - Implement response parsing
    - _Requirements: 2.2, 8.3_
  
  - [x] 4.2 Create Visual Extractor service class
    - Implement extractText method accepting ImageData
    - Parse extracted text into ProductMetadata structure
    - Extract product name, brand, size, and keywords
    - Return structured metadata with processing time
    - _Requirements: 2.3, 2.4_
  
  - [ ]* 4.3 Write property tests for Visual Extractor
    - **Property 6: Structured Metadata Output**
    - **Property 7: Repository Query After Extraction**
    - **Validates: Requirements 2.4, 2.5**
  
  - [ ]* 4.4 Write unit tests for Visual Extractor
    - Test text extraction with various image qualities
    - Test metadata parsing edge cases
    - Test Gemini API error handling
    - Test timeout scenarios
    - _Requirements: 2.7_
  
  - [ ]* 4.5 Write property test for Tier 2 performance
    - **Property 9: Tier 2 Performance**
    - **Validates: Requirements 2.7, 9.3**

- [x] 5. Implement Discovery Service with Barcode Lookup API
  - [x] 5.1 Create Barcode Lookup API client with rate limiting
    - Implement authentication with API key
    - Implement rate limiter (100 requests per minute)
    - Implement exponential backoff for rate limit responses
    - Add circuit breaker pattern for API failures
    - _Requirements: 8.1, 8.3_
  
  - [x] 5.2 Create Discovery Service class
    - Implement searchProduct method accepting ProductMetadata
    - Query Barcode Lookup API with product name, brand, size
    - Parse API responses and extract barcode values
    - Validate barcode formats (UPC, EAN, etc.)
    - Select highest confidence barcode from multiple results
    - _Requirements: 3.2, 3.3, 3.6, 8.2_
  
  - [x] 5.3 Implement barcode discovery persistence
    - Save discovered barcodes to Product Repository
    - Update cache with barcode associations
    - Handle transaction failures with rollback
    - _Requirements: 3.4, 3.5, 12.2_
  
  - [ ]* 5.4 Write property tests for Discovery Service
    - **Property 11: Discovery API Parameters**
    - **Property 12: Barcode Format Validation**
    - **Property 13: Discovered Barcode Persistence**
    - **Property 14: Highest Confidence Selection**
    - **Validates: Requirements 3.2, 3.3, 3.4, 3.5, 3.6, 8.2**
  
  - [ ]* 5.5 Write unit tests for Discovery Service
    - Test API authentication
    - Test rate limit handling
    - Test exponential backoff logic
    - Test barcode validation edge cases
    - Test API error scenarios
    - _Requirements: 8.4, 8.5, 8.6_
  
  - [ ]* 5.6 Write property test for Tier 3 performance
    - **Property 15: Tier 3 Performance**
    - **Validates: Requirements 3.7, 9.4**
  
  - [ ]* 5.7 Write property test for API response caching
    - **Property 39: API Response Caching**
    - **Validates: Requirements 8.7**

- [-] 6. Implement Image Analyzer service with Gemini AI
  - [x] 6.1 Create Gemini AI client for comprehensive image analysis
    - Implement authentication with API key
    - Implement image analysis endpoint call
    - Add structured prompt for product extraction
    - Parse JSON response into ProductMetadata
    - Extract visual characteristics (colors, packaging, shape)
    - _Requirements: 4.2, 4.3_
  
  - [x] 6.2 Create Image Analyzer service class
    - Implement analyzeImage method accepting ImageData
    - Calculate and return confidence score
    - Handle low-quality images
    - Return structured metadata with visual characteristics
    - _Requirements: 4.4_
  
  - [ ]* 6.3 Write property tests for Image Analyzer
    - **Property 8: Confidence Score Inclusion**
    - **Property 16: Low Confidence Retake Prompt**
    - **Property 17: Image Hash Caching**
    - **Validates: Requirements 2.6, 4.4, 4.5, 4.6, 13.1**
  
  - [ ]* 6.4 Write unit tests for Image Analyzer
    - Test confidence score calculation
    - Test low confidence scenarios (<0.6)
    - Test Gemini AI error handling
    - Test response parsing edge cases
    - _Requirements: 4.5_
  
  - [ ]* 6.5 Write property test for Tier 4 performance
    - **Property 18: Tier 4 Performance**
    - **Validates: Requirements 4.7, 9.5**

- [ ] 7. Checkpoint - Ensure all service tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [-] 8. Implement Scan Orchestrator with tier selection logic
  - [x] 8.1 Create Scan Orchestrator class with tier coordination
    - Implement scan method accepting ScanRequest
    - Add tier selection logic (Tier 1 → 2 → 3 → 4)
    - Implement cache lookup before repository queries
    - Add timeout handling per tier
    - Track tier usage and processing times
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  
  - [x] 8.2 Implement Tier 1 barcode identification flow
    - Query Cache Service by barcode
    - Query Product Repository if cache miss
    - Return result with tier=1 and confidence=1.0
    - Cache result after repository lookup
    - _Requirements: 1.3, 1.4, 1.5, 1.6_
  
  - [x] 8.3 Implement Tier 2 visual text extraction flow
    - Invoke Visual Extractor with image
    - Query Product Repository with extracted metadata
    - Trigger Discovery Service asynchronously if product found
    - Return result with tier=2 and calculated confidence
    - _Requirements: 2.1, 2.5, 2.6_
  
  - [x] 8.4 Implement Tier 3 discovery search flow
    - Invoke Discovery Service with product metadata
    - Save discovered barcode to Product Repository
    - Update Cache Service with barcode association
    - Return result with tier=3 and calculated confidence
    - _Requirements: 3.1, 3.4, 3.5_
  
  - [x] 8.5 Implement Tier 4 comprehensive analysis flow
    - Invoke Image Analyzer with full image
    - Check confidence threshold (0.6)
    - Prompt user to retake if confidence too low
    - Cache result by image hash
    - Return result with tier=4 and AI confidence
    - _Requirements: 4.1, 4.5, 4.6_
  
  - [ ]* 8.6 Write property tests for Scan Orchestrator tier logic
    - **Property 1: Barcode Pass-Through**
    - **Property 2: Cache-First Lookup**
    - **Property 4: Repository Fallback**
    - **Property 10: Discovery Trigger**
    - **Property 25: Tier 1 Priority**
    - **Property 26: Sequential Tier Fallback**
    - **Property 27: Short-Circuit on Success**
    - **Validates: Requirements 1.2, 1.3, 1.5, 3.1, 6.1, 6.2, 6.3, 6.4, 6.5, 10.2**
  
  - [ ]* 8.7 Write property tests for performance SLAs
    - **Property 3: Cached Result Performance**
    - **Property 5: Repository Result Performance**
    - **Validates: Requirements 1.4, 1.6, 9.1, 9.2**
  
  - [ ]* 8.8 Write unit tests for Scan Orchestrator
    - Test tier timeout scenarios
    - Test fallback chain with mocked failures
    - Test short-circuit on success
    - Test concurrent tier processing
    - _Requirements: 6.5, 9.6_

- [x] 9. Implement confidence scoring and user feedback
  - [x] 9.1 Add confidence score calculation to Scan Orchestrator
    - Set confidence to 1.0 for Tier 1 barcode matches
    - Calculate confidence from metadata match quality for Tier 2/3
    - Use Image Analyzer confidence for Tier 4
    - Include confidence in all ScanResponse objects
    - _Requirements: 13.2, 13.3, 13.4_
  
  - [x] 9.2 Add user feedback mechanisms
    - Display warnings for confidence < 0.8
    - Include tier information in responses
    - Support re-identification requests
    - _Requirements: 13.5, 13.6, 13.7_
  
  - [ ]* 9.3 Write property tests for confidence scoring
    - **Property 8: Confidence Score Inclusion**
    - **Property 50: Tier-Based Confidence Calculation**
    - **Property 51: Low Confidence Warning**
    - **Property 52: Response Transparency**
    - **Validates: Requirements 2.6, 4.4, 13.1, 13.2, 13.3, 13.4, 13.5, 13.6**
  
  - [ ]* 9.4 Write unit tests for user feedback
    - Test confidence warning display
    - Test re-identification flow
    - Test tier transparency
    - _Requirements: 13.7_

- [x] 10. Implement Error Reporter service
  - [x] 10.1 Create Error Reporter service class
    - Implement reportError method accepting ErrorReport
    - Store error context (image, product, feedback) to Supabase
    - Invalidate cache entries for incorrect identifications
    - Flag products for manual review
    - Trigger Tier 4 re-analysis for alternative identification
    - _Requirements: 5.2, 5.3, 5.4, 5.5, 5.6_
  
  - [ ]* 10.2 Write property tests for Error Reporter
    - **Property 19: Error Reporting Availability**
    - **Property 20: Error Context Recording**
    - **Property 21: Cache Invalidation on Error**
    - **Property 22: Product Flagging on Error**
    - **Property 23: Alternative Identification on Error**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6**
  
  - [ ]* 10.3 Write unit tests for Error Reporter
    - Test error recording with various contexts
    - Test cache invalidation logic
    - Test product flagging
    - Test Tier 4 re-analysis trigger
    - _Requirements: 5.7_
  
  - [ ]* 10.4 Write property test for error recording performance
    - **Property 24: Error Recording Performance**
    - **Validates: Requirements 5.7**

- [x] 11. Implement data consistency and transaction management
  - [x] 11.1 Add transaction support to Scan Orchestrator
    - Implement multi-store update transactions
    - Add rollback logic for failed updates
    - Ensure Product Repository and Cache Service updates are atomic
    - _Requirements: 12.4, 12.5_
  
  - [x] 11.2 Implement cache invalidation across stores
    - Invalidate MongoDB cache on product updates
    - Invalidate in-memory caches on error reports
    - Ensure consistency between Supabase and MongoDB
    - _Requirements: 7.6, 12.3_
  
  - [x] 11.3 Add retry logic for database operations
    - Implement exponential backoff (100ms, 200ms, 400ms)
    - Retry up to 3 times for failed operations
    - Log retry attempts and final failures
    - _Requirements: 12.7_
  
  - [ ]* 11.4 Write property tests for data consistency
    - **Property 44: Dual-Store Consistency**
    - **Property 45: Multi-Store Cache Invalidation**
    - **Property 46: Transactional Multi-Store Updates**
    - **Property 47: Transaction Rollback on Failure**
    - **Property 49: Database Operation Retry**
    - **Validates: Requirements 12.1, 12.2, 12.3, 12.4, 12.5, 12.7**
  
  - [ ]* 11.5 Write unit tests for transaction management
    - Test transaction commit scenarios
    - Test rollback on failures
    - Test retry logic with exponential backoff
    - Test consistency error logging
    - _Requirements: 12.6_
  
  - [ ]* 11.6 Write property test for cache invalidation
    - **Property 33: Cache Invalidation on Product Update**
    - **Validates: Requirements 7.6**

- [ ] 12. Checkpoint - Ensure backend services are complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. Implement Barcode Scanner frontend component with ML Kit
  - [x] 13.1 Create Barcode Scanner React component
    - Initialize ML Kit barcode detection on mount
    - Set up camera frame processing
    - Configure supported barcode formats (UPC-A, UPC-E, EAN-8, EAN-13, Code-39, Code-93, Code-128, ITF, QR)
    - _Requirements: 11.1, 11.2, 1.7_
  
  - [x] 13.2 Add barcode detection UI feedback
    - Highlight detected barcodes in camera view
    - Provide haptic feedback on successful detection
    - Display barcode value overlay
    - _Requirements: 11.3, 11.4_
  
  - [x] 13.3 Implement ML Kit error handling and fallback
    - Handle initialization failures gracefully
    - Fall back to Tier 2 if ML Kit unavailable
    - Release ML Kit resources on component unmount
    - _Requirements: 11.5, 11.6, 11.7_
  
  - [x] 13.4 Connect Barcode Scanner to Scan Orchestrator
    - Send detected barcode to backend API
    - Handle 2-second timeout for Tier 2 fallback
    - Display scan results to user
    - _Requirements: 1.2, 2.1_
  
  - [ ]* 13.5 Write property tests for Barcode Scanner
    - **Property 1: Barcode Pass-Through**
    - **Property 42: Barcode Highlighting**
    - **Property 43: Haptic Feedback on Detection**
    - **Validates: Requirements 1.2, 11.3, 11.4**
  
  - [ ]* 13.6 Write unit tests for Barcode Scanner
    - Test ML Kit initialization
    - Test barcode format support
    - Test initialization failure handling
    - Test component cleanup
    - Test timeout fallback to Tier 2
    - _Requirements: 11.1, 11.5, 11.7, 2.1_

- [-] 14. Implement API endpoints for scan orchestration
  - [x] 14.1 Create POST /api/scan endpoint
    - Accept ScanRequest with barcode, image, imageHash, userId, sessionId
    - Invoke Scan Orchestrator
    - Return ScanResponse with product, tier, confidence, processing time
    - Handle errors and return ErrorDetails
    - _Requirements: 1.2, 2.1, 4.1_
  
  - [x] 14.2 Create POST /api/report-error endpoint
    - Accept ErrorReport with scan context and user feedback
    - Invoke Error Reporter service
    - Return ErrorReportResponse with alternative product
    - _Requirements: 5.1, 5.2_
  
  - [x] 14.3 Create GET /api/metrics endpoint for monitoring
    - Return aggregated metrics by tier
    - Include success rates, processing times, cache hit rates
    - Include API usage and cost tracking
    - _Requirements: 14.7_
  
  - [ ]* 14.4 Write integration tests for API endpoints
    - Test /api/scan with various tier scenarios
    - Test /api/report-error flow
    - Test /api/metrics response format
    - Test error handling and validation
    - _Requirements: 1.2, 5.1, 14.7_

- [ ] 15. Implement monitoring and analytics
  - [x] 15.1 Add scan logging to Scan Orchestrator
    - Log tier used, success status, processing time to scan_logs table
    - Track cache hits vs misses
    - Log error rates and error types by tier
    - _Requirements: 6.6, 6.7, 14.1, 14.2, 14.3_
  
  - [ ] 15.2 Implement API usage and cost tracking
    - Track Gemini API calls by tier
    - Track Barcode Lookup API calls
    - Calculate cost savings from cache hits
    - Log API usage metrics
    - _Requirements: 10.5, 10.6, 14.5_
  
  - [ ] 15.3 Create metrics aggregation service
    - Aggregate scan logs by hour, day, week
    - Calculate tier success rates
    - Calculate average processing times per tier
    - Calculate cache hit rates
    - _Requirements: 14.7_
  
  - [ ]* 15.4 Write property tests for monitoring
    - **Property 28: Tier Usage Logging**
    - **Property 41: API Usage Tracking**
    - **Property 54: Cache Hit/Miss Tracking**
    - **Property 55: Error Type Logging**
    - **Validates: Requirements 6.6, 6.7, 10.5, 10.6, 14.3, 14.4, 14.6**
  
  - [ ]* 15.5 Write unit tests for analytics
    - Test scan log recording
    - Test metrics aggregation
    - Test cost calculation
    - Test monitoring endpoint
    - _Requirements: 14.7_

- [ ] 16. Implement cost management and throttling
  - [ ] 16.1 Add cost tracking to Scan Orchestrator
    - Track API costs per tier
    - Calculate cost savings from cache hits vs AI calls
    - Log cost metrics for monitoring
    - _Requirements: 10.1, 10.2, 10.6_
  
  - [ ] 16.2 Implement Tier 4 throttling when cost limits approached
    - Check configured cost limits before Tier 4 invocation
    - Throttle or reject Tier 4 requests when limits approached
    - Provide user feedback on throttling
    - _Requirements: 10.7_
  
  - [ ]* 16.3 Write unit tests for cost management
    - Test cost tracking accuracy
    - Test throttling logic
    - Test cost limit enforcement
    - _Requirements: 10.7_

- [ ] 17. Implement progress feedback for multi-tier processing
  - [ ] 17.1 Add progress events to Scan Orchestrator
    - Emit progress events during tier transitions
    - Include current tier and estimated time remaining
    - Send progress updates to frontend via WebSocket or SSE
    - _Requirements: 9.7_
  
  - [ ] 17.2 Update frontend to display progress feedback
    - Show progress indicator during multi-tier scans
    - Display current tier being attempted
    - Show estimated time remaining
    - _Requirements: 9.7_
  
  - [ ]* 17.3 Write property test for progress feedback
    - **Property 40: Multi-Tier Progress Feedback**
    - **Validates: Requirements 9.7**
  
  - [ ]* 17.4 Write unit tests for progress feedback
    - Test progress event emission
    - Test frontend progress display
    - Test progress updates during tier transitions
    - _Requirements: 9.7_

- [ ] 18. Implement re-identification support
  - [ ] 18.1 Add re-identification endpoint
    - Accept re-identification request with specific tier
    - Bypass tier selection and use requested tier
    - Return result with requested tier
    - _Requirements: 13.7_
  
  - [ ] 18.2 Update frontend to support re-identification
    - Add UI option to request re-identification
    - Allow user to select specific tier
    - Display re-identification results
    - _Requirements: 13.7_
  
  - [ ]* 18.3 Write property test for re-identification
    - **Property 53: Re-Identification Support**
    - **Validates: Requirements 13.7**
  
  - [ ]* 18.4 Write unit tests for re-identification
    - Test tier-specific re-identification
    - Test re-identification UI flow
    - _Requirements: 13.7_

- [ ] 19. Final checkpoint - Integration and end-to-end testing
  - [ ] 19.1 Run all property-based tests
    - Verify all 55 correctness properties pass
    - Review any failing properties and fix issues
  
  - [ ] 19.2 Run all unit tests
    - Verify >80% code coverage
    - Fix any failing tests
  
  - [ ]* 19.3 Write end-to-end tests for complete user flows
    - Test Tier 1 barcode scan flow
    - Test Tier 2 text extraction flow
    - Test Tier 3 discovery flow
    - Test Tier 4 image analysis flow
    - Test error reporting flow
    - Test multi-tier fallback scenarios
  
  - [ ] 19.4 Ensure all tests pass, ask the user if questions arise

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property-based tests validate universal correctness properties from the design document
- Unit tests validate specific examples, edge cases, and error conditions
- The implementation uses TypeScript as specified in the design document
- All API integrations (ML Kit, Gemini, Barcode Lookup) require proper error handling and rate limiting
- Data consistency across Supabase and MongoDB is critical and requires transaction support
- Performance SLAs must be validated: Tier 1 (500ms cached, 2s uncached), Tier 2 (5s), Tier 3 (8s), Tier 4 (10s)
- Cost management prioritizes cache hits and barcode-based identification to minimize AI API costs
