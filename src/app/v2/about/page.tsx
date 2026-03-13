'use client';

/**
 * V2 About Page
 * 
 * Information about the app and its features.
 */

import { ChevronLeft, Sparkles, Shield, Zap, Heart, Camera } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { HamburgerMenu } from '@/components/v2/HamburgerMenu';

export default function AboutPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background flex justify-center">
      <div className="max-w-md w-full min-h-screen bg-background shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => router.back()}
              className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-foreground" />
            </button>
            <h1 className="text-lg font-semibold text-foreground">About</h1>
          </div>
          
          <HamburgerMenu />
        </div>

        {/* Content */}
        <div className="px-5 py-6 space-y-6 pb-24">{/* Added pb-24 for footer space */}
          {/* App Info */}
          <div className="text-center pb-6 border-b border-border">
            <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Product Scanner</h2>
            <p className="text-sm text-muted-foreground">
              Know what you buy
            </p>
          </div>

          {/* Features */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Features</h3>
            
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-success/10 rounded-xl flex items-center justify-center shrink-0">
                <Heart className="w-5 h-5 text-success" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Health Analysis</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Get detailed nutritional insights and health scores for every product
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-warning/10 rounded-xl flex items-center justify-center shrink-0">
                <Shield className="w-5 h-5 text-warning" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Allergen Detection</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Identify allergens and get safety warnings for dietary restrictions
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-info/10 rounded-xl flex items-center justify-center shrink-0">
                <Zap className="w-5 h-5 text-info" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Processing Level</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Understand how processed your food is and what additives it contains
                </p>
              </div>
            </div>
          </div>

          {/* How It Works */}
          <div className="space-y-4 pt-6 border-t border-border">
            <h3 className="text-sm font-semibold text-foreground">How It Works</h3>
            
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-primary">1</span>
                </div>
                <p className="text-sm text-foreground">Scan the product barcode or packaging</p>
              </div>
              
              <div className="flex gap-3">
                <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-primary">2</span>
                </div>
                <p className="text-sm text-foreground">AI analyzes ingredients and nutrition facts</p>
              </div>
              
              <div className="flex gap-3">
                <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-primary">3</span>
                </div>
                <p className="text-sm text-foreground">Get instant health scores and insights</p>
              </div>
            </div>
          </div>

          {/* Version */}
          <div className="pt-6 border-t border-border text-center">
            <p className="text-xs text-muted-foreground">Version 2.0.0</p>
            <p className="text-xs text-muted-foreground mt-1">
              Made with ❤️ for healthier choices
            </p>
            <a 
              href="mailto:contact@normallabs.io"
              className="text-xs text-primary hover:underline mt-2 inline-block"
            >
              contact@normallabs.io
            </a>
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border">
          <div className="max-w-md mx-auto px-5 py-4">
            <button
              onClick={() => router.push('/v2/scan')}
              className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <Camera className="w-5 h-5" />
              Scan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
