# Requirements Document

## Introduction

This document specifies requirements for a multi-tier product identification system that replaces the current image-only scanning approach. The system implements a progressive fallback strategy across four tiers: direct barcode scanning, visual text extraction, discovery search via external APIs, and comprehensive image analysis. The goal is to improve identification accuracy, reduce AI API costs, and provide faster product lookups through intelligent tier selection.

## Glossary

- **Barcode_Scanner**: Frontend component using ML Kit to detect barcodes from camera feed
- **Visual_Extractor**: Service using Gemini OCR to extract text from product images
- **Discovery_Service**: Service that queries Barcode Lookup API to find barcodes for known products
- **Image_Analyzer**: Service using Gemini AI to perform comprehensive product analysis from images
- **Product_Repository**: Database service managing product data in Supabase
- **Cache_Service**: MongoDB-based service caching scan results by barcode and image hash
- **Scan_Orchestrator**: Main coordination service managing the multi-tier scan workflow
- **Error_Reporter**: Service allowing users to report incorrect product identifications
- **Tier**: A level in the identification strategy (Tier 1-4)
- **Barcode**: Machine-readable code representing product identification (UPC, EAN, etc.)
- **Product_Metadata**: Product information including name, brand, size, and category
- **Confidence_Score**: Numerical value (0-1) indicating identification certainty

## Requirements

### Requirement 1: Direct Barcode Scanning (Tier 1)

**User Story:** As a user, I want to scan product barcodes directly with my camera, so that I can quickly identify products without waiting for AI analysis.

#### Acceptance Criteria

1. THE Barcode_Scanner SHALL detect barcodes from the camera feed using ML Kit
2. WHEN a barcode is detected, THE Barcode_Scanner SHALL send the barcode value to the Scan_Orchestrator
3. WHEN a barcode is received, THE Scan_Orchestrator SHALL query the Cache_Service for cached results
4. IF the barcode exists in cache, THEN THE Scan_Orchestrator SHALL return the cached product data within 100ms
5. IF the barcode is not in cache, THEN THE Scan_Orchestrator SHALL query the Product_Repository
6. WHEN a product is found in the Product_Repository, THE Scan_Orchestrator SHALL return the product data within 500ms
7. THE Barcode_Scanner SHALL support UPC-A, UPC-E, EAN-8, EAN-13, Code-39, Code-93, Code-128, ITF, and QR code formats

### Requirement 2: Visual Text Extraction (Tier 2)

**User Story:** As a user, I want the system to extract product information from labels when no barcode is detected, so that I can identify products with damaged or missing barcodes.

#### Acceptance Criteria

1. IF no barcode is detected within 2 seconds, THEN THE Scan_Orchestrator SHALL invoke the Visual_Extractor
2. WHEN an image is provided, THE Visual_Extractor SHALL extract printed text using Gemini OCR capabilities
3. THE Visual_Extractor SHALL identify product names, brand names, and size information from extracted text
4. WHEN text is extracted, THE Visual_Extractor SHALL return structured Product_Metadata
5. THE Scan_Orchestrator SHALL query the Product_Repository using the extracted Product_Metadata
6. IF a matching product is found, THEN THE Scan_Orchestrator SHALL return the product data with a Confidence_Score
7. THE Visual_Extractor SHALL complete text extraction within 3 seconds

### Requirement 3: Discovery Search (Tier 3)

**User Story:** As a user, I want the system to find and save barcodes for identified products, so that future scans of the same product are faster and more accurate.

#### Acceptance Criteria

1. IF a product is identified without a barcode, THEN THE Scan_Orchestrator SHALL invoke the Discovery_Service
2. WHEN Product_Metadata is provided, THE Discovery_Service SHALL query the Barcode Lookup API with product name, brand, and size
3. WHEN the Barcode Lookup API returns a barcode, THE Discovery_Service SHALL validate the barcode format
4. THE Discovery_Service SHALL save the discovered barcode to the Product_Repository
5. THE Discovery_Service SHALL associate the barcode with the product record in the Cache_Service
6. IF multiple barcodes are returned, THEN THE Discovery_Service SHALL select the barcode with the highest confidence match
7. THE Discovery_Service SHALL complete the discovery process within 5 seconds

### Requirement 4: Comprehensive Image Analysis (Tier 4)

**User Story:** As a user, I want the system to analyze full product images when other methods fail, so that I can identify any product even without barcodes or clear labels.

#### Acceptance Criteria

