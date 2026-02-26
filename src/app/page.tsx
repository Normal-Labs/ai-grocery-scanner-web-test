'use client';

/**
 * Product Scanning Page
 * 
 * Main user interface for scanning products using the multi-tier system.
 * Integrates barcode detection with image-based fallback.
 */

import { useState, useEffect } from 'react';
import BarcodeScanner from '@/components/BarcodeScanner';
import { saveAnalysis, getRecentAnalyses, clearHistory } from '@/lib/storage';
import type { SavedScan } from '@/lib/types';

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
  const [error, setError] = useState<string>('');
  const [devUserTier, setDevUserTier] = useState<'free' | 'premium'>('free');
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<SavedScan[]>([]);
  const [showScanner, setShowScanner] = useState(false);
  const [hasHistoryItems, setHasHistoryItems] = useState(false);

  // Check for history on client side only
  useEffect(() => {
    try {
      const recentScans = getRecentAnalyses();
      setHasHistoryItems(recentScans.length > 0);
    } catch {
      setHasHistoryItems(false);
    }
  }, [result]); // Re-check when a new scan completes

  const handleScanComplete = async (scanData: {
    barcode?: string;
    image?: string;
    imageMimeType?: string;
  }) => {
    setLoading(true);
    setError('');
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
        setError(data.error?.message || 'Scan failed');
      } else if (data.success && data.product) {
        // Save successful scan to history
        try {
          // Convert scan result to AnalysisResult format for storage
          const analysisResult = {
            products: [{
              productName: data.product.name,
              brand: data.product.brand,
              category: data.product.category,
              barcode: data.product.barcode,
              size: data.product.size,
              confidence: data.confidenceScore,
              dimensions: data.dimensionAnalysis?.dimensions || {},
            }],
            metadata: {
              tier: data.tier,
              cached: data.cached,
              processingTimeMs: data.processingTimeMs,
            },
          };
          
          if (scanData.image) {
            saveAnalysis(scanData.image, analysisResult as any);
          }
        } catch (storageError) {
          console.warn('Failed to save to localStorage:', storageError);
        }
      }
    } catch (err) {
      console.error('[Scan Page] ❌ Scan error:', err);
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
      setScanning(false);
    }
  };

  const handleScanError = (errorMessage: string) => {
    setError(errorMessage);
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

  const handleViewHistory = () => {
    try {
      const recentScans = getRecentAnalyses();
      setHistory(recentScans);
      setShowHistory(true);
    } catch (err) {
      console.error('Failed to load history:', err);
      setError('Unable to load scan history.');
    }
  };

  const handleClearHistory = () => {
    try {
      clearHistory();
      setHistory([]);
    } catch (err) {
      console.error('Failed to clear history:', err);
      setError('Unable to clear scan history.');
    }
  };

  const handleCloseHistory = () => {
    setShowHistory(false);
  };

  const handleLoadHistoryScan = (scan: SavedScan) => {
    // Convert SavedScan back to ScanResult format
    const product = scan.results.products[0];
    if (product) {
      const scanResult: ScanResult = {
        success: true,
        product: {
          id: product.barcode || 'unknown',
          name: product.productName,
          brand: product.brand || 'Unknown',
          barcode: product.barcode,
          size: product.size,
          category: product.category || 'Unknown',
        },
        tier: (scan.results.metadata as any)?.tier || 4,
        confidenceScore: product.confidence || 0.9,
        processingTimeMs: (scan.results.metadata as any)?.processingTimeMs || 0,
        cached: (scan.results.metadata as any)?.cached || false,
        // Add dimension analysis if available
        dimensionAnalysis: product.dimensions ? {
          dimensions: product.dimensions as any,
          overallConfidence: 0.9,
        } : undefined,
        dimensionStatus: product.dimensions ? 'completed' : 'skipped',
        dimensionCached: true,
      };
      setResult(scanResult);
      setShowHistory(false);
    }
  };

  const handleStartScan = () => {
    setShowScanner(true);
    setResult(null);
    setError('');
  };

  const handleCloseScan = () => {
    setShowScanner(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">🛒 AI Grocery Scanner</h1>
              <p className="text-sm text-gray-600 mt-1">
                Product Research Agent
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

      <div className="max-w-4xl mx-auto px-4 py-6 pb-24">
        {/* Scanner Modal */}
        {showScanner && (
          <div className="fixed inset-0 bg-black z-50 flex flex-col">
            <div className="flex-1 overflow-auto">
              <BarcodeScanner
                onScanComplete={(scanData) => {
                  handleCloseScan();
                  handleScanComplete(scanData);
                }}
                onError={handleScanError}
              />
            </div>
          </div>
        )}

        {/* History View */}
        {showHistory ? (
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-800">Scan History</h2>
                <button
                  onClick={handleCloseHistory}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Close
                </button>
              </div>

              {history.length === 0 ? (
                <div className="text-center py-8 px-4 bg-gray-50 rounded-lg">
                  <p className="text-gray-600">No scan history yet</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Your scanned products will appear here
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {history.map((scan, index) => {
                      const product = scan.results.products[0];
                      return (
                        <div
                          key={scan.timestamp}
                          className="bg-white rounded-lg border-2 border-gray-200 p-4 hover:border-blue-300 transition-colors"
                        >
                          <div className="flex gap-4">
                            <img
                              src={scan.imageData}
                              alt={`Scan ${index + 1}`}
                              className="w-20 h-20 object-cover rounded"
                            />
                            <div className="flex-1">
                              <p className="text-sm text-gray-500">
                                {new Date(scan.timestamp).toLocaleString()}
                              </p>
                              {product && (
                                <>
                                  <p className="text-base font-semibold text-gray-900 mt-1">
                                    {product.productName}
                                  </p>
                                  <p className="text-sm text-gray-600">
                                    {product.brand || 'Unknown Brand'}
                                  </p>
                                </>
                              )}
                              <button
                                onClick={() => handleLoadHistoryScan(scan)}
                                className="text-sm text-blue-600 hover:text-blue-700 font-medium mt-2"
                              >
                                View Results
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    onClick={handleClearHistory}
                    className="w-full mt-4 px-6 py-3 bg-red-100 hover:bg-red-200 text-red-700 font-medium rounded-lg transition-colors"
                  >
                    Clear All History
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          <>
        {/* Welcome Message - Show when no scan in progress and no results */}
        {!loading && !result && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🛒</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Ready to Scan
            </h2>
            <p className="text-gray-600">
              Tap the Scan button below to identify products
            </p>
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
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6 mb-6">
            <div className="flex items-start">
              <span className="text-2xl mr-3">⚠️</span>
              <div>
                <h3 className="font-semibold text-red-900 mb-1">Scan Error</h3>
                <p className="text-red-800">{error}</p>
                <button
                  onClick={() => {
                    setError('');
                    setScanning(true);
                  }}
                  className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
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

            {/* Action Buttons - Removed, only Scan button in footer */}

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

        {/* Info Section - removed */}
          </>
        )}
      </div>

      {/* Footer with Scan and History Buttons */}
      {!showHistory && !showScanner && (
        <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40">
          <div className="max-w-4xl mx-auto px-4 py-3">
            <div className="flex gap-3">
              {hasHistoryItems && (
                <button
                  onClick={handleViewHistory}
                  className="flex-1 min-h-[56px] px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <span role="img" aria-label="history" className="text-xl">📋</span>
                  <span>History</span>
                </button>
              )}
              <button
                onClick={handleStartScan}
                disabled={loading}
                className={`${hasHistoryItems ? 'flex-1' : 'w-full'} min-h-[56px] px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 text-lg`}
              >
                <span role="img" aria-label="scan" className="text-2xl">📷</span>
                <span>Scan</span>
              </button>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
