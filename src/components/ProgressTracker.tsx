/**
 * ProgressTracker Component
 * 
 * Displays live thought stream during Research Agent reasoning and scan progress.
 * Shows current step with animation and step history.
 * Enhanced to support scan-specific progress stages, partial results, timeout warnings, and retry functionality.
 * 
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 4.1, 4.2, 4.3, 4.5, 4.7, 5.1, 5.3, 5.4
 */

'use client';

import { useEffect, useState } from 'react';
import type { ProgressStep } from '@/lib/types';

interface ProgressTrackerProps {
  steps: ProgressStep[];
  isActive: boolean;
  partialResult?: any;
  onRetry?: () => void;
  error?: string | null;
  timeoutWarning?: boolean;
}

/**
 * Map step types to display information
 * Includes both Research Agent steps and Scan progress stages
 */
const STEP_INFO: Record<
  string,
  { icon: string; color: string; bgColor: string }
> = {
  // Research Agent steps
  search: {
    icon: '🔍',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50 border-blue-200',
  },
  scrape: {
    icon: '📄',
    color: 'text-purple-700',
    bgColor: 'bg-purple-50 border-purple-200',
  },
  synthesis: {
    icon: '🧠',
    color: 'text-green-700',
    bgColor: 'bg-green-50 border-green-200',
  },
  complete: {
    icon: '✅',
    color: 'text-gray-700',
    bgColor: 'bg-gray-50 border-gray-200',
  },
  // Scan progress stages
  barcode_check: {
    icon: '🔍',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50 border-blue-200',
  },
  cache_check: {
    icon: '💾',
    color: 'text-purple-700',
    bgColor: 'bg-purple-50 border-purple-200',
  },
  database_check: {
    icon: '🗄️',
    color: 'text-green-700',
    bgColor: 'bg-green-50 border-green-200',
  },
  ai_research: {
    icon: '🤖',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50 border-orange-200',
  },
  product_identification: {
    icon: '🏷️',
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-50 border-indigo-200',
  },
  // Multi-tier stages
  tier1: {
    icon: '⚡',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50 border-blue-200',
  },
  tier2: {
    icon: '📝',
    color: 'text-purple-700',
    bgColor: 'bg-purple-50 border-purple-200',
  },
  tier3: {
    icon: '🔎',
    color: 'text-green-700',
    bgColor: 'bg-green-50 border-green-200',
  },
  tier4: {
    icon: '🤖',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50 border-orange-200',
  },
  tier_transition: {
    icon: '🔄',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-50 border-yellow-200',
  },
  // Dimension analysis stages
  dimension_health: {
    icon: '🏥',
    color: 'text-red-700',
    bgColor: 'bg-red-50 border-red-200',
  },
  dimension_preservatives: {
    icon: '🧪',
    color: 'text-pink-700',
    bgColor: 'bg-pink-50 border-pink-200',
  },
  dimension_allergies: {
    icon: '⚠️',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50 border-amber-200',
  },
  dimension_sustainability: {
    icon: '🌱',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50 border-emerald-200',
  },
  dimension_carbon: {
    icon: '🌍',
    color: 'text-teal-700',
    bgColor: 'bg-teal-50 border-teal-200',
  },
};

