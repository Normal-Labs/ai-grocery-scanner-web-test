/**
 * Unit tests for Geolocation Service
 * 
 * Tests the browser Geolocation API wrapper including permission handling,
 * coordinate capture, error scenarios, and graceful degradation.
 * 
 * Requirements: 9.1, 9.2, 9.3
 */

import {
  getCurrentPosition,
  isGeolocationSupported,
  watchPosition,
  clearWatch,
  requestGeolocationPermission,
  GeolocationErrorType,
  type GeolocationResult,
  type Coordinates,
} from '../geolocation';

describe('Geolocation Service', () => {
  // Mock geolocation API
  let mockGeolocation: {
    getCurrentPosition: jest.Mock;
    watchPosition: jest.Mock;
    clearWatch: jest.Mock;
  };

  beforeEach(() => {
    // Create mock geolocation object
    mockGeolocation = {
      getCurrentPosition: jest.fn(),
      watchPosition: jest.fn(),
      clearWatch: jest.fn(),
    };

    // Mock navigator.geolocation
    Object.defineProperty(global.navigator, 'geolocation', {
      value: mockGeolocation,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('isGeolocationSupported', () => {
    it('should return true when geolocation is supported', () => {
      expect(isGeolocationSupported()).toBe(true);
    });

    it('should return false when geolocation is not supported', () => {
      // Remove geolocation from navigator
      Object.defineProperty(global.navigator, 'geolocation', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      expect(isGeolocationSupported()).toBe(false);
    });

    it('should return false when navigator is undefined', () => {
      const originalNavigator = global.navigator;
      // @ts-ignore - Testing edge case
      delete global.navigator;

      expect(isGeolocationSupported()).toBe(false);

      // Restore navigator
      global.navigator = originalNavigator;
    });
  });

  describe('getCurrentPosition', () => {
    const mockCoordinates: Coordinates = {
      latitude: 37.7749,
      longitude: -122.4194,
    };

    const mockPosition: GeolocationPosition = {
      coords: {
        latitude: mockCoordinates.latitude,
        longitude: mockCoordinates.longitude,
        accuracy: 10,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: Date.now(),
    };

    it('should return coordinates when permission is granted', async () => {
      // Mock successful geolocation
      mockGeolocation.getCurrentPosition.mockImplementation(
        (success: PositionCallback) => {
          success(mockPosition);
        }
      );

      const result = await getCurrentPosition();

      expect(result.coordinates).toEqual(mockCoordinates);
      expect(result.error).toBeNull();
      expect(mockGeolocation.getCurrentPosition).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function),
        expect.objectContaining({
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        })
      );
    });

    it('should use high accuracy by default', async () => {
      mockGeolocation.getCurrentPosition.mockImplementation(
        (success: PositionCallback) => {
          success(mockPosition);
        }
      );

      await getCurrentPosition();

      const callArgs = mockGeolocation.getCurrentPosition.mock.calls[0];
      const options = callArgs[2] as PositionOptions;
      expect(options.enableHighAccuracy).toBe(true);
    });

    it('should allow custom options', async () => {
      mockGeolocation.getCurrentPosition.mockImplementation(
        (success: PositionCallback) => {
          success(mockPosition);
        }
      );

      await getCurrentPosition({
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: 1000,
      });

      const callArgs = mockGeolocation.getCurrentPosition.mock.calls[0];
      const options = callArgs[2] as PositionOptions;
      expect(options.enableHighAccuracy).toBe(false);
      expect(options.timeout).toBe(5000);
      expect(options.maximumAge).toBe(1000);
    });

    it('should return null coordinates when permission is denied', async () => {
      const mockError: GeolocationPositionError = {
        code: 1, // PERMISSION_DENIED
        message: 'User denied geolocation',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      };

      mockGeolocation.getCurrentPosition.mockImplementation(
        (_success: PositionCallback, error: PositionErrorCallback) => {
          error(mockError);
        }
      );

      const result = await getCurrentPosition();

      expect(result.coordinates).toBeNull();
      expect(result.error).toEqual({
        type: GeolocationErrorType.PERMISSION_DENIED,
        message: 'User denied geolocation permission',
        code: 1,
      });
    });

    it('should return null coordinates when position is unavailable', async () => {
      const mockError: GeolocationPositionError = {
        code: 2, // POSITION_UNAVAILABLE
        message: 'Position unavailable',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      };

      mockGeolocation.getCurrentPosition.mockImplementation(
        (_success: PositionCallback, error: PositionErrorCallback) => {
          error(mockError);
        }
      );

      const result = await getCurrentPosition();

      expect(result.coordinates).toBeNull();
      expect(result.error).toEqual({
        type: GeolocationErrorType.POSITION_UNAVAILABLE,
        message: 'Location information is unavailable',
        code: 2,
      });
    });

    it('should return null coordinates when request times out', async () => {
      const mockError: GeolocationPositionError = {
        code: 3, // TIMEOUT
        message: 'Timeout',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      };

      mockGeolocation.getCurrentPosition.mockImplementation(
        (_success: PositionCallback, error: PositionErrorCallback) => {
          error(mockError);
        }
      );

      const result = await getCurrentPosition();

      expect(result.coordinates).toBeNull();
      expect(result.error).toEqual({
        type: GeolocationErrorType.TIMEOUT,
        message: 'Geolocation request timed out',
        code: 3,
      });
    });

    it('should handle unknown errors gracefully', async () => {
      const mockError: GeolocationPositionError = {
        code: 99, // Unknown code
        message: 'Unknown error',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      };

      mockGeolocation.getCurrentPosition.mockImplementation(
        (_success: PositionCallback, error: PositionErrorCallback) => {
          error(mockError);
        }
      );

      const result = await getCurrentPosition();

      expect(result.coordinates).toBeNull();
      expect(result.error).toEqual({
        type: GeolocationErrorType.UNKNOWN,
        message: 'Unknown error',
        code: 99,
      });
    });

    it('should return error when geolocation is not supported', async () => {
      // Remove geolocation from navigator
      Object.defineProperty(global.navigator, 'geolocation', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      const result = await getCurrentPosition();

      expect(result.coordinates).toBeNull();
      expect(result.error).toEqual({
        type: GeolocationErrorType.NOT_SUPPORTED,
        message: 'Geolocation is not supported by this browser',
      });
    });

    it('should handle errors without message', async () => {
      const mockError: GeolocationPositionError = {
        code: 99,
        message: '',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      };

      mockGeolocation.getCurrentPosition.mockImplementation(
        (_success: PositionCallback, error: PositionErrorCallback) => {
          error(mockError);
        }
      );

      const result = await getCurrentPosition();

      expect(result.coordinates).toBeNull();
      expect(result.error?.message).toBe('Unknown geolocation error');
    });
  });

  describe('watchPosition', () => {
    const mockCoordinates: Coordinates = {
      latitude: 37.7749,
      longitude: -122.4194,
    };

    const mockPosition: GeolocationPosition = {
      coords: {
        latitude: mockCoordinates.latitude,
        longitude: mockCoordinates.longitude,
        accuracy: 10,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: Date.now(),
    };

    it('should watch position and call callback on updates', () => {
      const mockWatchId = 123;
      const callback = jest.fn();
      const errorCallback = jest.fn();

      mockGeolocation.watchPosition.mockImplementation(
        (success: PositionCallback) => {
          success(mockPosition);
          return mockWatchId;
        }
      );

      const watchId = watchPosition(callback, errorCallback);

      expect(watchId).toBe(mockWatchId);
      expect(callback).toHaveBeenCalledWith(mockCoordinates);
      expect(errorCallback).not.toHaveBeenCalled();
      expect(mockGeolocation.watchPosition).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function),
        expect.objectContaining({
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        })
      );
    });

    it('should call error callback on permission denied', () => {
      const callback = jest.fn();
      const errorCallback = jest.fn();

      const mockError: GeolocationPositionError = {
        code: 1, // PERMISSION_DENIED
        message: 'User denied geolocation',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      };

      mockGeolocation.watchPosition.mockImplementation(
        (_success: PositionCallback, error: PositionErrorCallback) => {
          error(mockError);
          return 123;
        }
      );

      watchPosition(callback, errorCallback);

      expect(callback).not.toHaveBeenCalled();
      expect(errorCallback).toHaveBeenCalledWith({
        type: GeolocationErrorType.PERMISSION_DENIED,
        message: 'User denied geolocation permission',
        code: 1,
      });
    });

    it('should return null when geolocation is not supported', () => {
      const callback = jest.fn();
      const errorCallback = jest.fn();

      // Remove geolocation from navigator
      Object.defineProperty(global.navigator, 'geolocation', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      const watchId = watchPosition(callback, errorCallback);

      expect(watchId).toBeNull();
      expect(errorCallback).toHaveBeenCalledWith({
        type: GeolocationErrorType.NOT_SUPPORTED,
        message: 'Geolocation is not supported by this browser',
      });
    });

    it('should work without error callback', () => {
      const mockWatchId = 123;
      const callback = jest.fn();

      mockGeolocation.watchPosition.mockImplementation(
        (success: PositionCallback) => {
          success(mockPosition);
          return mockWatchId;
        }
      );

      const watchId = watchPosition(callback);

      expect(watchId).toBe(mockWatchId);
      expect(callback).toHaveBeenCalledWith(mockCoordinates);
    });

    it('should allow custom options', () => {
      const callback = jest.fn();
      mockGeolocation.watchPosition.mockReturnValue(123);

      watchPosition(callback, undefined, {
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: 1000,
      });

      const callArgs = mockGeolocation.watchPosition.mock.calls[0];
      const options = callArgs[2] as PositionOptions;
      expect(options.enableHighAccuracy).toBe(false);
      expect(options.timeout).toBe(5000);
      expect(options.maximumAge).toBe(1000);
    });
  });

  describe('clearWatch', () => {
    it('should clear position watch', () => {
      const watchId = 123;

      clearWatch(watchId);

      expect(mockGeolocation.clearWatch).toHaveBeenCalledWith(watchId);
    });

    it('should not throw when geolocation is not supported', () => {
      // Remove geolocation from navigator
      Object.defineProperty(global.navigator, 'geolocation', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      expect(() => clearWatch(123)).not.toThrow();
    });
  });

  describe('requestGeolocationPermission', () => {
    const mockCoordinates: Coordinates = {
      latitude: 37.7749,
      longitude: -122.4194,
    };

    const mockPosition: GeolocationPosition = {
      coords: {
        latitude: mockCoordinates.latitude,
        longitude: mockCoordinates.longitude,
        accuracy: 10,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: Date.now(),
    };

    it('should return true when permission is granted', async () => {
      mockGeolocation.getCurrentPosition.mockImplementation(
        (success: PositionCallback) => {
          success(mockPosition);
        }
      );

      const hasPermission = await requestGeolocationPermission();

      expect(hasPermission).toBe(true);
    });

    it('should return false when permission is denied', async () => {
      const mockError: GeolocationPositionError = {
        code: 1, // PERMISSION_DENIED
        message: 'User denied geolocation',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      };

      mockGeolocation.getCurrentPosition.mockImplementation(
        (_success: PositionCallback, error: PositionErrorCallback) => {
          error(mockError);
        }
      );

      const hasPermission = await requestGeolocationPermission();

      expect(hasPermission).toBe(false);
    });

    it('should return false when geolocation is not supported', async () => {
      // Remove geolocation from navigator
      Object.defineProperty(global.navigator, 'geolocation', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      const hasPermission = await requestGeolocationPermission();

      expect(hasPermission).toBe(false);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete success flow', async () => {
      const mockPosition: GeolocationPosition = {
        coords: {
          latitude: 40.7128,
          longitude: -74.006,
          accuracy: 10,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now(),
      };

      mockGeolocation.getCurrentPosition.mockImplementation(
        (success: PositionCallback) => {
          success(mockPosition);
        }
      );

      const result = await getCurrentPosition();

      expect(result.coordinates).toEqual({
        latitude: 40.7128,
        longitude: -74.006,
      });
      expect(result.error).toBeNull();
    });

    it('should handle graceful degradation on permission denial', async () => {
      const mockError: GeolocationPositionError = {
        code: 1,
        message: 'User denied geolocation',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      };

      mockGeolocation.getCurrentPosition.mockImplementation(
        (_success: PositionCallback, error: PositionErrorCallback) => {
          error(mockError);
        }
      );

      const result = await getCurrentPosition();

      // Should return null coordinates but not throw
      expect(result.coordinates).toBeNull();
      expect(result.error?.type).toBe(GeolocationErrorType.PERMISSION_DENIED);
      
      // Application can continue without location
      expect(result).toBeDefined();
    });

    it('should handle multiple sequential requests', async () => {
      const positions = [
        { latitude: 37.7749, longitude: -122.4194 },
        { latitude: 40.7128, longitude: -74.006 },
        { latitude: 51.5074, longitude: -0.1278 },
      ];

      for (const coords of positions) {
        const mockPosition: GeolocationPosition = {
          coords: {
            latitude: coords.latitude,
            longitude: coords.longitude,
            accuracy: 10,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
          },
          timestamp: Date.now(),
        };

        mockGeolocation.getCurrentPosition.mockImplementation(
          (success: PositionCallback) => {
            success(mockPosition);
          }
        );

        const result = await getCurrentPosition();
        expect(result.coordinates).toEqual(coords);
      }
    });
  });
});