1. IF Tier 1, Tier 2, and Tier 3 fail to identify a product, THEN THE Scan_Orchestrator SHALL invoke the Image_Analyzer
2. WHEN a full product image is provided, THE Image_Analyzer SHALL analyze the image using Gemini AI
3. THE Image_Analyzer SHALL extract product name, brand, category, size, and visual characteristics
4. THE Image_Analyzer SHALL return Product_Metadata with a Confidence_Score
5. IF the Confidence_Score is below 0.6, THEN THE Scan_Orchestrator SHALL prompt the user to retake the image
6. WHEN analysis is complete, THE Scan_Orchestrator SHALL save the result to the Cache_Service using image hash
7. THE Image_Analyzer SHALL complete analysis within 8 seconds

### Requirement 5: Error Reporting

**User Story:** As a user, I want to report incorrect product identifications, so that the system can improve its accuracy over time.

#### Acceptance Criteria

1. WHEN a product is identified, THE Scan_Orchestrator SHALL provide an error reporting option to the user
2. WHEN a user reports an error, THE Error_Reporter SHALL record the incorrect identification with the scan context
3. THE Error_Reporter SHALL store the original image, identified product, and user feedback
4. WHEN an error is reported for a cached result, THE Error_Reporter SHALL invalidate the cache entry
5. THE Error_Reporter SHALL flag the product record for manual review
6. WHEN an error is reported, THE Scan_Orchestrator SHALL invoke Tier 4 analysis to provide an alternative identification
7. THE Error_Reporter SHALL complete error recording within 1 second

### Requirement 6: Tier Selection and Fallback

**User Story:** As a developer, I want the system to automatically select the appropriate identification tier, so that users get the fastest and most accurate results.

#### Acceptance Criteria

1. THE Scan_Orchestrator SHALL attempt Tier 1 identification first
2. IF Tier 1 fails or times out, THEN THE Scan_Orchestrator SHALL proceed to Tier 2
3. IF Tier 2 fails or times out, THEN THE Scan_Orchestrator SHALL proceed to Tier 3
4. IF Tier 3 fails or times out, THEN THE Scan_Orchestrator SHALL proceed to Tier 4
5. WHEN any tier succeeds, THE Scan_Orchestrator SHALL return the result immediately without attempting subsequent tiers
6. THE Scan_Orchestrator SHALL log which tier was used for each successful identification
7. THE Scan_Orchestrator SHALL track tier success rates for monitoring and optimization

### Requirement 7: Cache Management

**User Story:** As a developer, I want to cache identification results efficiently, so that repeated scans are fast and cost-effective.

#### Acceptance Criteria

1. WHEN a barcode is successfully identified, THE Cache_Service SHALL store the result indexed by barcode
2. WHEN an image-based identification succeeds, THE Cache_Service SHALL store the result indexed by image hash
3. THE Cache_Service SHALL include the tier used, timestamp, and Confidence_Score in cached entries
4. WHEN a cache entry is accessed, THE Cache_Service SHALL update the last_accessed timestamp
5. THE Cache_Service SHALL expire entries that have not been accessed for 90 days
6. WHEN a product is updated in the Product_Repository, THE Cache_Service SHALL invalidate related cache entries
7. THE Cache_Service SHALL support cache lookups completing within 50ms

### Requirement 8: Barcode Lookup API Integration

**User Story:** As a developer, I want to integrate with the Barcode Lookup API, so that the system can discover barcodes for products identified by other means.

#### Acceptance Criteria

1. THE Discovery_Service SHALL authenticate with the Barcode Lookup API using API key credentials
2. WHEN querying the API, THE Discovery_Service SHALL include product name, brand, and size parameters
3. THE Discovery_Service SHALL handle API rate limits by implementing exponential backoff
4. IF the API returns an error, THEN THE Discovery_Service SHALL log the error and continue without failing the scan
5. THE Discovery_Service SHALL parse API responses and extract barcode values
6. THE Discovery_Service SHALL validate that returned barcodes match the product metadata
7. THE Discovery_Service SHALL cache API responses to minimize redundant requests

### Requirement 9: Performance Optimization

**User Story:** As a user, I want product identification to be fast, so that I can scan multiple products efficiently.

#### Acceptance Criteria

1. THE Scan_Orchestrator SHALL complete Tier 1 identification within 500ms for cached results
2. THE Scan_Orchestrator SHALL complete Tier 1 identification within 2 seconds for uncached barcodes
3. THE Scan_Orchestrator SHALL complete Tier 2 identification within 5 seconds
4. THE Scan_Orchestrator SHALL complete Tier 3 identification within 8 seconds
5. THE Scan_Orchestrator SHALL complete Tier 4 identification within 10 seconds
6. THE Scan_Orchestrator SHALL process tiers in parallel when possible without violating tier priority
7. THE Scan_Orchestrator SHALL provide progress feedback to the user during multi-tier processing

