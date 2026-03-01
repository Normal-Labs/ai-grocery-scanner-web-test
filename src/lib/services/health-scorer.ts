/**
 * HealthScorer Service
 * 
 * Calculates health assessment scores (0-100) based on nutritional data and ingredients.
 * 
 * Scoring Algorithm:
 * - Base score: 100 points
 * - Nutritional penalties (max -70 points)
 * - Nutritional bonuses (max +20 points)
 * - Ingredient penalties (max -30 points)
 * 
 * Requirements: 4.1-4.12
 */

import { NutritionalFacts } from './nutrition-parser';
import { IngredientList } from './ingredient-parser';

/**
 * Health score category classification
 * Requirement 4.11: Classify scores into 5 categories
 */
export type HealthCategory = 'excellent' | 'good' | 'fair' | 'poor' | 'very_poor';

/**
 * Health factor impact type
 */
export type FactorImpact = 'positive' | 'negative';

/**
 * Individual health factor contributing to the score
 * Requirement 4.12: Provide explanation with key factors
 */
export interface HealthFactor {
  category: string; // e.g., "High Sodium", "High Fiber"
  impact: FactorImpact;
  points: number; // Points added or subtracted
  description: string;
}

/**
 * Complete health score result
 * Requirement 4.1, 4.12: Overall score with breakdown and explanation
 */
export interface HealthScore {
  overall: number; // 0-100
  category: HealthCategory;
  breakdown: {
    nutritionalScore: number; // Score from nutritional content
    ingredientScore: number; // Score from ingredient analysis
  };
  factors: HealthFactor[];
  explanation: string;
}

/**
 * HealthScorer Service
 * 
 * Calculates health scores from nutritional data and ingredients.
 * Requirements: 4.1-4.12
 */
export class HealthScorer {
  /**
   * Calculates health score from nutritional data and ingredients
   * 
   * @param facts - Nutritional facts
   * @param ingredients - Parsed ingredient list
   * @returns Health score with breakdown and explanation
   * 
   * Requirements: 4.1-4.12
   */
  calculateScore(
    facts: NutritionalFacts,
    ingredients: IngredientList
  ): HealthScore {
    const factors: HealthFactor[] = [];
    
    // Start with base score of 100
    let nutritionalScore = 100;
    
    // Apply nutritional penalties (Requirements 4.2-4.5)
    nutritionalScore += this.applySodiumPenalty(facts.sodium.value, factors);
    nutritionalScore += this.applySugarPenalty(facts.addedSugars?.value || facts.totalSugars.value, factors);
    nutritionalScore += this.applySaturatedFatPenalty(facts.saturatedFat.value, factors);
    nutritionalScore += this.applyTransFatPenalty(facts.transFat.value, factors);
    
    // Apply nutritional bonuses (Requirements 4.6-4.7)
    nutritionalScore += this.applyFiberBonus(facts.dietaryFiber.value, factors);
    nutritionalScore += this.applyProteinBonus(facts.protein.value, factors);
    
    // Calculate ingredient score (Requirements 4.8-4.10)
    const ingredientScore = this.calculateIngredientScore(ingredients, factors);
    
    // Calculate overall score
    const overall = Math.max(0, Math.min(100, nutritionalScore + ingredientScore));
    
    // Classify score into category (Requirement 4.11)
    const category = this.classifyScore(overall);
    
    // Generate explanation (Requirement 4.12)
    const explanation = this.generateExplanation(overall, category, factors);
    
    return {
      overall,
      category,
      breakdown: {
        nutritionalScore: Math.max(0, Math.min(100, nutritionalScore)),
        ingredientScore: Math.max(-30, Math.min(0, ingredientScore))
      },
      factors,
      explanation
    };
  }
  
  /**
   * Apply sodium penalty
   * Requirement 4.2: Penalize high sodium
   * - >400mg: -10 points
   * - >800mg: -20 points
   */
  private applySodiumPenalty(sodium: number, factors: HealthFactor[]): number {
    if (sodium > 800) {
      factors.push({
        category: 'Very High Sodium',
        impact: 'negative',
        points: -20,
        description: `Contains ${sodium}mg of sodium per serving (very high)`
      });
      return -20;
    } else if (sodium > 400) {
      factors.push({
        category: 'High Sodium',
        impact: 'negative',
        points: -10,
        description: `Contains ${sodium}mg of sodium per serving (high)`
      });
      return -10;
    }
    return 0;
  }
  
  /**
   * Apply added sugar penalty
   * Requirement 4.3: Penalize high added sugars
   * - >10g: -15 points
   * - >20g: -25 points
   */
  private applySugarPenalty(sugar: number, factors: HealthFactor[]): number {
    if (sugar > 20) {
      factors.push({
        category: 'Very High Sugar',
        impact: 'negative',
        points: -25,
        description: `Contains ${sugar}g of sugar per serving (very high)`
      });
      return -25;
    } else if (sugar > 10) {
      factors.push({
        category: 'High Sugar',
        impact: 'negative',
        points: -15,
        description: `Contains ${sugar}g of sugar per serving (high)`
      });
      return -15;
    }
    return 0;
  }
  
  /**
   * Apply saturated fat penalty
   * Requirement 4.4: Penalize high saturated fat
   * - >5g: -10 points
   * - >10g: -20 points
   */
  private applySaturatedFatPenalty(saturatedFat: number, factors: HealthFactor[]): number {
    if (saturatedFat > 10) {
      factors.push({
        category: 'Very High Saturated Fat',
        impact: 'negative',
        points: -20,
        description: `Contains ${saturatedFat}g of saturated fat per serving (very high)`
      });
      return -20;
    } else if (saturatedFat > 5) {
      factors.push({
        category: 'High Saturated Fat',
        impact: 'negative',
        points: -10,
        description: `Contains ${saturatedFat}g of saturated fat per serving (high)`
      });
      return -10;
    }
    return 0;
  }
  
