"use client"

import { Camera, History, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { HamburgerMenu } from "@/components/hamburger-menu"

interface HomeScreenProps {
  onScan: () => void
  onHistory: () => void
  onExampleProduct: () => void
}

export function HomeScreen({ onScan, onHistory, onExampleProduct }: HomeScreenProps) {
  return (
    <div className="h-full flex flex-col bg-background pt-14">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">Scan</h1>
          <p className="text-xs text-muted-foreground">Know what you buy</p>
        </div>
        <HamburgerMenu />
      </div>

      {/* Example Product */}
      <div className="px-5 py-3">
        <button
          onClick={onExampleProduct}
          className="w-full bg-card rounded-2xl p-4 border border-border text-left hover:border-accent transition-colors active:scale-[0.98]"
        >
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-accent" />
            <span className="text-xs font-medium text-muted-foreground">Try an example</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-secondary rounded-xl flex items-center justify-center">
              <span className="text-2xl">🥣</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Organic Oat Cereal</p>
              <p className="text-xs text-muted-foreground">Nature&apos;s Path</p>
            </div>
            <div className="px-2 py-1 bg-success/10 rounded-full">
              <span className="text-xs font-medium text-success">A</span>
            </div>
          </div>
        </button>
      </div>

      {/* Main scan area */}
      <div className="flex-1 flex flex-col items-center justify-center px-5">
        <div className="relative">
          {/* Scan button */}
          <button
            onClick={onScan}
            className="w-36 h-36 rounded-full bg-primary flex items-center justify-center shadow-lg hover:scale-105 transition-transform active:scale-95"
          >
            <Camera className="w-14 h-14 text-primary-foreground" />
          </button>
          {/* Pulse rings */}
          <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping" style={{ animationDuration: '2s' }} />
          <div className="absolute -inset-4 rounded-full border border-primary/10 animate-ping" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }} />
        </div>
        <p className="mt-6 text-sm font-medium text-foreground">Tap to scan a product</p>
        <p className="mt-1 text-xs text-muted-foreground">Point at barcode or product label</p>
      </div>

      {/* Bottom navigation */}
      <div className="px-5 pb-8">
        <div className="bg-card rounded-2xl border border-border p-2 flex gap-2">
          <Button variant="secondary" className="flex-1 h-12 rounded-xl" onClick={onScan}>
            <Camera className="w-5 h-5 mr-2" />
            Scan
          </Button>
          <Button variant="ghost" className="flex-1 h-12 rounded-xl" onClick={onHistory}>
            <History className="w-5 h-5 mr-2" />
            History
          </Button>
        </div>
      </div>
    </div>
  )
}
