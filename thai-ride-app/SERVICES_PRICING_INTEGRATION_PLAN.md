# 🎯 Services Pricing Integration Plan

**Date**: 2026-01-26  
**Status**: 📋 Ready for Implementation  
**Priority**: 🔥 HIGH - Complete System Integration

---

## 📊 Current Status Summary

### ✅ Fully Integrated (3/6 services)

- **Ride**: Uses `usePricingCalculator` with database pricing
- **Delivery**: Uses `useDelivery.calculateFee()` with database pricing
- **Shopping**: Uses `useShopping.calculateServiceFee()` with database pricing

### ⚠️ Needs Integration (3/6 services)

- **Moving**: Uses hardcoded prices in `useMoving.calculatePrice()`
- **Queue**: Uses hardcoded 50฿ in `useQueueBooking`
- **Laundry**: Uses hardcoded prices in `useLaundry.calculatePrice()`

---

## 🗄️ Database Configuration (Already Complete)

All 6 services already have pricing configured in the database:

```sql
-- From pricing_settings table
{
  "ride": {
    "base_fare": 36,
    "per_km": 1,
    "min_fare": 5,
    "max_fare": 1000
  },
  "delivery": {
    "base_fare": 30,
    "per_km": 10,
    "min_fare": 30,
    "max_fare": 500
  },
  "shopping": {
    "base_fare": 40,
    "per_km": 12,
    "min_fare": 40,
    "max_fare": 800
  },
  "moving": {
    "base_fare": 200,
    "per_km": 25,
    "min_fare": 200,
    "max_fare": 5000
  },
  "queue": {
    "base_fare": 50,
    "per_km": 0,
    "min_fare": 50,
    "max_fare": 500
  },
  "laundry": {
    "base_fare": 60,
    "per_km": 5,
    "min_fare": 60,
    "max_fare": 300
  }
}
```

**Database Function**: `calculate_distance_fare(service_type, distance_km)` supports all 6 services.

---

## 🎯 Integration Priority & Complexity

| Service | Priority | Complexity | Time Est. | Reason                                     |
| ------- | -------- | ---------- | --------- | ------------------------------------------ |
| Queue   | 🔥 HIGH  | 🟢 Easy    | 1-2 hrs   | Simplest - flat rate, no distance needed   |
| Moving  | 🔥 HIGH  | 🟡 Medium  | 2-3 hrs   | Needs distance calculation + service tiers |
| Laundry | 🟡 MED   | 🔴 Complex | 4-6 hrs   | Needs new table for service rates          |

---

## 📋 Implementation Plans

### 1️⃣ Queue Service Integration

**Current Implementation**:

```typescript
// useQueueBooking.ts - Line 158
const serviceFee = 50; // Base fee for queue booking (HARDCODED)
```

**Target Implementation**:

```typescript
// Use database pricing
const { data: pricing } = await supabase
  .from("pricing_settings")
  .select("settings")
  .eq("service_type", "queue")
  .single();

const serviceFee = pricing?.settings?.base_fare || 50;
```

**Steps**:

1. ✅ Database already configured (base_fare: 50)
2. 🔧 Update `useQueueBooking.createQueueBooking()` to fetch pricing from database
3. 🔧 Remove hardcoded `serviceFee = 50`
4. ✅ Admin UI already supports Queue pricing configuration
5. ✅ Test: Change Queue base_fare in Admin UI → Verify customer sees new price

**Files to Modify**:

- `src/composables/useQueueBooking.ts` (1 function)

**Testing**:

```typescript
// Test Case 1: Default pricing
await createQueueBooking({ category: 'hospital', ... })
// Expected: serviceFee = 50 (from database)

// Test Case 2: Admin changes pricing to 60
// Admin UI: Update Queue base_fare to 60
await createQueueBooking({ category: 'bank', ... })
// Expected: serviceFee = 60 (from database)
```

---

### 2️⃣ Moving Service Integration

**Current Implementation**:

```typescript
// useMoving.ts - Lines 42-50
function calculatePrice(
  serviceType: "small" | "medium" | "large",
  helperCount: number = 1,
): number {
  const basePrices: Record<string, number> = {
    small: 150, // HARDCODED
    medium: 350, // HARDCODED
    large: 1500, // HARDCODED
  };
  const basePrice = basePrices[serviceType];
  const helperFee = Math.max(0, helperCount - 1) * 100; // HARDCODED
  return basePrice + helperFee;
}
```

**Target Implementation**:

