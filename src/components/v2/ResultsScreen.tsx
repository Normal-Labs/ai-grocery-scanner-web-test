'use client';

/**
 * V2 Results Screen Component
 * 
 * Displays product analysis results using V2 Design System.
 * Shows health scores, allergens, nutrition, and ingredients.
 */

import { ChevronLeft, Heart, AlertTriangle, Leaf, ShieldCheck, Zap, Camera } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { HamburgerMenu } from './HamburgerMenu';

interface ExtractionStep {
  name: string;
  status: 'pending' | 'processing' | 'success' | 'failed' | 'skipped';
  data?: any;
  error?: string;
  confidence?: number;
  processingTime?: number;
}

interface HealthDimensionResult {
  score: number;
  explanation: string;
  key_factors: string[];
  confidence: number;
}

interface ProcessingDimensionResult {
  score: number;
  explanation: string;
  key_factors: string[];
  additives_detected: {
    preservatives: string[];
    artificial_sweeteners: string[];
    artificial_colors: string[];
    other_additives: string[];
  };
  confidence: number;
}

interface AllergensDimensionResult {
  score: number;
  explanation: string;
  key_factors: string[];
  allergens_detected: {
    major_allergens: string[];
    other_allergens: string[];
    cross_contamination_warnings: string[];
    allergen_free_claims: string[];
  };
  confidence: number;
}

interface ResultsScreenProps {
  result: {
    steps: {
      barcode: ExtractionStep;
      packaging: ExtractionStep;
      ingredients: ExtractionStep;
      nutrition: ExtractionStep;
    };
    healthDimension?: HealthDimensionResult;
    processingDimension?: ProcessingDimensionResult;
    allergensDimension?: AllergensDimensionResult;
    cached?: boolean;
    cacheAge?: number;
    savedToDb?: boolean;
    skippedUpdate?: boolean;
    totalProcessingTime?: number;
    imageSize?: number;
  };
  onBack: () => void;
  onCompleteScan?: () => void;
  showCompleteScanButton?: boolean;
}

