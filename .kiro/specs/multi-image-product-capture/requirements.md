# Requirements Document

## Introduction

This document specifies requirements for a multi-image product capture system that enables users to build complete product profiles by capturing multiple images (barcode, packaging, and nutritional label). The system supports two workflows: a guided "Product Hero Mode" for power users who capture all three images in sequence, and a "Progressive Capture Mode" for casual users who can incrementally add images to enhance product data over time.

## Glossary

- **System**: The multi-image product capture application
- **Product_Hero**: A user with a special role flag that enables guided multi-image capture workflow
- **Capture_Session**: A time-bounded user session that tracks related image submissions for the same product
- **Image_Classifier**: The existing component that determines image type (barcode, packaging, or nutrition label)
- **Barcode_Analyzer**: The existing pipeline that performs Tier 1-4 product identification from barcode images
- **Packaging_Analyzer**: The existing pipeline that extracts product metadata from packaging images
- **Nutrition_Analyzer**: The existing pipeline that extracts nutritional data from nutrition label images
- **Product_Record**: A database object containing product identification, metadata, nutritional data, and associated images
- **Image_Type**: One of three categories: barcode, packaging, or nutrition_label
- **Product_Matcher**: Component that determines if a newly captured image belongs to an existing product
- **Data_Merger**: Component that combines data from multiple images into a single Product_Record
- **MongoDB_Cache**: Existing temporary storage for product data
- **Supabase_Storage**: Existing persistent storage for product records
- **Completion_Prompt**: UI element that suggests capturing additional images to complete a product profile

## Requirements

### Requirement 1: Product Hero Role Management

**User Story:** As a system administrator, I want to designate certain users as Product Heroes, so that they can access the guided multi-image capture workflow.

#### Acceptance Criteria

1. THE System SHALL store a Product_Hero flag in the user profile in Supabase Auth metadata
2. WHEN a user authenticates, THE System SHALL retrieve the Product_Hero flag from Supabase Auth
3. THE System SHALL expose the Product_Hero status to the capture workflow logic
4. THE System SHALL provide a frontend toggle in the UI for development purposes to temporarily override the Product_Hero flag
5. WHEN the development toggle is enabled, THE System SHALL activate Product Hero mode regardless of the user's stored profile flag
6. WHEN the development toggle is disabled, THE System SHALL use the Product_Hero flag from the user's profile
7. THE development toggle state SHALL persist in browser localStorage for the current session
8. THE System SHALL display the current Product Hero status (profile flag or dev override) in the UI header

### Requirement 2: Product Hero Guided Capture Flow

**User Story:** As a Product Hero, I want to be guided through capturing three images in sequence, so that I can efficiently build complete product profiles.

#### Acceptance Criteria

1. WHEN a Product_Hero initiates a product scan, THE System SHALL display a guided capture interface
2. THE System SHALL prompt the Product_Hero to capture images in this order: barcode, packaging, nutrition_label
3. WHEN the Product_Hero captures the barcode image, THE System SHALL advance to the packaging capture prompt
4. WHEN the Product_Hero captures the packaging image, THE System SHALL advance to the nutrition_label capture prompt
5. WHEN all three images are captured, THE System SHALL process all images and construct a complete Product_Record
6. THE System SHALL link all three images to the same Product_Record using a single product identifier

### Requirement 3: Progressive Capture Session Management

**User Story:** As a casual user, I want the system to remember my recent scans, so that I can add more images to the same product without creating duplicates.

#### Acceptance Criteria

1. WHEN a user captures an image, THE System SHALL create a Capture_Session with a unique session identifier
2. THE Capture_Session SHALL store the product identifier, captured Image_Types, and timestamp
3. WHILE a Capture_Session is active, THE System SHALL maintain the session for 30 minutes from the last image capture
4. WHEN a Capture_Session expires, THE System SHALL remove the session data from memory
5. THE System SHALL support multiple concurrent Capture_Sessions for different products by the same user

### Requirement 4: Image Type Classification

**User Story:** As a user, I want the system to automatically determine what type of image I captured, so that it can process it correctly.

