# Cleanup Needed for v2/scan/page.tsx

## Issue
The file `src/app/v2/scan/page.tsx` has duplicate results display code that's causing syntax errors.

## Current State
- Line count: 1184 lines
- ResultsScreen component is integrated (lines ~508-519)
- Old results display code still exists (lines ~520-1130)
- This creates duplicate/conflicting code

## What Needs to Happen

### Option 1: Manual Edit (Recommended)
1. Open `src/app/v2/scan/page.tsx` in your editor
2. Find line 520 (after `{/* Scanner Modal */}`)
3. You'll see old code starting with `<div className="space-y-4">`
4. Delete everything from line 520 to line 1130
5. The Scanner Modal code should start immediately after ResultsScreen closes

### Option 2: Automated Script
Create a script to:
1. Read the file
2. Find the ResultsScreen closing tag
3. Find the Scanner Modal opening tag
4. Remove everything in between
5. Save the file

### What the Clean Structure Should Look Like

```tsx
// ... (existing code: imports, state, handlers)

return (
  <>
    <div className="min-h-screen bg-gray-50 flex justify-center">
      <div className="max-w-md w-full min-h-screen bg-gray-50 p-4 pb-24 shadow-xl">
        <div className="max-w-2xl mx-auto">
        
        {/* Header */}
        {/* Instructions */}
        {/* Scan Button */}
        {/* Loading State */}
        {/* Error Display */}
        
        {/* Results Display - V2 Design */}
        {result && (
          <ResultsScreen
            result={result}
            onBack={handleReset}
            onCompleteScan={() => {
              setShowScanner(true);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            showCompleteScanButton={!loading && !!incompleteScanProductId && isIncomplete(result.steps)}
          />
        )}

        {/* Scanner Modal */}
        {showScanner && (
          <div className="fixed inset-0 bg-black z-50 flex flex-col">
            <ImageScanner
              scanType="packaging"
              instruction={cameraInstructions}
              onScanComplete={handleScanComplete}
              onClose={() => setShowScanner(false)}
              onError={(error) => {
                setError(error);
                setShowScanner(false);
              }}
            />
          </div>
        )}
        </div>
      </div>
    </div>

    {/* Fixed Footer - Only show when results are displayed */}
    {result && !loading && (
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 shadow-lg z-40">
        <div className="max-w-2xl mx-auto p-4">
          <div className="flex gap-3">
            <button onClick={handleReset} className="...">
              📷 Test Another Product
            </button>
            <button onClick={() => window.location.href = '/v2'} className="...">
              🏠 Home
            </button>
            <BuyMeCoffeeButton />
          </div>
        </div>
      </div>
    )}
  </>
);
```

## Lines to Remove
Approximately lines 520-1130 which contain:
- Old "Summary Banner"
- Old "Detailed Results" section
- Old dimension displays (Health, Processing, Allergens)
- Old barcode, packaging, ingredients, nutrition displays
- Duplicate "Complete Scan" button

## Lines to Keep
- 1-519: All setup code, state, handlers, and ResultsScreen component
- 1131+: Scanner Modal and Fixed Footer

## Quick Fix Command
If you're comfortable with command line, you could try:
```bash
# Backup first!
cp src/app/v2/scan/page.tsx src/app/v2/scan/page.tsx.backup

# Then manually edit the file to remove lines 520-1130
```

## Why This Happened
The string replacement approach didn't work because:
1. The old code has complex nested structures
2. Multiple closing braces make it hard to match exactly
3. The file is very long (1184 lines)

## Recommendation
**Manually edit the file** - it's the safest and most reliable approach for this situation.

1. Open the file in your editor
2. Search for "Scanner Modal" comment
3. Delete all the old results code above it (after ResultsScreen closes)
4. Save and test
