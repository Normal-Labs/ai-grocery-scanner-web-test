'use client';

/**
 * Shared Hamburger Menu Component
 * 
 * Consistent menu across all V2 pages.
 */

import { useState } from 'react';
import { Menu, X, Home, Info, History, Coffee } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function HamburgerMenu() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="relative">
      <button 
        onClick={() => setMenuOpen(!menuOpen)}
        className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"
        aria-label={menuOpen ? "Close menu" : "Open menu"}
      >
        {menuOpen ? (
          <X className="w-4 h-4 text-muted-foreground" />
        ) : (
          <Menu className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {menuOpen && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-card rounded-xl border border-border shadow-lg overflow-hidden z-50">
          <button
            onClick={() => {
              setMenuOpen(false);
              router.push('/');
            }}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-secondary transition-colors text-left"
          >
            <Home className="w-4 h-4 text-muted-foreground" />
            Home
          </button>
          <button
            onClick={() => {
              setMenuOpen(false);
              router.push('/about');
            }}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-secondary transition-colors text-left"
          >
            <Info className="w-4 h-4 text-muted-foreground" />
            About
          </button>
          <button
            onClick={() => {
              setMenuOpen(false);
              router.push('/history');
            }}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-secondary transition-colors text-left"
          >
            <History className="w-4 h-4 text-muted-foreground" />
            History
          </button>
          <button
            onClick={() => {
              setMenuOpen(false);
              // Trigger the Buy Me a Coffee widget
              const bmcButton = document.getElementById('bmc-wbtn');
              if (bmcButton) {
                bmcButton.click();
              } else {
                // Fallback to opening in new tab if widget not loaded
                window.open('https://buymeacoffee.com/normallabs', '_blank');
              }
            }}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-secondary transition-colors text-left"
          >
            <Coffee className="w-4 h-4 text-muted-foreground" />
            Support
          </button>
        </div>
      )}
    </div>
  );
}
