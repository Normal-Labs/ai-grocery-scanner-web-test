# Requirements Document

## Introduction

This document specifies requirements for an integrated product scanning and dimension analysis system that combines product identification with multi-dimensional product evaluation. The system leverages the existing multi-tier product identification infrastructure (see `.kiro/specs/multi-tier-product-identification/`) and adds dimension analysis capabilities across five key areas: Health, Processing and Preservatives, Allergens, Responsibly Produced, and Environmental Impact. The primary goals are to provide users with comprehensive product insights while maintaining fast UI performance and minimizing API costs through aggressive caching strategies.

## Glossary

- **Multi_Tier_Orchestrator**: Existing orchestration service from multi-tier-product-identification spec that handles product identification across four tiers
- **Dimension_Analyzer**: Service that analyzes products across five dimensions using Gemini AI
- **Dimension_Cache**: MongoDB-based cache storing dimension analysis results indexed by product ID
- **Product_ID**: Unique identifier for products from the Product Repository
- **Dimension_Score**: Numerical rating (0-100) for each dimension
- **SmartBadge**: UI component displaying dimension scores with visual indicators
- **Free_Tier**: User tier with access to one dimension analysis
- **Premium_Tier**: User tier with access to all five dimension analyses
- **Analysis_Result**: Complete dimension analysis including scores, explanations, and metadata
- **Product_Image**: Image data used for both identification and dimension analysis

## Requirements

### Requirement 1: Product Identification Integration

**User Story:** As a user, I want to scan a product and have it identified quickly, so that I can proceed to dimension analysis without delays.

#### Acceptance Criteria

1. THE Integrated_Scan_System SHALL invoke the Multi_Tier_Orchestrator for product identification
2. WHEN a scan request is received, THE Integrated_Scan_System SHALL pass the barcode or image to the Multi_Tier_Orchestrator
3. THE Integrated_Scan_System SHALL reuse all existing caching and database infrastructure from the multi-tier specification
4. WHEN the Multi_Tier_Orchestrator returns a Product_ID, THE Integrated_Scan_System SHALL proceed to dimension analysis
5. THE Integrated_Scan_System SHALL display product information to the user immediately after identification
6. THE Integrated_Scan_System SHALL show a loading state for dimension analysis while product info is visible
7. THE Integrated_Scan_System SHALL complete product identification within 2 seconds for cached results

### Requirement 2: Dimension Analysis Cache Check

**User Story:** As a developer, I want to check if dimension analysis already exists before calling the AI API, so that we minimize costs and provide faster responses.

#### Acceptance Criteria

1. WHEN a Product_ID is obtained, THE Dimension_Analyzer SHALL query the Dimension_Cache for existing analysis
2. IF dimension analysis exists in cache and is less than 30 days old, THEN THE Dimension_Analyzer SHALL return the cached result
3. THE Dimension_Cache SHALL index analysis results by Product_ID
4. THE Dimension_Cache SHALL store the analysis timestamp for TTL validation
5. THE Dimension_Analyzer SHALL complete cache lookups within 50ms
6. WHEN cached analysis is returned, THE Dimension_Analyzer SHALL include a cached flag in the response
7. THE Dimension_Cache SHALL implement a TTL of 30 days for dimension analysis entries

### Requirement 3: Fresh Dimension Analysis

**User Story:** As a user, I want products to be analyzed across five dimensions when no cached analysis exists, so that I can make informed purchasing decisions.

#### Acceptance Criteria

1. IF no cached analysis exists for a Product_ID, THEN THE Dimension_Analyzer SHALL invoke Gemini AI with the Product_Image
2. THE Dimension_Analyzer SHALL request analysis across all five dimensions: Health, Processing and Preservatives, Allergens, Responsibly Produced, and Environmental Impact
3. WHEN Gemini AI returns analysis, THE Dimension_Analyzer SHALL parse and structure the results as Analysis_Result
4. THE Dimension_Analyzer SHALL validate that all five Dimension_Scores are present and within range 0-100
5. THE Dimension_Analyzer SHALL store the Analysis_Result in the Dimension_Cache indexed by Product_ID
6. THE Dimension_Analyzer SHALL complete fresh analysis within 10 seconds
7. THE Dimension_Analyzer SHALL include explanatory text for each dimension in the Analysis_Result

### Requirement 4: Dimension Analysis Structure

**User Story:** As a developer, I want dimension analysis results to follow a consistent structure, so that the frontend can reliably display the information.

#### Acceptance Criteria

1. THE Analysis_Result SHALL include five Dimension_Scores: health, processing, allergens, responsibly_produced, and environmental_impact
2. THE Analysis_Result SHALL include explanatory text for each dimension describing the score rationale
3. THE Analysis_Result SHALL include a timestamp indicating when the analysis was performed
4. THE Analysis_Result SHALL include the Product_ID linking the analysis to the product
5. THE Analysis_Result SHALL include a confidence indicator for the overall analysis
6. THE Analysis_Result SHALL include key factors identified for each dimension
7. THE Analysis_Result SHALL be serializable to JSON for storage and transmission

