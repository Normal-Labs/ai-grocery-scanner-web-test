'use client';

/**
 * V2 History Screen Component
 * 
 * Displays scan history with V2 Design System.
 * Shows searchable list of scanned products with scores.
 */

import { useState } from 'react';
import { ChevronLeft, Search, ChevronRight, Camera } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { HamburgerMenu } from './HamburgerMenu';
import { Button } from '@/components/ui/button';

interface HistoryItem {
  id: string;
  productId?: string;
  barcode?: string;
  name: string;
  brand: string;
  timestamp: string;
  completenessScore: number;
  result: any;
}

interface HistoryScreenProps {
  history: HistoryItem[];
  onViewScan: (item: HistoryItem) => void;
  onClearHistory: () => void;
}

export function HistoryScreen({ history, onViewScan, onClearHistory }: HistoryScreenProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  // Filter history based on search only
  const filteredHistory = history.filter(item => {
    const matchesSearch = searchQuery === '' || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.brand.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSearch;
  });

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString();
  };

  const getScoreGrade = (result: any): string => {
    // Calculate average score from dimensions
    const scores = [];
    if (result.healthDimension) scores.push(result.healthDimension.score);
    if (result.processingDimension) scores.push(result.processingDimension.score);
    if (result.allergensDimension) scores.push(result.allergensDimension.score);
    
    if (scores.length === 0) return '—';
    
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    
    if (avg >= 90) return 'A+';
    if (avg >= 85) return 'A';
    if (avg >= 80) return 'A-';
    if (avg >= 75) return 'B+';
    if (avg >= 70) return 'B';
    if (avg >= 65) return 'B-';
    if (avg >= 60) return 'C+';
    if (avg >= 55) return 'C';
    return 'D';
  };

  const getScoreColor = (grade: string): string => {
    if (grade.startsWith('A')) return 'text-success';
    if (grade.startsWith('B')) return 'text-warning';
    return 'text-destructive';
  };

  return (
    <div className="h-full flex flex-col bg-background overflow-y-auto pb-20">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">Scan History</h1>
        </div>
        
        <HamburgerMenu />
      </div>

      {/* Search */}
      <div className="px-5 pb-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input 
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 bg-secondary rounded-xl pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
      </div>

      {/* Empty State */}
      {filteredHistory.length === 0 && (
        <div className="flex-1 flex items-center justify-center px-5">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-foreground mb-2">
              {searchQuery ? 'No results found' : 'No Scan History'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {searchQuery ? 'Try a different search term' : 'Your scanned products will appear here'}
            </p>
          </div>
        </div>
      )}

      {/* History list */}
      {filteredHistory.length > 0 && (
        <div className="px-5 pb-8">
          <div className="space-y-2">
            {filteredHistory.map((item) => {
              const grade = getScoreGrade(item.result);
              const scoreColor = getScoreColor(grade);
              
              return (
                <button 
                  key={item.id}
                  onClick={() => onViewScan(item)}
                  className="w-full flex items-center gap-4 bg-card rounded-2xl p-4 border border-border hover:border-accent transition-colors text-left"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{item.brand}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{formatTimestamp(item.timestamp)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-lg font-semibold ${scoreColor}`}>
                      {grade}
                    </span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </button>
              );
            })}
          </div>
          
          {/* Clear History Button */}
          {history.length > 0 && (
            <div className="mt-6">
              <button
                onClick={onClearHistory}
                className="w-full px-4 py-3 bg-destructive/10 hover:bg-destructive/20 text-destructive font-medium rounded-xl transition-colors"
              >
                Clear All History
              </button>
            </div>
          )}
        </div>
      )}

      {/* Fixed Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border">
        <div className="max-w-md mx-auto px-5 py-4">
          <Button 
            className="w-full h-12 rounded-xl" 
            onClick={() => router.push('/v2/scan')}
          >
            <Camera className="w-5 h-5 mr-2" />
            Scan
          </Button>
        </div>
      </div>
    </div>
  );
}
