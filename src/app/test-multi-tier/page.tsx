'use client';

/**
 * Multi-Tier Scan Test Page
 * 
 * Simple UI to test the multi-tier product identification system
 */

import { useState } from 'react';

export default function TestMultiTierPage() {
  const [barcode, setBarcode] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string>('');

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleScan = async () => {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      // Prepare request body
      const body: any = {
        userId: 'test-user-123',
        sessionId: `session-${Date.now()}`,
      };

      if (barcode) {
        body.barcode = barcode;
      }

      if (imageFile) {
        // Convert image to base64
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(imageFile);
        });

        const base64Data = await base64Promise;
        body.image = base64Data;
        body.imageMimeType = imageFile.type;
      }

      console.log('Sending scan request:', {
        hasBarcode: !!body.barcode,
        hasImage: !!body.image,
      });

      // Call API
      const response = await fetch('/api/scan-multi-tier', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      
      console.log('Scan result:', data);
      setResult(data);

      if (!data.success) {
        setError(data.error?.message || 'Scan failed');
      }
    } catch (err) {
      console.error('Scan error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getTierBadgeColor = (tier: number) => {
    switch (tier) {
      case 1: return 'bg-green-500';
      case 2: return 'bg-blue-500';
      case 3: return 'bg-yellow-500';
      case 4: return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const getTierName = (tier: number) => {
    switch (tier) {
      case 1: return 'Direct Barcode';
      case 2: return 'Visual Text Extraction';
      case 3: return 'Discovery Search';
      case 4: return 'AI Analysis';
      default: return 'Unknown';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Multi-Tier Product Identification Test</h1>

        {/* Input Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Scan Input</h2>
          
          {/* Barcode Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Barcode (Optional - for Tier 1)
            </label>
            <input
              type="text"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="Enter barcode..."
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Image Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Product Image (Optional - for Tier 2/4)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="w-full"
            />
          </div>

          {/* Image Preview */}
          {imagePreview && (
            <div className="mb-4">
              <img
                src={imagePreview}
                alt="Preview"
                className="max-w-xs rounded-lg border"
              />
            </div>
          )}

          {/* Scan Button */}
          <button
            onClick={handleScan}
            disabled={loading || (!barcode && !imageFile)}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Scanning...' : 'Scan Product'}
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800 font-medium">Error: {error}</p>
          </div>
        )}

        {/* Result Display */}
        {result && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Scan Result</h2>

            {/* Status Badge */}
            <div className="mb-4">
              <span
                className={`inline-block px-3 py-1 rounded-full text-white font-medium ${
                  result.success ? 'bg-green-500' : 'bg-red-500'
                }`}
              >
                {result.success ? '✓ Success' : '✗ Failed'}
              </span>
            </div>

            {/* Warning Message */}
            {result.warning && (
              <div className="mb-4 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                <div className="flex items-start">
                  <span className="text-yellow-600 mr-2">⚠️</span>
                  <p className="text-sm text-yellow-800">{result.warning}</p>
                </div>
              </div>
            )}

            {/* Tier Badge */}
            <div className="mb-4">
              <span className={`inline-block px-3 py-1 rounded-full text-white font-medium ${getTierBadgeColor(result.tier)}`}>
                Tier {result.tier}: {getTierName(result.tier)}
              </span>
            </div>

            {/* Product Info */}
            {result.product && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold mb-2">Product Information</h3>
                <div className="space-y-1 text-sm">
                  <p><strong>Name:</strong> {result.product.name}</p>
                  <p><strong>Brand:</strong> {result.product.brand}</p>
                  {result.product.barcode && (
                    <p><strong>Barcode:</strong> {result.product.barcode}</p>
                  )}
                  {result.product.size && (
                    <p><strong>Size:</strong> {result.product.size}</p>
                  )}
                  <p><strong>Category:</strong> {result.product.category}</p>
                </div>
              </div>
            )}

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600">Confidence</p>
                <p className="text-2xl font-bold text-blue-600">
                  {(result.confidenceScore * 100).toFixed(1)}%
                </p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <p className="text-sm text-gray-600">Processing Time</p>
                <p className="text-2xl font-bold text-purple-600">
                  {result.processingTimeMs}ms
                </p>
              </div>
            </div>

            {/* Cache Status */}
            <div className="mb-4">
              <span
                className={`inline-block px-3 py-1 rounded-full text-white font-medium ${
                  result.cached ? 'bg-green-500' : 'bg-orange-500'
                }`}
              >
                {result.cached ? '💾 From Cache' : '🤖 Fresh Analysis'}
              </span>
            </div>

            {/* Raw JSON */}
            <details className="mt-4">
              <summary className="cursor-pointer font-medium text-gray-700">
                View Raw JSON
              </summary>
              <pre className="mt-2 p-4 bg-gray-100 rounded-lg overflow-auto text-xs">
                {JSON.stringify(result, null, 2)}
              </pre>
            </details>
          </div>
        )}

        {/* Info Section */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold mb-2">How to Test:</h3>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li><strong>Tier 1:</strong> Enter a barcode only (will check cache → database)</li>
            <li><strong>Tier 2:</strong> Upload an image with visible text (will extract text → search database)</li>
            <li><strong>Tier 4:</strong> Upload an image without barcode (will use AI analysis)</li>
            <li><strong>Full Flow:</strong> Provide both barcode and image to test fallback logic</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
