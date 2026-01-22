# Admin Table Design System

**Date**: 2026-01-22  
**Status**: 📋 Specification  
**Priority**: 🎨 High - UI Consistency

---

## 📋 Overview

Establish a consistent, modern table design system for all admin views to improve visual hierarchy, readability, and user experience.

---

## 🎯 Goals

1. **Visual Consistency** - All admin tables follow the same design patterns
2. **Enhanced Readability** - Better typography, spacing, and visual hierarchy
3. **Improved Accessibility** - WCAG 2.1 AA compliant tables
4. **Mobile Responsive** - Tables work well on all screen sizes
5. **Modern Aesthetics** - Gradients, shadows, and smooth interactions

---

## 🎨 Design Patterns

### Pattern 1: Page Header with Icon Badge

**Current (Basic)**:

```vue
<div class="bg-white border-b border-gray-200 px-6 py-4">
  <h1 class="text-2xl font-bold text-gray-900">จัดการลูกค้า</h1>
  <p class="text-sm text-gray-600 mt-1">ทั้งหมด {{ totalCount }} คน</p>
</div>
```

**New (Enhanced with Icon Badge)**:

```vue
<div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6 lg:p-8">
  <div class="mb-8">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <div class="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg">
            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          จัดการลูกค้า
        </h1>
        <p class="text-gray-600 mt-2 flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          ทั้งหมด {{ totalCount }} คน
        </p>
      </div>
    </div>
  </div>
</div>
```

**Changes**:

- Page background: `bg-gradient-to-br from-gray-50 to-gray-100`
- Responsive padding: `p-4 sm:p-6 lg:p-8`
- Title size: `text-2xl` → `text-3xl`
- Added gradient icon badge: `w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl shadow-lg`
- Icon in subtitle for visual hierarchy
- Responsive layout: `flex-col sm:flex-row`
- Increased spacing: `mb-8`

### Pattern 2: Stats Cards with Border Indicators

**Design Philosophy**: Clean, minimal cards with colored left borders for status indication. No gradients or decorative elements.

**Layout**:

```vue
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
  <!-- Card structure -->
</div>
```

**Card Structure**:

```vue
<div class="bg-white px-6 py-4 rounded-xl shadow-sm border-l-4 border-l-{color}-400 hover:shadow-md transition-shadow">
  <div class="text-sm font-medium text-gray-600">Label</div>
  <div class="text-3xl font-bold text-{color}-600 mt-1">{{ value }}</div>
  <div class="text-xs text-gray-500 mt-1">{{ subtext }}</div>
</div>
```

**Color Coding**:

- **Pending/Warning**: `border-l-yellow-400`, `text-yellow-600`
- **Approved/Success**: `border-l-green-400`, `text-green-600`
- **Rejected/Error**: `border-l-red-400`, `text-red-600`
- **Info/Today**: `border-l-blue-400`, `text-blue-600`

**Complete Example** (from AdminTopupRequestsView):

```vue
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
  <!-- Pending Card -->
  <div class="bg-white px-6 py-4 rounded-xl shadow-sm border-l-4 border-l-yellow-400 hover:shadow-md transition-shadow">
    <div class="text-sm font-medium text-gray-600">รอดำเนินการ</div>
    <div class="text-3xl font-bold text-yellow-600 mt-1">
      {{ stats.total_pending }}
    </div>
    <div class="text-xs text-gray-500 mt-1">
      {{ formatCurrency(stats.total_pending_amount) }}
    </div>
  </div>

  <!-- Approved Card -->
  <div class="bg-white px-6 py-4 rounded-xl shadow-sm border-l-4 border-l-green-400 hover:shadow-md transition-shadow">
    <div class="text-sm font-medium text-gray-600">อนุมัติแล้ว</div>
    <div class="text-3xl font-bold text-green-600 mt-1">
      {{ stats.total_approved }}
    </div>
    <div class="text-xs text-gray-500 mt-1">
      {{ formatCurrency(stats.total_approved_amount) }}
    </div>
  </div>

  <!-- Rejected Card -->
  <div class="bg-white px-6 py-4 rounded-xl shadow-sm border-l-4 border-l-red-400 hover:shadow-md transition-shadow">
    <div class="text-sm font-medium text-gray-600">ปฏิเสธ</div>
    <div class="text-3xl font-bold text-red-600 mt-1">
      {{ stats.total_rejected }}
    </div>
  </div>

  <!-- Today Card -->
  <div class="bg-white px-6 py-4 rounded-xl shadow-sm border-l-4 border-l-blue-400 hover:shadow-md transition-shadow">
    <div class="text-sm font-medium text-gray-600">วันนี้</div>
    <div class="text-3xl font-bold text-blue-600 mt-1">
      {{ stats.today_approved }}
    </div>
    <div class="text-xs text-gray-500 mt-1">
      {{ formatCurrency(stats.today_approved_amount) }}
    </div>
  </div>
</div>
```

