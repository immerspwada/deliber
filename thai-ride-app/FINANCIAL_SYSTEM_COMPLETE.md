# 💰 Complete Financial System with Commission

**Date**: 2026-01-25  
**Status**: ✅ Production Ready  
**Priority**: 🔥 CRITICAL

---

## 📋 Overview

Comprehensive financial system that handles all money-related operations with automatic commission calculation, wallet management, and platform revenue tracking.

---

## 🎯 System Architecture

### Core Components

1. **Commission System** - Automatic calculation and deduction
2. **Wallet System** - Customer and provider balance management
3. **Transaction System** - Atomic financial operations
4. **Revenue Tracking** - Platform earnings monitoring
5. **Top-up System** - Customer wallet recharge
6. **Withdrawal System** - Provider earnings withdrawal

---

## 💳 Commission Rates (Current)

```typescript
const COMMISSION_RATES = {
  ride: 0.2, // 20%
  delivery: 0.25, // 25%
  shopping: 0.15, // 15%
  moving: 0.18, // 18%
  queue: 0.15, // 15%
  laundry: 0.2, // 20%
};
```

Stored in: `financial_settings` table

- Category: `commission`
- Key: `service_rates`
- Editable via Admin UI

---

## 🔄 Complete Transaction Flow

### 1. Customer Books Service

```sql
-- Customer wallet is deducted immediately
SELECT customer_deduct_wallet(
  p_amount := 100.00,
  p_reference_type := 'ride',
  p_reference_id := '<order_id>',
  p_description := 'Payment for ride'
);
```

**Result:**

- Customer wallet: -100 THB
- Order status: `pending`
- Money held by platform

### 2. Provider Completes Service

```sql
-- Complete order with automatic commission calculation
SELECT complete_order_with_commission(
  p_order_id := '<order_id>',
  p_service_type := 'ride',
  p_total_fare := 100.00,
  p_tip_amount := 20.00,
  p_surge_multiplier := 1.0
);
```

**Result:**

```json
{
  "success": true,
  "order_id": "...",
  "service_type": "ride",
  "financial_breakdown": {
    "total_fare": 100.0,
    "commission_rate": 0.2,
    "commission_amount": 20.0,
    "provider_earnings": 80.0,
    "tip_amount": 20.0,
    "total_provider_credit": 100.0,
    "surge_multiplier": 1.0
  },
  "transactions": {
    "platform_revenue_id": "...",
    "provider_earning_tx_id": "...",
    "customer_tip_tx_id": "...",
    "provider_tip_tx_id": "..."
  },
  "balances": {
    "customer_balance": 880.0,
    "provider_balance": 100.0
  }
}
```

**What Happens:**

1. ✅ Platform keeps 20 THB (20% commission)
2. ✅ Provider receives 80 THB (earnings)
3. ✅ Customer pays 20 THB tip (deducted from wallet)
4. ✅ Provider receives 20 THB tip (100% to provider)
5. ✅ All transactions recorded atomically
6. ✅ Platform revenue tracked
7. ✅ Order table updated with financial details

---

## 📊 Money Flow Diagram

```
BOOKING PHASE:
Customer Wallet: 1000 THB
    ↓ (Deduct 100 THB)
Customer Wallet: 900 THB
Platform Holding: 100 THB

COMPLETION PHASE:
Platform Holding: 100 THB
    ├─ Commission (20%): 20 THB → Platform Revenue
    └─ Provider Earnings (80%): 80 THB → Provider Wallet

TIP PHASE (Optional):
Customer Wallet: 900 THB
    ↓ (Deduct 20 THB)
Customer Wallet: 880 THB
    ↓ (100% to provider)
Provider Wallet: 100 THB (80 + 20)

FINAL STATE:
- Customer: 880 THB (paid 120 total)
- Provider: 100 THB (received 80 + 20)
- Platform: 20 THB (commission)
```

---

## 🗄️ Database Functions

### 1. `complete_order_with_commission()`

**Purpose:** Complete order with automatic commission calculation

**Parameters:**

- `p_order_id` - Order UUID
- `p_service_type` - Service type (ride, delivery, etc.)
- `p_total_fare` - Total fare amount
- `p_tip_amount` - Tip amount (optional, default 0)
- `p_surge_multiplier` - Surge multiplier (optional, default 1.0)

**Returns:** JSON with complete financial breakdown

**Features:**

- ✅ Atomic transaction (all or nothing)
- ✅ Automatic commission calculation from settings
- ✅ Provider earnings credit
- ✅ Tip handling (customer → provider)
- ✅ Platform revenue tracking
- ✅ Transaction logging
- ✅ Order table updates
- ✅ Balance verification

**Example:**

```typescript
const result = await supabase.rpc("complete_order_with_commission", {
  p_order_id: orderId,
  p_service_type: "ride",
  p_total_fare: 100.0,
  p_tip_amount: 20.0,
  p_surge_multiplier: 1.0,
});
```

### 2. `calculate_commission_preview()`