#### Acceptance Criteria

1. WHEN a user submits an image, THE Image_Classifier SHALL determine the Image_Type
2. THE System SHALL route the image to the appropriate analyzer based on Image_Type
3. WHEN Image_Type is barcode, THE System SHALL invoke the Barcode_Analyzer
4. WHEN Image_Type is packaging, THE System SHALL invoke the Packaging_Analyzer
5. WHEN Image_Type is nutrition_label, THE System SHALL invoke the Nutrition_Analyzer

### Requirement 5: Product Matching Logic

**User Story:** As a user, I want the system to recognize when I'm adding images to an existing product, so that my data is merged instead of creating duplicates.

#### Acceptance Criteria

1. WHEN a user submits an image within an active Capture_Session, THE Product_Matcher SHALL check if the image belongs to the existing product
2. WHEN a barcode image is captured, THE Product_Matcher SHALL use the barcode value as the primary matching key
3. WHEN a packaging or nutrition_label image is captured without a barcode, THE Product_Matcher SHALL use visual similarity and product name matching
4. THE Product_Matcher SHALL return the existing product identifier if a match is found with confidence above 85 percent
5. IF no match is found, THEN THE Product_Matcher SHALL generate a new product identifier

### Requirement 6: Multi-Image Data Merging

**User Story:** As a user, I want data from multiple images to be combined into one product profile, so that I have complete product information.

#### Acceptance Criteria

1. WHEN multiple images for the same product are processed, THE Data_Merger SHALL combine the results into a single Product_Record
2. THE Data_Merger SHALL populate product identification fields from Barcode_Analyzer results
3. THE Data_Merger SHALL populate product metadata fields from Packaging_Analyzer results
4. THE Data_Merger SHALL populate nutritional data fields from Nutrition_Analyzer results
5. WHEN conflicting data is detected, THE Data_Merger SHALL prioritize the most recently captured image data
6. THE Data_Merger SHALL preserve all image references in the Product_Record

### Requirement 7: Progressive Enhancement Prompts

**User Story:** As a casual user, I want to be prompted to capture additional images, so that I can complete the product profile if I choose.

#### Acceptance Criteria

1. WHEN a user captures a single image and results are displayed, THE System SHALL show a Completion_Prompt
2. THE Completion_Prompt SHALL list the missing Image_Types for the current product
3. WHEN a user has captured one Image_Type, THE Completion_Prompt SHALL suggest capturing the remaining two Image_Types
4. WHEN a user has captured two Image_Types, THE Completion_Prompt SHALL suggest capturing the remaining one Image_Type
5. WHEN all three Image_Types are captured, THE System SHALL display a completion confirmation instead of a Completion_Prompt
6. THE Completion_Prompt SHALL provide actionable buttons to initiate capture for each missing Image_Type

### Requirement 8: Product Record Schema

**User Story:** As a developer, I want a database schema that supports multiple image hashes per product, so that I can track which images have been analyzed for each product.

#### Acceptance Criteria

1. THE Product_Record SHALL include a product identifier field
2. THE Product_Record SHALL include an array of image hash references with Image_Type labels
3. THE Product_Record SHALL include product identification fields (barcode value, product name, brand)
4. THE Product_Record SHALL include product metadata fields (size, category, dimensions)
5. THE Product_Record SHALL include nutritional data fields (health score, allergens, ingredients)
6. THE Product_Record SHALL include a timestamp for creation and last update
7. THE Product_Record SHALL include a completeness indicator showing which Image_Types have been captured

### Requirement 9: Image Hash Storage and Linking

**User Story:** As a developer, I want all image hashes associated with a product to be stored and linked correctly, so that the system can recognize duplicate scans and track completeness.

#### Acceptance Criteria

1. WHEN an image is captured, THE System SHALL generate a SHA-256 hash of the image data
2. THE System SHALL store the image hash, Image_Type, and product identifier in the Product_Record
3. THE System SHALL maintain the association between image hashes and Product_Records when data is merged
4. WHEN a Product_Record is retrieved, THE System SHALL include references to all associated image hashes
5. THE System SHALL use image hashes for cache lookups in MongoDB to avoid reprocessing identical images

