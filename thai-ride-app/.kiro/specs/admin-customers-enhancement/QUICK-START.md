# 🚀 Quick Start Guide - Admin Customers Enhancement

## ⚡ 5-Minute Setup

### Step 1: Apply Database Migration (2 min)

```bash
# Start Supabase (if not running)
npx supabase start

# Apply migration
npx supabase db push --local

# Generate TypeScript types
npx supabase gen types --local > src/types/database.ts
```

**Expected Output:**

```
✓ Applying migration 311_admin_customers_enhancement.sql...
✓ Migration applied successfully
✓ Types generated
```

### Step 2: Verify Migration (1 min)

```sql
-- Check new columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'profiles'
AND column_name IN ('last_active_at', 'favorite_service_type', 'churn_risk_score', 'lifetime_value');

-- Check RPC functions exist
SELECT routine_name
FROM information_schema.routines
WHERE routine_name LIKE 'admin_get_customers%';

-- Expected: admin_get_customers_enhanced, admin_get_customer_detail
```

### Step 3: Test RPC Functions (2 min)

```sql
-- Test basic query
SELECT * FROM admin_get_customers_enhanced(
  p_limit := 5
);

-- Test with filters
SELECT * FROM admin_get_customers_enhanced(
  p_search := 'john',
  p_status := ARRAY['active'],
  p_limit := 10
);

-- Test customer detail
SELECT * FROM admin_get_customer_detail(
  p_customer_id := 'your-customer-id-here'
);
```

## 🎯 Usage Examples

### Example 1: Basic Filtering

```vue
<script setup lang="ts">
import { useCustomerFilters } from "@/admin/composables/useCustomerFilters";
import { useAdminCustomers } from "@/admin/composables/useAdminCustomers";

const { filters, setSearchTerm, toggleStatus } = useCustomerFilters();
const { customers, fetchCustomers } = useAdminCustomers();

// Search
setSearchTerm("john");

// Filter by status
toggleStatus("active");

// Fetch with filters
await fetchCustomers(filters.value.toAPIParams());
</script>
```

### Example 2: Bulk Actions

```vue
<script setup lang="ts">
import { useCustomerBulkActions } from "@/admin/composables/useCustomerBulkActions";

const { selectedIds, toggleSelection, bulkSuspend, bulkExportCSV } =
  useCustomerBulkActions();

// Select customers
toggleSelection("customer-1");
toggleSelection("customer-2");

// Bulk suspend
await bulkSuspend(allIds, "Violation of terms");

// Bulk export
await bulkExportCSV(allCustomers, allIds);
</script>
```

### Example 3: Advanced Filters

```vue
<script setup lang="ts">
import { useCustomerFilters } from "@/admin/composables/useCustomerFilters";

const { setDateRange, setWalletRange, setOrderRange, setRatingRange } =
  useCustomerFilters();

// Date range: Last 30 days
const end = new Date();
const start = new Date();
start.setDate(start.getDate() - 30);
setDateRange(start, end);

// Wallet: 100-1000 baht
setWalletRange(100, 1000);

// Orders: 5-50 orders
setOrderRange(5, 50);

// Rating: 4-5 stars
setRatingRange(4, 5);
</script>
```

## 🎨 UI Components

### Use Filters Bar

```vue
<template>
  <div>
    <CustomersFiltersBar @apply="handleFilterApply" />
  </div>
</template>

<script setup lang="ts">
import CustomersFiltersBar from "@/admin/components/CustomersFiltersBar.vue";
import { useCustomerFilters } from "@/admin/composables/useCustomerFilters";

const { filters } = useCustomerFilters();

async function handleFilterApply() {
  // Fetch customers with current filters
  await fetchCustomers(filters.value.toAPIParams());
}
</script>
```

### Use Bulk Actions Bar

```vue
<template>
  <div>
    <CustomersBulkActionsBar
      @suspend="handleBulkSuspend"
      @export="handleBulkExport"
      @email="handleBulkEmail"
      @push="handleBulkPush"
      @cancel="handleCancel"
    />
  </div>
</template>

<script setup lang="ts">
import CustomersBulkActionsBar from "@/admin/components/CustomersBulkActionsBar.vue";
import { useCustomerBulkActions } from "@/admin/composables/useCustomerBulkActions";

const { bulkSuspend, bulkExportCSV, clearSelection } = useCustomerBulkActions();

async function handleBulkSuspend() {
  const reason = prompt("เหตุผลในการระงับ:");
  if (reason) {
    await bulkSuspend(allIds, reason);
  }
}

async function handleBulkExport() {
  await bulkExportCSV(allCustomers, allIds);
}

function handleCancel() {
  clearSelection();
}
</script>
```

## 🔍 Testing

### Test Filters

