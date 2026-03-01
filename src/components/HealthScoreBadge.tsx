/**
 * HealthScoreBadge Component
 * 
 * Displays health score with color coding and optional explanation.
 * Supports multiple size variants for different contexts.
 * 
 * Requirements: 7.1
 */

import React from 'react';

export type HealthScoreCategory = 'excellent' | 'good' | 'fair' | 'poor' | 'very_poor';

export interface HealthScoreBadgeProps {
  /** Health score value (0-100) */
  score: number;
  
  /** Score category for color coding */
  category: HealthScoreCategory;
  
  /** Optional explanation text */
  explanation?: string;
  
  /** Size variant */
  size?: 'small' | 'medium' | 'large';
  
  /** Whether to show the explanation */
  showExplanation?: boolean;
  
  /** Additional CSS classes */
  className?: string;
}

/**
 * Get color classes based on score category
 */
function getCategoryColors(category: HealthScoreCategory): {
  bg: string;
  text: string;
  border: string;
} {
  switch (category) {
    case 'excellent':
      return {
        bg: 'bg-green-100',
        text: 'text-green-800',
        border: 'border-green-300',
      };
    case 'good':
      return {
        bg: 'bg-green-50',
        text: 'text-green-700',
        border: 'border-green-200',
      };
    case 'fair':
      return {
        bg: 'bg-yellow-50',
        text: 'text-yellow-800',
        border: 'border-yellow-300',
      };
    case 'poor':
      return {
        bg: 'bg-orange-50',
        text: 'text-orange-800',
        border: 'border-orange-300',
      };
    case 'very_poor':
      return {
        bg: 'bg-red-50',
        text: 'text-red-800',
        border: 'border-red-300',
      };
  }
}

/**
 * Get size classes based on size variant
 */
function getSizeClasses(size: 'small' | 'medium' | 'large'): {
  container: string;
  score: string;
  label: string;
} {
  switch (size) {
    case 'small':
      return {
        container: 'px-3 py-1.5',
        score: 'text-lg font-bold',
        label: 'text-xs',
      };
    case 'medium':
      return {
        container: 'px-4 py-2',
        score: 'text-2xl font-bold',
        label: 'text-sm',
      };
    case 'large':
      return {
        container: 'px-6 py-3',
        score: 'text-4xl font-bold',
        label: 'text-base',
      };
  }
}

/**
 * Get category label
 */
function getCategoryLabel(category: HealthScoreCategory): string {
  switch (category) {
    case 'excellent':
      return 'Excellent';
    case 'good':
      return 'Good';
    case 'fair':
      return 'Fair';
    case 'poor':
      return 'Poor';
    case 'very_poor':
      return 'Very Poor';
  }
}

/**
 * Get category emoji
 */
function getCategoryEmoji(category: HealthScoreCategory): string {
  switch (category) {
    case 'excellent':
      return '🌟';
    case 'good':
      return '✅';
    case 'fair':
      return '⚠️';
    case 'poor':
      return '⚠️';
    case 'very_poor':
      return '❌';
  }
}

/**
 * HealthScoreBadge Component
 * 
 * Displays a health score with color-coded badge and optional explanation.
 */
export default function HealthScoreBadge({
  score,
  category,
  explanation,
  size = 'medium',
  showExplanation = false,
  className = '',
}: HealthScoreBadgeProps) {
  const colors = getCategoryColors(category);
  const sizes = getSizeClasses(size);
  const label = getCategoryLabel(category);
  const emoji = getCategoryEmoji(category);

  return (
    <div className={`${className}`}>
      {/* Badge */}
      <div
        className={`
          inline-flex items-center gap-2 rounded-lg border-2
          ${colors.bg} ${colors.text} ${colors.border}
          ${sizes.container}
        `}
        role="status"
        aria-label={`Health score: ${score} out of 100, ${label}`}
      >
        <span className={sizes.score}>{score}</span>
        <div className="flex flex-col items-start">
          <span className={`${sizes.label} font-medium`}>Health Score</span>
          <span className={`${sizes.label} flex items-center gap-1`}>
            <span>{emoji}</span>
            <span>{label}</span>
          </span>
        </div>
      </div>

      {/* Explanation */}
      {showExplanation && explanation && (
        <div className="mt-2 text-sm text-gray-700">
          <p>{explanation}</p>
        </div>
      )}
    </div>
  );
}
