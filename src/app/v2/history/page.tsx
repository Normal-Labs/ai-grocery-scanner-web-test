'use client';

/**
 * Scan History Page
 * 
 * Displays the last 10 products scanned by the user from localStorage.
 * Allows users to view previous scan results without making new API calls.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { HistoryScreen } from '@/components/v2/HistoryScreen';

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
        
        // Migrate old history items with incorrect naming
        const migratedHistory = historyData.map((item: HistoryItem) => {
          // If name is "Unknown Product", try to get it from the result
          if (item.name === 'Unknown Product' && item.result?.steps?.packaging?.data) {
            const packagingData = item.result.steps.packaging.data;
            const correctName = packagingData.productName || packagingData.product_name || 'Unknown Product';
            const correctBrand = packagingData.brand || 'Unknown Brand';
            
            return {
              ...item,
              name: correctName,
              brand: correctBrand,
            };
          }
          return item;
        });
        
        // Save migrated history back to localStorage
        if (JSON.stringify(migratedHistory) !== JSON.stringify(historyData)) {
          localStorage.setItem('scanHistory', JSON.stringify(migratedHistory));
          console.log('[History] Migrated old history items');
        }
        
        setHistory(migratedHistory);
      }
    } catch (error) {
      console.error('[History] Failed to load history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewScan = (item: HistoryItem) => {
    // Store the selected result in localStorage for the results page to display
    localStorage.setItem('currentScanResult', JSON.stringify(item.result));
    // Navigate to v2 results page
    router.push('/v2/results');
  };

  const handleClearHistory = () => {
    if (confirm('Are you sure you want to clear all scan history?')) {
      localStorage.removeItem('scanHistory');
      setHistory([]);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex justify-center">
        <div className="max-w-md w-full min-h-screen bg-background shadow-xl flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mb-4"></div>
            <p className="text-muted-foreground">Loading history...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex justify-center">
      <div className="max-w-md w-full min-h-screen bg-background shadow-xl">
        <HistoryScreen 
          history={history}
          onViewScan={handleViewScan}
          onClearHistory={handleClearHistory}
        />
      </div>
    </div>
  );
}
