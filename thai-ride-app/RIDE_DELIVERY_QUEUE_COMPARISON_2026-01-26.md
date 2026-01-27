# 🔍 Ride vs Delivery vs Queue Booking - System Comparison

**Date**: 2026-01-26  
**Status**: ✅ Analysis Complete  
**Priority**: 🔥 CRITICAL - Key Differences Identified

---

## 📊 Executive Summary

**KEY FINDING**: Ride system does NOT use atomic transaction function, while Delivery and Queue Booking DO. This is the main architectural difference.

---

## 🗄️ Database Schema Comparison

### Common Fields (All 3 Services)

| Field                   | Ride           | Delivery       | Queue              |
| ----------------------- | -------------- | -------------- | ------------------ |
| `id`                    | ✅ uuid        | ✅ uuid        | ✅ uuid            |
| `tracking_id`           | ✅ varchar     | ✅ varchar     | ✅ text            |
| `user_id`               | ✅ uuid        | ✅ uuid        | ✅ uuid (NOT NULL) |
| `provider_id`           | ✅ uuid        | ✅ uuid        | ✅ uuid            |
| `status`                | ✅ varchar     | ✅ varchar     | ✅ text            |
| `created_at`            | ✅ timestamptz | ✅ timestamptz | ✅ timestamptz     |
| `updated_at`            | ✅ timestamptz | ✅ timestamptz | ✅ timestamptz     |
| `cancelled_at`          | ✅ timestamptz | ✅ timestamptz | ✅ timestamptz     |
| `cancel_reason`         | ✅ text        | ✅ text        | ✅ text            |
| `cancelled_by`          | ✅ varchar     | ✅ uuid        | ✅ varchar         |
| `cancelled_by_role`     | ✅ text        | ✅ varchar     | ✅ text            |
| `payment_method`        | ✅ varchar     | ✅ varchar     | ✅ varchar         |
| `payment_status`        | ✅ text        | ✅ text        | ✅ text            |
| `promo_code_id`         | ✅ uuid        | ✅ uuid        | ✅ uuid            |
| `promo_code`            | ✅ text        | ✅ text        | ✅ text            |
| `promo_discount_amount` | ✅ numeric     | ✅ numeric     | ✅ numeric         |

### Service-Specific Fields

#### Ride Requests (ride_requests)

```sql
-- Location fields
pickup_lat, pickup_lng, pickup_address
destination_lat, destination_lng, destination_address

-- Ride-specific
ride_type (standard/premium/shared)
passenger_count
special_requests
estimated_distance, estimated_duration

-- Pricing
estimated_fare, final_fare, actual_fare
platform_fee, provider_earnings
tip_amount, tip_at, tip_message

-- Status timestamps
scheduled_time, accepted_at, arrived_at, matched_at
started_at, completed_at, rated_at

-- Photos
pickup_photo, dropoff_photo
pickup_photo_at, dropoff_photo_at

-- Reassignment
original_provider_id

-- Refunds
cancellation_fee, refund_amount, refund_status, refunded_at
```

#### Delivery Requests (delivery_requests)

```sql
-- Sender info
sender_name, sender_phone, sender_address
sender_lat, sender_lng

-- Recipient info
recipient_name, recipient_phone, recipient_address
recipient_lat, recipient_lng

-- Package info
package_type, package_size, package_weight
package_description, special_instructions

-- Pricing
estimated_fee, final_fee
distance_km

-- Status timestamps
scheduled_pickup, picked_up_at, delivered_at, rated_at

-- Photos & Signature
pickup_photo, delivery_photo, package_photo
signature_url

-- Refunds
cancellation_fee, refund_amount, refund_status, refunded_at
```

#### Queue Bookings (queue_bookings)

```sql
-- Category
category (hospital/bank/government/restaurant/salon/other)

-- Place info
place_name, place_address
service_name, location_name

-- Schedule
scheduled_date (date)
scheduled_time (time without time zone)

-- Pricing
service_fee (default 50.00)
final_fee

-- Status timestamps
completed_at

-- Refunds
cancellation_fee
```

---

## 🔧 Atomic Transaction Functions

### ✅ Delivery: `create_delivery_atomic`

**Status**: EXISTS  
**Purpose**: Atomic wallet deduction + delivery creation

```sql
CREATE OR REPLACE FUNCTION create_delivery_atomic(
  p_user_id UUID,
  p_sender_name VARCHAR,
  p_sender_phone VARCHAR,
  p_sender_address TEXT,
  p_sender_lat NUMERIC,
  p_sender_lng NUMERIC,
  p_recipient_name VARCHAR,
  p_recipient_phone VARCHAR,
  p_recipient_address TEXT,
  p_recipient_lat NUMERIC,
  p_recipient_lng NUMERIC,
  p_package_type VARCHAR,
  p_package_description TEXT,
  p_special_instructions TEXT,
  p_estimated_fee NUMERIC
) RETURNS JSON
```

