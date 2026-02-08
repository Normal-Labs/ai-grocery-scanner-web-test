/**
 * Main Page Component - AI Grocery Scanner
 * 
 * Orchestrates the entire scanner workflow and manages application state.
 * Integrates CameraCapture, ImagePreview, ScanButton, and InsightsDisplay components.
 * Handles localStorage persistence for scan history.
 * 
 * Requirements: 1.5, 2.1, 2.4, 2.5, 3.1, 3.8, 7.1, 7.5, 7.6, 7.7, 8.1, 8.4, 8.7
 */

'use client';

import { useState } from 'react';
import CameraCapture from '@/components/CameraCapture';
import ImagePreview from '@/components/ImagePreview';
import ScanButton from '@/components/ScanButton';
import InsightsDisplay from '@/components/InsightsDisplay';
import { useAnalysis } from '@/hooks/useAnalysis';
import { saveAnalysis, getRecentAnalyses, clearHistory } from '@/lib/storage';
import type { AnalysisResult, SavedScan } from '@/lib/types';

/**
 * Scanner state interface
 * Requirements: 1.5, 2.4, 2.5, 3.1, 8.1, 8.4
 */
interface ScannerState {
  capturedImage: string | null;
  analysisResults: AnalysisResult | null;
  isAnalyzing: boolean;
  error: string | null;
}

