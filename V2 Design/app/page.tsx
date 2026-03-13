"use client"

import { useState } from "react"
import { PhoneFrame } from "@/components/phone-frame"
import { HomeScreen } from "@/components/screens/home-screen"
import { CameraScreen } from "@/components/screens/camera-screen"
import { ResultsScreen } from "@/components/screens/results-screen"
import { HistoryScreen } from "@/components/screens/history-screen"
import { ArrowRight, Sparkles } from "lucide-react"

type Screen = "home" | "camera" | "results" | "history"

export default function MockupPage() {
  const [activeScreen, setActiveScreen] = useState<Screen>("home")

  const renderScreen = () => {
    switch (activeScreen) {
      case "home":
        return (
          <HomeScreen 
            onScan={() => setActiveScreen("camera")} 
            onHistory={() => setActiveScreen("history")}
            onExampleProduct={() => setActiveScreen("results")}
          />
        )
      case "camera":
        return (
          <CameraScreen 
            onClose={() => setActiveScreen("home")} 
            onCapture={() => setActiveScreen("results")}
          />
        )
      case "results":
        return (
          <ResultsScreen 
            onBack={() => setActiveScreen("home")} 
          />
        )
      case "history":
        return (
          <HistoryScreen 
            onBack={() => setActiveScreen("home")}
          />
        )
    }
  }

  const screens: { id: Screen; label: string }[] = [
    { id: "home", label: "Home" },
    { id: "camera", label: "Camera" },
    { id: "results", label: "Results" },
    { id: "history", label: "History" },
  ]

  return (
    <main className="min-h-screen bg-secondary">
      {/* Header */}
      <header className="bg-background border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-5 h-5 text-accent" />
                <span className="text-xs font-medium text-accent uppercase tracking-wider">Design Mockup</span>
              </div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">Scan — Product Scanner App</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Interactive mockup for mobile web app redesign
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation tabs */}
      <div className="bg-background border-b border-border sticky top-[105px] z-40">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1 py-3 overflow-x-auto">
            {screens.map((screen, index) => (
              <div key={screen.id} className="flex items-center">
                <button
                  onClick={() => setActiveScreen(screen.id)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                    activeScreen === screen.id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  {screen.label}
                </button>
                {index < screens.length - 1 && (
                  <ArrowRight className="w-4 h-4 text-muted-foreground/50 mx-1" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col lg:flex-row gap-12 items-start">
          {/* Phone mockup */}
          <div className="flex-shrink-0 mx-auto lg:mx-0">
            <PhoneFrame label={screens.find(s => s.id === activeScreen)?.label}>
              {renderScreen()}
            </PhoneFrame>
          </div>

          {/* Design notes */}
          <div className="flex-1 max-w-xl">
            <div className="bg-background rounded-2xl border border-border p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Design Notes</h2>
              
              {activeScreen === "home" && (
                <div className="space-y-4 text-sm text-muted-foreground">
                  <div>
                    <h3 className="font-medium text-foreground mb-1">Home Screen</h3>
                    <p>Clean, focused interface with a prominent scan button. Example product card demonstrates the value proposition immediately.</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground mb-1">Key Elements</h3>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Large, prominent scan CTA with subtle pulse animation</li>
                      <li>Minimal navigation — just Scan and History</li>
                      <li>Example product card for first-time users to explore</li>
                      <li>Settings accessible but not prominent</li>
                    </ul>
                  </div>
                </div>
              )}

              {activeScreen === "camera" && (
                <div className="space-y-4 text-sm text-muted-foreground">
                  <div>
                    <h3 className="font-medium text-foreground mb-1">Camera Screen</h3>
                    <p>Full-screen camera with minimal, non-distracting UI. No scanning frame — users can point at any product or barcode.</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground mb-1">Key Elements</h3>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Dark UI for better camera visibility</li>
                      <li>Clean viewfinder with simple text guidance</li>
                      <li>Flash and camera flip controls</li>
                      <li>Gallery access for scanning photos</li>
                      <li>Large, easy-to-tap capture button</li>
                    </ul>
                  </div>
                </div>
              )}

              {activeScreen === "results" && (
                <div className="space-y-4 text-sm text-muted-foreground">
                  <div>
                    <h3 className="font-medium text-foreground mb-1">Results Screen</h3>
                    <p>Full-width stacked cards with all information in a single scrollable view. No click-through required — everything is immediately visible.</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground mb-1">Key Elements</h3>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Product identity at top with overall score</li>
                      <li>Full-width metric cards: Health, Allergens, Environment, Ethics</li>
                      <li>Quick insights section with color-coded alerts</li>
                      <li>Nutrition breakdown with progress bars</li>
                      <li>Ingredient analysis with allergen warnings</li>
                      <li>Share and save actions in sticky header</li>
                    </ul>
                  </div>
                </div>
              )}

              {activeScreen === "history" && (
                <div className="space-y-4 text-sm text-muted-foreground">
                  <div>
                    <h3 className="font-medium text-foreground mb-1">History Screen</h3>
                    <p>Searchable list of all scanned products with quick filters and score indicators.</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground mb-1">Key Elements</h3>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Search bar for finding past scans</li>
                      <li>Category filters (Food, Drinks, Other)</li>
                      <li>Product cards with emoji, name, brand, score</li>
                      <li>Relative timestamps for context</li>
                      <li>Color-coded scores for quick scanning</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {/* Design principles */}
            <div className="bg-background rounded-2xl border border-border p-6 mt-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Design Principles</h2>
              <div className="grid gap-4">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                    <span className="text-accent font-bold text-sm">1</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-foreground">Mobile-First</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Designed for one-handed use in busy environments like grocery stores</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                    <span className="text-accent font-bold text-sm">2</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-foreground">Scannable Information</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Large scores, color coding, and clear hierarchy for quick decisions</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                    <span className="text-accent font-bold text-sm">3</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-foreground">Calming Aesthetic</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Neutral palette with accent colors only for status indicators</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                    <span className="text-accent font-bold text-sm">4</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-foreground">Progressive Disclosure</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Summary first, details on demand — never overwhelming</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                    <span className="text-accent font-bold text-sm">5</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-foreground">Extensible Categories</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Same card/score pattern works for food, clothes, home goods</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Color palette */}
            <div className="bg-background rounded-2xl border border-border p-6 mt-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Color Palette</h2>
              <div className="flex flex-wrap gap-3">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-xl bg-foreground" />
                  <span className="text-xs text-muted-foreground">Primary</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-xl bg-secondary border border-border" />
                  <span className="text-xs text-muted-foreground">Secondary</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-xl bg-success" />
                  <span className="text-xs text-muted-foreground">Success</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-xl bg-warning" />
                  <span className="text-xs text-muted-foreground">Warning</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-xl bg-destructive" />
                  <span className="text-xs text-muted-foreground">Danger</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-xl bg-info" />
                  <span className="text-xs text-muted-foreground">Info</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-background border-t border-border mt-12">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <p className="text-sm text-muted-foreground text-center">
            Interactive design mockup for Kiro implementation. Click through screens to see the full user flow.
          </p>
        </div>
      </footer>
    </main>
  )
}
