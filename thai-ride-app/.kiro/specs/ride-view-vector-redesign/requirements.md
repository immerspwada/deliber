# 🎨 RideView - Minimalist Monochrome with Vector Graphics

**Date**: 2026-01-31  
**Status**: 🎯 Design Specification  
**Priority**: 🔥 HIGH - Complete UI Redesign

---

## 🎯 Design Philosophy

### Core Principles

1. **Minimalist Monochrome**
   - Black, white, and grayscale as primary palette
   - Single accent color for critical actions
   - Maximum contrast for readability
   - Clean, uncluttered interface

2. **Vector Graphics First**
   - SVG icons for all UI elements
   - Scalable, crisp graphics at any size
   - Geometric shapes and clean lines
   - No raster images except photos

3. **Functional Simplicity**
   - Every element serves a purpose
   - No decorative elements
   - Clear visual hierarchy
   - Instant comprehension

4. **Professional & Modern**
   - Swiss design influence
   - Grid-based layouts
   - Consistent spacing
   - Timeless aesthetic

---

## 🎨 Color System

### Monochrome Palette

```css
/* Primary Monochrome */
--mono-black: #000000; /* Pure black - Primary actions, text */
--mono-gray-900: #1a1a1a; /* Near black - Secondary text */
--mono-gray-800: #333333; /* Dark gray - Tertiary text */
--mono-gray-700: #4d4d4d; /* Medium-dark gray */
--mono-gray-600: #666666; /* Medium gray - Disabled text */
--mono-gray-500: #808080; /* Mid gray */
--mono-gray-400: #999999; /* Light-medium gray */
--mono-gray-300: #cccccc; /* Light gray - Borders */
--mono-gray-200: #e5e5e5; /* Very light gray - Dividers */
--mono-gray-100: #f5f5f5; /* Off-white - Backgrounds */
--mono-white: #ffffff; /* Pure white - Surface */

/* Accent Color (Single) */
--accent-primary: #000000; /* Black for primary actions */
--accent-hover: #1a1a1a; /* Slightly lighter for hover */
--accent-active: #333333; /* Even lighter for active */

/* Semantic Colors (Minimal) */
--semantic-success: #2d2d2d; /* Dark gray for success */
--semantic-error: #000000; /* Black for errors (with icon) */
--semantic-warning: #4d4d4d; /* Medium gray for warnings */
```

### Usage Rules

- **Text**: Black on white, white on black
- **Backgrounds**: White, off-white, light gray
- **Borders**: Light gray, medium gray
- **Actions**: Black with white text
- **States**: Grayscale variations
- **Icons**: Black or dark gray

---

## 🔤 Typography

### Font System

```css
/* Font Family */
--font-primary:
  -apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", Arial,
  sans-serif;
--font-mono: "SF Mono", "Courier New", monospace;

/* Font Sizes (Modular Scale 1.25) */
--text-xs: 10px; /* 0.625rem */
--text-sm: 12px; /* 0.75rem */
--text-base: 14px; /* 0.875rem */
--text-md: 16px; /* 1rem */
--text-lg: 18px; /* 1.125rem */
--text-xl: 20px; /* 1.25rem */
--text-2xl: 24px; /* 1.5rem */
--text-3xl: 32px; /* 2rem */
--text-4xl: 40px; /* 2.5rem */

/* Font Weights */
--weight-light: 300;
--weight-regular: 400;
--weight-medium: 500;
--weight-semibold: 600;
--weight-bold: 700;

/* Line Heights */
--leading-tight: 1.2;
--leading-normal: 1.5;
--leading-relaxed: 1.75;

/* Letter Spacing */
--tracking-tight: -0.02em;
--tracking-normal: 0;
--tracking-wide: 0.05em;
--tracking-wider: 0.1em;
```

### Typography Hierarchy

```
H1: 32px / Bold / -0.02em / Black
H2: 24px / Bold / -0.01em / Black
H3: 20px / Semibold / 0 / Black
H4: 18px / Semibold / 0 / Black
Body: 14px / Regular / 0 / Gray-900
Caption: 12px / Regular / 0 / Gray-700
Label: 10px / Medium / 0.05em / Gray-600 / UPPERCASE
```

---

## 📐 Spacing & Layout

### Spacing Scale (8px Base)

