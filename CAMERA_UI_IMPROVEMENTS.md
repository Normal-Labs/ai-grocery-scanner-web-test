# Camera UI Improvements

## Overview

Standardized camera interface for all test pages with clean, minimal design.

## Design Specifications

### Layout

```
┌─────────────────────────────────────┐
│                              [Close]│  ← Top right corner
│                                     │
│                                     │
│         [Camera Feed]               │
│                                     │
│                                     │
│                                     │
│  Point camera at [item] and take   │  ← Dynamic instruction text
│  a picture                          │
│                                     │
│  [Cancel]          [Capture]        │  ← Bottom buttons
└─────────────────────────────────────┘
```

### Components

1. **Close Button** (Top Right)
   - Position: `absolute top-4 right-4`
   - Style: Red background, white text
   - Text: "✕ Close"
   - Action: Closes camera modal

2. **Camera Feed** (Center)
   - Full screen video
   - No frame overlay
   - No additional text overlays
   - Clean, unobstructed view

3. **Instruction Text** (Bottom, Above Buttons)
   - Dynamic text based on scan type
   - Format: "Point camera at [item] and take a picture"
   - Items:
     - `barcode` - for barcode scanning
     - `packaging` - for product packaging
     - `ingredients` - for ingredient lists
     - `nutrition facts` - for nutrition labels

4. **Action Buttons** (Bottom)
   - Two buttons side by side
   - **Cancel Button** (Left)
     - Style: Red background, white text
     - Text: "✕ Cancel"
     - Action: Closes camera, returns to main page
   - **Capture Button** (Right)
     - Style: White background, dark text
     - Text: "📷 Capture"
     - Action: Captures image and processes

### Removed Elements

- ❌ Frame overlay (white border guide)
- ❌ Additional instruction text
- ❌ Barcode detection status messages
- ❌ Any other overlays or guides

## Implementation

### Components to Update

1. **BarcodeScanner** (`src/components/BarcodeScanner.tsx`)
   - Add `scanType` prop (default: "barcode")
   - Update button layout
   - Remove frame overlay
   - Add dynamic instruction text

2. **ImageScanner** (`src/components/ImageScanner.tsx`)
   - Add `scanType` prop (default: "packaging")
   - Update button layout
   - Remove frame overlay
   - Add dynamic instruction text

### Pages to Update

1. **test-barcode** (`src/app/test-barcode/page.tsx`)
   - Pass `scanType="barcode"` to BarcodeScanner
   - Verify Close button works

2. **test-packaging** (`src/app/test-packaging/page.tsx`)
   - Pass `scanType="packaging"` to ImageScanner
   - Verify Close button works

## Code Changes

### BarcodeScanner Props
```typescript
interface BarcodeScannerProps {
  onScanComplete: (result: { barcode?: string; image?: string; imageMimeType?: string }) => void;
  onError?: (error: string) => void;
  scanType?: 'barcode' | 'packaging' | 'ingredients' | 'nutrition facts';
}
```

### ImageScanner Props
```typescript
interface ImageScannerProps {
  onScanComplete: (result: { image?: string; imageMimeType?: string }) => void;
  onError?: (error: string) => void;
  scanType?: 'barcode' | 'packaging' | 'ingredients' | 'nutrition facts';
}
```

### Instruction Text Helper
```typescript
function getInstructionText(scanType: string): string {
  return `Point camera at ${scanType} and take a picture`;
}
```

## Testing Checklist

### BarcodeScanner (test-barcode page)
- ✅ Close button visible in top-right
- ✅ Close button closes camera
- ✅ No frame overlay visible
- ✅ Instruction text shows "Point camera at barcode and take a picture"
- ✅ Cancel button visible at bottom-left
- ✅ Cancel button closes camera
- ✅ Capture button visible at bottom-right
- ✅ Capture button captures image
- ✅ No extra text or overlays

### ImageScanner (test-packaging page)
- ✅ Close button visible in top-right
- ✅ Close button closes camera
- ✅ No frame overlay visible
- ✅ Instruction text shows "Point camera at packaging and take a picture"
- ✅ Cancel button visible at bottom-left
- ✅ Cancel button closes camera
- ✅ Capture button visible at bottom-right
- ✅ Capture button captures image
- ✅ No extra text or overlays

## Implementation Status

✅ COMPLETED - All camera UI improvements have been implemented.

## Future Extensions

When adding nutrition label test page:
- Pass `scanType="nutrition facts"` to ImageScanner
- Instruction will automatically show "Point camera at nutrition facts and take a picture"

When adding ingredients test page:
- Pass `scanType="ingredients"` to ImageScanner
- Instruction will automatically show "Point camera at ingredients and take a picture"

## Visual Reference

### Before (Old Design)
- Frame overlay with white border
- Multiple text instructions
- Single capture button at bottom
- Cluttered interface

### After (New Design)
- Clean camera feed
- Single instruction line
- Two clear action buttons
- Minimal, focused interface
