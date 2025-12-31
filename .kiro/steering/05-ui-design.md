# UI/UX Design System - Thai Ride App (MUNEEF Style)

## 🎨 Design Philosophy

```
MUNEEF Design = Clean + Modern + Green Accent + User-Friendly

Core Values:
├── Simplicity     → ไม่ซับซ้อน เข้าใจง่าย
├── Consistency    → รูปแบบเดียวกันทั้ง app
├── Accessibility  → ทุกคนใช้งานได้
└── Mobile-First   → ออกแบบสำหรับมือถือเป็นหลัก
```

---

## 🎨 Color System

### Design Tokens

```css
:root {
  /* Primary Colors */
  --color-primary: #00a86b; /* Green - Main accent */
  --color-primary-hover: #008f5b; /* Dark Green */
  --color-primary-light: #e8f5ef; /* Light Green */
  --color-primary-alpha: rgba(0, 168, 107, 0.1);

  /* Text Colors */
  --color-text-primary: #1a1a1a; /* Near Black */
  --color-text-secondary: #666666; /* Gray */
  --color-text-muted: #999999; /* Light Gray */
  --color-text-inverse: #ffffff; /* White */

  /* Background Colors */
  --color-bg-primary: #ffffff; /* White */
  --color-bg-secondary: #f5f5f5; /* Off White */
  --color-bg-tertiary: #fafafa; /* Very Light Gray */

  /* Border Colors */
  --color-border: #e8e8e8; /* Light Gray */
  --color-border-light: #f0f0f0; /* Very Light Gray */
  --color-border-focus: #00a86b; /* Green */

  /* Status Colors */
  --color-success: #00a86b; /* Green */
  --color-warning: #f5a623; /* Orange */
  --color-error: #e53935; /* Red */
  --color-info: #2196f3; /* Blue */

  /* Map Markers */
  --color-marker-pickup: #00a86b; /* Green */
  --color-marker-destination: #e53935; /* Red */
}
```

### Color Usage Matrix

| Element              | Color     | Token                    |
| :------------------- | :-------- | :----------------------- |
| Primary Button       | `#00A86B` | `--color-primary`        |
| Primary Button Hover | `#008F5B` | `--color-primary-hover`  |
| Secondary Button     | `#F5F5F5` | `--color-bg-secondary`   |
| Headings             | `#1A1A1A` | `--color-text-primary`   |
| Body Text            | `#666666` | `--color-text-secondary` |
| Placeholder          | `#999999` | `--color-text-muted`     |
| Card Background      | `#FFFFFF` | `--color-bg-primary`     |
| Page Background      | `#F5F5F5` | `--color-bg-secondary`   |
| Border               | `#E8E8E8` | `--color-border`         |
| Focus Ring           | `#00A86B` | `--color-border-focus`   |

---

## 📝 Typography

### Font Stack

```css
:root {
  --font-family: "Sarabun", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    sans-serif;
  --font-family-mono: "SF Mono", Monaco, "Courier New", monospace;
}
```

### Type Scale

```css
:root {
  /* Font Sizes */
  --text-xs: 0.75rem; /* 12px */
  --text-sm: 0.875rem; /* 14px */
  --text-base: 1rem; /* 16px */
  --text-lg: 1.125rem; /* 18px */
  --text-xl: 1.25rem; /* 20px */
  --text-2xl: 1.5rem; /* 24px */
  --text-3xl: 1.875rem; /* 30px */
  --text-4xl: 2.25rem; /* 36px */

  /* Font Weights */
  --font-normal: 400;
  --font-medium: 500;
  --font-semibold: 600;
  --font-bold: 700;

  /* Line Heights */
  --leading-tight: 1.25;
  --leading-normal: 1.5;
  --leading-relaxed: 1.75;
}
```

### Typography Classes

