/**
 * useScanWithProgress Hook
 * 
 * Enhanced scan hook with real-time progress tracking using SSE.
 * Provides progress updates, partial results, and error handling.
 */

import { useState, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export interface ProgressStep {
  stage: string;
  message: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface ProgressEvent {
  type: 'progress' | 'partial' | 'complete' | 'error';
  timestamp: number;
  stage?: string;
  message?: string;
  metadata?: Record<string, any>;
  data?: any;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
    details?: any;
  };
}

export interface AnalysisResult {
  productId: string;
  productName: string;
  brand?: string;
  barcode?: string;
  insights?: any;
  fromCache?: boolean;
  storeId?: string;
}

export interface ScanParams {
  barcode?: string;
  imageData: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  tier?: 'free' | 'premium';
  dimension?: string;
}

export interface UseScanWithProgressReturn {
  scanProduct: (params: ScanParams) => Promise<AnalysisResult>;
  isLoading: boolean;
  error: string | null;
  fromCache: boolean | null;
  progress: ProgressStep[];
  partialResult: Partial<AnalysisResult> | null;
  reset: () => void;
}

export function useScanWithProgress(): UseScanWithProgressReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState<boolean | null>(null);
  const [progress, setProgress] = useState<ProgressStep[]>([]);
  const [partialResult, setPartialResult] = useState<Partial<AnalysisResult> | null>(null);
  
  const { session } = useAuth();
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 3;
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setFromCache(null);
    setProgress([]);
    setPartialResult(null);
    reconnectAttemptsRef.current = 0;
    
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  const scanWithSSE = useCallback(async (params: ScanParams): Promise<AnalysisResult> => {
    return new Promise((resolve, reject) => {
      if (!session?.access_token) {
        reject(new Error('Authentication required'));
        return;
      }

      // Prepare request body
      const requestBody = {
        ...params,
        streaming: true,
      };

      // Create fetch request for SSE
      fetch('/api/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(requestBody),
      })
        .then(async (response) => {
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Scan failed');
          }

          if (!response.body) {
            throw new Error('No response body');
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          const processStream = async () => {
            try {
              while (true) {
                const { done, value } = await reader.read();

                if (done) {
                  break;
                }

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                  if (line.startsWith('data: ')) {
                    const data = line.substring(6);
                    try {
                      const event: ProgressEvent = JSON.parse(data);
                      handleProgressEvent(event, resolve, reject);
                    } catch (e) {
                      console.error('[useScanWithProgress] Error parsing event:', e);
                    }
                  }
                }
              }
            } catch (error) {
              console.error('[useScanWithProgress] Stream reading error:', error);
              handleConnectionError(error as Error, params, resolve, reject);
            }
          };

          processStream();
        })
        .catch((error) => {
          console.error('[useScanWithProgress] Fetch error:', error);
          handleConnectionError(error, params, resolve, reject);
        });
    });
  }, [session]);

  const handleProgressEvent = useCallback(
    (
      event: ProgressEvent,
      resolve: (value: AnalysisResult) => void,
      reject: (reason: any) => void
    ) => {
      switch (event.type) {
        case 'progress':
          if (event.stage && event.message) {
            setProgress((prev) => [
              ...prev,
              {
                stage: event.stage!,
                message: event.message!,
                timestamp: event.timestamp,
                metadata: event.metadata,
              },
            ]);
          }
          break;

        case 'partial':
          if (event.data) {
            setPartialResult(event.data);
          }
          break;

        case 'complete':
          if (event.data) {
            setFromCache(event.data.fromCache || false);
            setIsLoading(false);
            resolve(event.data);
          }
          break;

        case 'error':
          if (event.error) {
            setError(event.error.message);
            setIsLoading(false);
            reject(new Error(event.error.message));
          }
          break;
      }
    },
    []
  );

  const handleConnectionError = useCallback(
    (
      error: Error,
      params: ScanParams,
      resolve: (value: AnalysisResult) => void,
      reject: (reason: any) => void
    ) => {
      reconnectAttemptsRef.current += 1;

      if (reconnectAttemptsRef.current <= maxReconnectAttempts) {
        console.log(
          `[useScanWithProgress] Reconnecting... Attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts}`
        );
        
        setTimeout(() => {
          scanWithSSE(params).then(resolve).catch(reject);
        }, 1000 * reconnectAttemptsRef.current);
      } else {
        setError('Connection lost. Please try again.');
        setIsLoading(false);
        reject(error);
      }
    },
    [scanWithSSE]
  );

  const scanWithPolling = useCallback(async (params: ScanParams): Promise<AnalysisResult> => {
    return new Promise(async (resolve, reject) => {
      if (!session?.access_token) {
        reject(new Error('Authentication required'));
        return;
      }

      try {
        // Start the scan (non-streaming)
        const response = await fetch('/api/scan', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            ...params,
            streaming: false, // Use traditional response
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Scan failed');
        }

        const result = await response.json();
        
        if (result.success && result.data) {
          setFromCache(result.data.fromCache || false);
          setIsLoading(false);
          resolve(result.data);
        } else {
          throw new Error(result.error || 'Scan failed');
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Scan failed';
        setError(errorMessage);
        setIsLoading(false);
        reject(error);
      }
    });
  }, [session]);

  const scanProduct = useCallback(
    async (params: ScanParams): Promise<AnalysisResult> => {
      reset();
      setIsLoading(true);
      setError(null);

      try {
        // Check if SSE is supported
        const supportsSSE = typeof EventSource !== 'undefined' || typeof ReadableStream !== 'undefined';

        if (supportsSSE) {
          return await scanWithSSE(params);
        } else {
          // Fallback to polling
          console.log('[useScanWithProgress] SSE not supported, using polling fallback');
          return await scanWithPolling(params);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An error occurred during scan';
        setError(errorMessage);
        setIsLoading(false);
        throw err;
      }
    },
    [reset, scanWithSSE, scanWithPolling]
  );

  return {
    scanProduct,
    isLoading,
    error,
    fromCache,
    progress,
    partialResult,
    reset,
  };
}