### Requirement 10: Duplicate Prevention

**User Story:** As a user, I want the system to prevent creating duplicate products, so that the database remains clean and accurate.

#### Acceptance Criteria

1. WHEN a user submits an image, THE System SHALL check MongoDB_Cache for existing products with matching identifiers
2. WHEN a matching product is found in MongoDB_Cache, THE System SHALL update the existing Product_Record
3. WHEN a user submits a barcode image, THE System SHALL check Supabase_Storage for existing products with the same barcode value
4. WHEN a matching product is found in Supabase_Storage, THE System SHALL update the existing Product_Record instead of creating a new one
5. THE System SHALL merge new image data with existing Product_Record data using the Data_Merger

### Requirement 11: Barcode Round-Trip Validation

**User Story:** As a developer, I want to validate barcode parsing accuracy, so that product identification is reliable.

#### Acceptance Criteria

1. WHEN a barcode value is extracted from an image, THE System SHALL store the raw barcode string
2. THE System SHALL validate that the barcode conforms to the expected format (UPC, EAN, or QR code)
3. FOR ALL valid barcode values, encoding the barcode to an image format and then decoding SHALL produce the original barcode value (round-trip property)
4. IF barcode validation fails, THEN THE System SHALL log the error and prompt the user to recapture the barcode image

### Requirement 12: Session State Persistence

**User Story:** As a user, I want my capture progress to be saved, so that I can resume if the app closes unexpectedly.

#### Acceptance Criteria

1. WHEN a Capture_Session is created or updated, THE System SHALL persist the session state to MongoDB_Cache
2. THE System SHALL store the session identifier, product identifier, captured Image_Types, and expiration timestamp
3. WHEN the application restarts, THE System SHALL restore active Capture_Sessions from MongoDB_Cache
4. WHEN a Capture_Session is restored, THE System SHALL verify the expiration timestamp and remove expired sessions
5. THE System SHALL allow users to continue capturing images for restored sessions

### Requirement 13: Image Type Tracking

**User Story:** As a developer, I want to track which images have been captured for each product, so that the system can determine completeness.

#### Acceptance Criteria

1. THE Product_Record SHALL include a captured_image_types array listing all Image_Types that have been captured
2. WHEN an image is added to a Product_Record, THE System SHALL append the Image_Type to the captured_image_types array
3. THE System SHALL prevent duplicate Image_Type entries in the captured_image_types array
4. WHEN a Product_Record has all three Image_Types in captured_image_types, THE System SHALL mark the product as complete
5. THE System SHALL expose the captured_image_types data to the UI for displaying completion status

### Requirement 14: Workflow Mode Selection

**User Story:** As a user, I want the system to automatically select the appropriate capture workflow, so that I have the best experience for my role.

#### Acceptance Criteria

1. WHEN a user initiates a product scan, THE System SHALL check the Product_Hero flag
2. WHEN the Product_Hero flag is true, THE System SHALL activate the guided multi-image capture workflow
3. WHEN the Product_Hero flag is false, THE System SHALL activate the progressive capture workflow
4. THE System SHALL maintain the selected workflow mode throughout the Capture_Session
5. WHERE a user's Product_Hero status changes, THE System SHALL apply the new workflow mode to subsequent Capture_Sessions

### Requirement 15: Data Consistency Validation

**User Story:** As a developer, I want to ensure data consistency across multiple images, so that conflicting information is detected and resolved.

#### Acceptance Criteria

1. WHEN the Data_Merger combines data from multiple images, THE System SHALL validate consistency between overlapping fields
2. WHEN a product name from packaging differs from the product name in the barcode database, THE System SHALL log a consistency warning
3. WHEN nutritional data conflicts with product category expectations, THE System SHALL flag the Product_Record for review
4. THE System SHALL store all conflicting values with their source Image_Type for manual review
5. THE System SHALL apply a confidence score to merged data based on consistency validation results
