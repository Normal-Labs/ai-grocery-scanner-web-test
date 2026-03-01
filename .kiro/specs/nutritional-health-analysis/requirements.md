# Requirements Document

## Introduction

This feature enables users to scan nutritional facts labels and ingredient lists from product packaging to receive comprehensive health assessments. The system will automatically detect the type of image being scanned (barcode, product image, or nutritional facts/ingredients) and route it to the appropriate analysis pipeline. This builds upon the existing image capture infrastructure while adding specialized OCR, parsing, and health scoring capabilities for nutritional data.

## Glossary

- **Scanner**: The existing image capture system that handles camera access and image acquisition
- **Image_Classifier**: Component that determines whether a captured image contains a barcode, product image, or nutritional facts/ingredients label
- **Nutrition_Parser**: Component that extracts structured data from nutritional facts labels using OCR
- **Ingredient_Parser**: Component that extracts and tokenizes ingredient lists from product packaging
- **Health_Scorer**: Component that calculates health assessment scores based on nutritional data and ingredients
- **Nutrition_Database**: MongoDB collection storing parsed nutritional data and health assessments
- **AI_Vision_Service**: Gemini AI service used for image analysis and OCR
- **User_Interface**: React components that display health insights and nutritional information

## Requirements

### Requirement 1: Image Type Detection

**User Story:** As a user, I want the system to automatically detect what type of image I'm scanning, so that I don't have to manually specify whether it's a barcode, product image, or nutritional label.

#### Acceptance Criteria

1. WHEN an image is captured, THE Image_Classifier SHALL analyze the image to determine its type
2. THE Image_Classifier SHALL classify images into exactly one of three categories: barcode, product_image, or nutrition_label
3. WHEN the image contains a barcode, THE Image_Classifier SHALL return classification "barcode" with confidence score
4. WHEN the image contains product packaging without visible nutritional facts, THE Image_Classifier SHALL return classification "product_image" with confidence score
5. WHEN the image contains a nutritional facts label or ingredient list, THE Image_Classifier SHALL return classification "nutrition_label" with confidence score
6. THE Image_Classifier SHALL complete classification within 2 seconds for images under 5MB
7. IF the image type cannot be determined with confidence above 60%, THEN THE Image_Classifier SHALL return classification "unknown" and prompt the user to recapture

### Requirement 2: Nutritional Facts Label Parsing

**User Story:** As a user, I want the system to extract nutritional information from labels, so that I can understand the nutritional content without manual data entry.

#### Acceptance Criteria

1. WHEN a nutrition_label image is detected, THE Nutrition_Parser SHALL extract the serving size and unit
2. THE Nutrition_Parser SHALL extract calories per serving
3. THE Nutrition_Parser SHALL extract total fat, saturated fat, and trans fat values in grams
4. THE Nutrition_Parser SHALL extract cholesterol value in milligrams
5. THE Nutrition_Parser SHALL extract sodium value in milligrams
6. THE Nutrition_Parser SHALL extract total carbohydrates, dietary fiber, and total sugars in grams
7. THE Nutrition_Parser SHALL extract protein value in grams
8. THE Nutrition_Parser SHALL extract vitamin and mineral percentages when present
9. IF OCR confidence for any field is below 80%, THEN THE Nutrition_Parser SHALL flag that field as "uncertain"
10. THE Nutrition_Parser SHALL return structured JSON data with all extracted nutritional values

### Requirement 3: Ingredient List Extraction

**User Story:** As a user, I want the system to read ingredient lists, so that I can identify specific ingredients and additives in products.

#### Acceptance Criteria

