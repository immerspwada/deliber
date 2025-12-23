# 📐 Code Quality Improvement Guide

**Purpose**: Maintain high code quality and consistency across the Thai Ride App project

---

## 🎯 Current Status

| Category | Status | Priority |
|----------|--------|----------|
| Type Safety | 🟡 Needs Improvement | High |
| Code Duplication | 🟡 Needs Cleanup | High |
| Large Files | 🟡 Needs Refactoring | Medium |
| Documentation | 🟢 Good | Low |
| Testing | 🔴 Needs Work | High |

---

## 🔧 Type Safety Improvements

### Problem: Too Many `as any` Casts

**Current**:
```typescript
// ❌ Bad - loses type safety
const { data } = await (supabase.rpc as any)('function_name', params)
const { data } = await (supabase.from('table') as any).select('*')
```

**Solution**:
```typescript
// ✅ Good - type-safe
import type { Database } from './types/database'

const supabase = createClient<Database>(url, key)

// Now fully typed!
const { data } = await supabase.rpc('function_name', params)
const { data } = await supabase.from('table').select('*')
```

### Action Items
1. Regenerate types: `./scripts/generate-types.sh`
2. Update supabase client initialization
3. Remove `as any` casts gradually
4. Add type guards where needed

---

## 🔄 Code Consolidation

### Problem: Multiple Versions (V2, V3, V4)

**Files to Consolidate**:
```
❌ Remove Legacy:
   - useRideBookingV2.ts (keep V3)
   - ProviderDashboardView.vue (keep V4)
   - WalletView.vue (keep V3)
   - DeliveryView.vue (keep V2)

✅ Keep Latest:
   - useRideBookingV3.ts
   - ProviderDashboardV4.vue
   - WalletViewV3.vue
   - DeliveryViewV2.vue
```

### Migration Strategy
1. **Identify**: List all V2/V3/V4 files
2. **Test**: Ensure latest version works
3. **Update**: Change imports to latest
4. **Remove**: Delete old versions
5. **Commit**: One version at a time

---

## 📦 Large File Refactoring

### Problem: useProvider.ts (1,723 lines)

**Current Structure**:
```
useProvider.ts (1,723 lines)
├── Profile Management
├── Job Management (Ride/Delivery/Shopping)
├── Earnings
├── Location Tracking
├── Realtime Subscriptions
└── Notifications
```

**Proposed Split**:
```
composables/provider/
├── useProviderProfile.ts      (Profile, verification)
├── useProviderJobs.ts          (Job listing, acceptance)
├── useProviderEarnings.ts      (Earnings, withdrawals)
├── useProviderLocation.ts      (GPS, tracking)
├── useProviderRealtime.ts      (Subscriptions)
└── useProviderNotifications.ts (Push, sound)
```

### Refactoring Steps
1. Create `composables/provider/` directory
2. Extract each section to separate file
3. Update imports in components
4. Test thoroughly
5. Remove old file

---

## 🧪 Testing Strategy

### Current Coverage: ~5%
### Target Coverage: 70%+

**Priority Test Areas**:
1. **Critical Flows** (E2E)
   - [ ] Customer ride booking
   - [ ] Provider job acceptance
   - [ ] Admin order management
   - [ ] Payment processing

2. **Business Logic** (Unit)
   - [ ] Fare calculation
   - [ ] Distance calculation
   - [ ] Promo code validation
   - [ ] Loyalty points

3. **Integration** (API)
   - [ ] Supabase RPC functions
   - [ ] Realtime subscriptions
   - [ ] Push notifications

### Test Setup
```bash
# Install test dependencies
npm install -D @playwright/test

# Run tests
npm run test        # Unit tests
npm run test:e2e    # E2E tests
```

---

## 📝 Documentation Standards

### Composable Documentation Template
```typescript
/**
 * useFeatureName - Brief description
 * 
 * @feature F## - Feature Name
 * @tables table1, table2
 * @migration XXX_migration_name.sql
 * 
 * @example
 * ```typescript
 * const { data, loading, error } = useFeatureName()
 * ```
 */
export function useFeatureName() {
  // Implementation
}
```

