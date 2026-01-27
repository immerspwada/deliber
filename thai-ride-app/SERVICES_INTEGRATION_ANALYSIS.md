# 🔍 Services Integration Analysis

**Date**: 2026-01-26  
**Status**: ✅ Analysis Complete  
**Priority**: 🎯 Strategic Planning

---

## 📊 Overview

วิเคราะห์สถานะการ integrate ระบบ pricing แบบ distance-based สำหรับทั้ง 6 บริการ

---

## ✅ Services Status Summary

| Service         | View                | Composable              | Pricing Method                        | Database Integration | Status         |
| --------------- | ------------------- | ----------------------- | ------------------------------------- | -------------------- | -------------- |
| 🚗 **Ride**     | ✅ RideView.vue     | ✅ usePricingCalculator | `calculate_distance_fare('ride')`     | ✅ Full              | 🟢 **LIVE**    |
| 📦 **Delivery** | ✅ DeliveryView.vue | ✅ useDelivery          | `calculate_distance_fare('delivery')` | ✅ Full              | 🟢 **LIVE**    |
| 🛒 **Shopping** | ✅ ShoppingView.vue | ✅ useShopping          | `calculate_distance_fare('shopping')` | ✅ Full              | 🟢 **LIVE**    |
| 🚚 **Moving**   | ⚠️ MovingView.vue   | ⚠️ useMoving            | `calculatePrice()` (hardcoded)        | ❌ Not integrated    | 🟡 **PARTIAL** |
| 👥 **Queue**    | ⚠️ QueueView.vue    | ⚠️ useQueueBooking      | Fixed 50฿ (hardcoded)                 | ❌ Not integrated    | 🟡 **PARTIAL** |
| 🧺 **Laundry**  | ⚠️ LaundryView.vue  | ⚠️ useLaundry           | `calculatePrice()` (hardcoded)        | ❌ Not integrated    | 🟡 **PARTIAL** |

---

## 🟢 Fully Integrated Services (3/6)

### 1. Ride Service ✅

**Integration**: Complete  
**Pricing**: Database-driven with vehicle multipliers

```typescript
// src/composables/usePricingCalculator.ts
const { data } = await supabase.rpc("calculate_distance_fare", {
  p_service_type: "ride",
  p_distance_km: distanceKm,
});

// Vehicle multipliers applied
const finalFare = baseFare * vehicleMultiplier;
```

**Features**:

- ✅ Distance-based calculation
- ✅ Vehicle type multipliers (bike: 0.7x, car: 1.0x, premium: 1.5x)
- ✅ Min/max fare constraints
- ✅ Real-time price updates
- ✅ Admin configurable via UI

**Database Config**:

```json
{
  "ride": {
    "base_fare": 36,
    "per_km": 1,
    "min_fare": 5,
    "max_fare": 1000
  }
}
```

---

### 2. Delivery Service ✅

**Integration**: Complete  
**Pricing**: Database-driven

```typescript
// src/composables/useDelivery.ts
const { data } = await supabase.rpc("calculate_distance_fare", {
  p_service_type: "delivery",
  p_distance_km: distanceKm,
});
```

**Features**:

- ✅ Distance-based calculation
- ✅ Package type consideration
- ✅ Min/max fare constraints
- ✅ Real-time price updates
- ✅ Admin configurable via UI

**Database Config**:

```json
{
  "delivery": {
    "base_fare": 30,
    "per_km": 10,
    "min_fare": 30,
    "max_fare": 500
  }
}
```

---

### 3. Shopping Service ✅

**Integration**: Complete  
**Pricing**: Database-driven + budget consideration

```typescript
// src/composables/useShopping.ts
const { data } = await supabase.rpc("calculate_distance_fare", {
  p_service_type: "shopping",
  p_distance_km: distanceKm,
});

// Additional service fee based on budget
const serviceFee = baseFare + budgetLimit * 0.1;
```

**Features**:

- ✅ Distance-based calculation
- ✅ Budget-based service fee
- ✅ Min/max fare constraints
- ✅ Real-time price updates
- ✅ Admin configurable via UI

**Database Config**:

```json
{
  "shopping": {
    "base_fare": 40,
    "per_km": 12,
    "min_fare": 40,
    "max_fare": 800
  }
}
```

---

## 🟡 Partially Integrated Services (3/6)

### 4. Moving Service ⚠️

**Current Status**: Hardcoded pricing  
**Integration**: NOT using database

**Current Implementation**:

```typescript
// src/composables/useMoving.ts (HARDCODED)
function calculatePrice(
  serviceType: "small" | "medium" | "large",
  helperCount: number,
): number {
  const basePrices = {
    small: 150, // ❌ Hardcoded
    medium: 350, // ❌ Hardcoded
    large: 1500, // ❌ Hardcoded
  };
  const basePrice = basePrices[serviceType];
  const helperFee = Math.max(0, helperCount - 1) * 100; // ❌ Hardcoded
  return basePrice + helperFee;
}
```

**Database Config** (Already exists but NOT used):

```json
{
  "moving": {
    "base_fare": 200,
    "per_km": 25,
    "min_fare": 200,
    "max_fare": 5000
  }
}
```

**Issues**:

- ❌ Not using `calculate_distance_fare()` function
- ❌ No distance consideration
- ❌ Admin cannot change pricing via UI
- ❌ Hardcoded helper fees
- ❌ No min/max constraints

**What Needs to Change**:

```typescript
// ✅ SHOULD BE:
async function calculateFee(
  distanceKm: number,
  serviceType: string,
  helperCount: number,
): Promise<number> {
  // Get base fare from database
  const { data } = await supabase.rpc("calculate_distance_fare", {
    p_service_type: "moving",
    p_distance_km: distanceKm,
  });

  const baseFare = data[0].final_fare;

  // Add helper fee (should also be configurable)
  const helperFee = Math.max(0, helperCount - 1) * 100;

  return baseFare + helperFee;
}
```

---

### 5. Queue Service ⚠️

**Current Status**: Fixed price  
**Integration**: NOT using database

**Current Implementation**:

```typescript
// src/composables/useQueueBooking.ts (HARDCODED)
const serviceFee = 50; // ❌ Fixed price, not from database
```

**Database Config** (Already exists but NOT used):

```json
{
  "queue": {
    "base_fare": 50,
    "per_km": 0, // No distance charge (correct for queue)
    "min_fare": 50,
    "max_fare": 500
  }
}
```

**Issues**:

- ❌ Not using `calculate_distance_fare()` function
- ❌ Admin cannot change pricing via UI
- ❌ No flexibility for different queue types
- ❌ No min/max constraints

**What Needs to Change**:

```typescript
// ✅ SHOULD BE:
async function calculateFee(): Promise<number> {
  // Get base fare from database (distance = 0 for queue)
  const { data } = await supabase.rpc("calculate_distance_fare", {
    p_service_type: "queue",
    p_distance_km: 0, // Queue doesn't use distance
  });

  return data[0].final_fare; // Will return base_fare (50฿)
}
```

---

### 6. Laundry Service ⚠️

**Current Status**: Hardcoded pricing  
**Integration**: NOT using database

**Current Implementation**:

```typescript
// src/composables/useLaundry.ts (HARDCODED)
function calculatePrice(services: LaundryService[], weight: number): number {
  let total = 0;

  if (services.includes("dry-clean")) {
    total = weight * 5 * 150; // ❌ Hardcoded
  } else if (services.includes("wash-iron")) {
    total = weight * 60; // ❌ Hardcoded
  } else {
    total = weight * 40; // ❌ Hardcoded (wash-fold)
  }

  if (services.includes("express")) {
    total += 100; // ❌ Hardcoded
  }

  return total;
}
```

**Database Config** (Already exists but NOT used):

```json
{
  "laundry": {
    "base_fare": 60,
    "per_km": 5,
    "min_fare": 60,
    "max_fare": 300
  }
}
```

**Issues**:

- ❌ Not using `calculate_distance_fare()` function
- ❌ Complex pricing logic (weight + service type)
- ❌ Admin cannot change pricing via UI
- ❌ Hardcoded service fees
- ❌ No min/max constraints

**What Needs to Change**:

```typescript
// ✅ SHOULD BE:
async function calculateFee(
  distanceKm: number,
  weight: number,
  services: LaundryService[],
): Promise<number> {
  // Get base fare from database (includes pickup/delivery distance)
  const { data } = await supabase.rpc("calculate_distance_fare", {
    p_service_type: "laundry",
    p_distance_km: distanceKm,
  });

  const deliveryFee = data[0].final_fare;

  // Get service rates from database (need new table: laundry_service_rates)
  const { data: rates } = await supabase
    .from("laundry_service_rates")
    .select("*")
    .in("service_type", services);

  // Calculate total based on weight and services
  let serviceFee = 0;
  for (const service of services) {
    const rate = rates.find((r) => r.service_type === service);
    if (rate) {
      serviceFee += rate.price_per_kg * weight;
    }
  }

  return deliveryFee + serviceFee;
}
```

---

## 🎯 Integration Priority

### High Priority (Should integrate immediately)

**1. Queue Service** 🔥

- **Complexity**: ⭐ Low (simplest)
- **Effort**: 1-2 hours
- **Impact**: High (admin flexibility)
- **Reason**: Already has database config, just needs to use it