  /**
   * Apply trans fat penalty
   * Requirement 4.5: Penalize any trans fat
   * - >0g: -15 points
   */
  private applyTransFatPenalty(transFat: number, factors: HealthFactor[]): number {
    if (transFat > 0) {
      factors.push({
        category: 'Trans Fat Present',
        impact: 'negative',
        points: -15,
        description: `Contains ${transFat}g of trans fat per serving`
      });
      return -15;
    }
    return 0;
  }
  
  /**
   * Apply fiber bonus
   * Requirement 4.6: Reward high fiber
   * - >3g: +5 points
   * - >5g: +10 points
   */
  private applyFiberBonus(fiber: number, factors: HealthFactor[]): number {
    if (fiber > 5) {
      factors.push({
        category: 'Very High Fiber',
        impact: 'positive',
        points: 10,
        description: `Contains ${fiber}g of dietary fiber per serving (excellent)`
      });
      return 10;
    } else if (fiber > 3) {
      factors.push({
        category: 'High Fiber',
        impact: 'positive',
        points: 5,
        description: `Contains ${fiber}g of dietary fiber per serving (good)`
      });
      return 5;
    }
    return 0;
  }
  
  /**
   * Apply protein bonus
   * Requirement 4.7: Reward high protein
   * - >10g: +5 points
   * - >20g: +10 points
   */
  private applyProteinBonus(protein: number, factors: HealthFactor[]): number {
    if (protein > 20) {
      factors.push({
        category: 'Very High Protein',
        impact: 'positive',
        points: 10,
        description: `Contains ${protein}g of protein per serving (excellent)`
      });
      return 10;
    } else if (protein > 10) {
      factors.push({
        category: 'High Protein',
        impact: 'positive',
        points: 5,
        description: `Contains ${protein}g of protein per serving (good)`
      });
      return 5;
    }
    return 0;
  }
  
  /**
   * Calculate ingredient-based score
   * Requirements 4.8-4.10: Penalize artificial additives
   * - Each preservative: -5 points
   * - Each sweetener: -5 points
   * - Each artificial color: -3 points
   */
  private calculateIngredientScore(ingredients: IngredientList, factors: HealthFactor[]): number {
    let score = 0;
    
    // Penalize preservatives (Requirement 4.8)
    const preservativeCount = ingredients.preservatives.length;
    if (preservativeCount > 0) {
      const penalty = preservativeCount * -5;
      factors.push({
        category: 'Artificial Preservatives',
        impact: 'negative',
        points: penalty,
        description: `Contains ${preservativeCount} artificial preservative${preservativeCount > 1 ? 's' : ''}`
      });
      score += penalty;
    }
    
    // Penalize sweeteners (Requirement 4.9)
    const sweetenerCount = ingredients.sweeteners.length;
    if (sweetenerCount > 0) {
      const penalty = sweetenerCount * -5;
      factors.push({
        category: 'Artificial Sweeteners',
        impact: 'negative',
        points: penalty,
        description: `Contains ${sweetenerCount} artificial sweetener${sweetenerCount > 1 ? 's' : ''}`
      });
      score += penalty;
    }
    
    // Penalize artificial colors (Requirement 4.10)
    const colorCount = ingredients.artificialColors.length;
    if (colorCount > 0) {
      const penalty = colorCount * -3;
      factors.push({
        category: 'Artificial Colors',
        impact: 'negative',
        points: penalty,
        description: `Contains ${colorCount} artificial color${colorCount > 1 ? 's' : ''}`
      });
      score += penalty;
    }
    
    return score;
  }
  
  /**
   * Classify score into category
   * Requirement 4.11: Score category classification
   * - 80-100: Excellent
   * - 60-79: Good
   * - 40-59: Fair
   * - 20-39: Poor
   * - 0-19: Very Poor
   */
  private classifyScore(score: number): HealthCategory {
    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    if (score >= 40) return 'fair';
    if (score >= 20) return 'poor';
    return 'very_poor';
  }
  
  /**
   * Generate explanation for the score
   * Requirement 4.12: Provide brief explanation highlighting key factors
   */
  private generateExplanation(score: number, category: HealthCategory, factors: HealthFactor[]): string {
    const categoryLabels: Record<HealthCategory, string> = {
      excellent: 'Excellent',
      good: 'Good',
      fair: 'Fair',
      poor: 'Poor',
      very_poor: 'Very Poor'
    };
    
    const positiveFactors = factors.filter(f => f.impact === 'positive');
    const negativeFactors = factors.filter(f => f.impact === 'negative');
    
    let explanation = `This product scores ${score}/100 in the '${categoryLabels[category]}' range. `;
    
    if (positiveFactors.length > 0) {
      const positiveCategories = positiveFactors.map(f => f.category.toLowerCase()).join(', ');
      explanation += `Positive factors include ${positiveCategories}. `;
    }
    
    if (negativeFactors.length > 0) {
      const negativeCategories = negativeFactors.map(f => f.category.toLowerCase()).join(', ');
      explanation += `Concerns include ${negativeCategories}. `;
    }
    
    if (positiveFactors.length === 0 && negativeFactors.length === 0) {
      explanation += 'This product has average nutritional content with no significant positive or negative factors.';
    }
    
    return explanation.trim();
  }
}
