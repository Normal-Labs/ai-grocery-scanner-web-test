/**
 * ProductHeroToggle Component
 * 
 * Developer Sandbox UI toggle for enabling/disabling Product Hero mode.
 * Displays current Product Hero status with visual indicator.
 * 
 * Requirements: 1.4, 1.5, 1.6, 1.7, 1.8
 */

'use client';

import { useProductHero } from '@/contexts/ProductHeroContext';

export default function ProductHeroToggle() {
  const { isProductHero, devOverride, setDevOverride, profileFlag, loading } = useProductHero();

  if (loading) {
    return null;
  }

  const handleToggle = () => {
    if (devOverride === null) {
      // Enable dev override (opposite of profile flag)
      setDevOverride(!profileFlag);
    } else {
      // Toggle dev override
      setDevOverride(!devOverride);
    }
  };

  const handleReset = () => {
    // Reset to profile flag
    setDevOverride(null);
  };

  return (
    <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border-2 border-green-200">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-lg" role="img" aria-label="product hero">
              🦸
            </span>
            <h3 className="font-semibold text-gray-800">Product Hero Mode</h3>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Guided multi-image capture workflow
          </p>
        </div>

        {/* Toggle Switch */}
        <div className="flex items-center gap-3">
          <span
            className={`text-sm font-medium ${
              !isProductHero ? 'text-gray-900' : 'text-gray-500'
            }`}
          >
            Off
          </span>
          
          <button
            onClick={handleToggle}
            className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
              isProductHero ? 'bg-green-600' : 'bg-gray-300'
            }`}
            role="switch"
            aria-checked={isProductHero}
            aria-label="Toggle Product Hero mode"
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                isProductHero ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>

          <span
            className={`text-sm font-medium ${
              isProductHero ? 'text-green-900' : 'text-gray-500'
            }`}
          >
            On
          </span>
        </div>
      </div>

      {/* Current Status */}
      <div className="mt-3 pt-3 border-t border-green-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                isProductHero
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {isProductHero ? '🦸 Product Hero' : '👤 Regular User'}
            </span>
            <span className="text-xs text-gray-600">
              {isProductHero
                ? 'Guided capture: Barcode → Packaging → Nutrition'
                : 'Progressive capture: Add images incrementally'}
            </span>
          </div>

          {/* Reset button if dev override is active */}
          {devOverride !== null && (
            <button
              onClick={handleReset}
              className="text-xs text-green-600 hover:text-green-700 font-medium"
              title="Reset to profile setting"
            >
              Reset
            </button>
          )}
        </div>

        {/* Show source of current status */}
        <div className="mt-2 text-xs text-gray-500">
          {devOverride !== null ? (
            <span>
              ⚙️ Dev Override Active (Profile: {profileFlag ? 'Hero' : 'Regular'})
            </span>
          ) : (
            <span>
              📋 Using Profile Setting ({profileFlag ? 'Hero' : 'Regular'})
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
