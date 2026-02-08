/**
 * DimensionSelector Component
 * 
 * Allows Free tier users to select a single insight dimension for analysis.
 * Displays radio button group with all five dimension options.
 * 
 * Requirements: 11.2
 */

'use client';

import type { InsightCategory } from '@/lib/types';

interface DimensionSelectorProps {
  selectedDimension: InsightCategory | null;
  onDimensionChange: (dimension: InsightCategory) => void;
  disabled?: boolean;
}

/**
 * Dimension metadata for display
 */
const DIMENSIONS: Array<{
  value: InsightCategory;
  label: string;
  icon: string;
  description: string;
}> = [
  {
    value: 'health',
    label: 'Health',
    icon: '❤️',
    description: 'Nutritional quality and health impact',
  },
  {
    value: 'sustainability',
    label: 'Sustainability',
    icon: '🌱',
    description: 'Responsible production practices',
  },
  {
    value: 'carbon',
    label: 'Carbon Impact',
    icon: '🌍',
    description: 'Environmental footprint',
  },
  {
    value: 'preservatives',
    label: 'Preservatives',
    icon: '🧪',
    description: 'Artificial preservatives and additives',
  },
  {
    value: 'allergies',
    label: 'Allergies',
    icon: '⚠️',
    description: 'Common allergens present',
  },
];

export default function DimensionSelector({
  selectedDimension,
  onDimensionChange,
  disabled = false,
}: DimensionSelectorProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
      <div className="mb-3">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <span role="img" aria-label="select">
            🎯
          </span>
          Select Analysis Dimension
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Free tier: Choose one dimension to analyze
        </p>
      </div>

      <div className="space-y-2">
        {DIMENSIONS.map((dimension) => (
          <label
            key={dimension.value}
            className={`flex items-start gap-3 p-3 rounded-lg border-2 transition-all cursor-pointer min-h-[44px] ${
              selectedDimension === dimension.value
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <input
              type="radio"
              name="dimension"
              value={dimension.value}
              checked={selectedDimension === dimension.value}
              onChange={() => onDimensionChange(dimension.value)}
              disabled={disabled}
              className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-lg" role="img" aria-label={dimension.label}>
                  {dimension.icon}
                </span>
                <span className="font-medium text-gray-900">
                  {dimension.label}
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-0.5">
                {dimension.description}
              </p>
            </div>
          </label>
        ))}
      </div>

      {!selectedDimension && (
        <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
          Please select a dimension to continue
        </div>
      )}
    </div>
  );
}