### Component Documentation Template
```vue
<!--
  ComponentName
  
  @description Brief description of what this component does
  @props { PropType } propName - Description
  @emits eventName - Description
  
  @example
  <ComponentName :prop="value" @event="handler" />
-->
<template>
  <!-- Template -->
</template>
```

---

## 🔍 Code Review Checklist

### Before Committing
- [ ] No `console.log` in production code
- [ ] No `as any` unless absolutely necessary
- [ ] Types are properly defined
- [ ] Functions have JSDoc comments
- [ ] No duplicate code
- [ ] Tests added for new features
- [ ] Error handling implemented
- [ ] Loading states handled

### Before PR
- [ ] All tests pass
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] Documentation updated
- [ ] Migration tested (if applicable)
- [ ] Cross-role functionality verified (Customer/Provider/Admin)

---

## 🚀 Performance Best Practices

### 1. Lazy Loading
```typescript
// ✅ Good - lazy load heavy components
const HeavyComponent = defineAsyncComponent(() => 
  import('./components/HeavyComponent.vue')
)
```

### 2. Memoization
```typescript
// ✅ Good - cache expensive computations
const expensiveValue = computed(() => {
  return heavyCalculation(props.data)
})
```

### 3. Debouncing
```typescript
// ✅ Good - debounce search
import { useDebounceFn } from '@vueuse/core'

const debouncedSearch = useDebounceFn((query) => {
  performSearch(query)
}, 300)
```

### 4. Virtual Scrolling
```typescript
// ✅ Good - for large lists
import { useVirtualList } from '@vueuse/core'

const { list, containerProps, wrapperProps } = useVirtualList(
  items,
  { itemHeight: 50 }
)
```

---

## 📊 Metrics to Track

### Code Quality Metrics
- **Type Coverage**: Target 95%+
- **Test Coverage**: Target 70%+
- **Bundle Size**: Keep under 500KB (gzipped)
- **Lighthouse Score**: Target 90+

### Performance Metrics
- **FCP** (First Contentful Paint): < 1.5s
- **LCP** (Largest Contentful Paint): < 2.5s
- **TTI** (Time to Interactive): < 3.5s
- **CLS** (Cumulative Layout Shift): < 0.1

---

## 🔗 Tools & Resources

### Development Tools
- **TypeScript**: Type checking
- **ESLint**: Code linting
- **Prettier**: Code formatting
- **Vitest**: Unit testing
- **Playwright**: E2E testing

### Useful Commands
```bash
# Type check
npm run type-check

# Lint
npm run lint
npm run lint:fix

# Test
npm run test
npm run test:watch

# Build
npm run build
npm run build:check
```

---

## 📅 Improvement Roadmap

### Phase 1: Foundation (Week 1-2)
- [x] Fix duplicate migrations
- [x] Remove backup files
- [ ] Regenerate types
- [ ] Update supabase client

### Phase 2: Cleanup (Week 3-4)
- [ ] Consolidate V2/V3/V4 versions
- [ ] Remove unused code
- [ ] Update imports

### Phase 3: Refactoring (Week 5-6)
- [ ] Split large composables
- [ ] Add missing types
- [ ] Improve error handling

### Phase 4: Testing (Week 7-8)
- [ ] Add unit tests
- [ ] Add E2E tests
- [ ] Achieve 70% coverage

---

## 💡 Tips & Tricks

### 1. Use Type Guards
```typescript
function isRideRequest(obj: any): obj is RideRequest {
  return obj && typeof obj.pickup_lat === 'number'
}
```

### 2. Avoid Deep Nesting
```typescript
// ❌ Bad
if (user) {
  if (user.role === 'admin') {
    if (user.permissions.includes('edit')) {
      // Do something
    }
  }
}

// ✅ Good - early return
if (!user) return
if (user.role !== 'admin') return
if (!user.permissions.includes('edit')) return
// Do something
```

### 3. Use Composition API Properly
```typescript
// ✅ Good - reusable logic
export function useFeature() {
  const state = ref(null)
  const loading = ref(false)
  
  const fetch = async () => {
    loading.value = true
    // Fetch logic
    loading.value = false
  }
  
  return { state, loading, fetch }
}
```

---

**Last Updated**: December 23, 2025  
**Maintained By**: Development Team
