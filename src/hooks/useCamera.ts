/**
 * useCamera Hook
 * 
 * Custom React hook for managing camera access and image capture using the MediaDevices API.
 * Handles permission requests, camera stream lifecycle, and image capture with base64 conversion.
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.6, 1.7
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Return type for useCamera hook
 */
export interface UseCameraReturn {
  hasPermission: boolean;
  isCapturing: boolean;
  error: string | null;
  requestPermission: () => Promise<void>;
  captureImage: () => Promise<string>;
}

/**
 * Custom hook for camera access and image capture
 * 
 * @returns {UseCameraReturn} Camera state and control functions
 * 
 * @example
 * ```tsx
 * const { hasPermission, isCapturing, error, requestPermission, captureImage } = useCamera();
 * 
 * // Request camera permission
 * await requestPermission();
 * 
 * // Capture an image
 * const base64Image = await captureImage();
 * ```
 */
export function useCamera(): UseCameraReturn {
  const [hasPermission, setHasPermission] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  /**
   * Check if MediaDevices API is supported
   */
  const isMediaDevicesSupported = useCallback((): boolean => {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }, []);

  /**
   * Clean up camera stream
   */
  const cleanupStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  /**
   * Request camera permission and access
   * 
   * Requirements: 1.1, 1.2, 1.6, 1.7
   */
  const requestPermission = useCallback(async (): Promise<void> => {
    setError(null);

    // Check for MediaDevices API support
    if (!isMediaDevicesSupported()) {
      const errorMsg = 'Camera API not supported in this browser. Please use a modern browser or try the file upload option.';
      setError(errorMsg);
      throw new Error(errorMsg);
    }

    try {
      // Request access to the rear camera (mobile) or default camera (desktop)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Prefer rear camera on mobile
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });

      // Store the stream reference
      streamRef.current = stream;
      setHasPermission(true);
      setError(null);
    } catch (err) {
      // Handle different types of errors
      if (err instanceof Error) {
        let errorMessage: string;

        // Check for specific error types
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          errorMessage = 'Camera access denied. Please enable camera permissions in your browser settings to use this feature.';
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          errorMessage = 'No camera found on this device. Please try using the file upload option instead.';
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          errorMessage = 'Camera is unavailable. It may be in use by another application. Please close other apps and try again.';
        } else if (err.name === 'OverconstrainedError') {
          errorMessage = 'Camera does not meet the required specifications. Please try using the file upload option.';
        } else if (err.name === 'SecurityError') {
          errorMessage = 'Camera access blocked due to security restrictions. Please ensure you are using HTTPS.';
        } else {
          errorMessage = `Camera error: ${err.message}`;
        }

        setError(errorMessage);
        setHasPermission(false);
        throw new Error(errorMessage);
      } else {
        const errorMessage = 'An unknown error occurred while accessing the camera.';
        setError(errorMessage);
        setHasPermission(false);
        throw new Error(errorMessage);
      }
    }
  }, [isMediaDevicesSupported]);

  /**
   * Capture an image from the camera and convert to base64
   * 
   * Requirements: 1.3, 1.4
   * 
   * @returns {Promise<string>} Base64-encoded image data with data URI prefix
   */
  const captureImage = useCallback(async (): Promise<string> => {
    setError(null);
    setIsCapturing(true);

    try {
      // Ensure we have camera access
      if (!streamRef.current) {
        await requestPermission();
      }

      if (!streamRef.current) {
        throw new Error('Camera stream not available');
      }

      // Create a video element to capture the frame
      const video = document.createElement('video');
      video.srcObject = streamRef.current;
      video.setAttribute('playsinline', 'true'); // Important for iOS Safari
      
      // Wait for video to be ready
      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => {
          video.play()
            .then(() => resolve())
            .catch(reject);
        };
        video.onerror = () => reject(new Error('Failed to load video stream'));
      });

      // Wait a brief moment for the video to stabilize
      await new Promise(resolve => setTimeout(resolve, 100));

      // Create canvas to capture the frame
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('Failed to get canvas context');
      }

      // Draw the current video frame to the canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert canvas to base64 JPEG
      const base64Image = canvas.toDataURL('image/jpeg', 0.85);

      // Clean up
      video.pause();
      video.srcObject = null;
      cleanupStream();

      setIsCapturing(false);
      return base64Image;
    } catch (err) {
      setIsCapturing(false);
      
      const errorMessage = err instanceof Error 
        ? `Failed to capture image: ${err.message}`
        : 'Failed to capture image. Please try again.';
      
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [requestPermission, cleanupStream]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      cleanupStream();
    };
  }, [cleanupStream]);

  return {
    hasPermission,
    isCapturing,
    error,
    requestPermission,
    captureImage
  };
}
