# 🚀 Admin Customers Enhancement

> พัฒนาระบบ Admin Customers ให้มีศักยภาพสูง ทำงานได้จริง และมี UX ที่ดีเยี่ยม

## 📋 Quick Links

- [Requirements](./requirements.md) - ฟีเจอร์ทั้งหมดที่ต้องการ
- [Design](./design.md) - Architecture และ UI/UX design
- [Tasks](./tasks.md) - Implementation tasks (10 phases)
- [Implementation Summary](./IMPLEMENTATION-SUMMARY.md) - สรุปการทำงาน

## ✨ Key Features

### 🔍 Advanced Filtering

- Text search (name, email, phone) with debounce
- Multi-select status (active, suspended, banned)
- Date range filter
- Wallet balance range
- Order count range
- Rating range
- Sort by multiple fields
- URL persistence

### 📦 Bulk Actions

- Select multiple customers
- Bulk suspend/unsuspend
- Bulk export to CSV
- Bulk send email
- Bulk send push notification
- Progress tracking

### 📊 Customer Analytics

- Last active date
- Favorite service type
- Churn risk score
- Lifetime value
- Total orders & spent
- Average rating

## 🏗️ Architecture

```
src/admin/
├── composables/
│   ├── useCustomerFilters.ts       ✅ Advanced filtering
│   └── useCustomerBulkActions.ts   ✅ Bulk operations
├── components/
│   ├── CustomersFiltersBar.vue     ✅ Filters UI
│   ├── CustomersBulkActionsBar.vue ✅ Bulk actions UI
│   ├── CustomersTable.vue          🔄 Table with virtual scroll
│   ├── CustomerDetailModal.vue     🔄 Detail view with tabs
│   └── ...
└── views/
    ├── CustomersView.vue           ✅ Current (basic)
    └── CustomersViewEnhanced.vue   🔄 Enhanced version
```

## 🗄️ Database

### New Columns (Migration 311)

```sql
ALTER TABLE profiles ADD COLUMN
  last_active_at TIMESTAMPTZ,
  favorite_service_type TEXT,
  churn_risk_score DECIMAL(3,2),
  lifetime_value DECIMAL(10,2);
```

### New RPC Functions

```sql
-- Get customers with advanced filtering
admin_get_customers_enhanced(...)

-- Get customer detail with related data
admin_get_customer_detail(customer_id)

-- Update customer analytics
update_customer_analytics()
```

## 🚀 Quick Start

### 1. Apply Migration

```bash
# Local
npx supabase db push --local

# Generate types
npx supabase gen types --local > src/types/database.ts
```

### 2. Use Composables

```vue
<script setup lang="ts">
import { useCustomerFilters } from "@/admin/composables/useCustomerFilters";
import { useCustomerBulkActions } from "@/admin/composables/useCustomerBulkActions";

const { filters, hasActiveFilters, setSearchTerm, toggleStatus, clearFilters } =
  useCustomerFilters();

const {
  selectedCount,
  hasSelection,
  toggleSelection,
  bulkSuspend,
  bulkExportCSV,
} = useCustomerBulkActions();
</script>
```

### 3. Use Components

```vue
<template>
  <div>
    <CustomersFiltersBar @apply="fetchCustomers" />
    <CustomersBulkActionsBar
      @suspend="handleBulkSuspend"
      @export="handleBulkExport"
    />
    <!-- Your table here -->
  </div>
</template>
```

## 📊 Progress

| Phase                  | Status         | Progress |
| ---------------------- | -------------- | -------- |
| 1. Core Infrastructure | ✅ Complete    | 100%     |
| 2. Database & RPC      | 🔄 In Progress | 0%       |
| 3. Enhanced Components | 🔄 Pending     | 0%       |
| 4. Advanced Features   | 🔄 Pending     | 0%       |
| 5. Mobile Optimization | 🔄 Pending     | 0%       |
| 6. Accessibility       | 🔄 Pending     | 0%       |
| 7. Performance         | 🔄 Pending     | 0%       |
| 8. Testing             | 🔄 Pending     | 0%       |
| 9. Documentation       | 🔄 Pending     | 0%       |
| 10. Deployment         | 🔄 Pending     | 0%       |

**Overall: 10% Complete**

## 🎯 Next Steps

1. ✅ Apply migration 311 to local
2. ✅ Test RPC functions
3. 🔄 Create CustomersTable component
4. 🔄 Implement virtual scrolling
5. 🔄 Create CustomerDetailModal
6. 🔄 Test on mobile devices

