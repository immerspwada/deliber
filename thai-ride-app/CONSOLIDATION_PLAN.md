# 🔄 Code Consolidation Plan

**Date**: December 23, 2025  
**Status**: 🟡 In Progress

---

## 📊 Current State Analysis

### Large Composables (>1000 lines)
| File | Lines | Priority | Action |
|------|-------|----------|--------|
| `useAdvancedSystem.ts` | 3,942 | 🔴 Critical | Split into modules |
| `useAdmin.ts` | 3,373 | 🔴 Critical | Split by domain |
| `usePerformance.ts` | 3,225 | 🔴 Critical | Split by category |
| `useProvider.ts` | 1,722 | 🟡 High | Split by feature |
| `useCustomerManagement.ts` | 1,635 | 🟡 High | Split by function |
| `useProviderDashboard.ts` | 1,620 | 🟡 High | Consolidate with V3 |
| `useRoleAwareNotifications.ts` | 1,412 | 🟡 High | Keep as is (complex logic) |
| `useRideBookingV2.ts` | 1,370 | 🟢 Medium | Remove (use V3) |

### Version Duplicates
| Base Name | Versions | Keep | Remove |
|-----------|----------|------|--------|
| RideBooking | V2, V3 | V3 | V2 |
| ProviderDashboard | V2, V3, V4 | V4 | V2, V3 |
| Wallet | V2, V3 | V3 | V2 |
| ServiceArea | V2, V3 | V3 | V2 |
| Delivery | V2 | V2 | - |
| Shopping | V2 | V2 | - |
| Queue | V2 | V2 | - |
| Moving | V2 | V2 | - |
| Laundry | V2 | V2 | - |

---

## 🎯 Phase 1: Remove Duplicate Versions (Week 1)

### Priority 1: Remove V2 when V3 exists

#### 1.1 RideBooking Consolidation
**Files to Remove**:
- ❌ `src/composables/useRideBookingV2.ts`
- ❌ `src/views/RideViewV2.vue`
- ❌ `src/views/RideBookingViewV3.vue` (consolidate into main)

**Files to Keep**:
- ✅ `src/composables/useRideBookingV3.ts` → rename to `useRideBooking.ts`
- ✅ `src/views/RideView.vue` (update to use V3)

**Migration Steps**:
```bash
# 1. Update all imports from V2 to V3
# 2. Test ride booking flow
# 3. Remove V2 files
# 4. Rename V3 to main version
```

#### 1.2 ProviderDashboard Consolidation
**Files to Remove**:
- ❌ `src/views/provider/ProviderDashboardView.vue` (old)
- ❌ `src/views/provider/ProviderDashboardViewV2.vue`
- ❌ `src/composables/useProviderDashboard.ts` (old)
- ❌ `src/composables/useProviderDashboardV3.ts`

**Files to Keep**:
- ✅ `src/views/provider/ProviderDashboardV4.vue` → rename to `ProviderDashboardView.vue`

**Migration Steps**:
```bash
# 1. Update router to use V4
# 2. Test provider dashboard
# 3. Remove old versions
# 4. Rename V4 to main
```

#### 1.3 Wallet Consolidation
**Files to Remove**:
- ❌ `src/views/WalletViewV2.vue`
- ❌ `src/composables/useWalletV2.ts` (if V3 exists)

**Files to Keep**:
- ✅ `src/views/WalletViewV3.vue` → rename to `WalletView.vue`

#### 1.4 ServiceArea Consolidation
**Files to Remove**:
- ❌ `src/composables/useServiceAreaV2.ts`

**Files to Keep**:
- ✅ `src/composables/useServiceAreaV3.ts` → rename to `useServiceArea.ts`

