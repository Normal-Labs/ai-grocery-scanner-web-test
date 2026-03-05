'use client';

/**
 * Barcode Extraction Test Page
 * 
 * Isolated testing environment for barcode detection and extraction.
 * Saves results to products_dev table for analysis.
 */

import { useState } from 'react';
import BarcodeScanner from '@/components/BarcodeScanner';

interface ExtractionResult {
  method: 'BarcodeDetector' | 'OCR' | 'Failed';
  barcode?: string;
  rawText?: string;
  confidence?: number;
  processingTime: number;
  imageSize: number;
  timestamp: Date;
}

export default function TestBarcodePage() {
  const [showScanner, setShowScanner] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedToDb, setSavedToDb] = useState(false);

  const handleScanComplete = async (scanData: { 
    barcode?: string; 
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
      console.log('[Barcode Test] 📸 Image captured');
      console.log('[Barcode Test] BarcodeDetector result:', scanData.barcode || 'none');
      
      // Calculate image size
      const imageSize = Math.round((scanData.image.length * 3) / 4); // Approximate base64 to bytes
      
      // Call test API endpoint
      const response = await fetch('/api/test-barcode-extraction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: scanData.image,
          detectedBarcode: scanData.barcode,
        }),
      });
      
      const processingTime = Date.now() - startTime;
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Extraction failed');
      }
      
      const data = await response.json();
      
      const extractionResult: ExtractionResult = {
        method: data.method,
        barcode: data.barcode,
        rawText: data.rawText,
        confidence: data.confidence,
        processingTime,
        imageSize,
        timestamp: new Date(),
      };
      
      setResult(extractionResult);
      setSavedToDb(data.savedToDb);
      
      console.log('[Barcode Test] ✅ Extraction complete:', extractionResult);
      
    } catch (err) {
      console.error('[Barcode Test] ❌ Error:', err);
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
            🔍 Barcode Extraction Test
          </h1>
          <p className="text-gray-600 text-sm">
            Test barcode detection and extraction. Results are saved to products_dev table.
          </p>
        </div>

        {/* Instructions */}
        {!result && !loading && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mb-4">
            <h2 className="font-bold text-blue-900 mb-2">📋 Instructions</h2>
            <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
              <li>Click "Scan Barcode" button below</li>
              <li>Point camera at a product barcode</li>
              <li>Ensure barcode is clearly visible and well-lit</li>
              <li>Wait for automatic detection or capture manually</li>
              <li>Review extraction results</li>
            </ol>
          </div>
        )}

        {/* Scan Button */}
        {!result && !loading && (
          <button
            onClick={() => setShowScanner(true)}
            className="w-full px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors text-lg"
          >
            📷 Scan Barcode
          </button>
        )}

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Processing barcode...</p>
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
            {/* Success Banner */}
            <div className={`rounded-lg p-6 ${
              result.method === 'Failed' 
                ? 'bg-red-50 border-2 border-red-300' 
                : 'bg-green-50 border-2 border-green-300'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className={`text-xl font-bold ${
                  result.method === 'Failed' ? 'text-red-900' : 'text-green-900'
                }`}>
                  {result.method === 'Failed' ? '❌ Extraction Failed' : '✅ Barcode Detected'}
                </h2>
                {savedToDb && (
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                    💾 Saved to DB
                  </span>
                )}
              </div>

              {/* Barcode Display */}
              {result.barcode && (
                <div className="bg-white rounded-lg p-4 mb-4">
                  <p className="text-sm text-gray-600 mb-1">Barcode Number:</p>
                  <p className="text-3xl font-mono font-bold text-gray-900">
                    {result.barcode}
                  </p>
                </div>
              )}

              {/* Method Badge */}
              <div className="flex items-center gap-2 mb-4">
                <span className="text-sm font-medium text-gray-700">Detection Method:</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  result.method === 'BarcodeDetector' 
                    ? 'bg-blue-100 text-blue-800'
                    : result.method === 'OCR'
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {result.method}
                </span>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-white rounded-lg p-3">
                  <p className="text-xs text-gray-600 mb-1">Processing Time</p>
                  <p className="text-lg font-bold text-gray-900">{result.processingTime}ms</p>
                </div>
                <div className="bg-white rounded-lg p-3">
                  <p className="text-xs text-gray-600 mb-1">Image Size</p>
                  <p className="text-lg font-bold text-gray-900">
                    {(result.imageSize / 1024).toFixed(1)}KB
                  </p>
                </div>
                {result.confidence !== undefined && (
                  <div className="bg-white rounded-lg p-3 col-span-2">
                    <p className="text-xs text-gray-600 mb-1">OCR Confidence</p>
                    <p className="text-lg font-bold text-gray-900">
                      {(result.confidence * 100).toFixed(0)}%
                    </p>
                  </div>
                )}
              </div>

              {/* Raw Text (for debugging) */}
              {result.rawText && (
                <details className="bg-white rounded-lg p-3">
                  <summary className="cursor-pointer text-sm font-medium text-gray-700">
                    View Raw OCR Text
                  </summary>
                  <pre className="mt-2 text-xs text-gray-600 whitespace-pre-wrap font-mono">
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
                Test Another Barcode
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
            <BarcodeScanner
              scanType="barcode"
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
