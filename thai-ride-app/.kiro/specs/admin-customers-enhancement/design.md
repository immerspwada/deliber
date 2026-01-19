# Admin Customers Enhancement - Design

## 🏗️ Architecture

### Component Structure

```
CustomersView.vue (Main Container)
├── CustomersHeader.vue (Stats + Actions)
├── CustomersFilters.vue (Advanced Filters)
├── CustomersTable.vue (Data Table)
│   ├── CustomerRow.vue (Table Row)
│   └── BulkActions.vue (Bulk Action Bar)
├── CustomerDetailModal.vue (Detail View)
│   ├── CustomerOverview.vue
│   ├── OrderHistoryTab.vue
│   ├── WalletTransactionsTab.vue
│   ├── ReviewsTab.vue
│   ├── SupportTicketsTab.vue
│   ├── ActivityLogTab.vue
│   └── NotesTab.vue
├── SuspendModal.vue (Suspension)
├── BulkSuspendModal.vue (Bulk Suspension)
├── ExportModal.vue (Export Options)
└── CustomersPagination.vue (Pagination)
```

### Composables

```typescript
// Core
useAdminCustomers.ts (existing - enhanced)
useCustomerFilters.ts (new)
useCustomerBulkActions.ts (new)
useCustomerExport.ts (new)
useCustomerAnalytics.ts (new)

// Features
useCustomerDetail.ts (new)
useCustomerOrders.ts (new)
useCustomerWallet.ts (new)
useCustomerReviews.ts (new)
useCustomerNotes.ts (new)

// Real-time
useCustomerRealtime.ts (new)
useCustomerNotifications.ts (new)
```

## 🎨 UI Design

### Color Palette

```typescript
const CUSTOMER_COLORS = {
  active: {
    bg: "#D1FAE5",
    text: "#059669",
    border: "#10B981",
  },
  suspended: {
    bg: "#FEE2E2",
    text: "#DC2626",
    border: "#EF4444",
  },
  banned: {
    bg: "#FEF3C7",
    text: "#D97706",
    border: "#F59E0B",
  },
  vip: {
    bg: "#E0E7FF",
    text: "#4F46E5",
    border: "#6366F1",
  },
};
```

### Layout Sections

#### 1. Header Section

```
┌─────────────────────────────────────────────────────┐
│ 👥 ลูกค้า (1,234)  [Active: 1,200] [Suspended: 34] │
│                                    [Export] [Refresh]│
└─────────────────────────────────────────────────────┘
```

#### 2. Filters Section

```
┌─────────────────────────────────────────────────────┐
│ 🔍 [Search...]  [Status ▼]  [Date Range ▼]         │
│ [Wallet ▼]  [Orders ▼]  [Rating ▼]  [Clear Filters]│
└─────────────────────────────────────────────────────┘
```

#### 3. Table Section

```
┌─────────────────────────────────────────────────────┐
│ [☐] Customer    Contact      Status   Wallet  Date  │
├─────────────────────────────────────────────────────┤
│ [☐] 👤 John Doe  john@...    Active   ฿500   1d ago │
│ [☐] 👤 Jane Doe  jane@...    Active   ฿1,200 2d ago │
│ [☐] 👤 Bob Smith bob@...     Suspend  ฿0     5d ago │
└─────────────────────────────────────────────────────┘
```

#### 4. Bulk Actions Bar (when items selected)

```
┌─────────────────────────────────────────────────────┐
│ ✓ 3 selected  [Suspend] [Export] [Email] [Cancel]  │
└─────────────────────────────────────────────────────┘
```

## 📊 Data Flow

### Filter Flow

```typescript
User Input → Debounce (300ms) → Update Filters → Fetch Data → Update UI
```

### Bulk Action Flow

```typescript
Select Items → Show Bulk Bar → Choose Action → Confirm → Execute → Refresh
```

### Real-time Flow

```typescript
Supabase Realtime → Event Handler → Update State → Update UI
```

## 🔄 State Management

### Filter State

```typescript
interface CustomerFilters {
  searchTerm: string;
  status: CustomerStatus[];
  dateRange: { start: Date; end: Date } | null;
  walletRange: { min: number; max: number } | null;
  orderRange: { min: number; max: number } | null;
  ratingRange: { min: number; max: number } | null;
  sortBy: "created_at" | "wallet_balance" | "total_orders";
  sortOrder: "asc" | "desc";
}
```

### Selection State

```typescript
interface SelectionState {
  selectedIds: Set<string>;
  selectAll: boolean;
  excludedIds: Set<string>;
}
```

### Pagination State

```typescript
interface PaginationState {
  currentPage: number;
  pageSize: number;
  totalCount: number;
  hasMore: boolean;
}
```

## 🎯 Advanced Features

### 1. Virtual Scrolling

```typescript
// Use @tanstack/vue-virtual for large lists
const virtualizer = useVirtualizer({
  count: customers.length,
  getScrollElement: () => scrollElement.value,
  estimateSize: () => 72, // row height
  overscan: 5,
});
```