### Requirement 5: Tier-Based Access Control

**User Story:** As a product owner, I want to restrict dimension access based on user tier, so that we can monetize premium features while providing value to free users.

#### Acceptance Criteria

1. WHERE a user is on Free_Tier, THE Integrated_Scan_System SHALL return analysis for one dimension only
2. WHERE a user is on Premium_Tier, THE Integrated_Scan_System SHALL return analysis for all five dimensions
3. THE Integrated_Scan_System SHALL determine user tier from authentication context
4. WHEN a Free_Tier user requests analysis, THE Integrated_Scan_System SHALL select the Health dimension by default
5. THE Integrated_Scan_System SHALL include tier information in the response indicating available dimensions
6. THE Integrated_Scan_System SHALL provide upgrade prompts for Free_Tier users viewing limited results
7. THE Integrated_Scan_System SHALL cache full analysis even for Free_Tier users to optimize future Premium_Tier access

### Requirement 6: Performance Targets

**User Story:** As a user, I want fast scan results, so that I can quickly evaluate products while shopping.

#### Acceptance Criteria

1. THE Integrated_Scan_System SHALL complete product identification within 2 seconds for cached products
2. THE Integrated_Scan_System SHALL return cached dimension analysis within 5 seconds total (identification + cache lookup)
3. THE Integrated_Scan_System SHALL complete fresh dimension analysis within 12 seconds total (identification + AI analysis)
4. THE Integrated_Scan_System SHALL display product information within 2 seconds while dimension analysis continues
5. THE Integrated_Scan_System SHALL provide progress indicators during dimension analysis
6. THE Integrated_Scan_System SHALL prioritize cache hits to achieve sub-5-second total response times
7. THE Integrated_Scan_System SHALL log performance metrics for each scan operation

### Requirement 7: Cost Optimization Strategy

**User Story:** As a product owner, I want to minimize AI API costs, so that the system is economically sustainable at scale.

#### Acceptance Criteria

1. THE Integrated_Scan_System SHALL check the Dimension_Cache before invoking Gemini AI
2. THE Integrated_Scan_System SHALL reuse the Product_Image from identification for dimension analysis without additional API calls
3. THE Dimension_Analyzer SHALL make a single Gemini AI call to analyze all five dimensions simultaneously
4. THE Integrated_Scan_System SHALL cache dimension analysis for 30 days to maximize cache hit rates
5. THE Integrated_Scan_System SHALL track API usage and costs per scan operation
6. THE Integrated_Scan_System SHALL log cache hit rates for dimension analysis
7. THE Integrated_Scan_System SHALL avoid duplicate API calls when multiple users scan the same product

### Requirement 8: API Endpoint Integration

**User Story:** As a developer, I want to integrate dimension analysis into the existing scan endpoint, so that the frontend has a single API to call.

#### Acceptance Criteria

1. THE Integrated_Scan_System SHALL extend the existing /api/scan endpoint to include dimension analysis
2. WHEN /api/scan is called, THE Integrated_Scan_System SHALL return both product identification and dimension analysis
3. THE /api/scan endpoint SHALL accept an optional parameter to skip dimension analysis
4. THE /api/scan endpoint SHALL return product information immediately if dimension analysis is still processing
5. THE /api/scan endpoint SHALL support polling for dimension analysis completion
6. THE /api/scan endpoint SHALL include both identification tier and dimension cache status in responses
7. THE /api/scan endpoint SHALL maintain backward compatibility with existing clients

### Requirement 9: SmartBadge Display Integration

**User Story:** As a user, I want to see visual indicators for each dimension, so that I can quickly understand product ratings.

#### Acceptance Criteria

1. THE Integrated_Scan_System SHALL return dimension data in a format compatible with SmartBadge components
2. THE SmartBadge SHALL display Dimension_Scores with color-coded indicators (red: 0-33, yellow: 34-66, green: 67-100)
3. THE SmartBadge SHALL show dimension names and scores prominently
4. WHEN a user taps a SmartBadge, THE Integrated_Scan_System SHALL display the explanatory text for that dimension
5. WHERE a user is on Free_Tier, THE SmartBadge SHALL show locked indicators for unavailable dimensions
6. THE SmartBadge SHALL display loading states while dimension analysis is in progress
7. THE SmartBadge SHALL handle missing or incomplete dimension data gracefully

### Requirement 10: Database Schema for Dimension Analysis

**User Story:** As a developer, I want dimension analysis stored in MongoDB with proper indexing, so that cache lookups are fast and reliable.

#### Acceptance Criteria

