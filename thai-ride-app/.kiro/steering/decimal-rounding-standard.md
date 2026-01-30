# 🔢 Decimal Rounding Standard

**Date**: 2026-01-29  
**Status**: ✅ Active  
**Priority**: 🔥 MANDATORY - System-wide Standard

---

## 🎯 Core Principle

**ALL monetary amounts MUST be rounded to integers using standard mathematical rounding:**

- **< 0.5** rounds **DOWN**
- **≥ 0.5** rounds **UP**
- **NO decimals** in display or storage

---

## 🚨 CRITICAL RULES

### Rule 1: Use Math.round() for All Calculations

```typescript
// ✅ CORRECT
const totalFare = Math.round(baseFare + distanceFare);
const commission = Math.round(totalFare * 0.2);

// ❌ WRONG - Never use these
const totalFare = Math.floor(baseFare + distanceFare); // Always rounds down
const totalFare = Math.ceil(baseFare + distanceFare); // Always rounds up
const totalFare = (baseFare + distanceFare).toFixed(2); // Returns string
```

### Rule 2: Use Utility Functions

```typescript
// ✅ CORRECT - Use standardized functions
import {
  roundToInt,
  calculateCommission,
  calculateDiscount,
  formatCurrency,
} from "@/utils/mathRounding";

const fare = roundToInt(baseFare + distanceFare);
const commission = calculateCommission(fare, 0.2);
const discount = calculateDiscount(fare, "percentage", 20);

// ❌ WRONG - Don't implement rounding logic inline
const commission = Math.round(fare * 0.2); // Use calculateCommission() instead
```

### Rule 3: Display as Integers Only

```vue
<template>
  <!-- ✅ CORRECT -->
  <span>฿{{ totalFare }}</span>
  <!-- Shows: ฿160 -->
  <span>{{ formatCurrency(totalFare) }}</span>
  <!-- Shows: ฿160 -->

  <!-- ❌ WRONG -->
  <span>฿{{ totalFare.toFixed(2) }}</span>
  <!-- Shows: ฿160.00 -->
  <span
    >฿{{
      totalFare.toLocaleString("th-TH", { minimumFractionDigits: 2 })
    }}</span
  >
</template>
```

---

## 📐 Rounding Examples

### Basic Rounding

```typescript
Math.round(10.4); // 10 ✅
Math.round(10.5); // 11 ✅
Math.round(10.6); // 11 ✅
Math.round(159.4); // 159 ✅
Math.round(159.5); // 160 ✅
Math.round(159.9); // 160 ✅
```

### Financial Calculations

```typescript
// Commission (20% of 199)
Math.round(199 * 0.2); // Math.round(39.8) = 40 ✅

// Commission (20% of 201)
Math.round(201 * 0.2); // Math.round(40.2) = 40 ✅

// Discount (20% of 500)
Math.round(500 * 0.2); // Math.round(100.0) = 100 ✅

// Fare calculation
const baseFare = 35;
const distanceFare = 45.7; // 7 km × 6.5 THB/km
const timeFare = 10.3; // 5 min × 2 THB/min
const totalFare = Math.round(baseFare + distanceFare + timeFare);
// Math.round(35 + 45.7 + 10.3) = Math.round(91.0) = 91 ✅
```

---

## 🛠️ Implementation Patterns

### Pattern 1: Fare Calculation

```typescript
export function calculateFare(
  baseFare: number,
  distanceFare: number,
  timeFare: number = 0,
  multiplier: number = 1.0,
): number {
  const subtotal = baseFare + distanceFare + timeFare;
  return Math.round(subtotal * multiplier);
}

// Usage
const fare = calculateFare(35, 45.7, 10.3, 1.5);
// (35 + 45.7 + 10.3) × 1.5 = 91.0 × 1.5 = 136.5 → 137 ✅
```

### Pattern 2: Commission Calculation

```typescript
export function calculateCommission(
  totalFare: number,
  commissionRate: number,
): number {
  return Math.round(totalFare * commissionRate);
}

// Usage
const commission = calculateCommission(200, 0.2);
// 200 × 0.2 = 40.0 → 40 ✅

const commission2 = calculateCommission(199, 0.2);
// 199 × 0.2 = 39.8 → 40 ✅
```

### Pattern 3: Discount Calculation

```typescript
export function calculateDiscount(
  totalFare: number,
  discountType: "fixed" | "percentage",
  discountValue: number,
  maxDiscount?: number,
): number {
  let discount = 0;

  if (discountType === "fixed") {
    discount = discountValue;
  } else if (discountType === "percentage") {
    discount = Math.round(totalFare * (discountValue / 100));

    if (maxDiscount !== undefined) {
      discount = Math.min(discount, maxDiscount);
    }
  }

  return Math.min(discount, totalFare);
}

// Usage
const discount1 = calculateDiscount(200, "fixed", 50);
// 50 ✅

const discount2 = calculateDiscount(200, "percentage", 20);
// Math.round(200 × 0.2) = 40 ✅

const discount3 = calculateDiscount(500, "percentage", 20, 80);
// Math.round(500 × 0.2) = 100, capped at 80 → 80 ✅
```

### Pattern 4: Currency Formatting

```typescript
export function formatCurrency(
  amount: number,
  showCurrency: boolean = true,
): string {
  const rounded = Math.round(amount);
  const formatted = rounded.toLocaleString("th-TH");
  return showCurrency ? `฿${formatted}` : formatted;
}

// Usage
formatCurrency(160); // '฿160' ✅
formatCurrency(1234); // '฿1,234' ✅
formatCurrency(160.5); // '฿161' ✅ (rounded)
formatCurrency(160, false); // '160' ✅
```

---

## 🚫 Anti-Patterns (NEVER DO)

