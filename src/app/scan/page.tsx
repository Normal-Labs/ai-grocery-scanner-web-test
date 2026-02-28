'use client';

/**
 * Product Scanning Page
 * 
 * Main user interface for scanning products using the multi-tier system.
 * Integrates barcode detection with image-based fallback.
 */

import { useState } from 'react';
import BarcodeScanner from '@/components/BarcodeScanner';
import DetailedErrorDisplay, { type ErrorDetails } from '@/components/DetailedErrorDisplay';

interface ScanResult {
  success: boolean;
  product?: {
    id: string;
    name: string;
    brand: string;
    barcode?: string;
    size?: string;
    category: string;
    imageUrl?: string;
  };
  tier: number;
  confidenceScore: number;
  processingTimeMs: number;
  cached: boolean;
  warning?: string;
  error?: {
    code: string;
    message: string;
  };
  // Dimension analysis fields
  dimensionAnalysis?: {
    dimensions: {
      health: DimensionScore;
      processing: DimensionScore;
      allergens: DimensionScore;
      responsiblyProduced: DimensionScore;
      environmentalImpact: DimensionScore;
    };
    overallConfidence: number;
  };
  dimensionStatus?: 'completed' | 'processing' | 'failed' | 'skipped';
  dimensionCached?: boolean;
  userTier?: 'free' | 'premium';
  availableDimensions?: string[];
  upgradePrompt?: string;
}

interface DimensionScore {
  score: number;
  explanation: string;
  keyFactors: string[];
  available: boolean;
  locked: boolean;
}

