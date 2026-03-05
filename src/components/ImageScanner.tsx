'use client';

/**
 * Image Scanner Component
 * 
 * Simple camera interface for capturing product images.
 * Similar to BarcodeScanner but without barcode detection.
 */

import { useState, useRef, useEffect } from 'react';

interface ImageScannerProps {
  onScanComplete: (result: { image?: string; imageMimeType?: string }) => void;
  onError?: (error: string) => void;
  onClose?: () => void;
  scanType?: 'barcode' | 'packaging' | 'ingredients' | 'nutrition facts';
}

export default function ImageScanner({ onScanComplete, onError, onClose, scanType = 'packaging' }: ImageScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Auto-start camera
  useEffect(() => {
    const timer = setTimeout(() => {
      startCamera();
    }, 100);

    return () => {
      clearTimeout(timer);
      cleanupCamera();
    };
  }, []);

  // Start camera
  const startCamera = async () => {
    try {
      setCameraError(null);
      setIsScanning(true);
      
      console.log('[Image Scanner] 📷 Starting camera...');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Wait for video to be ready before playing
        videoRef.current.onloadedmetadata = async () => {
          try {
            await videoRef.current?.play();
            console.log('[Image Scanner] ✅ Camera started');
          } catch (playError) {
            console.error('[Image Scanner] ❌ Video play error:', playError);
            setCameraError('Failed to start video playback');
            setIsScanning(false);
          }
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to access camera';
      console.error('[Image Scanner] ❌ Camera error:', errorMessage, error);
      setCameraError(errorMessage);
      setIsScanning(false);
      
      if (onError) {
        onError(errorMessage);
      }
    }
  };

  // Cleanup camera resources
  const cleanupCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setIsScanning(false);
    setCapturedImage(null);
    setProcessing(false);
  };

  // Stop camera and notify parent to close
  const stopCamera = () => {
    cleanupCamera();
    
    // Notify parent to close the scanner
    if (onClose) {
      onClose();
    }
  };

  // Capture image from video
  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) {
      console.error('[Image Scanner] ❌ Video or canvas ref not available');
      return;
    }

    setProcessing(true);

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw current video frame to canvas
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }
      
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert to base64
      const imageData = canvas.toDataURL('image/jpeg', 0.9);
      
      console.log('[Image Scanner] 📸 Image captured');
      
      setCapturedImage(imageData);
      stopCamera();
      
      // Return captured image
      onScanComplete({
        image: imageData,
        imageMimeType: 'image/jpeg',
      });
      
    } catch (error) {
      console.error('[Image Scanner] ❌ Capture error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to capture image';
      
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="relative w-full h-full bg-black flex flex-col">
      {/* Camera Error */}
      {cameraError && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-black bg-opacity-75">
          <div className="bg-red-50 border-2 border-red-300 rounded-lg p-6 m-4 max-w-md">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <h3 className="font-bold text-red-900 mb-2">Camera Error</h3>
                <p className="text-red-800 text-sm mb-4">{cameraError}</p>
                <button
                  onClick={startCamera}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading State - shown while camera is initializing */}
      {!isScanning && !capturedImage && !cameraError && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent mb-4"></div>
            <p className="text-white text-lg font-medium">Starting camera...</p>
          </div>
        </div>
      )}

      {/* Video Preview */}
      {isScanning && !capturedImage && (
        <div className="relative flex-1 flex flex-col bg-black overflow-hidden">
          {/* Close button - top right */}
          <button
            onClick={stopCamera}
            className="absolute top-4 right-4 z-10 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors shadow-lg"
          >
            ✕ Close
          </button>

          {/* Camera feed */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />

          {/* Bottom controls - fixed with safe area */}
          <div className="absolute bottom-0 left-0 right-0 pb-safe">
            <div className="p-6 bg-gradient-to-t from-black via-black/80 to-transparent">
              {/* Instruction text */}
              <p className="text-center text-white text-base mb-4 font-medium">
                Point camera at {scanType} and take a picture
              </p>

              {/* Action buttons */}
              <div className="flex gap-4 justify-center items-center">
                <button
                  onClick={stopCamera}
                  className="px-8 py-4 bg-red-600 text-white rounded-full font-semibold hover:bg-red-700 active:bg-red-800 transition-colors text-lg shadow-lg min-w-[140px]"
                >
                  ✕ Cancel
                </button>
                
                <button
                  onClick={captureImage}
                  disabled={processing}
                  className="px-8 py-4 bg-white text-gray-900 rounded-full font-semibold hover:bg-gray-100 active:bg-gray-200 disabled:bg-gray-400 disabled:text-gray-600 transition-colors text-lg shadow-lg min-w-[140px]"
                >
                  {processing ? '⏳ Processing...' : '📷 Capture'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Captured Image Preview */}
      {capturedImage && (
        <div className="flex-1 relative flex items-center justify-center p-4">
          <img
            src={capturedImage}
            alt="Captured"
            className="max-w-full max-h-full object-contain rounded-lg border-2 border-gray-300"
          />
        </div>
      )}

      {/* Hidden canvas for image capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
