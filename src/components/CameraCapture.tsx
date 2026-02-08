/**
 * CameraCapture Component
 * 
 * Handles camera access and image capture functionality.
 * Uses the useCamera hook for MediaDevices API interaction.
 * Provides fallback file input for unsupported browsers.
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.6, 1.7, 6.3
 */

'use client';

import { useCamera } from '@/hooks/useCamera';
import { useRef, ChangeEvent } from 'react';

interface CameraCaptureProps {
  onCapture: (imageData: string) => void;
  disabled?: boolean;
}

/**
 * Converts a File object to base64 data URI string
 * 
 * @param file - The image file to convert
 * @returns Promise resolving to base64 data URI string
 */
function convertFileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert file to base64'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsDataURL(file);
  });
}

export default function CameraCapture({ onCapture, disabled = false }: CameraCaptureProps) {
  const { hasPermission, isCapturing, error, requestPermission, captureImage } = useCamera();
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Handle camera button click
   * Requests permission if needed, then captures image
   */
  const handleCameraClick = async () => {
    if (disabled || isCapturing) return;

    try {
      // Request permission if we don't have it yet
      if (!hasPermission) {
        await requestPermission();
      }
      
      // Capture the image
      const imageData = await captureImage();
      onCapture(imageData);
    } catch (err) {
      // Error is already handled by useCamera hook
      console.error('Camera capture failed:', err);
    }
  };

  /**
   * Handle file input change (fallback for unsupported browsers)
   */
  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
      alert('Image is too large. Please select an image smaller than 10MB.');
      return;
    }

    try {
      const base64Data = await convertFileToBase64(file);
      onCapture(base64Data);
    } catch (err) {
      console.error('File conversion failed:', err);
      alert('Failed to process image. Please try again.');
    }

    // Reset the input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  /**
   * Trigger file input click
   */
  const handleFileUploadClick = () => {
    fileInputRef.current?.click();
  };

  // Check if MediaDevices API is supported
  const isMediaDevicesSupported = !!(
    typeof navigator !== 'undefined' &&
    navigator.mediaDevices &&
    navigator.mediaDevices.getUserMedia
  );

  return (
    <div className="w-full">
      {/* Camera Button */}
      {isMediaDevicesSupported && (
        <button
          onClick={handleCameraClick}
          disabled={disabled || isCapturing}
          className={`
            w-full min-h-[44px] px-6 py-3
            bg-blue-600 hover:bg-blue-700
            text-white font-semibold text-lg
            rounded-lg shadow-md
            transition-all duration-200
            flex items-center justify-center gap-3
            ${(disabled || isCapturing) ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}
          `}
          aria-label="Capture image with camera"
        >
          {/* Camera Icon */}
          <span className="text-2xl" role="img" aria-label="camera">
            📷
          </span>
          
          {/* Button Text */}
          <span>
            {isCapturing ? 'Capturing...' : hasPermission ? 'Capture Photo' : 'Open Camera'}
          </span>
        </button>
      )}

      {/* Fallback File Upload Button */}
      {!isMediaDevicesSupported && (
        <button
          onClick={handleFileUploadClick}
          disabled={disabled}
          className={`
            w-full min-h-[44px] px-6 py-3
            bg-blue-600 hover:bg-blue-700
            text-white font-semibold text-lg
            rounded-lg shadow-md
            transition-all duration-200
            flex items-center justify-center gap-3
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}
          `}
          aria-label="Upload image file"
        >
          {/* Upload Icon */}
          <span className="text-2xl" role="img" aria-label="upload">
            📁
          </span>
          
          {/* Button Text */}
          <span>Upload Photo</span>
        </button>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        aria-label="File input for image upload"
      />

      {/* Alternative Upload Option (shown when camera is supported) */}
      {isMediaDevicesSupported && (
        <button
          onClick={handleFileUploadClick}
          disabled={disabled}
          className={`
            w-full min-h-[44px] px-6 py-3 mt-3
            bg-gray-100 hover:bg-gray-200
            text-gray-700 font-medium text-base
            rounded-lg border-2 border-gray-300
            transition-all duration-200
            flex items-center justify-center gap-2
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}
          `}
          aria-label="Upload image file as alternative"
        >
          {/* Upload Icon */}
          <span className="text-xl" role="img" aria-label="upload">
            📁
          </span>
          
          {/* Button Text */}
          <span>Or Upload from Gallery</span>
        </button>
      )}

      {/* Error Message Display */}
      {error && (
        <div
          className="mt-4 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg"
          role="alert"
          aria-live="polite"
        >
          <div className="flex items-start gap-3">
            {/* Error Icon */}
            <span className="text-2xl flex-shrink-0" role="img" aria-label="error">
              ⚠️
            </span>
            
            {/* Error Message */}
            <div className="flex-1">
              <h4 className="font-semibold text-red-900 mb-1">
                Camera Error
              </h4>
              <p className="text-sm text-red-800 leading-relaxed">
                {error}
              </p>
              
              {/* Helpful Tip */}
              {error.includes('denied') && (
                <p className="text-sm text-red-700 mt-2 italic">
                  Tip: You can still use the "Upload from Gallery" option below.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Browser Compatibility Notice */}
      {!isMediaDevicesSupported && (
        <div
          className="mt-4 p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded-lg"
          role="status"
        >
          <div className="flex items-start gap-3">
            {/* Info Icon */}
            <span className="text-2xl flex-shrink-0" role="img" aria-label="info">
              ℹ️
            </span>
            
            {/* Info Message */}
            <div className="flex-1">
              <h4 className="font-semibold text-yellow-900 mb-1">
                Camera Not Available
              </h4>
              <p className="text-sm text-yellow-800 leading-relaxed">
                Your browser doesn't support camera access. Please use the file upload option to select an image from your device.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
