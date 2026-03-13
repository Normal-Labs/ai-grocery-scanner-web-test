# Incomplete Scan Update - Fix Summary

## Root Cause Identified

The issue has TWO parts:

### Part 1: Stale ProductId in localStorage
**Problem:** When testing, if you clear the database but don't clear localStorage, the client tries to update a product that no longer exists.

**Flow:**
1. First scan creates product `37ceb1d4` in DB
2. Database is cleared (for testing)
3. localStorage still has `incompleteScanProductId: 37ceb1d4`
4. Second scan tries to update `37ceb1d4`
5. API can't find it: `Failed to fetch existing product: PGRST116`
6. API creates NEW product `15364e88` instead
7. History now has duplicate entries

**Fix Applied:**
- Added `handleNewScan()` function in home page that clears incomplete scan state
- When user clicks "Scan" from home, it clears `incompleteScanProductId` and `cameraInstructions`
- This ensures fresh scans don't try to update non-existent products

### Part 2: History Deduplication Logic
**Problem:** Even when name+brand matching should work, duplicates appear in history.

**Investigation Needed:**
- Added detailed logging to `saveToHistory` to trace deduplication
- Logs will show why items aren't being matched
- Possible issues:
  - Name/brand values are different between scans
  - Whitespace or case sensitivity issues
  - Logic not reaching name+brand fallback

## Changes Made

### 1. Home Page (`src/app/v2/page.tsx`)
- Added `handleNewScan()` function
- Clears `incompleteScanProductId` and `cameraInstructions` from localStorage
- Logs when clearing state
- Applied to both central camera button and bottom scan button

### 2. Results Page (`src/app/v2/results/page.tsx`)
- Enhanced logging throughout `processScan()`
- Added API response logging
- Enhanced `saveToHistory()` with detailed deduplication logs
- Added completeness check logging

### 3. Scan Page (`src/app/v2/scan/page.tsx`)
- Added mount logging to show localStorage state
- Added logging when saving `scanProductId`
- Added logging when capturing image

## Testing Instructions

### Clean Test (Recommended)
1. **Clear everything:**
   - Browser console
   - localStorage (DevTools → Application → Local Storage → Clear All)
   - Database (if needed)

2. **First scan (incomplete):**
   - Click "Scan" from home page
   - Capture image with only packaging visible
   - Check console for:
     - `[Home] 🆕 Starting new scan - cleared incomplete scan state`
     - `[Results] 📦 API Response:` with productId
     - `[Results] 💾 Saved incompleteScanProductId: xxx`
     - `[Results] 💾 Saving to history:` with productId
     - `[Results] 💾 Saved new item to history`

3. **Complete scan:**
   - Click "Complete Scan" button
   - Capture image with nutrition/ingredients
   - Check console for:
     - `[Scan] 🔄 Restored incomplete scan state: xxx`
     - `[Scan] 💾 Saved scanProductId for completion: xxx`
     - `[Results] 🔄 Completing scan for product: xxx`
     - `[Results] 📦 API Response:` with SAME productId
     - `[Results] 🔍 Checking item:` logs showing match detection
     - `[Results] 📋 After filtering duplicates: 0`
     - `[Results] 💾 Updated existing item in history`

4. **Verify:**
   - Database has ONE entry
   - History shows ONE entry
   - Entry has complete data

### Testing with Stale Data
1. **Create incomplete scan**
2. **Clear database only** (leave localStorage)
3. **Try to complete scan**
4. **Expected:** API creates new product (can't find old one)
5. **Check history deduplication logs** to see if name+brand matching works

## Expected Behavior

### New Scan from Home
- Always clears incomplete scan state
- Starts fresh with no productId
- Creates new product in database

### Complete Scan Button
- Preserves incomplete scan state
- Passes productId to API
- Updates existing product in database
- Removes old history entry, adds updated one

### History Deduplication Priority
1. Match by productId (if both have it)
2. Match by barcode (if both have it)
3. Match by name + brand (fallback)

## Known Issues

### Issue: Stale ProductId
**When:** Testing with cleared database but not localStorage
**Impact:** Creates duplicate products
**Workaround:** Always click "Scan" from home page for new products
**Fix:** Home page now clears stale state

### Issue: Missing Browser Logs
**When:** Server logs show but browser logs don't
**Cause:** Logs are client-side, check browser console not server terminal
**Fix:** Open browser DevTools → Console tab

## Next Steps

1. Run clean test with logging
2. Check if history deduplication works correctly
3. If duplicates still appear, analyze the deduplication logs
4. May need to improve name/brand extraction or matching logic

## Files Modified
- `src/app/v2/page.tsx` - Added handleNewScan to clear stale state
- `src/app/v2/results/page.tsx` - Enhanced logging throughout
- `src/app/v2/scan/page.tsx` - Enhanced logging throughout
