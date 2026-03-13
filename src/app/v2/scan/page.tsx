'use client';

/**
 * V2 Scan Page
 * 
 * Auto-opens camera for scanning.
 * Redirects to results page after successful scan.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  skippedUpdate?: boolean;
  reason?: string;
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

export default function ScanPage() {
  const router = useRouter();
  const [showScanner, setShowScanner] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [incompleteScanProductId, setIncompleteScanProductId] = useState<string | null>(null);
  const [cameraInstructions, setCameraInstructions] = useState<string>('Point camera at packaging and take a picture');

  // Auto-open camera on mount
  useEffect(() => {
    const savedProductId = localStorage.getItem('incompleteScanProductId');
    const savedInstructions = localStorage.getItem('cameraInstructions');
    
    console.log('[Scan] 🔄 Mount - checking for incomplete scan');
    console.log('[Scan] 📋 localStorage on mount:', {
      incompleteScanProductId: savedProductId,
      cameraInstructions: savedInstructions,
    });
    
    if (savedProductId) {
      setIncompleteScanProductId(savedProductId);
      console.log('[Scan] 🔄 Restored incomplete scan state:', savedProductId);
    } else {
      console.log('[Scan] 📝 No incomplete scan found');
    }
    
    if (savedInstructions) {
      setCameraInstructions(savedInstructions);
      console.log('[Scan] 📝 Restored camera instructions:', savedInstructions);
    }

    // Auto-open camera
    setShowScanner(true);
  }, []);

  // Helper function to determine missing extraction steps
  const getMissingSteps = (steps: AllExtractionResult['steps']): string[] => {
    const missing: string[] = [];
    if (steps.barcode.status !== 'success') missing.push('barcode');
    if (steps.packaging.status !== 'success') missing.push('packaging');
    if (steps.ingredients.status !== 'success') missing.push('ingredients');
    if (steps.nutrition.status !== 'success') missing.push('nutrition');
    return missing;
  };

  // Helper function to generate camera instructions based on missing steps
  const generateCameraInstructions = (missingSteps: string[]): string => {
    if (missingSteps.length === 0) {
      return 'Point camera at packaging and take a picture';
    }

    const instructions: string[] = [];
    
    if (missingSteps.includes('barcode')) {
      instructions.push('barcode');
    }
    if (missingSteps.includes('nutrition')) {
      instructions.push('nutrition facts label');
    }
    if (missingSteps.includes('ingredients')) {
      instructions.push('ingredients list');
    }
    if (missingSteps.includes('packaging')) {
      instructions.push('product name and brand');
    }

    if (instructions.length === 1) {
      return `Point camera at ${instructions[0]} and take a picture`;
    } else if (instructions.length === 2) {
      return `Point camera at ${instructions[0]} and ${instructions[1]} and take a picture`;
    } else {
      const last = instructions.pop();
      return `Point camera at ${instructions.join(', ')}, and ${last} and take a picture`;
    }
  };

  // Helper function to check if scan is incomplete
  const isIncomplete = (steps: AllExtractionResult['steps']): boolean => {
    return getMissingSteps(steps).length > 0;
  };

  // Helper function to calculate completeness score
  const calculateCompletenessScore = (steps: AllExtractionResult['steps']): number => {
    let score = 0;
    if (steps.barcode.status === 'success') score++;
    if (steps.packaging.status === 'success') score++;
    if (steps.ingredients.status === 'success') score++;
    if (steps.nutrition.status === 'success') score++;
    return score;
  };

  // Helper function to save scan to history
  const saveToHistory = (extractionResult: AllExtractionResult) => {
    try {
      // Get product name and brand
      const name = extractionResult.steps.packaging.data?.productName || 'Unknown Product';
      const brand = extractionResult.steps.packaging.data?.brand || 'Unknown Brand';
      const barcode = extractionResult.steps.barcode.data?.barcode;

      // Get existing history
      const historyJson = localStorage.getItem('scanHistory');
      const history = historyJson ? JSON.parse(historyJson) : [];

      // Check for duplicates based on productId or barcode
      // Remove any existing entries that match this product
      const isDuplicate = (item: any) => {
        // Match by productId if both have it
        if (extractionResult.productId && item.productId) {
          return item.productId === extractionResult.productId;
        }
        // Match by barcode if both have it
        if (barcode && item.barcode) {
          return item.barcode === barcode;
        }
        // Match by name and brand as fallback
        return item.name === name && item.brand === brand;
      };

      // Filter out duplicates
      const filteredHistory = history.filter((item: any) => !isDuplicate(item));

      // Create new history item
      const historyItem = {
        id: Date.now().toString(),
        productId: extractionResult.productId,
        barcode,
        name,
        brand,
        timestamp: new Date().toISOString(),
        completenessScore: calculateCompletenessScore(extractionResult.steps),
        result: extractionResult,
      };

      // Add new item to beginning (this moves duplicates to top)
      filteredHistory.unshift(historyItem);

      // Keep only last 10 items
      const trimmedHistory = filteredHistory.slice(0, 10);

      // Save back to localStorage
      localStorage.setItem('scanHistory', JSON.stringify(trimmedHistory));
      
      const wasUpdate = history.length > filteredHistory.length;
      console.log('[Test All] 💾', wasUpdate ? 'Updated existing item in history (moved to top)' : 'Saved new item to history');
    } catch (error) {
      console.error('[Test All] ❌ Failed to save to history:', error);
    }
  };

  const handleScanComplete = async (scanData: {
    image?: string;
    imageMimeType?: string;
  }) => {
    if (!scanData.image) {
      setError('No image captured');
      return;
    }
    
    console.log('[Scan] 📸 Image captured, preparing to redirect');
    console.log('[Scan] 📋 Current state:', {
      incompleteScanProductId,
      willPassProductId: !!incompleteScanProductId,
    });
    
    // Close scanner first
    setShowScanner(false);
    
    // Mark as processing and save data
    localStorage.setItem('scanProcessing', 'true');
    localStorage.setItem('scanImage', scanData.image);
    if (incompleteScanProductId) {
      localStorage.setItem('scanProductId', incompleteScanProductId);
      console.log('[Scan] 💾 Saved scanProductId for completion:', incompleteScanProductId);
    } else {
      console.log('[Scan] 📝 New scan (no incompleteScanProductId)');
    }
    
    console.log('[Scan] 🔄 Redirecting to results page');
    
    // Small delay to ensure scanner is closed before navigation
    setTimeout(() => {
      router.push('/v2/results');
    }, 100);
  };

  return (
    <div className="min-h-screen bg-background flex justify-center">
      <div className="max-w-md w-full min-h-screen bg-background shadow-xl">
        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-foreground font-medium">Processing scan...</p>
              {currentStep && (
                <p className="text-sm text-muted-foreground mt-2">{currentStep}</p>
              )}
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && !loading && (
          <div className="flex items-center justify-center h-screen p-4">
            <div className="bg-destructive/10 border-2 border-destructive/20 rounded-lg p-6 max-w-md">
              <div className="flex items-start gap-3">
                <span className="text-2xl">⚠️</span>
                <div className="flex-1">
                  <h3 className="font-bold text-destructive mb-1">Scan Failed</h3>
                  <p className="text-destructive/90 text-sm">{error}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setError(null);
                  setShowScanner(true);
                }}
                className="mt-4 w-full px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Scanner Modal */}
        {showScanner && !loading && !error && (
          <div className="fixed inset-0 bg-black z-50 flex flex-col">
            <ImageScanner
              scanType="packaging"
              instruction={cameraInstructions}
              onScanComplete={handleScanComplete}
              onClose={() => router.push('/v2')}
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
