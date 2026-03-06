'use client';

/**
 * Complete Extraction Test Page
 * 
 * Orchestrates all extraction types sequentially:
 * 1. Barcode detection
 * 2. Packaging information
 * 3. Ingredients list
 * 4. Nutrition facts
 * 
 * Shows progress and results for each step.
 */

import { useState } from 'react';
import ImageScanner from '@/components/ImageScanner';

interface ExtractionStep {
  name: string;
  status: 'pending' | 'processing' | 'success' | 'failed' | 'skipped';
  data?: any;
  error?: string;
  confidence?: number;
  processingTime?: number;
}

interface HealthDimensionResult {
  score: number;
  explanation: string;
  key_factors: string[];
  confidence: number;
}

interface ProcessingDimensionResult {
  score: number;
  explanation: string;
  key_factors: string[];
  additives_detected: {
    preservatives: string[];
    artificial_sweeteners: string[];
    artificial_colors: string[];
    other_additives: string[];
  };
  confidence: number;
}

interface AllergensDimensionResult {
  score: number;
  explanation: string;
  key_factors: string[];
  allergens_detected: {
    major_allergens: string[];
    other_allergens: string[];
    cross_contamination_warnings: string[];
    allergen_free_claims: string[];
  };
  confidence: number;
}

interface AllExtractionResult {
  cached?: boolean;
  cacheAge?: number;
  steps: {
    barcode: ExtractionStep;
    packaging: ExtractionStep;
    ingredients: ExtractionStep;
    nutrition: ExtractionStep;
  };
  healthDimension?: HealthDimensionResult;
  processingDimension?: ProcessingDimensionResult;
  allergensDimension?: AllergensDimensionResult;
  productId?: string;
  savedToDb: boolean;
  totalProcessingTime: number;
  imageSize: number;
  timestamp: Date;
}