**2. Moving Service** 🔥

- **Complexity**: ⭐⭐ Medium
- **Effort**: 2-3 hours
- **Impact**: High (distance-based pricing needed)
- **Reason**: Should consider distance for moving service

### Medium Priority

**3. Laundry Service** ⚠️

- **Complexity**: ⭐⭐⭐ High
- **Effort**: 4-6 hours
- **Impact**: Medium
- **Reason**: Complex pricing (weight + service type + distance)
- **Note**: May need additional database table for service rates

---

## 📋 Integration Checklist

### For Each Service

#### Phase 1: Database Setup

- [ ] Verify pricing config exists in `financial_settings.distance_rates`
- [ ] Test `calculate_distance_fare()` function with service type
- [ ] Create additional tables if needed (e.g., `laundry_service_rates`)

#### Phase 2: Composable Update

- [ ] Replace hardcoded `calculatePrice()` with database call
- [ ] Use `calculate_distance_fare()` function
- [ ] Handle distance parameter correctly
- [ ] Add error handling and fallbacks
- [ ] Update TypeScript types

#### Phase 3: View Update

- [ ] Update fare display to use new calculation
- [ ] Add loading states during calculation
- [ ] Show fare breakdown if needed
- [ ] Test with different distances

#### Phase 4: Admin UI

- [ ] Verify service appears in PricingSettingsCard tabs
- [ ] Test pricing updates via admin UI
- [ ] Verify changes reflect in customer view
- [ ] Test min/max constraints

#### Phase 5: Testing

- [ ] Unit tests for composable
- [ ] Integration tests for view
- [ ] Test edge cases (0 distance, max distance)
- [ ] Test with different service types
- [ ] Verify wallet deduction uses correct amount

---

## 🔧 Implementation Guide

### Queue Service Integration (Easiest)

**Step 1**: Update composable

```typescript
// src/composables/useQueueBooking.ts

async function calculateServiceFee(): Promise<number> {
  try {
    const { data, error } = await supabase.rpc("calculate_distance_fare", {
      p_service_type: "queue",
      p_distance_km: 0, // Queue doesn't use distance
    });

    if (error) {
      console.error("Queue fee calculation error:", error);
      return 50; // Fallback
    }

    return data[0].final_fare;
  } catch (err) {
    console.error("Queue fee calculation failed:", err);
    return 50; // Fallback
  }
}
```

**Step 2**: Use in createQueueBooking

```typescript
// Replace hardcoded 50 with:
const serviceFee = await calculateServiceFee();
```

**Step 3**: Test

- Create queue booking
- Verify correct fee charged
- Change fee in admin UI
- Verify new fee applies

---

### Moving Service Integration (Medium)

**Step 1**: Update composable

```typescript
// src/composables/useMoving.ts

async function calculateFee(
  distanceKm: number,
  serviceType: "small" | "medium" | "large",
  helperCount: number,
): Promise<number> {
  try {
    // Get distance-based fare from database
    const { data, error } = await supabase.rpc("calculate_distance_fare", {
      p_service_type: "moving",
      p_distance_km: distanceKm,
    });

    if (error) {
      console.error("Moving fee calculation error:", error);
      // Fallback to old calculation
      return calculatePrice(serviceType, helperCount);
    }

    const baseFare = data[0].final_fare;

    // Add helper fee (TODO: make this configurable too)
    const helperFee = Math.max(0, helperCount - 1) * 100;

    return baseFare + helperFee;
  } catch (err) {
    console.error("Moving fee calculation failed:", err);
    return calculatePrice(serviceType, helperCount); // Fallback
  }
}
```

**Step 2**: Update MovingView.vue

```typescript
// Add distance calculation
const estimatedDistance = ref(0);

watch([pickupLocation, destinationLocation], () => {
  if (pickupLocation.value && destinationLocation.value) {
    estimatedDistance.value = calculateDistance(
      pickupLocation.value.lat,
      pickupLocation.value.lng,
      destinationLocation.value.lat,
      destinationLocation.value.lng,
    );
  }
});

// Use in price calculation
const estimatedPrice = await calculateFee(
  estimatedDistance.value,
  selectedType.value,
  helperCount.value,
);
```

**Step 3**: Test

- Create moving request with different distances
- Verify distance affects price
- Change pricing in admin UI
- Verify new rates apply

---

### Laundry Service Integration (Complex)

**Requires**: Additional database table for service rates

**Step 1**: Create service rates table