1. WHEN a nutrition_label image contains an ingredient list, THE Ingredient_Parser SHALL extract the complete ingredient text
2. THE Ingredient_Parser SHALL tokenize ingredients into individual items separated by commas or semicolons
3. THE Ingredient_Parser SHALL preserve ingredient order as listed on the package
4. THE Ingredient_Parser SHALL identify and flag common allergens (milk, eggs, fish, shellfish, tree nuts, peanuts, wheat, soybeans)
5. THE Ingredient_Parser SHALL identify and flag artificial preservatives (BHA, BHT, sodium benzoate, potassium sorbate, TBHQ)
6. THE Ingredient_Parser SHALL identify and flag artificial sweeteners (aspartame, sucralose, saccharin, acesulfame potassium)
7. THE Ingredient_Parser SHALL identify and flag artificial colors (Red 40, Yellow 5, Blue 1, etc.)
8. IF the ingredient list is partially obscured or unclear, THEN THE Ingredient_Parser SHALL return the readable portion and flag as "incomplete"

### Requirement 4: Health Assessment Scoring

**User Story:** As a user, I want to receive a health score for scanned products, so that I can quickly understand how healthy a product is.

#### Acceptance Criteria

1. WHEN nutritional data is parsed, THE Health_Scorer SHALL calculate an overall health score from 0 to 100
2. THE Health_Scorer SHALL penalize products with high sodium (above 400mg per serving)
3. THE Health_Scorer SHALL penalize products with high added sugars (above 10g per serving)
4. THE Health_Scorer SHALL penalize products with high saturated fat (above 5g per serving)
5. THE Health_Scorer SHALL penalize products with trans fat (any amount above 0g)
6. THE Health_Scorer SHALL reward products with high fiber (above 3g per serving)
7. THE Health_Scorer SHALL reward products with high protein (above 10g per serving)
8. THE Health_Scorer SHALL penalize products containing artificial preservatives (subtract 5 points per preservative)
9. THE Health_Scorer SHALL penalize products containing artificial sweeteners (subtract 5 points per sweetener)
10. THE Health_Scorer SHALL penalize products containing artificial colors (subtract 3 points per color)
11. THE Health_Scorer SHALL classify scores as: Excellent (80-100), Good (60-79), Fair (40-59), Poor (20-39), Very Poor (0-19)
12. THE Health_Scorer SHALL provide a brief explanation for the score highlighting key factors

### Requirement 5: Integration with Existing Scan Workflow

**User Story:** As a user, I want nutritional scanning to work seamlessly with the existing scan features, so that I have a unified scanning experience.

#### Acceptance Criteria

1. WHEN the Image_Classifier detects a barcode, THE Scanner SHALL route the image to the existing barcode identification pipeline
2. WHEN the Image_Classifier detects a product_image, THE Scanner SHALL route the image to the existing product analysis pipeline
3. WHEN the Image_Classifier detects a nutrition_label, THE Scanner SHALL route the image to the Nutrition_Parser and Ingredient_Parser
4. THE Scanner SHALL use the same CameraCapture component for all scan types
5. THE Scanner SHALL display appropriate loading messages based on the detected image type
6. THE Scanner SHALL maintain scan history for all three image types in a unified interface
7. WHERE a user scans both a product image and nutrition label for the same product, THE Scanner SHALL merge the results into a single comprehensive product profile

### Requirement 6: Nutritional Data Caching and Storage

**User Story:** As a user, I want my scanned nutritional data to be saved, so that I can review it later without rescanning.

#### Acceptance Criteria

1. WHEN nutritional data is successfully parsed, THE Nutrition_Database SHALL store the parsed data with a unique identifier
2. THE Nutrition_Database SHALL store the original image reference for future retrieval
3. THE Nutrition_Database SHALL store the health score and assessment
4. THE Nutrition_Database SHALL store the timestamp of the scan
5. THE Nutrition_Database SHALL index nutritional data by product name when available
6. WHEN a user scans the same product again, THE Nutrition_Database SHALL retrieve cached results if the scan occurred within 30 days
7. THE Nutrition_Database SHALL allow users to view their scan history sorted by date

### Requirement 7: User Interface for Health Insights

**User Story:** As a user, I want to see nutritional information and health assessments in an easy-to-understand format, so that I can make informed purchasing decisions.

#### Acceptance Criteria