**Features**:

- ✅ Wallet balance check with `FOR UPDATE` lock
- ✅ Atomic deduction from `user_wallets`
- ✅ Creates delivery record
- ✅ Records wallet transaction
- ✅ Returns JSON with success status
- ✅ Thai error messages

### ✅ Queue: `create_queue_atomic`

**Status**: EXISTS  
**Purpose**: Atomic wallet deduction + queue booking creation

```sql
CREATE OR REPLACE FUNCTION create_queue_atomic(
  p_user_id UUID,
  p_category TEXT,
  p_place_name TEXT,
  p_place_address TEXT,
  p_details TEXT,
  p_scheduled_date DATE,
  p_scheduled_time TIME,
  p_service_fee NUMERIC
) RETURNS JSON
```

**Features**:

- ✅ Wallet balance check with `FOR UPDATE` lock
- ✅ Atomic deduction from `user_wallets`
- ✅ Creates queue booking record
- ✅ Records wallet transaction with type 'payment'
- ✅ Returns JSON with success status
- ✅ Thai error messages for insufficient balance

### ❌ Ride: NO ATOMIC FUNCTION

**Status**: DOES NOT EXIST  
**Problem**: Ride booking uses separate operations

**Current Flow**:

1. Frontend checks wallet balance
2. Calls `rideStore.createRideRequest()`
3. Store inserts into `ride_requests` table directly
4. NO wallet deduction happens
5. NO atomic transaction protection

**Issues**:

- ❌ Race condition possible (balance check → booking → deduction)
- ❌ No transaction safety
- ❌ Wallet deduction happens separately (or not at all?)
- ❌ Inconsistent with Delivery and Queue systems

---

## 💻 Frontend Implementation Comparison

### Ride Request (useRideRequest.ts)

```typescript
async function bookRide(options?: BookingOptions): Promise<void> {
  // 1. Check balance in frontend
  if (paymentMethod === "wallet" && currentBalance.value < fareToCheck) {
    // Show error, redirect to wallet
    return;
  }

  // 2. Create ride request (NO atomic function)
  const ride = await rideStore.createRideRequest(
    authStore.user.id,
    pickup.value,
    destination.value,
    rideType,
    1,
    undefined,
    options?.scheduledTime,
    options?.notes,
  );

  // 3. NO wallet deduction here!
  // 4. Find driver in background
  rideStore.findAndMatchDriver();
}
```

**Problems**:

- ❌ Balance check is NOT atomic
- ❌ No wallet deduction on booking
- ❌ Race condition possible
- ❌ Payment happens later (when? how?)

### Delivery Request (useDelivery.ts - assumed)

```typescript
async function createDelivery(
  input: CreateDeliveryInput,
): Promise<Delivery | null> {
  // Call atomic function
  const { data: result, error: rpcError } = await supabase.rpc(
    "create_delivery_atomic",
    {
      p_user_id: userId,
      p_sender_name: input.sender_name,
      // ... all parameters
      p_estimated_fee: estimatedFee,
    },
  );

  if (rpcError) {
    // Handle insufficient balance error
    if (rpcError.message?.includes("INSUFFICIENT_BALANCE")) {
      error.value = "ยอดเงินไม่เพียงพอ";
    }
    return null;
  }

  // Success - wallet already deducted atomically
  return result.delivery;
}
```

**Benefits**:

- ✅ Atomic transaction
- ✅ Wallet deducted immediately
- ✅ No race conditions
- ✅ Consistent error handling

### Queue Booking (useQueueBooking.ts)

```typescript
async function createQueueBooking(
  input: CreateQueueBookingInput,
): Promise<QueueBooking | null> {
  // Call atomic function
  const { data: result, error: rpcError } = await supabase.rpc(
    "create_queue_atomic",
    {
      p_user_id: userId,
      p_category: input.category,
      p_place_name: input.place_name,
      p_place_address: input.place_address,
      p_details: input.details,
      p_scheduled_date: input.scheduled_date,
      p_scheduled_time: input.scheduled_time,
      p_service_fee: serviceFee,
    },
  );

  if (rpcError) {
    // Handle insufficient balance error
    if (
      rpcError.message?.includes("INSUFFICIENT_BALANCE") ||
      rpcError.message?.includes("ยอดเงินไม่เพียงพอ")
    ) {
      error.value = `ยอดเงินใน Wallet ไม่เพียงพอ`;
    }
    return null;
  }

  // Success - wallet already deducted atomically
  return result.booking;
}
```

