/**
 * Unit tests for HealthScorer Service
 * 
 * Tests all scoring rules, penalties, bonuses, and classification logic.
 * Requirements: 4.1-4.12
 */

import { HealthScorer } from '../health-scorer';
import { NutritionalFacts } from '../nutrition-parser';
import { IngredientList } from '../ingredient-parser';

describe('HealthScorer', () => {
  let scorer: HealthScorer;
  
  beforeEach(() => {
    scorer = new HealthScorer();
  });
  
  // Helper function to create base nutritional facts
  const createBaseFacts = (overrides: Partial<NutritionalFacts> = {}): NutritionalFacts => ({
    servingSize: { amount: 28, unit: 'g', confidence: 0.95 },
    servingsPerContainer: 10,
    calories: { value: 150, confidence: 0.95 },
    totalFat: { value: 5, confidence: 0.95 },
    saturatedFat: { value: 1, confidence: 0.95 },
    transFat: { value: 0, confidence: 0.95 },
    cholesterol: { value: 0, confidence: 0.95 },
    sodium: { value: 100, confidence: 0.95 },
    totalCarbohydrates: { value: 20, confidence: 0.95 },
    dietaryFiber: { value: 2, confidence: 0.95 },
    totalSugars: { value: 5, confidence: 0.95 },
    protein: { value: 5, confidence: 0.95 },
    validationStatus: 'valid',
    ...overrides
  });
  
  // Helper function to create base ingredient list
  const createBaseIngredients = (overrides: Partial<IngredientList> = {}): IngredientList => ({
    rawText: 'flour, sugar, salt',
    ingredients: [],
    allergens: [],
    preservatives: [],
    sweeteners: [],
    artificialColors: [],
    isComplete: true,
    confidence: 0.95,
    ...overrides
  });
  
  describe('Base Scoring', () => {
    it('should start with base score of 100 for neutral product', () => {
      const facts = createBaseFacts();
      const ingredients = createBaseIngredients();
      
      const result = scorer.calculateScore(facts, ingredients);
      
      expect(result.overall).toBe(100);
      expect(result.category).toBe('excellent');
    });
    
    it('should return score between 0 and 100', () => {
      const facts = createBaseFacts({
        sodium: { value: 1000, confidence: 0.95 },
        totalSugars: { value: 30, confidence: 0.95 },
        saturatedFat: { value: 15, confidence: 0.95 },
        transFat: { value: 2, confidence: 0.95 }
      });
      const ingredients = createBaseIngredients();
      
      const result = scorer.calculateScore(facts, ingredients);
      
      expect(result.overall).toBeGreaterThanOrEqual(0);
      expect(result.overall).toBeLessThanOrEqual(100);
    });
  });
  
  describe('Sodium Penalties (Requirement 4.2)', () => {
    it('should apply -10 points for sodium >400mg', () => {
      const facts = createBaseFacts({
        sodium: { value: 450, confidence: 0.95 }
      });
      const ingredients = createBaseIngredients();
      
      const result = scorer.calculateScore(facts, ingredients);
      
      expect(result.overall).toBe(90);
      expect(result.factors).toContainEqual(
        expect.objectContaining({
          category: 'High Sodium',
          impact: 'negative',
          points: -10
        })
      );
    });
    
    it('should apply -20 points for sodium >800mg', () => {
      const facts = createBaseFacts({
        sodium: { value: 900, confidence: 0.95 }
      });
      const ingredients = createBaseIngredients();
      
      const result = scorer.calculateScore(facts, ingredients);
      
      expect(result.overall).toBe(80);
      expect(result.factors).toContainEqual(
        expect.objectContaining({
          category: 'Very High Sodium',
          impact: 'negative',
          points: -20
        })
      );
    });
    
    it('should not penalize sodium <=400mg', () => {
      const facts = createBaseFacts({
        sodium: { value: 400, confidence: 0.95 }
      });
      const ingredients = createBaseIngredients();
      
      const result = scorer.calculateScore(facts, ingredients);
      
      expect(result.overall).toBe(100);
      expect(result.factors.find(f => f.category.includes('Sodium'))).toBeUndefined();
    });
  });
  
  describe('Sugar Penalties (Requirement 4.3)', () => {
    it('should apply -15 points for sugar >10g', () => {
      const facts = createBaseFacts({
        totalSugars: { value: 15, confidence: 0.95 }
      });
      const ingredients = createBaseIngredients();
      
      const result = scorer.calculateScore(facts, ingredients);
      
      expect(result.overall).toBe(85);
      expect(result.factors).toContainEqual(
        expect.objectContaining({
          category: 'High Sugar',
          impact: 'negative',
          points: -15
        })
      );
    });
    
    it('should apply -25 points for sugar >20g', () => {
      const facts = createBaseFacts({
        totalSugars: { value: 25, confidence: 0.95 }
      });
      const ingredients = createBaseIngredients();
      
      const result = scorer.calculateScore(facts, ingredients);
      
      expect(result.overall).toBe(75);
      expect(result.factors).toContainEqual(
        expect.objectContaining({
          category: 'Very High Sugar',
          impact: 'negative',
          points: -25
        })
      );
    });
    
    it('should use addedSugars if available', () => {
      const facts = createBaseFacts({
        totalSugars: { value: 5, confidence: 0.95 },
        addedSugars: { value: 15, confidence: 0.95 }
      });
      const ingredients = createBaseIngredients();
      
      const result = scorer.calculateScore(facts, ingredients);
      
      expect(result.overall).toBe(85);
    });
  });
  
  describe('Saturated Fat Penalties (Requirement 4.4)', () => {
    it('should apply -10 points for saturated fat >5g', () => {
      const facts = createBaseFacts({
        saturatedFat: { value: 7, confidence: 0.95 }
      });
      const ingredients = createBaseIngredients();
      
      const result = scorer.calculateScore(facts, ingredients);
      
      expect(result.overall).toBe(90);
      expect(result.factors).toContainEqual(
        expect.objectContaining({
          category: 'High Saturated Fat',
          impact: 'negative',
          points: -10
        })
      );
    });
    
    it('should apply -20 points for saturated fat >10g', () => {
      const facts = createBaseFacts({
        saturatedFat: { value: 12, confidence: 0.95 }
      });
      const ingredients = createBaseIngredients();
      
      const result = scorer.calculateScore(facts, ingredients);
      
      expect(result.overall).toBe(80);
      expect(result.factors).toContainEqual(
        expect.objectContaining({
          category: 'Very High Saturated Fat',
          impact: 'negative',
          points: -20
        })
      );
    });
  });
  
  describe('Trans Fat Penalties (Requirement 4.5)', () => {
    it('should apply -15 points for any trans fat >0g', () => {
      const facts = createBaseFacts({
        transFat: { value: 0.5, confidence: 0.95 }
      });
      const ingredients = createBaseIngredients();
      
      const result = scorer.calculateScore(facts, ingredients);
      
      expect(result.overall).toBe(85);
      expect(result.factors).toContainEqual(
        expect.objectContaining({
          category: 'Trans Fat Present',
          impact: 'negative',
          points: -15
        })
      );
    });
    
    it('should not penalize 0g trans fat', () => {
      const facts = createBaseFacts({
        transFat: { value: 0, confidence: 0.95 }
      });
      const ingredients = createBaseIngredients();
      
      const result = scorer.calculateScore(facts, ingredients);
      
      expect(result.overall).toBe(100);
      expect(result.factors.find(f => f.category.includes('Trans Fat'))).toBeUndefined();
    });
  });
  
  describe('Fiber Bonuses (Requirement 4.6)', () => {
    it('should apply +5 points for fiber >3g', () => {
      const facts = createBaseFacts({
        dietaryFiber: { value: 4, confidence: 0.95 }
      });
      const ingredients = createBaseIngredients();
      
      const result = scorer.calculateScore(facts, ingredients);
      
      expect(result.overall).toBe(100); // Capped at 100
      expect(result.factors).toContainEqual(
        expect.objectContaining({
          category: 'High Fiber',
          impact: 'positive',
          points: 5
        })
      );
    });
    
    it('should apply +10 points for fiber >5g', () => {
      const facts = createBaseFacts({
        dietaryFiber: { value: 6, confidence: 0.95 }
      });
      const ingredients = createBaseIngredients();
      
      const result = scorer.calculateScore(facts, ingredients);
      
      expect(result.overall).toBe(100); // Capped at 100
      expect(result.factors).toContainEqual(
        expect.objectContaining({
          category: 'Very High Fiber',
          impact: 'positive',
          points: 10
        })
      );
    });
  });
  
  describe('Protein Bonuses (Requirement 4.7)', () => {
    it('should apply +5 points for protein >10g', () => {
      const facts = createBaseFacts({
        protein: { value: 12, confidence: 0.95 }
      });
      const ingredients = createBaseIngredients();
      
      const result = scorer.calculateScore(facts, ingredients);
      
      expect(result.overall).toBe(100); // Capped at 100
      expect(result.factors).toContainEqual(
        expect.objectContaining({
          category: 'High Protein',
          impact: 'positive',
          points: 5
        })
      );
    });
    
    it('should apply +10 points for protein >20g', () => {
      const facts = createBaseFacts({
        protein: { value: 25, confidence: 0.95 }
      });
      const ingredients = createBaseIngredients();
      
      const result = scorer.calculateScore(facts, ingredients);
      
      expect(result.overall).toBe(100); // Capped at 100
      expect(result.factors).toContainEqual(
        expect.objectContaining({
          category: 'Very High Protein',
          impact: 'positive',
          points: 10
        })
      );
    });
  });
  
  describe('Ingredient Penalties (Requirements 4.8-4.10)', () => {
    it('should apply -5 points per preservative', () => {
      const facts = createBaseFacts();
      const ingredients = createBaseIngredients({
        preservatives: [
          { name: 'BHA', position: 5, isAllergen: false, isPreservative: true, isSweetener: false, isArtificialColor: false, preservativeType: 'BHA' },
          { name: 'BHT', position: 6, isAllergen: false, isPreservative: true, isSweetener: false, isArtificialColor: false, preservativeType: 'BHT' }
        ]
      });
      
      const result = scorer.calculateScore(facts, ingredients);
      
      expect(result.overall).toBe(90);
      expect(result.factors).toContainEqual(
        expect.objectContaining({
          category: 'Artificial Preservatives',
          impact: 'negative',
          points: -10
        })
      );
    });
    
    it('should apply -5 points per sweetener', () => {
      const facts = createBaseFacts();
      const ingredients = createBaseIngredients({
        sweeteners: [
          { name: 'aspartame', position: 5, isAllergen: false, isPreservative: false, isSweetener: true, isArtificialColor: false, sweetenerType: 'aspartame' }
        ]
      });
      
      const result = scorer.calculateScore(facts, ingredients);
      
      expect(result.overall).toBe(95);
      expect(result.factors).toContainEqual(
        expect.objectContaining({
          category: 'Artificial Sweeteners',
          impact: 'negative',
          points: -5
        })
      );
    });
    
    it('should apply -3 points per artificial color', () => {
      const facts = createBaseFacts();
      const ingredients = createBaseIngredients({
        artificialColors: [
          { name: 'Red 40', position: 5, isAllergen: false, isPreservative: false, isSweetener: false, isArtificialColor: true, colorType: 'Red 40' },
          { name: 'Yellow 5', position: 6, isAllergen: false, isPreservative: false, isSweetener: false, isArtificialColor: true, colorType: 'Yellow 5' }
        ]
      });
      
      const result = scorer.calculateScore(facts, ingredients);
      
      expect(result.overall).toBe(94);
      expect(result.factors).toContainEqual(
        expect.objectContaining({
          category: 'Artificial Colors',
          impact: 'negative',
          points: -6
        })
      );
    });
  });
  
  describe('Score Category Classification (Requirement 4.11)', () => {
    it('should classify 80-100 as excellent', () => {
      const facts = createBaseFacts();
      const ingredients = createBaseIngredients();
      
      const result = scorer.calculateScore(facts, ingredients);
      
      expect(result.overall).toBeGreaterThanOrEqual(80);
      expect(result.category).toBe('excellent');
    });
    
    it('should classify 60-79 as good', () => {
      const facts = createBaseFacts({
        sodium: { value: 500, confidence: 0.95 },
        totalSugars: { value: 12, confidence: 0.95 }
      });
      const ingredients = createBaseIngredients();
      
      const result = scorer.calculateScore(facts, ingredients);
      
      expect(result.overall).toBeGreaterThanOrEqual(60);
      expect(result.overall).toBeLessThan(80);
      expect(result.category).toBe('good');
    });
    
    it('should classify 40-59 as fair', () => {
      const facts = createBaseFacts({
        sodium: { value: 900, confidence: 0.95 },
        totalSugars: { value: 25, confidence: 0.95 },
        saturatedFat: { value: 7, confidence: 0.95 }
      });
      const ingredients = createBaseIngredients();
      
      const result = scorer.calculateScore(facts, ingredients);
      
      expect(result.overall).toBeGreaterThanOrEqual(40);
      expect(result.overall).toBeLessThan(60);
      expect(result.category).toBe('fair');
    });
    
    it('should classify 20-39 as poor', () => {
      const facts = createBaseFacts({
        sodium: { value: 900, confidence: 0.95 },
        totalSugars: { value: 25, confidence: 0.95 },
        saturatedFat: { value: 7, confidence: 0.95 },
        transFat: { value: 0.5, confidence: 0.95 }
      });
      const ingredients = createBaseIngredients({
        preservatives: [
          { name: 'BHA', position: 5, isAllergen: false, isPreservative: true, isSweetener: false, isArtificialColor: false, preservativeType: 'BHA' }
        ]
      });
      
      const result = scorer.calculateScore(facts, ingredients);
      
      expect(result.overall).toBeGreaterThanOrEqual(20);
      expect(result.overall).toBeLessThan(40);
      expect(result.category).toBe('poor');
    });
    
    it('should classify 0-19 as very_poor', () => {
      const facts = createBaseFacts({
        sodium: { value: 1000, confidence: 0.95 },
        totalSugars: { value: 30, confidence: 0.95 },
        saturatedFat: { value: 15, confidence: 0.95 },
        transFat: { value: 2, confidence: 0.95 }
      });
      const ingredients = createBaseIngredients({
        preservatives: [
          { name: 'BHA', position: 5, isAllergen: false, isPreservative: true, isSweetener: false, isArtificialColor: false, preservativeType: 'BHA' },
          { name: 'BHT', position: 6, isAllergen: false, isPreservative: true, isSweetener: false, isArtificialColor: false, preservativeType: 'BHT' }
        ],
        sweeteners: [
          { name: 'aspartame', position: 7, isAllergen: false, isPreservative: false, isSweetener: true, isArtificialColor: false, sweetenerType: 'aspartame' }
        ]
      });
      
      const result = scorer.calculateScore(facts, ingredients);
      
      expect(result.overall).toBeLessThan(20);
      expect(result.category).toBe('very_poor');
    });
  });
  
  describe('Score Explanation (Requirement 4.12)', () => {
    it('should generate explanation with score and category', () => {
      const facts = createBaseFacts();
      const ingredients = createBaseIngredients();
      
      const result = scorer.calculateScore(facts, ingredients);
      
      expect(result.explanation).toContain('100/100');
      expect(result.explanation).toContain('Excellent');
    });
    
    it('should mention positive factors in explanation', () => {
      const facts = createBaseFacts({
        dietaryFiber: { value: 6, confidence: 0.95 },
        protein: { value: 25, confidence: 0.95 }
      });
      const ingredients = createBaseIngredients();
      
      const result = scorer.calculateScore(facts, ingredients);
      
      expect(result.explanation).toContain('Positive factors');
      expect(result.explanation.toLowerCase()).toContain('fiber');
      expect(result.explanation.toLowerCase()).toContain('protein');
    });
    
    it('should mention negative factors in explanation', () => {
      const facts = createBaseFacts({
        sodium: { value: 900, confidence: 0.95 },
        totalSugars: { value: 25, confidence: 0.95 }
      });
      const ingredients = createBaseIngredients();
      
      const result = scorer.calculateScore(facts, ingredients);
      
      expect(result.explanation).toContain('Concerns');
      expect(result.explanation.toLowerCase()).toContain('sodium');
      expect(result.explanation.toLowerCase()).toContain('sugar');
    });
    
    it('should handle neutral products with no factors', () => {
      const facts = createBaseFacts();
      const ingredients = createBaseIngredients();
      
      const result = scorer.calculateScore(facts, ingredients);
      
      expect(result.explanation).toContain('average nutritional content');
    });
  });
  
  describe('Breakdown', () => {
    it('should provide nutritional and ingredient score breakdown', () => {
      const facts = createBaseFacts({
        sodium: { value: 500, confidence: 0.95 }
      });
      const ingredients = createBaseIngredients({
        preservatives: [
          { name: 'BHA', position: 5, isAllergen: false, isPreservative: true, isSweetener: false, isArtificialColor: false, preservativeType: 'BHA' }
        ]
      });
      
      const result = scorer.calculateScore(facts, ingredients);
      
      expect(result.breakdown.nutritionalScore).toBe(90);
      expect(result.breakdown.ingredientScore).toBe(-5);
      expect(result.overall).toBe(85);
    });
  });
  
  describe('Complex Scenarios', () => {
    it('should handle products with both positive and negative factors', () => {
      const facts = createBaseFacts({
        sodium: { value: 500, confidence: 0.95 },
        dietaryFiber: { value: 6, confidence: 0.95 },
        protein: { value: 15, confidence: 0.95 }
      });
      const ingredients = createBaseIngredients();
      
      const result = scorer.calculateScore(facts, ingredients);
      
      expect(result.overall).toBe(100); // 100 - 10 (sodium) + 10 (fiber) + 5 (protein) = 105, capped at 100
      expect(result.factors.length).toBeGreaterThan(0);
      expect(result.factors.some(f => f.impact === 'positive')).toBe(true);
      expect(result.factors.some(f => f.impact === 'negative')).toBe(true);
    });
    
    it('should cap score at 100 even with high bonuses', () => {
      const facts = createBaseFacts({
        dietaryFiber: { value: 10, confidence: 0.95 },
        protein: { value: 30, confidence: 0.95 }
      });
      const ingredients = createBaseIngredients();
      
      const result = scorer.calculateScore(facts, ingredients);
      
      expect(result.overall).toBe(100);
    });
    
    it('should not go below 0 even with extreme penalties', () => {
      const facts = createBaseFacts({
        sodium: { value: 2000, confidence: 0.95 },
        totalSugars: { value: 50, confidence: 0.95 },
        saturatedFat: { value: 20, confidence: 0.95 },
        transFat: { value: 5, confidence: 0.95 }
      });
      const ingredients = createBaseIngredients({
        preservatives: [
          { name: 'BHA', position: 5, isAllergen: false, isPreservative: true, isSweetener: false, isArtificialColor: false, preservativeType: 'BHA' },
          { name: 'BHT', position: 6, isAllergen: false, isPreservative: true, isSweetener: false, isArtificialColor: false, preservativeType: 'BHT' },
          { name: 'TBHQ', position: 7, isAllergen: false, isPreservative: true, isSweetener: false, isArtificialColor: false, preservativeType: 'TBHQ' }
        ],
        sweeteners: [
          { name: 'aspartame', position: 8, isAllergen: false, isPreservative: false, isSweetener: true, isArtificialColor: false, sweetenerType: 'aspartame' },
          { name: 'sucralose', position: 9, isAllergen: false, isPreservative: false, isSweetener: true, isArtificialColor: false, sweetenerType: 'sucralose' }
        ],
        artificialColors: [
          { name: 'Red 40', position: 10, isAllergen: false, isPreservative: false, isSweetener: false, isArtificialColor: true, colorType: 'Red 40' }
        ]
      });
      
      const result = scorer.calculateScore(facts, ingredients);
      
      expect(result.overall).toBeGreaterThanOrEqual(0);
    });
  });
});
