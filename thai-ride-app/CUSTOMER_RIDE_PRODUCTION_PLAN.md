# 🚀 Customer Ride Page - Production Readiness Plan

**Target:** `/customer/ride` - http://localhost:5173/customer/ride  
**Date:** 2026-01-14  
**Status:** 🔧 In Progress

---

## 📋 Current Status Analysis

### ✅ What's Working

1. **UI/UX Components**

   - RideViewRefactored.vue with step-based flow
   - RideBookingPanel with vehicle selection
   - Smart Promo integration
   - Map integration with Leaflet
   - Pull-to-refresh functionality

2. **State Management**

   - useRideRequest composable (comprehensive)
   - useRideStore (Pinia store)
   - Real-time tracking setup

3. **Features**
   - Location detection
   - Destination search
   - Fare calculation
   - Payment method selection
   - Scheduled rides
   - Multi-stop support
   - Notes input

### ⚠️ Issues Found

#### 🔴 CRITICAL - Role-Based Access

1. **Missing Role Validation in Components**

   - RideViewRefactored.vue doesn't check user role
   - No explicit customer-only guards
   - Provider/Admin could access customer UI

2. **RLS Policy Gaps**

   - Migration 262 has simple policies but needs role checks
   - No explicit `role = 'customer'` validation in policies
   - Provider policies allow seeing pending rides (correct) but need role verification

3. **Data Leakage Risk**
   - Customer can potentially see provider-specific data
   - No role-based data filtering in queries

#### 🟡 MEDIUM - Production Safety

1. **Error Handling**

   - Missing comprehensive error boundaries
   - No retry logic for failed bookings
   - Insufficient user feedback on errors

2. **Performance**

   - No request deduplication for nearby places
   - Missing loading skeletons
   - No optimistic updates

3. **Security**
   - Missing input validation (Zod schemas)
   - No rate limiting on booking requests
   - Missing CSRF protection

#### 🟢 LOW - UX Improvements

1. Missing offline support
2. No booking confirmation modal
3. Limited accessibility features

---

## 🎯 Production Requirements Checklist

### 1. Role-Based Access Control (MANDATORY)

#### A. Frontend Guards

```typescript
// ✅ Add to RideViewRefactored.vue
import { useRoleAccess } from "@/composables/useRoleAccess";

const { isCustomer, requireRole } = useRoleAccess();

onMounted(() => {
  // Redirect non-customers
  if (!requireRole(["customer", "admin"])) {
    return; // Already redirected
  }
  initialize();
});
```

#### B. RLS Policies Enhancement

```sql
-- ✅ Add role checks to existing policies
CREATE POLICY "customer_create_rides_v2" ON ride_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('customer', 'admin')
    )
  );
```

#### C. API Validation

```typescript
// ✅ Add to rideService.ts
export async function createRide(data: CreateRideInput) {
  // Validate user role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.userId)
    .single();

  if (!profile || !["customer", "admin"].includes(profile.role)) {
    throw new AppError("Unauthorized", ErrorCode.PERMISSION);
  }

  // Continue with ride creation...
}
```

### 2. Input Validation (Zod)

```typescript
// ✅ Create schemas
import { z } from "zod";

export const CreateRideSchema = z.object({
  pickup: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    address: z.string().min(3).max(500),
  }),
  destination: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    address: z.string().min(3).max(500),
  }),
  vehicleType: z.enum(["bike", "car", "premium"]),
  paymentMethod: z.enum(["wallet", "cash", "card"]),
  notes: z.string().max(500).optional(),
  scheduledTime: z.string().datetime().optional(),
});

// ✅ Use in bookRide
async function bookRide(options: BookingOptions) {
  const validation = CreateRideSchema.safeParse({
    pickup: pickup.value,
    destination: destination.value,
    vehicleType: selectedVehicle.value,
    paymentMethod: options.paymentMethod,
    notes: options.notes,
    scheduledTime: options.scheduledTime,
  });

  if (!validation.success) {
    error.value = "ข้อมูลไม่ถูกต้อง";
    return;
  }

  // Continue...
}
```

### 3. Error Handling

```typescript
// ✅ Add error boundary
import { useErrorHandler } from "@/composables/useErrorHandler";

const { handle: handleError } = useErrorHandler();

async function bookRide(options: BookingOptions) {
  try {
    // ... booking logic
  } catch (err) {
    handleError(err, "bookRide");
    // Show user-friendly message
    alert("ไม่สามารถจองได้ กรุณาลองใหม่");
  }
}
```

### 4. Performance Optimization

```typescript
// ✅ Add request deduplication
import { useRequestDedup } from "@/composables/useRequestDedup";

const { dedupRequest } = useRequestDedup();

async function fetchNearbyPlaces(lat: number, lng: number) {
  const cacheKey = `nearby_${lat.toFixed(2)}_${lng.toFixed(2)}`;

  const places = await dedupRequest(
    cacheKey,
    async () => {
      // Fetch logic...
    },
    { ttl: 60000 } // 1 minute cache
  );

  nearbyPlaces.value = places;
}
```

### 5. Security Headers

```typescript
// ✅ Add to vercel.json
{
  "headers": [
    {
      "source": "/customer/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
      ]
    }
  ]
}
```

---

## 🔧 Implementation Steps

### Phase 1: Critical Security (Day 1)

- [ ] Add role-based guards to RideViewRefactored.vue
- [ ] Create migration for enhanced RLS policies
- [ ] Add input validation with Zod
- [ ] Implement error boundaries

### Phase 2: Production Safety (Day 2)

- [ ] Add request deduplication
- [ ] Implement retry logic
- [ ] Add loading states
- [ ] Create booking confirmation modal

### Phase 3: Testing (Day 3)

- [ ] Test as customer role
- [ ] Test as provider role (should redirect)
- [ ] Test as admin role (should work)
- [ ] Test error scenarios
- [ ] Test offline behavior

### Phase 4: Monitoring (Day 4)

- [ ] Add analytics events
- [ ] Set up error tracking
- [ ] Monitor performance metrics
- [ ] Create alerts for failures

---

## 📊 Success Metrics

### Security

- ✅ 100% role-based access enforcement
- ✅ All inputs validated
- ✅ No data leakage between roles

### Performance

- ✅ LCP < 2.5s
- ✅ INP < 200ms
- ✅ API response < 500ms

### Reliability

- ✅ 99.9% booking success rate
- ✅ < 1% error rate
- ✅ Graceful degradation on failures

---

## 🚨 Rollback Plan

If issues occur in production:

1. **Immediate:** Disable ride booking feature flag
2. **Short-term:** Revert to previous migration
3. **Long-term:** Fix issues in staging, re-deploy

---

## 📝 Notes

- All changes must follow role-based development rules
- Every feature must consider Customer, Provider, and Admin impact
- Security > Performance > UX (priority order)
- Test with real user accounts, not demo mode

---

## 🎭 Role Impact Analysis

| Role     | Access  | Features                           | Restrictions          |
| -------- | ------- | ---------------------------------- | --------------------- |
| Customer | ✅ Full | Book rides, track, rate            | Own data only         |
| Provider | ❌ No   | N/A                                | Redirect to /provider |
| Admin    | ✅ Full | All customer features + monitoring | Full access           |

---

**Next Action:** Start Phase 1 implementation