## 📝 Usage Examples

### Filter Customers

```typescript
// Search
setSearchTerm("john");

// Filter by status
toggleStatus("active");
toggleStatus("suspended");

// Date range
setDateRange(new Date("2024-01-01"), new Date("2024-12-31"));

// Wallet range
setWalletRange(100, 1000);

// Clear all
clearFilters();
```

### Bulk Actions

```typescript
// Select customers
toggleSelection("customer-id-1");
toggleSelection("customer-id-2");

// Bulk suspend
await bulkSuspend(allIds, "Violation of terms");

// Bulk export
await bulkExportCSV(allCustomers, allIds);

// Clear selection
clearSelection();
```

### Get Customer Detail

```typescript
const { data } = await supabase.rpc("admin_get_customer_detail", {
  p_customer_id: "customer-id",
});

// Returns:
// {
//   customer: { ... },
//   orders: [ ... ],
//   wallet_transactions: [ ... ],
//   reviews: [ ... ]
// }
```

## 🎨 UI Components

### Filters Bar

- Search box with clear button
- Status chips (active, suspended, banned)
- Advanced filters toggle
- Date/number range inputs
- Filter summary
- Clear all button

### Bulk Actions Bar

- Selected count
- Progress bar
- Action buttons (suspend, export, email, push)
- Cancel button
- Gradient background
- Smooth animations

## 🔐 Security

- ✅ Admin role check in all RPC functions
- ✅ SECURITY DEFINER for controlled access
- ✅ Input validation
- ✅ SQL injection prevention
- 🔄 Audit logging (planned)
- 🔄 Rate limiting (planned)

## 📱 Mobile Support

### Planned Features

- Card layout for mobile
- Bottom sheet for filters
- Swipe actions
- Touch-friendly buttons (min 44px)
- Responsive grid layout

## ♿ Accessibility

### Implemented

- ARIA labels on all buttons
- Semantic HTML
- Focus management
- Keyboard navigation

### Planned

- Screen reader testing
- Keyboard shortcuts
- High contrast mode
- Focus indicators

## 🧪 Testing

### Unit Tests

```bash
npm run test src/admin/composables/useCustomerFilters.test.ts
npm run test src/admin/composables/useCustomerBulkActions.test.ts
```

### Integration Tests

```bash
npm run test:integration src/admin/views/CustomersView.test.ts
```

### E2E Tests

```bash
npm run test:e2e tests/admin-customers.spec.ts
```

## 📊 Performance Targets

| Metric            | Target  | Status |
| ----------------- | ------- | ------ |
| Initial Load      | < 1s    | 🔄     |
| Search Response   | < 300ms | ✅     |
| Filter Apply      | < 200ms | ✅     |
| Bulk Action (100) | < 5s    | 🔄     |
| Bundle Size       | < 50KB  | ✅     |

## 🐛 Troubleshooting

### Migration Issues

```bash
# Check migration status
npx supabase migration list --local

# Rollback if needed
npx supabase db reset --local

# Reapply
npx supabase db push --local
```

### RPC Function Errors

```sql
-- Test RPC function
SELECT * FROM admin_get_customers_enhanced(
  p_search := 'john',
  p_limit := 10
);

-- Check function exists
SELECT routine_name
FROM information_schema.routines
WHERE routine_name LIKE 'admin_get_customers%';
```

### Performance Issues

```typescript
// Enable query logging
const { data, error } = await supabase
  .rpc('admin_get_customers_enhanced', params)
  .explain({ analyze: true })

// Check indexes
SELECT * FROM pg_indexes
WHERE tablename = 'profiles';
```

## 📚 Resources

- [Supabase RPC Functions](https://supabase.com/docs/guides/database/functions)
- [Vue 3 Composition API](https://vuejs.org/guide/extras/composition-api-faq.html)
- [VueUse](https://vueuse.org/)
- [Tailwind CSS](https://tailwindcss.com/)

## 🤝 Contributing

1. Read [requirements.md](./requirements.md)
2. Check [tasks.md](./tasks.md) for available tasks
3. Follow [design.md](./design.md) guidelines
4. Write tests
5. Update documentation

## 📄 License

MIT

## 👥 Team

- **Developer**: Kiro AI
- **Project**: Thai Ride App
- **Module**: Admin Panel - Customers

---

**Status**: 🚀 Phase 1 Complete | 🔄 Phase 2 In Progress

**Last Updated**: 2026-01-18
