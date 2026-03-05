'use client';

/**
 * Nutrition Facts Extraction Test Page
 * 
 * Isolated testing environment for nutrition facts extraction.
 * Extracts: serving size, calories, macros, micronutrients with units and daily values.
 * Saves results to products_dev table for analysis.
 */

import { useState } from 'react';
import ImageScanner from '@/components/ImageScanner';

interface MacroNutrient {
  value: number;
  unit: string;
  dv_percent?: number | null;
}

interface NutritionFacts {
  serving_size: string;
  servings_per_container: number;
  calories_per_serving: number;
  macros: {
    total_fat: MacroNutrient;
    saturated_fat: MacroNutrient;
    trans_fat: { value: number; unit: string };
    cholesterol: MacroNutrient;
    sodium: MacroNutrient;
    total_carbohydrate: MacroNutrient;
    dietary_fiber: MacroNutrient;
    total_sugars: { value: number; unit: string };
    added_sugars: MacroNutrient;
    protein: MacroNutrient;
  };
  vitamins_minerals?: {
    [key: string]: MacroNutrient;
  };
}

interface NutritionResult {
  nutritionFacts: NutritionFacts;
  rawText?: string;
  confidence: number;
  processingTime: number;
  imageSize: number;
  timestamp: Date;
}

export default function TestNutritionPage() {
  const [showScanner, setShowScanner] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<NutritionResult | null>(null);
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
      console.log('[Nutrition Test] 📸 Image captured');
      
      // Calculate image size
      const imageSize = Math.round((scanData.image.length * 3) / 4);
      
      // Call test API endpoint
      const response = await fetch('/api/test-nutrition-extraction', {
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
      
      if (!data.success || !data.nutritionFacts) {
        throw new Error('No nutrition facts found in image');
      }
      
      const nutritionResult: NutritionResult = {
        nutritionFacts: data.nutritionFacts,
        rawText: data.rawText,
        confidence: data.confidence,
        processingTime,
        imageSize,
        timestamp: new Date(),
      };
      
      setResult(nutritionResult);
      setSavedToDb(data.savedToDb);
      
      console.log('[Nutrition Test] ✅ Extraction complete:', nutritionResult);
      
    } catch (err) {
      console.error('[Nutrition Test] ❌ Error:', err);
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

  const formatNutrient = (nutrient: MacroNutrient | { value: number; unit: string }) => {
    if (!nutrient || nutrient.value === null || nutrient.value === undefined) {
      return 'Not listed';
    }
    
    const dvPercent = 'dv_percent' in nutrient && nutrient.dv_percent !== null && nutrient.dv_percent !== undefined
      ? ` (${nutrient.dv_percent}% DV)`
      : '';
    
    return `${nutrient.value}${nutrient.unit}${dvPercent}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            📊 Nutrition Facts Extraction Test
          </h1>
          <p className="text-gray-600 text-sm">
            Test nutrition facts extraction with units and daily values. Results are saved to products_dev table.
          </p>
        </div>

        {/* Instructions */}
        {!result && !loading && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mb-4">
            <h2 className="font-bold text-blue-900 mb-2">📋 Instructions</h2>
            <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
              <li>Click "Scan Nutrition Facts" button below</li>
              <li>Point camera at the Nutrition Facts table on the product</li>
              <li>Ensure the entire table is visible (from "Nutrition Facts" header to bottom)</li>
              <li>Make sure text is in focus and well-lit</li>
              <li>Click "Capture" when ready</li>
              <li>Review extracted nutrition data</li>
            </ol>
            <div className="mt-3 p-3 bg-blue-100 rounded">
              <p className="text-xs text-blue-900 font-medium mb-2">
                💡 Tips for best results:
              </p>
              <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
                <li>Capture the entire bordered Nutrition Facts table</li>
                <li>Avoid glare on the label (angle camera if needed)</li>
                <li>Ensure all rows are visible (serving size to vitamins)</li>
                <li>Hold camera steady and parallel to label</li>
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
            📷 Scan Nutrition Facts
          </button>
        )}

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Extracting nutrition facts...</p>
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
                  Make sure the Nutrition Facts table is clearly visible and in focus.
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
                  ✅ Nutrition Facts Extracted
                </h2>
                {savedToDb && (
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                    💾 Saved to DB
                  </span>
                )}
              </div>

              {/* Serving Information */}
              <div className="bg-white rounded-lg p-4 mb-4">
                <h3 className="text-sm font-bold text-gray-900 mb-3 border-b pb-2">
                  Serving Information
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Serving Size:</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {result.nutritionFacts.serving_size}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Servings Per Container:</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {result.nutritionFacts.servings_per_container}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <span className="text-sm font-bold text-gray-900">Calories:</span>
                    <span className="text-lg font-bold text-gray-900">
                      {result.nutritionFacts.calories_per_serving}
                    </span>
                  </div>
                </div>
              </div>

              {/* Macronutrients */}
              <div className="bg-white rounded-lg p-4 mb-4">
                <h3 className="text-sm font-bold text-gray-900 mb-3 border-b pb-2">
                  Macronutrients
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-700">Total Fat</span>
                    <span className="text-sm font-medium text-gray-900">
                      {formatNutrient(result.nutritionFacts.macros.total_fat)}
                    </span>
                  </div>
                  <div className="flex justify-between pl-4">
                    <span className="text-sm text-gray-600">Saturated Fat</span>
                    <span className="text-sm text-gray-900">
                      {formatNutrient(result.nutritionFacts.macros.saturated_fat)}
                    </span>
                  </div>
                  <div className="flex justify-between pl-4">
                    <span className="text-sm text-gray-600">Trans Fat</span>
                    <span className="text-sm text-gray-900">
                      {formatNutrient(result.nutritionFacts.macros.trans_fat)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-700">Cholesterol</span>
                    <span className="text-sm font-medium text-gray-900">
                      {formatNutrient(result.nutritionFacts.macros.cholesterol)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-700">Sodium</span>
                    <span className="text-sm font-medium text-gray-900">
                      {formatNutrient(result.nutritionFacts.macros.sodium)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-700">Total Carbohydrate</span>
                    <span className="text-sm font-medium text-gray-900">
                      {formatNutrient(result.nutritionFacts.macros.total_carbohydrate)}
                    </span>
                  </div>
                  <div className="flex justify-between pl-4">
                    <span className="text-sm text-gray-600">Dietary Fiber</span>
                    <span className="text-sm text-gray-900">
                      {formatNutrient(result.nutritionFacts.macros.dietary_fiber)}
                    </span>
                  </div>
                  <div className="flex justify-between pl-4">
                    <span className="text-sm text-gray-600">Total Sugars</span>
                    <span className="text-sm text-gray-900">
                      {formatNutrient(result.nutritionFacts.macros.total_sugars)}
                    </span>
                  </div>
                  <div className="flex justify-between pl-8">
                    <span className="text-sm text-gray-600">Added Sugars</span>
                    <span className="text-sm text-gray-900">
                      {formatNutrient(result.nutritionFacts.macros.added_sugars)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-700">Protein</span>
                    <span className="text-sm font-medium text-gray-900">
                      {formatNutrient(result.nutritionFacts.macros.protein)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Vitamins & Minerals */}
              {result.nutritionFacts.vitamins_minerals && Object.keys(result.nutritionFacts.vitamins_minerals).length > 0 && (
                <div className="bg-white rounded-lg p-4 mb-4">
                  <h3 className="text-sm font-bold text-gray-900 mb-3 border-b pb-2">
                    Vitamins & Minerals
                  </h3>
                  <div className="space-y-2">
                    {Object.entries(result.nutritionFacts.vitamins_minerals).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-sm text-gray-700 capitalize">
                          {key.replace(/_/g, ' ')}
                        </span>
                        <span className="text-sm font-medium text-gray-900">
                          {formatNutrient(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
                    <span className={result.confidence >= 0.7 ? 'text-green-600' : 'text-yellow-600'}>
                      {result.confidence >= 0.7 ? '✓' : '⚠'}
                    </span>
                    <span className="text-sm text-gray-700">
                      Confidence: {result.confidence >= 0.7 ? 'High' : 'Medium (verify accuracy)'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={result.nutritionFacts.serving_size ? 'text-green-600' : 'text-red-600'}>
                      {result.nutritionFacts.serving_size ? '✓' : '✗'}
                    </span>
                    <span className="text-sm text-gray-700">
                      Serving size: {result.nutritionFacts.serving_size ? 'Captured' : 'Missing'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={result.nutritionFacts.macros ? 'text-green-600' : 'text-red-600'}>
                      {result.nutritionFacts.macros ? '✓' : '✗'}
                    </span>
                    <span className="text-sm text-gray-700">
                      Macronutrients: {result.nutritionFacts.macros ? 'Complete' : 'Incomplete'}
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
              scanType="nutrition facts"
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
  );
}
