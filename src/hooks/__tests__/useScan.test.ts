/**
 * Tests for useScan Hook
 * 
 * Tests the useScan hook for managing product scan API calls with authentication.
 * 
 * Requirements: 1.2, 5.1, 5.2, 5.3
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useScan } from '../useScan';
import { useAuth } from '@/contexts/AuthContext';
import { compressImage } from '@/lib/imageCompression';
import type { ScanParams } from '../useScan';
import type { AnalysisResult } from '@/lib/types';

// Mock dependencies
jest.mock('@/contexts/AuthContext');
jest.mock('@/lib/imageCompression');

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockCompressImage = compressImage as jest.MockedFunction<typeof compressImage>;

// Mock fetch
global.fetch = jest.fn();

describe('useScan', () => {
  const mockSession = {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_in: 3600,
    token_type: 'bearer',
    user: {
      id: 'user-123',
      email: 'test@example.com',
      aud: 'authenticated',
      role: 'authenticated',
      created_at: '2024-01-01T00:00:00Z',
      app_metadata: {},
      user_metadata: {},
    },
  };

  const mockAnalysisResult: AnalysisResult = {
    products: [
      {
        productName: 'Test Product',
        insights: {
          health: { rating: 'Good', explanation: 'Healthy product' },
          preservatives: { rating: 'Low', explanation: 'Few preservatives' },
          allergies: { rating: 'None', explanation: 'No common allergens' },
          sustainability: { rating: 'Good', explanation: 'Sustainable sourcing' },
          carbon: { rating: 'Low', explanation: 'Low carbon footprint' },
        },
      },
    ],
  };

  const mockScanParams: ScanParams = {
    imageData: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
    barcode: '1234567890123',
    tier: 'free',
    dimension: 'health',
    location: {
      latitude: 37.7749,
      longitude: -122.4194,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock useAuth to return authenticated session
    mockUseAuth.mockReturnValue({
      user: mockSession.user,
      session: mockSession as any,
      loading: false,
      signUp: jest.fn(),
      signIn: jest.fn(),
      signOut: jest.fn(),
    });

    // Mock compressImage to return the same image
    mockCompressImage.mockResolvedValue(mockScanParams.imageData);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('scanProduct', () => {
    it('should successfully scan a product and return analysis results', async () => {
      // Mock successful API response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            fromCache: false,
            analysis: mockAnalysisResult,
            product: {
              id: 'product-123',
              barcode: '1234567890123',
              name: 'Test Product',
              brand: 'Test Brand',
              last_scanned_at: '2024-01-01T00:00:00Z',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            },
          },
        }),
      });

      const { result } = renderHook(() => useScan());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.fromCache).toBe(null);

      // Call scanProduct
      const promise = result.current.scanProduct(mockScanParams);

      // Should be loading
      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      // Wait for completion
      const analysisResult = await promise;

      // Should have results
      expect(analysisResult).toEqual(mockAnalysisResult);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.fromCache).toBe(false);

      // Verify fetch was called with correct parameters
      expect(global.fetch).toHaveBeenCalledWith('/api/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock-access-token',
        },
        body: JSON.stringify({
          imageData: mockScanParams.imageData,
          barcode: mockScanParams.barcode,
          tier: mockScanParams.tier,
          dimension: mockScanParams.dimension,
          location: mockScanParams.location,
        }),
      });
    });

    it('should indicate when results come from cache', async () => {
      // Mock cached response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            fromCache: true,
            analysis: mockAnalysisResult,
            product: {
              id: 'product-123',
              barcode: '1234567890123',
              name: 'Test Product',
              brand: 'Test Brand',
              last_scanned_at: '2024-01-01T00:00:00Z',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            },
          },
        }),
      });

      const { result } = renderHook(() => useScan());

      const analysisResult = await result.current.scanProduct(mockScanParams);

      expect(analysisResult).toEqual(mockAnalysisResult);
      expect(result.current.fromCache).toBe(true);
    });

    it('should throw error when not authenticated', async () => {
      // Mock unauthenticated state
      mockUseAuth.mockReturnValue({
        user: null,
        session: null,
        loading: false,
        signUp: jest.fn(),
        signIn: jest.fn(),
        signOut: jest.fn(),
      });

      const { result } = renderHook(() => useScan());

      await expect(result.current.scanProduct(mockScanParams)).rejects.toThrow(
        'Authentication required. Please sign in to scan products.'
      );

      expect(result.current.error).toBe('Authentication required. Please sign in to scan products.');
    });

    it('should handle 401 authentication errors', async () => {
      // Mock 401 response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          success: false,
          error: 'Authentication required. Please sign in to scan products.',
        }),
      });

      const { result } = renderHook(() => useScan());

      await expect(result.current.scanProduct(mockScanParams)).rejects.toThrow(
        'Authentication required. Please sign in to scan products.'
      );

      expect(result.current.error).toBe('Authentication required. Please sign in to scan products.');
    });

    it('should handle 429 rate limit errors', async () => {
      // Mock 429 response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({
          success: false,
          error: 'Too many requests. Please wait a moment and try again.',
        }),
      });

      const { result } = renderHook(() => useScan());

      await expect(result.current.scanProduct(mockScanParams)).rejects.toThrow(
        'Too many requests. Please wait a moment and try again.'
      );
    });

    it('should handle 503 service unavailable errors', async () => {
      // Mock 503 response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({
          success: false,
          error: 'Service temporarily unavailable. Please try again in a moment.',
        }),
      });

      const { result } = renderHook(() => useScan());

      await expect(result.current.scanProduct(mockScanParams)).rejects.toThrow(
        'Service temporarily unavailable. Please try again in a moment.'
      );
    });

    it('should validate barcode format if provided', async () => {
      const { result } = renderHook(() => useScan());

      const invalidParams = { ...mockScanParams, barcode: 'invalid' };

      await expect(result.current.scanProduct(invalidParams)).rejects.toThrow();
    });

    it('should validate dimension is required for free tier', async () => {
      const { result } = renderHook(() => useScan());

      const invalidParams: ScanParams = {
        ...mockScanParams,
        tier: 'free',
        dimension: undefined,
      };

      await expect(result.current.scanProduct(invalidParams)).rejects.toThrow(
        'Dimension is required for free tier'
      );
    });

    it('should compress image before sending', async () => {
      const compressedImage = 'data:image/jpeg;base64,compressed';
      mockCompressImage.mockResolvedValueOnce(compressedImage);

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            fromCache: false,
            analysis: mockAnalysisResult,
            product: {
              id: 'product-123',
              barcode: '1234567890123',
              name: 'Test Product',
              brand: null,
              last_scanned_at: '2024-01-01T00:00:00Z',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            },
          },
        }),
      });

      const { result } = renderHook(() => useScan());

      await result.current.scanProduct(mockScanParams);

      // Verify compressImage was called
      expect(mockCompressImage).toHaveBeenCalledWith(mockScanParams.imageData);

      // Verify fetch was called with compressed image
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/scan',
        expect.objectContaining({
          body: expect.stringContaining(compressedImage),
        })
      );
    });

    it('should handle network errors', async () => {
      // Mock network error
      (global.fetch as jest.Mock).mockRejectedValueOnce(new TypeError('Failed to fetch'));

      const { result } = renderHook(() => useScan());

      await expect(result.current.scanProduct(mockScanParams)).rejects.toThrow(
        'Network error. Please check your connection and try again.'
      );

      expect(result.current.error).toBe('Network error. Please check your connection and try again.');
    });

    it('should handle invalid response format', async () => {
      // Mock invalid response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          // Missing data field
        }),
      });

      const { result } = renderHook(() => useScan());

      await expect(result.current.scanProduct(mockScanParams)).rejects.toThrow(
        'No scan data returned from server.'
      );
    });

    it('should validate all insight categories are present', async () => {
      // Mock response with missing insight category
      const invalidResult = {
        products: [
          {
            productName: 'Test Product',
            insights: {
              health: { rating: 'Good', explanation: 'Healthy' },
              // Missing other categories
            },
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            fromCache: false,
            analysis: invalidResult,
            product: {
              id: 'product-123',
              barcode: '1234567890123',
              name: 'Test Product',
              brand: null,
              last_scanned_at: '2024-01-01T00:00:00Z',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            },
          },
        }),
      });

      const { result } = renderHook(() => useScan());

      await expect(result.current.scanProduct(mockScanParams)).rejects.toThrow(
        /Missing or invalid .* insight in scan results/
      );
    });
  });
});
