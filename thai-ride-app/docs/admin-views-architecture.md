# Admin Views Architecture

This document describes the architecture and patterns used in the Kiro admin panel views.

## Overview

The admin panel follows a consistent architecture pattern across all views to ensure maintainability, reusability, and a cohesive user experience.

## View Structure Pattern

All admin views follow this standard structure:

```vue
<template>
  <div
    class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6 lg:p-8"
  >
    <!-- Header Section -->
    <div class="mb-8">
      <div
        class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <!-- Title with Icon -->
        <div>
          <h1 class="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <div
              class="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg"
            >
              <svg class="w-6 h-6 text-white"><!-- Icon --></svg>
            </div>
            Page Title
          </h1>
          <p class="text-gray-600 mt-2 flex items-center gap-2">
            <svg class="w-5 h-5"><!-- Icon --></svg>
            Description
          </p>
        </div>

        <!-- Action Buttons -->
        <button @click="refresh" :disabled="loading" class="btn-primary">
          <svg class="w-5 h-5"><!-- Icon --></svg>
          {{ loading ? "กำลังโหลด..." : "รีเฟรช" }}
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <div
        class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"
      ></div>
    </div>

    <!-- Error State -->
    <div
      v-else-if="error"
      class="bg-red-50 border border-red-200 rounded-xl p-6 mb-6"
    >
      <div class="flex items-start gap-3">
        <svg class="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5">
          <!-- Icon -->
        </svg>
        <div class="flex-1">
          <h3 class="text-red-800 font-semibold mb-1">เกิดข้อผิดพลาด</h3>
          <p class="text-red-700">{{ error }}</p>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div v-else>
      <!-- View-specific content -->
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import { useComposable } from "@/admin/composables/useComposable";

// Composables
const { loading, error, data, fetchData } = useComposable();

// Methods
async function refresh() {
  await fetchData();
}

// Lifecycle
onMounted(async () => {
  await fetchData();
});
</script>
```

## Key Components

### 1. Header Section

Every view includes a consistent header with:

- **Title with Icon**:
  - 3xl font size, bold
  - Gradient icon container (primary-500 to primary-600)
  - Rounded-xl with shadow
  - Icon in white

- **Description**:
  - Gray-600 text color
  - Settings icon
  - Brief description of the view's purpose

- **Action Buttons**:
  - Positioned on the right (desktop) or below (mobile)
  - Primary button styling
  - Loading state support
  - Disabled state during loading

### 2. State Management

Views use composables for state management:

```typescript
const {
  loading, // Boolean: loading state
  error, // String | null: error message
  data, // Type: view-specific data
  fetchData, // Function: fetch data
  updateData, // Function: update data
} = useComposable();
```

### 3. Loading State

Dedicated loading state with centered spinner:

```vue
<div v-if="loading" class="flex items-center justify-center py-12">
  <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
</div>
```

### 4. Error State

Dedicated error state with styled message:

```vue
<div v-if="error" class="bg-red-50 border border-red-200 rounded-xl p-6 mb-6">
  <div class="flex items-start gap-3">
    <svg class="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
    </svg>
    <div class="flex-1">
      <h3 class="text-red-800 font-semibold mb-1">เกิดข้อผิดพลาด</h3>
      <p class="text-red-700">{{ error }}</p>
    </div>
  </div>
</div>
```

## Example Views

### AdminTopupSettingsView.vue

**Purpose**: Manage payment accounts for customer top-ups

**Location**: `src/admin/views/AdminTopupSettingsView.vue`

**Features**:

- Payment account management
- Add/Edit/Delete accounts
- Enable/Disable toggle
- Account type selection (bank_transfer, promptpay, truemoney)
- Dedicated loading state
- Dedicated error state
- Refresh functionality

**Composable**: `useFinancialSettings`

**Components**:

- `TopupSettingsCard` - Main content card

**Architecture**:

```vue
<template>
  <div
    class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6 lg:p-8"
  >
    <!-- Header with title, icon, description, and refresh button -->

    <!-- Loading State -->
    <div v-if="loading">
      <div
        class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"
      ></div>
    </div>

    <!-- Error State -->
    <div v-else-if="error">
      <!-- Styled error message -->
    </div>

    <!-- Content -->
    <div v-else class="max-w-4xl">
      <TopupSettingsCard />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import { useFinancialSettings } from "@/admin/composables/useFinancialSettings";
import TopupSettingsCard from "@/admin/components/TopupSettingsCard.vue";

const { loading, error, fetchSettings } = useFinancialSettings();

async function loadSettings() {
  await fetchSettings("topup");
}

onMounted(async () => {
  await loadSettings();
});
</script>
```

**Key Improvements** (2024-01-22):

- Composition API with `<script setup>`
- Dedicated loading and error states
- Clean separation of concerns (view logic vs. content)
- Proper state management with composables
- Consistent with other admin views

### AdminTopupRequestsView.vue

**Purpose**: View and process customer top-up requests

**Location**: `src/admin/views/AdminTopupRequestsView.vue`

**Status**: ⚠️ IN PROGRESS - Table body implementation pending (2026-01-22)

