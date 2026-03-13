# Test Incomplete Scan Update

## Test Scenario

### Step 1: First Scan (Incomplete)
1. Navigate to `/v2`
2. Click "Scan" button
3. Capture image showing ONLY the front of package (product name/brand visible)
4. Wait for processing to complete
5. **Check browser console for:**
   - `[Results] 📦 API Response:` - Should show `productId: "xxx"`, `savedToDb: true`
   - `[Results] 📊 Scan completeness check:` - Should show `incomplete: true`
   - `[Results] 💾 Saved incompleteScanProductId: xxx`
   - `[Results] 💾 Saving to history:` - Should show the productId
6. **Verify UI shows:**
   - "Complete Scan" button is visible
   - Extraction Status shows some steps as "Missing"

### Step 2: Complete Scan
1. Click "Complete Scan" button
2. **Check browser console for:**
   - `[Results] 🔄 User clicked Complete Scan button`
   - `[Results] 📋 Current incompleteScanProductId: xxx` (should match Step 1)
   - `[Scan] 🔄 Mount - checking for incomplete scan`
   - `[Scan] 📋 localStorage on mount:` - Should show `incompleteScanProductId: "xxx"`
   - `[Scan] 🔄 Restored incomplete scan state: xxx`
3. Capture image showing nutrition facts and ingredients
4. **Check browser console for:**
   - `[Scan] 📋 Current state:` - Should show `incompleteScanProductId: "xxx"`, `willPassProductId: true`
   - `[Scan] 💾 Saved scanProductId for completion: xxx`
5. Wait for processing
6. **Check browser console for:**
   - `[Results] 📋 localStorage state:` - Should show `scanProductId: "xxx"`
   - `[Results] 🔄 Completing scan for product: xxx`
   - `[Results] 📦 API Response:` - Should show SAME `productId: "xxx"`
   - `[Results] 💾 Saving to history:` - Should show same productId
   - `[Results] 📋 After filtering duplicates:` - Should be 0 (removed old entry)
   - `[Results] 💾 Updated existing item in history`

### Step 3: Verify Results
1. **Check database:**
   - Should have ONLY ONE entry for this product
   - The entry should have complete data (merged from both scans)
2. **Check history page:**
   - Should show ONLY ONE entry for this product
   - Entry should be at the top with latest timestamp
3. **Check localStorage:**
   - Open DevTools → Application → Local Storage
   - Check `scanHistory` - should have only one entry for this product

## Expected Server Logs

### First Scan:
```
[Test All API] 📥 Starting complete extraction (single API call)
[Test All API] ➕ Creating new product entry
[Test All API] 💾 Inserted to products: xxx
```

### Second Scan (Completion):
```
[Test All API] 📥 Starting complete extraction (single API call)
[Test All API] 🔄 Completing scan for existing product: xxx
[Test All API] 🔄 Updating existing product: xxx
[Test All API] 💾 Updated product via multi-scan: xxx
```

## Common Issues

### Issue: Second scan creates new product
**Symptoms:**
- Server logs show "Creating new product entry" instead of "Updating existing product"
- Database has two entries
- History has two entries

**Possible Causes:**
1. `incompleteScanProductId` not saved after first scan
2. `incompleteScanProductId` not loaded when opening scan page
3. `scanProductId` not passed to API
4. User refreshed page between scans (clears state)

**Debug:**
- Check browser console for all `[Results]` and `[Scan]` logs
- Verify productId is present in each step
- Check localStorage in DevTools

### Issue: History shows duplicates
**Symptoms:**
- Database has one entry (correct)
- History shows two entries

**Possible Causes:**
1. `saveToHistory` not filtering by productId correctly
2. productId is null/undefined
3. Different productIds between scans

**Debug:**
- Check `[Results] 💾 Saving to history:` logs
- Verify productId matches between scans
- Check `[Results] 📋 After filtering duplicates:` count

## Success Criteria
✅ Database has exactly ONE entry for the product
✅ History shows exactly ONE entry for the product  
✅ Entry shows complete data from both scans
✅ Browser console shows productId being passed through all steps
✅ Server logs show "Updated product via multi-scan"