**Benefits**:

- ✅ Atomic transaction
- ✅ Wallet deducted immediately
- ✅ No race conditions
- ✅ Consistent error handling

---

## 🔍 Key Differences Summary

| Aspect                  | Ride            | Delivery      | Queue         |
| ----------------------- | --------------- | ------------- | ------------- |
| **Atomic Function**     | ❌ NO           | ✅ YES        | ✅ YES        |
| **Wallet Deduction**    | ❓ Unclear      | ✅ Immediate  | ✅ Immediate  |
| **Transaction Safety**  | ❌ NO           | ✅ YES        | ✅ YES        |
| **Balance Check**       | Frontend only   | Database lock | Database lock |
| **Race Condition Risk** | ⚠️ HIGH         | ✅ Protected  | ✅ Protected  |
| **Error Handling**      | Manual          | Automatic     | Automatic     |
| **Consistency**         | ❌ Separate ops | ✅ Atomic     | ✅ Atomic     |

---

## 🚨 Critical Issues with Ride System

### Issue 1: No Atomic Transaction

**Problem**: Ride booking doesn't use atomic function like Delivery and Queue

**Impact**:

- Race condition: User can book multiple rides before wallet updates
- Inconsistent state: Ride created but wallet not deducted
- No transaction rollback if booking fails

**Solution**: Create `create_ride_atomic` function

### Issue 2: Unclear Wallet Deduction

**Problem**: Code doesn't show when/how wallet is deducted for rides

**Questions**:

- When does wallet deduction happen?
- Is it in `rideStore.createRideRequest()`?
- Is it handled by a trigger?
- Is it manual after ride completion?

**Solution**: Implement atomic wallet deduction on booking

### Issue 3: Frontend Balance Check Only

**Problem**: Balance check happens in frontend, not database

**Impact**:

- User can bypass check with browser dev tools
- Race condition if multiple tabs open
- No database-level protection

**Solution**: Move balance check to atomic function with `FOR UPDATE` lock

---

## ✅ Recommended Solution

### Create `create_ride_atomic` Function

```sql
CREATE OR REPLACE FUNCTION create_ride_atomic(
  p_user_id UUID,
  p_pickup_lat NUMERIC,
  p_pickup_lng NUMERIC,
  p_pickup_address TEXT,
  p_destination_lat NUMERIC,
  p_destination_lng NUMERIC,
  p_destination_address TEXT,
  p_ride_type VARCHAR,
  p_passenger_count INTEGER,
  p_special_requests TEXT,
  p_estimated_fare NUMERIC,
  p_scheduled_time TIMESTAMPTZ,
  p_notes TEXT
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_wallet_balance NUMERIC;
  v_ride_id UUID;
  v_tracking_id TEXT;
BEGIN
  -- 1. Check wallet balance with lock
  SELECT balance INTO v_wallet_balance
  FROM user_wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  -- 2. Validate sufficient balance
  IF v_wallet_balance IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'WALLET_NOT_FOUND',
      'message', 'ไม่พบกระเป๋าเงิน'
    );
  END IF;

  IF v_wallet_balance < p_estimated_fare THEN
    RETURN json_build_object(
      'success', false,
      'error', 'INSUFFICIENT_BALANCE',
      'message', 'ยอดเงินไม่เพียงพอ',
      'current_balance', v_wallet_balance,
      'required_amount', p_estimated_fare
    );
  END IF;

  -- 3. Deduct from wallet
  UPDATE user_wallets
  SET
    balance = balance - p_estimated_fare,
    total_spent = total_spent + p_estimated_fare,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  -- 4. Create ride request
  INSERT INTO ride_requests (
    user_id,
    pickup_lat,
    pickup_lng,
    pickup_address,
    destination_lat,
    destination_lng,
    destination_address,
    ride_type,
    passenger_count,
    special_requests,
    estimated_fare,
    scheduled_time,
    notes,
    status,
    payment_method,
    payment_status
  ) VALUES (
    p_user_id,
    p_pickup_lat,
    p_pickup_lng,
    p_pickup_address,
    p_destination_lat,
    p_destination_lng,
    p_destination_address,
    p_ride_type,
    p_passenger_count,
    p_special_requests,
    p_estimated_fare,
    p_scheduled_time,
    p_notes,
    'pending',
    'wallet',
    'paid'
  )
  RETURNING id, tracking_id INTO v_ride_id, v_tracking_id;

  -- 5. Record wallet transaction
  INSERT INTO wallet_transactions (
    user_id,
    type,
    amount,
    balance_before,
    balance_after,
    reference_type,
    reference_id,
    description
  ) VALUES (
    p_user_id,
    'payment',
    -p_estimated_fare,
    v_wallet_balance,
    v_wallet_balance - p_estimated_fare,
    'ride',
    v_ride_id,
    'ชำระค่าโดยสาร'
  );

  -- 6. Return success
  RETURN json_build_object(
    'success', true,
    'ride_id', v_ride_id,
    'tracking_id', v_tracking_id,
    'amount_deducted', p_estimated_fare,
    'new_balance', v_wallet_balance - p_estimated_fare
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'INTERNAL_ERROR',
      'message', 'เกิดข้อผิดพลาด: ' || SQLERRM
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_ride_atomic TO authenticated;
```

