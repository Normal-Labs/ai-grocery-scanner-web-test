/**
 * NutritionFactsTable Component
 * 
 * Displays nutritional facts in a table format with confidence indicators.
 * Shows all nutritional values extracted from the label.
 * 
 * Requirements: 7.2, 8.4
 */

import React from 'react';
import type { NutritionalFacts } from '@/lib/services/nutrition-parser';

export interface NutritionFactsTableProps {
  /** Nutritional facts data */
  facts: NutritionalFacts;
  
  /** Whether to show confidence indicators */
  showConfidence?: boolean;
  
  /** Confidence threshold for "uncertain" indicator (default: 0.8) */
  confidenceThreshold?: number;
  
  /** Additional CSS classes */
  className?: string;
}

/**
 * Format a nutritional value with its unit
 */
function formatValue(value: number, unit: string): string {
  return `${value}${unit}`;
}

/**
 * Get confidence indicator
 */
function getConfidenceIndicator(confidence: number, threshold: number): {
  icon: string;
  color: string;
  label: string;
} | null {
  if (confidence >= threshold) {
    return null; // High confidence, no indicator needed
  }
  
  if (confidence >= threshold - 0.2) {
    return {
      icon: '⚠️',
      color: 'text-yellow-600',
      label: 'Uncertain',
    };
  }
  
  return {
    icon: '❓',
    color: 'text-red-600',
    label: 'Low confidence',
  };
}

/**
 * NutritionFactsTable Component
 * 
 * Displays nutritional facts in a structured table format.
 */
