/**
 * Unit tests for Gemini utility functions
 * 
 * Tests the parseGeminiResponse function to ensure it properly validates
 * and parses Gemini API responses according to requirements 3.5 and 3.6.
 */

import { parseGeminiResponse, constructPrompt } from '../gemini';
import { AnalysisResult } from '../types';

describe('constructPrompt', () => {
  it('should return a non-empty string', () => {
    const prompt = constructPrompt();
    expect(prompt).toBeTruthy();
    expect(typeof prompt).toBe('string');
    expect(prompt.length).toBeGreaterThan(0);
  });

  it('should include required keywords for product analysis', () => {
    const prompt = constructPrompt();
    expect(prompt).toContain('grocery products');
    expect(prompt).toContain('Health');
    expect(prompt).toContain('Responsibly Produced');
    expect(prompt).toContain('Carbon Impact');
    expect(prompt).toContain('Preservatives');
    expect(prompt).toContain('Allergies');
    expect(prompt).toContain('JSON');
  });
});

describe('parseGeminiResponse', () => {
  describe('valid responses', () => {
    it('should parse a valid response with one product', () => {
      const validResponse = JSON.stringify([
        {
          productName: 'Organic Milk',
          insights: {
            health: { rating: 'Good', explanation: 'High in calcium and protein.' },
            sustainability: { rating: 'Yes', explanation: 'Organic farming practices.' },
            carbon: { rating: 'Low', explanation: 'Local production reduces emissions.' },
            preservatives: { rating: 'None', explanation: 'No artificial preservatives.' },
            allergies: { rating: 'Dairy', explanation: 'Contains milk allergens.' }
          }
        }
      ]);

      const result = parseGeminiResponse(validResponse);
      
      expect(result).toBeDefined();
      expect(result.products).toHaveLength(1);
      expect(result.products[0].productName).toBe('Organic Milk');
      expect(result.products[0].insights.health.rating).toBe('Good');
      expect(result.products[0].insights.sustainability.rating).toBe('Yes');
      expect(result.products[0].insights.carbon.rating).toBe('Low');
      expect(result.products[0].insights.preservatives.rating).toBe('None');
      expect(result.products[0].insights.allergies.rating).toBe('Dairy');
    });

    it('should parse a valid response with multiple products', () => {
      const validResponse = JSON.stringify([
        {
          productName: 'Product 1',
          insights: {
            health: { rating: 'Good', explanation: 'Healthy.' },
            sustainability: { rating: 'Yes', explanation: 'Sustainable.' },
            carbon: { rating: 'Low', explanation: 'Low carbon.' },
            preservatives: { rating: 'None', explanation: 'No preservatives.' },
            allergies: { rating: 'None detected', explanation: 'No allergens.' }
          }
        },
        {
          productName: 'Product 2',
          insights: {
            health: { rating: 'Fair', explanation: 'Moderate health.' },
            sustainability: { rating: 'Partial', explanation: 'Some sustainability.' },
            carbon: { rating: 'Medium', explanation: 'Medium carbon.' },
            preservatives: { rating: 'Some', explanation: 'Some preservatives.' },
            allergies: { rating: 'Gluten', explanation: 'Contains gluten.' }
          }
        }
      ]);

      const result = parseGeminiResponse(validResponse);
      
      expect(result.products).toHaveLength(2);
      expect(result.products[0].productName).toBe('Product 1');
      expect(result.products[1].productName).toBe('Product 2');
    });

    it('should parse an empty array (no products detected)', () => {
      const emptyResponse = JSON.stringify([]);
      
      const result = parseGeminiResponse(emptyResponse);
      
      expect(result.products).toHaveLength(0);
      expect(result.products).toEqual([]);
    });
  });

  describe('invalid JSON', () => {
    it('should throw error for invalid JSON', () => {
      const invalidJson = 'not valid json {]';
      
      expect(() => parseGeminiResponse(invalidJson)).toThrow(
        'Invalid JSON response from Gemini: Unable to parse response'
      );
    });

    it('should throw error for empty string', () => {
      expect(() => parseGeminiResponse('')).toThrow(
        'Invalid JSON response from Gemini: Unable to parse response'
      );
    });
  });

  describe('invalid structure', () => {
    it('should throw error when response is not an array', () => {
      const notArray = JSON.stringify({ products: [] });
      
      expect(() => parseGeminiResponse(notArray)).toThrow(
        'Invalid response structure: Expected an array of products'
      );
    });

    it('should throw error when product is not an object', () => {
      const invalidProduct = JSON.stringify(['string product']);
      
      expect(() => parseGeminiResponse(invalidProduct)).toThrow(
        'Invalid product at index 0: Expected an object'
      );
    });

    it('should throw error when product is null', () => {
      const nullProduct = JSON.stringify([null]);
      
      expect(() => parseGeminiResponse(nullProduct)).toThrow(
        'Invalid product at index 0: Expected an object'
      );
    });
  });

  describe('missing required fields', () => {
    it('should throw error when productName is missing', () => {
      const missingName = JSON.stringify([
        {
          insights: {
            health: { rating: 'Good', explanation: 'Healthy.' },
            sustainability: { rating: 'Yes', explanation: 'Sustainable.' },
            carbon: { rating: 'Low', explanation: 'Low carbon.' },
            preservatives: { rating: 'None', explanation: 'No preservatives.' },
            allergies: { rating: 'None detected', explanation: 'No allergens.' }
          }
        }
      ]);
      
      expect(() => parseGeminiResponse(missingName)).toThrow(
        'Invalid product at index 0: Missing or empty productName'
      );
    });

    it('should throw error when productName is empty string', () => {
      const emptyName = JSON.stringify([
        {
          productName: '   ',
          insights: {
            health: { rating: 'Good', explanation: 'Healthy.' },
            sustainability: { rating: 'Yes', explanation: 'Sustainable.' },
            carbon: { rating: 'Low', explanation: 'Low carbon.' },
            preservatives: { rating: 'None', explanation: 'No preservatives.' },
            allergies: { rating: 'None detected', explanation: 'No allergens.' }
          }
        }
      ]);
      
      expect(() => parseGeminiResponse(emptyName)).toThrow(
        'Invalid product at index 0: Missing or empty productName'
      );
    });

    it('should throw error when insights object is missing', () => {
      const missingInsights = JSON.stringify([
        {
          productName: 'Test Product'
        }
      ]);
      
      expect(() => parseGeminiResponse(missingInsights)).toThrow(
        'Invalid product at index 0: Missing insights object'
      );
    });
  });

  describe('missing insight categories', () => {
    const createProductWithMissingCategory = (missingCategory: string) => {
      const insights: any = {
        health: { rating: 'Good', explanation: 'Healthy.' },
        sustainability: { rating: 'Yes', explanation: 'Sustainable.' },
        carbon: { rating: 'Low', explanation: 'Low carbon.' },
        preservatives: { rating: 'None', explanation: 'No preservatives.' },
        allergies: { rating: 'None detected', explanation: 'No allergens.' }
      };
      delete insights[missingCategory];
      
      return JSON.stringify([
        {
          productName: 'Test Product',
          insights
        }
      ]);
    };

    it('should throw error when health insight is missing', () => {
      const response = createProductWithMissingCategory('health');
      
      expect(() => parseGeminiResponse(response)).toThrow(
        'Invalid product "Test Product": Missing or invalid "health" insight'
      );
    });

    it('should throw error when sustainability insight is missing', () => {
      const response = createProductWithMissingCategory('sustainability');
      
      expect(() => parseGeminiResponse(response)).toThrow(
        'Invalid product "Test Product": Missing or invalid "sustainability" insight'
      );
    });

    it('should throw error when carbon insight is missing', () => {
      const response = createProductWithMissingCategory('carbon');
      
      expect(() => parseGeminiResponse(response)).toThrow(
        'Invalid product "Test Product": Missing or invalid "carbon" insight'
      );
    });

    it('should throw error when preservatives insight is missing', () => {
      const response = createProductWithMissingCategory('preservatives');
      
      expect(() => parseGeminiResponse(response)).toThrow(
        'Invalid product "Test Product": Missing or invalid "preservatives" insight'
      );
    });

    it('should throw error when allergies insight is missing', () => {
      const response = createProductWithMissingCategory('allergies');
      
      expect(() => parseGeminiResponse(response)).toThrow(
        'Invalid product "Test Product": Missing or invalid "allergies" insight'
      );
    });
  });

  describe('invalid insight fields', () => {
    it('should throw error when rating is missing', () => {
      const missingRating = JSON.stringify([
        {
          productName: 'Test Product',
          insights: {
            health: { explanation: 'Healthy.' },
            sustainability: { rating: 'Yes', explanation: 'Sustainable.' },
            carbon: { rating: 'Low', explanation: 'Low carbon.' },
            preservatives: { rating: 'None', explanation: 'No preservatives.' },
            allergies: { rating: 'None detected', explanation: 'No allergens.' }
          }
        }
      ]);
      
      expect(() => parseGeminiResponse(missingRating)).toThrow(
        'Invalid product "Test Product": Missing or empty rating for "health" insight'
      );
    });

    it('should throw error when rating is empty string', () => {
      const emptyRating = JSON.stringify([
        {
          productName: 'Test Product',
          insights: {
            health: { rating: '  ', explanation: 'Healthy.' },
            sustainability: { rating: 'Yes', explanation: 'Sustainable.' },
            carbon: { rating: 'Low', explanation: 'Low carbon.' },
            preservatives: { rating: 'None', explanation: 'No preservatives.' },
            allergies: { rating: 'None detected', explanation: 'No allergens.' }
          }
        }
      ]);
      
      expect(() => parseGeminiResponse(emptyRating)).toThrow(
        'Invalid product "Test Product": Missing or empty rating for "health" insight'
      );
    });

    it('should throw error when explanation is missing', () => {
      const missingExplanation = JSON.stringify([
        {
          productName: 'Test Product',
          insights: {
            health: { rating: 'Good' },
            sustainability: { rating: 'Yes', explanation: 'Sustainable.' },
            carbon: { rating: 'Low', explanation: 'Low carbon.' },
            preservatives: { rating: 'None', explanation: 'No preservatives.' },
            allergies: { rating: 'None detected', explanation: 'No allergens.' }
          }
        }
      ]);
      
      expect(() => parseGeminiResponse(missingExplanation)).toThrow(
        'Invalid product "Test Product": Missing or empty explanation for "health" insight'
      );
    });

    it('should throw error when explanation is empty string', () => {
      const emptyExplanation = JSON.stringify([
        {
          productName: 'Test Product',
          insights: {
            health: { rating: 'Good', explanation: '   ' },
            sustainability: { rating: 'Yes', explanation: 'Sustainable.' },
            carbon: { rating: 'Low', explanation: 'Low carbon.' },
            preservatives: { rating: 'None', explanation: 'No preservatives.' },
            allergies: { rating: 'None detected', explanation: 'No allergens.' }
          }
        }
      ]);
      
      expect(() => parseGeminiResponse(emptyExplanation)).toThrow(
        'Invalid product "Test Product": Missing or empty explanation for "health" insight'
      );
    });
  });
});