```css
--space-0: 0;
--space-1: 4px; /* 0.25rem */
--space-2: 8px; /* 0.5rem */
--space-3: 12px; /* 0.75rem */
--space-4: 16px; /* 1rem */
--space-5: 20px; /* 1.25rem */
--space-6: 24px; /* 1.5rem */
--space-8: 32px; /* 2rem */
--space-10: 40px; /* 2.5rem */
--space-12: 48px; /* 3rem */
--space-16: 64px; /* 4rem */
```

### Grid System

- **Base Unit**: 8px
- **Column Grid**: 12 columns
- **Gutter**: 16px
- **Margin**: 16px (mobile), 24px (tablet), 32px (desktop)

### Layout Principles

1. **Vertical Rhythm**: All spacing multiples of 8px
2. **Horizontal Alignment**: Grid-based positioning
3. **White Space**: Generous padding and margins
4. **Content Width**: Max 600px for readability

---

## 🎭 Vector Icons

### Icon System

**Style**: Outlined, 2px stroke weight, rounded caps

**Sizes**:

- Small: 16x16px
- Medium: 20x20px
- Large: 24x24px
- XLarge: 32x32px

**Categories**:

1. **Navigation**
   - Arrow Left/Right/Up/Down
   - Chevron Left/Right/Up/Down
   - Menu, Close (X)

2. **Actions**
   - Plus, Minus
   - Check, X
   - Edit, Delete
   - Search, Filter

3. **Status**
   - Clock, Calendar
   - Location Pin, Map
   - User, Users
   - Star, Heart

4. **Vehicles** (Custom SVG)
   - Car (Standard)
   - Motorcycle (Shared)
   - Luxury Car (Premium)

5. **Payment**
   - Wallet, Card
   - Cash, Bank

### Icon Design Rules

```svg
<!-- Standard Icon Template -->
<svg
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <!-- Icon paths -->
</svg>
```

**Rules**:

- Always use `currentColor` for stroke
- 2px stroke width (consistent)
- Rounded line caps and joins
- 24x24 viewBox (scalable)
- Minimal paths (optimize)

---

## 🧩 Component Design

### 1. Top Bar

```
┌─────────────────────────────────────┐
│ ←  เลือกสถานที่              ⋮     │
└─────────────────────────────────────┘
```

**Specs**:

- Height: 56px
- Background: White
- Border Bottom: 1px solid Gray-200
- Padding: 16px
- Icons: 24px, Black
- Title: 18px, Semibold, Black

### 2. Step Indicator (Minimalist)

```
┌─────────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ ขั้นตอน 1 จาก 2 • เลือกสถานที่      │
└─────────────────────────────────────┘
```

**Specs**:

- Progress Bar: 2px height, Black
- Text: 12px, Medium, Gray-700
- Padding: 16px
- Background: White

### 3. Location Input (Vector-Based)

```
┌─────────────────────────────────────┐
│ ● จุดรับ                            │
│ ─────────────────────────────────── │
│ ■ จุดหมาย                           │
└─────────────────────────────────────┘
```

**Specs**:

- Container: White, 1px border Gray-300
- Radius: 12px
- Padding: 20px
- Dots: 12px circle (Black/Gray)
- Divider: 1px Gray-200
- Text: 16px, Regular, Black
- Icons: 20px, Gray-600

### 4. Vehicle Cards (Geometric)

```
┌──────────┐ ┌──────────┐ ┌──────────┐
│    🚗    │ │    🏍️    │ │    🚙    │
│  สบาย   │ │   แชร์   │ │ พรีเมียม │
│  ฿120   │ │   ฿84    │ │  ฿180   │
└──────────┘ └──────────┘ └──────────┘
```

**Specs**:

- Size: 120x140px
- Border: 2px solid Gray-300
- Radius: 12px
- Padding: 16px
- Icon: 48x48px, Black
- Name: 14px, Semibold, Black
- Price: 20px, Bold, Black
- Active: 2px border Black

### 5. Primary Button (Bold)

```
┌─────────────────────────────────────┐
│         จองรถ • ฿120                │
└─────────────────────────────────────┘
```

**Specs**:

- Height: 56px
- Background: Black
- Text: 16px, Semibold, White
- Radius: 12px
- Padding: 16px 24px
- Hover: Gray-900
- Active: Scale 0.98

