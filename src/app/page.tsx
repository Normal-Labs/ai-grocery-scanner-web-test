/**
 * Main Page Component - AI Grocery Scanner with Research Agent
 * 
 * Orchestrates the entire scanner workflow with tier-based access control.
 * Integrates TierContext, CameraCapture, ImagePreview, DimensionSelector,
 * ProgressTracker, ScanButton, and InsightsDisplay components.
 * 
 * Requirements: 1.5, 2.1, 2.4, 2.5, 3.1, 3.8, 7.1, 7.5, 7.6, 7.7, 8.1, 8.4, 8.7, 11.2, 11.5, 11.8, 12.1, 12.7
 */

'use client';

import { useState } from 'react';
import { TierProvider, useTierContext } from '@/contexts/TierContext';
import CameraCapture from '@/components/CameraCapture';
import ImagePreview from '@/components/ImagePreview';
import ScanButton from '@/components/ScanButton';
import InsightsDisplay from '@/components/InsightsDisplay';
import TierToggle from '@/components/TierToggle';
import DimensionSelector from '@/components/DimensionSelector';
import ProgressTracker from '@/components/ProgressTracker';
import AuthGuard from '@/components/AuthGuard';
import BarcodeInput, { isValidBarcode } from '@/components/BarcodeInput';
import { useAnalysis } from '@/hooks/useAnalysis';
import { useScan } from '@/hooks/useScan';
import { saveAnalysis, getRecentAnalyses, clearHistory } from '@/lib/storage';
import { getCurrentPosition } from '@/lib/geolocation';
import type { AnalysisResult, SavedScan } from '@/lib/types';

/**
 * Scanner state interface
 */
interface ScannerState {
  capturedImage: string | null;
  analysisResults: AnalysisResult | null;
  isAnalyzing: boolean;
  error: string | null;
  barcode: string;
}

/**
 * Main scanner component (wrapped with TierProvider)
 */