**Purpose:** Preview commission calculation without executing

**Parameters:**

- `p_service_type` - Service type
- `p_total_fare` - Total fare
- `p_tip_amount` - Tip amount (optional)
- `p_surge_multiplier` - Surge multiplier (optional)

**Returns:** JSON with breakdown

**Example:**

```typescript
const preview = await supabase.rpc('calculate_commission_preview', {
  p_service_type: 'ride',
  p_total_fare: 100.00,
  p_tip_amount: 20.00
});

// Result:
{
  "service_type": "ride",
  "total_fare": 100,
  "commission_rate": 0.2,
  "commission_percentage": 20,
  "commission_amount": 20,
  "provider_earnings": 80,
  "tip_amount": 20,
  "total_provider_credit": 100,
  "breakdown": {
    "customer_pays": 120,
    "platform_receives": 20,
    "provider_receives": 100
  }
}
```

### 3. `customer_deduct_wallet()`

**Purpose:** Deduct money from customer wallet (at booking)

**Parameters:**

- `p_amount` - Amount to deduct
- `p_reference_type` - Reference type (ride, delivery, etc.)
- `p_reference_id` - Order UUID
- `p_description` - Description (optional)

**Returns:** JSON with transaction details

**Features:**

- ✅ Balance verification
- ✅ Atomic operation
- ✅ Transaction logging
- ✅ Insufficient balance check

### 4. `provider_credit_earnings()`

**Purpose:** Credit earnings to provider wallet

**Parameters:**

- `p_provider_id` - Provider UUID
- `p_amount` - Amount to credit
- `p_reference_type` - Reference type
- `p_reference_id` - Order UUID
- `p_description` - Description (optional)

**Returns:** JSON with transaction details

---

## 📈 Platform Revenue Tracking

All commission is automatically tracked in `platform_revenue` table:

```sql
SELECT
  revenue_type,
  SUM(amount) as total_revenue,
  COUNT(*) as transaction_count
FROM platform_revenue
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY revenue_type;
```

**Revenue Types:**

- `commission` - Service commission
- `topup_fee` - Top-up fees
- `withdrawal_fee` - Withdrawal fees
- `subscription` - Subscription fees (future)
- `surge_premium` - Surge pricing premium (future)

---

## 💡 Usage Examples

### Example 1: Complete Ride with Tip

```typescript
// 1. Customer books ride (100 THB)
const booking = await supabase.rpc("customer_deduct_wallet", {
  p_amount: 100.0,
  p_reference_type: "ride",
  p_reference_id: rideId,
  p_description: "Payment for ride",
});

// 2. Provider completes ride
const completion = await supabase.rpc("complete_order_with_commission", {
  p_order_id: rideId,
  p_service_type: "ride",
  p_total_fare: 100.0,
  p_tip_amount: 20.0,
});

// Result:
// - Customer paid: 120 THB (100 + 20 tip)
// - Provider received: 100 THB (80 earnings + 20 tip)
// - Platform received: 20 THB (20% commission)
```

### Example 2: Delivery without Tip

```typescript
const completion = await supabase.rpc("complete_order_with_commission", {
  p_order_id: deliveryId,
  p_service_type: "delivery",
  p_total_fare: 150.0,
  p_tip_amount: 0,
});

// Result:
// - Customer paid: 150 THB
// - Provider received: 112.50 THB (75% of 150)
// - Platform received: 37.50 THB (25% commission)
```

### Example 3: Preview Commission

```typescript
// Before showing fare to customer
const preview = await supabase.rpc("calculate_commission_preview", {
  p_service_type: "shopping",
  p_total_fare: 200.0,
  p_tip_amount: 10.0,
});

// Show to customer:
// Total: 210 THB (200 + 10 tip)
// Provider will receive: 180 THB
// Platform commission: 30 THB (15%)
```

---

## 🔒 Security Features

### 1. Atomic Transactions

- All financial operations are atomic
- If any step fails, entire transaction rolls back
- No partial updates possible

### 2. Balance Verification

- Customer balance checked before deduction
- Provider balance updated with locks
- No negative balances allowed

### 3. Audit Trail

- All transactions logged in `wallet_transactions`
- All provider transactions in `provider_wallet_transactions`
- All platform revenue in `platform_revenue`
- Complete audit trail for compliance

### 4. RLS Policies

- Customers can only access their own wallet
- Providers can only access their own wallet
- Admins have full access
- All queries protected by RLS

---

## 📊 Admin Dashboard Integration

### Commission Settings Card

Located: `src/admin/components/CommissionSettingsCard.vue`

Features:

- ✅ Edit commission rates per service type
- ✅ Real-time preview of changes
- ✅ Change reason tracking
- ✅ Audit log
- ✅ Impact calculation

### Financial Reports

