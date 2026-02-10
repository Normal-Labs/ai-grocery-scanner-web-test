/**
 * Geolocation Service
 * 
 * Wraps the browser Geolocation API to capture user location coordinates.
 * Handles permission requests, errors, and provides a clean interface for
 * location-based features.
 * 
 * Requirements: 3.6, 9.1, 9.2, 9.3, 9.4
 */

import type { Coordinates } from './supabase/types';

/**
 * Geolocation error types
 */
export enum GeolocationErrorType {
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  POSITION_UNAVAILABLE = 'POSITION_UNAVAILABLE',
  TIMEOUT = 'TIMEOUT',
  NOT_SUPPORTED = 'NOT_SUPPORTED',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Geolocation error details
 */
export interface GeolocationError {
  type: GeolocationErrorType;
  message: string;
  code?: number;
}

/**
 * Geolocation result
 * Contains either coordinates or an error
 */
export interface GeolocationResult {
  coordinates: Coordinates | null;
  error: GeolocationError | null;
}

/**
 * Options for geolocation capture
 */
export interface GeolocationOptions {
  /** Enable high accuracy mode (uses GPS if available) */
  enableHighAccuracy?: boolean;
  /** Timeout in milliseconds (default: 10000ms = 10s) */
  timeout?: number;
  /** Maximum age of cached position in milliseconds (default: 0 = no cache) */
  maximumAge?: number;
}

/**
 * Default geolocation options
 * Requirement 9.4: Use high accuracy enabled
 */
const DEFAULT_OPTIONS: GeolocationOptions = {
  enableHighAccuracy: true,
  timeout: 10000, // 10 seconds
  maximumAge: 0, // Don't use cached position
};

/**
 * Check if geolocation is supported by the browser
 * 
 * @returns true if geolocation is supported, false otherwise
 */
export function isGeolocationSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    'geolocation' in navigator &&
    navigator.geolocation !== undefined &&
    navigator.geolocation !== null
  );
}

/**
 * Get current position from browser Geolocation API
 * 
 * This function wraps the browser's Geolocation API and handles all error cases
 * gracefully. It returns null for coordinates if permission is denied or if
 * geolocation is unavailable, allowing the application to continue without
 * location data.
 * 
 * Requirements:
 * - 9.1: Request geolocation permission from browser
 * - 9.2: Capture latitude and longitude if permission granted
 * - 9.3: Allow operation to proceed if permission denied
 * - 9.4: Use high accuracy enabled
 * 
 * @param options - Optional configuration for geolocation capture
 * @returns Promise resolving to GeolocationResult with coordinates or error
 * 
 * @example
 * ```typescript
 * const result = await getCurrentPosition();
 * if (result.coordinates) {
 *   console.log('Location:', result.coordinates);
 * } else {
 *   console.log('Location unavailable:', result.error?.message);
 * }
 * ```
 */
export async function getCurrentPosition(
  options: GeolocationOptions = {}
): Promise<GeolocationResult> {
  // Check if geolocation is supported
  if (!isGeolocationSupported()) {
    return {
      coordinates: null,
      error: {
        type: GeolocationErrorType.NOT_SUPPORTED,
        message: 'Geolocation is not supported by this browser',
      },
    };
  }

  // Merge with default options
  const opts: PositionOptions = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      // Success callback
      (position: GeolocationPosition) => {
        const coordinates: Coordinates = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };

        resolve({
          coordinates,
          error: null,
        });
      },
      // Error callback
      (error: GeolocationPositionError) => {
        let errorType: GeolocationErrorType;
        let errorMessage: string;

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorType = GeolocationErrorType.PERMISSION_DENIED;
            errorMessage = 'User denied geolocation permission';
            break;
          case error.POSITION_UNAVAILABLE:
            errorType = GeolocationErrorType.POSITION_UNAVAILABLE;
            errorMessage = 'Location information is unavailable';
            break;
          case error.TIMEOUT:
            errorType = GeolocationErrorType.TIMEOUT;
            errorMessage = 'Geolocation request timed out';
            break;
          default:
            errorType = GeolocationErrorType.UNKNOWN;
            errorMessage = error.message || 'Unknown geolocation error';
        }

        // Requirement 9.3: Return null and allow operation to proceed
        resolve({
          coordinates: null,
          error: {
            type: errorType,
            message: errorMessage,
            code: error.code,
          },
        });
      },
      // Options
      opts
    );
  });
}

/**
 * Watch position changes (for future use)
 * 
 * This function sets up continuous position monitoring. It's designed for
 * future features that may need real-time location tracking.
 * 
 * @param callback - Function called with each position update
 * @param errorCallback - Function called on errors
 * @param options - Optional configuration for geolocation capture
 * @returns Watch ID that can be used to clear the watch
 * 
 * @example
 * ```typescript
 * const watchId = watchPosition(
 *   (coords) => console.log('Position updated:', coords),
 *   (error) => console.log('Error:', error)
 * );
 * 
 * // Later, stop watching
 * clearWatch(watchId);
 * ```
 */
export function watchPosition(
  callback: (coordinates: Coordinates) => void,
  errorCallback?: (error: GeolocationError) => void,
  options: GeolocationOptions = {}
): number | null {
  if (!isGeolocationSupported()) {
    errorCallback?.({
      type: GeolocationErrorType.NOT_SUPPORTED,
      message: 'Geolocation is not supported by this browser',
    });
    return null;
  }

  const opts: PositionOptions = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  const watchId = navigator.geolocation.watchPosition(
    (position: GeolocationPosition) => {
      callback({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
    },
    (error: GeolocationPositionError) => {
      let errorType: GeolocationErrorType;
      let errorMessage: string;

      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorType = GeolocationErrorType.PERMISSION_DENIED;
          errorMessage = 'User denied geolocation permission';
          break;
        case error.POSITION_UNAVAILABLE:
          errorType = GeolocationErrorType.POSITION_UNAVAILABLE;
          errorMessage = 'Location information is unavailable';
          break;
        case error.TIMEOUT:
          errorType = GeolocationErrorType.TIMEOUT;
          errorMessage = 'Geolocation request timed out';
          break;
        default:
          errorType = GeolocationErrorType.UNKNOWN;
          errorMessage = error.message || 'Unknown geolocation error';
      }

      errorCallback?.({
        type: errorType,
        message: errorMessage,
        code: error.code,
      });
    },
    opts
  );

  return watchId;
}

/**
 * Clear position watch
 * 
 * @param watchId - Watch ID returned by watchPosition
 */
export function clearWatch(watchId: number): void {
  if (isGeolocationSupported()) {
    navigator.geolocation.clearWatch(watchId);
  }
}

/**
 * Request geolocation permission explicitly
 * 
 * This is a convenience function that attempts to get the current position
 * to trigger the permission prompt. It's useful for requesting permission
 * before actually needing the location.
 * 
 * @returns Promise resolving to true if permission granted, false otherwise
 * 
 * @example
 * ```typescript
 * const hasPermission = await requestGeolocationPermission();
 * if (hasPermission) {
 *   // Proceed with location-based features
 * }
 * ```
 */
export async function requestGeolocationPermission(): Promise<boolean> {
  const result = await getCurrentPosition();
  return result.coordinates !== null;
}