### Priority 2: Keep V2 versions (no V3 exists)
These are the latest versions, just remove the V2 suffix:
- `useDeliveryV2.ts` → `useDelivery.ts` (already exists, merge)
- `useShoppingV2.ts` → `useShopping.ts` (already exists, merge)
- `useQueueV2.ts` → `useQueue.ts` (already exists, merge)
- `useMovingV2.ts` → `useMoving.ts` (already exists, merge)
- `useLaundryV2.ts` → `useLaundry.ts` (already exists, merge)

---

## 🎯 Phase 2: Split Large Composables (Week 2-3)

### 2.1 Split useAdvancedSystem.ts (3,942 lines)

**Current Structure**: Single monolithic file with all advanced features

**Proposed Structure**:
```
composables/advanced/
├── useFeatureFlags.ts          (F202)
├── useABTesting.ts             (F203)
├── useUserPreferences.ts       (F204)
├── useSmartCache.ts            (F205-F207)
├── useStateMachine.ts          (F208-F211)
├── useDataManagement.ts        (F212-F222)
├── useUIHelpers.ts             (F223-F236)
├── useAnalyticsTracker.ts      (F237)
├── useSystemManagement.ts      (F238-F251)
└── index.ts                    (re-export all)
```

**Benefits**:
- Easier to maintain
- Better code organization
- Faster IDE performance
- Easier testing

### 2.2 Split useAdmin.ts (3,373 lines)

**Current Structure**: All admin functions in one file

**Proposed Structure**:
```
composables/admin/
├── useAdminAuth.ts             (Login, permissions)
├── useAdminCustomers.ts        (Customer management)
├── useAdminProviders.ts        (Provider management)
├── useAdminOrders.ts           (Order management)
├── useAdminPayments.ts         (Payment, wallet, refunds)
├── useAdminPromos.ts           (Promo management)
├── useAdminSupport.ts          (Support tickets)
├── useAdminAnalytics.ts        (Analytics, reports)
├── useAdminSettings.ts         (System settings)
└── index.ts                    (re-export all)
```

### 2.3 Split usePerformance.ts (3,225 lines)

**Current Structure**: All performance utilities in one file

**Proposed Structure**:
```
composables/performance/
├── useMemoryManagement.ts      (F172-F173)
├── useDebounceThrottle.ts      (F174-F175)
├── useLazyLoading.ts           (F176-F177)
├── useVirtualization.ts        (F178-F179)
├── useRequestOptimization.ts   (F180-F184)
├── useImageOptimization.ts     (F185-F186)
├── useAnimationHelpers.ts      (F187-F188)
├── useNetworkHelpers.ts        (F189-F191)
├── useStateManagement.ts       (F192-F194)
├── useResourceHints.ts         (F195-F196)
├── useFormHelpers.ts           (F197-F200)
└── index.ts                    (re-export all)
```

### 2.4 Split useProvider.ts (1,722 lines)

**Current Structure**: All provider functionality in one file

**Proposed Structure**:
```
composables/provider/
├── useProviderProfile.ts       (Profile, verification, documents)
├── useProviderJobs.ts          (Job listing, acceptance, status)
├── useProviderEarnings.ts      (Earnings, withdrawals, stats)
├── useProviderLocation.ts      (GPS tracking, availability)
├── useProviderRealtime.ts      (Realtime subscriptions)
├── useProviderNotifications.ts (Push, sound notifications)
└── index.ts                    (re-export all)
```

---

## 🎯 Phase 3: Type Safety Improvements (Week 4)

### 3.1 Regenerate Supabase Types
```bash
# Generate types from Supabase schema
cd thai-ride-app
./scripts/generate-types.sh
```

### 3.2 Remove `as any` Casts
**Target Files** (high priority):
- `useAdmin.ts` - ~50 instances
- `useProvider.ts` - ~30 instances
- `useServices.ts` - ~20 instances

**Strategy**:
1. Generate proper types first
2. Update supabase client with types
3. Replace `as any` with proper types
4. Add type guards where needed

### 3.3 Add Missing Table Types
Add types for:
- `delivery_requests`
- `shopping_requests`
- `queue_bookings`
- `moving_requests`
- `laundry_requests`

