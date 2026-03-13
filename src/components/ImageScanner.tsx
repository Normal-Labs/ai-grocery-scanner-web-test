'use client';

/**
 * Image Scanner Component
 * 
 * Simple camera interface for capturing product images.
 * V2 Design with clean, minimal UI.
 */

import { useState, useRef, useEffect } from 'react';
import { X, ImageIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ImageScannerProps {
  onScanComplete: (result: { image?: string; imageMimeType?: string }) => void;
  onError?: (error: string) => void;
  onClose?: () => void;
  scanType?: 'barcode' | 'packaging' | 'ingredients' | 'nutrition facts';
  instruction?: string; // Custom instruction text
}

export default function ImageScanner({ onScanComplete, onError, onClose, scanType = 'packaging', instruction }: ImageScannerProps) {
  const router = useRouter();
  const [isScanning, setIsScanning] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [useFileInput, setUseFileInput] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    
    // Notify parent to close if callback provided
    if (onClose) {
      onClose();
    }
  };

  // Handle file input for gallery
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setProcessing(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageData = e.target?.result as string;
      
      console.log('[Image Scanner] 📸 Image loaded from gallery');
      
      setCapturedImage(imageData);
      stopCamera();
      
      // Return captured image
      onScanComplete({
        image: imageData,
        imageMimeType: file.type || 'image/jpeg',
      });
      
      setProcessing(false);
    };
    
    reader.onerror = () => {
      console.error('[Image Scanner] ❌ Failed to read file');
      if (onError) {
        onError('Failed to read image file');
      }
      setProcessing(false);
    };
    
    reader.readAsDataURL(file);
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

      {/* Video Preview - V2 Design */}
      {isScanning && !capturedImage && (
        <div className="relative flex-1 flex flex-col bg-black overflow-hidden">
          {/* Top controls */}
          <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-5 py-4 pt-safe">
            <button 
              onClick={stopCamera}
              className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Camera feed */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />

          {/* Bottom controls - V2 Design */}
          <div className="absolute bottom-0 left-0 right-0 z-10 px-5 pb-10 pb-safe">
            {/* Instruction text with background */}
            <div className="mb-6 mx-auto max-w-xs">
              <div className="bg-black/40 backdrop-blur-sm rounded-2xl px-4 py-3">
                <p className="text-sm font-medium text-white text-center">
                  {instruction || 'Point at any product'}
                </p>
                <p className="text-xs text-white/80 text-center mt-1">
                  or scan a barcode
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              {/* Gallery button */}
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={processing}
                className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors disabled:opacity-50"
              >
                <ImageIcon className="w-5 h-5 text-white" />
              </button>
              
              {/* Capture button - large center button */}
              <button 
                onClick={captureImage}
                disabled={processing}
                className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-lg active:scale-95 transition-transform disabled:opacity-50"
              >
                <div className="w-16 h-16 rounded-full border-4 border-black" />
              </button>
              
              {/* Spacer to balance layout (replaces flip camera button) */}
              <div className="w-12 h-12" />
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

      {/* Hidden file input for gallery */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Hidden canvas for image capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
