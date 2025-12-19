# Design Document

## Overview

ระบบ Multi-Role Ride Booking ออกแบบมาเพื่อรองรับการทำงานพร้อมกันของ 3 บทบาท (Customer, Provider, Admin) โดยใช้ Supabase เป็น Backend พร้อม Realtime subscriptions และ PostgreSQL functions สำหรับ atomic transactions

### Key Design Principles

1. **ACID Compliance** - ทุก financial transaction ต้องเป็น atomic
2. **Race Condition Prevention** - ใช้ database locks ป้องกันการรับงานซ้ำ
3. **Real-time First** - ใช้ WebSocket/Realtime แทน polling
4. **Zero Money Loss** - ไม่มีสถานการณ์ที่ลูกค้าเสียเงินโดยไม่ได้บริการ
5. **Complete Audit Trail** - บันทึกทุกการเปลี่ยนแปลงสถานะ

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         SYSTEM ARCHITECTURE                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐              │
│  │   Customer   │    │   Provider   │    │    Admin     │              │
│  │     App      │    │     App      │    │  Dashboard   │              │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘              │
│         │                   │                   │                       │
│         └───────────────────┼───────────────────┘                       │
│                             │                                           │
│                    ┌────────▼────────┐                                  │
│                    │   Vue.js App    │                                  │
│                    │  (Composables)  │                                  │
│                    └────────┬────────┘                                  │
│                             │                                           │
│         ┌───────────────────┼───────────────────┐                       │
│         │                   │                   │                       │
│  ┌──────▼──────┐    ┌──────▼──────┐    ┌──────▼──────┐                 │
│  │  Supabase   │    │  Supabase   │    │  Supabase   │                 │
│  │   Client    │    │  Realtime   │    │    RPC      │                 │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘                 │
│         │                   │                   │                       │
│         └───────────────────┼───────────────────┘                       │
│                             │                                           │
│                    ┌────────▼────────┐                                  │
│                    │   PostgreSQL    │                                  │
│                    │   + Functions   │                                  │
│                    │   + RLS         │                                  │
│                    └─────────────────┘                                  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Customer Components

#### useRideBookingV3.ts (Composable)

```typescript
interface RideBookingComposable {
  // State
  currentRide: Ref<RideRequest | null>
  isLoading: Ref<boolean>
  error: Ref<string | null>
  
  // Actions
  createRide(params: CreateRideParams): Promise<RideResult>
  cancelRide(rideId: string, reason: string): Promise<void>
  subscribeToRideUpdates(rideId: string): void
  
  // Computed
  rideStatus: ComputedRef<RideStatus>
  providerInfo: ComputedRef<ProviderInfo | null>
  estimatedArrival: ComputedRef<Date | null>
}

interface CreateRideParams {
  pickup: Location
  destination: Location
  vehicleType: 'car' | 'motorcycle' | 'van'
  estimatedFare: number
  promoCode?: string
}

interface RideResult {
  rideId: string
  trackingId: string
  status: 'pending'
  estimatedFare: number
  walletHeld: number
}
```

### 2. Provider Components

#### useProviderDashboardV3.ts (Composable)

```typescript
interface ProviderDashboardComposable {
  // State
  availableRides: Ref<RideRequest[]>
  currentRide: Ref<RideRequest | null>
  isOnline: Ref<boolean>
  
  // Actions
  acceptRide(rideId: string): Promise<AcceptResult>
  updateRideStatus(rideId: string, status: RideStatus): Promise<void>
  completeRide(rideId: string, actualFare?: number): Promise<CompleteResult>
  cancelRide(rideId: string, reason: string): Promise<void>
  updateLocation(lat: number, lng: number): Promise<void>
  
  // Subscriptions
  subscribeToNewRides(): void
  subscribeToCurrentRide(): void
}

interface AcceptResult {
  success: boolean
  rideId?: string
  error?: 'RIDE_ALREADY_ACCEPTED' | 'RIDE_NOT_FOUND'
}

interface CompleteResult {
  success: boolean
  finalFare: number
  providerEarnings: number
  platformFee: number
}
```

### 3. Admin Components

#### useAdminRideMonitoring.ts (Composable)

