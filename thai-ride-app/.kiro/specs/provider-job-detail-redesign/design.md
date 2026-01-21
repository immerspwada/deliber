# Provider Job Detail - System Design

## 🎨 Design Overview

หน้า Provider Job Detail ออกแบบตามหลัก **Professional Minimalism** โดยเน้น:

- **สะอาด**: Black & White base, ไม่มีสีฟุ่มเฟือย
- **ชัดเจน**: ข้อมูลสำคัญเด่น, ลำดับชัดเจน
- **สะดวก**: Touch-friendly, ใช้งานง่ายด้วยมือเดียว
- **มืออาชีพ**: Typography ดี, Spacing สม่ำเสมอ, Animation ลื่นไหล

## 📐 Layout Architecture

### Screen Structure

```
┌─────────────────────────────────┐
│ Header (Sticky)                 │ 60px
├─────────────────────────────────┤
│ Status Progress                 │ 100px
├─────────────────────────────────┤
│                                 │
│ Scrollable Content:             │
│ - Completed/Cancelled Banner    │
│ - Customer Card                 │
│ - ETA Card                      │
│ - Route Card                    │
│ - Notes Card                    │
│ - Photo Evidence                │
│                                 │
├─────────────────────────────────┤
│ Action Bar (Fixed Bottom)       │ 180px
└─────────────────────────────────┘
```

### Z-Index Layers

```typescript
const Z_INDEX = {
  base: 0, // Content
  dropdown: 10, // Dropdowns
  sticky: 20, // Sticky header
  drawer: 30, // Chat drawer
  modal: 40, // Cancel modal
  toast: 50, // Toast notifications
};
```

## 🎨 Visual Design System

### Color Palette

```typescript
const COLORS = {
  // Primary (Black & White)
  black: "#000000",
  white: "#FFFFFF",

  // Grays (Neutral)
  gray: {
    50: "#F9FAFB", // Background light
    100: "#F3F4F6", // Background
    200: "#E5E7EB", // Border light
    300: "#D1D5DB", // Border
    400: "#9CA3AF", // Text muted
    500: "#6B7280", // Text secondary
    600: "#4B5563", // Text primary
    900: "#111827", // Text dark
  },

  // Status Colors (Minimal use)
  success: "#10B981", // Green
  error: "#EF4444", // Red
  warning: "#F59E0B", // Amber
  info: "#3B82F6", // Blue
};
```

### Typography Scale

```typescript
const TYPOGRAPHY = {
  // Headers
  h1: {
    fontSize: "24px",
    fontWeight: 700,
    lineHeight: 1.2,
    letterSpacing: "-0.02em",
  },
  h2: {
    fontSize: "20px",
    fontWeight: 700,
    lineHeight: 1.3,
  },
  h3: {
    fontSize: "18px",
    fontWeight: 600,
    lineHeight: 1.4,
  },

  // Body
  body: {
    fontSize: "16px",
    fontWeight: 500,
    lineHeight: 1.5,
  },
  bodySmall: {
    fontSize: "14px",
    fontWeight: 500,
    lineHeight: 1.5,
  },

  // Labels
  label: {
    fontSize: "12px",
    fontWeight: 600,
    lineHeight: 1.4,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },

  // Display
  display: {
    fontSize: "32px",
    fontWeight: 700,
    lineHeight: 1.1,
  },
};
```

### Spacing System

```typescript
const SPACING = {
  xs: "4px",
  sm: "8px",
  md: "12px",
  lg: "16px",
  xl: "20px",
  "2xl": "24px",
  "3xl": "32px",
  "4xl": "40px",
};
```

### Border Radius

```typescript
const RADIUS = {
  none: "0px", // Sharp corners (primary style)
  sm: "4px", // Subtle
  md: "8px", // Standard
  lg: "12px", // Cards
  full: "9999px", // Pills, avatars
};
```

### Shadows

```typescript
const SHADOWS = {
  none: "none",
  sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
  md: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
  lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
  xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
};
```

## 🧩 Component Design

### 1. Header Component

