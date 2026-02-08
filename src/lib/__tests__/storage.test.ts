/**
 * Unit tests for storage utilities
 * 
 * Tests the localStorage persistence functions including save, retrieve,
 * and clear operations, as well as the 10-scan limit enforcement.
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7
 */

import { saveAnalysis, getRecentAnalyses, clearHistory } from '../storage';
import { AnalysisResult, SavedScan } from '../types';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

// Replace global localStorage with mock
Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('storage utilities', () => {
  // Sample test data
  const mockImageData = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
  const mockResults: AnalysisResult = {
    products: [
      {
        productName: 'Test Product',
        insights: {
          health: { rating: 'Good', explanation: 'Healthy product' },
          sustainability: { rating: 'Yes', explanation: 'Sustainably produced' },
          carbon: { rating: 'Low', explanation: 'Low carbon footprint' },
          preservatives: { rating: 'None', explanation: 'No preservatives' },
          allergies: { rating: 'None detected', explanation: 'No common allergens' },
        },
      },
    ],
  };

  beforeEach(() => {
    // Clear localStorage before each test
    localStorageMock.clear();
  });

  describe('saveAnalysis', () => {
    it('should save a scan to localStorage', () => {
      saveAnalysis(mockImageData, mockResults);

      const scans = getRecentAnalyses();
      expect(scans).toHaveLength(1);
      expect(scans[0].imageData).toBe(mockImageData);
      expect(scans[0].results).toEqual(mockResults);
      expect(scans[0].timestamp).toBeDefined();
    });

    it('should save scans with ISO 8601 timestamp', () => {
      saveAnalysis(mockImageData, mockResults);

      const scans = getRecentAnalyses();
      const timestamp = scans[0].timestamp;
      
      // Verify ISO 8601 format
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      
      // Verify it's a valid date
      expect(new Date(timestamp).toISOString()).toBe(timestamp);
    });

    it('should add new scans to the beginning of the array', () => {
      saveAnalysis(mockImageData, mockResults);
      
      const mockImageData2 = 'data:image/jpeg;base64,DIFFERENT==';
      saveAnalysis(mockImageData2, mockResults);

      const scans = getRecentAnalyses();
      expect(scans).toHaveLength(2);
      expect(scans[0].imageData).toBe(mockImageData2); // Most recent first
      expect(scans[1].imageData).toBe(mockImageData);
    });
  });

  describe('10-scan limit enforcement', () => {
    it('should enforce 10-scan limit by removing oldest scans', () => {
      // Save 15 scans
      for (let i = 0; i < 15; i++) {
        const imageData = `data:image/jpeg;base64,IMAGE${i}==`;
        saveAnalysis(imageData, mockResults);
      }

      const scans = getRecentAnalyses();
      
      // Should only have 10 scans
      expect(scans).toHaveLength(10);
      
      // Most recent scan should be IMAGE14 (0-indexed, so 14 is the 15th)
      expect(scans[0].imageData).toBe('data:image/jpeg;base64,IMAGE14==');
      
      // Oldest scan should be IMAGE5 (15 - 10 = 5)
      expect(scans[9].imageData).toBe('data:image/jpeg;base64,IMAGE5==');
    });

    it('should maintain correct order after reaching limit', () => {
      // Save 12 scans
      for (let i = 0; i < 12; i++) {
        const imageData = `data:image/jpeg;base64,SCAN${i}==`;
        saveAnalysis(imageData, mockResults);
      }

      const scans = getRecentAnalyses();
      
      // Verify scans are in reverse chronological order
      expect(scans[0].imageData).toBe('data:image/jpeg;base64,SCAN11==');
      expect(scans[9].imageData).toBe('data:image/jpeg;base64,SCAN2==');
    });
  });

  describe('getRecentAnalyses', () => {
    it('should return empty array when no scans exist', () => {
      const scans = getRecentAnalyses();
      expect(scans).toEqual([]);
    });

    it('should retrieve all saved scans', () => {
      saveAnalysis(mockImageData, mockResults);
      saveAnalysis('data:image/jpeg;base64,SECOND==', mockResults);

      const scans = getRecentAnalyses();
      expect(scans).toHaveLength(2);
    });

    it('should return scans in reverse chronological order', () => {
      const imageData1 = 'data:image/jpeg;base64,FIRST==';
      const imageData2 = 'data:image/jpeg;base64,SECOND==';
      const imageData3 = 'data:image/jpeg;base64,THIRD==';

      saveAnalysis(imageData1, mockResults);
      saveAnalysis(imageData2, mockResults);
      saveAnalysis(imageData3, mockResults);

      const scans = getRecentAnalyses();
      expect(scans[0].imageData).toBe(imageData3); // Most recent
      expect(scans[1].imageData).toBe(imageData2);
      expect(scans[2].imageData).toBe(imageData1); // Oldest
    });

    it('should handle invalid data structure gracefully', () => {
      // Manually set invalid data
      localStorage.setItem('ai-grocery-scanner:scans', '{"invalid": "structure"}');

      const scans = getRecentAnalyses();
      expect(scans).toEqual([]);
    });

    it('should handle corrupted JSON gracefully', () => {
      // Manually set corrupted JSON
      localStorage.setItem('ai-grocery-scanner:scans', '{invalid json}');

      const scans = getRecentAnalyses();
      expect(scans).toEqual([]);
    });
  });

  describe('clearHistory', () => {
    it('should remove all saved scans', () => {
      // Save some scans
      saveAnalysis(mockImageData, mockResults);
      saveAnalysis('data:image/jpeg;base64,SECOND==', mockResults);

      // Verify scans exist
      expect(getRecentAnalyses()).toHaveLength(2);

      // Clear history
      clearHistory();

      // Verify scans are gone
      expect(getRecentAnalyses()).toEqual([]);
    });

    it('should not throw error when clearing empty history', () => {
      expect(() => clearHistory()).not.toThrow();
    });
  });

  describe('localStorage unavailability', () => {
    let originalLocalStorage: Storage;

    beforeEach(() => {
      // Save original localStorage
      originalLocalStorage = global.localStorage;
    });

    afterEach(() => {
      // Restore original localStorage
      Object.defineProperty(global, 'localStorage', {
        value: originalLocalStorage,
        writable: true,
      });
    });

    it('should handle localStorage unavailability in saveAnalysis', () => {
      // Mock localStorage to throw error
      Object.defineProperty(global, 'localStorage', {
        value: {
          setItem: () => {
            throw new Error('localStorage unavailable');
          },
          getItem: () => null,
          removeItem: () => {},
        },
        writable: true,
      });

      // Should not throw error
      expect(() => saveAnalysis(mockImageData, mockResults)).not.toThrow();
    });

    it('should handle localStorage unavailability in getRecentAnalyses', () => {
      // Mock localStorage to throw error
      Object.defineProperty(global, 'localStorage', {
        value: {
          getItem: () => {
            throw new Error('localStorage unavailable');
          },
          setItem: () => {},
          removeItem: () => {},
        },
        writable: true,
      });

      // Should return empty array
      const scans = getRecentAnalyses();
      expect(scans).toEqual([]);
    });

    it('should handle localStorage unavailability in clearHistory', () => {
      // Mock localStorage to throw error
      Object.defineProperty(global, 'localStorage', {
        value: {
          removeItem: () => {
            throw new Error('localStorage unavailable');
          },
          getItem: () => null,
          setItem: () => {},
        },
        writable: true,
      });

      // Should not throw error
      expect(() => clearHistory()).not.toThrow();
    });
  });
});