### ❌ Anti-Pattern 1: Using toFixed()

```typescript
// ❌ WRONG - Returns string with decimals
const fare = (baseFare + distanceFare).toFixed(2); // "160.00"
const commission = (fare * 0.2).toFixed(2); // "32.00"

// ✅ CORRECT - Returns integer
const fare = Math.round(baseFare + distanceFare); // 160
const commission = Math.round(fare * 0.2); // 32
```

### ❌ Anti-Pattern 2: Using Math.floor() or Math.ceil()

```typescript
// ❌ WRONG - Always rounds down (unfair)
const commission = Math.floor(totalFare * 0.2);
// 199 × 0.2 = 39.8 → 39 (should be 40)

// ❌ WRONG - Always rounds up (unfair)
const commission = Math.ceil(totalFare * 0.2);
// 199 × 0.2 = 39.8 → 40 (correct by accident)
// 201 × 0.2 = 40.2 → 41 (should be 40)

// ✅ CORRECT - Mathematical rounding
const commission = Math.round(totalFare * 0.2);
// 199 × 0.2 = 39.8 → 40 ✅
// 201 × 0.2 = 40.2 → 40 ✅
```

### ❌ Anti-Pattern 3: Showing Decimals in UI

```vue
<template>
  <!-- ❌ WRONG -->
  <span>฿{{ totalFare.toFixed(2) }}</span>
  <!-- ฿160.00 -->
  <span
    >฿{{
      totalFare.toLocaleString("th-TH", {
        minimumFractionDigits: 2,
      })
    }}</span
  >
  <!-- ฿160.00 -->

  <!-- ✅ CORRECT -->
  <span>฿{{ totalFare }}</span>
  <!-- ฿160 -->
  <span>{{ formatCurrency(totalFare) }}</span>
  <!-- ฿160 -->
</template>
```

### ❌ Anti-Pattern 4: Inconsistent Rounding

```typescript
// ❌ WRONG - Different rounding methods
const fare = Math.round(baseFare + distanceFare);
const commission = Math.floor(fare * 0.2); // Inconsistent!
const discount = Math.ceil(fare * 0.1); // Inconsistent!

// ✅ CORRECT - Consistent rounding
const fare = Math.round(baseFare + distanceFare);
const commission = Math.round(fare * 0.2);
const discount = Math.round(fare * 0.1);
```

---

## 📋 Checklist for New Code

Before committing any code with monetary calculations:

- [ ] All amounts rounded using `Math.round()`
- [ ] Used utility functions from `@/utils/mathRounding`
- [ ] No `toFixed()` in calculations
- [ ] No `Math.floor()` or `Math.ceil()` for money
- [ ] UI displays integers only (no decimals)
- [ ] Currency formatted using `formatCurrency()`
- [ ] Tests verify rounding behavior
- [ ] Edge cases handled (0.4, 0.5, 0.6)

---

## 🧪 Testing Requirements

### Unit Tests

Every function that calculates money MUST have tests for:

```typescript
describe("calculateCommission", () => {
  it("rounds 0.4 down", () => {
    expect(calculateCommission(202, 0.2)).toBe(40); // 40.4 → 40
  });

  it("rounds 0.5 up", () => {
    expect(calculateCommission(202.5, 0.2)).toBe(41); // 40.5 → 41
  });

  it("rounds 0.6 up", () => {
    expect(calculateCommission(203, 0.2)).toBe(41); // 40.6 → 41
  });
});
```

### Integration Tests

```typescript
describe("Complete Fare Calculation", () => {
  it("rounds all amounts correctly", () => {
    const result = calculateFareWithPromo({
      baseFare: 35,
      distanceFare: 45.7,
      timeFare: 10.3,
      surgeMultiplier: 1.0,
      commissionRate: 0.2,
    });

    expect(result.totalFare).toBe(91); // Integer ✅
    expect(result.platformCommission).toBe(18); // Integer ✅
    expect(result.providerEarnings).toBe(73); // Integer ✅
    expect(Number.isInteger(result.totalFare)).toBe(true);
    expect(Number.isInteger(result.platformCommission)).toBe(true);
  });
});
```

---

## 📚 Reference Files

### Core Implementation

- `src/utils/mathRounding.ts` - All rounding utilities
- `src/utils/fareCalculation.ts` - Fare calculation with rounding
- `src/composables/usePricingCalculator.ts` - Pricing with rounding

### Documentation

- `DECIMAL_ROUNDING_SYSTEM_COMPLETE_2026-01-29.md` - Complete implementation guide
- `.kiro/steering/promo-financial-rules.md` - Financial calculation rules

---

## 🎯 Quick Reference

### Import Statement

```typescript
import {
  roundToInt,
  roundCurrency,
  calculateCommission,
  calculateDiscount,
  formatCurrency,
} from "@/utils/mathRounding";
```

### Common Operations

```typescript
// Round any number
const rounded = roundToInt(159.5); // 160

// Calculate commission
const commission = calculateCommission(200, 0.2); // 40

// Calculate discount
const discount = calculateDiscount(200, "percentage", 20); // 40

// Format for display
const display = formatCurrency(160); // '฿160'
```

---

## ✅ Compliance

This standard is **MANDATORY** for:

- ✅ All fare calculations
- ✅ All commission calculations
- ✅ All discount calculations
- ✅ All wallet operations
- ✅ All financial reports
- ✅ All UI displays
- ✅ All API responses
- ✅ All database storage

**NO EXCEPTIONS**

---

**Last Updated**: 2026-01-29  
**Maintained By**: Development Team  
**Enforcement**: Automated via linting and tests

---

_"มาตรฐานเดียว ทั้งระบบ - One Standard, Entire System"_
