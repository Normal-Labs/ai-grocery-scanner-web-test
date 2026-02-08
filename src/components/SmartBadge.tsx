/**
 * SmartBadge Component
 * 
 * Displays individual insight with color-coded visual indicator.
 * Shows category icon, name, rating, and explanation.
 * 
 * Requirements: 5.4, 5.5, 5.6, 5.7
 */

import { InsightCategory } from '@/lib/types';

interface SmartBadgeProps {
  category: InsightCategory;
  rating: string;
  explanation: string;
}

/**
 * Determines the color scheme based on rating value
 * Green: positive ratings (Good, Low, None, Yes)
 * Yellow: neutral ratings (Fair, Medium, Partial, Some, Unknown)
 * Red: negative ratings (Poor, High, Many, No)
 */
function getRatingColor(rating: string, category: InsightCategory): string {
  const normalizedRating = rating.toLowerCase();
  
  // Positive ratings (green)
  if (
    normalizedRating.includes('good') ||
    normalizedRating.includes('excellent') ||
    normalizedRating.includes('low') ||
    normalizedRating.includes('none') ||
    normalizedRating === 'yes' ||
    normalizedRating.includes('none detected')
  ) {
    return 'bg-green-100 border-green-500 text-green-900';
  }
  
  // Negative ratings (red)
  if (
    normalizedRating.includes('poor') ||
    normalizedRating.includes('high') ||
    normalizedRating.includes('many') ||
    normalizedRating === 'no'
  ) {
    return 'bg-red-100 border-red-500 text-red-900';
  }
  
  // Neutral/Unknown ratings (yellow)
  return 'bg-yellow-100 border-yellow-500 text-yellow-900';
}

/**
 * Returns the appropriate icon for each category
 */
function getCategoryIcon(category: InsightCategory): string {
  switch (category) {
    case 'health':
      return '❤️'; // Heart icon for health
    case 'sustainability':
      return '🌿'; // Leaf icon for sustainability
    case 'carbon':
      return '🌍'; // Earth icon for carbon impact
    case 'preservatives':
      return '🧪'; // Flask icon for preservatives
    case 'allergies':
      return '⚠️'; // Warning icon for allergens
    default:
      return '📋'; // Fallback icon
  }
}

/**
 * Returns the display name for each category
 */
function getCategoryName(category: InsightCategory): string {
  switch (category) {
    case 'health':
      return 'Health';
    case 'sustainability':
      return 'Responsibly Produced';
    case 'carbon':
      return 'Carbon Impact';
    case 'preservatives':
      return 'Preservatives';
    case 'allergies':
      return 'Allergies';
    default:
      return category;
  }
}

export default function SmartBadge({ category, rating, explanation }: SmartBadgeProps) {
  const colorClasses = getRatingColor(rating, category);
  const icon = getCategoryIcon(category);
  const categoryName = getCategoryName(category);

  return (
    <div
      className={`
        ${colorClasses}
        border-l-4 rounded-lg p-4 mb-3
        shadow-sm
        transition-all duration-200
        hover:shadow-md
      `}
      role="article"
      aria-label={`${categoryName} insight`}
    >
      {/* Header with icon and category name */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl" role="img" aria-label={categoryName}>
          {icon}
        </span>
        <h3 className="font-semibold text-lg">
          {categoryName}
        </h3>
      </div>

      {/* Rating */}
      <div className="mb-2">
        <span className="font-bold text-base">
          {rating}
        </span>
      </div>

      {/* Explanation */}
      <p className="text-sm leading-relaxed">
        {explanation}
      </p>
    </div>
  );
}