export default function Home() {
  // Application state
  const [state, setState] = useState<ScannerState>({
    capturedImage: null,
    analysisResults: null,
    isAnalyzing: false,
    error: null,
  });

  // History view state
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<SavedScan[]>([]);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);

  // Use analysis hook
  const { analyzeImage, isLoading, error: analysisError } = useAnalysis();

  /**
   * Handle image capture from camera
   * Requirements: 1.5
   */
  const handleImageCapture = (imageData: string) => {
    setState({
      capturedImage: imageData,
      analysisResults: null,
      isAnalyzing: false,
      error: null,
    });
  };

  /**
   * Handle scan button click - trigger analysis
   * Requirements: 3.1, 3.8
   */
  const handleScan = async () => {
    if (!state.capturedImage) return;

    setState(prev => ({
      ...prev,
      isAnalyzing: true,
      error: null,
      analysisResults: null,
    }));

    try {
      const results = await analyzeImage(state.capturedImage);
      
      setState(prev => ({
        ...prev,
        analysisResults: results,
        isAnalyzing: false,
        error: null,
      }));

      // Save to localStorage after successful analysis
      // Requirements: 7.1
      try {
        saveAnalysis(state.capturedImage, results);
      } catch (storageError) {
        // Handle localStorage errors gracefully
        // Requirements: 7.7
        console.warn('Failed to save to localStorage:', storageError);
        setStorageWarning('Unable to save scan history. Your browser storage may be full.');
      }
    } catch (err) {
      setState(prev => ({
        ...prev,
        isAnalyzing: false,
        error: analysisError || 'Failed to analyze image. Please try again.',
      }));
    }
  };

  /**
   * Handle retake button click - clear image and restart
   * Requirements: 2.4, 2.5
   */
  const handleRetake = () => {
    setState({
      capturedImage: null,
      analysisResults: null,
      isAnalyzing: false,
      error: null,
    });
  };

  /**
   * Handle clear error button click - dismiss error messages
   * Requirements: 8.4
   */
  const handleClearError = () => {
    setState(prev => ({
      ...prev,
      error: null,
    }));
  };

  /**
   * Handle view history button click
   * Requirements: 7.5
   */
  const handleViewHistory = () => {
    try {
      const recentScans = getRecentAnalyses();
      setHistory(recentScans);
      setShowHistory(true);
    } catch (err) {
      console.error('Failed to load history:', err);
      setStorageWarning('Unable to load scan history.');
    }
  };

  /**
   * Handle clear history button click
   * Requirements: 7.6
   */
  const handleClearHistory = () => {
    try {
      clearHistory();
      setHistory([]);
      setStorageWarning(null);
    } catch (err) {
      console.error('Failed to clear history:', err);
      setStorageWarning('Unable to clear scan history.');
    }
  };

  /**
   * Handle close history view
   */
  const handleCloseHistory = () => {
    setShowHistory(false);
  };

  /**
   * Handle loading a scan from history
   */
  const handleLoadHistoryScan = (scan: SavedScan) => {
    setState({
      capturedImage: scan.imageData,
      analysisResults: scan.results,
      isAnalyzing: false,
      error: null,
    });
    setShowHistory(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-800 text-center">
            🛒 AI Grocery Scanner
          </h1>
          <p className="text-sm text-gray-600 text-center mt-1">
            Scan products for health, sustainability, and allergen insights
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-6 pb-24">
        {/* Storage Warning */}
        {storageWarning && (
          <div
            className="mb-4 p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded-lg"
            role="alert"
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl flex-shrink-0" role="img" aria-label="warning">
                ⚠️
              </span>
              <div className="flex-1">
                <p className="text-sm text-yellow-800">{storageWarning}</p>
                <button
                  onClick={() => setStorageWarning(null)}
                  className="text-sm text-yellow-900 underline mt-1"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {state.error && (
          <div
            className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg"
            role="alert"
            aria-live="polite"
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl flex-shrink-0" role="img" aria-label="error">
                ❌
              </span>
              <div className="flex-1">
                <h4 className="font-semibold text-red-900 mb-1">
                  Analysis Error
                </h4>
                <p className="text-sm text-red-800 leading-relaxed">
                  {state.error}
                </p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handleClearError}
                    className="text-sm text-red-900 underline"
                  >
                    Dismiss
                  </button>
                  {state.capturedImage && (
                    <button
                      onClick={handleScan}
                      className="text-sm text-red-900 font-semibold underline"
                    >
                      Try Again
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* History View */}
        {showHistory ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
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
                  {history.map((scan, index) => (
                    <div
                      key={scan.timestamp}
                      className="bg-white rounded-lg shadow-md p-4 border border-gray-200"
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
                          <p className="text-sm font-medium text-gray-700 mt-1">
                            {scan.results.products.length} product(s) detected
                          </p>
                          <button
                            onClick={() => handleLoadHistoryScan(scan)}
                            className="text-sm text-blue-600 hover:text-blue-700 font-medium mt-2"
                          >
                            View Results
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleClearHistory}
                  className="w-full min-h-[44px] px-6 py-3 bg-red-100 hover:bg-red-200 text-red-700 font-medium rounded-lg transition-all duration-200"
                >
                  Clear All History
                </button>
              </>
            )}
          </div>
        ) : (
          <>
            {/* Camera Capture - Always visible when no image captured */}
            {!state.capturedImage && !state.analysisResults && (
              <div className="space-y-4">
                <CameraCapture
                  onCapture={handleImageCapture}
                  disabled={state.isAnalyzing}
                />
              </div>
            )}

            {/* Image Preview - Show when image captured but no results yet */}
            {state.capturedImage && !state.analysisResults && (
              <div className="space-y-4">
                <ImagePreview
                  imageData={state.capturedImage}
                  onRetake={handleRetake}
                />

                {/* Scan Button */}
                <ScanButton
                  onScan={handleScan}
                  disabled={!state.capturedImage || state.isAnalyzing}
                  isLoading={state.isAnalyzing}
                />
              </div>
            )}

            {/* Insights Display - Show when results available */}
            {state.analysisResults && (
              <div className="space-y-4">
                {/* Show thumbnail of scanned image */}
                <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
                  <div className="flex items-center gap-4">
                    {state.capturedImage && (
                      <img
                        src={state.capturedImage}
                        alt="Scanned product"
                        className="w-20 h-20 object-cover rounded"
                      />
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800">
                        Analysis Complete
                      </h3>
                      <p className="text-sm text-gray-600">
                        {state.analysisResults.products.length} product(s) detected
                      </p>
                    </div>
                    <button
                      onClick={handleRetake}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-all duration-200"
                    >
                      New Scan
                    </button>
                  </div>
                </div>

                {/* Display insights */}
                <InsightsDisplay results={state.analysisResults} />
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer with History Controls */}
      {!showHistory && (
        <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
          <div className="max-w-2xl mx-auto px-4 py-3">
            <div className="flex gap-3">
              <button
                onClick={handleViewHistory}
                className="flex-1 min-h-[44px] px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
              >
                <span role="img" aria-label="history">📋</span>
                View History
              </button>
              {state.analysisResults && (
                <button
                  onClick={handleRetake}
                  className="flex-1 min-h-[44px] px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-all duration-200"
                >
                  Scan Another
                </button>
              )}
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
