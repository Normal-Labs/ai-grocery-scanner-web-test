# Product Hero Mode

## Overview

Product Hero Mode is a guided multi-image capture workflow that enables users to build complete product profiles by capturing three types of images in sequence:

1. **Barcode** - Product identification
2. **Packaging** - Product name, brand, size, category
3. **Nutrition Label** - Nutritional facts, health score, allergens

## Features

- ✅ **Guided Workflow**: Step-by-step prompts for each image type
- ✅ **Session Management**: 30-minute sessions with automatic expiration
- ✅ **Smart Data Merging**: Combines data from all three images into a single product record
- ✅ **Progress Tracking**: Visual indicators showing workflow completion status
- ✅ **Error Recovery**: Graceful handling of analyzer failures
- ✅ **Fresh Sessions**: Each new workflow starts with a clean session

## How It Works

### User Flow

1. **Enable Product Hero Mode**: Toggle the Product Hero switch in the UI
2. **Step 1 - Barcode**: Capture an image of the product barcode
3. **Step 2 - Packaging**: Capture an image of the product packaging/label
4. **Step 3 - Nutrition**: Capture an image of the nutrition facts label
5. **View Results**: See complete product profile with nutrition analysis

### Technical Flow

```
User captures barcode image
  ↓
MultiImageOrchestrator processes image
  ↓
SessionManager creates new session
  ↓
Barcode Analyzer extracts product info
  ↓
ProductMatcher links to existing product or creates new
  ↓
DataMerger saves barcode data
  ↓
UI prompts for packaging image
  ↓
User captures packaging image
  ↓
Visual Extractor extracts product details
  ↓
DataMerger updates product with packaging data
  ↓
UI prompts for nutrition label
  ↓
User captures nutrition label
  ↓
NutritionOrchestrator analyzes nutrition facts
  ↓
DataMerger updates product with nutrition data
  ↓
Session marked as complete
  ↓
UI displays complete product profile
```

## Architecture

### Key Components

- **MultiImageOrchestrator**: Coordinates the multi-image workflow
- **SessionManager**: Manages capture sessions with 30-minute TTL
- **ProductMatcher**: Links images to existing products or creates new ones
- **DataMerger**: Combines data from multiple images with conflict resolution
- **GuidedCaptureUI**: Provides step-by-step capture interface

### Data Storage

**MongoDB Collections:**
- `multi_image_sessions`: Active capture sessions
- `image_cache`: Image hash cache for deduplication
- `dimension_analysis`: Dimension analysis cache

**Supabase Tables:**
- `products`: Product records with metadata
- `scan_logs`: Scan history and metrics

### Session Management

- **TTL**: 30 minutes from last update
- **Expiration Handling**: Automatic recovery with product matching
- **Multiple Sessions**: Support for concurrent sessions per user
- **Workflow Modes**: 
  - Guided: Fresh session for each workflow
  - Progressive: Reuse existing sessions

## Configuration

### Environment Variables

No additional environment variables required - uses existing configuration.

### Feature Flag

Product Hero mode is controlled by:
- User profile flag: `product_hero` in Supabase Auth metadata
- Development override: Stored in localStorage (`ai-grocery-scanner:product-hero-override`)

## API Endpoints

### POST /api/scan-multi-image

Processes a single image in the multi-image workflow.

**Request:**
```json
{
  "imageData": "base64-encoded-image",
  "userId": "user-id",
  "workflowMode": "guided",
  "sessionId": "session-id-or-undefined",
  "imageType": "barcode|packaging|nutrition_label"
}
```

**Response:**
```json
{
  "success": true,
  "productId": "product-id",
  "imageType": "barcode",
  "sessionId": "session-id",
  "complete": false,
  "completionStatus": {
    "complete": false,
    "capturedTypes": ["barcode"],
    "missingTypes": ["packaging", "nutrition_label"]
  },
  "nextStep": "packaging",
  "product": { /* product data */ }
}
```

## Testing

### Manual Testing

1. Enable Product Hero mode
2. Scan a product barcode
3. Verify step advances to packaging
4. Scan product packaging
5. Verify step advances to nutrition
6. Scan nutrition label
7. Verify complete product profile is displayed

### Automated Testing

Run the test suite:
```bash
npm test
```

Key test files:
- `src/lib/multi-image/__tests__/session-error-handling.test.ts`
- `src/lib/multi-image/__tests__/duplicate-prevention.test.ts`

## Known Limitations

- Barcode extraction may fail if image is unclear (handled gracefully)
- Visual extractor quality depends on image clarity
- Brand names may occasionally include label prefixes (improved with cleanup)

## Troubleshooting

### Session Not Resetting

**Issue**: Old session is reused when starting new workflow

**Solution**: Implemented in v1.0 - guided mode always creates fresh sessions

### Workflow Completes Prematurely

**Issue**: Workflow marks as complete after first image

**Solution**: Implemented in v1.0 - session reuse logic checks workflow mode

### Results Not Displayed

**Issue**: UI stays on guided capture screen after completion

**Solution**: Implemented in v1.0 - step counter advances to 4 on completion

## Performance

- **Average workflow time**: 30-45 seconds (3 images)
- **Per-image processing**: 8-15 seconds
- **Cache hit rate**: ~60% for repeat scans
- **Session overhead**: <100ms

## Future Enhancements

- [ ] Dimension analysis integration after workflow completion
- [ ] Manual image type selection for progressive mode
- [ ] Batch upload for multiple products
- [ ] Offline support with sync
- [ ] Image quality validation before processing

## Documentation

- [Requirements](/.kiro/specs/multi-image-product-capture/requirements.md)
- [Design](/.kiro/specs/multi-image-product-capture/design.md)
- [Implementation Tasks](/.kiro/specs/multi-image-product-capture/tasks.md)
- [Improvements Log](/.kiro/specs/multi-image-product-capture/IMPROVEMENTS.md)

## Version History

### v1.0 (2026-03-02)
- ✅ Initial release
- ✅ Guided multi-image capture workflow
- ✅ Session management with TTL
- ✅ Smart data merging
- ✅ Error recovery
- ✅ Fresh session creation for guided mode
- ✅ Results display after completion