```typescript
interface AdminRideMonitoringComposable {
  // State
  activeRides: Ref<RideRequest[]>
  rideStats: Ref<RideStats>
  
  // Actions
  getRideDetails(rideId: string): Promise<RideDetails>
  cancelRide(rideId: string, reason: string): Promise<void>
  getAuditLog(rideId: string): Promise<AuditLogEntry[]>
  getProviderCancellations(providerId: string): Promise<CancellationLog[]>
  
  // Subscriptions
  subscribeToAllActiveRides(): void
}
```

## Data Models

### ride_requests Table

```sql
CREATE TABLE ride_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_id TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id) NOT NULL,
  provider_id UUID REFERENCES service_providers(id),
  
  -- Locations
  pickup_lat DECIMAL(10, 8) NOT NULL,
  pickup_lng DECIMAL(11, 8) NOT NULL,
  pickup_address TEXT NOT NULL,
  destination_lat DECIMAL(10, 8) NOT NULL,
  destination_lng DECIMAL(11, 8) NOT NULL,
  destination_address TEXT NOT NULL,
  
  -- Pricing
  estimated_fare DECIMAL(10, 2) NOT NULL,
  actual_fare DECIMAL(10, 2),
  platform_fee DECIMAL(10, 2),
  provider_earnings DECIMAL(10, 2),
  cancellation_fee DECIMAL(10, 2) DEFAULT 0,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending',
  vehicle_type TEXT NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  matched_at TIMESTAMPTZ,
  arriving_at TIMESTAMPTZ,
  picked_up_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  
  -- Cancellation
  cancelled_by UUID,
  cancelled_by_role TEXT,
  cancel_reason TEXT,
  
  CONSTRAINT valid_status CHECK (status IN (
    'pending', 'matched', 'arriving', 'picked_up', 
    'in_progress', 'completed', 'cancelled'
  ))
);
```

### wallet_holds Table (New)

```sql
CREATE TABLE wallet_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  ride_id UUID REFERENCES ride_requests(id) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'held',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  released_at TIMESTAMPTZ,
  
  CONSTRAINT valid_hold_status CHECK (status IN ('held', 'released', 'settled'))
);
```

### status_audit_log Table

```sql
CREATE TABLE status_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID NOT NULL,
  changed_by_role TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```


## Database Functions

### 1. create_ride_atomic()

```sql
-- Atomic ride creation with wallet hold
CREATE OR REPLACE FUNCTION create_ride_atomic(
  p_user_id UUID,
  p_pickup_lat DECIMAL,
  p_pickup_lng DECIMAL,
  p_pickup_address TEXT,
  p_destination_lat DECIMAL,
  p_destination_lng DECIMAL,
  p_destination_address TEXT,
  p_vehicle_type TEXT,
  p_estimated_fare DECIMAL
) RETURNS JSON AS $$
DECLARE
  v_ride_id UUID;
  v_tracking_id TEXT;
  v_wallet_balance DECIMAL;
BEGIN
  -- 1. Check and lock wallet
  SELECT balance INTO v_wallet_balance
  FROM user_wallets WHERE user_id = p_user_id FOR UPDATE;
  
  IF v_wallet_balance < p_estimated_fare THEN
    RAISE EXCEPTION 'INSUFFICIENT_BALANCE';
  END IF;
  
  -- 2. Hold credit
  UPDATE user_wallets
  SET balance = balance - p_estimated_fare,
      held_balance = held_balance + p_estimated_fare
  WHERE user_id = p_user_id;
  
  -- 3. Create ride
  v_ride_id := gen_random_uuid();
  v_tracking_id := generate_tracking_id('RID');
  
  INSERT INTO ride_requests (
    id, tracking_id, user_id, pickup_lat, pickup_lng, pickup_address,
    destination_lat, destination_lng, destination_address,
    vehicle_type, estimated_fare, status
  ) VALUES (
    v_ride_id, v_tracking_id, p_user_id, p_pickup_lat, p_pickup_lng,
    p_pickup_address, p_destination_lat, p_destination_lng,
    p_destination_address, p_vehicle_type, p_estimated_fare, 'pending'
  );
  
  -- 4. Create wallet hold record
  INSERT INTO wallet_holds (user_id, ride_id, amount, status)
  VALUES (p_user_id, v_ride_id, p_estimated_fare, 'held');
  
  -- 5. Log transaction
  INSERT INTO wallet_transactions (
    user_id, amount, type, status, reference_type, reference_id
  ) VALUES (
    p_user_id, -p_estimated_fare, 'ride_hold', 'held', 'ride_request', v_ride_id
  );
  
  -- 6. Notify providers
  PERFORM notify_nearby_providers_new_ride(v_ride_id);
  
  RETURN json_build_object(
    'ride_id', v_ride_id,
    'tracking_id', v_tracking_id,
    'status', 'pending'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2. accept_ride_atomic()

```sql
-- Atomic ride acceptance with race condition handling
CREATE OR REPLACE FUNCTION accept_ride_atomic(
  p_ride_id UUID,
  p_provider_id UUID
) RETURNS JSON AS $$
DECLARE
  v_current_status TEXT;
  v_user_id UUID;