### Update Frontend (useRideRequest.ts)

```typescript
async function bookRide(options?: BookingOptions): Promise<void> {
  if (!pickup.value || !destination.value || !authStore.user) {
    return;
  }

  isBooking.value = true;
  currentStep.value = "searching";

  try {
    // Call atomic function
    const { data: result, error: rpcError } = await supabase.rpc(
      "create_ride_atomic",
      {
        p_user_id: authStore.user.id,
        p_pickup_lat: pickup.value.lat,
        p_pickup_lng: pickup.value.lng,
        p_pickup_address: pickup.value.address,
        p_destination_lat: destination.value.lat,
        p_destination_lng: destination.value.lng,
        p_destination_address: destination.value.address,
        p_ride_type: selectedVehicle.value,
        p_passenger_count: 1,
        p_special_requests: options?.notes || null,
        p_estimated_fare: finalFare.value,
        p_scheduled_time: options?.scheduledTime || null,
        p_notes: options?.notes || null,
      },
    );

    if (rpcError) {
      // Handle insufficient balance
      if (rpcError.message?.includes("INSUFFICIENT_BALANCE")) {
        showError("ยอดเงินไม่เพียงพอ กรุณาเติมเงิน");
        router.push("/customer/wallet");
      } else {
        showError(rpcError.message || "ไม่สามารถจองได้");
      }
      return;
    }

    if (!result || !result.success) {
      showError(result?.message || "ไม่สามารถจองได้");
      return;
    }

    // Success - wallet already deducted
    activeRide.value = { id: result.ride_id, tracking_id: result.tracking_id };
    setupRealtimeTracking(result.ride_id);

    // Find driver
    rideStore.findAndMatchDriver();
  } catch (error) {
    console.error("[RideRequest] Book ride error:", error);
    showError("เกิดข้อผิดพลาด");
  } finally {
    isBooking.value = false;
  }
}
```

---

## 📋 Implementation Checklist

- [ ] Create `create_ride_atomic` function in database
- [ ] Test function with various scenarios:
  - [ ] Sufficient balance
  - [ ] Insufficient balance
  - [ ] Wallet not found
  - [ ] Concurrent bookings
- [ ] Update `useRideRequest.ts` to use atomic function
- [ ] Remove frontend-only balance check
- [ ] Update `rideStore` to handle atomic response
- [ ] Test wallet deduction and transaction recording
- [ ] Verify no race conditions
- [ ] Update TypeScript types for RPC call
- [ ] Add error handling for all edge cases
- [ ] Test scheduled rides with atomic function
- [ ] Verify refund flow still works

---

## 🎯 Expected Benefits

After implementing `create_ride_atomic`:

1. ✅ **Consistency**: All 3 services use same atomic pattern
2. ✅ **Safety**: No race conditions or double bookings
3. ✅ **Reliability**: Transaction rollback on failure
4. ✅ **Security**: Database-level balance validation
5. ✅ **Audit Trail**: Proper wallet transaction recording
6. ✅ **Error Handling**: Consistent Thai error messages
7. ✅ **Performance**: Single database round-trip

---

## 📊 Comparison After Fix

| Aspect                  | Ride (Before) | Ride (After) | Delivery     | Queue        |
| ----------------------- | ------------- | ------------ | ------------ | ------------ |
| **Atomic Function**     | ❌ NO         | ✅ YES       | ✅ YES       | ✅ YES       |
| **Wallet Deduction**    | ❓ Unclear    | ✅ Immediate | ✅ Immediate | ✅ Immediate |
| **Transaction Safety**  | ❌ NO         | ✅ YES       | ✅ YES       | ✅ YES       |
| **Balance Check**       | Frontend      | Database     | Database     | Database     |
| **Race Condition Risk** | ⚠️ HIGH       | ✅ Protected | ✅ Protected | ✅ Protected |
| **Consistency**         | ❌ Different  | ✅ Same      | ✅ Same      | ✅ Same      |

---

**Created**: 2026-01-26  
**Status**: ✅ Analysis Complete  
**Next Step**: Implement `create_ride_atomic` function
