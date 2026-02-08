/**
 * TierContext - Access Control Provider
 * 
 * Manages tier-based access control (Free/Premium/Developer Sandbox)
 * and persists tier preferences to localStorage.
 * 
 * Requirements: 11.1, 11.8, 11.9, 11.10
 */

'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { TierType, InsightCategory } from '@/lib/types';

/**
 * Tier context value interface
 */
interface TierContextValue {
  tier: TierType;
  setTier: (tier: TierType) => void;
  selectedDimension: InsightCategory | null;
  setSelectedDimension: (dimension: InsightCategory | null) => void;
  canUseBatchScanning: boolean;
  canUseToolCalling: boolean;
  canAnalyzeAllDimensions: boolean;
}

/**
 * Create context with undefined default
 */
const TierContext = createContext<TierContextValue | undefined>(undefined);

/**
 * LocalStorage keys
 */
const TIER_STORAGE_KEY = 'ai-grocery-scanner:tier';
const DIMENSION_STORAGE_KEY = 'ai-grocery-scanner:dimension';

/**
 * TierProvider component
 * 
 * Wraps the application and provides tier-based access control.
 * Persists tier and dimension preferences to localStorage.
 */
export function TierProvider({ children }: { children: ReactNode }) {
  const [tier, setTierState] = useState<TierType>('free');
  const [selectedDimension, setSelectedDimensionState] = useState<InsightCategory | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  /**
   * Initialize tier and dimension from localStorage on mount
   * Requirements: 11.9
   */
  useEffect(() => {
    try {
      // Load tier preference
      const savedTier = localStorage.getItem(TIER_STORAGE_KEY);
      if (savedTier === 'free' || savedTier === 'premium') {
        setTierState(savedTier);
      }

      // Load dimension preference (for free tier)
      const savedDimension = localStorage.getItem(DIMENSION_STORAGE_KEY);
      if (savedDimension) {
        setSelectedDimensionState(savedDimension as InsightCategory);
      }
    } catch (error) {
      console.warn('Failed to load tier preferences from localStorage:', error);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  /**
   * Update tier and persist to localStorage
   * Requirements: 11.8, 11.9
   */
  const setTier = (newTier: TierType) => {
    setTierState(newTier);
    
    try {
      localStorage.setItem(TIER_STORAGE_KEY, newTier);
      
      // Clear dimension selection when switching to premium
      if (newTier === 'premium') {
        setSelectedDimensionState(null);
        localStorage.removeItem(DIMENSION_STORAGE_KEY);
      }
    } catch (error) {
      console.warn('Failed to save tier preference to localStorage:', error);
    }
  };

  /**
   * Update selected dimension and persist to localStorage
   * Requirements: 11.2, 11.9
   */
  const setSelectedDimension = (dimension: InsightCategory | null) => {
    setSelectedDimensionState(dimension);
    
    try {
      if (dimension) {
        localStorage.setItem(DIMENSION_STORAGE_KEY, dimension);
      } else {
        localStorage.removeItem(DIMENSION_STORAGE_KEY);
      }
    } catch (error) {
      console.warn('Failed to save dimension preference to localStorage:', error);
    }
  };

  /**
   * Computed feature flags based on tier
   * Requirements: 11.3, 11.4, 11.5, 11.6, 11.7
   */
  const canUseBatchScanning = tier === 'premium';
  const canUseToolCalling = tier === 'premium';
  const canAnalyzeAllDimensions = tier === 'premium';

  /**
   * Context value
   */
  const value: TierContextValue = {
    tier,
    setTier,
    selectedDimension,
    setSelectedDimension,
    canUseBatchScanning,
    canUseToolCalling,
    canAnalyzeAllDimensions,
  };

  // Don't render children until initialized to prevent hydration mismatch
  if (!isInitialized) {
    return null;
  }

  return (
    <TierContext.Provider value={value}>
      {children}
    </TierContext.Provider>
  );
}

/**
 * Hook to access tier context
 * 
 * @throws Error if used outside TierProvider
 */
export function useTierContext(): TierContextValue {
  const context = useContext(TierContext);
  
  if (context === undefined) {
    throw new Error('useTierContext must be used within a TierProvider');
  }
  
  return context;
}