**Features**:

- ✅ Modern header with icon and gradient background
- ✅ Real-time statistics dashboard (pending, approved, rejected, today's metrics)
- ✅ Simplified filter section with status dropdown
- ✅ Enhanced table with icon-enhanced headers
- ⏳ Table body with data rows (PENDING - needs implementation)
- ⏳ Customer info display with avatar circles (PENDING)
- ⏳ Amount display with wallet balance (PENDING)
- ⏳ Payment method badges (PENDING)
- ⏳ Evidence preview with click-to-enlarge (PENDING)
- ⏳ Animated status badges with pulse indicators (PENDING)
- ⏳ Thai date formatting with relative time (PENDING)
- ⏳ Approve/Reject action buttons with confirmation modals (PENDING)
- ⏳ Empty state with icon and messaging (PENDING)
- ✅ Loading and error states
- ✅ Full accessibility compliance (WCAG 2.1 AA)

**Data Flow**:

```typescript
// Uses RPC function for data fetching
const { data, error } = await supabase.rpc("get_topup_requests_admin", {
  p_status: statusFilter.value,
  p_limit: 100,
  p_offset: 0,
});

// Approval workflow
await supabase.rpc("approve_topup_request", {
  p_request_id: selectedTopup.value.id,
  p_admin_id: authStore.user?.id,
  p_admin_note: approvalNote.value || null,
});

// Rejection workflow
await supabase.rpc("reject_topup_request", {
  p_request_id: selectedTopup.value.id,
  p_admin_id: authStore.user?.id,
  p_admin_note: rejectionReason.value,
});
```

**State Management**:

```typescript
// Reactive state
const topups = ref<TopupRequest[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const statusFilter = ref<string | null>(null);
const selectedTopup = ref<TopupRequest | null>(null);
const showApproveModal = ref(false);
const showRejectModal = ref(false);
const isProcessing = ref(false);

// Computed statistics
const stats = computed(() => ({
  total_pending: pending.length,
  total_pending_amount: pending.reduce((sum, t) => sum + Number(t.amount), 0),
  total_approved: approved.length,
  total_approved_amount: approved.reduce((sum, t) => sum + Number(t.amount), 0),
  total_rejected: rejected.length,
  today_approved: approved.filter((t) => isToday(t.processed_at)).length,
  today_approved_amount: approved
    .filter((t) => isToday(t.processed_at))
    .reduce((sum, t) => sum + Number(t.amount), 0),
}));
```

**Implementation Status**:

✅ **Header Section**: COMPLETED
✅ **Stats Cards**: COMPLETED  
✅ **Filter Section**: COMPLETED
✅ **Table Header**: COMPLETED (2026-01-22)
⏳ **Table Body**: PENDING

**Table Structure**:

The view includes a modern table with 7 columns (headers implemented, body pending):

1. **ลูกค้า** (Customer) - User icon - Avatar with name and phone
2. **จำนวนเงิน** (Amount) - Money icon - Amount with wallet balance
3. **การชำระเงิน** (Payment) - Credit card icon - Method badge with reference
4. **หลักฐาน** (Evidence) - Image icon - Preview button with modal
5. **สถานะ** (Status) - Check circle icon - Animated badge with pulse
6. **วันที่** (Date) - Calendar icon - Request and processed dates
7. **จัดการ** (Actions) - Settings icon - Approve/Reject buttons

**Design Features**:

- Gradient page background (`from-gray-50 to-gray-100`)
- Gradient header icon (`from-primary-500 to-primary-600`)
- Status-based row styling with colored left borders (4px)
- Gradient row backgrounds (yellow/green/red based on status)
- Hover effects with gradient transitions
- Modern button styling with gradients and shadows
- Avatar circles with user initials
- Animated pulse indicators for pending status
- Responsive design with horizontal scroll on mobile
- Clean, minimal stats cards with colored left borders
- Simplified filter section (single-row horizontal layout)

**Utility Functions**:

```typescript
// Currency formatting
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 0,
  }).format(amount);
}

// Date formatting
function formatDate(date: string | null): string {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Status helpers
function getStatusLabel(status: string): string;
function getStatusClass(status: string): string;
function getPaymentMethodLabel(method: string): string;
```

**Accessibility Features**:

- All buttons have `min-h-[44px]` for proper touch targets (WCAG 2.1 AA)
- Descriptive `aria-label` attributes on all action buttons
- Keyboard navigation support throughout
- Color contrast meets WCAG AA standards
- Clear focus indicators on interactive elements
- Semantic HTML structure
- Screen reader friendly

**Integration**:

- Uses `useAuthStore` for admin user identification
- Uses `useErrorHandler` for error management
- Uses `useToast` for success/error notifications
- Integrates with Supabase RPC functions for data operations

## Composables Pattern

### useFinancialSettings

**Location**: `src/admin/composables/useFinancialSettings.ts`

**Purpose**: Manage financial settings (commission, topup, payment)

**API**:

```typescript
interface UseFinancialSettings {
  settings: Ref<FinancialSettings | null>;
  loading: Ref<boolean>;
  error: Ref<string | null>;
  fetchSettings: (type: SettingsType) => Promise<void>;
  updateSettings: (type: SettingsType, data: any) => Promise<void>;
}

// Usage
const { settings, loading, error, fetchSettings, updateSettings } =
  useFinancialSettings();

// Fetch settings
await fetchSettings("topup");

// Update settings
await updateSettings("topup", newSettings);
```

**Features**:

- Type-safe settings management
- Loading and error states
- Automatic error handling
- Support for multiple settings types

## Design Principles

### 1. Consistency

All views follow the same structure:

- Header with icon and title
- Description text
- Action buttons
- Loading state
- Error state
- Content area

### 2. Separation of Concerns

- **View**: Handles layout, states, and user interactions
- **Composable**: Manages data fetching and state
- **Component**: Renders specific content

### 3. Responsive Design

- Mobile-first approach
- Flexible layouts
- Touch-friendly buttons
- Proper spacing on all screen sizes

### 4. User Experience

- Clear loading indicators
- Helpful error messages
- Disabled states during operations
- Immediate feedback on actions

### 5. Accessibility

- Semantic HTML
- Proper ARIA labels
- Keyboard navigation
- Screen reader support

## Best Practices

### 1. Use Composition API

```vue
<script setup lang="ts">
// Modern, concise, and type-safe
import { ref, onMounted } from "vue";

const loading = ref(false);
const error = ref<string | null>(null);

onMounted(async () => {
  await loadData();
});
</script>
```

### 2. Leverage Composables

```typescript
// Reusable logic
const { loading, error, data, fetchData } = useComposable();
```

### 3. Handle States Properly

```vue
<template>
  <!-- Always show loading first -->
  <div v-if="loading">Loading...</div>

  <!-- Then error -->
  <div v-else-if="error">Error: {{ error }}</div>

  <!-- Finally content -->
  <div v-else>Content</div>
</template>
```

### 4. Keep Views Clean

- Minimal logic in templates
- Delegate to composables
- Use child components for complex content

### 5. Consistent Styling

- Use Tailwind utility classes
- Follow color scheme
- Maintain spacing consistency
- Use design tokens

## Component Library

### Layout Components

- `AdminShell.vue` - Main layout wrapper
- `AdminSidebar.vue` - Sidebar navigation
- `AdminHeader.vue` - Top header

### Common Components

- `AdminCard.vue` - Card container
- `AdminTable.vue` - Data table
- `AdminModal.vue` - Modal dialog
- `AdminButton.vue` - Button component
- `AdminBadge.vue` - Status badge

### Settings Components

- `TopupSettingsCard.vue` - Top-up settings content
- `CommissionSettingsCard.vue` - Commission settings content
- `SettingsFormField.vue` - Form field wrapper
- `SettingsLoadingState.vue` - Loading skeleton
- `SettingsErrorState.vue` - Error display

## Testing

### Unit Tests

Test composables and components:

```typescript
import { describe, it, expect } from "vitest";
import { useFinancialSettings } from "@/admin/composables/useFinancialSettings";

describe("useFinancialSettings", () => {
  it("should fetch settings", async () => {
    const { settings, fetchSettings } = useFinancialSettings();
    await fetchSettings("topup");
    expect(settings.value).toBeDefined();
  });
});
```

### Integration Tests

Test complete flows:

```typescript
import { mount } from "@vue/test-utils";
import AdminTopupSettingsView from "@/admin/views/AdminTopupSettingsView.vue";

describe("AdminTopupSettingsView", () => {
  it("should render loading state", () => {
    const wrapper = mount(AdminTopupSettingsView);
    expect(wrapper.find(".animate-spin").exists()).toBe(true);
  });
});
```

## Migration Guide

### From Old Pattern to New Pattern

**Before**:

```vue
<template>
  <div>
    <h1>Title</h1>
    <div v-if="loading">Loading...</div>
    <div v-else>{{ data }}</div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      loading: false,
      data: null,
    };
  },
};
</script>
```

**After**:

```vue
<template>
  <div
    class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6 lg:p-8"
  >
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900 flex items-center gap-3">
        <div
          class="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg"
        >
          <svg class="w-6 h-6 text-white"><!-- Icon --></svg>
        </div>
        Title
      </h1>
    </div>

    <div v-if="loading" class="flex items-center justify-center py-12">
      <div
        class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"
      ></div>
    </div>

    <div v-else>{{ data }}</div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import { useComposable } from "@/admin/composables/useComposable";

const { loading, data, fetchData } = useComposable();

onMounted(async () => {
  await fetchData();
});
</script>
```

## Resources

- [Vue 3 Composition API](https://vuejs.org/guide/extras/composition-api-faq.html)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Pinia State Management](https://pinia.vuejs.org/)
- [TypeScript](https://www.typescriptlang.org/docs/)

## Support

For questions or issues:

- Check existing views for examples
- Review composables documentation
- Consult the team lead
- Open a discussion in the team channel

---

**Last Updated**: 2024-01-22  
**Version**: 2.0  
**Status**: Active
