/**
 * Unit tests for SmartBadge component
 * 
 * Tests rendering with different categories, color coding for various ratings,
 * and proper display of all text content.
 * 
 * Requirements: 5.5, 5.6, 5.7
 */

import { render, screen } from '@testing-library/react';
import SmartBadge from '../SmartBadge';
import { InsightCategory } from '@/lib/types';

describe('SmartBadge', () => {
  describe('rendering with different categories', () => {
    it('should render health category with correct icon and name', () => {
      render(
        <SmartBadge
          category="health"
          rating="Good"
          explanation="This product is healthy"
        />
      );

      expect(screen.getByText('Health')).toBeInTheDocument();
      expect(screen.getByText('❤️')).toBeInTheDocument();
      expect(screen.getByText('Good')).toBeInTheDocument();
      expect(screen.getByText('This product is healthy')).toBeInTheDocument();
    });

    it('should render sustainability category with correct icon and name', () => {
      render(
        <SmartBadge
          category="sustainability"
          rating="Yes"
          explanation="Sustainably produced"
        />
      );

      expect(screen.getByText('Responsibly Produced')).toBeInTheDocument();
      expect(screen.getByText('🌿')).toBeInTheDocument();
      expect(screen.getByText('Yes')).toBeInTheDocument();
    });

    it('should render carbon category with correct icon and name', () => {
      render(
        <SmartBadge
          category="carbon"
          rating="Low"
          explanation="Low carbon footprint"
        />
      );

      expect(screen.getByText('Carbon Impact')).toBeInTheDocument();
      expect(screen.getByText('🌍')).toBeInTheDocument();
      expect(screen.getByText('Low')).toBeInTheDocument();
    });

    it('should render preservatives category with correct icon and name', () => {
      render(
        <SmartBadge
          category="preservatives"
          rating="None"
          explanation="No preservatives detected"
        />
      );

      expect(screen.getByText('Preservatives')).toBeInTheDocument();
      expect(screen.getByText('🧪')).toBeInTheDocument();
      expect(screen.getByText('None')).toBeInTheDocument();
    });

    it('should render allergies category with correct icon and name', () => {
      render(
        <SmartBadge
          category="allergies"
          rating="None detected"
          explanation="No common allergens found"
        />
      );

      expect(screen.getByText('Allergies')).toBeInTheDocument();
      expect(screen.getByText('⚠️')).toBeInTheDocument();
      expect(screen.getByText('None detected')).toBeInTheDocument();
    });
  });

  describe('color coding for ratings', () => {
    it('should apply green color for positive ratings', () => {
      const { container } = render(
        <SmartBadge
          category="health"
          rating="Good"
          explanation="Healthy product"
        />
      );

      const badge = container.querySelector('[role="article"]');
      expect(badge).toHaveClass('bg-green-100', 'border-green-500', 'text-green-900');
    });

    it('should apply green color for "Low" rating', () => {
      const { container } = render(
        <SmartBadge
          category="carbon"
          rating="Low"
          explanation="Low carbon impact"
        />
      );

      const badge = container.querySelector('[role="article"]');
      expect(badge).toHaveClass('bg-green-100', 'border-green-500', 'text-green-900');
    });

    it('should apply green color for "None" rating', () => {
      const { container } = render(
        <SmartBadge
          category="preservatives"
          rating="None"
          explanation="No preservatives"
        />
      );

      const badge = container.querySelector('[role="article"]');
      expect(badge).toHaveClass('bg-green-100', 'border-green-500', 'text-green-900');
    });

    it('should apply green color for "Yes" rating', () => {
      const { container } = render(
        <SmartBadge
          category="sustainability"
          rating="Yes"
          explanation="Sustainably produced"
        />
      );

      const badge = container.querySelector('[role="article"]');
      expect(badge).toHaveClass('bg-green-100', 'border-green-500', 'text-green-900');
    });

    it('should apply red color for negative ratings', () => {
      const { container } = render(
        <SmartBadge
          category="health"
          rating="Poor"
          explanation="Unhealthy product"
        />
      );

      const badge = container.querySelector('[role="article"]');
      expect(badge).toHaveClass('bg-red-100', 'border-red-500', 'text-red-900');
    });

    it('should apply red color for "High" rating', () => {
      const { container } = render(
        <SmartBadge
          category="carbon"
          rating="High"
          explanation="High carbon impact"
        />
      );

      const badge = container.querySelector('[role="article"]');
      expect(badge).toHaveClass('bg-red-100', 'border-red-500', 'text-red-900');
    });

    it('should apply red color for "Many" rating', () => {
      const { container } = render(
        <SmartBadge
          category="preservatives"
          rating="Many"
          explanation="Contains many preservatives"
        />
      );

      const badge = container.querySelector('[role="article"]');
      expect(badge).toHaveClass('bg-red-100', 'border-red-500', 'text-red-900');
    });

    it('should apply red color for "No" rating', () => {
      const { container } = render(
        <SmartBadge
          category="sustainability"
          rating="No"
          explanation="Not sustainably produced"
        />
      );

      const badge = container.querySelector('[role="article"]');
      expect(badge).toHaveClass('bg-red-100', 'border-red-500', 'text-red-900');
    });

    it('should apply yellow color for neutral ratings', () => {
      const { container } = render(
        <SmartBadge
          category="health"
          rating="Fair"
          explanation="Moderately healthy"
        />
      );

      const badge = container.querySelector('[role="article"]');
      expect(badge).toHaveClass('bg-yellow-100', 'border-yellow-500', 'text-yellow-900');
    });

    it('should apply yellow color for "Medium" rating', () => {
      const { container } = render(
        <SmartBadge
          category="carbon"
          rating="Medium"
          explanation="Moderate carbon impact"
        />
      );

      const badge = container.querySelector('[role="article"]');
      expect(badge).toHaveClass('bg-yellow-100', 'border-yellow-500', 'text-yellow-900');
    });

    it('should apply yellow color for "Unknown" rating', () => {
      const { container } = render(
        <SmartBadge
          category="health"
          rating="Unknown"
          explanation="Cannot determine health rating"
        />
      );

      const badge = container.querySelector('[role="article"]');
      expect(badge).toHaveClass('bg-yellow-100', 'border-yellow-500', 'text-yellow-900');
    });

    it('should apply yellow color for "Partial" rating', () => {
      const { container } = render(
        <SmartBadge
          category="sustainability"
          rating="Partial"
          explanation="Partially sustainable"
        />
      );

      const badge = container.querySelector('[role="article"]');
      expect(badge).toHaveClass('bg-yellow-100', 'border-yellow-500', 'text-yellow-900');
    });

    it('should apply yellow color for "Some" rating', () => {
      const { container } = render(
        <SmartBadge
          category="preservatives"
          rating="Some"
          explanation="Contains some preservatives"
        />
      );

      const badge = container.querySelector('[role="article"]');
      expect(badge).toHaveClass('bg-yellow-100', 'border-yellow-500', 'text-yellow-900');
    });
  });

  describe('text content rendering', () => {
    it('should display all text content correctly', () => {
      const category: InsightCategory = 'health';
      const rating = 'Good';
      const explanation = 'This is a detailed explanation about the health rating.';

      render(
        <SmartBadge
          category={category}
          rating={rating}
          explanation={explanation}
        />
      );

      expect(screen.getByText('Health')).toBeInTheDocument();
      expect(screen.getByText(rating)).toBeInTheDocument();
      expect(screen.getByText(explanation)).toBeInTheDocument();
    });

    it('should handle long explanations', () => {
      const longExplanation = 'This is a very long explanation that contains multiple sentences. It should wrap properly on mobile devices and maintain readability. The component should handle this gracefully without breaking the layout.';

      render(
        <SmartBadge
          category="health"
          rating="Good"
          explanation={longExplanation}
        />
      );

      expect(screen.getByText(longExplanation)).toBeInTheDocument();
    });

    it('should handle special characters in explanation', () => {
      const explanation = 'Contains allergens: milk, eggs & nuts (trace amounts)';

      render(
        <SmartBadge
          category="allergies"
          rating="Present"
          explanation={explanation}
        />
      );

      expect(screen.getByText(explanation)).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(
        <SmartBadge
          category="health"
          rating="Good"
          explanation="Healthy product"
        />
      );

      const badge = screen.getByRole('article');
      expect(badge).toHaveAttribute('aria-label', 'Health insight');
    });

    it('should have semantic HTML structure', () => {
      render(
        <SmartBadge
          category="health"
          rating="Good"
          explanation="Healthy product"
        />
      );

      // Check for heading
      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toHaveTextContent('Health');
    });
  });
});