```vue
<template>
  <header class="header">
    <button class="back-btn" @click="goBack">
      <BackIcon />
    </button>
    <div class="header-title">
      <h1>รายละเอียดงาน</h1>
      <span class="tracking-id">#{{ trackingId }}</span>
    </div>
    <div class="spacer" />
  </header>
</template>

<style>
.header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  background: #000;
  color: #fff;
  position: sticky;
  top: 0;
  z-index: 20;
}

.back-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: #fff;
  cursor: pointer;
  border-radius: 8px;
  transition: background 0.2s;
}

.back-btn:active {
  background: rgba(255, 255, 255, 0.1);
}

.header-title {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.header-title h1 {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.tracking-id {
  font-size: 12px;
  opacity: 0.7;
  font-weight: 500;
}
</style>
```

### 2. Status Progress Component

```vue
<template>
  <nav class="status-progress">
    <div
      v-for="(step, index) in steps"
      :key="step.key"
      class="step"
      :class="{
        active: index === currentIndex,
        completed: index < currentIndex,
      }"
    >
      <div class="step-circle">
        <CheckIcon v-if="index < currentIndex" />
        <span v-else>{{ index + 1 }}</span>
      </div>
      <span class="step-label">{{ step.label }}</span>
    </div>
  </nav>
</template>

<style>
.status-progress {
  display: flex;
  justify-content: space-between;
  padding: 24px 20px;
  position: relative;
}

.status-progress::before {
  content: "";
  position: absolute;
  top: 44px;
  left: 8%;
  right: 8%;
  height: 2px;
  background: #e5e7eb;
  z-index: 0;
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  flex: 1;
  position: relative;
  z-index: 1;
}

.step-circle {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #fff;
  border: 2px solid #d1d5db;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
  color: #9ca3af;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.step.completed .step-circle {
  background: #000;
  border-color: #000;
  color: #fff;
}

.step.active .step-circle {
  background: #000;
  border-color: #000;
  color: #fff;
  transform: scale(1.15);
  box-shadow: 0 0 0 4px rgba(0, 0, 0, 0.1);
}

.step-label {
  font-size: 11px;
  color: #6b7280;
  text-align: center;
  font-weight: 500;
}

.step.active .step-label {
  color: #000;
  font-weight: 700;
}
</style>
```

### 3. Customer Card Component

```vue
<template>
  <article class="customer-card">
    <div class="customer-avatar">
      <img v-if="customer.avatar" :src="customer.avatar" :alt="customer.name" />
      <UserIcon v-else />
    </div>
    <div class="customer-info">
      <h3>{{ customer.name }}</h3>
      <p v-if="distance">📍 ห่าง {{ distance }}</p>
    </div>
    <div class="contact-buttons">
      <button class="btn-call" @click="callCustomer" aria-label="โทรหาลูกค้า">
        <PhoneIcon />
      </button>
      <button class="btn-chat" @click="openChat" aria-label="แชทกับลูกค้า">
        <ChatIcon />
      </button>
    </div>
  </article>
</template>

<style>
.customer-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #fff;
  border: 2px solid #000;
  margin: 0 20px 16px;
}

.customer-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #f3f4f6;
  border: 2px solid #000;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}

.customer-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.customer-info {
  flex: 1;
  min-width: 0;
}

.customer-info h3 {
  font-size: 16px;
  font-weight: 700;
  color: #000;
  margin: 0 0 4px 0;
}

.customer-info p {
  font-size: 13px;
  color: #6b7280;
  margin: 0;
  font-weight: 500;
}

.contact-buttons {
  display: flex;
  gap: 8px;
}

.btn-call,
.btn-chat {
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
  border-radius: 50%;
  background: #000;
  border: 2px solid #000;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  padding: 10px;
}

.btn-call:active,
.btn-chat:active {
  transform: scale(0.95);
  background: #333;
}
</style>
```

### 4. ETA Card Component

