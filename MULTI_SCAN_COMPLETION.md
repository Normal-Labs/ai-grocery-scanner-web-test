# Multi-Scan Completion Feature

## Overview
Allows users to complete incomplete product scans by capturing multiple images. The system tracks incomplete scans across page refreshes, provides helpful camera instructions based on missing data, and intelligently merges extraction results to build complete product records.

## Status
✅ COMPLETE - Fully implemented and tested

## Implementation Date
March 6, 2026

## Key Features

### 1. Incomplete Scan Detection
- Automatically detects when extraction is incomplete (missing barcode, packaging, ingredients, or nutrition)
- Calculates completeness score (0-4) based on successful extraction steps
- Tracks incomplete scans with productId

### 2. Complete Scan Button
- Appears when extraction is incomplete
- Shows warning message: "Incomplete Scan Detected"
- Persists across page refreshes (indicates user intent)
- Opens camera with custom instructions

### 3. Smart Camera Instructions
- Generates helpful instructions based on missing data
- Examples:
  - Missing nutrition + ingredients: "Point camera at nutrition facts label and ingredients list and take a picture"
  - Missing barcode only: "Point camera at barcode and take a picture"
  - Missing all: "Point camera at barcode, nutrition facts label, ingredients list, and product name and brand and take a picture"

### 4. Multi-Scan Updates
- User can perform multiple scans to update a single product
- Each scan merges new data with existing data
- Keeps existing data where new data is null
- Updates completeness score with each scan

### 5. LocalStorage Persistence
- Stores `incompleteScanProductId` in localStorage
- Stores `cameraInstructions` in localStorage
- Restores state on page load
- Clears state when scan is complete or user starts fresh

### 6. API Support for Targeted Updates
- API accepts optional `productId` parameter
- When provided, updates existing product instead of creating new one
- Merges new extraction data with existing data
- Tracks update reason: `multi_scan_completion`

## User Flow

### First Scan (Incomplete)
1. User captures image with only barcode visible
2. System extracts barcode successfully
3. Other extractions fail (packaging, ingredients, nutrition)
4. System saves product to database with productId
5. System displays "Incomplete Scan Detected" warning
6. System shows "Complete Scan" button
7. System stores productId and instructions in localStorage

### Second Scan (Completing)
1. User clicks "Complete Scan" button
2. Camera opens with custom instructions: "Point camera at nutrition facts label and ingredients list and take a picture"
3. User captures image showing nutrition and ingredients
4. System sends productId with new image to API
5. API fetches existing product data
6. API merges new data (nutrition, ingredients) with existing data (barcode)
7. API updates product in database
8. System displays complete product information
9. "Complete Scan" button disappears
10. localStorage is cleared

### Page Refresh Handling
1. User performs incomplete scan
2. User refreshes page
3. System restores `incompleteScanProductId` from localStorage
4. System restores `cameraInstructions` from localStorage
5. "Complete Scan" button still appears
6. User can continue multi-scan flow

## Technical Implementation

### Frontend Changes (`src/app/test-all/page.tsx`)
- Added state: `incompleteScanProductId`, `cameraInstructions`
- Added helper functions:
  - `getMissingSteps()`: Returns array of missing extraction steps
  - `generateCameraInstructions()`: Creates custom instructions based on missing steps
  - `isIncomplete()`: Checks if scan is incomplete
- Added useEffect to restore state from localStorage on mount
- Updated `handleScanComplete()` to:
  - Pass `productId` to API when completing scan
  - Track incomplete scans and persist to localStorage
  - Clear state when scan is complete or save fails
  - Handle missing productId gracefully
- Added "Complete Scan" button UI (shown when incomplete and productId exists)
- Updated "Test Another Product" button to clear incomplete state
- Added debug logging for button render conditions

### API Changes (`src/app/api/test-all-extraction/route.ts`)
- Added `productId` parameter to request interface
- Added logic to handle targeted updates:
  - Fetch existing product by productId with error handling
  - **Smart merge**: Only update extraction steps if new step is successful
  - Merge product data (barcode, name, brand, ingredients, nutrition_facts)
  - Merge dimension analyses (health, processing, allergens)
  - Update product instead of insert
  - Track update reason: `multi_scan_completion`
  - Return complete merged data to view (early return)