```css
/* Headings */
.heading-1 {
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  color: var(--color-text-primary);
  line-height: var(--leading-tight);
}

.heading-2 {
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  color: var(--color-text-primary);
}

.heading-3 {
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
}

/* Body */
.body-large {
  font-size: var(--text-lg);
  color: var(--color-text-secondary);
}

.body-base {
  font-size: var(--text-base);
  color: var(--color-text-secondary);
}

.body-small {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

/* Special */
.label {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.caption {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}
```

---

## 📐 Spacing System

### Spacing Scale

```css
:root {
  --space-0: 0;
  --space-1: 0.25rem; /* 4px */
  --space-2: 0.5rem; /* 8px */
  --space-3: 0.75rem; /* 12px */
  --space-4: 1rem; /* 16px */
  --space-5: 1.25rem; /* 20px */
  --space-6: 1.5rem; /* 24px */
  --space-8: 2rem; /* 32px */
  --space-10: 2.5rem; /* 40px */
  --space-12: 3rem; /* 48px */
  --space-16: 4rem; /* 64px */
}
```

### Border Radius

```css
:root {
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 14px;
  --radius-xl: 16px;
  --radius-2xl: 20px;
  --radius-full: 9999px;
}
```

### Shadows

```css
:root {
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.07);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
  --shadow-primary: 0 4px 12px rgba(0, 168, 107, 0.3);
}
```

---

## 🧩 Component Library

### Buttons

```css
/* Base Button */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-4) var(--space-6);
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  border-radius: var(--radius-lg);
  transition: all 0.2s ease;
  cursor: pointer;
  min-height: 44px; /* Touch-friendly */
}

/* Primary Button */
.btn-primary {
  background-color: var(--color-primary);
  color: var(--color-text-inverse);
  border: none;
  box-shadow: var(--shadow-primary);
}

.btn-primary:hover {
  background-color: var(--color-primary-hover);
}

.btn-primary:active {
  transform: scale(0.98);
}

/* Secondary Button */
.btn-secondary {
  background-color: var(--color-bg-secondary);
  color: var(--color-text-primary);
  border: none;
}

.btn-secondary:hover {
  background-color: var(--color-border);
}

/* Outline Button */
.btn-outline {
  background-color: transparent;
  color: var(--color-primary);
  border: 2px solid var(--color-primary);
}

.btn-outline:hover {
  background-color: var(--color-primary-light);
}

/* Ghost Button */
.btn-ghost {
  background-color: transparent;
  color: var(--color-text-secondary);
  border: none;
}

.btn-ghost:hover {
  background-color: var(--color-bg-secondary);
}

/* Danger Button */
.btn-danger {
  background-color: var(--color-error);
  color: var(--color-text-inverse);
  border: none;
}

/* Button Sizes */
.btn-sm {
  padding: var(--space-2) var(--space-4);
  font-size: var(--text-sm);
  min-height: 36px;
}

.btn-lg {
  padding: var(--space-5) var(--space-8);
  font-size: var(--text-lg);
  min-height: 52px;
}

/* Full Width */
.btn-full {
  width: 100%;
}
```

### Cards

```css
/* Base Card */
.card {
  background-color: var(--color-bg-primary);
  border-radius: var(--radius-xl);
  padding: var(--space-4);
  border: 1px solid var(--color-border-light);
}

/* Card with Shadow */
.card-elevated {
  background-color: var(--color-bg-primary);
  border-radius: var(--radius-xl);
  padding: var(--space-4);
  box-shadow: var(--shadow-md);
  border: none;
}

/* Interactive Card */
.card-interactive {
  cursor: pointer;
  transition: all 0.2s ease;
}

.card-interactive:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.card-interactive:active {
  transform: translateY(0);
}
```

### Input Fields

```css
/* Base Input */
.input {
  width: 100%;
  padding: var(--space-4);
  font-size: var(--text-base);
  color: var(--color-text-primary);
  background-color: var(--color-bg-primary);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  transition: border-color 0.2s ease;
}

.input::placeholder {
  color: var(--color-text-muted);
}

.input:focus {
  outline: none;
  border-color: var(--color-border-focus);
}

.input:disabled {
  background-color: var(--color-bg-secondary);
  cursor: not-allowed;
}

/* Input with Error */
.input-error {
  border-color: var(--color-error);
}

/* Input Label */
.input-label {
  display: block;
  margin-bottom: var(--space-2);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
}

/* Input Helper Text */
.input-helper {
  margin-top: var(--space-1);
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.input-error-text {
  margin-top: var(--space-1);
  font-size: var(--text-xs);
  color: var(--color-error);
}
```