```sql
CREATE TABLE laundry_service_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_type TEXT NOT NULL CHECK (service_type IN ('wash-fold', 'wash-iron', 'dry-clean', 'express')),
  price_per_kg DECIMAL(10,2),
  price_per_piece DECIMAL(10,2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed data
INSERT INTO laundry_service_rates (service_type, price_per_kg, price_per_piece) VALUES
  ('wash-fold', 40, NULL),
  ('wash-iron', 60, NULL),
  ('dry-clean', NULL, 150),
  ('express', 100, NULL);
```

**Step 2**: Update composable

```typescript
// src/composables/useLaundry.ts

async function calculateFee(
  distanceKm: number,
  weight: number,
  services: LaundryService[],
): Promise<number> {
  try {
    // Get delivery fee from database
    const { data: fareData, error: fareError } = await supabase.rpc(
      "calculate_distance_fare",
      {
        p_service_type: "laundry",
        p_distance_km: distanceKm,
      },
    );

    if (fareError) throw fareError;

    const deliveryFee = fareData[0].final_fare;

    // Get service rates from database
    const { data: rates, error: ratesError } = await supabase
      .from("laundry_service_rates")
      .select("*")
      .in("service_type", services)
      .eq("is_active", true);

    if (ratesError) throw ratesError;

    // Calculate service fee
    let serviceFee = 0;
    for (const service of services) {
      const rate = rates.find((r) => r.service_type === service);
      if (rate) {
        if (rate.price_per_kg) {
          serviceFee += rate.price_per_kg * weight;
        } else if (rate.price_per_piece) {
          serviceFee += rate.price_per_piece * (weight * 5); // Estimate pieces
        }
      }
    }

    return deliveryFee + serviceFee;
  } catch (err) {
    console.error("Laundry fee calculation failed:", err);
    return calculatePrice(services, weight); // Fallback
  }
}
```

**Step 3**: Create admin UI for service rates

- Add new tab in Financial Settings
- Allow editing service rates
- Show preview with different weights

---

## 📊 Benefits of Full Integration

### For Business

- ✅ **Centralized Control**: All pricing in one place
- ✅ **Quick Adjustments**: Change prices instantly
- ✅ **Market Response**: React to competition/demand
- ✅ **Consistency**: Same pricing logic across all services
- ✅ **Audit Trail**: Track all pricing changes

### For Customers

- ✅ **Transparency**: Clear pricing breakdown
- ✅ **Predictability**: Know cost before booking
- ✅ **Fairness**: Distance-based pricing
- ✅ **No Surprises**: Accurate estimates

### For Developers

- ✅ **Maintainability**: Single source of truth
- ✅ **Testability**: Easier to test
- ✅ **Scalability**: Easy to add new services
- ✅ **Consistency**: Same pattern everywhere

---

## 🚀 Recommended Action Plan

### Week 1: Queue Service

- Day 1-2: Integrate database pricing
- Day 3: Test and verify
- Day 4: Deploy to production
- Day 5: Monitor and adjust

### Week 2: Moving Service

- Day 1-2: Add distance calculation
- Day 3: Integrate database pricing
- Day 4: Test with various distances
- Day 5: Deploy and monitor

### Week 3: Laundry Service

- Day 1: Design service rates table
- Day 2: Create database table and seed data
- Day 3: Update composable
- Day 4: Create admin UI for rates
- Day 5: Test and deploy

### Week 4: Polish & Optimize

- Day 1-2: Add caching for pricing data
- Day 3: Performance optimization
- Day 4: Documentation updates
- Day 5: Final testing and deployment

---

## 📝 Notes

### Current Limitations

**Moving Service**:

- No distance consideration (should have)
- Helper fees hardcoded
- Service type affects base price only

**Queue Service**:

- Fixed price (correct for queue booking)
- No category-based pricing
- Could add premium categories

**Laundry Service**:

- Most complex pricing (weight + service + distance)
- Needs separate rates table
- Multiple pricing dimensions

### Future Enhancements

- [ ] **Dynamic Pricing**: Surge pricing for all services
- [ ] **Time-based Rates**: Different prices by time of day
- [ ] **Zone-based Pricing**: Different rates per area
- [ ] **Bulk Discounts**: Lower rates for multiple bookings
- [ ] **Subscription Plans**: Fixed monthly rates
- [ ] **Promotional Pricing**: Temporary discounts

---

## ✅ Conclusion

**Current State**:

- 3/6 services fully integrated (50%)
- 3/6 services need integration (50%)

**Priority**:

1. 🔥 Queue (easiest, high impact)
2. 🔥 Moving (medium effort, high impact)
3. ⚠️ Laundry (complex, medium impact)

**Timeline**: 3-4 weeks for full integration

**Recommendation**: Start with Queue service this week for quick win, then Moving service next week.

---

**Last Updated**: 2026-01-26  
**Next Review**: After each service integration  
**Maintained By**: Development Team
