/**
 * ProductHeroContext - Product Hero Role Provider
 * 
 * Manages Product Hero role flag from Supabase Auth metadata and provides
 * a development override toggle for testing. Product Heroes get access to
 * the guided multi-image capture workflow.
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.5, 1.6, 1.7
 */

'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';

/**
 * Product Hero context value interface
 */
interface ProductHeroContextValue {
  /** Computed Product Hero status (from profile or dev override) */
  isProductHero: boolean;
  /** Development override toggle state (null = use profile flag) */
  devOverride: boolean | null;
  /** Set development override (persists to localStorage) */
  setDevOverride: (enabled: boolean | null) => void;
  /** Profile flag from Supabase Auth metadata */
  profileFlag: boolean;
  /** Whether the context is initialized */
  loading: boolean;
}

/**
 * Create context with undefined default
 */
const ProductHeroContext = createContext<ProductHeroContextValue | undefined>(undefined);

/**
 * LocalStorage key for dev override
 */
const PRODUCT_HERO_OVERRIDE_KEY = 'ai-grocery-scanner:product-hero-override';

/**
 * ProductHeroProvider component
 * 
 * Wraps the application and provides Product Hero role management.
 * Reads product_hero flag from Supabase Auth user metadata and supports
 * development override toggle for testing.
 * 
 * Requirements:
 * - 1.1: Store Product_Hero flag in user profile
 * - 1.2: Retrieve Product_Hero flag from Supabase Auth
 * - 1.3: Expose Product_Hero status to capture workflow logic
 * - 1.5: Development toggle overrides profile flag when enabled
 * - 1.6: Use profile flag when development toggle disabled
 * - 1.7: Persist development toggle state in localStorage
 */
export function ProductHeroProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [profileFlag, setProfileFlag] = useState<boolean>(false);
  const [devOverride, setDevOverrideState] = useState<boolean | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  /**
   * Initialize dev override from localStorage on mount
   * Requirement 1.7: Persist development toggle state in localStorage
   */
  useEffect(() => {
    try {
      const saved = localStorage.getItem(PRODUCT_HERO_OVERRIDE_KEY);
      if (saved !== null) {
        setDevOverrideState(JSON.parse(saved));
      }
    } catch (error) {
      console.warn('Failed to load Product Hero override from localStorage:', error);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  /**
   * Read Product Hero flag from Supabase Auth metadata when user changes
   * Requirements: 1.1, 1.2
   */
  useEffect(() => {
    if (user?.user_metadata) {
      const flag = user.user_metadata.product_hero === true;
      setProfileFlag(flag);
      console.log('[ProductHeroContext] Profile flag loaded:', flag);
    } else {
      setProfileFlag(false);
    }
  }, [user]);

  /**
   * Update dev override and persist to localStorage
   * Requirement 1.7: Persist development toggle state in localStorage
   */
  const setDevOverride = (enabled: boolean | null) => {
    setDevOverrideState(enabled);
    
    try {
      if (enabled === null) {
        localStorage.removeItem(PRODUCT_HERO_OVERRIDE_KEY);
      } else {
        localStorage.setItem(PRODUCT_HERO_OVERRIDE_KEY, JSON.stringify(enabled));
      }
      console.log('[ProductHeroContext] Dev override updated:', enabled);
    } catch (error) {
      console.warn('Failed to save Product Hero override to localStorage:', error);
    }
  };

  /**
   * Compute final Product Hero status
   * Requirements: 1.5, 1.6
   * - 1.5: Development toggle overrides profile flag when enabled
   * - 1.6: Use profile flag when development toggle disabled (null)
   */
  const isProductHero = devOverride ?? profileFlag;

  /**
   * Context value
   * Requirement 1.3: Expose Product_Hero status to capture workflow logic
   */
  const value: ProductHeroContextValue = {
    isProductHero,
    devOverride,
    setDevOverride,
    profileFlag,
    loading: authLoading || !isInitialized,
  };

  // Don't render children until initialized to prevent hydration mismatch
  if (!isInitialized || authLoading) {
    return null;
  }

  return (
    <ProductHeroContext.Provider value={value}>
      {children}
    </ProductHeroContext.Provider>
  );
}

/**
 * Hook to access Product Hero context
 * 
 * @throws Error if used outside ProductHeroProvider
 */
export function useProductHero(): ProductHeroContextValue {
  const context = useContext(ProductHeroContext);
  
  if (context === undefined) {
    throw new Error('useProductHero must be used within a ProductHeroProvider');
  }
  
  return context;
}