```typescript
// Use database pricing with distance calculation
async function calculatePrice(
  serviceType: "small" | "medium" | "large",
  helperCount: number = 1,
  distance?: number,
): Promise<number> {
  // 1. Get base pricing from database
  const { data: pricing } = await supabase
    .from("pricing_settings")
    .select("settings")
    .eq("service_type", "moving")
    .single();

  // 2. Calculate distance-based fare
  let baseFare = pricing?.settings?.base_fare || 200;

  // 3. Apply service tier multiplier
  const tierMultipliers = {
    small: 0.75, // 75% of base (150 = 200 * 0.75)
    medium: 1.75, // 175% of base (350 = 200 * 1.75)
    large: 7.5, // 750% of base (1500 = 200 * 7.5)
  };
  baseFare *= tierMultipliers[serviceType];

  // 4. Add distance cost if provided
  if (distance && distance > 0) {
    const perKm = pricing?.settings?.per_km || 25;
    baseFare += distance * perKm;
  }

  // 5. Add helper fee (configurable)
  const helperFee = Math.max(0, helperCount - 1) * 100;

  return baseFare + helperFee;
}
```

**Database Schema Addition**:

```sql
-- Add service tier multipliers to pricing_settings
ALTER TABLE pricing_settings
ADD COLUMN tier_multipliers JSONB DEFAULT '{
  "small": 0.75,
  "medium": 1.75,
  "large": 7.5
}'::jsonb;

-- Add helper fee configuration
ALTER TABLE pricing_settings
ADD COLUMN helper_fee_per_person DECIMAL(10,2) DEFAULT 100;
```

**Steps**:

1. 🔧 Add database columns for tier multipliers and helper fees
2. 🔧 Update `useMoving.calculatePrice()` to be async and fetch from database
3. 🔧 Add distance calculation (pickup → destination)
4. 🔧 Update all calls to `calculatePrice()` to await
5. 🔧 Update Admin UI to configure tier multipliers
6. ✅ Test with different service types and distances

**Files to Modify**:

- `src/composables/useMoving.ts` (calculatePrice function + all callers)
- `src/views/MovingView.vue` (update price calculation)
- `src/admin/components/PricingSettingsCard.vue` (add tier multiplier fields)
- Database migration for new columns

**Testing**:

```typescript
// Test Case 1: Small moving, no distance
await calculatePrice("small", 1);
// Expected: 150 (base 200 * 0.75)

// Test Case 2: Large moving with distance
await calculatePrice("large", 2, 10); // 10km
// Expected: 1500 (base) + 250 (10km * 25) + 100 (1 helper) = 1850

// Test Case 3: Admin changes base_fare to 250
// Expected: Prices adjust proportionally
```

---

### 3️⃣ Laundry Service Integration

**Current Implementation**:

```typescript
// useLaundry.ts - Lines 42-56
function calculatePrice(services: LaundryService[], weight: number): number {
  let total = 0;

  if (services.includes("dry-clean")) {
    total = weight * 5 * 150; // HARDCODED: 5 pieces/kg * 150฿/piece
  } else if (services.includes("wash-iron")) {
    total = weight * 60; // HARDCODED: 60฿/kg
  } else {
    total = weight * 40; // HARDCODED: 40฿/kg (wash-fold)
  }

  if (services.includes("express")) {
    total += 100; // HARDCODED: Express fee
  }

  return total;
}
```

**Target Implementation**:

**New Database Table**:

