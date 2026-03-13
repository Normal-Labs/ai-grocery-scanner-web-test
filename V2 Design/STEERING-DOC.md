# Scan App — Design Steering Document

> Use this document alongside the mockup to guide implementation. The mockup provides visual reference; this document explains the reasoning and patterns.

---

## Product Overview

**Scan** is a mobile-first web app that lets users photograph products (groceries, clothing, home goods) and receive instant insights on health, allergens, corporate responsibility, and environmental impact.

### Core Principles

1. **Non-distracting** — Users are in bright, busy stores. The UI should be calm and clear.
2. **One-handed use** — Large touch targets, thumb-reachable actions.
3. **Progressive disclosure** — Show summary scores first, details on scroll.
4. **Trustworthy** — Muted, professional palette. No gimmicks.
5. **Extensible** — The same card/score patterns work for any product category.

---

## Color System

### Palette (5 colors only)

| Token | Usage | Value |
|-------|-------|-------|
| **Foreground** | Primary text, headings | Near-black with slight blue tint (`oklch(0.15 0.01 240)`) |
| **Background** | Page background | Off-white with cool undertone (`oklch(0.99 0.002 240)`) |
| **Accent** | CTAs, links, positive indicators | Teal (`oklch(0.55 0.15 160)`) |
| **Warning** | Caution states, amber alerts | Warm amber (`oklch(0.65 0.18 80)`) |
| **Destructive** | Errors, allergen warnings | Muted red (`oklch(0.55 0.2 25)`) |

### Semantic Color Usage

- **Green/Teal (Accent)** — Good scores (A, B), healthy indicators, primary actions
- **Amber (Warning)** — Moderate scores (C), caution items, attention needed
- **Red (Destructive)** — Poor scores (D, F), allergen alerts, warnings
- **Muted foreground** — Secondary text, labels, hints

### Score Color Mapping

```
A → accent (teal)
B → accent (teal)
C → warning (amber)
D → destructive (red)
F → destructive (red)
```

---

## Typography

### Font Stack

- **Primary**: Inter (clean, highly legible, works in bright environments)
- **Fallback**: System sans-serif

### Scale

| Element | Size | Weight | Line Height |
|---------|------|--------|-------------|
| Page title | 24px (text-2xl) | Semibold (600) | 1.2 |
| Section heading | 14px (text-sm) | Medium (500) | 1.4 |
| Body text | 14px (text-sm) | Regular (400) | 1.5 |
| Labels/hints | 12px (text-xs) | Regular/Medium | 1.4 |
| Large scores | 32px (text-3xl) | Bold (700) | 1 |

### Guidelines

- Use `text-balance` or `text-pretty` for headings
- Muted foreground (`text-muted-foreground`) for secondary information
- Never use decorative fonts

---

## Spacing & Layout

### Spacing Scale

Use consistent spacing based on 4px increments:

- **4px** (`gap-1`, `p-1`) — Tight groupings, icon spacing
- **8px** (`gap-2`, `p-2`) — Between related items
- **12px** (`gap-3`, `p-3`) — Card internal padding (small)
- **16px** (`gap-4`, `p-4`) — Card internal padding (standard)
- **20px** (`gap-5`, `p-5`, `px-5`) — Page horizontal padding
- **24px** (`gap-6`, `p-6`) — Section spacing

### Layout Patterns

1. **Flexbox first** — Use for all linear layouts
2. **Full-width cards** — No side-by-side cards; single column on mobile
3. **Sticky headers** — Navigation stays visible during scroll
4. **Safe areas** — Respect device safe areas (notch, home indicator)

---

## Component Patterns

### Cards

```
- Background: bg-card (white)
- Border: border border-border (subtle gray)
- Radius: rounded-2xl (16px)
- Padding: p-4 (16px)
- Shadow: None (flat design, relies on border)
```

### Score Badges

Large circular or pill-shaped indicators showing letter grades:

```
- Size: w-12 h-12 or w-14 h-14 for prominent display
- Shape: rounded-full
- Background: Color based on score (accent/warning/destructive)
- Text: Bold, centered letter grade
```

### Progress Bars

For nutrition values and percentages:

```
- Track: h-2 bg-secondary rounded-full
- Fill: Dynamic width based on value
- Color: accent for good, warning for moderate, destructive for high
```

### Buttons

**Primary (Scan button)**
```
- Background: bg-accent
- Text: text-accent-foreground (white)
- Size: Large (w-20 h-20 for main CTA)
- Shape: rounded-full
- Animation: Subtle pulse ring effect
```

