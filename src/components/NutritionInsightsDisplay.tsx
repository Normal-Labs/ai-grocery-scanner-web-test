/**
 * NutritionInsightsDisplay Component
 * 
 * Main display component that integrates all nutrition analysis results.
 * Shows health score, nutritional facts, ingredients, allergen warnings, and explanations.
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.7
 */

import React, { useState } from 'react';
import HealthScoreBadge from './HealthScoreBadge';
import NutritionFactsTable from './NutritionFactsTable';
import IngredientListDisplay from './IngredientListDisplay';
import type { NutritionScanResult } from '@/lib/orchestrator/NutritionOrchestrator';

export interface NutritionInsightsDisplayProps {
  /** Nutrition scan result */
  result: NutritionScanResult;
  
  /** Whether to show detailed breakdown */
  showDetails?: boolean;
  
  /** Additional CSS classes */
  className?: string;
}

/**
 * NutritionInsightsDisplay Component
 * 
 * Displays complete nutrition analysis with all sub-components.
 */
export default function NutritionInsightsDisplay({
  result,
  showDetails = false,
  className = '',
}: NutritionInsightsDisplayProps) {
  const [expandedSections, setExpandedSections] = useState<{
    nutritionFacts: boolean;
    ingredients: boolean;
    scoreBreakdown: boolean;
  }>({
    nutritionFacts: true,
    ingredients: true,
    scoreBreakdown: false,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const hasAllergens = result.ingredients.allergens.length > 0;
  const hasAdditives = 
    result.ingredients.preservatives.length > 0 ||
    result.ingredients.sweeteners.length > 0 ||
    result.ingredients.artificialColors.length > 0;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header with Product Name */}
      {result.productName && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900">{result.productName}</h2>
          <p className="text-sm text-gray-600 mt-1">
            Scanned on {new Date(result.timestamp).toLocaleDateString()} at {new Date(result.timestamp).toLocaleTimeString()}
          </p>
          {result.fromCache && (
            <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
              <span>💾</span>
              <span>Retrieved from cache (instant result)</span>
            </p>
          )}
        </div>
      )}

      {/* Health Score */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <HealthScoreBadge
          score={result.healthScore.overall}
          category={result.healthScore.category}
          explanation={result.healthScore.explanation}
          size="large"
          showExplanation={true}
        />

        {/* Score Breakdown */}
        <div className="mt-4">
          <button
            onClick={() => toggleSection('scoreBreakdown')}
            className="flex items-center justify-between w-full text-left text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            <span>View Score Breakdown</span>
            <span className="text-lg">
              {expandedSections.scoreBreakdown ? '▼' : '▶'}
            </span>
          </button>

          {expandedSections.scoreBreakdown && (
            <div className="mt-3 space-y-2">
              {result.healthScore.factors.map((factor, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border-2 ${
                    factor.impact === 'positive'
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">
                      {factor.category}
                    </span>
                    <span className={`text-sm font-bold ${
                      factor.impact === 'positive' ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {factor.points > 0 ? '+' : ''}{factor.points} points
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">{factor.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Allergen Warning (Prominent) */}
      {hasAllergens && (
        <div className="bg-red-50 border-2 border-red-300 rounded-lg shadow-lg p-6">
          <div className="flex items-start gap-3">
            <span className="text-3xl">⚠️</span>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-red-900">
                Allergen Warning
              </h3>
              <p className="text-sm text-red-800 mt-1">
                This product contains {result.ingredients.allergens.length} allergen{result.ingredients.allergens.length > 1 ? 's' : ''}:
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {result.ingredients.allergens.map((allergen, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold bg-red-100 text-red-900 border-2 border-red-300"
                  >
                    {allergen.allergenType?.replace('_', ' ').toUpperCase()}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Additives Info (if present) */}
      {hasAdditives && (
        <div className="bg-orange-50 border-2 border-orange-300 rounded-lg shadow-lg p-6">
          <div className="flex items-start gap-3">
            <span className="text-2xl">ℹ️</span>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-orange-900">
                Contains Additives
              </h3>
              <p className="text-sm text-orange-800 mt-1">
                This product contains artificial preservatives, sweeteners, or colors.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Nutrition Facts */}
      <div>
        <button
          onClick={() => toggleSection('nutritionFacts')}
          className="flex items-center justify-between w-full text-left mb-2 text-lg font-bold text-gray-900 hover:text-gray-700"
        >
          <span>Nutrition Facts</span>
          <span className="text-xl">
            {expandedSections.nutritionFacts ? '▼' : '▶'}
          </span>
        </button>

        {expandedSections.nutritionFacts && (
          <NutritionFactsTable
            facts={result.nutritionalFacts}
            showConfidence={true}
          />
        )}
      </div>

      {/* Ingredients */}
      <div>
        <button
          onClick={() => toggleSection('ingredients')}
          className="flex items-center justify-between w-full text-left mb-2 text-lg font-bold text-gray-900 hover:text-gray-700"
        >
          <span>Ingredients</span>
          <span className="text-xl">
            {expandedSections.ingredients ? '▼' : '▶'}
          </span>
        </button>

        {expandedSections.ingredients && (
          <IngredientListDisplay
            ingredients={result.ingredients}
            showDetails={showDetails}
          />
        )}
      </div>
    </div>
  );
}
