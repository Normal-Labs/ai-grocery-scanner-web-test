/**
 * LocalStorage utilities for persisting scan history
 * 
 * This module provides functions to save, retrieve, and manage scan history
 * using browser localStorage. It enforces a 10-scan limit and handles
 * localStorage unavailability gracefully.
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.7
 */

import { AnalysisResult, SavedScan } from './types';

/**
 * LocalStorage key for storing scan history
 */
const STORAGE_KEY = 'ai-grocery-scanner:scans';

/**
 * Maximum number of scans to store
 */
const MAX_SCANS = 10;

/**
 * Check if localStorage is available
 * 
 * @returns true if localStorage is available, false otherwise
 */
function isLocalStorageAvailable(): boolean {
  try {
    const testKey = '__localStorage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Save an analysis result to localStorage
 * 
 * Stores the image data and analysis results with a timestamp.
 * Enforces a 10-scan limit by removing the oldest scan when the limit is reached.
 * Handles localStorage unavailability gracefully by logging a warning.
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.7
 * 
 * @param imageData - Base64-encoded image data
 * @param results - Analysis results from Gemini
 */
export function saveAnalysis(imageData: string, results: AnalysisResult): void {
  // Check if localStorage is available
  if (!isLocalStorageAvailable()) {
    console.warn('[Storage] localStorage unavailable. Scan not saved.');
    return;
  }

  try {
    // Get existing scans
    const existingScans = getRecentAnalyses();

    // Create new scan with timestamp
    const newScan: SavedScan = {
      timestamp: new Date().toISOString(),
      imageData,
      results,
    };

    // Add new scan to the beginning of the array
    const updatedScans = [newScan, ...existingScans];

    // Enforce 10-scan limit by keeping only the most recent 10
    const limitedScans = updatedScans.slice(0, MAX_SCANS);

    // Save to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ scans: limitedScans }));
  } catch (e) {
    // Handle quota exceeded or other localStorage errors
    console.error('[Storage] Failed to save scan:', e);
  }
}

/**
 * Retrieve recent analyses from localStorage
 * 
 * Returns an array of saved scans ordered by timestamp (most recent first).
 * Returns an empty array if localStorage is unavailable or no scans are saved.
 * 
 * Requirements: 7.5
 * 
 * @returns Array of saved scans, ordered by timestamp (most recent first)
 */
export function getRecentAnalyses(): SavedScan[] {
  // Check if localStorage is available
  if (!isLocalStorageAvailable()) {
    console.warn('[Storage] localStorage unavailable. Cannot retrieve scans.');
    return [];
  }

  try {
    // Get data from localStorage
    const data = localStorage.getItem(STORAGE_KEY);

    // Return empty array if no data exists
    if (!data) {
      return [];
    }

    // Parse and validate data
    const parsed = JSON.parse(data);

    // Validate structure
    if (!parsed || !Array.isArray(parsed.scans)) {
      console.warn('[Storage] Invalid data structure in localStorage. Returning empty array.');
      return [];
    }

    return parsed.scans;
  } catch (e) {
    // Handle JSON parse errors or other issues
    console.error('[Storage] Failed to retrieve scans:', e);
    return [];
  }
}

/**
 * Clear all saved scans from localStorage
 * 
 * Removes all scan history from localStorage.
 * Handles localStorage unavailability gracefully by logging a warning.
 * 
 * Requirements: 7.6, 7.7
 */
export function clearHistory(): void {
  // Check if localStorage is available
  if (!isLocalStorageAvailable()) {
    console.warn('[Storage] localStorage unavailable. Cannot clear history.');
    return;
  }

  try {
    // Remove the storage key
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    // Handle any errors during removal
    console.error('[Storage] Failed to clear history:', e);
  }
}