BEGIN
  -- 1. Lock ride row (NOWAIT = fail immediately if locked)
  SELECT status, user_id INTO v_current_status, v_user_id
  FROM ride_requests WHERE id = p_ride_id FOR UPDATE NOWAIT;
  
  -- 2. Check availability
  IF v_current_status != 'pending' THEN
    RAISE EXCEPTION 'RIDE_ALREADY_ACCEPTED';
  END IF;
  
  -- 3. Update ride
  UPDATE ride_requests
  SET status = 'matched', provider_id = p_provider_id, matched_at = NOW()
  WHERE id = p_ride_id;
  
  -- 4. Update provider
  UPDATE service_providers
  SET status = 'busy', current_ride_id = p_ride_id
  WHERE id = p_provider_id;
  
  -- 5. Log audit
  INSERT INTO status_audit_log (
    entity_type, entity_id, old_status, new_status, changed_by, changed_by_role
  ) VALUES ('ride_request', p_ride_id, 'pending', 'matched', p_provider_id, 'provider');
  
  -- 6. Notify customer
  PERFORM send_notification(v_user_id, 'ride_matched', 'พบคนขับแล้ว!', 
    'คนขับกำลังมาหาคุณ', json_build_object('ride_id', p_ride_id));
  
  RETURN json_build_object('success', true, 'ride_id', p_ride_id);
  
EXCEPTION
  WHEN lock_not_available THEN
    RAISE EXCEPTION 'RIDE_ALREADY_ACCEPTED';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 3. complete_ride_atomic()

```sql
-- Atomic ride completion with payment settlement
CREATE OR REPLACE FUNCTION complete_ride_atomic(
  p_ride_id UUID,
  p_provider_id UUID,
  p_actual_fare DECIMAL DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_estimated_fare DECIMAL;
  v_final_fare DECIMAL;
  v_platform_fee DECIMAL;
  v_provider_earnings DECIMAL;
  v_refund_amount DECIMAL := 0;
BEGIN
  -- 1. Get ride details
  SELECT user_id, estimated_fare INTO v_user_id, v_estimated_fare
  FROM ride_requests WHERE id = p_ride_id AND provider_id = p_provider_id FOR UPDATE;
  
  -- 2. Calculate final amounts
  v_final_fare := COALESCE(p_actual_fare, v_estimated_fare);
  v_platform_fee := v_final_fare * 0.20;
  v_provider_earnings := v_final_fare - v_platform_fee;
  
  IF v_final_fare < v_estimated_fare THEN
    v_refund_amount := v_estimated_fare - v_final_fare;
  END IF;
  
  -- 3. Update ride
  UPDATE ride_requests
  SET status = 'completed', actual_fare = v_final_fare,
      platform_fee = v_platform_fee, provider_earnings = v_provider_earnings,
      completed_at = NOW()
  WHERE id = p_ride_id;
  
  -- 4. Release wallet hold
  UPDATE user_wallets
  SET held_balance = held_balance - v_estimated_fare,
      balance = balance + v_refund_amount
  WHERE user_id = v_user_id;
  
  UPDATE wallet_holds SET status = 'settled', released_at = NOW()
  WHERE ride_id = p_ride_id;
  
  -- 5. Add provider earnings
  UPDATE service_providers
  SET total_earnings = total_earnings + v_provider_earnings,
      pending_balance = pending_balance + v_provider_earnings,
      total_rides = total_rides + 1,
      status = 'available', current_ride_id = NULL
  WHERE id = p_provider_id;
  
  -- 6. Award loyalty points
  PERFORM add_loyalty_points(v_user_id, FLOOR(v_final_fare / 10), 'ride_completed', p_ride_id);
  
  -- 7. Log audit
  INSERT INTO status_audit_log (
    entity_type, entity_id, old_status, new_status, changed_by, changed_by_role
  ) VALUES ('ride_request', p_ride_id, 'in_progress', 'completed', p_provider_id, 'provider');
  
  RETURN json_build_object(
    'success', true, 'final_fare', v_final_fare,
    'provider_earnings', v_provider_earnings, 'refund_amount', v_refund_amount
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 4. cancel_ride_atomic()

```sql
-- Atomic ride cancellation with refund
CREATE OR REPLACE FUNCTION cancel_ride_atomic(
  p_ride_id UUID,
  p_cancelled_by UUID,
  p_cancelled_by_role TEXT,
  p_cancel_reason TEXT
) RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_provider_id UUID;
  v_estimated_fare DECIMAL;
  v_current_status TEXT;
  v_cancellation_fee DECIMAL := 0;
  v_refund_amount DECIMAL;
