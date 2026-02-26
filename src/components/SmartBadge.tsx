/**
 * SmartBadge Component
 * 
 * Displays dimension analysis with color-coded visual indicator based on score.
 * Shows dimension icon, name, score, and explanation.
 * Supports loading state and locked indicator for unavailable dimensions.
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7
 */

import { useState } from 'react';
import { DimensionScore } from '@/lib/types/dimension-analysis';

export type DimensionName = 
  | 'health' 
  | 'processing' 
  | 'allergens' 
  | 'responsiblyProduced' 
  | 'environmentalImpact';

interface SmartBadgeProps {
  dimension: DimensionName;
  score?: DimensionScore;
  loading?: boolean;
  locked?: boolean;
  onTap?: () => void;
}

/**
 * Determines the color scheme based on score (0-100)
 * Requirement 9.2: Color coding
 * - Red: 0-33 (poor)
 * - Yellow: 34-66 (fair)
 * - Green: 67-100 (good)
 */
function getScoreColor(score: number): string {
  if (score >= 67) {
    return 'bg-green-100 border-green-500 text-green-900';
  } else if (score >= 34) {
    return 'bg-yellow-100 border-yellow-500 text-yellow-900';
  } else {
    return 'bg-red-100 border-red-500 text-red-900';
  }
}

/**
 * Returns the appropriate icon for each dimension
 * Requirement 9.1: Display dimension name and score
 */
function getDimensionIcon(dimension: DimensionName): string {
  switch (dimension) {
    case 'health':
      return '❤️'; // Heart icon for health
    case 'processing':
      return '🧪'; // Flask icon for processing
    case 'allergens':
      return '⚠️'; // Warning icon for allergens
    case 'responsiblyProduced':
      return '🌿'; // Leaf icon for responsible production
    case 'environmentalImpact':
      return '🌍'; // Earth icon for environmental impact
    default:
      return '📋'; // Fallback icon
  }
}

/**
 * Returns the display name for each dimension
 * Requirement 9.1: Display dimension name
 */
function getDimensionName(dimension: DimensionName): string {
  switch (dimension) {
    case 'health':
      return 'Health';
    case 'processing':
      return 'Processing and Preservatives';
    case 'allergens':
      return 'Allergens';
    case 'responsiblyProduced':
      return 'Responsibly Produced';
    case 'environmentalImpact':
      return 'Environmental Impact';
    default:
      return dimension;
  }
}

/**
 * Convert score (0-100) to rating label
 */
function getScoreLabel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 67) return 'Good';
  if (score >= 50) return 'Fair';
  if (score >= 34) return 'Poor';
  return 'Very Poor';
}

export default function SmartBadge({ 
  dimension, 
  score, 
  loading = false, 
  locked = false,
  onTap,
}: SmartBadgeProps) {
  const [expanded, setExpanded] = useState(false);
  
  const icon = getDimensionIcon(dimension);
  const dimensionName = getDimensionName(dimension);

  // Requirement 9.5: Show loading state during analysis
  if (loading) {
    return (
      <div
        className="bg-gray-100 border-gray-300 border-l-4 rounded-lg p-4 mb-3 shadow-sm"
        role="article"
        aria-label={`${dimensionName} insight loading`}
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl" role="img" aria-label={dimensionName}>
            {icon}
          </span>
          <h3 className="font-semibold text-lg text-gray-700">
            {dimensionName}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <div className="animate-spin h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full"></div>
          <span className="text-sm text-gray-600">Analyzing...</span>
        </div>
      </div>
    );
  }

  // Requirement 9.6: Show locked indicator for unavailable dimensions (free tier)
  if (locked || !score || !score.available) {
    return (
      <div
        className="bg-gray-100 border-gray-400 border-l-4 rounded-lg p-4 mb-3 shadow-sm opacity-60"
        role="article"
        aria-label={`${dimensionName} insight locked`}
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl" role="img" aria-label={dimensionName}>
            {icon}
          </span>
          <h3 className="font-semibold text-lg text-gray-700">
            {dimensionName}
          </h3>
          <span className="ml-auto text-xl">🔒</span>
        </div>
        <p className="text-sm text-gray-600">
          Upgrade to Premium to unlock this dimension
        </p>
      </div>
    );
  }

  // Requirement 9.7: Handle missing or incomplete dimension data
  if (!score.score && score.score !== 0) {
    return (
      <div
        className="bg-gray-100 border-gray-300 border-l-4 rounded-lg p-4 mb-3 shadow-sm"
        role="article"
        aria-label={`${dimensionName} insight unavailable`}
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl" role="img" aria-label={dimensionName}>
            {icon}
          </span>
          <h3 className="font-semibold text-lg text-gray-700">
            {dimensionName}
          </h3>
        </div>
        <p className="text-sm text-gray-600">
          Data unavailable
        </p>
      </div>
    );
  }

  const colorClasses = getScoreColor(score.score);
  const scoreLabel = getScoreLabel(score.score);

  const handleClick = () => {
    if (onTap) {
      onTap();
    }
    setExpanded(!expanded);
  };

  return (
    <div
      className={`
        ${colorClasses}
        border-l-4 rounded-lg p-4 mb-3
        shadow-sm
        transition-all duration-200
        hover:shadow-md
        ${onTap || score.explanation ? 'cursor-pointer' : ''}
      `}
      role="article"
      aria-label={`${dimensionName} insight`}
      onClick={handleClick}
    >
      {/* Header with icon and dimension name */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl" role="img" aria-label={dimensionName}>
          {icon}
        </span>
        <h3 className="font-semibold text-lg">
          {dimensionName}
        </h3>
      </div>

      {/* Score and label - Requirement 9.1, 9.2 */}
      <div className="mb-2">
        <span className="font-bold text-base">
          {scoreLabel} ({score.score}/100)
        </span>
      </div>

      {/* Explanation - Requirement 9.3 */}
      {score.explanation && (
        <p className="text-sm leading-relaxed mb-2">
          {score.explanation}
        </p>
      )}

      {/* Key Factors - Requirement 9.4: Tap interaction for detailed explanations */}
      {expanded && score.keyFactors && score.keyFactors.length > 0 && (
        <div className="mt-3 pt-3 border-t border-current border-opacity-20">
          <h4 className="font-semibold text-sm mb-2">Key Factors:</h4>
          <ul className="list-disc list-inside text-sm space-y-1">
            {score.keyFactors.map((factor, index) => (
              <li key={index}>{factor}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Expand indicator */}
      {score.keyFactors && score.keyFactors.length > 0 && (
        <div className="text-center mt-2 text-xs opacity-60">
          {expanded ? '▲ Tap to collapse' : '▼ Tap for details'}
        </div>
      )}
    </div>
  );
}