### Badges & Status

```css
/* Base Badge */
.badge {
  display: inline-flex;
  align-items: center;
  padding: var(--space-1) var(--space-3);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  border-radius: var(--radius-full);
}

/* Status Badges */
.badge-success {
  background-color: var(--color-primary-light);
  color: var(--color-primary);
}

.badge-warning {
  background-color: #fef3e2;
  color: var(--color-warning);
}

.badge-error {
  background-color: #ffebee;
  color: var(--color-error);
}

.badge-info {
  background-color: #e3f2fd;
  color: var(--color-info);
}

.badge-neutral {
  background-color: var(--color-bg-secondary);
  color: var(--color-text-secondary);
}
```

---

## 🚫 Icon Guidelines (CRITICAL)

### ❌ FORBIDDEN: Emoji Usage

```vue
<!-- ❌ WRONG - Never use emoji -->
<span>🚗</span>
<span>📍</span>
<span>💰</span>

<!-- ✅ CORRECT - Always use SVG -->
<svg class="icon" viewBox="0 0 24 24">...</svg>
<IconCar class="icon" />
```

### SVG Icon Standards

```css
/* Icon Sizes */
.icon-sm {
  width: 16px;
  height: 16px;
}
.icon-md {
  width: 20px;
  height: 20px;
}
.icon-lg {
  width: 24px;
  height: 24px;
}
.icon-xl {
  width: 32px;
  height: 32px;
}

/* Icon Colors */
.icon-primary {
  color: var(--color-primary);
}
.icon-secondary {
  color: var(--color-text-secondary);
}
.icon-muted {
  color: var(--color-text-muted);
}
```

### Icon Component Pattern

```vue
<template>
  <svg
    :class="['icon', sizeClass, colorClass]"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <slot />
  </svg>
</template>

<script setup lang="ts">
defineProps<{
  size?: "sm" | "md" | "lg" | "xl";
  color?: "primary" | "secondary" | "muted";
}>();
</script>
```

---

## 📱 Layout Patterns

### Mobile-First Grid

```css
/* Container */
.container {
  width: 100%;
  max-width: 428px; /* iPhone 14 Pro Max */
  margin: 0 auto;
  padding: 0 var(--space-4);
}

/* Safe Area */
.safe-area-top {
  padding-top: env(safe-area-inset-top);
}

.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}
```

### Page Layout

```css
/* Full Page with Bottom Nav */
.page-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-height: 100dvh; /* Dynamic viewport height */
}

.page-content {
  flex: 1;
  overflow-y: auto;
  padding-bottom: 80px; /* Space for bottom nav */
}

/* Map Page Layout */
.map-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh;
}

.map-container {
  flex: 1;
  min-height: 45vh;
}

.bottom-sheet {
  background: var(--color-bg-primary);
  border-radius: var(--radius-2xl) var(--radius-2xl) 0 0;
  padding: var(--space-4);
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.1);
}
```

### Bottom Navigation

```css
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-around;
  align-items: center;
  height: 64px;
  background: var(--color-bg-primary);
  border-top: 1px solid var(--color-border-light);
  padding-bottom: env(safe-area-inset-bottom);
}

.bottom-nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-2);
  color: var(--color-text-muted);
  transition: color 0.2s ease;
}

.bottom-nav-item.active {
  color: var(--color-primary);
}
```

---

## 🎭 Animation Guidelines

### Transition Tokens

```css
:root {
  --transition-fast: 150ms ease;
  --transition-normal: 200ms ease;
  --transition-slow: 300ms ease;
  --transition-spring: 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

### Standard Animations

```css
/* Fade In */
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* Slide Up */
@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Scale In */
@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* Pulse */
@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
```

### Animation Classes

```css
.animate-fade-in {
  animation: fadeIn var(--transition-normal);
}