### 6. Map Container (Clean)

```
┌─────────────────────────────────────┐
│                                     │
│         [MAP VIEW]                  │
│                                     │
└─────────────────────────────────────┘
```

**Specs**:

- Height: 300px
- Radius: 12px
- Border: 1px solid Gray-300
- Overflow: hidden
- Markers: Black pins

---

## 🎬 Animations

### Transition System

```css
/* Timing Functions */
--ease-standard: cubic-bezier(0.4, 0, 0.2, 1);
--ease-decelerate: cubic-bezier(0, 0, 0.2, 1);
--ease-accelerate: cubic-bezier(0.4, 0, 1, 1);

/* Durations */
--duration-fast: 150ms;
--duration-base: 200ms;
--duration-slow: 300ms;
```

### Animation Patterns

1. **Fade In/Out**
   - Opacity: 0 → 1
   - Duration: 200ms
   - Easing: Standard

2. **Slide Up**
   - Transform: translateY(20px) → 0
   - Opacity: 0 → 1
   - Duration: 300ms
   - Easing: Decelerate

3. **Scale**
   - Transform: scale(0.95) → 1
   - Duration: 150ms
   - Easing: Standard

4. **Button Press**
   - Transform: scale(1) → 0.98
   - Duration: 100ms
   - Easing: Standard

---

## 📱 Responsive Design

### Breakpoints

```css
--screen-sm: 640px; /* Mobile */
--screen-md: 768px; /* Tablet */
--screen-lg: 1024px; /* Desktop */
--screen-xl: 1280px; /* Large Desktop */
```

### Mobile-First Approach

1. **Base (Mobile)**: 320px - 639px
2. **Tablet**: 640px - 1023px
3. **Desktop**: 1024px+

### Touch Targets

- **Minimum**: 44x44px (WCAG AAA)
- **Recommended**: 48x48px
- **Spacing**: 8px between targets

---

## ♿ Accessibility

### WCAG 2.1 Level AAA Compliance

1. **Color Contrast**
   - Text: 7:1 (AAA)
   - Large Text: 4.5:1 (AAA)
   - UI Components: 3:1 (AA)

2. **Focus Indicators**
   - 2px solid Black
   - 4px offset
   - Visible on all interactive elements

3. **Keyboard Navigation**
   - Tab order logical
   - Skip links provided
   - Focus trap in modals

4. **Screen Readers**
   - ARIA labels on icons
   - Semantic HTML
   - Live regions for updates

---

## 🎯 Implementation Phases

### Phase 1: Foundation (Day 1)

- [ ] Create vector icon library
- [ ] Implement monochrome color system
- [ ] Setup typography system
- [ ] Create base components

### Phase 2: Components (Day 2)

- [ ] Top bar with vector icons
- [ ] Step indicator (minimalist)
- [ ] Location input (geometric)
- [ ] Vehicle cards (vector-based)

### Phase 3: Interactions (Day 3)

- [ ] Button states and animations
- [ ] Map integration (clean style)
- [ ] Loading states (minimal)
- [ ] Error states (clear)

### Phase 4: Polish (Day 4)

- [ ] Accessibility audit
- [ ] Performance optimization
- [ ] Cross-browser testing
- [ ] Documentation

---

## 📊 Success Metrics

### Design Quality

- [ ] 100% vector graphics (no raster)
- [ ] WCAG AAA compliance
- [ ] < 3 colors used
- [ ] Consistent 8px grid

### Performance

- [ ] < 50KB CSS bundle
- [ ] < 100KB total assets
- [ ] 60fps animations
- [ ] < 100ms interaction response

### User Experience

- [ ] < 2 seconds to comprehend
- [ ] < 3 taps to book
- [ ] 0 confusion points
- [ ] 100% task completion

---

## 🔗 References

### Design Inspiration

- Swiss Design Principles
- Bauhaus Movement
- Dieter Rams' 10 Principles
- Material Design (Minimalist aspects)

### Technical Standards

- WCAG 2.1 Guidelines
- Apple Human Interface Guidelines
- Google Material Design
- W3C Accessibility Standards

---

**Status**: ✅ Ready for Implementation  
**Next**: Create vector icon library and CSS framework
