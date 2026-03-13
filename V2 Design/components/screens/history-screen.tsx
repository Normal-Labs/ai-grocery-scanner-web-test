"use client"

import { ChevronLeft, Search, ChevronRight } from "lucide-react"
import { HamburgerMenu } from "@/components/hamburger-menu"

interface HistoryScreenProps {
  onBack: () => void
}

const historyItems = [
  { id: 1, name: "Organic Oat Cereal", brand: "Nature's Path", score: "A", time: "2 min ago", emoji: "🥣" },
  { id: 2, name: "Almond Milk", brand: "Califia Farms", score: "A-", time: "Yesterday", emoji: "🥛" },
  { id: 3, name: "Greek Yogurt", brand: "Chobani", score: "B+", time: "Yesterday", emoji: "🥄" },
  { id: 4, name: "Whole Wheat Bread", brand: "Dave's Killer", score: "A", time: "2 days ago", emoji: "🍞" },
  { id: 5, name: "Olive Oil", brand: "California Olive Ranch", score: "A+", time: "3 days ago", emoji: "🫒" },
  { id: 6, name: "Dark Chocolate", brand: "Hu Kitchen", score: "B", time: "1 week ago", emoji: "🍫" },
]

export function HistoryScreen({ onBack }: HistoryScreenProps) {
  return (
    <div className="h-full flex flex-col bg-background pt-14 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center"
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
            className="w-full h-11 bg-secondary rounded-xl pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
      </div>

      {/* Filter tabs */}
      <div className="px-5 pb-4">
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-primary text-primary-foreground text-xs font-medium rounded-full">
            All
          </button>
          <button className="px-4 py-2 bg-secondary text-muted-foreground text-xs font-medium rounded-full">
            Food
          </button>
          <button className="px-4 py-2 bg-secondary text-muted-foreground text-xs font-medium rounded-full">
            Drinks
          </button>
          <button className="px-4 py-2 bg-secondary text-muted-foreground text-xs font-medium rounded-full">
            Other
          </button>
        </div>
      </div>

      {/* History list */}
      <div className="px-5 pb-8">
        <div className="space-y-2">
          {historyItems.map((item) => (
            <button 
              key={item.id}
              className="w-full flex items-center gap-4 bg-card rounded-2xl p-4 border border-border hover:border-accent transition-colors text-left"
            >
              <div className="w-12 h-12 bg-secondary rounded-xl flex items-center justify-center">
                <span className="text-2xl">{item.emoji}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                <p className="text-xs text-muted-foreground">{item.brand}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.time}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-lg font-semibold ${
                  item.score.startsWith('A') ? 'text-success' : 
                  item.score.startsWith('B') ? 'text-warning' : 'text-destructive'
                }`}>
                  {item.score}
                </span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
