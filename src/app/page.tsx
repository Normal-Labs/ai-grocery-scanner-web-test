'use client';

/**
 * Landing Page (V2 Design)
 * 
 * New design for the home/landing page using V2 Design System.
 * Clean, focused interface with prominent scan button.
 */

import { useState, useEffect } from 'react';
import { Camera, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { HamburgerMenu } from '@/components/v2/HamburgerMenu';

interface ExampleProduct {
  name: string;
  brand: string;
  grade: string;
  emoji: string;
}

export default function HomePage() {
  const router = useRouter();
  const [loadingExample, setLoadingExample] = useState(false);
  const [exampleProduct, setExampleProduct] = useState<ExampleProduct>({
    name: 'Loading...',
    brand: '',
    grade: '—',
    emoji: '🥫',
  });

  // Load example product info on mount
  useEffect(() => {
    const loadExampleInfo = async () => {
      try {
        const response = await fetch('/api/example-product');
        if (response.ok) {
          const data = await response.json();
          
          // Extract product info
          const name = data.steps.packaging?.data?.productName || 'Example Product';
          const brand = data.steps.packaging?.data?.brand || 'Brand';
          
          // Calculate grade from scores
          const scores = [];
          if (data.healthDimension) scores.push(data.healthDimension.score);
          if (data.processingDimension) scores.push(data.processingDimension.score);
          if (data.allergensDimension) scores.push(data.allergensDimension.score);
          
          let grade = '—';
          if (scores.length > 0) {
            const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
            if (avg >= 90) grade = 'A+';
            else if (avg >= 85) grade = 'A';
            else if (avg >= 80) grade = 'A-';
            else if (avg >= 75) grade = 'B+';
            else if (avg >= 70) grade = 'B';
            else if (avg >= 65) grade = 'B-';
            else if (avg >= 60) grade = 'C+';
            else if (avg >= 55) grade = 'C';
            else grade = 'D';
          }
          
          // Get emoji based on product name
          const getEmoji = (productName: string): string => {
            const lower = productName.toLowerCase();
            if (lower.includes('cereal') || lower.includes('oat')) return '🥣';
            if (lower.includes('milk')) return '🥛';
            if (lower.includes('yogurt')) return '🥄';
            if (lower.includes('bread')) return '🍞';
            if (lower.includes('oil') || lower.includes('olive')) return '🫒';
            if (lower.includes('chocolate')) return '🍫';
            if (lower.includes('cheese')) return '🧀';
            if (lower.includes('egg')) return '🥚';
            if (lower.includes('juice')) return '🧃';
            if (lower.includes('water')) return '💧';
            if (lower.includes('coffee')) return '☕';
            if (lower.includes('tea')) return '🍵';
            return '🥫';
          };
          
          setExampleProduct({
            name,
            brand,
            grade,
            emoji: getEmoji(name),
          });
        }
      } catch (error) {
        console.error('[Home] Failed to load example product info:', error);
      }
    };
    
    loadExampleInfo();
  }, []);

  const handleTryExample = async () => {
    setLoadingExample(true);
    
    try {
      // Fetch the example product from API
      const response = await fetch('/api/example-product');
      
      if (!response.ok) {
        console.error('[Home] Failed to load example product');
        setLoadingExample(false);
        return;
      }

      const extractionResult = await response.json();
      
      console.log('[Home] Loaded example product');

      // Save to localStorage for results page
      localStorage.setItem('currentScanResult', JSON.stringify(extractionResult));

      // Navigate to results page
      router.push('/results');
    } catch (err) {
      console.error('[Home] Error loading example:', err);
      setLoadingExample(false);
    }
  };

  const handleNewScan = () => {
    // Clear incomplete scan state when starting a fresh scan
    localStorage.removeItem('incompleteScanProductId');
    localStorage.removeItem('cameraInstructions');
    console.log('[Home] 🆕 Starting new scan - cleared incomplete scan state');
    router.push('/scan');
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="max-w-md mx-auto w-full min-h-screen flex flex-col bg-background shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">AI Product Scan</h1>
          <p className="text-xs text-muted-foreground">Know what you buy</p>
        </div>
        
        <HamburgerMenu />
      </div>

      {/* Example Product */}
      <div className="px-5 py-3">
        <button
          onClick={handleTryExample}
          disabled={loadingExample}
          className="w-full bg-card rounded-2xl p-4 border border-border text-left hover:border-accent transition-colors active:scale-[0.98] disabled:opacity-50"
        >
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-accent" />
            <span className="text-xs font-medium text-muted-foreground">
              {loadingExample ? 'Loading...' : 'Try an example'}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">{exampleProduct.name}</p>
              <p className="text-xs text-muted-foreground">{exampleProduct.brand}</p>
            </div>
            <div className={`px-2 py-1 rounded-full ${
              exampleProduct.grade.startsWith('A') ? 'bg-success/10' :
              exampleProduct.grade.startsWith('B') ? 'bg-warning/10' :
              'bg-muted/10'
            }`}>
              <span className={`text-xs font-medium ${
                exampleProduct.grade.startsWith('A') ? 'text-success' :
                exampleProduct.grade.startsWith('B') ? 'text-warning' :
                'text-muted-foreground'
              }`}>
                {exampleProduct.grade}
              </span>
            </div>
          </div>
        </button>
      </div>

      {/* Main scan area */}
      <div className="flex-1 flex flex-col items-center justify-center px-5">
        <div className="relative">
          {/* Scan button - central camera icon */}
          <button
            onClick={handleNewScan}
            className="w-36 h-36 rounded-full bg-primary flex items-center justify-center shadow-lg hover:scale-105 transition-transform active:scale-95"
          >
            <Camera className="w-14 h-14 text-primary-foreground" />
          </button>
          {/* Pulse rings */}
          <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping pointer-events-none" style={{ animationDuration: '2s' }} />
          <div className="absolute -inset-4 rounded-full border border-primary/10 animate-ping pointer-events-none" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }} />
        </div>
        <p className="mt-6 text-sm font-medium text-foreground">Tap to scan a product</p>
        <p className="mt-1 text-xs text-muted-foreground">Point at barcode or product label</p>
      </div>

      {/* Bottom navigation */}
      <div className="px-5 pb-8">
        <Button 
          className="w-full h-12 rounded-xl" 
          onClick={handleNewScan}
        >
          <Camera className="w-5 h-5 mr-2" />
          Scan
        </Button>
      </div>
      </div>
    </div>
  );
}