**Secondary**
```
- Background: bg-secondary
- Text: text-secondary-foreground
- Size: Standard (h-10 or h-12)
- Shape: rounded-xl
```

**Ghost/Icon**
```
- Background: transparent or bg-secondary
- Size: w-10 h-10 or w-12 h-12
- Shape: rounded-full
```

### Navigation

**Header**
```
- Height: h-14
- Background: bg-background or bg-card
- Border: Optional bottom border
- Content: Back button (left), title (center), actions (right)
- Position: Sticky top-0
```

**Bottom Navigation**
```
- Height: h-16 (plus safe area)
- Background: bg-card with top border
- Items: Icon + label, centered
- Active state: accent color
```

---

## Screen Patterns

### Home Screen

- Minimal content above the fold
- Single prominent CTA (Scan button)
- Example product card to demonstrate value
- Bottom navigation for History access

### Camera Screen

- Full-screen dark background
- No scanning frame or guides (clean viewfinder)
- Minimal text instruction ("Point at any product")
- Bottom controls: gallery, capture, flash
- Top controls: close, camera flip

### Results Screen

- Scrollable single-page layout
- Product header with image, name, brand, overall score
- Full-width metric cards in vertical stack
- Quick insights section with color-coded alerts
- Nutrition breakdown with progress bars
- Ingredient list with allergen highlighting
- Sticky header with share/save actions

### History Screen

- Search bar at top
- Filter chips (All, Food, Clothing, Home)
- Vertical list of scanned products
- Each item shows: thumbnail, name, brand, date, score badge

---

## Interaction Patterns

### Touch Targets

- Minimum size: 44x44px
- Preferred size: 48x48px for primary actions
- Spacing between targets: minimum 8px

### Feedback

- Active state: `active:scale-[0.98]` for buttons
- Transitions: 150-200ms duration
- Hover states (desktop): Subtle border color change

### Gestures

- Pull to refresh on lists
- Swipe back navigation
- Scroll to reveal more content (no pagination)

---

## Iconography

Use Lucide icons consistently:

| Action | Icon |
|--------|------|
| Scan | `Scan` or `Camera` |
| Back | `ArrowLeft` or `ChevronLeft` |
| Close | `X` |
| Share | `Share2` |
| Save/Bookmark | `Bookmark` |
| Settings | `Settings` |
| History | `Clock` or `History` |
| Flash | `Zap` |
| Gallery | `Image` |
| Camera flip | `SwitchCamera` |
| Health | `Heart` |
| Allergens | `AlertTriangle` |
| Environment | `Leaf` |
| Ethics | `Building2` |
| Search | `Search` |
| Check | `Check` |
| Warning | `AlertCircle` |

### Icon Sizing

- Navigation: 20-24px
- In cards: 16-20px
- Decorative: 12-16px

---

## Accessibility

### Color Contrast

- All text meets WCAG AA (4.5:1 for body, 3:1 for large text)
- Score colors are supplemented with letter grades (not color-only)

### Screen Readers

- Use semantic HTML (`main`, `nav`, `header`, `section`)
- Add `sr-only` text for icon-only buttons
- Meaningful alt text for product images

### Motion

- Respect `prefers-reduced-motion`
- Animations are subtle and non-essential

---

## Responsive Behavior

### Mobile (default)

- Single column layout
- Full-width cards
- Bottom navigation
- Large touch targets

### Tablet/Desktop (future)

- Max-width container (480px for phone-like experience)
- Or side-by-side layout with navigation rail
- Consider hover states

---

## Implementation Notes for Kiro

1. **Start with the camera** — The core loop is: scan → results → scan again
2. **Build the results screen first** — It's the most complex and demonstrates all patterns
3. **Use the color tokens** — Define them in CSS variables, reference everywhere
4. **Full-width by default** — No grid layouts on mobile
5. **Sticky headers are important** — Users need context while scrolling results
6. **Test in bright light** — The app will be used in grocery store lighting

---

## File Structure Suggestion

```
/app
  /page.tsx          # Home screen
  /scan/page.tsx     # Camera screen
  /results/[id]/page.tsx  # Results screen
  /history/page.tsx  # History screen

/components
  /ui               # Base components (Button, Card, etc.)
  /product-card.tsx
  /score-badge.tsx
  /metric-card.tsx
  /nutrition-bar.tsx
  /ingredient-list.tsx
  /bottom-nav.tsx
  /header.tsx
```

---

## Reference

The mockup at `/app/page.tsx` shows all screens in an interactive preview. Use it as the visual source of truth alongside this document.