export default function NutritionFactsTable({
  facts,
  showConfidence = true,
  confidenceThreshold = 0.8,
  className = '',
}: NutritionFactsTableProps) {
  return (
    <div className={`bg-white rounded-lg border-2 border-gray-200 ${className}`}>
      {/* Header */}
      <div className="bg-gray-50 px-4 py-3 border-b-2 border-gray-200">
        <h3 className="text-lg font-bold text-gray-900">Nutrition Facts</h3>
        <p className="text-sm text-gray-600 mt-1">
          {facts.servingsPerContainer && `${facts.servingsPerContainer} servings per container`}
        </p>
        <p className="text-sm font-semibold text-gray-900">
          Serving size: {formatValue(facts.servingSize.amount, facts.servingSize.unit)}
          {showConfidence && getConfidenceIndicator(facts.servingSize.confidence, confidenceThreshold) && (
            <span className={`ml-2 ${getConfidenceIndicator(facts.servingSize.confidence, confidenceThreshold)!.color}`}>
              {getConfidenceIndicator(facts.servingSize.confidence, confidenceThreshold)!.icon}
            </span>
          )}
        </p>
      </div>

      {/* Calories */}
      <div className="px-4 py-3 border-b-4 border-gray-900">
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold text-gray-900">Calories</span>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-bold text-gray-900">{facts.calories.value}</span>
            {showConfidence && getConfidenceIndicator(facts.calories.confidence, confidenceThreshold) && (
              <span className={getConfidenceIndicator(facts.calories.confidence, confidenceThreshold)!.color}>
                {getConfidenceIndicator(facts.calories.confidence, confidenceThreshold)!.icon}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Nutrients Table */}
      <div className="divide-y divide-gray-200">
        {/* Total Fat */}
        <NutrientRow
          label="Total Fat"
          value={formatValue(facts.totalFat.value, 'g')}
          confidence={facts.totalFat.confidence}
          showConfidence={showConfidence}
          confidenceThreshold={confidenceThreshold}
          bold
        />
        
        {/* Saturated Fat */}
        <NutrientRow
          label="Saturated Fat"
          value={formatValue(facts.saturatedFat.value, 'g')}
          confidence={facts.saturatedFat.confidence}
          showConfidence={showConfidence}
          confidenceThreshold={confidenceThreshold}
          indent
        />
        
        {/* Trans Fat */}
        <NutrientRow
          label="Trans Fat"
          value={formatValue(facts.transFat.value, 'g')}
          confidence={facts.transFat.confidence}
          showConfidence={showConfidence}
          confidenceThreshold={confidenceThreshold}
          indent
        />
        
        {/* Cholesterol */}
        <NutrientRow
          label="Cholesterol"
          value={formatValue(facts.cholesterol.value, 'mg')}
          confidence={facts.cholesterol.confidence}
          showConfidence={showConfidence}
          confidenceThreshold={confidenceThreshold}
          bold
        />
        
        {/* Sodium */}
        <NutrientRow
          label="Sodium"
          value={formatValue(facts.sodium.value, 'mg')}
          confidence={facts.sodium.confidence}
          showConfidence={showConfidence}
          confidenceThreshold={confidenceThreshold}
          bold
        />
        
        {/* Total Carbohydrates */}
        <NutrientRow
          label="Total Carbohydrates"
          value={formatValue(facts.totalCarbohydrates.value, 'g')}
          confidence={facts.totalCarbohydrates.confidence}
          showConfidence={showConfidence}
          confidenceThreshold={confidenceThreshold}
          bold
        />
        
        {/* Dietary Fiber */}
        <NutrientRow
          label="Dietary Fiber"
          value={formatValue(facts.dietaryFiber.value, 'g')}
          confidence={facts.dietaryFiber.confidence}
          showConfidence={showConfidence}
          confidenceThreshold={confidenceThreshold}
          indent
        />
        
        {/* Total Sugars */}
        <NutrientRow
          label="Total Sugars"
          value={formatValue(facts.totalSugars.value, 'g')}
          confidence={facts.totalSugars.confidence}
          showConfidence={showConfidence}
          confidenceThreshold={confidenceThreshold}
          indent
        />
        
        {/* Added Sugars */}
        {facts.addedSugars && (
          <NutrientRow
            label="Added Sugars"
            value={formatValue(facts.addedSugars.value, 'g')}
            confidence={facts.addedSugars.confidence}
            showConfidence={showConfidence}
            confidenceThreshold={confidenceThreshold}
            indent={2}
          />
        )}
        
        {/* Protein */}
        <NutrientRow
          label="Protein"
          value={formatValue(facts.protein.value, 'g')}
          confidence={facts.protein.confidence}
          showConfidence={showConfidence}
          confidenceThreshold={confidenceThreshold}
          bold
        />
      </div>

      {/* Vitamins and Minerals */}
      {(facts.vitamins || facts.minerals) && (
        <div className="px-4 py-3 border-t-4 border-gray-900">
          <p className="text-xs text-gray-600 mb-2">% Daily Value</p>
          <div className="space-y-1">
            {facts.vitamins && Object.entries(facts.vitamins).map(([name, data]) => (
              <div key={name} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">{name}</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900">{data.value}%</span>
                  {showConfidence && getConfidenceIndicator(data.confidence, confidenceThreshold) && (
                    <span className={`text-xs ${getConfidenceIndicator(data.confidence, confidenceThreshold)!.color}`}>
                      {getConfidenceIndicator(data.confidence, confidenceThreshold)!.icon}
                    </span>
                  )}
                </div>
              </div>
            ))}
            {facts.minerals && Object.entries(facts.minerals).map(([name, data]) => (
              <div key={name} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">{name}</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900">{data.value}%</span>
                  {showConfidence && getConfidenceIndicator(data.confidence, confidenceThreshold) && (
                    <span className={`text-xs ${getConfidenceIndicator(data.confidence, confidenceThreshold)!.color}`}>
                      {getConfidenceIndicator(data.confidence, confidenceThreshold)!.icon}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Validation Status */}
      {facts.validationStatus !== 'valid' && (
        <div className={`px-4 py-3 border-t-2 ${
          facts.validationStatus === 'uncertain' ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-start gap-2">
            <span className="text-lg">
              {facts.validationStatus === 'uncertain' ? '⚠️' : '❌'}
            </span>
            <div className="flex-1">
              <p className={`text-sm font-semibold ${
                facts.validationStatus === 'uncertain' ? 'text-yellow-900' : 'text-red-900'
              }`}>
                {facts.validationStatus === 'uncertain' ? 'Some values are uncertain' : 'Validation failed'}
              </p>
              {facts.validationErrors && facts.validationErrors.length > 0 && (
                <ul className={`mt-1 text-xs space-y-1 ${
                  facts.validationStatus === 'uncertain' ? 'text-yellow-800' : 'text-red-800'
                }`}>
                  {facts.validationErrors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * NutrientRow Component
 * 
 * Displays a single nutrient row in the table.
 */
interface NutrientRowProps {
  label: string;
  value: string;
  confidence: number;
  showConfidence: boolean;
  confidenceThreshold: number;
  bold?: boolean;
  indent?: boolean | number;
}

function NutrientRow({
  label,
  value,
  confidence,
  showConfidence,
  confidenceThreshold,
  bold = false,
  indent = false,
}: NutrientRowProps) {
  const indentLevel = typeof indent === 'number' ? indent : indent ? 1 : 0;
  const indentClass = indentLevel === 2 ? 'pl-12' : indentLevel === 1 ? 'pl-6' : 'pl-4';
  
  const indicator = showConfidence ? getConfidenceIndicator(confidence, confidenceThreshold) : null;

  return (
    <div className={`flex items-center justify-between py-2 pr-4 ${indentClass}`}>
      <span className={`text-sm ${bold ? 'font-bold text-gray-900' : 'text-gray-700'}`}>
        {label}
      </span>
      <div className="flex items-center gap-2">
        <span className={`text-sm ${bold ? 'font-bold text-gray-900' : 'text-gray-700'}`}>
          {value}
        </span>
        {indicator && (
          <span className={`text-xs ${indicator.color}`} title={indicator.label}>
            {indicator.icon}
          </span>
        )}
      </div>
    </div>
  );
}
