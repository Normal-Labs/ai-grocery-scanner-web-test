/**
 * ProgressTracker Component
 * 
 * Displays live thought stream during Research Agent reasoning.
 * Shows current step with animation and step history.
 * 
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7
 */

'use client';

import { useEffect, useState } from 'react';
import type { ProgressStep } from '@/lib/types';

interface ProgressTrackerProps {
  steps: ProgressStep[];
  isActive: boolean;
}

/**
 * Map step types to display information
 */
const STEP_INFO: Record<
  ProgressStep['type'],
  { icon: string; color: string; bgColor: string }
> = {
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
};

export default function ProgressTracker({ steps, isActive }: ProgressTrackerProps) {
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

  // Don't render if no steps
  if (steps.length === 0) {
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
      {/* Current Step Display */}
      {currentStep && stepInfo && (
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
                    key={step.timestamp}
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