```vue
<template>
  <article class="eta-card">
    <div class="eta-header">
      <span class="eta-icon">⏱️</span>
      <span class="eta-label">ถึง{{ destination }}</span>
    </div>
    <div class="eta-content">
      <div class="eta-time">
        <span class="eta-value">{{ formattedTime }}</span>
        <span class="eta-arrival">ถึงประมาณ {{ arrivalTime }}</span>
      </div>
      <div class="eta-distance">
        <span class="eta-km">{{ formattedDistance }}</span>
      </div>
    </div>
  </article>
</template>

<style>
.eta-card {
  margin: 0 20px 16px;
  background: #f9fafb;
  border: 2px solid #000;
  padding: 16px;
}

.eta-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.eta-icon {
  font-size: 20px;
}

.eta-label {
  font-size: 13px;
  color: #6b7280;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.eta-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.eta-time {
  display: flex;
  flex-direction: column;
}

.eta-value {
  font-size: 28px;
  font-weight: 700;
  color: #000;
  line-height: 1;
}

.eta-arrival {
  font-size: 13px;
  color: #6b7280;
  margin-top: 4px;
  font-weight: 500;
}

.eta-distance {
  font-size: 18px;
  font-weight: 700;
  color: #000;
}
</style>
```

### 5. Route Card Component

```vue
<template>
  <article class="route-card">
    <div class="route-point">
      <span class="point-marker pickup"></span>
      <div class="point-content">
        <span class="point-label">จุดรับ</span>
        <span class="point-address">{{ pickupAddress }}</span>
      </div>
    </div>
    <div class="route-line"></div>
    <div class="route-point">
      <span class="point-marker dropoff"></span>
      <div class="point-content">
        <span class="point-label">จุดส่ง</span>
        <span class="point-address">{{ dropoffAddress }}</span>
      </div>
    </div>
  </article>
</template>

<style>
.route-card {
  margin: 0 20px 16px;
  background: #fff;
  border: 2px solid #000;
  padding: 20px;
}

.route-point {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.point-marker {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  margin-top: 2px;
}

.point-marker.pickup {
  background: #000;
  border-radius: 50%;
}

.point-marker.dropoff {
  background: #000;
  border-radius: 4px;
}

.point-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.point-label {
  font-size: 11px;
  color: #6b7280;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.point-address {
  font-size: 14px;
  color: #000;
  line-height: 1.5;
  font-weight: 500;
}

.route-line {
  width: 2px;
  height: 24px;
  background: #000;
  margin: 4px 0 4px 9px;
}
</style>
```

### 6. Action Bar Component

```vue
<template>
  <div class="action-bar">
    <button class="btn-navigate" @click="openNavigation">
      <NavigationIcon />
      <span>นำทาง</span>
    </button>

    <button
      v-if="canUpdate"
      class="btn-primary"
      :class="{ completing: isLastStep }"
      :disabled="updating"
      @click="updateStatus"
    >
      <LoadingSpinner v-if="updating" />
      <span v-else>{{ nextAction }}</span>
    </button>

    <button
      v-if="!isCompleted"
      class="btn-cancel"
      @click="showCancelModal = true"
    >
      ยกเลิกงาน
    </button>
  </div>
</template>

<style>
.action-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16px 20px;
  padding-bottom: calc(16px + env(safe-area-inset-bottom));
  background: #fff;
  border-top: 2px solid #000;
  display: flex;
  flex-direction: column;
  gap: 12px;
  z-index: 20;
}

.btn-navigate {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 14px;
  min-height: 52px;
  background: #fff;
  color: #000;
  border: 2px solid #000;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-navigate:active {
  background: #000;
  color: #fff;
}

.btn-primary {
  padding: 16px;
  background: #000;
  color: #fff;
  border: 2px solid #000;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 56px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.btn-primary:active {
  background: #333;
  border-color: #333;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-cancel {
  padding: 12px;
  background: #fff;
  color: #000;
  border: 2px solid #000;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 44px;
}

.btn-cancel:active {
  background: #f3f4f6;
}
</style>
```

## 🎭 Interaction Design

### Touch Targets

```typescript
const TOUCH_TARGETS = {
  minimum: "44px", // WCAG AAA standard
  comfortable: "48px", // Recommended
  primary: "56px", // Primary actions
};
```

### Animations