**Features**:

- White background with rounded corners (`rounded-xl`)
- Color-coded left border (`border-l-4 border-l-{color}-400`)
- Label on top, value in middle, subtext at bottom
- Large value text (`text-3xl font-bold`)
- Hover effect (`hover:shadow-md transition-shadow`)
- Consistent padding (`px-6 py-4`)
- Responsive grid (1 → 2 → 4 columns)

**Benefits**:

- **Consistency**: Matches admin UI design system
- **Readability**: Clean, easy to scan
- **Performance**: Minimal DOM complexity
- **Accessibility**: Good contrast ratios
- **Maintainability**: Simple, reusable pattern

### Pattern 3: Enhanced Table Container

**Current (Basic)**:

```vue
<div class="bg-white rounded-lg shadow overflow-hidden">
  <table>...</table>
</div>
```

**New (Enhanced)**:

```vue
<div
  class="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden"
>
  <table>...</table>
</div>
```

**Changes**:

- `rounded-lg` → `rounded-2xl` (more modern)
- `shadow` → `shadow-lg` (more depth)
- Added `border border-gray-200` (subtle definition)

### Pattern 4: Gradient Table Header

**Current (Flat)**:

```vue
<thead class="bg-gray-50">
  <tr>
    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
      Column Name
    </th>
  </tr>
</thead>
```

**New (Gradient with Icons)**:

```vue
<thead class="bg-gradient-to-r from-gray-50 to-gray-100">
  <tr>
    <th class="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
      <div class="flex items-center gap-2">
        <!-- Icon SVG -->
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="..." />
        </svg>
        Column Name
      </div>
    </th>
  </tr>
</thead>
```

**Changes**:

- `bg-gray-50` → `bg-gradient-to-r from-gray-50 to-gray-100`
- `py-3` → `py-4` (more breathing room)
- `font-medium` → `font-bold` (stronger hierarchy)
- `text-gray-500` → `text-gray-700` (better contrast)
- Added `tracking-wider` (better readability)
- Added icon with flex layout

### Pattern 5: Status-Based Row Styling

**Implementation**:

```vue
<tr :class="getRowClass(item.status)">
  <!-- cells -->
</tr>
```

```typescript
function getRowClass(status: string) {
  const baseClass = "hover:bg-gray-50 transition-colors duration-200";

  switch (status) {
    case "pending":
      return `${baseClass} bg-gradient-to-r from-yellow-50 to-transparent border-l-4 border-l-yellow-400`;
    case "approved":
    case "completed":
      return `${baseClass} bg-gradient-to-r from-green-50 to-transparent border-l-4 border-l-green-400`;
    case "rejected":
    case "cancelled":
      return `${baseClass} bg-gradient-to-r from-red-50 to-transparent border-l-4 border-l-red-400`;
    case "active":
      return `${baseClass} bg-gradient-to-r from-blue-50 to-transparent border-l-4 border-l-blue-400`;
    default:
      return baseClass;
  }
}
```

**Benefits**:

- Instant visual status recognition
- Color-coded left border
- Subtle gradient background
- Smooth hover transitions

### Pattern 6: Enhanced Table Cells

**Current**:

```vue
<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
  {{ value }}
</td>
```

**New (with hierarchy)**:

```vue
<td class="px-6 py-5 whitespace-nowrap">
  <div class="text-sm font-semibold text-gray-900">
    {{ primaryValue }}
  </div>
  <div class="text-xs text-gray-500 mt-1">
    {{ secondaryValue }}
  </div>
</td>
```

**Changes**:

- `py-4` → `py-5` (more space)
- Hierarchical text structure
- Primary value: `font-semibold text-gray-900`
- Secondary value: `text-xs text-gray-500 mt-1`

---

## 🎨 Icon Library for Table Headers

### Common Column Icons

```vue
<!-- User/Customer -->
<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
</svg>

<!-- Amount/Money -->
<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
</svg>

<!-- Payment/Credit Card -->
<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
        d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
</svg>

<!-- Status/Check Circle -->
<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
</svg>

<!-- Date/Calendar -->
<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
</svg>

<!-- Actions/Settings -->
<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
</svg>

<!-- Image/Photo -->
<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
</svg>

<!-- Location/Map -->
<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
</svg>
```

---

## 📊 Status Badge Design

### Enhanced Status Badges

