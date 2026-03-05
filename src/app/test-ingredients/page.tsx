'use client';

/**
 * Ingredients Extraction Test Page
 * 
 * Isolated testing environment for ingredient list extraction.
 * Extracts: complete ingredient list with sub-ingredients preserved.
 * Saves results to products_dev table for analysis.
 */

import { useState } from 'react';
import ImageScanner from '@/components/ImageScanner';

interface IngredientsResult {
  ingredients: string[];
  rawText?: string;
  confidence: number;
  ingredientCount: number;
  processingTime: number;
  imageSize: number;
  timestamp: Date;
}

export default function TestIngredientsPage() {
  const [showScanner, setShowScanner] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<IngredientsResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedToDb, setSavedToDb] = useState(false);

  const handleScanComplete = async (scanData: {
    image?: string;
    imageMimeType?: string;
  }) => {
    setShowScanner(false);
    setLoading(true);
    setError(null);
    setSavedToDb(false);
    
    if (!scanData.image) {
      setError('No image captured');
      setLoading(false);
      return;
    }
    
    const startTime = Date.now();
    
    try {
      console.log('[Ingredients Test] 📸 Image captured');
      
      // Calculate image size
      const imageSize = Math.round((scanData.image.length * 3) / 4);
      
      // Call test API endpoint
      const response = await fetch('/api/test-ingredients-extraction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: scanData.image,
        }),
      });
      
      const processingTime = Date.now() - startTime;
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Extraction failed');
      }
      
      const data = await response.json();
      
      if (!data.success || !data.ingredients || data.ingredients.length === 0) {
        throw new Error('No ingredients found in image');
      }
      
      const ingredientsResult: IngredientsResult = {
        ingredients: data.ingredients,
        rawText: data.rawText,
        confidence: data.confidence,
        ingredientCount: data.ingredientCount,
        processingTime,
        imageSize,
        timestamp: new Date(),
      };
      
      setResult(ingredientsResult);
      setSavedToDb(data.savedToDb);
      
      console.log('[Ingredients Test] ✅ Extraction complete:', ingredientsResult);
      
    } catch (err) {
      console.error('[Ingredients Test] ❌ Error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
    setSavedToDb(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            🥫 Ingredients Extraction Test
          </h1>
          <p className="text-gray-600 text-sm">
            Test ingredient list extraction with sub-ingredient preservation. Results are saved to products_dev table.
          </p>
        </div>

        {/* Instructions */}
        {!result && !loading && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mb-4">
            <h2 className="font-bold text-blue-900 mb-2">📋 Instructions</h2>
            <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
              <li>Click "Scan Ingredients" button below</li>
              <li>Point camera at the ingredient list on the product label</li>
              <li>Ensure the word "Ingredients" and the full list are visible</li>
              <li>Make sure text is in focus and well-lit</li>
              <li>Click "Capture" when ready</li>
              <li>Review extracted ingredients</li>
            </ol>
            <div className="mt-3 p-3 bg-blue-100 rounded">
              <p className="text-xs text-blue-900 font-medium mb-2">
                💡 Tips for best results:
              </p>
              <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
                <li>Capture the entire ingredient list in one shot</li>
                <li>Avoid glare and shadows on the label</li>
                <li>Hold camera steady and parallel to the label</li>
                <li>Ensure text is not cut off at edges</li>
              </ul>
            </div>
          </div>
        )}

        {/* Capture Button */}
        {!result && !loading && (
          <button
            onClick={() => setShowScanner(true)}
            className="w-full px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors text-lg"
          >
            📷 Scan Ingredients
          </button>
        )}

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Extracting ingredient list...</p>
            <p className="text-sm text-gray-500 mt-2">This may take a few seconds</p>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border-2 border-red-300 rounded-lg p-6 mb-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div className="flex-1">
                <h3 className="font-bold text-red-900 mb-1">Extraction Failed</h3>
                <p className="text-red-800 text-sm">{error}</p>
                <p className="text-xs text-red-700 mt-2">
                  Make sure the ingredient list is clearly visible and in focus.
                </p>
              </div>
            </div>
            <button
              onClick={handleReset}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Results Display */}
        {result && (
          <div className="space-y-4">
            {/* Success Banner */}
            <div className="bg-green-50 border-2 border-green-300 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-green-900">
                  ✅ Ingredients Extracted
                </h2>
                {savedToDb && (
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                    💾 Saved to DB
                  </span>
                )}
              </div>

              {/* Ingredient Count */}
              <div className="bg-white rounded-lg p-4 mb-4">
                <p className="text-xs text-gray-600 mb-1">Total Ingredients:</p>
                <p className="text-3xl font-bold text-gray-900">
                  {result.ingredientCount}
                </p>
              </div>

              {/* Ingredients List */}
              <div className="bg-white rounded-lg p-4 mb-4">
                <p className="text-xs text-gray-600 mb-3 font-semibold">Ingredient List:</p>
                <ol className="space-y-2">
                  {result.ingredients.map((ingredient, index) => (
                    <li key={index} className="text-sm text-gray-900 flex">
                      <span className="text-gray-500 mr-2 font-medium">{index + 1}.</span>
                      <span className="flex-1">{ingredient}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-white rounded-lg p-3">
                  <p className="text-xs text-gray-600 mb-1">Processing Time</p>
                  <p className="text-lg font-bold text-gray-900">{result.processingTime}ms</p>
                </div>
                <div className="bg-white rounded-lg p-3">
                  <p className="text-xs text-gray-600 mb-1">Confidence</p>
                  <p className="text-lg font-bold text-gray-900">
                    {(result.confidence * 100).toFixed(0)}%
                  </p>
                </div>
                <div className="bg-white rounded-lg p-3 col-span-2">
                  <p className="text-xs text-gray-600 mb-1">Image Size</p>
                  <p className="text-lg font-bold text-gray-900">
                    {(result.imageSize / 1024).toFixed(1)}KB
                  </p>
                </div>
              </div>

              {/* Quality Indicators */}
              <div className="bg-white rounded-lg p-4 mb-4">
                <p className="text-xs text-gray-600 mb-2 font-semibold">Quality Checks:</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className={result.ingredientCount >= 3 ? 'text-green-600' : 'text-yellow-600'}>
                      {result.ingredientCount >= 3 ? '✓' : '⚠'}
                    </span>
                    <span className="text-sm text-gray-700">
                      Ingredient count: {result.ingredientCount >= 3 ? 'Good' : 'Low (may be incomplete)'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={result.confidence >= 0.7 ? 'text-green-600' : 'text-yellow-600'}>
                      {result.confidence >= 0.7 ? '✓' : '⚠'}
                    </span>
                    <span className="text-sm text-gray-700">
                      Confidence: {result.confidence >= 0.7 ? 'High' : 'Medium (verify accuracy)'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={result.ingredients.some(i => i.includes('(')) ? 'text-green-600' : 'text-gray-400'}>
                      {result.ingredients.some(i => i.includes('(')) ? '✓' : '○'}
                    </span>
                    <span className="text-sm text-gray-700">
                      Sub-ingredients: {result.ingredients.some(i => i.includes('(')) ? 'Preserved' : 'None detected'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Raw Text (for debugging) */}
              {result.rawText && (
                <details className="bg-white rounded-lg p-3">
                  <summary className="cursor-pointer text-sm font-medium text-gray-700">
                    View Raw Extraction Response
                  </summary>
                  <pre className="mt-2 text-xs text-gray-600 whitespace-pre-wrap font-mono max-h-48 overflow-auto">
                    {result.rawText}
                  </pre>
                </details>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleReset}
                className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
              >
                Test Another Product
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition-colors"
              >
                Back to Home
              </button>
            </div>
          </div>
        )}

        {/* Scanner Modal */}
        {showScanner && (
          <div className="fixed inset-0 bg-black z-50 flex flex-col">
            <ImageScanner
              scanType="ingredients"
              onScanComplete={handleScanComplete}
              onError={(error) => {
                setError(error);
                setShowScanner(false);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
