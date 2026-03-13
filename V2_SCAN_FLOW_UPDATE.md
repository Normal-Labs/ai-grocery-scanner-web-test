# V2 Scan Flow Update - Loading Indicator

## Overview
Updated the V2 scan flow to redirect users immediately to the results page with a loading indicator while the scan is being processed, providing better UX feedback.

## Changes Made

### 1. Scan Page (`src/app/v2/scan/page.tsx`)
- **Immediate Redirect**: When user captures an image, they are immediately redirected to `/v2/results`
- **State Persistence**: Scan data is stored in localStorage with processing flags:
  - `scanProcessing`: Flag indicating scan is being processed
  - `scanImage`: The captured image data
  - `scanProductId`: Product ID if completing an incomplete scan
- **Simplified Flow**: Removed loading state from scan page - all processing happens on results page

### 2. Results Page (`src/app/v2/results/page.tsx`)
- **Processing Detection**: Checks for `scanProcessing` flag on mount
- **Loading Indicator**: Shows animated spinner with status messages while processing:
  - "Analyzing Product"
  - "Extracting product information..."
  - "Analyzing nutrition and ingredients..."
- **API Processing**: Performs the actual scan API call on results page
- **Error Handling**: Shows error state with retry button if scan fails
- **History Management**: Saves completed scans to history automatically
- **Incomplete Scan Detection**: Tracks incomplete scans and shows "Complete Scan" button

### 3. User Flow

#### New Scan Flow:
1. User clicks "Scan" button (from any page: landing, history, or results)
2. Camera opens on `/v2/scan`
3. User captures image
4. **Immediately redirected to `/v2/results`**
5. Results page shows loading indicator with status
6. API processes the scan in background
7. Results appear when processing completes

#### From History:
1. User clicks product in history
2. Redirects to `/v2/results`
3. Loads existing result from localStorage (no loading state)

### 4. Loading States

**Processing State:**
```
┌─────────────────────────┐
│   Analyzing Product     │
│                         │
│      [Spinner Icon]     │
│                         │
│ Extracting product      │
│ information...          │
└─────────────────────────┘
```

**Error State:**
```
┌─────────────────────────┐
│  ⚠️  Scan Failed        │
│                         │
│  [Error message]        │
│                         │
│  [Try Again Button]     │
└─────────────────────────┘
```

### 5. LocalStorage Keys Used

| Key | Purpose | Cleared When |
|-----|---------|--------------|
| `scanProcessing` | Flag indicating scan in progress | After processing completes/fails |
| `scanImage` | Base64 image data | After processing completes/fails |
| `scanProductId` | Product ID for incomplete scans | After processing completes/fails |
| `currentScanResult` | Latest scan result | When user navigates back |
| `incompleteScanProductId` | Tracks incomplete scans | When scan becomes complete |
| `cameraInstructions` | Instructions for next scan | When scan becomes complete |
| `scanHistory` | Array of past scans | When user clears history |

## Benefits

1. **Better UX**: Users see immediate feedback instead of waiting on camera screen
2. **Consistent Location**: All results always shown on results page
3. **Clear Status**: Loading messages inform user what's happening
4. **Error Recovery**: Clear error messages with retry option
5. **Navigation**: Users can navigate away and back without losing state

## Testing Checklist

- [ ] Scan from landing page → redirects to results with loading
- [ ] Scan from history page → redirects to results with loading
- [ ] Scan from results page → redirects to results with loading
- [ ] Loading indicator shows during processing
- [ ] Results appear after processing completes
- [ ] Error state shows if scan fails
- [ ] Retry button works after error
- [ ] History saves completed scans
- [ ] Incomplete scans show "Complete Scan" button
- [ ] Viewing history item loads immediately (no loading state)

## Files Modified

1. `src/app/v2/scan/page.tsx` - Simplified to redirect immediately
2. `src/app/v2/results/page.tsx` - Added processing logic and loading states
3. `src/components/v2/HistoryScreen.tsx` - Added footer with scan button
4. `src/components/v2/ResultsScreen.tsx` - Added footer with scan button

## Build Status

✅ Build successful - all routes generated correctly
