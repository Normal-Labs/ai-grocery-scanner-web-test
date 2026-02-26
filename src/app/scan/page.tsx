'use client';

/**
 * Product Scanning Page
 * 
 * Main user interface for scanning products using the multi-tier system.
 * Integrates barcode detection with image-based fallback.
 */

import { useState } from 'react';
import BarcodeScanner from '@/components/BarcodeScanner';

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
}

export default function ScanPage() {
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string>('');

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Product Scanner</h1>
          <p className="text-sm text-gray-600 mt-1">
            Scan barcodes or product packaging
          </p>
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
