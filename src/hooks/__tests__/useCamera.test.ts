/**
 * Unit tests for useCamera hook
 * 
 * Tests camera permission flow, image capture, error handling,
 * and browser API compatibility.
 * 
 * Requirements: 1.1, 1.2, 1.6, 1.7
 */

import { renderHook, act } from '@testing-library/react';
import { useCamera } from '../useCamera';

describe('useCamera', () => {
  let mockGetUserMedia: jest.Mock;
  let mockMediaStream: MediaStream;
  let mockVideoTrack: MediaStreamTrack;

  beforeEach(() => {
    // Create mock video track
    mockVideoTrack = {
      stop: jest.fn(),
      kind: 'video',
      enabled: true,
      id: 'mock-track-id',
      label: 'mock camera',
      readyState: 'live',
    } as unknown as MediaStreamTrack;

    // Create mock media stream
    mockMediaStream = {
      getTracks: jest.fn(() => [mockVideoTrack]),
      getVideoTracks: jest.fn(() => [mockVideoTrack]),
      getAudioTracks: jest.fn(() => []),
      active: true,
    } as unknown as MediaStream;

    // Mock getUserMedia
    mockGetUserMedia = jest.fn().mockResolvedValue(mockMediaStream);

    // Setup navigator.mediaDevices
    Object.defineProperty(global.navigator, 'mediaDevices', {
      writable: true,
      configurable: true,
      value: {
        getUserMedia: mockGetUserMedia,
      },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('Initial State', () => {
    it('should initialize with correct default values', () => {
      const { result } = renderHook(() => useCamera());

      expect(result.current.hasPermission).toBe(false);
      expect(result.current.isCapturing).toBe(false);
      expect(result.current.error).toBe(null);
      expect(typeof result.current.requestPermission).toBe('function');
      expect(typeof result.current.captureImage).toBe('function');
    });
  });

  describe('MediaDevices API Support', () => {
    it('should detect when MediaDevices API is not supported', async () => {
      // Remove mediaDevices support
      Object.defineProperty(global.navigator, 'mediaDevices', {
        writable: true,
        configurable: true,
        value: undefined,
      });

      const { result } = renderHook(() => useCamera());

      await act(async () => {
        await expect(result.current.requestPermission()).rejects.toThrow(
          'Camera API not supported in this browser'
        );
      });

      expect(result.current.hasPermission).toBe(false);
      expect(result.current.error).toContain('Camera API not supported');
    });

    it('should detect when getUserMedia is not available', async () => {
      // Remove getUserMedia
      Object.defineProperty(global.navigator, 'mediaDevices', {
        writable: true,
        configurable: true,
        value: {},
      });

      const { result } = renderHook(() => useCamera());

      await act(async () => {
        await expect(result.current.requestPermission()).rejects.toThrow();
      });

      expect(result.current.hasPermission).toBe(false);
      expect(result.current.error).not.toBe(null);
    });
  });

  describe('requestPermission', () => {
    it('should successfully request camera permission', async () => {
      const { result } = renderHook(() => useCamera());

      await act(async () => {
        await result.current.requestPermission();
      });

      expect(mockGetUserMedia).toHaveBeenCalledWith({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
      expect(result.current.hasPermission).toBe(true);
      expect(result.current.error).toBe(null);
    });

    it('should handle permission denied error (NotAllowedError)', async () => {
      mockGetUserMedia.mockRejectedValue(
        Object.assign(new Error('Permission denied'), { name: 'NotAllowedError' })
      );

      const { result } = renderHook(() => useCamera());

      await act(async () => {
        await expect(result.current.requestPermission()).rejects.toThrow();
      });

      expect(result.current.hasPermission).toBe(false);
      expect(result.current.error).toContain('Camera access denied');
      expect(result.current.error).toContain('enable camera permissions');
    });

    it('should handle camera not found error (NotFoundError)', async () => {
      mockGetUserMedia.mockRejectedValue(
        Object.assign(new Error('No camera found'), { name: 'NotFoundError' })
      );

      const { result } = renderHook(() => useCamera());

      await act(async () => {
        await expect(result.current.requestPermission()).rejects.toThrow();
      });

      expect(result.current.hasPermission).toBe(false);
      expect(result.current.error).toContain('No camera found');
      expect(result.current.error).toContain('file upload option');
    });

    it('should handle camera in use error (NotReadableError)', async () => {
      mockGetUserMedia.mockRejectedValue(
        Object.assign(new Error('Camera in use'), { name: 'NotReadableError' })
      );

      const { result } = renderHook(() => useCamera());

      await act(async () => {
        await expect(result.current.requestPermission()).rejects.toThrow();
      });

      expect(result.current.hasPermission).toBe(false);
      expect(result.current.error).toContain('Camera is unavailable');
      expect(result.current.error).toContain('in use by another application');
    });

    it('should handle overconstrained error', async () => {
      mockGetUserMedia.mockRejectedValue(
        Object.assign(new Error('Constraints not satisfied'), { name: 'OverconstrainedError' })
      );

      const { result } = renderHook(() => useCamera());

      await act(async () => {
        await expect(result.current.requestPermission()).rejects.toThrow();
      });

      expect(result.current.hasPermission).toBe(false);
      expect(result.current.error).toContain('does not meet the required specifications');
    });

    it('should handle security error', async () => {
      mockGetUserMedia.mockRejectedValue(
        Object.assign(new Error('Security error'), { name: 'SecurityError' })
      );

      const { result } = renderHook(() => useCamera());

      await act(async () => {
        await expect(result.current.requestPermission()).rejects.toThrow();
      });

      expect(result.current.hasPermission).toBe(false);
      expect(result.current.error).toContain('security restrictions');
      expect(result.current.error).toContain('HTTPS');
    });

    it('should handle generic errors', async () => {
      mockGetUserMedia.mockRejectedValue(new Error('Unknown error'));

      const { result } = renderHook(() => useCamera());

      await act(async () => {
        await expect(result.current.requestPermission()).rejects.toThrow();
      });

      expect(result.current.hasPermission).toBe(false);
      expect(result.current.error).toContain('Camera error');
    });

    it('should clear previous errors when requesting permission again', async () => {
      const { result } = renderHook(() => useCamera());

      // First request fails
      mockGetUserMedia.mockRejectedValueOnce(
        Object.assign(new Error('Permission denied'), { name: 'NotAllowedError' })
      );

      await act(async () => {
        await expect(result.current.requestPermission()).rejects.toThrow();
      });

      expect(result.current.error).not.toBe(null);

      // Second request succeeds
      mockGetUserMedia.mockResolvedValueOnce(mockMediaStream);

      await act(async () => {
        await result.current.requestPermission();
      });

      expect(result.current.error).toBe(null);
      expect(result.current.hasPermission).toBe(true);
    });
  });

  describe('Stream Cleanup', () => {
    it('should clean up stream on unmount', async () => {
      const { result, unmount } = renderHook(() => useCamera());

      await act(async () => {
        await result.current.requestPermission();
      });

      unmount();

      // Verify that stop was called on the track
      expect(mockVideoTrack.stop).toHaveBeenCalled();
    });

    it('should handle cleanup when no stream exists', () => {
      const { unmount } = renderHook(() => useCamera());

      // Should not throw error
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle non-Error exceptions', async () => {
      mockGetUserMedia.mockRejectedValue('String error');

      const { result } = renderHook(() => useCamera());

      await act(async () => {
        await expect(result.current.requestPermission()).rejects.toThrow();
      });

      expect(result.current.error).toContain('unknown error');
    });

    it('should clear error when requesting permission successfully after failure', async () => {
      const { result } = renderHook(() => useCamera());

      // First request fails
      mockGetUserMedia.mockRejectedValueOnce(
        Object.assign(new Error('Permission denied'), { name: 'NotAllowedError' })
      );

      await act(async () => {
        await expect(result.current.requestPermission()).rejects.toThrow();
      });

      expect(result.current.error).not.toBe(null);

      // Second request succeeds
      mockGetUserMedia.mockResolvedValueOnce(mockMediaStream);

      await act(async () => {
        await result.current.requestPermission();
      });

      expect(result.current.error).toBe(null);
    });
  });
});
