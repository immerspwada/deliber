# Remove Mock Data - Action Plan

## ✅ Created
1. Migration 085_seed_demo_data.sql - สร้างข้อมูลจริงในฐานข้อมูล

## 🔄 Files to Clean (Remove Mock Data)

### High Priority - Core Files
1. ✅ `src/composables/useAdmin.ts` - ลบ generateMock* functions และ demo mode checks
2. `src/stores/auth.ts` - ลบ demo mode และ demoUsers
3. `src/composables/useAnalytics.ts` - ลบ generateDemo* functions
4. `src/composables/useServiceArea.ts` - ลบ demo mode checks
5. `src/composables/useAuditLog.ts` - ลบ demo logs
6. `src/composables/useProviderPerformance.ts` - ลบ demo data
7. `src/composables/useProviderVerification.ts` - ลบ generateMockQueue
8. `src/composables/useAdminAnalytics.ts` - ลบ generateMock* functions
9. `src/composables/useProviderEarningsV2.ts` - ลบ generateMockDailyEarnings

### Medium Priority - Feature Files
10. `src/composables/useQueueBooking.ts` - ลบ demo mode checks
11. `src/composables/useQueueFavorites.ts` - ลบ demo mode checks
12. `src/composables/useAppSettings.ts` - ลบ demo mode checks
13. `src/composables/useSurgePricing.ts` - ลบ demo mode checks
14. `src/composables/useSearchHistory.ts` - ลบ demo mode checks
15. `src/composables/useServices.ts` - ลบ demo mode checks
16. `src/main.ts` - ลบ demo mode checks

### Low Priority - View Files
17. `src/views/PromotionsView.vue` - ลบ loadDemoPromos
18. `src/views/AdminPerformanceView.vue` - ลบ mock trend data
19. `src/views/AdminUserJourneyView.vue` - ลบ mock funnel data
20. `src/views/AdminCorporateView.vue` - ลบ mock companies
21. `src/views/RideView.vue` - ลบ mockPlaces
22. `src/views/provider/ProviderHistoryView.vue` - ลบ demo mode
23. `src/views/AdminUXAnalyticsView.vue` - ลบ fallback mock data
24. `src/views/AdminOrdersView.vue` - ลบ generateMockOrders

### Component Files
25. `src/components/QRScanner.vue` - ลบ simulateScan mock
26. `src/components/admin/EnhancedAdminLayout.vue` - ลบ mock search results
27. `src/components/LocationPicker.vue` - ลบ mockPlaces (แต่เก็บ common places ไว้)

## 🎯 Strategy

### Phase 1: Database (Done)
- ✅ Create migration with real seed data

### Phase 2: Core Composables (Next)
- Remove all `isDemoMode()` / `isAdminDemoMode()` checks
- Remove all `generateMock*()` functions
- Always query from database
- Show empty state when no data

### Phase 3: Views & Components
- Remove demo mode UI
- Remove mock data fallbacks
- Use real data from composables

### Phase 4: Testing
- Run migration on dev database
- Test all features with real data
- Verify empty states work correctly

## 📝 Code Patterns to Remove

```typescript
// ❌ Remove these patterns:
const isDemoMode = () => localStorage.getItem('demo_mode') === 'true'
const isAdminDemoMode = () => localStorage.getItem('admin_demo_mode') === 'true'

if (isDemoMode()) {
  return mockData
}

const generateMock* = () => [...]

// Fallback to mock
} catch {
  return generateMockData()
}
```

```typescript
// ✅ Replace with:
try {
  const { data } = await supabase.from('table').select('*')
  return data || []
} catch (error) {
  console.error('Error fetching data:', error)
  return []
}
```

## 🚀 Next Steps
1. Clean useAdmin.ts (largest file with most mocks)
2. Clean auth store
3. Clean other composables
4. Clean views
5. Test thoroughly