export function ResultsScreen({ result, onBack, onCompleteScan, showCompleteScanButton }: ResultsScreenProps) {
  // Extract product info from steps
  const packagingData = result.steps.packaging?.data;
  const barcodeData = result.steps.barcode?.data;
  const nutritionData = result.steps.nutrition?.data;
  const ingredientsData = result.steps.ingredients?.data;

  // API returns productName (camelCase)
  const productName = packagingData?.productName || packagingData?.product_name || 'Unknown Product';
  const brandName = packagingData?.brand || 'Unknown Brand';
  const barcode = barcodeData?.barcode;

  // Calculate overall score from dimensions
  const calculateOverallScore = () => {
    const scores = [];
    if (result.healthDimension) scores.push(result.healthDimension.score);
    if (result.processingDimension) scores.push(result.processingDimension.score);
    if (result.allergensDimension) scores.push(result.allergensDimension.score);
    
    if (scores.length === 0) return null;
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    return Math.round(avg);
  };

  const overallScore = calculateOverallScore();

  // Convert score to letter grade
  const getLetterGrade = (score: number) => {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  };

  // Get color for score - returns actual CSS values for dynamic usage
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'destructive';
  };

  // Generate quick insights from analysis data
  const getQuickInsights = (): { text: string; type: 'success' | 'warning' | 'info' }[] => {
    const insights: { text: string; type: 'success' | 'warning' | 'info' }[] = [];

    // Processing insights
    if (result.processingDimension) {
      const additives = result.processingDimension.additives_detected;
      if (additives) {
        const hasPreservatives = additives.preservatives?.length > 0;
        const hasArtificialColors = additives.artificial_colors?.length > 0;
        const hasArtificialSweeteners = additives.artificial_sweeteners?.length > 0;

        if (!hasPreservatives && !hasArtificialColors && !hasArtificialSweeteners) {
          insights.push({ text: 'No artificial preservatives or colors', type: 'success' });
        } else {
          if (hasPreservatives) insights.push({ text: `Contains preservatives: ${additives.preservatives.join(', ')}`, type: 'warning' });
          if (hasArtificialColors) insights.push({ text: `Contains artificial colors: ${additives.artificial_colors.join(', ')}`, type: 'warning' });
          if (hasArtificialSweeteners) insights.push({ text: `Contains artificial sweeteners: ${additives.artificial_sweeteners.join(', ')}`, type: 'warning' });
        }
      }
      if (result.processingDimension.score >= 80) {
        insights.push({ text: 'Minimally processed product', type: 'success' });
      }
    }

    // Allergen insights
    if (result.allergensDimension) {
      const allergens = result.allergensDimension.allergens_detected;
      if (allergens.major_allergens?.length > 0) {
        insights.push({ text: `Contains: ${allergens.major_allergens.join(', ')}`, type: 'warning' });
      }
      if (allergens.allergen_free_claims?.length > 0) {
        insights.push({ text: allergens.allergen_free_claims.join(', '), type: 'success' });
      }
    }

    // Health insights
    if (result.healthDimension) {
      if (result.healthDimension.score >= 80) {
        insights.push({ text: 'Good nutritional profile', type: 'success' });
      }
    }

    return insights.slice(0, 4); // Max 4 insights
  };

  const quickInsights = getQuickInsights();

  return (
    <div className="h-full flex flex-col bg-background overflow-y-auto pb-20">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 sticky top-0 bg-background z-10 border-b border-border">
        <button 
          onClick={onBack}
          className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </button>
        
        <div className="flex items-center gap-2">
          {/* Cache/Save indicators */}
          {result.cached && (
            <Badge variant="secondary" className="text-xs">
              <Zap className="w-3 h-3 mr-1" />
              Cached
            </Badge>
          )}
          {result.savedToDb && !result.cached && (
            <Badge variant="secondary" className="text-xs bg-success/10 text-success">
              Saved
            </Badge>
          )}
          
          <HamburgerMenu />
        </div>
      </div>

      {/* Product Info */}
      <div className="px-5 py-5">
        <div className="flex gap-4">
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-foreground leading-tight">{productName}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">{brandName}</p>
            {barcode && (
              <p className="text-xs text-muted-foreground mt-1 font-mono">{barcode}</p>
            )}
            {overallScore !== null && (
              <div className="flex items-center gap-2 mt-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  getScoreColor(overallScore) === 'success' ? 'bg-success/10 text-success' :
                  getScoreColor(overallScore) === 'warning' ? 'bg-warning/10 text-warning' :
                  'bg-destructive/10 text-destructive'
                }`}>
                  Score: {overallScore}/100
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Complete Scan Button */}
      {showCompleteScanButton && onCompleteScan && (
        <div className="px-5 pb-5">
          <div className="bg-warning/10 border border-warning/20 rounded-2xl p-4">
            <div className="flex items-start gap-3 mb-3">
              <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Incomplete Scan</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Some information is missing. Capture another image to complete this product scan.
                </p>
              </div>
            </div>
            <button
              onClick={onCompleteScan}
              className="w-full px-4 py-2.5 bg-warning hover:bg-warning/90 text-warning-foreground font-medium rounded-xl transition-colors"
            >
              📷 Complete Scan
            </button>
          </div>
        </div>
      )}

      {/* Extraction Status */}
      <div className="px-5 pb-5">
        <h3 className="text-sm font-semibold text-foreground mb-3">Extraction Status</h3>
        <div className="bg-card rounded-2xl border border-border divide-y divide-border">
          {/* Barcode */}
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-foreground">Barcode</span>
            <div className="flex items-center gap-2">
              {result.steps.barcode.status === 'success' ? (
                <>
                  <div className="w-2 h-2 rounded-full bg-success" />
                  <span className="text-xs text-success">Captured</span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 rounded-full bg-destructive" />
                  <span className="text-xs text-destructive">Missing</span>
                </>
              )}
            </div>
          </div>
          
          {/* Packaging */}
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-foreground">Product Info</span>
            <div className="flex items-center gap-2">
              {result.steps.packaging.status === 'success' ? (
                <>
                  <div className="w-2 h-2 rounded-full bg-success" />
                  <span className="text-xs text-success">Captured</span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 rounded-full bg-destructive" />
                  <span className="text-xs text-destructive">Missing</span>
                </>
              )}
            </div>
          </div>
          
          {/* Ingredients */}
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-foreground">Ingredients</span>
            <div className="flex items-center gap-2">
              {result.steps.ingredients.status === 'success' ? (
                <>
                  <div className="w-2 h-2 rounded-full bg-success" />
                  <span className="text-xs text-success">Captured</span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 rounded-full bg-destructive" />
                  <span className="text-xs text-destructive">Missing</span>
                </>
              )}
            </div>
          </div>
          
          {/* Nutrition */}
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-foreground">Nutrition Facts</span>
            <div className="flex items-center gap-2">
              {result.steps.nutrition.status === 'success' ? (
                <>
                  <div className="w-2 h-2 rounded-full bg-success" />
                  <span className="text-xs text-success">Captured</span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 rounded-full bg-destructive" />
                  <span className="text-xs text-destructive">Missing</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Score Cards */}
      <div className="px-5 pb-5 space-y-3">
        {/* Health Score */}
        {result.healthDimension && (
          <div className="bg-card rounded-2xl p-4 border border-border">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                getScoreColor(result.healthDimension.score) === 'success' ? 'bg-success/10' :
                getScoreColor(result.healthDimension.score) === 'warning' ? 'bg-warning/10' :
                'bg-destructive/10'
              }`}>
                <Heart className={`w-6 h-6 ${
                  getScoreColor(result.healthDimension.score) === 'success' ? 'text-success' :
                  getScoreColor(result.healthDimension.score) === 'warning' ? 'text-warning' :
                  'text-destructive'
                }`} />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Health Score</p>
                <p className="text-2xl font-semibold text-foreground">
                  {getLetterGrade(result.healthDimension.score)}
                </p>
              </div>
              <span className={`text-xs font-medium ${
                getScoreColor(result.healthDimension.score) === 'success' ? 'text-success' :
                getScoreColor(result.healthDimension.score) === 'warning' ? 'text-warning' :
                'text-destructive'
              }`}>
                {result.healthDimension.score}/100
              </span>
            </div>
            {/* Expandable details */}
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2">Analysis</p>
              <p className="text-sm text-foreground leading-relaxed">
                {result.healthDimension.explanation}
              </p>
              {result.healthDimension.key_factors.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-muted-foreground mb-2">Key Factors</p>
                  <ul className="space-y-1">
                    {result.healthDimension.key_factors.map((factor, idx) => (
                      <li key={idx} className="text-xs text-foreground flex items-start gap-2">
                        <span className="text-muted-foreground mt-0.5">•</span>
                        <span className="flex-1">{factor}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Processing Score */}
        {result.processingDimension && (
          <div className="bg-card rounded-2xl p-4 border border-border">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                getScoreColor(result.processingDimension.score) === 'success' ? 'bg-success/10' :
                getScoreColor(result.processingDimension.score) === 'warning' ? 'bg-warning/10' :
                'bg-destructive/10'
              }`}>
                <Leaf className={`w-6 h-6 ${
                  getScoreColor(result.processingDimension.score) === 'success' ? 'text-success' :
                  getScoreColor(result.processingDimension.score) === 'warning' ? 'text-warning' :
                  'text-destructive'
                }`} />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Processing Score</p>
                <p className="text-2xl font-semibold text-foreground">
                  {getLetterGrade(result.processingDimension.score)}
                </p>
              </div>
              <span className={`text-xs font-medium ${
                getScoreColor(result.processingDimension.score) === 'success' ? 'text-success' :
                getScoreColor(result.processingDimension.score) === 'warning' ? 'text-warning' :
                'text-destructive'
              }`}>
                {result.processingDimension.score}/100
              </span>
            </div>
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2">Analysis</p>
              <p className="text-sm text-foreground leading-relaxed">
                {result.processingDimension.explanation}
              </p>
            </div>
          </div>
        )}

        {/* Allergens */}
        {result.allergensDimension && (
          <div className="bg-card rounded-2xl p-4 border border-border">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                getScoreColor(result.allergensDimension.score) === 'success' ? 'bg-success/10' :
                getScoreColor(result.allergensDimension.score) === 'warning' ? 'bg-warning/10' :
                'bg-destructive/10'
              }`}>
                <AlertTriangle className={`w-6 h-6 ${
                  getScoreColor(result.allergensDimension.score) === 'success' ? 'text-success' :
                  getScoreColor(result.allergensDimension.score) === 'warning' ? 'text-warning' :
                  'text-destructive'
                }`} />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Allergen Safety</p>
                <p className="text-2xl font-semibold text-foreground">
                  {getLetterGrade(result.allergensDimension.score)}
                </p>
              </div>
              <span className={`text-xs font-medium ${
                getScoreColor(result.allergensDimension.score) === 'success' ? 'text-success' :
                getScoreColor(result.allergensDimension.score) === 'warning' ? 'text-warning' :
                'text-destructive'
              }`}>
                {result.allergensDimension.score}/100
              </span>
            </div>
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2">Analysis</p>
              <p className="text-sm text-foreground leading-relaxed">
                {result.allergensDimension.explanation}
              </p>
              {(result.allergensDimension.allergens_detected.major_allergens.length > 0 || 
                result.allergensDimension.allergens_detected.other_allergens.length > 0) && (
                <div className="mt-3">
                  <p className="text-xs text-muted-foreground mb-2">Detected Allergens</p>
                  <div className="flex flex-wrap gap-2">
                    {result.allergensDimension.allergens_detected.major_allergens.map((allergen, idx) => (
                      <Badge key={`major-${idx}`} variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                        {allergen}
                      </Badge>
                    ))}
                    {result.allergensDimension.allergens_detected.other_allergens.map((allergen, idx) => (
                      <Badge key={`other-${idx}`} variant="outline" className="bg-warning/10 text-warning border-warning/20">
                        {allergen}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Quick Insights */}
      {quickInsights.length > 0 && (
        <div className="px-5 pb-5">
          <h3 className="text-sm font-semibold text-foreground mb-3">Quick Insights</h3>
          <div className="space-y-2">
            {quickInsights.map((insight, idx) => (
              <div 
                key={idx}
                className={`flex items-center gap-3 rounded-xl p-3 border ${
                  insight.type === 'success' ? 'bg-success/5 border-success/10' :
                  insight.type === 'warning' ? 'bg-warning/5 border-warning/10' :
                  'bg-info/5 border-info/10'
                }`}
              >
                <ShieldCheck className={`w-5 h-5 shrink-0 ${
                  insight.type === 'success' ? 'text-success' :
                  insight.type === 'warning' ? 'text-warning' :
                  'text-info'
                }`} />
                <p className="text-sm text-foreground">{insight.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <Separator className="mx-5" />

      {/* Nutrition Breakdown */}
      {nutritionData && nutritionData.macros && (
        <div className="px-5 py-5">
          <h3 className="text-sm font-semibold text-foreground mb-3">Nutrition Breakdown</h3>
          <div className="bg-card rounded-2xl border border-border divide-y divide-border">
            {nutritionData.calories_per_serving && (
              <NutritionRow 
                label="Calories" 
                value={nutritionData.calories_per_serving} 
                unit="kcal"
                percentage={0}
              />
            )}
            {nutritionData.macros.total_sugars && (
              <NutritionRow 
                label="Sugar" 
                value={nutritionData.macros.total_sugars.value}
                unit={nutritionData.macros.total_sugars.unit}
                percentage={nutritionData.macros.total_sugars.dv_percent || 0}
                color={(nutritionData.macros.total_sugars.dv_percent || 0) > 20 ? 'warning' : 'success'}
              />
            )}
            {nutritionData.macros.dietary_fiber && (
              <NutritionRow 
                label="Fiber" 
                value={nutritionData.macros.dietary_fiber.value}
                unit={nutritionData.macros.dietary_fiber.unit}
                percentage={nutritionData.macros.dietary_fiber.dv_percent || 0}
                color="success"
              />
            )}
            {nutritionData.macros.protein && (
              <NutritionRow 
                label="Protein" 
                value={nutritionData.macros.protein.value}
                unit={nutritionData.macros.protein.unit}
                percentage={nutritionData.macros.protein.dv_percent || 0}
              />
            )}
            {nutritionData.macros.sodium && (
              <NutritionRow 
                label="Sodium" 
                value={nutritionData.macros.sodium.value}
                unit={nutritionData.macros.sodium.unit}
                percentage={nutritionData.macros.sodium.dv_percent || 0}
                color={(nutritionData.macros.sodium.dv_percent || 0) > 20 ? 'warning' : 'muted'}
              />
            )}
            {nutritionData.macros.saturated_fat && (
              <NutritionRow 
                label="Saturated Fat" 
                value={nutritionData.macros.saturated_fat.value}
                unit={nutritionData.macros.saturated_fat.unit}
                percentage={nutritionData.macros.saturated_fat.dv_percent || 0}
                color={(nutritionData.macros.saturated_fat.dv_percent || 0) > 20 ? 'warning' : 'success'}
              />
            )}
          </div>
        </div>
      )}

      {/* Ingredients Analysis */}
      {ingredientsData?.ingredients && ingredientsData.ingredients.length > 0 && (
        <div className="px-5 pb-8">
          <h3 className="text-sm font-semibold text-foreground mb-3">
            Ingredients ({ingredientsData.ingredients.length})
          </h3>
          <div className="space-y-2">
            {ingredientsData.ingredients.map((ingredient: string, idx: number) => (
              <div key={idx} className="bg-card rounded-xl p-4 border border-border">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center shrink-0 mt-0.5">
                    <ShieldCheck className="w-4 h-4 text-success" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{ingredient}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fixed Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border">
        <div className="max-w-md mx-auto px-5 py-4">
          <button
            onClick={() => {
              // Navigate to scan page
              if (typeof window !== 'undefined') {
                window.location.href = '/scan';
              }
            }}
            className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <Camera className="w-5 h-5" />
            Scan
          </button>
        </div>
      </div>
    </div>
  );
}

function NutritionRow({ 
  label, 
  value, 
  unit = "", 
  percentage, 
  color = "muted" 
}: { 
  label: string;
  value: string | number;
  unit?: string;
  percentage: number;
  color?: "success" | "warning" | "muted";
}) {
  const colorClasses = {
    success: "bg-success",
    warning: "bg-warning", 
    muted: "bg-muted-foreground"
  };

  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-sm text-foreground">{label}</span>
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-foreground">
          {value}
          {unit && <span className="text-muted-foreground ml-0.5">{unit}</span>}
        </span>
        <div className="w-12 h-1.5 bg-secondary rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full ${colorClasses[color]}`} 
            style={{ width: `${Math.min(percentage, 100)}%` }} 
          />
        </div>
        <span className="text-xs text-muted-foreground w-8 text-right">{percentage}%</span>
      </div>
    </div>
  );
}
