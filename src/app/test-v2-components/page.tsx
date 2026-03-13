'use client';

/**
 * V2 Components Test Page
 * 
 * Demonstrates the new shadcn/ui components and V2 color system.
 * This page can be removed after Phase 2 is complete.
 */

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

export default function TestV2ComponentsPage() {
  return (
    <div className="min-h-screen bg-background flex justify-center">
      <div className="max-w-md w-full min-h-screen bg-background p-6 shadow-xl">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">V2 Design System Test</h1>
          <p className="text-muted-foreground">Testing new components and color system</p>
        </div>

        <Separator />

        {/* Color Palette */}
        <Card>
          <CardHeader>
            <CardTitle>Color Palette</CardTitle>
            <CardDescription>Semantic colors for product scores</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-success" />
              <div>
                <p className="font-medium text-foreground">Success / Accent</p>
                <p className="text-sm text-muted-foreground">Good scores (A, B)</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-warning" />
              <div>
                <p className="font-medium text-foreground">Warning</p>
                <p className="text-sm text-muted-foreground">Moderate scores (C)</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-destructive" />
              <div>
                <p className="font-medium text-foreground">Destructive</p>
                <p className="text-sm text-muted-foreground">Poor scores (D, F)</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-info" />
              <div>
                <p className="font-medium text-foreground">Info</p>
                <p className="text-sm text-muted-foreground">Informational</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Badges */}
        <Card>
          <CardHeader>
            <CardTitle>Score Badges</CardTitle>
            <CardDescription>Letter grades with semantic colors</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 flex-wrap">
              <Badge className="bg-success text-success-foreground text-lg px-4 py-2">A</Badge>
              <Badge className="bg-success text-success-foreground text-lg px-4 py-2">B</Badge>
              <Badge className="bg-warning text-warning-foreground text-lg px-4 py-2">C</Badge>
              <Badge className="bg-destructive text-destructive-foreground text-lg px-4 py-2">D</Badge>
              <Badge className="bg-destructive text-destructive-foreground text-lg px-4 py-2">F</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Progress Bars */}
        <Card>
          <CardHeader>
            <CardTitle>Nutrition Progress Bars</CardTitle>
            <CardDescription>Visual representation of nutrition values</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-foreground">Protein</span>
                <span className="text-sm text-muted-foreground">15g (30%)</span>
              </div>
              <Progress value={30} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-foreground">Fiber</span>
                <span className="text-sm text-muted-foreground">8g (32%)</span>
              </div>
              <Progress value={32} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-foreground">Sugar</span>
                <span className="text-sm text-muted-foreground">25g (83%)</span>
              </div>
              <Progress value={83} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Buttons */}
        <Card>
          <CardHeader>
            <CardTitle>Button Variants</CardTitle>
            <CardDescription>Different button styles</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full">Primary Button</Button>
            <Button variant="secondary" className="w-full">Secondary Button</Button>
            <Button variant="outline" className="w-full">Outline Button</Button>
            <Button variant="ghost" className="w-full">Ghost Button</Button>
            <Button variant="destructive" className="w-full">Destructive Button</Button>
          </CardContent>
        </Card>

        {/* Product Card Example */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>Organic Almond Milk</CardTitle>
                <CardDescription>Silk Brand</CardDescription>
              </div>
              <Badge className="bg-success text-success-foreground text-xl px-3 py-1">A</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-secondary rounded-lg">
                <Badge className="bg-success text-success-foreground mb-1">A</Badge>
                <p className="text-xs text-muted-foreground">Health</p>
              </div>
              <div className="text-center p-3 bg-secondary rounded-lg">
                <Badge className="bg-success text-success-foreground mb-1">B</Badge>
                <p className="text-xs text-muted-foreground">Processing</p>
              </div>
              <div className="text-center p-3 bg-secondary rounded-lg">
                <Badge className="bg-warning text-warning-foreground mb-1">C</Badge>
                <p className="text-xs text-muted-foreground">Allergens</p>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full">View Full Analysis</Button>
          </CardFooter>
        </Card>

        {/* Back Button */}
        <div className="flex justify-center pt-6">
          <Button 
            variant="outline" 
            onClick={() => window.location.href = '/'}
          >
            ← Back to Home
          </Button>
        </div>
      </div>
      </div>
    </div>
  );
}
