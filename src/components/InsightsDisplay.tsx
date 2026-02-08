/**
 * InsightsDisplay Component
 * 
 * Renders analysis results for all detected products.
 * Maps over products array and displays SmartBadge for each insight category.
 * 
 * Requirements: 4.3, 4.4, 4.5, 5.4
 */

import { AnalysisResult } from '@/lib/types';
import SmartBadge from './SmartBadge';

interface InsightsDisplayProps {
  results: AnalysisResult;
}

export default function InsightsDisplay({ results }: InsightsDisplayProps) {
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

          {/* Render SmartBadge for each of the five insight categories */}
          <div className="space-y-3">
            <SmartBadge
              category="health"
              rating={product.insights.health.rating}
              explanation={product.insights.health.explanation}
            />
            <SmartBadge
              category="sustainability"
              rating={product.insights.sustainability.rating}
              explanation={product.insights.sustainability.explanation}
            />
            <SmartBadge
              category="carbon"
              rating={product.insights.carbon.rating}
              explanation={product.insights.carbon.explanation}
            />
            <SmartBadge
              category="preservatives"
              rating={product.insights.preservatives.rating}
              explanation={product.insights.preservatives.explanation}
            />
            <SmartBadge
              category="allergies"
              rating={product.insights.allergies.rating}
              explanation={product.insights.allergies.explanation}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