BEGIN
  -- 1. Get ride details
  SELECT user_id, provider_id, estimated_fare, status
  INTO v_user_id, v_provider_id, v_estimated_fare, v_current_status
  FROM ride_requests WHERE id = p_ride_id FOR UPDATE;
  
  -- 2. Calculate cancellation fee
  IF p_cancelled_by_role = 'customer' AND v_current_status IN ('matched', 'arriving') THEN
    v_cancellation_fee := v_estimated_fare * 0.20;
  END IF;
  
  v_refund_amount := v_estimated_fare - v_cancellation_fee;
  
  -- 3. Update ride
  UPDATE ride_requests
  SET status = 'cancelled', cancelled_at = NOW(),
      cancelled_by = p_cancelled_by, cancelled_by_role = p_cancelled_by_role,
      cancel_reason = p_cancel_reason, cancellation_fee = v_cancellation_fee
  WHERE id = p_ride_id;
  
  -- 4. Process refund
  UPDATE user_wallets
  SET held_balance = held_balance - v_estimated_fare,
      balance = balance + v_refund_amount
  WHERE user_id = v_user_id;
  
  UPDATE wallet_holds SET status = 'released', released_at = NOW()
  WHERE ride_id = p_ride_id;
  
  -- 5. Release provider if assigned
  IF v_provider_id IS NOT NULL THEN
    UPDATE service_providers
    SET status = 'available', current_ride_id = NULL
    WHERE id = v_provider_id;
    
    -- Log provider cancellation if provider cancelled
    IF p_cancelled_by_role = 'provider' THEN
      INSERT INTO provider_cancellation_log (provider_id, ride_id, reason)
      VALUES (v_provider_id, p_ride_id, p_cancel_reason);
    END IF;
    
    PERFORM send_notification(v_provider_id, 'ride_cancelled', 'งานถูกยกเลิก', 
      'การเดินทางถูกยกเลิก', json_build_object('ride_id', p_ride_id));
  END IF;
  
  -- 6. Notify customer
  PERFORM send_notification(v_user_id, 'ride_cancelled', 'ยกเลิกเรียบร้อย',
    'เงินจำนวน ' || v_refund_amount || ' บาทถูกคืนแล้ว',
    json_build_object('ride_id', p_ride_id, 'refund', v_refund_amount));
  
  -- 7. Log audit
  INSERT INTO status_audit_log (
    entity_type, entity_id, old_status, new_status, changed_by, changed_by_role, metadata
  ) VALUES (
    'ride_request', p_ride_id, v_current_status, 'cancelled',
    p_cancelled_by, p_cancelled_by_role,
    json_build_object('reason', p_cancel_reason, 'fee', v_cancellation_fee)
  );
  
  RETURN json_build_object(
    'success', true, 'refund_amount', v_refund_amount,
    'cancellation_fee', v_cancellation_fee
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Wallet Hold Atomicity

*For any* ride creation request with sufficient wallet balance, the system SHALL either:
- Successfully create a ride AND hold exactly the estimated fare from wallet, OR
- Fail completely with no changes to wallet balance or ride records

This ensures no partial states where money is held but ride doesn't exist, or ride exists but money isn't held.

**Validates: Requirements 1.1, 1.3, 1.4**

### Property 2: Insufficient Balance Rejection

*For any* ride creation request where wallet balance is less than estimated fare, the system SHALL reject the request and wallet balance SHALL remain unchanged.

**Validates: Requirements 1.2**

### Property 3: Tracking ID Uniqueness

*For any* set of created rides, all tracking IDs SHALL be unique and follow the format "RID-YYYYMMDD-XXXXXX".

**Validates: Requirements 1.5**

### Property 4: Race-Safe Job Acceptance

*For any* pending ride and any number of concurrent acceptance attempts, exactly ONE provider SHALL successfully accept, and:
- The ride status SHALL be "matched"
- The ride SHALL have exactly one provider_id assigned
- The winning provider's status SHALL be "busy"
- All losing providers SHALL receive "RIDE_ALREADY_ACCEPTED" error

**Validates: Requirements 3.2, 3.4, 3.5**

### Property 5: Status Flow Invariant

*For any* ride, status transitions SHALL only follow the valid flow:
- pending → matched → arriving → picked_up → in_progress → completed
- Any status → cancelled (except completed)

Invalid transitions SHALL be rejected.

**Validates: Requirements 5.1, 5.2, 5.3**

### Property 6: Audit Log Completeness

*For any* status change on a ride, there SHALL exist exactly one audit log entry with:
- Correct old_status and new_status
- Valid changed_by (user/provider/admin ID)
- Valid changed_by_role
- Timestamp within 1 second of the change

**Validates: Requirements 5.4**

### Property 7: Payment Settlement Correctness

*For any* completed ride with actual_fare F:
- platform_fee SHALL equal F × 0.20
- provider_earnings SHALL equal F × 0.80
- Provider's pending_balance SHALL increase by exactly provider_earnings
- Customer's wallet_hold SHALL be released (held_balance = 0)
- If actual_fare < estimated_fare, Customer SHALL receive refund of (estimated - actual)

**Validates: Requirements 6.1, 6.2, 6.3, 6.4**

### Property 8: Loyalty Points Award

*For any* completed ride with final fare F, Customer SHALL receive exactly floor(F / 10) loyalty points.

**Validates: Requirements 6.5**

### Property 9: Provider Status After Completion

*For any* completed ride, the Provider's status SHALL be "available" and current_ride_id SHALL be NULL.

**Validates: Requirements 6.7**

### Property 10: Cancellation Refund Policy

*For any* cancelled ride:
- If cancelled by Customer before matching (status = pending): refund = 100%
- If cancelled by Customer after matching (status = matched/arriving): refund = 80%
- If cancelled by Provider: refund = 100% AND provider_cancellation_log entry created
- If cancelled by Admin or System: refund = 100%

**Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.7, 8.4**

### Property 11: Cancellation Atomicity

*For any* cancellation, the system SHALL atomically:
- Update ride status to "cancelled"
- Process refund to Customer wallet
- Release Provider (if assigned) to "available" status
- Create audit log entry

No partial states allowed.

**Validates: Requirements 7.5**

### Property 12: Wallet Balance Non-Negative Constraint

*For any* wallet operation, the resulting balance and held_balance SHALL both be >= 0. Operations that would result in negative values SHALL be rejected.

**Validates: Requirements 10.1, 10.2**

### Property 13: RLS Customer Isolation

*For any* Customer A and Customer B, Customer A SHALL NOT be able to read, update, or delete rides belonging to Customer B.

**Validates: Requirements 10.3**

### Property 14: RLS Provider Access

*For any* Provider, they SHALL be able to:
- Read all rides with status = "pending"
- Read rides where provider_id = their ID
- NOT read rides belonging to other providers (except pending)

**Validates: Requirements 10.4**

### Property 15: RLS Admin Full Access

*For any* Admin, they SHALL be able to read and modify all rides regardless of user_id or provider_id.

**Validates: Requirements 10.5**

### Property 16: Financial Transaction Audit

*For any* wallet transaction (hold, release, refund, settlement), there SHALL exist a corresponding entry in wallet_transactions with correct amount, type, and reference.

**Validates: Requirements 10.6**

### Property 17: Pending Rides Sorted by Distance

*For any* Provider viewing available rides, the list SHALL be sorted by distance from Provider's current location in ascending order.

**Validates: Requirements 2.4**

## Error Handling

### Error Categories

| Error Code | Description | User Message | Recovery Action |
|------------|-------------|--------------|-----------------|
| INSUFFICIENT_BALANCE | Wallet balance < fare | ยอดเงินไม่เพียงพอ | Prompt to top up |
| RIDE_ALREADY_ACCEPTED | Race condition lost | งานนี้มีคนรับแล้ว | Refresh ride list |
| INVALID_STATUS_TRANSITION | Invalid status change | ไม่สามารถเปลี่ยนสถานะได้ | Show current status |
| RIDE_NOT_FOUND | Ride doesn't exist | ไม่พบการเดินทาง | Return to home |
| PROVIDER_OFFLINE | Provider disconnected | คนขับขาดการติดต่อ | Auto-reassign |
| NETWORK_ERROR | Connection failed | เกิดข้อผิดพลาด กรุณาลองใหม่ | Retry with backoff |

### Rollback Scenarios

1. **Ride Creation Failure**: If any step fails, wallet balance restored, no ride created
2. **Acceptance Failure**: If update fails after lock, ride remains pending
3. **Completion Failure**: If payment fails, ride remains in_progress, retry allowed
4. **Cancellation Failure**: If refund fails, ride remains in current status, retry allowed

## Testing Strategy

### Unit Tests

Unit tests will cover specific examples and edge cases:

1. **Wallet Operations**
   - Test exact balance boundary (balance = fare)
   - Test insufficient balance by 1 satang
   - Test concurrent wallet operations

2. **Status Transitions**
   - Test each valid transition
   - Test each invalid transition
   - Test transition from cancelled (should fail)

3. **Cancellation Fees**
   - Test cancellation at each status
   - Test fee calculation precision

### Property-Based Tests

Property tests will use **fast-check** library with minimum 100 iterations per property.

Each property test must be tagged with:
- **Feature: multi-role-ride-booking, Property {number}: {property_text}**

Example test structure:

```typescript
import fc from 'fast-check'

describe('Multi-Role Ride Booking Properties', () => {
  // Feature: multi-role-ride-booking, Property 1: Wallet Hold Atomicity
  it('Property 1: Wallet hold is atomic', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          walletBalance: fc.integer({ min: 0, max: 10000 }),
          estimatedFare: fc.integer({ min: 50, max: 5000 })
        }),
        async ({ walletBalance, estimatedFare }) => {
          // Setup wallet with balance
          // Attempt ride creation
          // Verify atomicity: either both succeed or both fail
        }
      ),
      { numRuns: 100 }
    )
  })

  // Feature: multi-role-ride-booking, Property 4: Race-Safe Job Acceptance
  it('Property 4: Only one provider can accept', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 10 }), // number of concurrent providers
        async (numProviders) => {
          // Create pending ride
          // Spawn numProviders concurrent acceptance attempts
          // Verify exactly one succeeds
        }
      ),
      { numRuns: 100 }
    )
  })

  // Feature: multi-role-ride-booking, Property 7: Payment Settlement Correctness
  it('Property 7: Payment calculations are correct', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          estimatedFare: fc.integer({ min: 50, max: 5000 }),
          actualFare: fc.integer({ min: 50, max: 5000 })
        }),
        async ({ estimatedFare, actualFare }) => {
          // Complete ride with fares
          // Verify: platform_fee = actual * 0.20
          // Verify: provider_earnings = actual * 0.80
          // Verify: refund = max(0, estimated - actual)
        }
      ),
      { numRuns: 100 }
    )
  })
})
```

### Integration Tests

Integration tests will verify end-to-end flows:

1. **Happy Path**: Customer creates → Provider accepts → Status updates → Completion
2. **Race Condition**: Multiple providers accept simultaneously
3. **Cancellation Flow**: Each cancellation scenario
4. **Network Recovery**: Provider disconnect and auto-reassign

### Test Data Generators

```typescript
// Arbitrary generators for property tests
const locationArb = fc.record({
  lat: fc.double({ min: 13.5, max: 14.0 }),
  lng: fc.double({ min: 100.3, max: 100.8 })
})

const rideRequestArb = fc.record({
  pickup: locationArb,
  destination: locationArb,
  vehicleType: fc.constantFrom('car', 'motorcycle', 'van'),
  estimatedFare: fc.integer({ min: 50, max: 5000 })
})

const rideStatusArb = fc.constantFrom(
  'pending', 'matched', 'arriving', 'picked_up', 'in_progress', 'completed', 'cancelled'
)
```