```typescript
// Get monthly revenue
SELECT
  DATE_TRUNC('month', created_at) as month,
  revenue_type,
  SUM(amount) as total,
  COUNT(*) as count
FROM platform_revenue
GROUP BY month, revenue_type
ORDER BY month DESC;

// Get provider earnings summary
SELECT
  p.id,
  u.full_name,
  p.wallet_balance,
  p.total_earnings,
  p.total_withdrawn,
  COUNT(DISTINCT pwt.id) as transaction_count
FROM providers_v2 p
JOIN users u ON u.id = p.user_id
LEFT JOIN provider_wallet_transactions pwt ON pwt.provider_id = p.id
GROUP BY p.id, u.full_name, p.wallet_balance, p.total_earnings, p.total_withdrawn;
```

---

## 🚀 Integration Guide

### Frontend Integration

```typescript
// composables/useOrderCompletion.ts
export function useOrderCompletion() {
  const completeOrder = async (
    orderId: string,
    serviceType: string,
    totalFare: number,
    tipAmount: number = 0,
  ) => {
    try {
      const { data, error } = await supabase.rpc(
        "complete_order_with_commission",
        {
          p_order_id: orderId,
          p_service_type: serviceType,
          p_total_fare: totalFare,
          p_tip_amount: tipAmount,
          p_surge_multiplier: 1.0,
        },
      );

      if (error) throw error;

      return {
        success: true,
        breakdown: data.financial_breakdown,
        transactions: data.transactions,
      };
    } catch (error) {
      console.error("Order completion failed:", error);
      throw error;
    }
  };

  return { completeOrder };
}
```

### Provider App Integration

```typescript
// When provider completes order
const handleCompleteOrder = async () => {
  try {
    // Show loading
    loading.value = true;

    // Complete order
    const result = await completeOrder(
      order.value.id,
      order.value.service_type,
      order.value.total_fare,
      order.value.tip_amount || 0,
    );

    // Show success with earnings
    toast.success(
      `งานเสร็จสิ้น! คุณได้รับ ${result.breakdown.total_provider_credit} บาท`,
    );

    // Refresh wallet balance
    await refreshWallet();

    // Navigate to earnings page
    router.push("/provider/earnings");
  } catch (error) {
    toast.error("ไม่สามารถทำรายการได้");
  } finally {
    loading.value = false;
  }
};
```

---

## 🧪 Testing

### Test Commission Calculation

```sql
-- Test ride (20% commission)
SELECT calculate_commission_preview('ride', 100.00, 20.00);
-- Expected: 20 THB commission, 80 THB earnings, 20 THB tip

-- Test delivery (25% commission)
SELECT calculate_commission_preview('delivery', 150.00, 0);
-- Expected: 37.50 THB commission, 112.50 THB earnings

-- Test shopping (15% commission)
SELECT calculate_commission_preview('shopping', 200.00, 10.00);
-- Expected: 30 THB commission, 170 THB earnings, 10 THB tip
```

### Test Complete Flow

```sql
-- 1. Create test order
INSERT INTO ride_requests (
  id, customer_id, provider_id, total_fare, status
) VALUES (
  gen_random_uuid(),
  '<customer_id>',
  '<provider_id>',
  100.00,
  'in_progress'
) RETURNING id;

-- 2. Complete order
SELECT complete_order_with_commission(
  '<order_id>',
  'ride',
  100.00,
  20.00,
  1.0
);

-- 3. Verify results
SELECT * FROM platform_revenue WHERE source_id = '<order_id>';
SELECT * FROM provider_wallet_transactions WHERE reference_id = '<order_id>';
SELECT * FROM wallet_transactions WHERE reference_id = '<order_id>';
```

---

## 📝 Next Steps

### Immediate (Done ✅)

- ✅ Commission calculation function
- ✅ Order completion function
- ✅ Preview function
- ✅ Database integration
- ✅ Testing

### Short-term (To Do)

- [ ] Update all service completion handlers to use new function
- [ ] Add commission preview to booking flow
- [ ] Create admin revenue dashboard
- [ ] Add commission rate change notifications
- [ ] Implement surge pricing multiplier

### Mid-term (Future)

- [ ] Dynamic commission rates per provider tier
- [ ] Subscription-based commission discounts
- [ ] Promotional commission rates
- [ ] Commission analytics dashboard
- [ ] Automated commission adjustments

---

## 🔧 Maintenance

### Update Commission Rates

```sql
-- Update commission rates
UPDATE financial_settings
SET
  value = jsonb_set(
    value,
    '{ride}',
    '0.18'::jsonb
  ),
  updated_at = NOW()
WHERE category = 'commission' AND key = 'service_rates';
```

### Monitor Platform Revenue

```sql
-- Daily revenue
SELECT
  DATE(created_at) as date,
  SUM(amount) as total_revenue,
  COUNT(*) as transactions
FROM platform_revenue
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

---

## 📞 Support

For issues or questions:

1. Check function logs in Supabase Dashboard
2. Review transaction tables for audit trail
3. Check `platform_revenue` for commission tracking
4. Verify `financial_settings` for current rates

---

**Status**: ✅ Production Ready  
**Last Updated**: 2026-01-25  
**Version**: 1.0.0
