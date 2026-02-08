/**
 * TierToggle Component
 * 
 * Developer Sandbox UI toggle for switching between Free and Premium tiers.
 * Displays current tier status with visual indicator.
 * 
 * Requirements: 11.8
 */

'use client';

import type { TierType } from '@/lib/types';

interface TierToggleProps {
  currentTier: TierType;
  onTierChange: (tier: TierType) => void;
}

export default function TierToggle({ currentTier, onTierChange }: TierToggleProps) {
  return (
    <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 border-2 border-purple-200">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-lg" role="img" aria-label="developer">
              🔧
            </span>
            <h3 className="font-semibold text-gray-800">Developer Sandbox</h3>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Test Free and Premium tier features
          </p>
        </div>

        {/* Toggle Switch */}
        <div className="flex items-center gap-3">
          <span
            className={`text-sm font-medium ${
              currentTier === 'free' ? 'text-gray-900' : 'text-gray-500'
            }`}
          >
            Free
          </span>
          
          <button
            onClick={() => onTierChange(currentTier === 'free' ? 'premium' : 'free')}
            className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
              currentTier === 'premium' ? 'bg-purple-600' : 'bg-gray-300'
            }`}
            role="switch"
            aria-checked={currentTier === 'premium'}
            aria-label="Toggle between Free and Premium tier"
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                currentTier === 'premium' ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>

          <span
            className={`text-sm font-medium ${
              currentTier === 'premium' ? 'text-purple-900' : 'text-gray-500'
            }`}
          >
            Premium
          </span>
        </div>
      </div>

      {/* Current Tier Status */}
      <div className="mt-3 pt-3 border-t border-purple-200">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              currentTier === 'premium'
                ? 'bg-purple-100 text-purple-800'
                : 'bg-gray-100 text-gray-800'
            }`}
          >
            {currentTier === 'premium' ? '⭐ Premium' : '🆓 Free'}
          </span>
          <span className="text-xs text-gray-600">
            {currentTier === 'premium'
              ? 'All dimensions • Batch scanning • Tool-calling enabled'
              : 'Single dimension • Single product • No tool-calling'}
          </span>
        </div>
      </div>
    </div>
  );
}
