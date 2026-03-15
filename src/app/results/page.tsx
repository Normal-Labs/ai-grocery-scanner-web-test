'use client';

/**
 * V2 Results Page
 * 
 * Displays product scan results.
 * Accessed after scanning or from history.
 * Handles scan processing with loading indicator.
 */

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ResultsScreen } from '@/components/v2/ResultsScreen';

interface ExtractionStep {
  name: string;
  status: 'pending' | 'processing' | 'success' | 'failed' | 'skipped';
  data?: any;
  error?: string;
  confidence?: number;
  processingTime?: number;
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
  healthDimension?: any;
  processingDimension?: any;
  allergensDimension?: any;
  productId?: string;
  savedToDb: boolean;
  totalProcessingTime: number;
  imageSize: number;
  timestamp: Date;
}

export default function ResultsPage() {
  const router = useRouter();
  const [result, setResult] = useState<AllExtractionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingStatus, setProcessingStatus] = useState<string>('Analyzing product...');
  const [incompleteScanProductId, setIncompleteScanProductId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const processingRef = useRef(false); // Lock to prevent duplicate processing

  useEffect(() => {
    checkAndProcessScan();
  }, []);

  const checkAndProcessScan = async () => {
    // Prevent duplicate processing (React Strict Mode double-render)
    if (processingRef.current) {
      console.log('[Results] ⏭️ Already processing, skipping duplicate call');
      return;
    }
    
    try {
      // Check if there's a scan being processed
      const isProcessing = localStorage.getItem('scanProcessing');
      
      if (isProcessing === 'true') {
        // Set lock before processing
        processingRef.current = true;
        // Process the scan
        await processScan();
      } else {
        // Load existing result
        loadResult();
      }
    } catch (error) {
      console.error('[Results] Error checking scan state:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
      setLoading(false);
      processingRef.current = false; // Release lock on error
    }
  };

  const processScan = async () => {
    const startTime = Date.now();
    
    try {
      const image = localStorage.getItem('scanImage');
      const productId = localStorage.getItem('scanProductId');
      
      if (!image) {
        throw new Error('No image data found');
      }
      
      console.log('[Results] 🔄 Processing scan...');
      console.log('[Results] 📋 localStorage state:', {
        hasScanImage: !!image,
        scanProductId: productId,
        incompleteScanProductId: localStorage.getItem('incompleteScanProductId'),
      });
      setProcessingStatus('Extracting product information...');
      
      // Calculate image size
      const imageSize = Math.round((image.length * 3) / 4);
      
      // Prepare request body
      const requestBody: any = { image };
      if (productId) {
        requestBody.productId = productId;
        console.log('[Results] 🔄 Completing scan for product:', productId);
      } else {
        console.log('[Results] 📝 New scan (no productId)');
      }
      
      // Call API endpoint
      const response = await fetch('/api/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      const processingTime = Date.now() - startTime;
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Extraction failed');
      }
      
      setProcessingStatus('Analyzing nutrition and ingredients...');
      
      const data = await response.json();
      
      console.log('[Results] 📦 API Response:', {
        productId: data.productId,
        oldProductId: data.oldProductId,
        savedToDb: data.savedToDb,
        cached: data.cached,
        skippedUpdate: data.skippedUpdate,
      });
      
      const extractionResult: AllExtractionResult = {
        cached: data.cached,
        cacheAge: data.cacheAge,
        skippedUpdate: data.skippedUpdate,
        reason: data.reason,
        steps: data.steps,
        healthDimension: data.healthDimension,
        processingDimension: data.processingDimension,
        allergensDimension: data.allergensDimension,
        productId: data.productId,
        savedToDb: data.savedToDb,
        totalProcessingTime: processingTime,
        imageSize,
        timestamp: new Date(),
      };
      
      // Save to history (pass oldProductId for reconciliation)
      saveToHistory(extractionResult, data.oldProductId);
      
      // Save result to localStorage
      localStorage.setItem('currentScanResult', JSON.stringify(extractionResult));
      
      // Clear processing flags
      localStorage.removeItem('scanProcessing');
      localStorage.removeItem('scanImage');
      localStorage.removeItem('scanProductId');
      
      // Check if scan is incomplete
      const incomplete = isIncomplete(extractionResult.steps);
      console.log('[Results] 📊 Scan completeness check:', {
        incomplete,
        productId: extractionResult.productId,
        missingSteps: incomplete ? getMissingSteps(extractionResult.steps) : [],
      });
      
      if (incomplete && extractionResult.productId) {
        setIncompleteScanProductId(extractionResult.productId);
        const missing = getMissingSteps(extractionResult.steps);
        const instructions = generateCameraInstructions(missing);
        
        // Persist to localStorage for next scan
        localStorage.setItem('incompleteScanProductId', extractionResult.productId);
        localStorage.setItem('cameraInstructions', instructions);
        
        console.log('[Results] ⚠️ Incomplete scan detected. Missing:', missing);
        console.log('[Results] 💾 Saved incompleteScanProductId:', extractionResult.productId);
      } else if (extractionResult.productId && !incomplete) {
        // Scan is complete, clear incomplete state
        localStorage.removeItem('incompleteScanProductId');
        localStorage.removeItem('cameraInstructions');
        console.log('[Results] ✅ Complete scan achieved');
      }
      
      console.log('[Results] ✅ Processing complete');
      setResult(extractionResult);
      setLoading(false);
      
    } catch (err) {
      console.error('[Results] ❌ Error processing scan:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      
      // Clear processing flags
      localStorage.removeItem('scanProcessing');
      localStorage.removeItem('scanImage');
      localStorage.removeItem('scanProductId');
      
      setLoading(false);
    }
  };

  const loadResult = () => {
    try {
      // Check for result in localStorage
      const resultJson = localStorage.getItem('currentScanResult');
      if (resultJson) {
        const resultData = JSON.parse(resultJson);
        setResult(resultData);
        
        console.log('[Results] 📜 Loaded existing result from localStorage');
        
        // Check if scan is incomplete
        const incomplete = isIncomplete(resultData.steps);
        if (incomplete && resultData.productId) {
          setIncompleteScanProductId(resultData.productId);
          console.log('[Results] ⚠️ Loaded incomplete scan, productId:', resultData.productId);
        } else {
          console.log('[Results] ✅ Loaded complete scan');
        }
      } else {
        // No result found, redirect to home
        console.log('[Results] ❌ No result found, redirecting to home');
        router.push('/');
      }
    } catch (error) {
      console.error('[Results] Failed to load result:', error);
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  // Helper functions
  const getMissingSteps = (steps: AllExtractionResult['steps']): string[] => {
    const missing: string[] = [];
    if (steps.barcode.status !== 'success') missing.push('barcode');
    if (steps.packaging.status !== 'success') missing.push('packaging');
    if (steps.ingredients.status !== 'success') missing.push('ingredients');
    if (steps.nutrition.status !== 'success') missing.push('nutrition');
    return missing;
  };

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

  const isIncomplete = (steps: AllExtractionResult['steps']): boolean => {
    return getMissingSteps(steps).length > 0;
  };

  const calculateCompletenessScore = (steps: AllExtractionResult['steps']): number => {
    let score = 0;
    if (steps.barcode.status === 'success') score++;
    if (steps.packaging.status === 'success') score++;
    if (steps.ingredients.status === 'success') score++;
    if (steps.nutrition.status === 'success') score++;
    return score;
  };

  const saveToHistory = (extractionResult: AllExtractionResult, oldProductId?: string) => {
    try {
      // Get product name and brand - API returns productName (camelCase)
      const name = extractionResult.steps.packaging.data?.productName || extractionResult.steps.packaging.data?.product_name || 'Unknown Product';
      const brand = extractionResult.steps.packaging.data?.brand || 'Unknown Brand';
      const barcode = extractionResult.steps.barcode.data?.barcode;

      console.log('[Results] 💾 Saving to history:', {
        productId: extractionResult.productId,
        oldProductId,
        barcode,
        name,
        brand,
      });

      // Get existing history
      const historyJson = localStorage.getItem('scanHistory');
      const history = historyJson ? JSON.parse(historyJson) : [];

      console.log('[Results] 📋 Current history count:', history.length);

      // Remove entries matching either the current productId or the old productId
      let filteredHistory = history;
      if (extractionResult.productId) {
        filteredHistory = filteredHistory.filter((item: any) => item.productId !== extractionResult.productId);
      }
      if (oldProductId) {
        const beforeOldFilter = filteredHistory.length;
        filteredHistory = filteredHistory.filter((item: any) => item.productId !== oldProductId);
        const removedOld = beforeOldFilter - filteredHistory.length;
        if (removedOld > 0) {
          console.log('[Results] 🗑️ Removed', removedOld, 'entries with old productId:', oldProductId);
        }
      }

      const removed = history.length - filteredHistory.length;
      if (removed > 0) {
        console.log('[Results] 🗑️ Removed', removed, 'total existing entries');
      }

      console.log('[Results] 📋 After filtering by productId:', filteredHistory.length);

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

      // Add new item to beginning
      filteredHistory.unshift(historyItem);

      // Keep only last 10 items
      const trimmedHistory = filteredHistory.slice(0, 10);

      // Save back to localStorage
      localStorage.setItem('scanHistory', JSON.stringify(trimmedHistory));
      
      const wasUpdate = history.length > filteredHistory.length;
      console.log('[Results] 💾', wasUpdate ? 'Updated existing item in history' : 'Saved new item to history');
      console.log('[Results] 📋 Final history count:', trimmedHistory.length);
    } catch (error) {
      console.error('[Results] ❌ Failed to save to history:', error);
    }
  };

  const handleBack = () => {
    // Clear current result
    localStorage.removeItem('currentScanResult');
    // Go back to previous page
    router.back();
  };

  const handleCompleteScan = () => {
    console.log('[Results] 🔄 User clicked Complete Scan button');
    console.log('[Results] 📋 Current incompleteScanProductId:', incompleteScanProductId);
    console.log('[Results] 📋 localStorage incompleteScanProductId:', localStorage.getItem('incompleteScanProductId'));
    
    // Store the current result for reference when completing
    if (result && incompleteScanProductId) {
      localStorage.setItem('incompleteResult', JSON.stringify(result));
      console.log('[Results] 💾 Saved incomplete result for completion');
    }
    
    // Navigate to scan page which will auto-open camera
    router.push('/scan');
  };

  const handleRetry = () => {
    setError(null);
    router.push('/scan');
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex justify-center">
        <div className="max-w-md w-full min-h-screen bg-background shadow-xl flex items-center justify-center">
          <div className="text-center px-5">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent mb-6"></div>
            <p className="text-lg font-medium text-foreground mb-2">Analyzing Product</p>
            <p className="text-sm text-muted-foreground">{processingStatus}</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-background flex justify-center">
        <div className="max-w-md w-full min-h-screen bg-background shadow-xl flex items-center justify-center p-5">
          <div className="bg-destructive/10 border-2 border-destructive/20 rounded-2xl p-6 w-full">
            <div className="flex items-start gap-3 mb-4">
              <span className="text-3xl">⚠️</span>
              <div className="flex-1">
                <h3 className="font-bold text-lg text-destructive mb-2">Scan Failed</h3>
                <p className="text-destructive/90 text-sm">{error}</p>
              </div>
            </div>
            <button
              onClick={handleRetry}
              className="w-full px-4 py-3 bg-destructive text-destructive-foreground rounded-xl hover:bg-destructive/90 transition-colors font-medium"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!result) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex justify-center">
      <div className="max-w-md w-full min-h-screen bg-background shadow-xl">
        <ResultsScreen 
          result={result}
          onBack={handleBack}
          onCompleteScan={handleCompleteScan}
          showCompleteScanButton={!!incompleteScanProductId && isIncomplete(result.steps)}
        />
      </div>
    </div>
  );
}