---

## 🎯 Phase 4: Testing & Validation (Week 5)

### 4.1 Add Unit Tests
**Priority Areas**:
- Fare calculation functions
- Distance calculation
- Promo code validation
- Loyalty points calculation

### 4.2 Add Integration Tests
**Priority Flows**:
- Customer ride booking
- Provider job acceptance
- Admin order management
- Payment processing

### 4.3 Add E2E Tests
**Critical User Journeys**:
- Complete ride booking flow
- Provider onboarding flow
- Admin verification flow

---

## 📋 Detailed Action Items

### Week 1: Version Consolidation
- [ ] Day 1-2: RideBooking V2→V3 consolidation
- [ ] Day 3-4: ProviderDashboard V2/V3→V4 consolidation
- [ ] Day 5: Wallet V2→V3 consolidation
- [ ] Day 6: ServiceArea V2→V3 consolidation
- [ ] Day 7: Testing & validation

### Week 2: Large File Splitting (Part 1)
- [ ] Day 1-3: Split useAdvancedSystem.ts
- [ ] Day 4-5: Split useAdmin.ts
- [ ] Day 6-7: Testing & validation

### Week 3: Large File Splitting (Part 2)
- [ ] Day 1-3: Split usePerformance.ts
- [ ] Day 4-5: Split useProvider.ts
- [ ] Day 6-7: Testing & validation

### Week 4: Type Safety
- [ ] Day 1: Regenerate Supabase types
- [ ] Day 2-4: Remove `as any` casts
- [ ] Day 5-6: Add missing types
- [ ] Day 7: Testing & validation

### Week 5: Testing
- [ ] Day 1-2: Unit tests
- [ ] Day 3-4: Integration tests
- [ ] Day 5-6: E2E tests
- [ ] Day 7: Final validation

---

## 🚨 Breaking Changes & Migration Guide

### For Developers

#### Import Changes
```typescript
// ❌ Old (V2)
import { useRideBooking } from '@/composables/useRideBookingV2'

// ✅ New (consolidated)
import { useRideBooking } from '@/composables/useRideBooking'
```

#### Component Changes
```vue
<!-- ❌ Old (V4) -->
<ProviderDashboardV4 />

<!-- ✅ New (consolidated) -->
<ProviderDashboardView />
```

#### Admin Composable Changes
```typescript
// ❌ Old (monolithic)
import { useAdmin } from '@/composables/useAdmin'
const { getCustomers, getProviders, getOrders } = useAdmin()

// ✅ New (modular)
import { useAdminCustomers } from '@/composables/admin/useAdminCustomers'
import { useAdminProviders } from '@/composables/admin/useAdminProviders'
import { useAdminOrders } from '@/composables/admin/useAdminOrders'

const { getCustomers } = useAdminCustomers()
const { getProviders } = useAdminProviders()
const { getOrders } = useAdminOrders()

// OR use index re-export
import { useAdminCustomers, useAdminProviders, useAdminOrders } from '@/composables/admin'
```

---

## ✅ Success Criteria

### Code Quality Metrics
- [ ] No files over 1,000 lines
- [ ] No duplicate version files (V2/V3/V4)
- [ ] Type coverage > 95%
- [ ] Test coverage > 70%
- [ ] Zero `as any` casts in critical paths

### Performance Metrics
- [ ] Bundle size < 500KB (gzipped)
- [ ] Lighthouse score > 90
- [ ] FCP < 1.5s
- [ ] LCP < 2.5s

### Developer Experience
- [ ] Clear file organization
- [ ] Consistent naming conventions
- [ ] Comprehensive documentation
- [ ] Easy to find and modify code

---

## 📝 Notes

- All changes will be backward compatible where possible
- Breaking changes will be documented
- Migration guides will be provided
- Git history will be preserved
- Each phase can be done independently

---

**Last Updated**: December 23, 2025  
**Next Review**: After Phase 1 completion