### 2. Infinite Scroll

```typescript
const { isLoading, loadMore } = useInfiniteScroll(
  async () => {
    const nextPage = currentPage.value + 1;
    await fetchCustomers({ page: nextPage });
  },
  { distance: 100 },
);
```

### 3. Optimistic Updates

```typescript
async function suspendCustomer(id: string) {
  // Optimistic update
  const customer = customers.value.find((c) => c.id === id);
  if (customer) {
    customer.status = "suspended";
  }

  try {
    await api.suspendCustomer(id);
  } catch (error) {
    // Rollback on error
    if (customer) {
      customer.status = "active";
    }
    throw error;
  }
}
```

### 4. Debounced Search

```typescript
const debouncedSearch = useDebounceFn((query: string) => {
  filters.value.searchTerm = query;
  fetchCustomers();
}, 300);
```

## 📱 Mobile Design

### Mobile Table (Card View)

```
┌─────────────────────────┐
│ 👤 John Doe            │
│ john@example.com       │
│ ─────────────────────  │
│ Status: Active         │
│ Wallet: ฿500           │
│ Orders: 12             │
│ [View] [Suspend]       │
└─────────────────────────┘
```

### Mobile Filters (Bottom Sheet)

```
┌─────────────────────────┐
│ ═══ Filters            │
│                        │
│ Status                 │
│ [☐] Active             │
│ [☐] Suspended          │
│                        │
│ Date Range             │
│ [From] [To]            │
│                        │
│ [Apply] [Clear]        │
└─────────────────────────┘
```

## 🎨 Animations

### Transitions

```css
/* Row hover */
.customer-row {
  transition: all 0.2s ease;
}

.customer-row:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* Modal enter/leave */
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

/* Bulk bar slide */
.bulk-bar-enter-active,
.bulk-bar-leave-active {
  transition: all 0.3s ease;
}

.bulk-bar-enter-from,
.bulk-bar-leave-to {
  transform: translateY(-100%);
}
```

## 🔐 Security Considerations

### Data Masking

```typescript
function maskSensitiveData(customer: Customer) {
  return {
    ...customer,
    email: maskEmail(customer.email),
    phone: maskPhone(customer.phone),
    // Show full data only to admin
  };
}
```

### Audit Logging

```typescript
async function logAction(action: string, customerId: string) {
  await supabase.from("admin_audit_logs").insert({
    admin_id: currentAdmin.value.id,
    action,
    target_type: "customer",
    target_id: customerId,
    timestamp: new Date().toISOString(),
  });
}
```

## 📊 Analytics Integration

### Track User Actions

```typescript
// Track filter usage
analytics.track("admin_customers_filter", {
  filter_type: "status",
  filter_value: "suspended",
});

// Track bulk actions
analytics.track("admin_customers_bulk_action", {
  action: "suspend",
  count: selectedIds.length,
});

// Track export
analytics.track("admin_customers_export", {
  format: "csv",
  row_count: customers.length,
});
```

## 🚀 Performance Optimization

### Lazy Loading

```typescript
// Lazy load heavy components
const CustomerDetailModal = defineAsyncComponent(
  () => import("./CustomerDetailModal.vue"),
);

const ExportModal = defineAsyncComponent(() => import("./ExportModal.vue"));
```

### Memoization

```typescript
// Memoize expensive computations
const filteredCustomers = computed(() => {
  return customers.value.filter((customer) => {
    // Complex filtering logic
  });
});

// Use shallowRef for large arrays
const customers = shallowRef<Customer[]>([]);
```

### Request Batching

```typescript
// Batch multiple requests
const [customers, stats, analytics] = await Promise.all([
  fetchCustomers(),
  fetchStats(),
  fetchAnalytics(),
]);
```

## 🎯 Accessibility

### Keyboard Navigation

```typescript
// Arrow keys for table navigation
function handleKeyDown(event: KeyboardEvent) {
  switch (event.key) {
    case "ArrowDown":
      focusNextRow();
      break;
    case "ArrowUp":
      focusPreviousRow();
      break;
    case "Enter":
      openSelectedCustomer();
      break;
    case "Escape":
      clearSelection();
      break;
  }
}
```

### Screen Reader Support

```html
<table role="table" aria-label="รายการลูกค้า">
  <thead role="rowgroup">
    <tr role="row">
      <th role="columnheader" aria-sort="ascending">ชื่อ</th>
    </tr>
  </thead>
  <tbody role="rowgroup">
    <tr role="row" aria-selected="false">
      <td role="cell">John Doe</td>
    </tr>
  </tbody>
</table>
```

## 📈 Success Metrics

### Performance Metrics

- Initial Load: < 1s
- Search Response: < 300ms
- Filter Apply: < 200ms
- Pagination: < 100ms

### User Experience Metrics

- Task Completion Rate: > 95%
- Error Rate: < 1%
- User Satisfaction: > 4.5/5

### Technical Metrics

- Lighthouse Score: > 90
- Accessibility Score: 100
- Bundle Size: < 200KB
- Memory Usage: < 50MB
