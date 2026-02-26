'use client';

/**
 * Barcode Scanner Component
 * 
 * Captures images and detects barcodes using browser-based barcode detection.
 * Falls back to image-based identification if no barcode is detected.
 * 
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 1.2, 2.1
 */

import { useState, useRef, useEffect } from 'react';

// Browser Barcode Detection API types
interface DetectedBarcode {
  rawValue: string;
  format: string;
  boundingBox: DOMRectReadOnly;
  cornerPoints: Array<{ x: number; y: number }>;
}

interface BarcodeDetector {
  detect(image: ImageBitmapSource): Promise<DetectedBarcode[]>;
  getSupportedFormats(): Promise<string[]>;
}

declare global {
  interface Window {
    BarcodeDetector?: {
      new (options?: { formats?: string[] }): BarcodeDetector;
      getSupportedFormats(): Promise<string[]>;
    };
  }
}

interface BarcodeScannerProps {
  onScanComplete: (result: { barcode?: string; image?: string; imageMimeType?: string }) => void;
  onError?: (error: string) => void;
}

export default function BarcodeScanner({ onScanComplete, onError }: BarcodeScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [detectedBarcode, setDetectedBarcode] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [barcodeDetectorSupported, setBarcodeDetectorSupported] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const barcodeDetectorRef = useRef<BarcodeDetector | null>(null);

  // Check if Barcode Detection API is supported
  useEffect(() => {
    const checkBarcodeSupport = async () => {
      if ('BarcodeDetector' in window) {
        try {
          // Requirement 11.1: Configure supported barcode formats
          const formats = await window.BarcodeDetector!.getSupportedFormats();
          console.log('[Barcode Scanner] Supported formats:', formats);
          
          barcodeDetectorRef.current = new window.BarcodeDetector!({
            formats: [
              'upc_a',
              'upc_e', 
              'ean_8',
              'ean_13',
              'code_39',
              'code_93',
              'code_128',
              'itf',
              'qr_code',
            ].filter(format => formats.includes(format)),
          });
          
          setBarcodeDetectorSupported(true);
          console.log('[Barcode Scanner] ✅ Barcode Detection API available');
        } catch (error) {
          console.warn('[Barcode Scanner] ⚠️ Barcode Detection API not fully supported:', error);
          setBarcodeDetectorSupported(false);
        }
      } else {
        console.warn('[Barcode Scanner] ⚠️ Barcode Detection API not available');
        setBarcodeDetectorSupported(false);
      }
    };

    checkBarcodeSupport();
  }, []);

  // Start camera
  const startCamera = async () => {
    try {
      setCameraError(null);
      setIsScanning(true);

      // Requirement 11.2: Set up camera frame processing
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        console.log('[Barcode Scanner] 📹 Camera started');
      }
    } catch (error) {
      // Requirement 11.5: Handle initialization failures gracefully
      const errorMessage = error instanceof Error ? error.message : 'Failed to access camera';
      console.error('[Barcode Scanner] ❌ Camera error:', error);
      setCameraError(errorMessage);
      setIsScanning(false);
      onError?.(errorMessage);
    }
  };

  // Stop camera
  const stopCamera = () => {
    // Requirement 11.7: Release resources on component unmount
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsScanning(false);
    console.log('[Barcode Scanner] 🛑 Camera stopped');
  };

  // Capture image and detect barcode
  const captureAndDetect = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setProcessing(true);
    setDetectedBarcode(null);

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (!context) {
        throw new Error('Failed to get canvas context');
      }

      // Set canvas size to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw current video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Failed to create blob'));
          },
          'image/jpeg',
          0.9
        );
      });

      // Convert to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      const imageBase64 = await base64Promise;
      setCapturedImage(imageBase64);

      // Try to detect barcode if supported
      if (barcodeDetectorSupported && barcodeDetectorRef.current) {
        console.log('[Barcode Scanner] 🔍 Detecting barcode...');
        
        try {
          const barcodes = await barcodeDetectorRef.current.detect(canvas);
          
          if (barcodes.length > 0) {
            // Requirement 11.3: Highlight detected barcodes
            const barcode = barcodes[0];
            console.log('[Barcode Scanner] ✅ Barcode detected:', barcode.rawValue);
            setDetectedBarcode(barcode.rawValue);

            // Requirement 11.4: Provide haptic feedback
            if ('vibrate' in navigator) {
              navigator.vibrate(200);
            }

            // Draw bounding box on canvas
            if (barcode.cornerPoints && barcode.cornerPoints.length === 4) {
              context.strokeStyle = '#00ff00';
              context.lineWidth = 4;
              context.beginPath();
              context.moveTo(barcode.cornerPoints[0].x, barcode.cornerPoints[0].y);
              for (let i = 1; i < barcode.cornerPoints.length; i++) {
                context.lineTo(barcode.cornerPoints[i].x, barcode.cornerPoints[i].y);
              }
              context.closePath();
              context.stroke();
            }

            // Stop camera and send barcode
            stopCamera();
            
            // Requirement 1.2: Send detected barcode to backend
            onScanComplete({
              barcode: barcode.rawValue,
              image: imageBase64,
              imageMimeType: 'image/jpeg',
            });
            
            return;
          }
        } catch (error) {
          console.warn('[Barcode Scanner] ⚠️ Barcode detection failed:', error);
          // Continue to image-based fallback
        }
      }

      // No barcode detected - fall back to image-based identification
      // Requirement 11.6: Fall back to Tier 2 if barcode not detected
      console.log('[Barcode Scanner] ℹ️ No barcode detected, using image-based identification');
      stopCamera();
      
      // Requirement 2.1: Send image for visual analysis
      onScanComplete({
        image: imageBase64,
        imageMimeType: 'image/jpeg',
      });

    } catch (error) {
      console.error('[Barcode Scanner] ❌ Capture error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to capture image';
      onError?.(errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="barcode-scanner">
      {!isScanning && !capturedImage && (
        <div className="text-center">
          <button
            onClick={startCamera}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            📷 Start Camera
          </button>
          
          {!barcodeDetectorSupported && (
            <p className="mt-4 text-sm text-yellow-600">
              ⚠️ Barcode detection not supported in this browser. Will use image-based identification.
            </p>
          )}
        </div>
      )}

      {cameraError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">
            <strong>Camera Error:</strong> {cameraError}
          </p>
          <p className="text-sm text-red-600 mt-2">
            Please ensure camera permissions are granted and try again.
          </p>
        </div>
      )}

      {isScanning && (
        <div className="relative">
          <video
            ref={videoRef}
            className="w-full rounded-lg"
            playsInline
            muted
          />
          
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="border-4 border-green-500 rounded-lg w-64 h-64 opacity-50" />
          </div>

          <div className="mt-4 flex gap-4 justify-center">
            <button
              onClick={captureAndDetect}
              disabled={processing}
              className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 transition-colors"
            >
              {processing ? '⏳ Processing...' : '📸 Capture'}
            </button>
            
            <button
              onClick={stopCamera}
              className="px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors"
            >
              ✕ Cancel
            </button>
          </div>

          {barcodeDetectorSupported && (
            <p className="mt-4 text-center text-sm text-gray-600">
              📱 Point camera at barcode or product packaging
            </p>
          )}
        </div>
      )}

      {capturedImage && (
        <div className="space-y-4">
          <div className="relative">
            <img
              src={capturedImage}
              alt="Captured"
              className="w-full rounded-lg border-2 border-gray-300"
            />
            
            {detectedBarcode && (
              <div className="absolute top-4 left-4 bg-green-500 text-white px-4 py-2 rounded-lg font-semibold shadow-lg">
                ✓ Barcode: {detectedBarcode}
              </div>
            )}
          </div>

          <button
            onClick={() => {
              setCapturedImage(null);
              setDetectedBarcode(null);
              startCamera();
            }}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            🔄 Retake
          </button>
        </div>
      )}

      {/* Hidden canvas for image processing */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
