/**
 * InsightsDisplay Component
 * 
 * Renders analysis results for all detected products with tier-aware display.
 * Premium tier: Shows all five insight categories
 * Free tier: Shows only the selected dimension
 * 
 * Requirements: 4.3, 4.4, 4.5, 5.4, 11.2, 11.5
 */

import { AnalysisResult, InsightCategory } from '@/lib/types';
import SmartBadge from './SmartBadge';

interface InsightsDisplayProps {
  results: AnalysisResult;
  tier?: 'free' | 'premium';
  dimension?: InsightCategory;
}

export default function InsightsDisplay({ results, tier = 'premium', dimension }: InsightsDisplayProps) {
  // Handle empty results
  if (!results || !results.products || results.products.length === 0) {
    return (
      <div className="text-center py-8 px-4">
        <p className="text-gray-600 text-lg mb-2">
          No products detected
        </p>
        <p className="text-gray-500 text-sm">
          Please capture a clearer image of the product and try again.
        </p>
      </div>
    );
  }

  // Determine which categories to display
  const categoriesToDisplay: InsightCategory[] =
    tier === 'free' && dimension
      ? [dimension]
      : ['health', 'sustainability', 'carbon', 'preservatives', 'allergies'];

  return (
    <div 
      className="w-full max-h-[70vh] overflow-y-auto px-4 py-6 space-y-8"
      role="region"
      aria-label="Product analysis results"
    >
      {results.products.map((product, productIndex) => (
        <div 
          key={`${product.productName}-${productIndex}`}
          className="bg-white rounded-lg shadow-md p-5 border border-gray-200"
        >
          {/* Product name header */}
          <h2 className="text-2xl font-bold text-gray-800 mb-4 pb-3 border-b border-gray-300">
            {product.productName}
          </h2>

          {/* Tier indicator */}
          {tier === 'free' && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                🆓 Free tier: Showing {dimension} analysis only.{' '}
                <span className="font-medium">Upgrade to Premium</span> for all 5 dimensions.
              </p>
            </div>
          )}

          {/* Render SmartBadge for each category */}
          <div className="space-y-3">
            {categoriesToDisplay.map((category) => {
              const insight = product.insights[category];
              
              // Skip if insight doesn't exist (shouldn't happen with proper validation)
              if (!insight) return null;
              
              return (
                <SmartBadge
                  key={category}
                  category={category}
                  rating={insight.rating}
                  explanation={insight.explanation}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