```typescript
import { describe, it, expect } from "vitest";
import { useCustomerFilters } from "@/admin/composables/useCustomerFilters";

describe("useCustomerFilters", () => {
  it("should set search term", () => {
    const { filters, setSearchTerm } = useCustomerFilters();
    setSearchTerm("john");
    expect(filters.value.searchTerm).toBe("john");
  });

  it("should toggle status", () => {
    const { filters, toggleStatus } = useCustomerFilters();
    toggleStatus("active");
    expect(filters.value.status).toContain("active");
    toggleStatus("active");
    expect(filters.value.status).not.toContain("active");
  });

  it("should convert to API params", () => {
    const { filters, setSearchTerm, toAPIParams } = useCustomerFilters();
    setSearchTerm("john");
    const params = toAPIParams();
    expect(params.search).toBe("john");
  });
});
```

### Test Bulk Actions

```typescript
import { describe, it, expect } from "vitest";
import { useCustomerBulkActions } from "@/admin/composables/useCustomerBulkActions";

describe("useCustomerBulkActions", () => {
  it("should toggle selection", () => {
    const { selectedIds, toggleSelection, isSelected } =
      useCustomerBulkActions();
    toggleSelection("id-1");
    expect(isSelected("id-1")).toBe(true);
    toggleSelection("id-1");
    expect(isSelected("id-1")).toBe(false);
  });

  it("should calculate selected count", () => {
    const { selectedCount, toggleSelection } = useCustomerBulkActions();
    toggleSelection("id-1");
    toggleSelection("id-2");
    expect(selectedCount.value).toBe(2);
  });

  it("should clear selection", () => {
    const { selectedIds, toggleSelection, clearSelection } =
      useCustomerBulkActions();
    toggleSelection("id-1");
    toggleSelection("id-2");
    clearSelection();
    expect(selectedIds.value.size).toBe(0);
  });
});
```

## 🐛 Common Issues

### Issue 1: Migration Failed

**Error:**

```
Error: column "last_active_at" already exists
```

**Solution:**

```bash
# Reset database
npx supabase db reset --local

# Reapply all migrations
npx supabase db push --local
```

### Issue 2: RPC Function Not Found

**Error:**

```
Error: function admin_get_customers_enhanced does not exist
```

**Solution:**

```sql
-- Check if function exists
SELECT routine_name
FROM information_schema.routines
WHERE routine_name = 'admin_get_customers_enhanced';

-- If not exists, reapply migration
-- npx supabase db push --local
```

### Issue 3: Permission Denied

**Error:**

```
Error: permission denied for function admin_get_customers_enhanced
```

**Solution:**

```sql
-- Grant execute permission
GRANT EXECUTE ON FUNCTION admin_get_customers_enhanced TO authenticated;
```

### Issue 4: Types Not Generated

**Error:**

```
Error: Cannot find module '@/types/database'
```

**Solution:**

```bash
# Generate types manually
npx supabase gen types --local > src/types/database.ts

# Verify file exists
ls -la src/types/database.ts
```

## 📊 Performance Tips

### 1. Use Debounced Search

```typescript
// ✅ Good - debounced
debouncedSearch("john");

// ❌ Bad - immediate
setSearchTerm("john");
```

### 2. Limit Results

```typescript
// ✅ Good - paginated
fetchCustomers({ limit: 20, offset: 0 });

// ❌ Bad - fetch all
fetchCustomers({ limit: 10000 });
```

### 3. Use Indexes

```sql
-- Check if indexes exist
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'profiles';

-- Should see:
-- idx_profiles_wallet_balance
-- idx_profiles_total_orders
-- idx_profiles_average_rating
-- idx_profiles_created_at
```

### 4. Cache Results

```typescript
// Use shallowRef for large arrays
const customers = shallowRef<Customer[]>([]);

// Memoize expensive computations
const filteredCustomers = computed(() => {
  return customers.value.filter(/* ... */);
});
```

## 🎯 Next Steps

1. ✅ Complete Quick Start
2. 🔄 Read [Design Document](./design.md)
3. 🔄 Implement CustomersTable component
4. 🔄 Add virtual scrolling
5. 🔄 Create CustomerDetailModal
6. 🔄 Test on mobile devices
7. 🔄 Add accessibility features
8. 🔄 Deploy to production

## 📚 Additional Resources

- [Full Documentation](./README.md)
- [Requirements](./requirements.md)
- [Design](./design.md)
- [Tasks](./tasks.md)
- [Implementation Summary](./IMPLEMENTATION-SUMMARY.md)

## 💡 Pro Tips

1. **Use URL Persistence**: Filters are automatically saved to URL
2. **Keyboard Shortcuts**: Use Tab/Enter for quick navigation
3. **Bulk Actions**: Select all with checkbox, exclude individuals
4. **Export**: Filters apply to export, so filter first
5. **Analytics**: Run `update_customer_analytics()` daily for fresh data

## 🎉 You're Ready!

ตอนนี้คุณพร้อมใช้งาน Admin Customers Enhancement แล้ว! 🚀

หากมีปัญหา ดูที่ [Troubleshooting](#-common-issues) หรือติดต่อทีมพัฒนา
