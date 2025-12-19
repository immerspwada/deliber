# 🧹 Remove Mock Data - Complete Action Plan

## 📊 Current Status

### ✅ Completed
1. **Created Migration** - `085_seed_demo_data.sql`
   - Seed demo users (5 customers)
   - Seed demo providers (5 providers with different statuses)
   - Seed demo promo codes (4 promos)
   - Seed demo notification templates (3 templates)
   - Seed demo loyalty tiers (4 tiers)
   - Seed demo loyalty rewards (3 rewards)
   - Seed demo customer tags (5 tags)
   - Seed demo app settings (8 settings)
   - Seed demo service areas (4 areas)

2. **Added Rule** - Updated `.kiro/steering/database-features.md`
   - Added "ห้ามใช้ Mock Data" section
   - Clear guidelines on what to do/not do
   - Code examples

3. **Created Scripts**
   - `scripts/remove-mock-data.md` - Action plan
   - `scripts/clean-useAdmin.sh` - Script to clean useAdmin.ts

---

## 🎯 Implementation Strategy

### Phase 1: Database Setup ✅
```bash
# Run migration to create seed data
cd thai-ride-app
supabase db reset  # or
supabase migration up
```

### Phase 2: Clean Core Composables (Priority Order)

#### 1. useAdmin.ts (HIGHEST PRIORITY) 🔴
**Mock Functions to Remove:**
- `isAdminDemoMode()`
- `generateMockOrders()`
- `generateMockUsers()`
- `generateMockProviders()`
- `generateMockPayments()`
- `generateMockTickets()`
- `generateMockPromos()`
- `generateMockDeliveryRatings()`
- `generateMockShoppingRatings()`
- `generateMockRideRatings()`
- `generateMockTemplates()`
- `generateMockScheduledNotifications()`

**Changes:**
```typescript
// ❌ Remove
if (isAdminDemoMode()) {
  return generateMockData()
}

// ❌ Remove
} catch {
  return generateMockData()
}

// ✅ Replace with
try {
  const { data } = await supabase.from('table').select('*')
  return data || []
} catch (error) {
  logger.error('Error:', error)
  return []
}
```

#### 2. stores/auth.ts 🔴
**Remove:**
- `isDemoMode` computed
- `demoUsers` object
- Demo mode checks in `initializeAuth()`
- Demo mode checks in router guards

#### 3. useAnalytics.ts 🟡
**Remove:**
- `isDemoMode()`
- `generateDemoData()`
- `generateHourlyDemand()`
- All demo mode checks

#### 4. useServiceArea.ts 🟡
**Remove:**
- `isDemoMode()` checks
- Keep `defaultAreas` but load from database first

#### 5. useAuditLog.ts 🟡
**Remove:**
- `isDemoMode()` checks
- `generateDemoLogs()`

#### 6. useProviderPerformance.ts 🟡
**Remove:**
- `isDemoMode()` checks
- Demo metrics

#### 7. useProviderVerification.ts 🟡
**Remove:**
- `generateMockQueue()`

#### 8. useAdminAnalytics.ts 🟡
**Remove:**
- `generateMockRevenueTrend()`
- `generateMockHourlyOrders()`
- `generateMockUserGrowth()`

#### 9. useProviderEarningsV2.ts 🟡
**Remove:**
- `generateMockDailyEarnings()`

### Phase 3: Clean Feature Composables 🟢

#### Queue & Favorites
- `useQueueBooking.ts` - Remove demo mode checks
- `useQueueFavorites.ts` - Remove demo mode checks

#### Settings & Config
- `useAppSettings.ts` - Remove demo mode, use database
- `useSurgePricing.ts` - Remove demo mode
- `useSearchHistory.ts` - Remove demo mode checks

#### Services
- `useServices.ts` - Remove demo mode checks
- `main.ts` - Remove demo mode checks in router

### Phase 4: Clean Views 🟢

#### Admin Views
- `AdminPerformanceView.vue` - Remove mock trend
- `AdminUserJourneyView.vue` - Remove mock funnel
- `AdminCorporateView.vue` - Remove mock companies
- `AdminUXAnalyticsView.vue` - Remove fallback mock
- `AdminOrdersView.vue` - Remove generateMockOrders

#### Customer Views
- `PromotionsView.vue` - Remove loadDemoPromos
- `RideView.vue` - Keep mockPlaces as common places reference
- `provider/ProviderHistoryView.vue` - Remove demo mode