```vue
<template>
  <span
    :class="getStatusClass(status)"
    class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm"
  >
    <span :class="getDotClass(status)" class="w-2 h-2 rounded-full"></span>
    {{ getStatusText(status) }}
  </span>
</template>

<script setup lang="ts">
function getStatusClass(status: string) {
  switch (status) {
    case "pending":
      return "bg-yellow-100 text-yellow-800 border border-yellow-200";
    case "approved":
    case "completed":
      return "bg-green-100 text-green-800 border border-green-200";
    case "rejected":
    case "cancelled":
      return "bg-red-100 text-red-800 border border-red-200";
    case "active":
      return "bg-blue-100 text-blue-800 border border-blue-200";
    default:
      return "bg-gray-100 text-gray-800 border border-gray-200";
  }
}

function getDotClass(status: string) {
  const baseClass = status === "pending" ? "animate-pulse" : "";

  switch (status) {
    case "pending":
      return `${baseClass} bg-yellow-500`;
    case "approved":
    case "completed":
      return `bg-green-500`;
    case "rejected":
    case "cancelled":
      return `bg-red-500`;
    case "active":
      return `bg-blue-500`;
    default:
      return `bg-gray-500`;
  }
}
</script>
```

**Features**:

- Colored background with border
- Animated pulse dot for pending status
- Static dot for other statuses
- Rounded pill shape
- Shadow for depth

---

## 🎯 Action Buttons Design

### Enhanced Action Buttons

```vue
<!-- Approve Button -->
<button
  class="min-h-[44px] px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 disabled:opacity-50 transition-all shadow-sm hover:shadow-md font-medium flex items-center gap-2"
  :disabled="loading"
>
  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
  </svg>
  อนุมัติ
</button>

<!-- Reject Button -->
<button
  class="min-h-[44px] px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 disabled:opacity-50 transition-all shadow-sm hover:shadow-md font-medium flex items-center gap-2"
  :disabled="loading"
>
  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
  </svg>
  ปฏิเสธ
</button>

<!-- View Button -->
<button
  class="min-h-[44px] px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 transition-all shadow-sm hover:shadow-md font-medium flex items-center gap-2"
>
  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
  ดู
</button>
```

**Features**:

- Gradient backgrounds
- Icon + text layout
- Minimum 44px height (accessibility)
- Hover state with shadow increase
- Disabled state
- Smooth transitions

---

## 📱 Responsive Table Patterns

### Mobile: Card Layout

```vue
<!-- Desktop: Table -->
<div class="hidden lg:block">
  <table>...</table>
</div>

<!-- Mobile: Cards -->
<div class="lg:hidden space-y-4">
  <div v-for="item in items" :key="item.id"
       class="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
    <div class="flex items-start justify-between mb-3">
      <div>
        <div class="font-semibold text-gray-900">{{ item.name }}</div>
        <div class="text-sm text-gray-500">{{ item.email }}</div>
      </div>
      <span :class="getStatusClass(item.status)">
        {{ item.status }}
      </span>
    </div>

    <div class="space-y-2 text-sm">
      <div class="flex justify-between">
        <span class="text-gray-500">จำนวน:</span>
        <span class="font-medium">{{ formatCurrency(item.amount) }}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-gray-500">วันที่:</span>
        <span class="font-medium">{{ formatDate(item.date) }}</span>
      </div>
    </div>

    <div class="mt-4 flex gap-2">
      <button class="flex-1 ...">อนุมัติ</button>
      <button class="flex-1 ...">ปฏิเสธ</button>
    </div>
  </div>
</div>
```

---

## ✅ Implementation Checklist

### For Each Admin Table View

- [ ] Apply enhanced container styling
- [ ] Add gradient header with icons
- [ ] Implement status-based row styling
- [ ] Use hierarchical cell content
- [ ] Add enhanced status badges
- [ ] Update action buttons with gradients
- [ ] Implement mobile card layout
- [ ] Test accessibility (keyboard, screen reader)
- [ ] Test responsive design (mobile, tablet, desktop)
- [ ] Verify color contrast ratios

---

## 🎯 Priority Views to Update

### High Priority (User-Facing)

1. ✅ Top-up Requests (completed)
2. ✅ Customers List (header enhanced)
3. ⏳ Providers List
4. ⏳ Orders/Rides List
5. ⏳ Withdrawal Requests

### Medium Priority (Admin Operations)

6. ⏳ Users & Permissions
7. ⏳ Notifications List
8. ⏳ Audit Logs
9. ⏳ Reports

### Low Priority (Settings)

10. ⏳ Custom Pages List
11. ⏳ Payment Methods
12. ⏳ Service Areas

---

## 📚 Related Documentation

- [Top-up Requests View Enhancement](../admin-settings-ux-redesign/TOPUP-REQUESTS-VIEW-ENHANCEMENT.md) - Reference implementation
- [Implementation Summary](../admin-settings-ux-redesign/IMPLEMENTATION-SUMMARY.md) - Design system overview
- [Design Tokens](../../src/admin/styles/design-tokens.ts) - Color and spacing system

---

**Created**: 2026-01-22  
**Status**: 📋 Ready for Implementation  
**Next**: Apply to high-priority views