```typescript
const ANIMATIONS = {
  // Durations
  fast: "150ms",
  normal: "200ms",
  slow: "300ms",

  // Easings
  easeOut: "cubic-bezier(0.4, 0, 0.2, 1)",
  easeIn: "cubic-bezier(0.4, 0, 1, 1)",
  easeInOut: "cubic-bezier(0.4, 0, 0.2, 1)",
  spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
};
```

### Feedback Patterns

```typescript
// Haptic Feedback
const HAPTICS = {
  light: () => navigator.vibrate(10),
  medium: () => navigator.vibrate(20),
  heavy: () => navigator.vibrate(30),
  success: () => navigator.vibrate([10, 50, 10]),
};

// Audio Feedback
const SOUNDS = {
  beep: () => new Audio("/sounds/beep.mp3").play(),
  success: () => new Audio("/sounds/success.mp3").play(),
  error: () => new Audio("/sounds/error.mp3").play(),
};
```

## 📱 Responsive Behavior

### Breakpoints

```typescript
const BREAKPOINTS = {
  mobile: "320px - 428px", // Primary target
  tablet: "768px - 1024px", // Optional
  desktop: "1280px+", // Not supported
};
```

### Mobile Optimizations

- Single column layout
- Fixed action bar at bottom
- Sticky header at top
- Scrollable content area
- Safe area insets for notch/home indicator

## ♿ Accessibility Features

### ARIA Labels

```vue
<button aria-label="โทรหาลูกค้า" aria-describedby="customer-name">
  <PhoneIcon aria-hidden="true" />
</button>
```

### Keyboard Navigation

- Tab order: Header → Content → Actions
- Enter/Space: Activate buttons
- Escape: Close modals

### Screen Reader Support

- Semantic HTML (nav, article, button)
- ARIA landmarks
- Live regions for updates
- Descriptive labels

### Color Contrast

- Text on white: ≥ 7:1 (AAA)
- Text on black: ≥ 7:1 (AAA)
- Interactive elements: ≥ 4.5:1 (AA)

## 🔄 State Management

### Component States

```typescript
type ViewState =
  | "loading"
  | "error"
  | "access-denied"
  | "content"
  | "completed"
  | "cancelled";

type ActionState = "idle" | "updating" | "success" | "error";
```

### Loading States

- Skeleton screens for initial load
- Spinner for actions
- Progress indicators for uploads
- Optimistic updates where possible

## 🎯 Performance Optimizations

### Code Splitting

```typescript
// Lazy load heavy components
const PhotoEvidence = defineAsyncComponent(
  () => import("@/components/provider/PhotoEvidence.vue")
);

const ChatDrawer = defineAsyncComponent(
  () => import("@/components/ChatDrawer.vue")
);
```

### Data Caching

```typescript
// Cache job data for 5 minutes
const CACHE_TTL = 5 * 60 * 1000;

// Debounce location updates
const LOCATION_UPDATE_INTERVAL = 5000;
```

### Image Optimization

- Lazy load images
- Responsive images (srcset)
- WebP format with fallback
- Resize before upload (max 1920px)

## 📊 Analytics Integration

### Event Tracking

```typescript
// Track user actions
analytics.track("provider_job_viewed", {
  job_id: jobId,
  status: currentStatus,
  timestamp: Date.now(),
});

analytics.track("provider_status_updated", {
  job_id: jobId,
  from_status: oldStatus,
  to_status: newStatus,
  duration_ms: updateDuration,
});
```

## 🧪 Testing Strategy

### Visual Regression Tests

- Screenshot comparison
- Multiple screen sizes
- Different states

### Interaction Tests

- Button clicks
- Form submissions
- Navigation flows

### Performance Tests

- Load time < 2s
- Time to Interactive < 3s
- No layout shifts (CLS = 0)

## 📚 Design Tokens

Export design tokens for consistency:

```typescript
export const tokens = {
  colors: COLORS,
  typography: TYPOGRAPHY,
  spacing: SPACING,
  radius: RADIUS,
  shadows: SHADOWS,
  animations: ANIMATIONS,
  breakpoints: BREAKPOINTS,
  zIndex: Z_INDEX,
};
```

## 🎨 Figma Integration

Design file structure:

- Components library
- Page templates
- Icon set
- Color styles
- Text styles
- Spacing grid