export default function TestAllPage() {
  const [showScanner, setShowScanner] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [result, setResult] = useState<AllExtractionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleScanComplete = async (scanData: {
    image?: string;
    imageMimeType?: string;
  }) => {
    setShowScanner(false);
    setLoading(true);
    setError(null);
    setCurrentStep('Starting extraction...');
    
    if (!scanData.image) {
      setError('No image captured');
      setLoading(false);
      return;
    }
    
    const startTime = Date.now();
    
    try {
      console.log('[Test All] 📸 Image captured');
      
      // Calculate image size
      const imageSize = Math.round((scanData.image.length * 3) / 4);
      
      // Call test API endpoint
      const response = await fetch('/api/test-all-extraction', {
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
      
      const extractionResult: AllExtractionResult = {
        cached: data.cached,
        cacheAge: data.cacheAge,
        steps: data.steps,
        healthDimension: data.healthDimension,
        processingDimension: data.processingDimension,
        allergensDimension: data.allergensDimension,
        productId: data.productId,
        savedToDb: data.savedToDb,
        totalProcessingTime: processingTime,
        imageSize,
        timestamp: new Date(),
      };
      
      setResult(extractionResult);
      setCurrentStep('');
      
      console.log('[Test All] ✅ Extraction complete:', extractionResult);
      
    } catch (err) {
      console.error('[Test All] ❌ Error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setCurrentStep('');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
    setCurrentStep('');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return '✅';
      case 'failed': return '❌';
      case 'processing': return '⏳';
      case 'pending': return '⏸️';
      default: return '○';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600';
      case 'failed': return 'text-red-600';
      case 'processing': return 'text-blue-600';
      default: return 'text-gray-400';
    }
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50';
    if (score >= 40) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  const getHealthScoreLabel = (score: number) => {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Very Good';
    if (score >= 70) return 'Good';
    if (score >= 60) return 'Fair';
    if (score >= 50) return 'Below Average';
    if (score >= 40) return 'Poor';
    if (score >= 30) return 'Very Poor';
    return 'Extremely Poor';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            🔬 Complete Product Extraction Test
          </h1>
          <p className="text-gray-600 text-sm">
            Test all extraction types in sequence: barcode → packaging → ingredients → nutrition
          </p>
        </div>

        {/* Instructions */}
        {!result && !loading && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mb-4">
            <h2 className="font-bold text-blue-900 mb-2">📋 Instructions</h2>
            <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
              <li>Click "Start Complete Scan" button below</li>
              <li>Capture ONE image showing the product</li>
              <li>System will extract all information from this single image</li>
              <li>If ingredients and nutrition are found, health dimension analysis will run automatically</li>
              <li>If ingredients are found, processing and allergens dimension analysis will run automatically</li>
              <li>Review results for each extraction type and dimension scores</li>
            </ol>
            <div className="mt-3 p-3 bg-blue-100 rounded">
              <p className="text-xs text-blue-900 font-medium mb-2">
                💡 Best practices:
              </p>
              <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
                <li>Capture image with barcode, product name, ingredients, and nutrition label visible</li>
                <li>Good lighting and focus are critical</li>
                <li>Health dimension analyzes nutritional value (0-100 score)</li>
                <li>Processing dimension detects preservatives, artificial additives, and processing level</li>
                <li>Allergens dimension identifies major allergens and cross-contamination risks</li>
                <li>If one extraction fails, others will still proceed</li>
              </ul>
            </div>
          </div>
        )}

        {/* Scan Button */}
        {!result && !loading && (
          <button
            onClick={() => setShowScanner(true)}
            className="w-full px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors text-lg"
          >
            📷 Start Complete Scan
          </button>
        )}

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center mb-6">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 font-medium">Processing all extractions...</p>
              {currentStep && (
                <p className="text-sm text-gray-500 mt-2">{currentStep}</p>
              )}
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded">
                <span className="text-xl">⏳</span>
                <span className="text-sm text-gray-700">Step 1: Barcode detection</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded">
                <span className="text-xl">⏳</span>
                <span className="text-sm text-gray-700">Step 2: Packaging information</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded">
                <span className="text-xl">⏳</span>
                <span className="text-sm text-gray-700">Step 3: Ingredients list</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded">
                <span className="text-xl">⏳</span>
                <span className="text-sm text-gray-700">Step 4: Nutrition facts</span>
              </div>
            </div>
            
            <p className="text-xs text-gray-500 text-center mt-4">
              This may take 20-25 seconds with rate limiting delays
            </p>
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
            {/* Summary Banner */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  Extraction Complete
                </h2>
                <div className="flex gap-2">
                  {result.cached && (
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                      ⚡ Cached ({result.cacheAge} days old)
                    </span>
                  )}
                  {result.savedToDb && (
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                      💾 Saved to DB
                    </span>
                  )}
                </div>
              </div>

              {/* Overall Metrics */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-600 mb-1">Total Time</p>
                  <p className="text-lg font-bold text-gray-900">
                    {(result.totalProcessingTime / 1000).toFixed(1)}s
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-600 mb-1">Image Size</p>
                  <p className="text-lg font-bold text-gray-900">
                    {(result.imageSize / 1024).toFixed(1)}KB
                  </p>
                </div>
              </div>

              {/* Step Status Overview */}
              <div className="space-y-2">
                {Object.entries(result.steps).map(([key, step]) => (
                  <div
                    key={key}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      step.status === 'success' ? 'bg-green-50' :
                      step.status === 'failed' ? 'bg-red-50' :
                      'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`text-xl ${getStatusColor(step.status)}`}>
                        {getStatusIcon(step.status)}
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {step.name}
                      </span>
                    </div>
                    {step.processingTime && (
                      <span className="text-xs text-gray-500">
                        {step.processingTime}ms
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Detailed Results - Scrollable */}
            <div className="bg-white rounded-lg shadow-lg p-6 max-h-[600px] overflow-y-auto">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Detailed Results</h3>

              {/* Barcode Results */}
              {result.steps.barcode.status === 'success' && result.steps.barcode.data && (
                <div className="mb-6 pb-6 border-b">
                  <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <span>🔍</span>
                    Barcode Detection
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Barcode Number:</p>
                    <p className="text-2xl font-mono font-bold text-gray-900">
                      {result.steps.barcode.data.barcode}
                    </p>
                  </div>
                </div>
              )}

              {/* Packaging Results */}
              {result.steps.packaging.status === 'success' && result.steps.packaging.data && (
                <div className="mb-6 pb-6 border-b">
                  <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <span>📦</span>
                    Packaging Information
                  </h4>
                  <div className="space-y-3">
                    {result.steps.packaging.data.productName && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-600 mb-1">Product Name:</p>
                        <p className="text-lg font-bold text-gray-900">
                          {result.steps.packaging.data.productName}
                        </p>
                      </div>
                    )}
                    {result.steps.packaging.data.brand && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-600 mb-1">Brand:</p>
                        <p className="text-base font-semibold text-gray-900">
                          {result.steps.packaging.data.brand}
                        </p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      {result.steps.packaging.data.size && (
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-xs text-gray-600 mb-1">Size:</p>
                          <p className="text-sm font-medium text-gray-900">
                            {result.steps.packaging.data.size}
                          </p>
                        </div>
                      )}
                      {result.steps.packaging.data.category && (
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-xs text-gray-600 mb-1">Category:</p>
                          <p className="text-sm font-medium text-gray-900">
                            {result.steps.packaging.data.category}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Ingredients Results */}
              {result.steps.ingredients.status === 'success' && result.steps.ingredients.data && (
                <div className="mb-6 pb-6 border-b">
                  <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <span>🥫</span>
                    Ingredients List
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-600 mb-3">
                      Total: {result.steps.ingredients.data.ingredients.length} ingredients
                    </p>
                    <ol className="space-y-2">
                      {result.steps.ingredients.data.ingredients.map((ingredient: string, index: number) => (
                        <li key={index} className="text-sm text-gray-900 flex">
                          <span className="text-gray-500 mr-2 font-medium">{index + 1}.</span>
                          <span className="flex-1">{ingredient}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              )}

              {/* Nutrition Results */}
              {result.steps.nutrition.status === 'success' && result.steps.nutrition.data && (
                <div className="mb-6 pb-6 border-b">
                  <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <span>📊</span>
                    Nutrition Facts
                  </h4>
                  
                  {/* Serving Info */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-3">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Serving Size:</span>
                        <span className="text-sm font-semibold text-gray-900">
                          {result.steps.nutrition.data.serving_size}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Servings Per Container:</span>
                        <span className="text-sm font-semibold text-gray-900">
                          {result.steps.nutrition.data.servings_per_container}
                        </span>
                      </div>
                      <div className="flex justify-between pt-2 border-t">
                        <span className="text-sm font-bold text-gray-900">Calories:</span>
                        <span className="text-lg font-bold text-gray-900">
                          {result.steps.nutrition.data.calories_per_serving}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Macros */}
                  {result.steps.nutrition.data.macros && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-xs font-bold text-gray-900 mb-3">Macronutrients</p>
                      <div className="space-y-2 text-sm">
                        {Object.entries(result.steps.nutrition.data.macros).map(([key, value]: [string, any]) => (
                          <div key={key} className="flex justify-between">
                            <span className="text-gray-700 capitalize">
                              {key.replace(/_/g, ' ')}
                            </span>
                            <span className="font-medium text-gray-900">
                              {value.value}{value.unit}
                              {value.dv_percent !== null && value.dv_percent !== undefined && 
                                ` (${value.dv_percent}% DV)`
                              }
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Health Dimension Results */}
              {result.healthDimension && (
                <div className="mb-6 pb-6 border-b">
                  <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <span>🏥</span>
                    Health Dimension Analysis
                  </h4>
                  
                  {/* Health Score */}
                  <div className={`rounded-lg p-6 mb-4 ${getHealthScoreColor(result.healthDimension.score)}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Health Score</span>
                      <span className="text-xs px-2 py-1 bg-white rounded-full">
                        {getHealthScoreLabel(result.healthDimension.score)}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-bold">
                        {result.healthDimension.score}
                      </span>
                      <span className="text-2xl font-medium">/100</span>
                    </div>
                    <div className="mt-3 w-full bg-white rounded-full h-3 overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          result.healthDimension.score >= 80 ? 'bg-green-500' :
                          result.healthDimension.score >= 60 ? 'bg-yellow-500' :
                          result.healthDimension.score >= 40 ? 'bg-orange-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${result.healthDimension.score}%` }}
                      />
                    </div>
                  </div>

                  {/* Explanation */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-3">
                    <p className="text-sm font-medium text-gray-900 mb-2">Analysis</p>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {result.healthDimension.explanation}
                    </p>
                  </div>

                  {/* Key Factors */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-900 mb-3">Key Factors</p>
                    <ul className="space-y-2">
                      {result.healthDimension.key_factors.map((factor, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                          <span className="text-gray-400 mt-0.5">•</span>
                          <span className="flex-1">{factor}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Confidence */}
                  <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                    <span>Analysis Confidence:</span>
                    <span className="font-medium">
                      {(result.healthDimension.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              )}

              {/* Processing Dimension Results */}
              {result.processingDimension && (
                <div className="mb-6 pb-6 border-b">
                  <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <span>🔬</span>
                    Processing Dimension Analysis
                  </h4>
                  
                  {/* Processing Score */}
                  <div className={`rounded-lg p-6 mb-4 ${getHealthScoreColor(result.processingDimension.score)}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Processing Score</span>
                      <span className="text-xs px-2 py-1 bg-white rounded-full">
                        {getHealthScoreLabel(result.processingDimension.score)}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-bold">
                        {result.processingDimension.score}
                      </span>
                      <span className="text-2xl font-medium">/100</span>
                    </div>
                    <div className="mt-3 w-full bg-white rounded-full h-3 overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          result.processingDimension.score >= 80 ? 'bg-green-500' :
                          result.processingDimension.score >= 60 ? 'bg-yellow-500' :
                          result.processingDimension.score >= 40 ? 'bg-orange-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${result.processingDimension.score}%` }}
                      />
                    </div>
                  </div>

                  {/* Explanation */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-3">
                    <p className="text-sm font-medium text-gray-900 mb-2">Analysis</p>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {result.processingDimension.explanation}
                    </p>
                  </div>

                  {/* Key Factors */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-3">
                    <p className="text-sm font-medium text-gray-900 mb-3">Key Factors</p>
                    <ul className="space-y-2">
                      {result.processingDimension.key_factors.map((factor, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                          <span className="text-gray-400 mt-0.5">•</span>
                          <span className="flex-1">{factor}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Additives Detected */}
                  {(result.processingDimension.additives_detected.preservatives.length > 0 ||
                    result.processingDimension.additives_detected.artificial_sweeteners.length > 0 ||
                    result.processingDimension.additives_detected.artificial_colors.length > 0 ||
                    result.processingDimension.additives_detected.other_additives.length > 0) && (
                    <div className="bg-red-50 rounded-lg p-4 mb-3">
                      <p className="text-sm font-medium text-red-900 mb-3">⚠️ Additives Detected</p>
                      
                      {result.processingDimension.additives_detected.preservatives.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs font-medium text-red-800 mb-1">Preservatives:</p>
                          <div className="flex flex-wrap gap-1">
                            {result.processingDimension.additives_detected.preservatives.map((item, index) => (
                              <span key={index} className="text-xs px-2 py-1 bg-red-100 text-red-800 rounded">
                                {item}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {result.processingDimension.additives_detected.artificial_sweeteners.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs font-medium text-red-800 mb-1">Artificial Sweeteners:</p>
                          <div className="flex flex-wrap gap-1">
                            {result.processingDimension.additives_detected.artificial_sweeteners.map((item, index) => (
                              <span key={index} className="text-xs px-2 py-1 bg-red-100 text-red-800 rounded">
                                {item}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {result.processingDimension.additives_detected.artificial_colors.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs font-medium text-red-800 mb-1">Artificial Colors:</p>
                          <div className="flex flex-wrap gap-1">
                            {result.processingDimension.additives_detected.artificial_colors.map((item, index) => (
                              <span key={index} className="text-xs px-2 py-1 bg-red-100 text-red-800 rounded">
                                {item}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {result.processingDimension.additives_detected.other_additives.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-red-800 mb-1">Other Additives:</p>
                          <div className="flex flex-wrap gap-1">
                            {result.processingDimension.additives_detected.other_additives.map((item, index) => (
                              <span key={index} className="text-xs px-2 py-1 bg-red-100 text-red-800 rounded">
                                {item}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Confidence */}
                  <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                    <span>Analysis Confidence:</span>
                    <span className="font-medium">
                      {(result.processingDimension.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              )}

              {/* Allergens Dimension Results */}
              {result.allergensDimension && (
                <div className="mb-6 pb-6 border-b">
                  <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <span>🥜</span>
                    Allergens Dimension Analysis
                  </h4>
                  
                  {/* Allergens Score */}
                  <div className={`rounded-lg p-6 mb-4 ${getHealthScoreColor(result.allergensDimension.score)}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Allergen Safety Score</span>
                      <span className="text-xs px-2 py-1 bg-white rounded-full">
                        {getHealthScoreLabel(result.allergensDimension.score)}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-bold">
                        {result.allergensDimension.score}
                      </span>
                      <span className="text-2xl font-medium">/100</span>
                    </div>
                    <div className="mt-3 w-full bg-white rounded-full h-3 overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          result.allergensDimension.score >= 80 ? 'bg-green-500' :
                          result.allergensDimension.score >= 60 ? 'bg-yellow-500' :
                          result.allergensDimension.score >= 40 ? 'bg-orange-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${result.allergensDimension.score}%` }}
                      />
                    </div>
                  </div>

                  {/* Explanation */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-3">
                    <p className="text-sm font-medium text-gray-900 mb-2">Analysis</p>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {result.allergensDimension.explanation}
                    </p>
                  </div>

                  {/* Key Factors */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-3">
                    <p className="text-sm font-medium text-gray-900 mb-3">Key Factors</p>
                    <ul className="space-y-2">
                      {result.allergensDimension.key_factors.map((factor, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                          <span className="text-gray-400 mt-0.5">•</span>
                          <span className="flex-1">{factor}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Major Allergens Detected */}
                  {result.allergensDimension.allergens_detected.major_allergens.length > 0 && (
                    <div className="bg-red-50 rounded-lg p-4 mb-3">
                      <p className="text-sm font-medium text-red-900 mb-3">⚠️ Major Allergens Present</p>
                      <div className="flex flex-wrap gap-2">
                        {result.allergensDimension.allergens_detected.major_allergens.map((allergen, index) => (
                          <span key={index} className="px-3 py-1 bg-red-600 text-white rounded-full text-sm font-medium">
                            {allergen}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Other Allergens */}
                  {result.allergensDimension.allergens_detected.other_allergens.length > 0 && (
                    <div className="bg-orange-50 rounded-lg p-4 mb-3">
                      <p className="text-sm font-medium text-orange-900 mb-3">Other Allergens</p>
                      <div className="flex flex-wrap gap-2">
                        {result.allergensDimension.allergens_detected.other_allergens.map((allergen, index) => (
                          <span key={index} className="px-3 py-1 bg-orange-200 text-orange-900 rounded-full text-sm">
                            {allergen}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Cross-Contamination Warnings */}
                  {result.allergensDimension.allergens_detected.cross_contamination_warnings.length > 0 && (
                    <div className="bg-yellow-50 rounded-lg p-4 mb-3">
                      <p className="text-sm font-medium text-yellow-900 mb-2">⚠️ Cross-Contamination Warnings</p>
                      <ul className="space-y-1">
                        {result.allergensDimension.allergens_detected.cross_contamination_warnings.map((warning, index) => (
                          <li key={index} className="text-sm text-yellow-800">
                            • {warning}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Allergen-Free Claims */}
                  {result.allergensDimension.allergens_detected.allergen_free_claims.length > 0 && (
                    <div className="bg-green-50 rounded-lg p-4 mb-3">
                      <p className="text-sm font-medium text-green-900 mb-3">✓ Allergen-Free Claims</p>
                      <div className="flex flex-wrap gap-2">
                        {result.allergensDimension.allergens_detected.allergen_free_claims.map((claim, index) => (
                          <span key={index} className="px-3 py-1 bg-green-200 text-green-900 rounded-full text-sm">
                            {claim}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Confidence */}
                  <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                    <span>Analysis Confidence:</span>
                    <span className="font-medium">
                      {(result.allergensDimension.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              )}

              {/* Failed Steps */}
              {Object.entries(result.steps).some(([_, step]) => step.status === 'failed') && (
                <div className="mt-6 pt-6 border-t">
                  <h4 className="font-bold text-red-900 mb-3">Failed Extractions</h4>
                  <div className="space-y-2">
                    {Object.entries(result.steps)
                      .filter(([_, step]) => step.status === 'failed')
                      .map(([key, step]) => (
                        <div key={key} className="bg-red-50 rounded-lg p-3">
                          <p className="text-sm font-medium text-red-900">{step.name}</p>
                          <p className="text-xs text-red-700 mt-1">{step.error}</p>
                        </div>
                      ))}
                  </div>
                </div>
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
              scanType="packaging"
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
