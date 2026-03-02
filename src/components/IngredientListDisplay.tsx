/**
 * IngredientListDisplay Component
 * 
 * Displays ingredient list with order preserved and highlights for allergens and additives.
 * Shows allergens in red, additives (preservatives, sweeteners, colors) in orange.
 * 
 * Requirements: 7.3, 7.4, 7.5
 */

import React from 'react';
import type { IngredientList, ParsedIngredient } from '@/lib/services/ingredient-parser';

export interface IngredientListDisplayProps {
  /** Parsed ingredient list */
  ingredients: IngredientList;
  
  /** Whether to show detailed flags for each ingredient */
  showDetails?: boolean;
  
  /** Additional CSS classes */
  className?: string;
}

/**
 * Get ingredient badge based on flags
 */
function getIngredientBadge(ingredient: ParsedIngredient): {
  icon: string;
  label: string;
  color: string;
} | null {
  if (ingredient.isAllergen) {
    return {
      icon: '⚠️',
      label: `Allergen: ${ingredient.allergenType?.replace('_', ' ')}`,
      color: 'bg-red-100 text-red-800 border-red-300',
    };
  }
  
  if (ingredient.isPreservative) {
    return {
      icon: '🧪',
      label: `Preservative: ${ingredient.preservativeType?.replace('_', ' ')}`,
      color: 'bg-orange-100 text-orange-800 border-orange-300',
    };
  }
  
  if (ingredient.isSweetener) {
    return {
      icon: '🍬',
      label: `Sweetener: ${ingredient.sweetenerType?.replace('_', ' ')}`,
      color: 'bg-orange-100 text-orange-800 border-orange-300',
    };
  }
  
  if (ingredient.isArtificialColor) {
    return {
      icon: '🎨',
      label: `Artificial Color: ${ingredient.colorType}`,
      color: 'bg-orange-100 text-orange-800 border-orange-300',
    };
  }
  
  return null;
}

/**
 * Get ingredient text color based on flags
 */
function getIngredientTextColor(ingredient: ParsedIngredient): string {
  if (ingredient.isAllergen) {
    return 'text-red-700 font-semibold';
  }
  
  if (ingredient.isPreservative || ingredient.isSweetener || ingredient.isArtificialColor) {
    return 'text-orange-700 font-medium';
  }
  
  return 'text-gray-700';
}

/**
 * IngredientListDisplay Component
 * 
 * Displays ingredients with highlighting for allergens and additives.
 */
export default function IngredientListDisplay({
  ingredients,
  showDetails = false,
  className = '',
}: IngredientListDisplayProps) {
  const hasAllergens = ingredients.allergens.length > 0;
  const hasAdditives = 
    ingredients.preservatives.length > 0 ||
    ingredients.sweeteners.length > 0 ||
    ingredients.artificialColors.length > 0;

  return (
    <div className={`bg-white rounded-lg border-2 border-gray-200 ${className}`}>
      {/* Header */}
      <div className="bg-gray-50 px-4 py-3 border-b-2 border-gray-200">
        <h3 className="text-lg font-bold text-gray-900">Ingredients</h3>
        {!ingredients.isComplete && (
          <p className="text-sm text-yellow-700 mt-1 flex items-center gap-1">
            <span>⚠️</span>
            <span>Ingredient list may be incomplete (confidence: {Math.round(ingredients.confidence * 100)}%)</span>
          </p>
        )}
      </div>

      {/* Ingredient List */}
      <div className="px-4 py-3">
        <div className="flex flex-wrap gap-2">
          {ingredients.ingredients.map((ingredient, index) => {
            const badge = getIngredientBadge(ingredient);
            const textColor = getIngredientTextColor(ingredient);
            
            return (
              <div key={`ingredient-${index}-${ingredient.name}`} className="inline-flex items-center gap-1">
                <span className={`text-sm ${textColor}`}>
                  {ingredient.name}
                </span>
                {badge && (
                  <span
                    className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs border ${badge.color}`}
                    title={badge.label}
                  >
                    {badge.icon}
                  </span>
                )}
                {index < ingredients.ingredients.length - 1 && (
                  <span className="text-gray-400">,</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Allergen Warning */}
      {hasAllergens && (
        <div className="px-4 py-3 bg-red-50 border-t-2 border-red-200">
          <div className="flex items-start gap-2">
            <span className="text-lg">⚠️</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-900">
                Contains Allergens
              </p>
              <div className="mt-1 flex flex-wrap gap-2">
                {ingredients.allergens.map((allergen, index) => (
                  <span
                    key={`allergen-${index}-${allergen.name}`}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-300"
                  >
                    {allergen.allergenType?.replace('_', ' ')}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Additives Info */}
      {hasAdditives && (
        <div className="px-4 py-3 bg-orange-50 border-t-2 border-orange-200">
          <div className="flex items-start gap-2">
            <span className="text-lg">ℹ️</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-orange-900">
                Contains Additives
              </p>
              <div className="mt-2 space-y-2">
                {/* Preservatives */}
                {ingredients.preservatives.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-orange-800">Preservatives:</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {ingredients.preservatives.map((preservative, index) => (
                        <span
                          key={`preservative-${index}-${preservative.name}`}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-orange-100 text-orange-800 border border-orange-300"
                        >
                          {preservative.preservativeType?.replace('_', ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Sweeteners */}
                {ingredients.sweeteners.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-orange-800">Artificial Sweeteners:</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {ingredients.sweeteners.map((sweetener, index) => (
                        <span
                          key={`sweetener-${index}-${sweetener.name}`}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-orange-100 text-orange-800 border border-orange-300"
                        >
                          {sweetener.sweetenerType?.replace('_', ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Artificial Colors */}
                {ingredients.artificialColors.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-orange-800">Artificial Colors:</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {ingredients.artificialColors.map((color, index) => (
                        <span
                          key={`color-${index}-${color.name}`}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-orange-100 text-orange-800 border border-orange-300"
                        >
                          {color.colorType}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Details View */}
      {showDetails && (
        <div className="px-4 py-3 border-t-2 border-gray-200">
          <details className="group">
            <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
              View Detailed Breakdown
            </summary>
            <div className="mt-3 space-y-2">
              {ingredients.ingredients.map((ingredient, index) => {
                const badge = getIngredientBadge(ingredient);
                return (
                  <div
                    key={`detail-${index}-${ingredient.name}-${ingredient.position}`}
                    className="flex items-start gap-2 text-sm p-2 rounded bg-gray-50"
                  >
                    <span className="font-mono text-xs text-gray-500 mt-0.5">
                      {ingredient.position}.
                    </span>
                    <div className="flex-1">
                      <p className={getIngredientTextColor(ingredient)}>
                        {ingredient.name}
                      </p>
                      {badge && (
                        <p className="text-xs text-gray-600 mt-1">
                          {badge.icon} {badge.label}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
