/**
 * Unit tests for InsightsDisplay component
 * 
 * Tests rendering of analysis results, multiple products,
 * empty results handling, and SmartBadge integration.
 */

import { render, screen } from '@testing-library/react';
import InsightsDisplay from '../InsightsDisplay';
import { AnalysisResult } from '@/lib/types';

describe('InsightsDisplay', () => {
  describe('Empty results handling', () => {
    it('should display helpful message when no products detected', () => {
      const emptyResults: AnalysisResult = {
        products: []
      };

      render(<InsightsDisplay results={emptyResults} />);

      expect(screen.getByText('No products detected')).toBeInTheDocument();
      expect(screen.getByText(/Please capture a clearer image/i)).toBeInTheDocument();
    });

    it('should handle null results gracefully', () => {
      render(<InsightsDisplay results={null as any} />);

      expect(screen.getByText('No products detected')).toBeInTheDocument();
    });

    it('should handle undefined products array', () => {
      const invalidResults = {} as AnalysisResult;

      render(<InsightsDisplay results={invalidResults} />);

      expect(screen.getByText('No products detected')).toBeInTheDocument();
    });
  });

  describe('Single product rendering', () => {
    const singleProductResult: AnalysisResult = {
      products: [
        {
          productName: 'Organic Almond Milk',
          insights: {
            health: {
              rating: 'Good',
              explanation: 'Low in calories and fortified with vitamins.'
            },
            sustainability: {
              rating: 'Yes',
              explanation: 'Certified organic and sustainably sourced.'
            },
            carbon: {
              rating: 'Low',
              explanation: 'Minimal carbon footprint in production.'
            },
            preservatives: {
              rating: 'None',
              explanation: 'No artificial preservatives detected.'
            },
            allergies: {
              rating: 'Tree nuts',
              explanation: 'Contains almonds, may not be suitable for nut allergies.'
            }
          }
        }
      ]
    };

    it('should render product name as header', () => {
      render(<InsightsDisplay results={singleProductResult} />);

      expect(screen.getByText('Organic Almond Milk')).toBeInTheDocument();
      expect(screen.getByText('Organic Almond Milk').tagName).toBe('H2');
    });

    it('should render all five insight categories', () => {
      render(<InsightsDisplay results={singleProductResult} />);

      // Check for category names
      expect(screen.getByText('Health')).toBeInTheDocument();
      expect(screen.getByText('Responsibly Produced')).toBeInTheDocument();
      expect(screen.getByText('Carbon Impact')).toBeInTheDocument();
      expect(screen.getByText('Preservatives')).toBeInTheDocument();
      expect(screen.getByText('Allergies')).toBeInTheDocument();
    });

    it('should display ratings for each category', () => {
      render(<InsightsDisplay results={singleProductResult} />);

      expect(screen.getByText('Good')).toBeInTheDocument();
      expect(screen.getByText('Yes')).toBeInTheDocument();
      expect(screen.getByText('Low')).toBeInTheDocument();
      expect(screen.getByText('None')).toBeInTheDocument();
      expect(screen.getByText('Tree nuts')).toBeInTheDocument();
    });

    it('should display explanations for each category', () => {
      render(<InsightsDisplay results={singleProductResult} />);

      expect(screen.getByText(/Low in calories and fortified/i)).toBeInTheDocument();
      expect(screen.getByText(/Certified organic/i)).toBeInTheDocument();
      expect(screen.getByText(/Minimal carbon footprint/i)).toBeInTheDocument();
      expect(screen.getByText(/No artificial preservatives/i)).toBeInTheDocument();
      expect(screen.getByText(/Contains almonds/i)).toBeInTheDocument();
    });
  });

  describe('Multiple products rendering', () => {
    const multipleProductsResult: AnalysisResult = {
      products: [
        {
          productName: 'Greek Yogurt',
          insights: {
            health: {
              rating: 'Excellent',
              explanation: 'High in protein and probiotics.'
            },
            sustainability: {
              rating: 'Partial',
              explanation: 'Some sustainable practices in place.'
            },
            carbon: {
              rating: 'Medium',
              explanation: 'Moderate carbon footprint from dairy production.'
            },
            preservatives: {
              rating: 'None',
              explanation: 'Natural product with no preservatives.'
            },
            allergies: {
              rating: 'Dairy',
              explanation: 'Contains milk, not suitable for lactose intolerant.'
            }
          }
        },
        {
          productName: 'Whole Wheat Bread',
          insights: {
            health: {
              rating: 'Good',
              explanation: 'Whole grains provide fiber and nutrients.'
            },
            sustainability: {
              rating: 'Yes',
              explanation: 'Made from sustainably grown wheat.'
            },
            carbon: {
              rating: 'Low',
              explanation: 'Low environmental impact.'
            },
            preservatives: {
              rating: 'Some',
              explanation: 'Contains calcium propionate to extend shelf life.'
            },
            allergies: {
              rating: 'Gluten',
              explanation: 'Contains wheat gluten.'
            }
          }
        },
        {
          productName: 'Orange Juice',
          insights: {
            health: {
              rating: 'Fair',
              explanation: 'High in vitamin C but also high in sugar.'
            },
            sustainability: {
              rating: 'Unknown',
              explanation: 'Sustainability information not available.'
            },
            carbon: {
              rating: 'Medium',
              explanation: 'Transportation and processing contribute to footprint.'
            },
            preservatives: {
              rating: 'None',
              explanation: 'Fresh juice with no added preservatives.'
            },
            allergies: {
              rating: 'None detected',
              explanation: 'No common allergens present.'
            }
          }
        }
      ]
    };

    it('should render all product names', () => {
      render(<InsightsDisplay results={multipleProductsResult} />);

      expect(screen.getByText('Greek Yogurt')).toBeInTheDocument();
      expect(screen.getByText('Whole Wheat Bread')).toBeInTheDocument();
      expect(screen.getByText('Orange Juice')).toBeInTheDocument();
    });

    it('should render insights for each product separately', () => {
      render(<InsightsDisplay results={multipleProductsResult} />);

      // Check that each product has its own set of insights
      const healthLabels = screen.getAllByText('Health');
      expect(healthLabels).toHaveLength(3);

      const sustainabilityLabels = screen.getAllByText('Responsibly Produced');
      expect(sustainabilityLabels).toHaveLength(3);
    });

    it('should display correct ratings for each product', () => {
      render(<InsightsDisplay results={multipleProductsResult} />);

      // Greek Yogurt ratings
      expect(screen.getByText('Excellent')).toBeInTheDocument();
      expect(screen.getByText('Partial')).toBeInTheDocument();
      
      // Whole Wheat Bread ratings
      expect(screen.getByText('Some')).toBeInTheDocument();
      expect(screen.getByText('Gluten')).toBeInTheDocument();
      
      // Orange Juice ratings
      expect(screen.getByText('Fair')).toBeInTheDocument();
      expect(screen.getByText('Unknown')).toBeInTheDocument();
    });

    it('should maintain proper structure with multiple products', () => {
      const { container } = render(<InsightsDisplay results={multipleProductsResult} />);

      // Check that there are 3 product containers
      const productContainers = container.querySelectorAll('.bg-white.rounded-lg');
      expect(productContainers).toHaveLength(3);
    });
  });

  describe('Accessibility', () => {
    const testResult: AnalysisResult = {
      products: [
        {
          productName: 'Test Product',
          insights: {
            health: {
              rating: 'Good',
              explanation: 'Test explanation'
            },
            sustainability: {
              rating: 'Yes',
              explanation: 'Test explanation'
            },
            carbon: {
              rating: 'Low',
              explanation: 'Test explanation'
            },
            preservatives: {
              rating: 'None',
              explanation: 'Test explanation'
            },
            allergies: {
              rating: 'None detected',
              explanation: 'Test explanation'
            }
          }
        }
      ]
    };

    it('should have proper ARIA labels', () => {
      render(<InsightsDisplay results={testResult} />);

      const region = screen.getByRole('region', { name: /product analysis results/i });
      expect(region).toBeInTheDocument();
    });

    it('should have scrollable container for long content', () => {
      const { container } = render(<InsightsDisplay results={testResult} />);

      const scrollableContainer = container.querySelector('.overflow-y-auto');
      expect(scrollableContainer).toBeInTheDocument();
      expect(scrollableContainer).toHaveClass('max-h-[70vh]');
    });
  });

  describe('Edge cases', () => {
    it('should handle products with unusual names', () => {
      const result: AnalysisResult = {
        products: [
          {
            productName: 'Product with "Quotes" & Special <Characters>',
            insights: {
              health: { rating: 'Good', explanation: 'Test' },
              sustainability: { rating: 'Yes', explanation: 'Test' },
              carbon: { rating: 'Low', explanation: 'Test' },
              preservatives: { rating: 'None', explanation: 'Test' },
              allergies: { rating: 'None', explanation: 'Test' }
            }
          }
        ]
      };

      render(<InsightsDisplay results={result} />);

      expect(screen.getByText(/Product with "Quotes" & Special <Characters>/)).toBeInTheDocument();
    });

    it('should handle very long product names', () => {
      const result: AnalysisResult = {
        products: [
          {
            productName: 'This is a very long product name that might wrap to multiple lines in the UI and should still be displayed correctly',
            insights: {
              health: { rating: 'Good', explanation: 'Test' },
              sustainability: { rating: 'Yes', explanation: 'Test' },
              carbon: { rating: 'Low', explanation: 'Test' },
              preservatives: { rating: 'None', explanation: 'Test' },
              allergies: { rating: 'None', explanation: 'Test' }
            }
          }
        ]
      };

      render(<InsightsDisplay results={result} />);

      expect(screen.getByText(/This is a very long product name/)).toBeInTheDocument();
    });

    it('should handle empty string product names', () => {
      const result: AnalysisResult = {
        products: [
          {
            productName: '',
            insights: {
              health: { rating: 'Good', explanation: 'Test' },
              sustainability: { rating: 'Yes', explanation: 'Test' },
              carbon: { rating: 'Low', explanation: 'Test' },
              preservatives: { rating: 'None', explanation: 'Test' },
              allergies: { rating: 'None', explanation: 'Test' }
            }
          }
        ]
      };

      const { container } = render(<InsightsDisplay results={result} />);

      // Should still render the product container
      const productContainers = container.querySelectorAll('.bg-white.rounded-lg');
      expect(productContainers).toHaveLength(1);
    });
  });
});
