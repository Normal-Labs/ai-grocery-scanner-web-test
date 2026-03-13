# Incomplete Scan Update - Debug Guide

## Issue
When users complete an incomplete scan with multiple images, the system is creating duplicate entries in both the history and database instead of updating the existing record.

## Expected Flow

### First Scan (Incomplete)
1. User scans product → Results page processes
2. API creates product in DB with `productId` (e.g., `834ed621`)
3. Results page detects incomplete scan
4. Saves `incompleteScanProductId` to localStorage
5. Shows "Complete Scan" button

### Second Scan (Completing)
1. User clicks "Complete Scan" → Navigates to `/v2/scan`
2. Scan page loads `incompleteScanProductId` from localStorage
3. User captures new image
4. Scan page saves `scanProductId` = `incompleteScanProductId` to localStorage
5. Redirects to `/v2/results`

### Results Processing (Update)
1. Results page reads `scanProductId` from localStorage
2. Sends API request with `productId` parameter
3. API updates existing product in database (merges new data)
4. Returns updated product with same `productId`
5. `saveToHistory()` removes old entry by matching `productId`
6. Adds updated entry to beginning of history

## Debug Logs Added

### Scan Page (`/v2/scan`)
- `[Scan] 🔄 Mount - checking for incomplete scan`
- `[Scan] 📋 localStorage on mount:` - Shows incompleteScanProductId and instructions
- `[Scan] 📸 Image captured, preparing to redirect`
- `[Scan] 📋 Current state:` - Shows if productId will be passed
- `[Scan] 💾 Saved scanProductId for completion:` - Confirms productId saved

### Results Page (`/v2/results`)
- `[Results] 📋 localStorage state:` - Shows scanProductId and incompleteScanProductId
- `[Results] 🔄 Completing scan for product:` - Confirms productId sent to API
- `[Results] 📊 Scan completeness check:` - Shows incomplete status and missing steps
- `[Results] 💾 Saved incompleteScanProductId:` - Confirms productId saved for next scan
- `[Results] 📜 Loaded existing result from localStorage` - When viewing from history

## What to Check

### Test Scenario
1. Scan a product that only captures packaging (incomplete)
2. Check console logs for first scan
3. Click "Complete Scan" button
4. Check console logs when scan page opens
5. Capture second image with more info
6. Check console logs during processing
7. Verify database has only ONE entry (updated)
8. Verify history has only ONE entry (updated)

### Key Log Checkpoints

**After First Scan:**
```
[Results] 📊 Scan completeness check: { incomplete: true, productId: "xxx", missingSteps: [...] }
[Results] 💾 Saved incompleteScanProductId: xxx
```

**When Opening Scan Page:**
```
[Scan] 📋 localStorage on mount: { incompleteScanProductId: "xxx", ... }
[Scan] 🔄 Restored incomplete scan state: xxx
```

**After Capturing Second Image:**
```
[Scan] 📋 Current state: { incompleteScanProductId: "xxx", willPassProductId: true }
[Scan] 💾 Saved scanProductId for completion: xxx
```

**When Processing Second Scan:**
```
[Results] 📋 localStorage state: { hasScanImage: true, scanProductId: "xxx", ... }
[Results] 🔄 Completing scan for product: xxx
```

**API Should Log:**
```
[Test All API] 🔄 Completing scan for existing product: xxx
[Test All API] 🔄 Updating existing product: xxx
[Test All API] 💾 Updated product via multi-scan: xxx
```

## Potential Issues

### Issue 1: productId Not Saved
- Check if `incompleteScanProductId` is null after first scan
- Verify API returns `productId` in response

### Issue 2: productId Not Loaded
- Check if scan page properly reads from localStorage
- Verify state is set before user captures image

### Issue 3: productId Not Passed to API
- Check if `scanProductId` is saved to localStorage
- Verify results page reads it correctly

### Issue 4: API Creates New Instead of Update
- Check if API receives `productId` parameter
- Verify API finds existing product in database
- Check if barcode/name matching fails

## Files Modified
- `src/app/v2/results/page.tsx` - Added logging to processScan and loadResult
- `src/app/v2/scan/page.tsx` - Added logging to mount and handleScanComplete

## Next Steps
1. Run test scenario with console open
2. Copy all logs to identify where productId is lost
3. Fix the specific issue based on logs
4. Verify fix with another test