- Added MongoDB caching for complete merged products
- Added fallback logic when productId lookup fails
- Added default values for required fields (name, brand, category)
- Renamed internal `productId` to `finalProductId` to avoid conflicts
- Added comprehensive debug logging

### Camera Component Changes (`src/components/ImageScanner.tsx`)
- Added `instruction` prop (optional custom instruction text)
- Updated instruction display to use custom text if provided
- Falls back to default instruction if not provided

## Data Merging Strategy

When completing an incomplete scan:
1. Fetch existing product by productId
2. For each field, use new data if available, otherwise keep existing data
3. **Smart extraction_steps merge**: Only update steps if new step is successful
   - Prevents failed extractions from overwriting successful ones
   - Example: If scan 1 has successful ingredients but scan 2 fails, keep scan 1's ingredients
4. Merge dimension analyses (use new if available, otherwise keep existing)
5. Update completeness scores in metadata
6. Cache to MongoDB if merged product is complete (all 4 steps successful)

## Benefits

1. **Better Data Quality**: Users can capture multiple angles to get complete information
2. **User Intent Tracking**: "Complete Scan" button persists across refreshes
3. **Helpful Guidance**: Custom instructions tell users exactly what to capture
4. **Flexible Workflow**: Users can complete scans in multiple sessions
5. **No Data Loss**: Incomplete scans are saved and can be upgraded later

## Edge Cases Handled

1. **First scan has no barcode**: Product is saved with default values, can be updated later
2. **Page refresh during incomplete scan**: State is restored from localStorage
3. **User starts fresh scan**: Incomplete state is cleared when clicking "Test Another Product"
4. **Scan becomes complete**: "Complete Scan" button disappears, localStorage is cleared
5. **API fails to fetch existing product**: Falls through to normal insert logic (creates new product)
6. **Invalid productId in localStorage**: Lookup fails gracefully, creates new product instead
7. **Second scan has failed extractions**: Smart merge preserves successful data from first scan
8. **Database insert fails**: No productId returned, prevents invalid state in localStorage
9. **Incomplete scan without productId**: Button doesn't show (can't update non-existent product)

## Testing Checklist

- ✅ Incomplete scan shows "Complete Scan" button
- ✅ Custom camera instructions are generated correctly
- ✅ Clicking "Complete Scan" opens camera with custom instructions
- ✅ Second scan updates existing product (not creates new one)
- ✅ Data is merged correctly (new + existing)
- ✅ Smart merge: Successful steps preserved, failed steps don't overwrite
- ✅ Page refresh preserves incomplete scan state
- ✅ Complete scan clears incomplete state
- ✅ "Test Another Product" clears incomplete state
- ✅ localStorage is cleared when appropriate
- ✅ Multiple scans can update same product
- ✅ Complete merged products are cached to MongoDB
- ✅ Incomplete merged products are not cached
- ✅ Invalid productId falls through to normal insert logic

## Files Modified

1. `src/app/test-all/page.tsx` - Frontend UI and state management
2. `src/app/api/test-all-extraction/route.ts` - API endpoint with targeted updates
3. `src/components/ImageScanner.tsx` - Camera component with custom instructions

## Known Limitations

1. No progress indicator showing "X of 4 steps complete"
2. No visual indicators in extraction results showing which steps came from which scan
3. No scan history tracking (can't see all scans that contributed to a product)
4. Can't manually edit fields without rescanning

## Future Enhancements

1. Show progress indicator (e.g., "2 of 4 steps complete")
2. Add visual badges to extraction results showing scan source (Scan 1, Scan 2, etc.)
3. Allow users to manually mark scan as complete
4. Support for editing individual fields without rescanning
5. History of all scans for a product with timestamps
6. Ability to "undo" a scan and revert to previous state
7. Show which scan contributed each piece of data in the UI
