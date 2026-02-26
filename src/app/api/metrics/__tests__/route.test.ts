/**
 * Unit tests for Metrics API endpoint
 * 
 * Tests the /api/metrics endpoint including metrics calculation,
 * time range filtering, and error handling.
 * 
 * Requirements: 14.7
 * 
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { GET } from '../route';
import { getSupabaseServerClient } from '@/lib/supabase/server-client';

// Mock dependencies
jest.mock('@/lib/supabase/server-client');

const mockGetSupabaseServerClient = getSupabaseServerClient as jest.MockedFunction<
  typeof getSupabaseServerClient
>;

describe('GET /api/metrics', () => {
  // Mock scan logs data
  const mockScanLogs = [
    // Tier 1 scans
    {
      id: '1',
      user_id: 'user-1',
      session_id: 'session-1',
      tier: 1,
      success: true,
      product_id: 'product-1',
      barcode: '012345678901',
      image_hash: null,
      confidence_score: 1.0,
      processing_time_ms: 100,
      cached: true,
      error_code: null,
      created_at: new Date().toISOString(),
    },
    {
      id: '2',
      user_id: 'user-1',
      session_id: 'session-1',
      tier: 1,
      success: true,
      product_id: 'product-2',
      barcode: '012345678902',
      image_hash: null,
      confidence_score: 1.0,
      processing_time_ms: 500,
      cached: false,
      error_code: null,
      created_at: new Date().toISOString(),
    },
    // Tier 2 scans
    {
      id: '3',
      user_id: 'user-2',
      session_id: 'session-2',
      tier: 2,
      success: true,
      product_id: 'product-3',
      barcode: null,
      image_hash: 'hash123',
      confidence_score: 0.85,
      processing_time_ms: 3000,
      cached: false,
      error_code: null,
      created_at: new Date().toISOString(),
    },
    // Tier 3 scans
    {
      id: '4',
      user_id: 'user-3',
      session_id: 'session-3',
      tier: 3,
      success: true,
      product_id: 'product-4',
      barcode: '012345678903',
      image_hash: 'hash456',
      confidence_score: 0.75,
      processing_time_ms: 5000,
      cached: false,
      error_code: null,
      created_at: new Date().toISOString(),
    },
    // Tier 4 scans
    {
      id: '5',
      user_id: 'user-4',
      session_id: 'session-4',
      tier: 4,
      success: true,
      product_id: 'product-5',
      barcode: null,
      image_hash: 'hash789',
      confidence_score: 0.65,
      processing_time_ms: 8000,
      cached: false,
      error_code: null,
      created_at: new Date().toISOString(),
    },
    // Failed scan
    {
      id: '6',
      user_id: 'user-5',
      session_id: 'session-5',
      tier: 2,
      success: false,
      product_id: null,
      barcode: null,
      image_hash: 'hash999',
      confidence_score: null,
      processing_time_ms: null,
      cached: false,
      error_code: 'OCR_FAILED',
      created_at: new Date().toISOString(),
    },
  ];

  const mockErrorReports = [
    {
      id: '1',
      tier: 2,
      created_at: new Date().toISOString(),
    },
    {
      id: '2',
      tier: 4,
      created_at: new Date().toISOString(),
    },
  ];

  // Mock Supabase client
  const mockSupabaseFrom = jest.fn();
  const mockSupabaseSelect = jest.fn();
  const mockSupabaseGte = jest.fn();
  const mockSupabaseLte = jest.fn();

  const mockSupabaseClient = {
    from: mockSupabaseFrom,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    mockGetSupabaseServerClient.mockReturnValue(mockSupabaseClient as any);

    // Setup query chain for scan_logs
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'scan_logs') {
        return {
          select: mockSupabaseSelect.mockReturnValue({
            gte: mockSupabaseGte.mockReturnValue({
              lte: mockSupabaseLte.mockResolvedValue({
                data: mockScanLogs,
                error: null,
              }),
            }),
          }),
        };
      } else if (table === 'error_reports') {
        return {
          select: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              lte: jest.fn().mockResolvedValue({
                data: mockErrorReports,
                error: null,
              }),
            }),
          }),
        };
      }
      return {};
    });
  });

  /**
   * Helper to create a mock NextRequest
   */
  function createMockRequest(queryParams?: Record<string, string>): NextRequest {
    const url = new URL('http://localhost:3000/api/metrics');
    if (queryParams) {
      Object.entries(queryParams).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
    }

    return new NextRequest(url, {
      method: 'GET',
    });
  }

  describe('Metrics Calculation', () => {
    it('should return metrics for all tiers', async () => {
      // Requirement 14.7: Return aggregated metrics by tier
      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.tierMetrics).toBeDefined();
      expect(data.tierMetrics[1]).toBeDefined();
      expect(data.tierMetrics[2]).toBeDefined();
      expect(data.tierMetrics[3]).toBeDefined();
      expect(data.tierMetrics[4]).toBeDefined();
    });

    it('should calculate correct tier 1 metrics', async () => {
      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      const tier1Metrics = data.tierMetrics[1];
      expect(tier1Metrics.totalScans).toBe(2);
      expect(tier1Metrics.successRate).toBe(1.0); // 2/2 successful
      expect(tier1Metrics.avgProcessingTime).toBe(300); // (100 + 500) / 2
      expect(tier1Metrics.cacheHitRate).toBe(0.5); // 1/2 cached
    });

    it('should calculate correct tier 2 metrics', async () => {
      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      const tier2Metrics = data.tierMetrics[2];
      expect(tier2Metrics.totalScans).toBe(2); // 1 success + 1 failure
      expect(tier2Metrics.successRate).toBe(0.5); // 1/2 successful
      expect(tier2Metrics.avgProcessingTime).toBe(3000); // Only successful scan counted
      expect(tier2Metrics.cacheHitRate).toBe(0); // 0/2 cached
    });

    it('should calculate correct overall metrics', async () => {
      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      const overallMetrics = data.overallMetrics;
      expect(overallMetrics.totalScans).toBe(6);
      expect(overallMetrics.successRate).toBeCloseTo(5 / 6, 2); // 5/6 successful
      expect(overallMetrics.cacheHitRate).toBeCloseTo(1 / 6, 2); // 1/6 cached
    });

    it('should calculate API usage correctly', async () => {
      // Requirement 14.7: Include API usage and cost tracking
      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      const apiUsage = data.apiUsage;
      // Tier 2 (2 total, both uncached) + Tier 4 (1 uncached) = 3 Gemini calls
      // Note: We count all Tier 2 scans (success and failure) as they both made API calls
      expect(apiUsage.geminiCalls).toBe(3);
      // Tier 3 (1 uncached) = 1 Barcode Lookup call
      expect(apiUsage.barcodeLookupCalls).toBe(1);
      // (3 * 0.001) + (1 * 0.005) = 0.008
      expect(apiUsage.estimatedCost).toBeCloseTo(0.008, 3);
    });

    it('should handle tiers with no scans', async () => {
      // Mock empty scan logs
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'scan_logs') {
          return {
            select: jest.fn().mockReturnValue({
              gte: jest.fn().mockReturnValue({
                lte: jest.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          };
        } else if (table === 'error_reports') {
          return {
            select: jest.fn().mockReturnValue({
              gte: jest.fn().mockReturnValue({
                lte: jest.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      });

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.tierMetrics[1].totalScans).toBe(0);
      expect(data.tierMetrics[1].successRate).toBe(0);
      expect(data.tierMetrics[1].avgProcessingTime).toBe(0);
      expect(data.tierMetrics[1].cacheHitRate).toBe(0);
    });
  });

  describe('Time Range Filtering', () => {
    it('should use default time range (last 24 hours)', async () => {
      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.timeRange).toBeDefined();
      expect(data.timeRange.start).toBeDefined();
      expect(data.timeRange.end).toBeDefined();

      const start = new Date(data.timeRange.start);
      const end = new Date(data.timeRange.end);
      const diff = end.getTime() - start.getTime();
      const hours = diff / (1000 * 60 * 60);

      expect(hours).toBeCloseTo(24, 0);
    });

    it('should accept custom start date', async () => {
      const startDate = new Date('2024-01-01T00:00:00Z');
      const request = createMockRequest({
        startDate: startDate.toISOString(),
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.timeRange.start).toBe(startDate.toISOString());
    });

    it('should accept custom end date', async () => {
      const endDate = new Date('2024-12-31T23:59:59Z');
      const request = createMockRequest({
        endDate: endDate.toISOString(),
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.timeRange.end).toBe(endDate.toISOString());
    });

    it('should accept both start and end dates', async () => {
      const startDate = new Date('2024-01-01T00:00:00Z');
      const endDate = new Date('2024-12-31T23:59:59Z');
      const request = createMockRequest({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.timeRange.start).toBe(startDate.toISOString());
      expect(data.timeRange.end).toBe(endDate.toISOString());
    });
  });

  describe('Error Handling', () => {
    it('should handle scan logs query error', async () => {
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'scan_logs') {
          return {
            select: jest.fn().mockReturnValue({
              gte: jest.fn().mockReturnValue({
                lte: jest.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Database error' },
                }),
              }),
            }),
          };
        }
        return {};
      });

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
      expect(data.error.message).toContain('Failed to fetch scan logs');
    });

    it('should handle error reports query error', async () => {
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'scan_logs') {
          return {
            select: jest.fn().mockReturnValue({
              gte: jest.fn().mockReturnValue({
                lte: jest.fn().mockResolvedValue({
                  data: mockScanLogs,
                  error: null,
                }),
              }),
            }),
          };
        } else if (table === 'error_reports') {
          return {
            select: jest.fn().mockReturnValue({
              gte: jest.fn().mockReturnValue({
                lte: jest.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Database error' },
                }),
              }),
            }),
          };
        }
        return {};
      });

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
      expect(data.error.message).toContain('Failed to fetch error reports');
    });

    it('should handle unexpected errors', async () => {
      mockGetSupabaseServerClient.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
      expect(data.error.message).toContain('Unexpected error');
    });
  });

  describe('Response Format', () => {
    it('should return correct response structure', async () => {
      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('timeRange');
      expect(data).toHaveProperty('tierMetrics');
      expect(data).toHaveProperty('apiUsage');
      expect(data).toHaveProperty('overallMetrics');

      expect(data.timeRange).toHaveProperty('start');
      expect(data.timeRange).toHaveProperty('end');

      expect(data.apiUsage).toHaveProperty('geminiCalls');
      expect(data.apiUsage).toHaveProperty('barcodeLookupCalls');
      expect(data.apiUsage).toHaveProperty('estimatedCost');

      expect(data.overallMetrics).toHaveProperty('totalScans');
      expect(data.overallMetrics).toHaveProperty('successRate');
      expect(data.overallMetrics).toHaveProperty('avgProcessingTime');
      expect(data.overallMetrics).toHaveProperty('cacheHitRate');
    });

    it('should return tier metrics with correct structure', async () => {
      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      const tier1Metrics = data.tierMetrics[1];
      expect(tier1Metrics).toHaveProperty('totalScans');
      expect(tier1Metrics).toHaveProperty('successRate');
      expect(tier1Metrics).toHaveProperty('avgProcessingTime');
      expect(tier1Metrics).toHaveProperty('cacheHitRate');

      expect(typeof tier1Metrics.totalScans).toBe('number');
      expect(typeof tier1Metrics.successRate).toBe('number');
      expect(typeof tier1Metrics.avgProcessingTime).toBe('number');
      expect(typeof tier1Metrics.cacheHitRate).toBe('number');
    });
  });
});