function ScannerApp() {
  // Access tier context
  const {
    tier,
    setTier,
    selectedDimension,
    setSelectedDimension,
    canUseToolCalling,
  } = useTierContext();

  // Application state
  const [state, setState] = useState<ScannerState>({
    capturedImage: null,
    analysisResults: null,
    isAnalyzing: false,
    error: null,
    barcode: '',
  });

  // History view state
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<SavedScan[]>([]);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);

  // Use new scan hook with cache-first architecture
  const { scanProduct, error: scanError, fromCache } = useScan();
  
  // Keep old analysis hook for fallback (will be removed in future)
  const { progressSteps } = useAnalysis();

  /**
   * Handle image capture from camera
   */
  const handleImageCapture = (imageData: string) => {
    setState(prev => ({
      ...prev,
      capturedImage: imageData,
      analysisResults: null,
      isAnalyzing: false,
      error: null,
    }));
  };

  /**
   * Handle barcode input change
   */
  const handleBarcodeChange = (barcode: string) => {
    setState(prev => ({
      ...prev,
      barcode,
      error: null,
    }));
  };

  /**
   * Handle scan button click - trigger scan with new cache-first API
   * 
   * Requirements: 2.1, 2.2 - Use actual barcode from user input
   * Requirements: 9.1, 9.2, 9.3 - Capture geolocation when scan is initiated
   */
  const handleScan = async () => {
    if (!state.capturedImage) return;

    // Validate barcode
    if (!state.barcode) {
      setState(prev => ({
        ...prev,
        error: 'Please enter a product barcode',
      }));
      return;
    }

    if (!isValidBarcode(state.barcode)) {
      setState(prev => ({
        ...prev,
        error: 'Please enter a valid barcode (8-13 digits)',
      }));
      return;
    }

    // Validate dimension selection for free tier
    if (tier === 'free' && !selectedDimension) {
      setState(prev => ({
        ...prev,
        error: 'Please select a dimension to analyze',
      }));
      return;
    }

    setState(prev => ({
      ...prev,
      isAnalyzing: true,
      error: null,
      analysisResults: null,
    }));

    try {
      // Requirement 9.1: Request geolocation when scan is initiated
      // Requirement 9.2: Capture coordinates if permission granted
      // Requirement 9.3: Continue scan if permission denied
      console.log('[Geolocation] Requesting user location...');
      const locationResult = await getCurrentPosition();
      
      let location: { latitude: number; longitude: number } | undefined;
      
      if (locationResult.coordinates) {
        location = locationResult.coordinates;
        console.log('[Geolocation] Location captured:', location);
      } else {
        // Permission denied or unavailable - continue without location
        console.log('[Geolocation] Location unavailable:', locationResult.error?.message);
        location = undefined;
      }

      // Call new scan API with cache-first architecture
      const results = await scanProduct({
        imageData: state.capturedImage,
        barcode: state.barcode,
        tier,
        dimension: selectedDimension || undefined,
        location,
      });
      
      setState(prev => ({
        ...prev,
        analysisResults: results,
        isAnalyzing: false,
        error: null,
      }));

      // Save to localStorage after successful scan
      try {
        saveAnalysis(state.capturedImage, results);
      } catch (storageError) {
        console.warn('Failed to save to localStorage:', storageError);
        setStorageWarning('Unable to save scan history. Your browser storage may be full.');
      }
    } catch (err) {
      setState(prev => ({
        ...prev,
        isAnalyzing: false,
        error: scanError || 'Failed to scan product. Please try again.',
      }));
    }
  };

  /**
   * Handle retake button click - clear image and restart
   */
  const handleRetake = () => {
    setState({
      capturedImage: null,
      analysisResults: null,
      isAnalyzing: false,
      error: null,
      barcode: '',
    });
  };

  /**
   * Handle clear error button click
   */
  const handleClearError = () => {
    setState(prev => ({
      ...prev,
      error: null,
    }));
  };

  /**
   * Handle view history button click
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
      barcode: '', // Don't restore barcode from history
    });
    setShowHistory(false);
  };

  // Check if scan button should be enabled
  const canScan = state.capturedImage && !state.isAnalyzing && 
    isValidBarcode(state.barcode) &&
    (tier === 'premium' || (tier === 'free' && selectedDimension));

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-800 text-center">
            🛒 AI Grocery Scanner
          </h1>
          <p className="text-sm text-gray-600 text-center mt-1">
            {canUseToolCalling 
              ? 'Research Agent with web search & content extraction'
              : 'Scan products for health, sustainability, and allergen insights'}
          </p>
        </div>
      </header>

      {/* Main Content - Protected by AuthGuard */}
      <AuthGuard>
        <main className="max-w-2xl mx-auto px-4 py-6 pb-24">
        {/* Developer Sandbox - Tier Toggle */}
        <div className="mb-6">
          <TierToggle currentTier={tier} onTierChange={setTier} />
        </div>

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

            {/* Image Preview + Dimension Selector - Show when image captured but no results yet */}
            {state.capturedImage && !state.analysisResults && (
              <div className="space-y-4">
                <ImagePreview
                  imageData={state.capturedImage}
                  onRetake={handleRetake}
                />

                {/* Barcode Input */}
                <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
                  <BarcodeInput
                    value={state.barcode}
                    onChange={handleBarcodeChange}
                    disabled={state.isAnalyzing}
                    showValidation={true}
                  />
                </div>

                {/* Dimension Selector (Free Tier Only) */}
                {tier === 'free' && (
                  <DimensionSelector
                    selectedDimension={selectedDimension}
                    onDimensionChange={setSelectedDimension}
                    disabled={state.isAnalyzing}
                  />
                )}

                {/* Scan Button */}
                <ScanButton
                  onScan={handleScan}
                  disabled={!canScan}
                  isLoading={state.isAnalyzing}
                />
              </div>
            )}

            {/* Progress Tracker (Premium Tier Only) */}
            {state.isAnalyzing && tier === 'premium' && progressSteps.length > 0 && (
              <div className="mb-6">
                <ProgressTracker steps={progressSteps} isActive={state.isAnalyzing} />
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
                      {/* Cache indicator */}
                      {fromCache !== null && (
                        <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                          {fromCache ? (
                            <>
                              <span role="img" aria-label="cached">⚡</span>
                              Loaded from cache (instant)
                            </>
                          ) : (
                            <>
                              <span role="img" aria-label="fresh">🔍</span>
                              Fresh analysis completed
                            </>
                          )}
                        </p>
                      )}
                      {tier === 'premium' && progressSteps.length > 0 && (
                        <p className="text-xs text-purple-600 mt-1">
                          🔍 Research Agent used {progressSteps.length} step(s)
                        </p>
                      )}
                    </div>
                    <button
                      onClick={handleRetake}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-all duration-200"
                    >
                      New Scan
                    </button>
                  </div>
                </div>

                {/* Display insights with tier support */}
                <InsightsDisplay 
                  results={state.analysisResults}
                  tier={tier}
                  dimension={selectedDimension || undefined}
                />
              </div>
            )}
          </>
        )}
      </main>
      </AuthGuard>

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

/**
 * Main page export with TierProvider wrapper
 */
export default function Home() {
  return (
    <TierProvider>
      <ScannerApp />
    </TierProvider>
  );
}