export default function ScanPage() {
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<ErrorDetails | null>(null);
  const [devUserTier, setDevUserTier] = useState<'free' | 'premium'>('free');

  const handleScanComplete = async (scanData: {
    barcode?: string;
    image?: string;
    imageMimeType?: string;
  }) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      console.log('[Scan Page] 📤 Sending scan request:', {
        hasBarcode: !!scanData.barcode,
        hasImage: !!scanData.image,
      });

      // Prepare request body
      const body: any = {
        userId: 'user-' + Date.now(), // In production, use actual user ID
        sessionId: 'session-' + Date.now(),
        devUserTier, // Add tier toggle
      };

      if (scanData.barcode) {
        body.barcode = scanData.barcode;
      }

      if (scanData.image) {
        body.image = scanData.image;
        body.imageMimeType = scanData.imageMimeType || 'image/jpeg';
      }

      // Call multi-tier scan API
      const response = await fetch('/api/scan-multi-tier', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      console.log('[Scan Page] 📥 Scan result:', data);

      setResult(data);

      if (!data.success) {
        setError({
          message: data.error?.message || 'Scan failed',
          code: data.error?.code,
          timestamp: new Date(),
          context: {
            barcode: scanData.barcode,
            tier: devUserTier,
            responseStatus: response.status,
          },
        });
      }
    } catch (err) {
      console.error('[Scan Page] ❌ Scan error:', err);
      setError({
        message: err instanceof Error ? err.message : 'An error occurred',
        timestamp: new Date(),
        context: {
          barcode: scanData.barcode,
          tier: devUserTier,
          errorType: err instanceof Error ? err.name : 'Unknown',
        },
        stack: err instanceof Error ? err.stack : undefined,
      });
    } finally {
      setLoading(false);
      setScanning(false);
    }
  };

  const handleScanError = (errorMessage: string) => {
    setError({
      message: errorMessage,
      timestamp: new Date(),
      context: {
        source: 'scanner',
        tier: devUserTier,
      },
    });
    setScanning(false);
  };

  const getTierName = (tier: number) => {
    switch (tier) {
      case 1: return 'Direct Barcode';
      case 2: return 'Visual Text';
      case 3: return 'Discovery';
      case 4: return 'AI Analysis';
      default: return 'Unknown';
    }
  };

  const getTierColor = (tier: number) => {
    switch (tier) {
      case 1: return 'bg-green-500';
      case 2: return 'bg-blue-500';
      case 3: return 'bg-yellow-500';
      case 4: return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Product Scanner</h1>
              <p className="text-sm text-gray-600 mt-1">
                Scan barcodes or product packaging
              </p>
            </div>
            
            {/* Tier Toggle */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">Dev Mode:</span>
              <button
                onClick={() => setDevUserTier(devUserTier === 'free' ? 'premium' : 'free')}
                className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors ${
                  devUserTier === 'premium' ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                    devUserTier === 'premium' ? 'translate-x-9' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className={`text-sm font-semibold ${
                devUserTier === 'premium' ? 'text-blue-600' : 'text-gray-600'
              }`}>
                {devUserTier === 'premium' ? '💎 Premium' : '📋 Free'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Scanner Section */}
        {!result && !loading && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <BarcodeScanner
              onScanComplete={handleScanComplete}
              onError={handleScanError}
            />
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-lg font-medium text-gray-700">Identifying product...</p>
            <p className="text-sm text-gray-500 mt-2">This may take a few seconds</p>
          </div>
        )}

        {/* Error Display */}
        {error && !loading && (
          <DetailedErrorDisplay
            error={error}
            title="Scan Error"
            onRetry={() => {
              setError(null);
              setScanning(true);
            }}
            onDismiss={() => setError(null)}
          />
        )}

        {/* Result Display */}
        {result && !loading && (
          <div className="space-y-4">
            {/* Success/Failure Badge */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <span
                  className={`inline-block px-4 py-2 rounded-full text-white font-semibold ${
                    result.success ? 'bg-green-500' : 'bg-red-500'
                  }`}
                >
                  {result.success ? '✓ Product Identified' : '✗ Identification Failed'}
                </span>
                
                <span className={`inline-block px-3 py-1 rounded-full text-white text-sm font-medium ${getTierColor(result.tier)}`}>
                  Tier {result.tier}: {getTierName(result.tier)}
                </span>
              </div>

              {/* Warning */}
              {result.warning && (
                <div className="mb-4 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                  <div className="flex items-start">
                    <span className="text-yellow-600 mr-2 text-xl">⚠️</span>
                    <p className="text-sm text-yellow-800">{result.warning}</p>
                  </div>
                </div>
              )}

              {/* Product Information */}
              {result.product && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-1">
                      {result.product.name}
                    </h2>
                    <p className="text-lg text-gray-600">{result.product.brand}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    {result.product.barcode && (
                      <div>
                        <p className="text-sm text-gray-500">Barcode</p>
                        <p className="font-mono font-semibold">{result.product.barcode}</p>
                      </div>
                    )}
                    
                    {result.product.size && (
                      <div>
                        <p className="text-sm text-gray-500">Size</p>
                        <p className="font-semibold">{result.product.size}</p>
                      </div>
                    )}
                    
                    <div>
                      <p className="text-sm text-gray-500">Category</p>
                      <p className="font-semibold">{result.product.category}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-500">Confidence</p>
                      <p className="font-semibold">
                        {(result.confidenceScore * 100).toFixed(0)}%
                      </p>
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="pt-4 border-t flex items-center justify-between text-sm">
                    <span className={`px-3 py-1 rounded-full ${result.cached ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                      {result.cached ? '💾 Cached' : '🤖 Fresh'}
                    </span>
                    <span className="text-gray-600">
                      {result.processingTimeMs}ms
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Dimension Analysis Results */}
            {result.dimensionAnalysis && result.dimensionStatus === 'completed' && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-900">
                    🎯 Dimension Analysis
                  </h3>
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    result.dimensionCached 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {result.dimensionCached ? '💾 Cached' : '🤖 Fresh'}
                  </span>
                </div>

                {/* User Tier Badge */}
                <div className="mb-4 flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    result.userTier === 'premium'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {result.userTier === 'premium' ? '💎 Premium Tier' : '📋 Free Tier'}
                  </span>
                  {result.upgradePrompt && (
                    <span className="text-sm text-gray-600">
                      {result.upgradePrompt}
                    </span>
                  )}
                </div>

                {/* Dimensions Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(result.dimensionAnalysis.dimensions).map(([key, dimension]) => {
                    const getScoreColor = (score: number) => {
                      if (score >= 67) return 'text-green-600 bg-green-50';
                      if (score >= 34) return 'text-yellow-600 bg-yellow-50';
                      return 'text-red-600 bg-red-50';
                    };

                    const getDimensionLabel = (key: string) => {
                      const labels: Record<string, string> = {
                        health: '🏥 Health',
                        processing: '🏭 Processing',
                        allergens: '⚠️ Allergens',
                        responsiblyProduced: '🌱 Responsible',
                        environmentalImpact: '🌍 Environmental',
                      };
                      return labels[key] || key;
                    };

                    return (
                      <div
                        key={key}
                        className={`p-4 rounded-lg border-2 ${
                          dimension.locked
                            ? 'bg-gray-50 border-gray-200 opacity-60'
                            : 'bg-white border-gray-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-gray-900">
                            {getDimensionLabel(key)}
                          </span>
                          {dimension.locked ? (
                            <span className="text-2xl">🔒</span>
                          ) : (
                            <span className={`px-3 py-1 rounded-full font-bold ${getScoreColor(dimension.score)}`}>
                              {dimension.score}
                            </span>
                          )}
                        </div>
                        {dimension.available && !dimension.locked && (
                          <div>
                            <p className="text-sm text-gray-600 mb-2">
                              {dimension.explanation}
                            </p>
                            {dimension.keyFactors && dimension.keyFactors.length > 0 && (
                              <ul className="text-xs text-gray-500 space-y-1">
                                {dimension.keyFactors.map((factor, idx) => (
                                  <li key={idx} className="flex items-start">
                                    <span className="mr-1">•</span>
                                    <span>{factor}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )}
                        {dimension.locked && (
                          <p className="text-sm text-gray-500 italic">
                            Upgrade to Premium to unlock
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Overall Confidence */}
                <div className="mt-4 pt-4 border-t text-center">
                  <span className="text-sm text-gray-600">
                    Analysis Confidence: {' '}
                    <span className="font-semibold">
                      {(result.dimensionAnalysis.overallConfidence * 100).toFixed(0)}%
                    </span>
                  </span>
                </div>
              </div>
            )}

            {/* Dimension Analysis Failed */}
            {result.dimensionStatus === 'failed' && (
              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6">
                <div className="flex items-start">
                  <span className="text-2xl mr-3">⚠️</span>
                  <div>
                    <h3 className="font-semibold text-yellow-900 mb-1">
                      Dimension Analysis Unavailable
                    </h3>
                    <p className="text-yellow-800 text-sm">
                      Product was identified successfully, but dimension analysis failed. 
                      This may be due to API rate limits. Try again in a moment.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setResult(null);
                  setScanning(true);
                }}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                🔄 Scan Another
              </button>
              
              {result.success && result.product && (
                <button
                  onClick={() => {
                    // TODO: Implement add to list functionality
                    alert('Add to list functionality coming soon!');
                  }}
                  className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
                >
                  ✓ Add to List
                </button>
              )}
            </div>

            {/* Report Error Option */}
            {result.success && result.product && result.confidenceScore < 0.9 && (
              <button
                onClick={() => {
                  // TODO: Implement error reporting
                  alert('Error reporting functionality coming soon!');
                }}
                className="w-full px-4 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
              >
                ⚠️ Report Incorrect Identification
              </button>
            )}
          </div>
        )}

        {/* Info Section */}
        {!result && !loading && !error && (
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="font-semibold text-blue-900 mb-2">How it works:</h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li className="flex items-start">
                <span className="mr-2">1️⃣</span>
                <span>Take a photo of the product barcode or packaging</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">2️⃣</span>
                <span>System automatically detects barcodes for instant lookup</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">3️⃣</span>
                <span>If no barcode, AI analyzes the product image</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">4️⃣</span>
                <span>Get product details in seconds!</span>
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