1. WHEN nutritional data is available, THE User_Interface SHALL display the health score prominently with color coding (green for Excellent/Good, yellow for Fair, red for Poor/Very Poor)
2. THE User_Interface SHALL display a summary of key nutritional values (calories, fat, sodium, sugar, protein, fiber)
3. THE User_Interface SHALL display the complete ingredient list with flagged items highlighted
4. THE User_Interface SHALL display allergen warnings prominently if allergens are detected
5. THE User_Interface SHALL display a list of concerning additives (preservatives, sweeteners, colors) if present
6. THE User_Interface SHALL provide expandable sections for detailed nutritional breakdown
7. THE User_Interface SHALL display the health score explanation with specific reasons for the rating
8. THE User_Interface SHALL provide a comparison view when multiple products have been scanned
9. THE User_Interface SHALL meet WCAG 2.1 Level AA accessibility standards for color contrast and screen reader support

### Requirement 8: Error Handling and User Feedback

**User Story:** As a user, I want clear feedback when scanning fails or produces uncertain results, so that I know how to get better results.

#### Acceptance Criteria

1. IF the image is too blurry for OCR, THEN THE Scanner SHALL display an error message "Image too blurry - please recapture with better focus"
2. IF the nutritional label is partially obscured, THEN THE Scanner SHALL display a warning "Some information could not be read - results may be incomplete"
3. IF no nutritional facts or ingredients are detected in a nutrition_label image, THEN THE Scanner SHALL prompt "No nutritional information found - please ensure the label is fully visible"
4. IF OCR confidence is below 80% for critical fields, THEN THE Scanner SHALL display a warning icon next to uncertain values
5. WHEN an error occurs during parsing, THE Scanner SHALL log the error details for debugging while showing a user-friendly message
6. THE Scanner SHALL provide a "Retake Photo" button on all error and warning screens
7. THE Scanner SHALL provide helpful tips for capturing better images (good lighting, steady hand, full label visible)

### Requirement 9: Premium Tier Enhanced Analysis

**User Story:** As a premium user, I want enhanced nutritional analysis with research-backed insights, so that I can make more informed health decisions.

#### Acceptance Criteria

1. WHERE the user has a premium tier subscription, THE Health_Scorer SHALL provide detailed micronutrient analysis
2. WHERE the user has a premium tier subscription, THE AI_Vision_Service SHALL research health impacts of specific ingredients using web search
3. WHERE the user has a premium tier subscription, THE Health_Scorer SHALL compare the product against similar products in its category
4. WHERE the user has a premium tier subscription, THE User_Interface SHALL display research citations for health claims
5. WHERE the user has a premium tier subscription, THE Health_Scorer SHALL provide personalized recommendations based on dietary preferences (if configured)
6. WHERE the user has a free tier subscription, THE Scanner SHALL analyze only the nutritional facts without ingredient research
7. WHERE the user has a free tier subscription, THE User_Interface SHALL display a prompt to upgrade for enhanced analysis

### Requirement 10: Nutritional Data Validation

**User Story:** As a user, I want the system to validate extracted nutritional data, so that I can trust the accuracy of the information.

#### Acceptance Criteria

1. WHEN nutritional values are extracted, THE Nutrition_Parser SHALL validate that calories approximately match the macronutrient breakdown (4 cal/g carbs, 4 cal/g protein, 9 cal/g fat)
2. IF the calorie calculation differs from the stated calories by more than 20%, THEN THE Nutrition_Parser SHALL flag the data as "potentially inaccurate"
3. THE Nutrition_Parser SHALL validate that percentage daily values are within reasonable ranges (0-200%)
4. THE Nutrition_Parser SHALL validate that serving sizes are positive numbers with valid units
5. IF validation fails for critical fields, THEN THE Scanner SHALL prompt the user to verify the extracted data
6. THE User_Interface SHALL allow users to manually correct extracted values if they notice errors
7. WHEN a user corrects extracted data, THE Nutrition_Database SHALL store both the original OCR result and the user correction for future model improvement
