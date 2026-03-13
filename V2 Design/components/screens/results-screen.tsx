"use client"

import { ChevronLeft, Heart, AlertTriangle, Leaf, Building2, ShieldCheck, Info } from "lucide-react"
import { HamburgerMenu } from "@/components/hamburger-menu"

interface ResultsScreenProps {
  onBack: () => void
}

export function ResultsScreen({ onBack }: ResultsScreenProps) {
  return (
    <div className="h-full flex flex-col bg-background pt-14 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 sticky top-14 bg-background z-10">
        <button 
          onClick={onBack}
          className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center"
        >
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </button>
        <HamburgerMenu />
      </div>

      {/* Product info */}
      <div className="px-5 pb-5">
        <div className="flex gap-4">
          <div className="w-20 h-20 bg-secondary rounded-2xl flex items-center justify-center">
            <span className="text-3xl">🥣</span>
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-foreground leading-tight">Organic Oat Cereal</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Nature&apos;s Path</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="px-2 py-0.5 bg-success/10 text-success text-xs font-medium rounded-full">
                Score: 85/100
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Score cards - full width stacked */}
      <div className="px-5 pb-5 space-y-3">
        {/* Health Score */}
        <div className="bg-card rounded-2xl p-4 border border-border">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
              <Heart className="w-6 h-6 text-success" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Health Score</p>
              <p className="text-2xl font-semibold text-foreground">A</p>
            </div>
            <span className="text-xs text-success font-medium">Top 15%</span>
          </div>
        </div>

        {/* Allergens */}
        <div className="bg-card rounded-2xl p-4 border border-border">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-warning" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Allergens</p>
              <p className="text-2xl font-semibold text-foreground">2</p>
            </div>
            <span className="text-xs text-warning font-medium">Gluten, Nuts</span>
          </div>
        </div>

        {/* Environmental */}
        <div className="bg-card rounded-2xl p-4 border border-border">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
              <Leaf className="w-6 h-6 text-success" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Carbon Impact</p>
              <p className="text-2xl font-semibold text-foreground">Low</p>
            </div>
            <span className="text-xs text-success font-medium">Eco-friendly</span>
          </div>
        </div>

        {/* Ethics */}
        <div className="bg-card rounded-2xl p-4 border border-border">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-info/10 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-info" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Ethics Rating</p>
              <p className="text-2xl font-semibold text-foreground">B+</p>
            </div>
            <span className="text-xs text-info font-medium">Fair Trade</span>
          </div>
        </div>
      </div>

      {/* Quick insights */}
      <div className="px-5 pb-5">
        <h3 className="text-sm font-semibold text-foreground mb-3">Quick Insights</h3>
        <div className="space-y-2">
          <div className="flex items-center gap-3 bg-success/5 rounded-xl p-3 border border-success/10">
            <ShieldCheck className="w-5 h-5 text-success shrink-0" />
            <p className="text-sm text-foreground">No artificial preservatives</p>
          </div>
          <div className="flex items-center gap-3 bg-warning/5 rounded-xl p-3 border border-warning/10">
            <AlertTriangle className="w-5 h-5 text-warning shrink-0" />
            <p className="text-sm text-foreground">Contains gluten and tree nuts</p>
          </div>
          <div className="flex items-center gap-3 bg-success/5 rounded-xl p-3 border border-success/10">
            <Leaf className="w-5 h-5 text-success shrink-0" />
            <p className="text-sm text-foreground">Certified organic ingredients</p>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="px-5 pb-5">
        <div className="h-px bg-border" />
      </div>

      {/* Nutrition breakdown */}
      <div className="px-5 pb-5">
        <h3 className="text-sm font-semibold text-foreground mb-3">Nutrition Breakdown</h3>
        <div className="bg-card rounded-2xl border border-border divide-y divide-border">
          <NutritionRow label="Calories" value="150" unit="kcal" percentage={8} />
          <NutritionRow label="Sugar" value="6g" percentage={7} color="success" />
          <NutritionRow label="Fiber" value="4g" percentage={16} color="success" />
          <NutritionRow label="Protein" value="5g" percentage={10} />
          <NutritionRow label="Sodium" value="140mg" percentage={6} />
          <NutritionRow label="Saturated Fat" value="0.5g" percentage={3} color="success" />
        </div>
      </div>

      {/* Ingredients analysis */}
      <div className="px-5 pb-8">
        <h3 className="text-sm font-semibold text-foreground mb-3">Ingredients Analysis</h3>
        <div className="space-y-2">
          <div className="bg-card rounded-xl p-4 border border-border">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center shrink-0 mt-0.5">
                <ShieldCheck className="w-4 h-4 text-success" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Whole grain oats</p>
                <p className="text-xs text-muted-foreground mt-0.5">Primary ingredient, excellent source of fiber</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center shrink-0 mt-0.5">
                <ShieldCheck className="w-4 h-4 text-success" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Organic cane sugar</p>
                <p className="text-xs text-muted-foreground mt-0.5">Natural sweetener, moderate amount</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center shrink-0 mt-0.5">
                <Info className="w-4 h-4 text-warning" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Almonds</p>
                <p className="text-xs text-muted-foreground mt-0.5">Allergen: Tree nuts</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function NutritionRow({ 
  label, 
  value, 
  unit = "", 
  percentage, 
  color = "muted" 
}: { 
  label: string
  value: string
  unit?: string
  percentage: number
  color?: "success" | "warning" | "muted"
}) {
  const colorClasses = {
    success: "bg-success",
    warning: "bg-warning", 
    muted: "bg-muted-foreground"
  }

  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="text-sm text-foreground">{label}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-foreground">{value}{unit && <span className="text-muted-foreground ml-0.5">{unit}</span>}</span>
        <div className="w-12 h-1.5 bg-secondary rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full ${colorClasses[color]}`} 
            style={{ width: `${Math.min(percentage * 5, 100)}%` }} 
          />
        </div>
        <span className="text-xs text-muted-foreground w-6 text-right">{percentage}%</span>
      </div>
    </div>
  )
}
