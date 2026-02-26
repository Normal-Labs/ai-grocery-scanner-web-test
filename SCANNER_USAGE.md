# Product Scanner Usage Guide

## Overview

The product scanner provides a seamless single-photo experience that automatically detects barcodes or falls back to image-based identification.

## How It Works

### User Flow
1. User opens `/scan` page
2. Clicks "Start Camera" to activate device camera
3. Points camera at product (barcode or packaging)
4. Clicks "Capture" to take photo
5. System automatically:
   - Detects barcode if present → Tier 1 lookup
   - Falls back to image analysis if no barcode → Tier 2/4
6. Results displayed with product details

### Technical Flow

```
User takes photo
    ↓
Browser Barcode Detection API
    ↓
Barcode found? ──YES──> Send barcode to /api/scan-multi-tier (Tier 1)
    ↓ NO
Send image to /api/scan-multi-tier (Tier 2/4)
    ↓
Display results
```

## Features Implemented

### ✅ Barcode Detection (Task 13.1)
- Uses browser's native Barcode Detection API
- Supports: UPC-A, UPC-E, EAN-8, EAN-13, Code-39, Code-93, Code-128, ITF, QR codes
- Automatic format detection
- Falls back gracefully if API not supported

### ✅ Visual Feedback (Task 13.2)
- Green bounding box highlights detected barcodes
- Barcode value overlay on captured image
- Haptic feedback (vibration) on successful detection
- Real-time camera preview with targeting guide

### ✅ Error Handling & Fallback (Task 13.3)
- Graceful camera permission handling
- Browser compatibility detection
- Automatic fallback to image-based identification
- Resource cleanup on component unmount

### ✅ Backend Integration (Task 13.4)
- Sends barcode to `/api/scan-multi-tier` for Tier 1 lookup
- Sends image for Tier 2/4 if no barcode detected
- Displays tier used, confidence score, processing time
- Shows warnings for low confidence results

## Browser Compatibility

### Barcode Detection API Support
- ✅ Chrome/Edge 83+ (Android, Desktop)
- ✅ Samsung Internet 13+
- ❌ Safari (falls back to image-based)
- ❌ Firefox (falls back to image-based)

When Barcode Detection API is not available, the system automatically uses image-based identification (Tier 2/4).

## Usage

### For Users
1. Navigate to `/scan`
2. Grant camera permissions when prompted
3. Point camera at product
4. Capture photo
5. View results

### For Developers

```tsx
import BarcodeScanner from '@/components/BarcodeScanner';

<BarcodeScanner
  onScanComplete={(result) => {
    // result.barcode - detected barcode (if any)
    // result.image - base64 image data
    // result.imageMimeType - image MIME type
  }}
  onError={(error) => {
    console.error('Scanner error:', error);
  }}
/>
```

## Testing

### Test Scenarios

1. **Barcode Detection**
   - Use product with visible barcode
   - Should detect and highlight barcode
   - Should send barcode to backend (Tier 1)

2. **Image Fallback**
   - Use product without barcode
   - Should capture image
   - Should send image to backend (Tier 2/4)

3. **Error Handling**
   - Deny camera permissions → Should show error
   - Use unsupported browser → Should show warning
   - Network error → Should display error message

## Performance

- Camera initialization: ~500ms
- Barcode detection: ~100-300ms
- Image capture: ~200ms
- Tier 1 (cached barcode): ~500ms
- Tier 2 + Tier 4 (new product): ~16-20 seconds (includes 10s rate limit delay)

## Known Issues & Limitations

### Gemini API Rate Limits
- **Issue**: Tier 1 paid accounts have a known bug where they're throttled at free-tier limits (15 RPM)
- **Impact**: Scanning new products requires 10-second delay between Tier 2 and Tier 4
- **Workaround**: Wait 60+ seconds between separate scan sessions
- **Best Practice**: Products with barcodes in the database return instantly (~500ms)
- **Solution**: Contact Google Support to fix API key rate limits

### Caching Behavior
- Products cached by both barcode AND image hash
- Each new photo generates different image hash
- For instant results, scan same barcode twice:
  - First scan: Creates product (~16-20s)
  - Second scan: Hits cache (~500ms)

### Browser Compatibility
- Barcode Detection API not available in Safari/Firefox
- System automatically falls back to image-based identification
- All features work, just without real-time barcode highlighting

## Security & Privacy

- Camera access requires user permission
- Images processed client-side for barcode detection
- Images sent to backend only after user captures
- No continuous video streaming to server
- Camera resources released when not in use

## Future Enhancements

- [ ] Continuous barcode scanning (no capture button)
- [ ] Multiple barcode detection in single image
- [ ] Image quality validation before sending
- [ ] Offline barcode caching
- [ ] Barcode history/favorites
