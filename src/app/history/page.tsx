'use client';

/**
 * Scan History Page
 * 
 * Displays the last 10 products scanned by the user from localStorage.
 * Allows users to view previous scan results without making new API calls.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface HistoryItem {
  id: string;
  productId?: string;
  barcode?: string;
  name: string;
  brand: string;
  timestamp: string;
  completenessScore: number;
  result: any; // Full extraction result
}

export default function HistoryPage() {
  const router = useRouter();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = () => {
    try {
      const historyJson = localStorage.getItem('scanHistory');
      if (historyJson) {
        const historyData = JSON.parse(historyJson);
        setHistory(historyData);
      }
    } catch (error) {
      console.error('[History] Failed to load history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewScan = (item: HistoryItem) => {
    // Store the selected result in localStorage for the test-all page to display
    localStorage.setItem('viewHistoryResult', JSON.stringify(item.result));
    // Navigate to test-all page
    router.push('/test-all');
  };

  const handleClearHistory = () => {
    if (confirm('Are you sure you want to clear all scan history?')) {
      localStorage.removeItem('scanHistory');
      setHistory([]);
    }
  };

  const getCompletenessLabel = (score: number) => {
    if (score === 4) return 'Complete';
    if (score === 3) return 'Mostly Complete';
    if (score === 2) return 'Partial';
    if (score === 1) return 'Minimal';
    return 'Empty';
  };

  const getCompletenessColor = (score: number) => {
    if (score === 4) return 'bg-green-100 text-green-800';
    if (score === 3) return 'bg-blue-100 text-blue-800';
    if (score === 2) return 'bg-yellow-100 text-yellow-800';
    if (score === 1) return 'bg-orange-100 text-orange-800';
    return 'bg-gray-100 text-gray-800';
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading history...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-4">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold text-gray-900">
              📜 Scan History
            </h1>
            {history.length > 0 && (
              <button
                onClick={handleClearHistory}
                className="text-sm text-red-600 hover:text-red-700 font-medium"
              >
                Clear All
              </button>
            )}
          </div>
          <p className="text-gray-600 text-sm">
            Your last {history.length} scanned products
          </p>
        </div>

        {/* Empty State */}
        {history.length === 0 && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center">
              <span className="text-6xl mb-4 block">📭</span>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                No Scan History
              </h2>
              <p className="text-gray-600 mb-6">
                Start scanning products to build your history
              </p>
              <button
                onClick={() => router.push('/test-all')}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
              >
                Start Scanning
              </button>
            </div>
          </div>
        )}

        {/* History List */}
        {history.length > 0 && (
          <div className="space-y-3">
            {history.map((item) => (
              <div
                key={item.id}
                onClick={() => handleViewScan(item)}
                className="bg-white rounded-lg shadow-lg p-4 cursor-pointer hover:shadow-xl transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 text-lg mb-1">
                      {item.name}
                    </h3>
                    <p className="text-gray-600 text-sm mb-2">
                      {item.brand}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getCompletenessColor(item.completenessScore)}`}>
                    {getCompletenessLabel(item.completenessScore)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-4">
                    {item.barcode && (
                      <span className="text-gray-500 font-mono">
                        {item.barcode}
                      </span>
                    )}
                    <span className="text-gray-400">
                      {formatTimestamp(item.timestamp)}
                    </span>
                  </div>
                  <span className="text-blue-600 font-medium">
                    View →
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Back Button */}
        <div className="mt-6">
          <button
            onClick={() => router.push('/test-all')}
            className="w-full px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition-colors"
          >
            ← Back to Scanner
          </button>
        </div>
      </div>
    </div>
  );
}