### Phase 5: Clean Components 🟢

- `QRScanner.vue` - Remove simulateScan (or mark as dev tool)
- `admin/EnhancedAdminLayout.vue` - Remove mock search
- `LocationPicker.vue` - Keep mockPlaces as common places, but query database first

---

## 📝 Code Transformation Patterns

### Pattern 1: Remove Demo Mode Check
```typescript
// ❌ Before
const isDemoMode = () => localStorage.getItem('demo_mode') === 'true'

if (isDemoMode()) {
  data.value = mockData
  return
}

// ✅ After
// Just remove the check, always query database
```

### Pattern 2: Remove Mock Fallback
```typescript
// ❌ Before
try {
  const { data } = await supabase.from('table').select('*')
  return data || generateMockData()
} catch {
  return generateMockData()
}

// ✅ After
try {
  const { data } = await supabase.from('table').select('*')
  return data || []
} catch (error) {
  logger.error('Error fetching data:', error)
  return []
}
```

### Pattern 3: Remove Mock Generator
```typescript
// ❌ Before
const generateMockUsers = () => [
  { id: '1', name: 'Mock User' },
  // ... more mock data
]

// ✅ After
// Delete entire function
```

---

## 🧪 Testing Checklist

### After Each File Cleanup
- [ ] File compiles without errors
- [ ] No TypeScript errors
- [ ] No unused imports
- [ ] All functions return correct types

### After Phase Completion
- [ ] Run migration 085_seed_demo_data.sql
- [ ] Test all admin functions
- [ ] Verify empty states show correctly
- [ ] Check error handling works
- [ ] Verify no console errors

### Final Testing
- [ ] Admin dashboard loads with real data
- [ ] All CRUD operations work
- [ ] Filters work correctly
- [ ] Search works correctly
- [ ] Pagination works correctly
- [ ] No mock data appears anywhere
- [ ] Empty states show when no data

---

## 🚀 Execution Order

1. **Run Migration First**
   ```bash
   cd thai-ride-app
   supabase migration up
   # or
   supabase db reset
   ```

2. **Clean Files in Order**
   - Start with useAdmin.ts (biggest impact)
   - Then auth store (affects routing)
   - Then other composables
   - Finally views and components

3. **Test After Each Major File**
   - Don't clean everything at once
   - Test incrementally
   - Fix issues immediately

4. **Final Verification**
   - Full app test
   - Check all admin features
   - Verify no mock data remains

---

## 📊 Progress Tracking

### Composables (9 files)
- [ ] useAdmin.ts
- [ ] stores/auth.ts
- [ ] useAnalytics.ts
- [ ] useServiceArea.ts
- [ ] useAuditLog.ts
- [ ] useProviderPerformance.ts
- [ ] useProviderVerification.ts
- [ ] useAdminAnalytics.ts
- [ ] useProviderEarningsV2.ts

### Feature Composables (6 files)
- [ ] useQueueBooking.ts
- [ ] useQueueFavorites.ts
- [ ] useAppSettings.ts
- [ ] useSurgePricing.ts
- [ ] useSearchHistory.ts
- [ ] useServices.ts

### Views (9 files)
- [ ] AdminPerformanceView.vue
- [ ] AdminUserJourneyView.vue
- [ ] AdminCorporateView.vue
- [ ] AdminUXAnalyticsView.vue
- [ ] AdminOrdersView.vue
- [ ] PromotionsView.vue
- [ ] RideView.vue
- [ ] provider/ProviderHistoryView.vue
- [ ] main.ts

### Components (3 files)
- [ ] QRScanner.vue
- [ ] admin/EnhancedAdminLayout.vue
- [ ] LocationPicker.vue

**Total: 27 files to clean**

---

## ⚠️ Important Notes

1. **Always backup before cleaning**
2. **Test incrementally, not all at once**
3. **Keep common places data** (like mockPlaces in LocationPicker) as reference, but query database first
4. **Use logger.error()** instead of silent failures
5. **Return empty arrays/objects** instead of mock data on error
6. **Remove localStorage demo mode** completely

---

## 🎉 Success Criteria

- ✅ No `isDemoMode()` or `isAdminDemoMode()` in codebase
- ✅ No `generateMock*()` functions
- ✅ All data comes from Supabase
- ✅ Empty states show correctly when no data
- ✅ Error handling works properly
- ✅ All admin features functional
- ✅ No console errors
- ✅ Migration 085 applied successfully