.animate-slide-up {
  animation: slideUp var(--transition-slow);
}

.animate-scale-in {
  animation: scaleIn var(--transition-spring);
}

.animate-pulse {
  animation: pulse 2s infinite;
}
```

### Animation Rules

```
✅ DO:
- Use subtle animations (opacity, transform)
- Keep duration under 300ms for interactions
- Use ease or spring curves
- Animate on user interaction

❌ DON'T:
- Use flashy or distracting animations
- Animate colors or backgrounds excessively
- Use animations that block user interaction
- Auto-play animations without purpose
```

---

## ♿ Accessibility Standards

### Touch Targets

```css
/* Minimum touch target: 44x44px */
.touch-target {
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

### Focus States

```css
/* Visible focus for keyboard navigation */
.focusable:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* Remove default focus for mouse users */
.focusable:focus:not(:focus-visible) {
  outline: none;
}
```

### Color Contrast

```
Minimum Contrast Ratios:
├── Normal text: 4.5:1
├── Large text (18px+): 3:1
├── UI components: 3:1
└── Focus indicators: 3:1

Our Colors Pass:
├── #1A1A1A on #FFFFFF → 16.1:1 ✅
├── #666666 on #FFFFFF → 5.7:1 ✅
├── #00A86B on #FFFFFF → 3.5:1 ✅ (large text only)
└── #FFFFFF on #00A86B → 3.5:1 ✅ (large text only)
```

### Screen Reader Support

```vue
<!-- Use semantic HTML -->
<button>Submit</button>
<nav aria-label="Main navigation">...</nav>

<!-- Add aria labels for icons -->
<button aria-label="Close dialog">
  <IconClose />
</button>

<!-- Use live regions for dynamic content -->
<div aria-live="polite" aria-atomic="true">
  {{ statusMessage }}
</div>
```

---

## 📋 Component Checklist

### Before Creating a Component

```
□ Does it follow MUNEEF color palette?
□ Does it use design tokens (not hardcoded values)?
□ Is it touch-friendly (min 44px targets)?
□ Does it have proper focus states?
□ Does it use SVG icons (no emoji)?
□ Is it responsive (mobile-first)?
□ Does it have loading/error states?
□ Is it accessible (ARIA labels, contrast)?
```

### Component Documentation Template

```vue
<template>
  <!-- Component markup -->
</template>

<script setup lang="ts">
/**
 * @component ComponentName
 * @description Brief description
 *
 * @example
 * <ComponentName variant="primary" size="md" />
 *
 * @props
 * - variant: 'primary' | 'secondary' | 'outline'
 * - size: 'sm' | 'md' | 'lg'
 * - disabled: boolean
 *
 * @emits
 * - click: () => void
 *
 * @slots
 * - default: Main content
 * - icon: Icon slot
 */
</script>
```

---

## 🚫 Do's and Don'ts Summary

### ✅ DO

| Category   | Rule                                      |
| :--------- | :---------------------------------------- |
| Colors     | Use green (#00A86B) as primary accent     |
| Background | Use white as main background              |
| Spacing    | Use generous whitespace                   |
| Typography | Use readable font sizes (min 14px)        |
| CTA        | Make primary actions stand out with green |
| Animation  | Use subtle, purposeful animations         |
| Radius     | Use rounded corners (12-20px)             |
| Icons      | Use SVG icons only                        |

### ❌ DON'T

| Category   | Rule                              |
| :--------- | :-------------------------------- |
| Colors     | Use multiple bright colors        |
| Layout     | Overcrowd elements                |
| Effects    | Use heavy gradients or shadows    |
| Typography | Use multiple font families        |
| Complexity | Make UI overly complex            |
| Icons      | **NEVER use Emoji**               |
| Buttons    | Use black as primary button color |
| Animation  | Use distracting animations        |

---

**Version**: 2.0.0
**Last Updated**: December 29, 2024