export default function ProgressTracker({ 
  steps, 
  isActive, 
  partialResult, 
  onRetry, 
  error,
  timeoutWarning 
}: ProgressTrackerProps) {
  const [showHistory, setShowHistory] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  // Get current step (last step in array)
  const currentStep = steps[steps.length - 1];

  // Trigger fade out when complete
  useEffect(() => {
    if (currentStep?.type === 'complete' && !isActive) {
      const timer = setTimeout(() => {
        setFadeOut(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [currentStep, isActive]);

  // Don't render if no steps and no error
  if (steps.length === 0 && !error) {
    return null;
  }

  // Don't render if faded out
  if (fadeOut) {
    return null;
  }

  const stepInfo = currentStep ? STEP_INFO[currentStep.type] : null;

  return (
    <div
      className={`bg-white rounded-lg shadow-lg border-2 overflow-hidden transition-all duration-500 ${
        fadeOut ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
      }`}
    >
      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border-b-2 border-red-200">
          <div className="flex items-start gap-3">
            <span className="text-2xl" role="img" aria-label="error">
              ❌
            </span>
            <div className="flex-1">
              <p className="font-medium text-red-700">Error</p>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
          </div>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-3 w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
            >
              Retry Scan
            </button>
          )}
        </div>
      )}

      {/* Timeout Warning */}
      {timeoutWarning && !error && (
        <div className="p-4 bg-yellow-50 border-b-2 border-yellow-200">
          <div className="flex items-start gap-3">
            <span className="text-2xl" role="img" aria-label="warning">
              ⏱️
            </span>
            <div className="flex-1">
              <p className="font-medium text-yellow-700">Taking longer than expected</p>
              <p className="text-sm text-yellow-600 mt-1">
                The scan is taking longer than usual. Please wait while we complete the analysis...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Partial Result Display */}
      {partialResult && (
        <div className="p-4 bg-indigo-50 border-b-2 border-indigo-200">
          <div className="flex items-start gap-3">
            <span className="text-2xl" role="img" aria-label="partial result">
              📦
            </span>
            <div className="flex-1">
              <p className="font-medium text-indigo-700">Product Identified</p>
              {partialResult.productName && (
                <p className="text-sm text-indigo-600 mt-1 font-semibold">
                  {partialResult.productName}
                </p>
              )}
              {partialResult.brand && (
                <p className="text-xs text-indigo-500 mt-1">
                  Brand: {partialResult.brand}
                </p>
              )}
              <p className="text-xs text-indigo-500 mt-2">
                Analyzing dimensions...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Current Step Display */}
      {currentStep && stepInfo && !error && (
        <div className={`p-4 border-b-2 ${stepInfo.bgColor}`}>
          <div className="flex items-start gap-3">
            {/* Animated Icon */}
            <div className="flex-shrink-0">
              <span
                className={`text-2xl inline-block ${
                  isActive ? 'animate-pulse' : ''
                }`}
                role="img"
                aria-label={currentStep.type}
              >
                {stepInfo.icon}
              </span>
            </div>

            {/* Message */}
            <div className="flex-1 min-w-0">
              <p className={`font-medium ${stepInfo.color}`}>
                {currentStep.message}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {new Date(currentStep.timestamp).toLocaleTimeString()}
              </p>
            </div>

            {/* Loading Spinner */}
            {isActive && currentStep.type !== 'complete' && (
              <div className="flex-shrink-0">
                <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step History (Collapsible) */}
      {steps.length > 1 && (
        <div className="border-t border-gray-200">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors flex items-center justify-between"
          >
            <span>
              {showHistory ? 'Hide' : 'Show'} step history ({steps.length - 1} previous)
            </span>
            <span className={`transform transition-transform ${showHistory ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </button>

          {showHistory && (
            <div className="px-4 pb-4 space-y-2 max-h-48 overflow-y-auto">
              {steps.slice(0, -1).map((step, index) => {
                const info = STEP_INFO[step.type];
                return (
                  <div
                    key={`${step.timestamp}-${index}`}
                    className="flex items-start gap-2 text-sm py-2 border-l-2 border-gray-200 pl-3"
                  >
                    <span className="text-base flex-shrink-0" role="img" aria-label={step.type}>
                      {info.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-700">{step.message}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(step.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Progress Bar */}
      {isActive && currentStep?.type !== 'complete' && (
        <div className="h-1 bg-gray-200">
          <div className="h-full bg-blue-600 animate-pulse" style={{ width: '60%' }} />
        </div>
      )}
    </div>
  );
}