```sql
-- Create laundry service rates table
CREATE TABLE laundry_service_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type TEXT NOT NULL CHECK (service_type IN ('wash-fold', 'wash-iron', 'dry-clean', 'express')),
  rate_type TEXT NOT NULL CHECK (rate_type IN ('per_kg', 'per_piece', 'flat_fee')),
  rate DECIMAL(10,2) NOT NULL CHECK (rate >= 0),
  pieces_per_kg DECIMAL(5,2), -- For dry-clean (e.g., 5 pieces per kg)
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(service_type)
);

-- Seed initial data
INSERT INTO laundry_service_rates (service_type, rate_type, rate, pieces_per_kg) VALUES
  ('wash-fold', 'per_kg', 40.00, NULL),
  ('wash-iron', 'per_kg', 60.00, NULL),
  ('dry-clean', 'per_piece', 150.00, 5.00),
  ('express', 'flat_fee', 100.00, NULL);

-- RLS Policies
ALTER TABLE laundry_service_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "laundry_rates_public_read" ON laundry_service_rates
  FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "laundry_rates_admin_all" ON laundry_service_rates
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

**New Composable**:

```typescript
// composables/useLaundryPricing.ts
export function useLaundryPricing() {
  const rates = ref<LaundryServiceRate[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchRates(): Promise<void> {
    loading.value = true;
    error.value = null;

    try {
      const { data, error: fetchError } = await supabase
        .from("laundry_service_rates")
        .select("*")
        .eq("is_active", true);

      if (fetchError) throw fetchError;
      rates.value = data || [];
    } catch (err: any) {
      error.value = err.message;
    } finally {
      loading.value = false;
    }
  }

  async function calculatePrice(
    services: LaundryService[],
    weight: number,
  ): Promise<number> {
    if (rates.value.length === 0) {
      await fetchRates();
    }

    let total = 0;

    // Calculate main service cost
    if (services.includes("dry-clean")) {
      const rate = rates.value.find((r) => r.service_type === "dry-clean");
      if (rate) {
        const pieces = weight * (rate.pieces_per_kg || 5);
        total = pieces * rate.rate;
      }
    } else if (services.includes("wash-iron")) {
      const rate = rates.value.find((r) => r.service_type === "wash-iron");
      if (rate) {
        total = weight * rate.rate;
      }
    } else {
      // Default to wash-fold
      const rate = rates.value.find((r) => r.service_type === "wash-fold");
      if (rate) {
        total = weight * rate.rate;
      }
    }

    // Add express fee if selected
    if (services.includes("express")) {
      const expressRate = rates.value.find((r) => r.service_type === "express");
      if (expressRate) {
        total += expressRate.rate;
      }
    }

    return total;
  }

  return {
    rates,
    loading,
    error,
    fetchRates,
    calculatePrice,
  };
}
```

**Update useLaundry.ts**:

```typescript
// useLaundry.ts
import { useLaundryPricing } from "./useLaundryPricing";

export function useLaundry() {
  const laundryPricing = useLaundryPricing();

  // Remove old calculatePrice function
  // Use laundryPricing.calculatePrice instead

  async function createLaundryRequest(
    input: CreateLaundryInput,
  ): Promise<LaundryRequest | null> {
    // ...
    const estimatedPrice = await laundryPricing.calculatePrice(
      input.services,
      estimatedWeight,
    );
    // ...
  }
}
```

**Admin UI Component**:

```vue
<!-- src/admin/components/LaundryRatesCard.vue -->
<script setup lang="ts">
import { ref, onMounted } from "vue";
import { supabase } from "@/lib/supabase";

interface LaundryRate {
  id: string;
  service_type: string;
  rate_type: string;
  rate: number;
  pieces_per_kg: number | null;
}

const rates = ref<LaundryRate[]>([]);
const loading = ref(false);

async function fetchRates() {
  loading.value = true;
  const { data } = await supabase
    .from("laundry_service_rates")
    .select("*")
    .order("service_type");
  rates.value = data || [];
  loading.value = false;
}

async function updateRate(rate: LaundryRate) {
  await supabase
    .from("laundry_service_rates")
    .update({
      rate: rate.rate,
      pieces_per_kg: rate.pieces_per_kg,
      updated_at: new Date().toISOString(),
    })
    .eq("id", rate.id);
}

onMounted(fetchRates);
</script>

<template>
  <div class="card">
    <h3>อัตราค่าบริการซักผ้า</h3>
    <div v-if="loading">Loading...</div>
    <div v-else class="rates-list">
      <div v-for="rate in rates" :key="rate.id" class="rate-item">
        <label>{{ rate.service_type }}</label>
        <input
          v-model.number="rate.rate"
          type="number"
          step="0.01"
          @blur="updateRate(rate)"
        />
        <span v-if="rate.rate_type === 'per_kg'">฿/กก.</span>
        <span v-else-if="rate.rate_type === 'per_piece'">฿/ชิ้น</span>
        <span v-else>฿</span>
      </div>
    </div>
  </div>
</template>
```

**Steps**:

1. 🔧 Create `laundry_service_rates` table with RLS policies
2. 🔧 Seed initial rate data
3. 🔧 Create `useLaundryPricing` composable
4. 🔧 Update `useLaundry` to use new pricing composable
5. 🔧 Create Admin UI component for rate management
6. 🔧 Add to Admin Financial Settings page
7. 🔧 Update `LaundryView.vue` to use async pricing
8. ✅ Test all service combinations

**Files to Create**:

- `src/composables/useLaundryPricing.ts` (new)
- `src/admin/components/LaundryRatesCard.vue` (new)
- Database migration for new table

**Files to Modify**:

- `src/composables/useLaundry.ts` (replace calculatePrice)
- `src/views/LaundryView.vue` (update price calculation to async)
- `src/admin/views/AdminFinancialSettingsView.vue` (add LaundryRatesCard)

**Testing**:

```typescript
// Test Case 1: Wash-fold 5kg
await calculatePrice(["wash-fold"], 5);
// Expected: 200 (5kg * 40฿/kg)

// Test Case 2: Wash-iron 3kg + Express
await calculatePrice(["wash-iron", "express"], 3);
// Expected: 280 (3kg * 60฿/kg + 100฿ express)

// Test Case 3: Dry-clean 2kg (10 pieces)
await calculatePrice(["dry-clean"], 2);
// Expected: 1500 (2kg * 5 pieces/kg * 150฿/piece)

// Test Case 4: Admin changes wash-fold to 45฿/kg
// Expected: New bookings use 45฿/kg
```

---

## 🔄 Migration Strategy

### Phase 1: Queue Service (Week 1)

- **Day 1-2**: Implement database integration
- **Day 3**: Testing & QA
- **Day 4**: Deploy to production
- **Day 5**: Monitor & verify

### Phase 2: Moving Service (Week 2)

- **Day 1-2**: Add database columns & update composable
- **Day 3**: Update Admin UI
- **Day 4-5**: Testing & QA
- **Day 6**: Deploy to production
- **Day 7**: Monitor & verify

### Phase 3: Laundry Service (Week 3-4)

- **Week 3 Day 1-2**: Create new table & composable
- **Week 3 Day 3-4**: Update useLaundry & views
- **Week 3 Day 5**: Create Admin UI
- **Week 4 Day 1-2**: Integration testing
- **Week 4 Day 3**: Deploy to production
- **Week 4 Day 4-5**: Monitor & verify

---

## ✅ Success Criteria

### For Each Service:

1. ✅ Pricing fetched from database (not hardcoded)
2. ✅ Admin can change pricing via UI
3. ✅ Customer sees updated pricing immediately
4. ✅ All existing functionality works
5. ✅ No breaking changes to API
6. ✅ Backward compatible with existing orders

### System-Wide:

1. ✅ All 6 services use database pricing
2. ✅ Single Admin UI for all pricing configuration
3. ✅ Consistent pricing calculation pattern
4. ✅ Audit logging for price changes
5. ✅ Performance: < 100ms for price calculation

---

## 🧪 Testing Checklist

### Unit Tests

- [ ] Queue: Fetch pricing from database
- [ ] Moving: Calculate with distance & tiers
- [ ] Laundry: Calculate with service combinations

### Integration Tests

- [ ] Admin changes price → Customer sees new price
- [ ] Price calculation matches database values
- [ ] Fallback to defaults if database unavailable

### E2E Tests

- [ ] Complete booking flow with new pricing
- [ ] Admin UI updates pricing successfully
- [ ] Real-time price updates work

---

## 📊 Monitoring & Rollback

### Metrics to Monitor:

- Price calculation errors
- Database query performance
- Booking success rate
- Customer complaints about pricing

### Rollback Plan:

1. Keep hardcoded values as fallback
2. Feature flag for database pricing
3. Can revert to hardcoded in < 5 minutes

```typescript
// Feature flag example
const USE_DATABASE_PRICING = import.meta.env.VITE_USE_DATABASE_PRICING === 'true'

async function calculatePrice(...) {
  if (USE_DATABASE_PRICING) {
    return await calculateFromDatabase(...)
  } else {
    return calculateHardcoded(...)
  }
}
```

---

## 💡 Future Enhancements

### After Full Integration:

1. **Dynamic Pricing**: Surge pricing based on demand
2. **Promotional Pricing**: Discount codes & campaigns
3. **Bulk Discounts**: Volume-based pricing
4. **Time-based Pricing**: Peak/off-peak rates
5. **Location-based Pricing**: Different rates per city
6. **Provider Commission**: Configurable commission rates

---

## 📝 Documentation Updates

### Files to Update:

- [ ] `PRICING_SYSTEM_INTEGRATION_COMPLETE.md` - Add Moving, Queue, Laundry
- [ ] `docs/composables.md` - Document new pricing composables
- [ ] `README.md` - Update feature list
- [ ] API documentation - Document pricing endpoints

---

## 🎯 Next Steps

### Immediate Actions:

1. ✅ Review this plan with team
2. ✅ Get approval for database schema changes
3. ✅ Create feature branch: `feature/pricing-integration-phase2`
4. 🔧 Start with Queue service (easiest)
5. 🔧 Move to Moving service
6. 🔧 Complete with Laundry service

### Questions to Resolve:

- Should we add audit logging for price changes?
- Do we need price history tracking?
- Should we cache pricing data?
- Do we need price validation rules?

---

**Created**: 2026-01-26  
**Last Updated**: 2026-01-26  
**Status**: 📋 Ready for Implementation  
**Estimated Total Time**: 3-4 weeks