1. THE Dimension_Cache SHALL store analysis results in a MongoDB collection named dimension_analysis
2. THE dimension_analysis collection SHALL have a unique index on product_id
3. THE dimension_analysis collection SHALL have a TTL index on expires_at set to 30 days
4. THE dimension_analysis collection SHALL store all five Dimension_Scores as numerical values
5. THE dimension_analysis collection SHALL store explanatory text for each dimension
6. THE dimension_analysis collection SHALL store analysis timestamp and last_accessed timestamp
7. THE dimension_analysis collection SHALL support atomic updates for access tracking

### Requirement 11: Error Handling for Dimension Analysis

**User Story:** As a user, I want graceful error handling when dimension analysis fails, so that I can still see product information.

#### Acceptance Criteria

1. IF dimension analysis fails, THEN THE Integrated_Scan_System SHALL still return product identification results
2. WHEN Gemini AI returns an error, THE Dimension_Analyzer SHALL log the error and return a partial result
3. IF the Dimension_Cache is unavailable, THEN THE Dimension_Analyzer SHALL proceed with fresh analysis
4. WHEN dimension analysis times out, THE Integrated_Scan_System SHALL return product info with a retry option
5. THE Dimension_Analyzer SHALL validate Gemini AI responses and handle malformed data
6. IF fewer than five dimensions are returned, THEN THE Dimension_Analyzer SHALL mark missing dimensions as unavailable
7. THE Integrated_Scan_System SHALL provide user-friendly error messages for dimension analysis failures

### Requirement 12: Dimension Analysis Prompt Engineering

**User Story:** As a developer, I want consistent and accurate dimension analysis from Gemini AI, so that users receive reliable product evaluations.

#### Acceptance Criteria

1. THE Dimension_Analyzer SHALL use a structured prompt requesting analysis across all five dimensions
2. THE Dimension_Analyzer SHALL request Gemini AI to return results in JSON format
3. THE Dimension_Analyzer SHALL include product context (name, brand, category) in the analysis prompt
4. THE Dimension_Analyzer SHALL request specific scoring criteria for each dimension
5. THE Dimension_Analyzer SHALL request explanatory text limited to 100 words per dimension
6. THE Dimension_Analyzer SHALL include the Product_Image in the Gemini AI request
7. THE Dimension_Analyzer SHALL validate that Gemini AI responses match the expected schema

### Requirement 13: Cache Invalidation for Dimension Analysis

**User Story:** As a developer, I want to invalidate dimension analysis cache when product information changes, so that users see up-to-date analysis.

#### Acceptance Criteria

1. WHEN a product is updated in the Product_Repository, THE Integrated_Scan_System SHALL invalidate the corresponding Dimension_Cache entry
2. WHEN a user reports an error on dimension analysis, THE Integrated_Scan_System SHALL invalidate the cache entry
3. THE Dimension_Cache SHALL support manual invalidation by Product_ID
4. THE Dimension_Cache SHALL support bulk invalidation for product category updates
5. WHEN cache is invalidated, THE Dimension_Analyzer SHALL perform fresh analysis on the next request
6. THE Integrated_Scan_System SHALL log cache invalidation events for monitoring
7. THE Dimension_Cache SHALL remove invalidated entries immediately without waiting for TTL expiration

### Requirement 14: Monitoring and Analytics for Dimension Analysis

**User Story:** As a product owner, I want to monitor dimension analysis performance and usage, so that I can optimize the system and understand user behavior.

#### Acceptance Criteria

1. THE Integrated_Scan_System SHALL log dimension analysis cache hit rates
2. THE Integrated_Scan_System SHALL track average processing time for fresh dimension analysis
3. THE Integrated_Scan_System SHALL count dimension analysis requests by user tier
4. THE Integrated_Scan_System SHALL track Gemini AI costs specifically for dimension analysis
5. THE Integrated_Scan_System SHALL log dimension analysis errors and failure rates
6. THE Integrated_Scan_System SHALL track which dimensions are most frequently viewed by users
7. THE Integrated_Scan_System SHALL provide aggregated metrics via the existing /api/metrics endpoint

### Requirement 15: Round-Trip Property for Dimension Analysis Serialization

**User Story:** As a developer, I want dimension analysis to serialize and deserialize correctly, so that cached data remains consistent and reliable.

#### Acceptance Criteria

1. FOR ALL valid Analysis_Result objects, serializing to JSON then deserializing SHALL produce an equivalent object
2. THE Dimension_Analyzer SHALL validate that deserialized Analysis_Result objects contain all required fields
3. THE Dimension_Analyzer SHALL validate that Dimension_Scores remain within 0-100 range after deserialization
4. THE Dimension_Analyzer SHALL validate that timestamps are correctly preserved through serialization
5. THE Dimension_Cache SHALL verify data integrity when storing and retrieving Analysis_Result objects
6. THE Dimension_Analyzer SHALL handle serialization errors gracefully without data loss
7. THE Integrated_Scan_System SHALL include serialization validation in automated tests