### Requirement 10: Cost Management

**User Story:** As a product owner, I want to minimize AI API costs, so that the system is economically sustainable.

#### Acceptance Criteria

1. THE Scan_Orchestrator SHALL prioritize barcode-based identification to avoid AI API calls
2. THE Scan_Orchestrator SHALL use cached results whenever available to avoid redundant API calls
3. THE Visual_Extractor SHALL use Gemini OCR only when barcode detection fails
4. THE Image_Analyzer SHALL be invoked only as a last resort after all other tiers fail
5. THE Scan_Orchestrator SHALL track API usage by tier for cost monitoring
6. THE Scan_Orchestrator SHALL log the cost savings from cache hits versus AI API calls
7. WHERE cost limits are configured, THE Scan_Orchestrator SHALL throttle Tier 4 usage when limits are approached

### Requirement 11: ML Kit Integration

**User Story:** As a developer, I want to integrate ML Kit for barcode detection, so that barcode scanning works efficiently on mobile devices.

#### Acceptance Criteria

1. THE Barcode_Scanner SHALL initialize ML Kit barcode detection on component mount
2. THE Barcode_Scanner SHALL process camera frames in real-time for barcode detection
3. WHEN a barcode is detected, THE Barcode_Scanner SHALL highlight the barcode in the camera view
4. THE Barcode_Scanner SHALL provide haptic feedback when a barcode is successfully detected
5. THE Barcode_Scanner SHALL handle ML Kit initialization failures gracefully
6. IF ML Kit is unavailable, THEN THE Barcode_Scanner SHALL fall back to Tier 2 immediately
7. THE Barcode_Scanner SHALL release ML Kit resources when the component unmounts

### Requirement 12: Data Consistency

**User Story:** As a developer, I want product data to remain consistent across databases, so that users see accurate information regardless of data source.

#### Acceptance Criteria

1. WHEN a product is saved to the Product_Repository, THE Scan_Orchestrator SHALL update the Cache_Service with the same data
2. WHEN a barcode is discovered via Tier 3, THE Scan_Orchestrator SHALL update both the Product_Repository and Cache_Service
3. WHEN an error is reported, THE Scan_Orchestrator SHALL invalidate cache entries in both MongoDB and any in-memory caches
4. THE Scan_Orchestrator SHALL use transactions when updating multiple data stores
5. IF a database update fails, THEN THE Scan_Orchestrator SHALL roll back related changes
6. THE Scan_Orchestrator SHALL log data consistency errors for monitoring
7. THE Scan_Orchestrator SHALL retry failed database operations up to 3 times with exponential backoff

### Requirement 13: User Feedback and Confidence

**User Story:** As a user, I want to see how confident the system is in its identification, so that I can verify uncertain results.

#### Acceptance Criteria

1. WHEN a product is identified, THE Scan_Orchestrator SHALL return a Confidence_Score
2. THE Scan_Orchestrator SHALL set Confidence_Score to 1.0 for Tier 1 barcode matches
3. THE Scan_Orchestrator SHALL calculate Confidence_Score based on metadata match quality for Tier 2 and Tier 3
4. THE Scan_Orchestrator SHALL use the Image_Analyzer's confidence value for Tier 4 results
5. IF Confidence_Score is below 0.8, THEN THE Scan_Orchestrator SHALL display a warning to the user
6. THE Scan_Orchestrator SHALL provide the tier used in the response for transparency
7. THE Scan_Orchestrator SHALL allow users to request re-identification using a different tier

### Requirement 14: Monitoring and Analytics

**User Story:** As a product owner, I want to monitor system performance and usage patterns, so that I can optimize the identification strategy.

#### Acceptance Criteria

1. THE Scan_Orchestrator SHALL log the tier used for each successful identification
2. THE Scan_Orchestrator SHALL track success rates for each tier
3. THE Scan_Orchestrator SHALL measure and log response times for each tier
4. THE Scan_Orchestrator SHALL count cache hits versus cache misses
5. THE Scan_Orchestrator SHALL track API usage and costs by tier
6. THE Scan_Orchestrator SHALL log error rates and error types by tier
7. THE Scan_Orchestrator SHALL provide aggregated metrics via a monitoring endpoint
