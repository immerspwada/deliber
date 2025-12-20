# Design Document: System Decoupling Architecture

## Overview

This design document outlines a comprehensive architectural refactoring to eliminate "Siloed Development" in the Thai Ride Hailing Platform. The solution implements the **4-Layer Impact Rule** ensuring every feature works cohesively across Customer, Provider, and Admin roles through:

1. **Layer 1: Database & Migration** - Complete schemas with proper relationships and atomic operations
2. **Layer 2: Business Logic & State Management** - Role-specific composables with shared utilities
3. **Layer 3: Unified API Construction** - Consistent endpoints with RBAC enforcement
4. **Layer 4: Cross-Role Visibility** - Real-time synchronization between all roles

The architecture follows a **Service-Agnostic Pattern** where all service types (Ride, Delivery, Shopping, Queue, Moving, Laundry) share the same structural foundation while supporting service-specific extensions.

## Architecture

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         PRESENTATION LAYER                          │
├─────────────────────────────────────────────────────────────────────┤
│  Customer App    │    Provider App    │    Admin Dashboard         │
│  - RideView      │    - JobsView      │    - OrdersView            │
│  - DeliveryView  │    - ActiveRide    │    - ProvidersView         │
│  - ShoppingView  │    - Earnings      │    - Analytics             │
└─────────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      BUSINESS LOGIC LAYER                           │
├─────────────────────────────────────────────────────────────────────┤
│  useCustomer*    │    useProvider*    │    useAdmin*               │
│  - Booking       │    - JobPool       │    - Management            │
│  - Tracking      │    - Acceptance    │    - Monitoring            │
│  - Rating        │    - Completion    │    - Analytics             │
│                  │                    │                             │
│  Shared Utilities: useServices, useRealtime, useNotifications      │
└─────────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         API/RPC LAYER                               │
├─────────────────────────────────────────────────────────────────────┤
│  Atomic Functions (SECURITY DEFINER)                                │
│  - create_*_atomic()    - accept_*_atomic()                         │
│  - complete_*_atomic()  - cancel_*_atomic()                         │
│                                                                      │
│  Query Functions                                                     │
│  - get_available_*()    - get_*_details()                           │
└─────────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        DATABASE LAYER                               │
├─────────────────────────────────────────────────────────────────────┤
│  Core Tables          Service Tables         Support Tables         │
│  - users              - ride_requests         - wallet_holds        │
│  - service_providers  - delivery_requests     - notifications       │
│  - user_wallets       - shopping_requests     - ratings             │
│                       - queue_bookings                               │
│                       - moving_requests                              │
│                       - laundry_requests                             │
│                                                                      │
│  RLS Policies: Customer (own), Provider (assigned/available), Admin (all) │
│  Realtime: Enabled on all service request tables                    │
└─────────────────────────────────────────────────────────────────────┘
```

### Data Flow: Complete Service Lifecycle

```
CUSTOMER CREATES REQUEST
    ↓
[create_*_atomic()]
  - Validate user wallet
  - Hold funds
  - Insert request (status: pending)
  - Trigger notification
    ↓
REALTIME: Broadcast to nearby providers
    ↓
PROVIDER SEES IN JOB POOL
  - Filtered by location
  - Filtered by service type
  - Sorted by distance/earnings
    ↓
PROVIDER ACCEPTS
    ↓
[accept_*_atomic()]
  - Check if still pending (race condition)
  - Update status to matched
  - Set provider_id
  - Timestamp matched_at
    ↓
REALTIME: Notify customer + update other providers
    ↓
PROVIDER UPDATES STATUS
  - arriving → picked_up → in_progress
    ↓
REALTIME: Sync to customer + admin
    ↓
PROVIDER COMPLETES
    ↓
[complete_*_atomic()]
  - Update status to completed
  - Release wallet hold
  - Transfer earnings to provider
  - Calculate platform fee
  - Trigger rating request
    ↓
REALTIME: Notify customer for rating
    ↓
ADMIN MONITORS ALL STAGES
  - View all requests
  - Track provider locations
  - Handle disputes
  - Issue refunds
```

## Components and Interfaces

### 1. Database Schema (Layer 1)

#### Core Service Request Pattern

All service types follow this base schema:

```sql
CREATE TABLE {service}_requests (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_id TEXT UNIQUE NOT NULL,
  
  -- Relationships
  user_id UUID REFERENCES users(id) NOT NULL,
  provider_id UUID REFERENCES service_providers(id),
  
  -- Location (if applicable)
  pickup_lat DECIMAL(10, 8),
  pickup_lng DECIMAL(11, 8),
  pickup_address TEXT,
  destination_lat DECIMAL(10, 8),
  destination_lng DECIMAL(11, 8),
  destination_address TEXT,
  
  -- Pricing
  estimated_fare DECIMAL(10, 2) NOT NULL,
  actual_fare DECIMAL(10, 2),
  
  -- Status & Timestamps
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  matched_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  
  -- Cancellation
  cancelled_by UUID,
  cancelled_by_role TEXT,
  cancel_reason TEXT,
  cancellation_fee DECIMAL(10, 2) DEFAULT 0,
  
  -- Service-specific columns extend here
  
  CONSTRAINT valid_status CHECK (
    status IN ('pending', 'matched', 'arriving', 'picked_up', 
               'in_progress', 'completed', 'cancelled')
  )
);
```


#### Wallet Hold System

```sql
CREATE TABLE wallet_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  request_id UUID NOT NULL, -- Generic reference to any service request
  request_type TEXT NOT NULL, -- 'ride', 'delivery', 'shopping', etc.
  amount DECIMAL(10, 2) NOT NULL CHECK (amount >= 0),
  status TEXT NOT NULL DEFAULT 'held',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  released_at TIMESTAMPTZ,
  
  CONSTRAINT valid_hold_status CHECK (status IN ('held', 'released', 'settled'))
);
```

#### RLS Policy Pattern

```sql
-- Customer: View own requests
CREATE POLICY "customers_view_own" ON {service}_requests
  FOR SELECT USING (auth.uid() = user_id);

-- Provider: View assigned or available
CREATE POLICY "providers_view_relevant" ON {service}_requests
  FOR SELECT USING (
    auth.uid() = provider_id OR
    (status = 'pending' AND provider_id IS NULL)
  );

-- Admin: View all
CREATE POLICY "admins_view_all" ON {service}_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

### 2. Atomic Functions (Layer 2 - Database Side)

#### create_*_atomic() Pattern

```sql
CREATE OR REPLACE FUNCTION create_ride_atomic(
  p_user_id UUID,
  p_pickup_lat DECIMAL,
  p_pickup_lng DECIMAL,
  p_pickup_address TEXT,
  p_destination_lat DECIMAL,
  p_destination_lng DECIMAL,
  p_destination_address TEXT,
  p_vehicle_type TEXT,
  p_estimated_fare DECIMAL,
  p_promo_code TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $
DECLARE
  v_ride_id UUID;
  v_tracking_id TEXT;
  v_wallet_balance DECIMAL;
  v_wallet_held DECIMAL;
  v_final_fare DECIMAL;
BEGIN
  -- 1. Validate wallet balance
  SELECT balance, held_balance INTO v_wallet_balance, v_wallet_held
  FROM user_wallets
  WHERE user_id = p_user_id
  FOR UPDATE; -- Lock wallet row
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'WALLET_NOT_FOUND';
  END IF;
  
  -- Apply promo code if provided
  v_final_fare := p_estimated_fare;
  IF p_promo_code IS NOT NULL THEN
    -- Validate and apply promo (simplified)
    v_final_fare := v_final_fare * 0.9; -- 10% discount example
  END IF;
  
  IF v_wallet_balance < v_final_fare THEN
    RAISE EXCEPTION 'INSUFFICIENT_BALANCE';
  END IF;
  
  -- 2. Generate tracking ID
  v_tracking_id := 'RID-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
                   LPAD(NEXTVAL('tracking_sequence')::TEXT, 6, '0');
  
  -- 3. Create ride request
  INSERT INTO ride_requests (
    user_id, tracking_id, pickup_lat, pickup_lng, pickup_address,
    destination_lat, destination_lng, destination_address,
    vehicle_type, estimated_fare, status
  ) VALUES (
    p_user_id, v_tracking_id, p_pickup_lat, p_pickup_lng, p_pickup_address,
    p_destination_lat, p_destination_lng, p_destination_address,
    p_vehicle_type, v_final_fare, 'pending'
  )
  RETURNING id INTO v_ride_id;
  
  -- 4. Hold wallet funds
  UPDATE user_wallets
  SET held_balance = held_balance + v_final_fare
  WHERE user_id = p_user_id;
  
  INSERT INTO wallet_holds (user_id, request_id, request_type, amount, status)
  VALUES (p_user_id, v_ride_id, 'ride', v_final_fare, 'held');
  
  -- 5. Trigger notification to nearby providers
  PERFORM notify_nearby_providers_new_ride(v_ride_id);
  
  RETURN json_build_object(
    'ride_id', v_ride_id,
    'tracking_id', v_tracking_id,
    'estimated_fare', v_final_fare,
    'wallet_held', v_final_fare
  );
END;
$;
```

#### accept_*_atomic() Pattern

```sql
CREATE OR REPLACE FUNCTION accept_ride_atomic(
  p_ride_id UUID,
  p_provider_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $
DECLARE
  v_current_status TEXT;
  v_current_provider UUID;
BEGIN
  -- 1. Lock and check ride status (prevents race condition)
  SELECT status, provider_id INTO v_current_status, v_current_provider
  FROM ride_requests
  WHERE id = p_ride_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'RIDE_NOT_FOUND';
  END IF;
  
  IF v_current_status != 'pending' THEN
    RAISE EXCEPTION 'RIDE_ALREADY_ACCEPTED';
  END IF;
  
  -- 2. Update ride to matched
  UPDATE ride_requests
  SET 
    status = 'matched',
    provider_id = p_provider_id,
    matched_at = NOW(),
    updated_at = NOW()
  WHERE id = p_ride_id;
  
  -- 3. Log provider acceptance
  INSERT INTO provider_activity_log (provider_id, activity_type, ride_id)
  VALUES (p_provider_id, 'ride_accepted', p_ride_id);
  
  -- 4. Send notification to customer
  PERFORM send_notification(
    (SELECT user_id FROM ride_requests WHERE id = p_ride_id),
    'ride_matched',
    json_build_object('ride_id', p_ride_id, 'provider_id', p_provider_id)
  );
  
  RETURN json_build_object(
    'success', true,
    'ride_id', p_ride_id
  );
END;
$;
```

#### complete_*_atomic() Pattern

```sql
CREATE OR REPLACE FUNCTION complete_ride_atomic(
  p_ride_id UUID,
  p_provider_id UUID,
  p_actual_fare DECIMAL DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $
DECLARE
  v_user_id UUID;
  v_estimated_fare DECIMAL;
  v_final_fare DECIMAL;
  v_platform_fee DECIMAL;
  v_provider_earnings DECIMAL;
  v_hold_id UUID;
BEGIN
  -- 1. Get ride details
  SELECT user_id, estimated_fare INTO v_user_id, v_estimated_fare
  FROM ride_requests
  WHERE id = p_ride_id AND provider_id = p_provider_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'RIDE_NOT_FOUND_OR_UNAUTHORIZED';
  END IF;
  
  -- 2. Calculate final fare
  v_final_fare := COALESCE(p_actual_fare, v_estimated_fare);
  v_platform_fee := v_final_fare * 0.20; -- 20% platform fee
  v_provider_earnings := v_final_fare - v_platform_fee;
  
  -- 3. Update ride status
  UPDATE ride_requests
  SET 
    status = 'completed',
    actual_fare = v_final_fare,
    completed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_ride_id;
  
  -- 4. Release wallet hold and settle payment
  SELECT id INTO v_hold_id
  FROM wallet_holds
  WHERE request_id = p_ride_id AND request_type = 'ride' AND status = 'held';
  
  UPDATE user_wallets
  SET 
    balance = balance - v_final_fare,
    held_balance = held_balance - v_estimated_fare
  WHERE user_id = v_user_id;
  
  UPDATE wallet_holds
  SET status = 'settled', released_at = NOW()
  WHERE id = v_hold_id;
  
  -- 5. Transfer earnings to provider
  UPDATE service_providers
  SET 
    total_earnings = total_earnings + v_provider_earnings,
    available_balance = available_balance + v_provider_earnings
  WHERE id = p_provider_id;
  
  -- 6. Record transaction
  INSERT INTO wallet_transactions (user_id, amount, type, reference_id, reference_type)
  VALUES (v_user_id, -v_final_fare, 'ride_payment', p_ride_id, 'ride');
  
  -- 7. Trigger rating request
  PERFORM send_notification(
    v_user_id,
    'ride_completed_rate',
    json_build_object('ride_id', p_ride_id)
  );
  
  RETURN json_build_object(
    'success', true,
    'final_fare', v_final_fare,
    'provider_earnings', v_provider_earnings,
    'platform_fee', v_platform_fee
  );
END;
$;
```


### 3. Business Logic Composables (Layer 2 - Frontend Side)

#### Customer Composable Pattern

```typescript
// src/composables/useCustomerBooking.ts
export function useCustomerBooking(serviceType: ServiceType) {
  const currentRequest = ref<ServiceRequest | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const realtimeChannel = ref<RealtimeChannel | null>(null)

  async function createRequest(params: CreateRequestParams): Promise<RequestResult> {
    isLoading.value = true
    error.value = null

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Call service-specific atomic function
      const functionName = `create_${serviceType}_atomic`
      const { data, error: rpcError } = await supabase.rpc(functionName, {
        p_user_id: user.id,
        ...transformParams(params)
      })

      if (rpcError) {
        handleRpcError(rpcError)
      }

      // Subscribe to updates
      await subscribeToRequestUpdates(data.request_id)

      return {
        requestId: data.request_id,
        trackingId: data.tracking_id,
        status: 'pending',
        estimatedFare: data.estimated_fare
      }
    } catch (err: any) {
      error.value = err.message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function subscribeToRequestUpdates(requestId: string): Promise<void> {
    const tableName = `${serviceType}_requests`
    
    const channel = supabase
      .channel(`${serviceType}:${requestId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: tableName,
          filter: `id=eq.${requestId}`
        },
        async (payload) => {
          const updated = payload.new as ServiceRequest
          
          // Fetch provider info if matched
          if (updated.provider_id && updated.status === 'matched') {
            const { data: provider } = await supabase
              .from('service_providers')
              .select('*')
              .eq('id', updated.provider_id)
              .single()
            
            updated.provider = provider
          }
          
          currentRequest.value = updated
          handleStatusChange(updated.status)
        }
      )
      .subscribe()

    realtimeChannel.value = channel
  }

  async function cancelRequest(requestId: string, reason: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { error: rpcError } = await supabase.rpc('cancel_request_atomic', {
      p_request_id: requestId,
      p_request_type: serviceType,
      p_cancelled_by: user.id,
      p_cancelled_by_role: 'customer',
      p_cancel_reason: reason
    })

    if (rpcError) throw rpcError

    currentRequest.value = null
    if (realtimeChannel.value) {
      await supabase.removeChannel(realtimeChannel.value)
    }
  }

  return {
    currentRequest,
    isLoading,
    error,
    createRequest,
    cancelRequest,
    subscribeToRequestUpdates
  }
}
```

#### Provider Composable Pattern

```typescript
// src/composables/useProviderJobPool.ts
export function useProviderJobPool(serviceTypes: ServiceType[]) {
  const availableJobs = ref<ServiceRequest[]>([])
  const currentJob = ref<ServiceRequest | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const realtimeChannels = ref<RealtimeChannel[]>([])

  async function acceptJob(requestId: string, requestType: ServiceType): Promise<AcceptResult> {
    isLoading.value = true
    error.value = null

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Call atomic acceptance function
      const functionName = `accept_${requestType}_atomic`
      const { data, error: rpcError } = await supabase.rpc(functionName, {
        p_request_id: requestId,
        p_provider_id: user.id
      })

      if (rpcError) {
        if (rpcError.message.includes('ALREADY_ACCEPTED')) {
          return { success: false, error: 'ALREADY_ACCEPTED' }
        }
        throw rpcError
      }

      // Remove from available jobs
      availableJobs.value = availableJobs.value.filter(j => j.id !== requestId)

      // Set as current job
      const { data: job } = await supabase
        .from(`${requestType}_requests`)
        .select('*')
        .eq('id', requestId)
        .single()

      if (job) {
        currentJob.value = job as ServiceRequest
        await subscribeToCurrentJob()
      }

      return { success: true, requestId: data.request_id }
    } catch (err: any) {
      error.value = err.message
      return { success: false }
    } finally {
      isLoading.value = false
    }
  }

  async function updateJobStatus(requestId: string, status: RequestStatus): Promise<void> {
    const requestType = currentJob.value?.type
    if (!requestType) throw new Error('No current job')

    const { error: updateError } = await supabase
      .from(`${requestType}_requests`)
      .update({
        status,
        [`${status}_at`]: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId)

    if (updateError) throw updateError

    if (currentJob.value) {
      currentJob.value.status = status
    }
  }

  async function completeJob(requestId: string, actualFare?: number): Promise<CompleteResult> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const requestType = currentJob.value?.type
    if (!requestType) throw new Error('No current job')

    const functionName = `complete_${requestType}_atomic`
    const { data, error: rpcError } = await supabase.rpc(functionName, {
      p_request_id: requestId,
      p_provider_id: user.id,
      p_actual_fare: actualFare || null
    })

    if (rpcError) throw rpcError

    currentJob.value = null
    await unsubscribeAll()

    return {
      success: true,
      finalFare: data.final_fare,
      providerEarnings: data.provider_earnings,
      platformFee: data.platform_fee
    }
  }

  async function subscribeToNewJobs(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Get provider location
    const { data: provider } = await supabase
      .from('service_providers')
      .select('current_lat, current_lng, enabled_services')
      .eq('id', user.id)
      .single()

    if (!provider) return

    // Subscribe to each service type
    for (const serviceType of serviceTypes) {
      const channel = supabase
        .channel(`new_${serviceType}_jobs`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: `${serviceType}_requests`,
            filter: 'status=eq.pending'
          },
          async (payload) => {
            const newJob = payload.new as ServiceRequest
            newJob.type = serviceType

            // Calculate distance
            const distance = calculateDistance(
              provider.current_lat,
              provider.current_lng,
              newJob.pickup_lat,
              newJob.pickup_lng
            )

            // Only show jobs within service radius (5km)
            if (distance <= 5) {
              newJob.distance = distance
              availableJobs.value.push(newJob)
              
              // Sort by distance
              availableJobs.value.sort((a, b) => (a.distance || 0) - (b.distance || 0))
              
              // Play notification sound
              playNotificationSound()
            }
          }
        )
        .subscribe()

      realtimeChannels.value.push(channel)
    }
  }

  async function subscribeToCurrentJob(): Promise<void> {
    if (!currentJob.value) return

    const channel = supabase
      .channel(`provider_job:${currentJob.value.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: `${currentJob.value.type}_requests`,
          filter: `id=eq.${currentJob.value.id}`
        },
        (payload) => {
          currentJob.value = payload.new as ServiceRequest
        }
      )
      .subscribe()

    realtimeChannels.value.push(channel)
  }

  async function unsubscribeAll(): Promise<void> {
    for (const channel of realtimeChannels.value) {
      await supabase.removeChannel(channel)
    }
    realtimeChannels.value = []
  }

  return {
    availableJobs,
    currentJob,
    isLoading,
    error,
    acceptJob,
    updateJobStatus,
    completeJob,
    subscribeToNewJobs,
    subscribeToCurrentJob
  }
}
```


#### Admin Composable Pattern

```typescript
// src/composables/useAdminServiceManagement.ts
export function useAdminServiceManagement() {
  const allRequests = ref<ServiceRequest[]>([])
  const selectedRequest = ref<ServiceRequest | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const filters = ref<AdminFilters>({
    serviceType: null,
    status: null,
    dateRange: null,
    providerId: null,
    customerId: null
  })

  async function fetchAllRequests(page: number = 1, limit: number = 50): Promise<void> {
    isLoading.value = true
    error.value = null

    try {
      // Build query based on filters
      let query = supabase
        .from('unified_requests_view') // View that unions all service types
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1)

      // Apply filters
      if (filters.value.serviceType) {
        query = query.eq('service_type', filters.value.serviceType)
      }
      if (filters.value.status) {
        query = query.eq('status', filters.value.status)
      }
      if (filters.value.providerId) {
        query = query.eq('provider_id', filters.value.providerId)
      }
      if (filters.value.customerId) {
        query = query.eq('user_id', filters.value.customerId)
      }
      if (filters.value.dateRange) {
        query = query
          .gte('created_at', filters.value.dateRange.start)
          .lte('created_at', filters.value.dateRange.end)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      allRequests.value = data as ServiceRequest[]
    } catch (err: any) {
      error.value = err.message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function getRequestDetails(requestId: string, serviceType: ServiceType): Promise<void> {
    isLoading.value = true
    error.value = null

    try {
      const { data, error: fetchError } = await supabase
        .from(`${serviceType}_requests`)
        .select(`
          *,
          customer:users!user_id(*),
          provider:service_providers!provider_id(*),
          rating:${serviceType}_ratings(*)
        `)
        .eq('id', requestId)
        .single()

      if (fetchError) throw fetchError

      selectedRequest.value = data as ServiceRequest
    } catch (err: any) {
      error.value = err.message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function updateRequestStatus(
    requestId: string,
    serviceType: ServiceType,
    newStatus: RequestStatus,
    reason?: string
  ): Promise<void> {
    isLoading.value = true
    error.value = null

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Log admin action
      await supabase.from('admin_audit_log').insert({
        admin_id: user.id,
        action: 'update_request_status',
        entity_type: serviceType,
        entity_id: requestId,
        old_value: selectedRequest.value?.status,
        new_value: newStatus,
        reason: reason
      })

      // Update status
      const { error: updateError } = await supabase
        .from(`${serviceType}_requests`)
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId)

      if (updateError) throw updateError

      // Notify affected parties
      await notifyStatusChange(requestId, serviceType, newStatus)

      // Refresh data
      await getRequestDetails(requestId, serviceType)
    } catch (err: any) {
      error.value = err.message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function cancelRequestAsAdmin(
    requestId: string,
    serviceType: ServiceType,
    reason: string,
    issueRefund: boolean = true
  ): Promise<void> {
    isLoading.value = true
    error.value = null

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error: rpcError } = await supabase.rpc('cancel_request_atomic', {
        p_request_id: requestId,
        p_request_type: serviceType,
        p_cancelled_by: user.id,
        p_cancelled_by_role: 'admin',
        p_cancel_reason: reason,
        p_issue_refund: issueRefund
      })

      if (rpcError) throw rpcError

      // Log admin action
      await supabase.from('admin_audit_log').insert({
        admin_id: user.id,
        action: 'cancel_request',
        entity_type: serviceType,
        entity_id: requestId,
        reason: reason,
        metadata: { refund_issued: issueRefund }
      })

      // Refresh data
      await fetchAllRequests()
    } catch (err: any) {
      error.value = err.message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function issueRefund(
    requestId: string,
    serviceType: ServiceType,
    amount: number,
    reason: string
  ): Promise<void> {
    isLoading.value = true
    error.value = null

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error: rpcError } = await supabase.rpc('issue_refund_atomic', {
        p_request_id: requestId,
        p_request_type: serviceType,
        p_refund_amount: amount,
        p_admin_id: user.id,
        p_reason: reason
      })

      if (rpcError) throw rpcError

      // Log admin action
      await supabase.from('admin_audit_log').insert({
        admin_id: user.id,
        action: 'issue_refund',
        entity_type: serviceType,
        entity_id: requestId,
        reason: reason,
        metadata: { refund_amount: amount }
      })

      // Refresh data
      await getRequestDetails(requestId, serviceType)
    } catch (err: any) {
      error.value = err.message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function getAnalytics(serviceType?: ServiceType): Promise<AdminAnalytics> {
    const { data, error: fetchError } = await supabase.rpc('get_admin_analytics', {
      p_service_type: serviceType || null
    })

    if (fetchError) throw fetchError

    return data as AdminAnalytics
  }

  return {
    allRequests,
    selectedRequest,
    isLoading,
    error,
    filters,
    fetchAllRequests,
    getRequestDetails,
    updateRequestStatus,
    cancelRequestAsAdmin,
    issueRefund,
    getAnalytics
  }
}
```

### 4. Unified Service Registry (Layer 3)

```typescript
// src/lib/serviceRegistry.ts

export interface ServiceDefinition {
  type: ServiceType
  displayName: string
  displayNameTh: string
  icon: string
  color: string
  tableName: string
  trackingPrefix: string
  hasLocation: boolean
  hasDestination: boolean
  specificFields: string[]
  atomicFunctions: {
    create: string
    accept: string
    complete: string
    cancel: string
  }
}

export const SERVICE_REGISTRY: Record<ServiceType, ServiceDefinition> = {
  ride: {
    type: 'ride',
    displayName: 'Ride',
    displayNameTh: 'เรียกรถ',
    icon: 'car',
    color: '#00A86B',
    tableName: 'ride_requests',
    trackingPrefix: 'RID',
    hasLocation: true,
    hasDestination: true,
    specificFields: ['vehicle_type', 'passenger_count'],
    atomicFunctions: {
      create: 'create_ride_atomic',
      accept: 'accept_ride_atomic',
      complete: 'complete_ride_atomic',
      cancel: 'cancel_request_atomic'
    }
  },
  delivery: {
    type: 'delivery',
    displayName: 'Delivery',
    displayNameTh: 'ส่งของ',
    icon: 'package',
    color: '#F5A623',
    tableName: 'delivery_requests',
    trackingPrefix: 'DEL',
    hasLocation: true,
    hasDestination: true,
    specificFields: ['package_size', 'package_weight', 'recipient_name', 'recipient_phone'],
    atomicFunctions: {
      create: 'create_delivery_atomic',
      accept: 'accept_delivery_atomic',
      complete: 'complete_delivery_atomic',
      cancel: 'cancel_request_atomic'
    }
  },
  shopping: {
    type: 'shopping',
    displayName: 'Shopping',
    displayNameTh: 'ช้อปปิ้ง',
    icon: 'shopping-cart',
    color: '#E53935',
    tableName: 'shopping_requests',
    trackingPrefix: 'SHP',
    hasLocation: true,
    hasDestination: true,
    specificFields: ['store_name', 'shopping_list', 'estimated_total'],
    atomicFunctions: {
      create: 'create_shopping_atomic',
      accept: 'accept_shopping_atomic',
      complete: 'complete_shopping_atomic',
      cancel: 'cancel_request_atomic'
    }
  },
  queue: {
    type: 'queue',
    displayName: 'Queue Booking',
    displayNameTh: 'จองคิว',
    icon: 'clock',
    color: '#9C27B0',
    tableName: 'queue_bookings',
    trackingPrefix: 'QUE',
    hasLocation: true,
    hasDestination: false,
    specificFields: ['service_name', 'appointment_time', 'notes'],
    atomicFunctions: {
      create: 'create_queue_atomic',
      accept: 'accept_queue_atomic',
      complete: 'complete_queue_atomic',
      cancel: 'cancel_request_atomic'
    }
  },
  moving: {
    type: 'moving',
    displayName: 'Moving',
    displayNameTh: 'ขนย้าย',
    icon: 'truck',
    color: '#FF9800',
    tableName: 'moving_requests',
    trackingPrefix: 'MOV',
    hasLocation: true,
    hasDestination: true,
    specificFields: ['moving_type', 'helpers_count', 'floor_from', 'floor_to', 'has_elevator'],
    atomicFunctions: {
      create: 'create_moving_atomic',
      accept: 'accept_moving_atomic',
      complete: 'complete_moving_atomic',
      cancel: 'cancel_request_atomic'
    }
  },
  laundry: {
    type: 'laundry',
    displayName: 'Laundry',
    displayNameTh: 'ซักผ้า',
    icon: 'washing-machine',
    color: '#2196F3',
    tableName: 'laundry_requests',
    trackingPrefix: 'LAU',
    hasLocation: true,
    hasDestination: false,
    specificFields: ['service_type', 'weight_kg', 'special_instructions'],
    atomicFunctions: {
      create: 'create_laundry_atomic',
      accept: 'accept_laundry_atomic',
      complete: 'complete_laundry_atomic',
      cancel: 'cancel_request_atomic'
    }
  }
}

export function getServiceDefinition(type: ServiceType): ServiceDefinition {
  return SERVICE_REGISTRY[type]
}

export function getAllServiceTypes(): ServiceType[] {
  return Object.keys(SERVICE_REGISTRY) as ServiceType[]
}
```


## Data Models

### Core Entities

#### User
```typescript
interface User {
  id: string
  member_uid: string // TRD-XXXXXXXX format
  email: string | null
  phone_number: string
  first_name: string
  last_name: string
  role: 'customer' | 'provider' | 'admin'
  verification_status: 'pending' | 'verified' | 'rejected'
  created_at: string
  updated_at: string
}
```

#### ServiceProvider
```typescript
interface ServiceProvider {
  id: string // Same as user_id
  user_id: string
  provider_type: 'driver' | 'rider' | 'shopper' | 'mover' | 'laundry'
  enabled_services: ServiceType[]
  vehicle_type: string | null
  vehicle_plate_number: string | null
  current_lat: number | null
  current_lng: number | null
  is_online: boolean
  is_available: boolean
  rating: number | null
  total_earnings: number
  available_balance: number
  verification_status: 'pending' | 'approved' | 'rejected'
  created_at: string
  updated_at: string
}
```

#### ServiceRequest (Base Interface)
```typescript
interface ServiceRequest {
  id: string
  tracking_id: string
  service_type: ServiceType
  user_id: string
  provider_id: string | null
  
  // Location (optional based on service)
  pickup_lat?: number
  pickup_lng?: number
  pickup_address?: string
  destination_lat?: number
  destination_lng?: number
  destination_address?: string
  
  // Pricing
  estimated_fare: number
  actual_fare: number | null
  
  // Status
  status: RequestStatus
  created_at: string
  matched_at: string | null
  completed_at: string | null
  cancelled_at: string | null
  
  // Cancellation
  cancelled_by: string | null
  cancelled_by_role: 'customer' | 'provider' | 'admin' | 'system' | null
  cancel_reason: string | null
  cancellation_fee: number
  
  // Relationships
  customer?: User
  provider?: ServiceProvider
  rating?: ServiceRating
}
```

#### WalletHold
```typescript
interface WalletHold {
  id: string
  user_id: string
  request_id: string
  request_type: ServiceType
  amount: number
  status: 'held' | 'released' | 'settled'
  created_at: string
  released_at: string | null
}
```

### Service-Specific Extensions

#### RideRequest extends ServiceRequest
```typescript
interface RideRequest extends ServiceRequest {
  vehicle_type: 'car' | 'motorcycle' | 'van'
  passenger_count: number
  arriving_at: string | null
  picked_up_at: string | null
}
```

#### DeliveryRequest extends ServiceRequest
```typescript
interface DeliveryRequest extends ServiceRequest {
  package_size: 'small' | 'medium' | 'large'
  package_weight: number
  recipient_name: string
  recipient_phone: string
  delivery_notes: string | null
  delivery_proof_photo: string | null
  pickup_proof_photo: string | null
}
```

#### ShoppingRequest extends ServiceRequest
```typescript
interface ShoppingRequest extends ServiceRequest {
  store_name: string
  shopping_list: ShoppingItem[]
  estimated_total: number
  actual_total: number | null
  receipt_photo: string | null
}

interface ShoppingItem {
  name: string
  quantity: number
  estimated_price: number
  actual_price: number | null
  notes: string | null
}
```

### State Machine

```
┌─────────┐
│ pending │ ← Initial state when customer creates request
└────┬────┘
     │
     ├─→ [cancelled] ← Customer/Admin cancels before match
     │
     ▼
┌─────────┐
│ matched │ ← Provider accepts request
└────┬────┘
     │
     ├─→ [cancelled] ← Customer/Provider/Admin cancels after match
     │
     ▼
┌──────────┐
│ arriving │ ← Provider heading to pickup
└────┬─────┘
     │
     ├─→ [cancelled] ← Cancellation with fee
     │
     ▼
┌───────────┐
│ picked_up │ ← Provider picked up customer/package
└─────┬─────┘
      │
      ▼
┌─────────────┐
│ in_progress │ ← Service in progress
└──────┬──────┘
       │
       ▼
┌───────────┐
│ completed │ ← Service completed successfully
└───────────┘
```

### Valid State Transitions

```typescript
const VALID_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  pending: ['matched', 'cancelled'],
  matched: ['arriving', 'cancelled'],
  arriving: ['picked_up', 'cancelled'],
  picked_up: ['in_progress'],
  in_progress: ['completed'],
  completed: [], // Terminal state
  cancelled: []  // Terminal state
}

function isValidTransition(from: RequestStatus, to: RequestStatus): boolean {
  return VALID_TRANSITIONS[from].includes(to)
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Cross-Role Visibility
*For any* service request created by a customer, that request should be immediately visible to eligible providers (within service radius and with matching service type enabled) and to all admins.

**Validates: Requirements 1.2**

### Property 2: Real-Time Status Synchronization
*For any* status update made by a provider, that update should be received in real-time by the customer who created the request and by all admins monitoring the system.

**Validates: Requirements 1.3, 5.3**

### Property 3: State Machine Consistency
*For any* service request, all status transitions must follow the valid state machine (pending → matched → arriving → picked_up → in_progress → completed), and invalid transitions should be rejected.

**Validates: Requirements 1.4, 4.6, 8.4**

### Property 4: Referential Integrity
*For any* service request, the user_id must reference an existing user, and if provider_id is set, it must reference an existing active service provider.

**Validates: Requirements 1.5, 13.1, 13.2**

### Property 5: RLS Policy Enforcement
*For any* authenticated user, they should only be able to read service requests according to their role: customers see their own, providers see assigned or available, admins see all.

**Validates: Requirements 2.2, 4.5**

### Property 6: Atomic Acceptance (Race Condition Prevention)
*For any* pending service request, when multiple providers attempt to accept it simultaneously, exactly one should succeed and all others should receive an "already accepted" error.

**Validates: Requirements 2.3, 6.3, 8.1**

### Property 7: Audit Trail Completeness
*For any* critical state change (status update, cancellation, completion), an audit log entry should be created with timestamp, actor, old value, and new value.

**Validates: Requirements 2.5, 7.2**

### Property 8: Foreign Key Cascade Behavior
*For any* user deletion, their associated service requests should either be cascaded (deleted) or have user_id set to null, maintaining database consistency.

**Validates: Requirements 2.6, 13.3**

### Property 9: Error Handling Consistency
*For any* composable function that performs database operations, errors should be caught, stored in an error ref, and returned in a consistent format across all composables.

**Validates: Requirements 3.5**

### Property 10: API Parameter Consistency
*For any* service type, the create_*_atomic function should accept similar base parameters (user_id, location, fare) and return similar results (request_id, tracking_id, status).

**Validates: Requirements 4.1**

### Property 11: Location-Based Job Filtering
*For any* online provider, they should only see pending requests within their configured service radius (e.g., 5km) and for service types they have enabled.

**Validates: Requirements 4.2, 6.1, 6.2**

### Property 12: Admin Query Capabilities
*For any* admin user, they should be able to query all service requests with filtering by service type, status, date range, provider, and customer, with results paginated.

**Validates: Requirements 4.4, 7.1**

### Property 13: Provider Notification on New Request
*For any* new service request created by a customer, all providers within service radius with matching service type enabled should receive a realtime notification.

**Validates: Requirements 5.1**

### Property 14: Customer Notification on Match
*For any* service request that transitions to "matched" status, the customer should receive a realtime notification containing provider details.

**Validates: Requirements 5.2, 9.2**

### Property 15: Job Removal After Acceptance
*For any* service request accepted by a provider, that request should be removed from all other providers' available job lists in real-time.

**Validates: Requirements 6.4**

### Property 16: Job Sorting
*For any* provider's available job list, jobs should be correctly sorted by the specified criteria (distance, time, or earnings), with distance being the default.

**Validates: Requirements 6.5**

### Property 17: Admin Cancellation with Refund
*For any* service request cancelled by an admin with refund flag set, the cancellation should atomically update status, refund the customer's wallet, and notify both customer and provider.

**Validates: Requirements 7.3, 8.2**

### Property 18: Atomic Completion
*For any* service request completed by a provider, the completion should atomically update status, release wallet hold, transfer earnings to provider, deduct platform fee, and trigger rating request.

**Validates: Requirements 8.3**

### Property 19: Notification Delivery on Status Change
*For any* service request status change, push notifications should be sent to all affected parties (customer, provider if assigned, admin if monitoring).

**Validates: Requirements 9.1**

### Property 20: Rating Request After Completion
*For any* service request that transitions to "completed" status, a rating request notification should be sent to the customer.

**Validates: Requirements 9.4**

### Property 21: Notification Preferences
*For any* user with notification preferences set, notifications should only be sent through their enabled channels (push, SMS, email).

**Validates: Requirements 9.5**

### Property 22: Service-Specific Metadata Storage
*For any* service type, service-specific fields (e.g., package_size for delivery, helpers_count for moving) should be stored and retrieved correctly.

**Validates: Requirements 10.2**

### Property 23: Service Registry Completeness
*For any* active service type in the system, it should be registered in the service registry with all required metadata (table name, atomic functions, display names).

**Validates: Requirements 10.4**

### Property 24: Service-Specific Pricing
*For any* service type, the pricing calculation should use service-specific logic (e.g., distance-based for rides, weight-based for laundry).

**Validates: Requirements 10.5**

### Property 25: Transaction Rollback on Failure
*For any* atomic function that fails mid-execution, all partial changes should be rolled back, leaving the database in a consistent state.

**Validates: Requirements 11.1**

### Property 26: Offline Queue and Sync
*For any* realtime update that occurs while a client is offline, the update should be queued and synchronized when the client reconnects.

**Validates: Requirements 11.2, 5.6**

### Property 27: Provider Offline Handling
*For any* provider who goes offline while assigned to an active request, the system should either reassign the request or notify the customer of the issue.

**Validates: Requirements 11.3**

### Property 28: Retry with Exponential Backoff
*For any* transient failure (network timeout, temporary database unavailability), the system should retry the operation with exponentially increasing delays.

**Validates: Requirements 11.4**

### Property 29: Error Logging with Context
*For any* error that occurs, a log entry should be created containing error message, stack trace, user context, and request context.

**Validates: Requirements 11.5**

### Property 30: Pagination Support
*For any* list query endpoint, it should support pagination parameters (page, limit) and return total count along with results.

**Validates: Requirements 12.2**

### Property 31: Query Result Caching
*For any* repeated query with identical parameters within the cache TTL, the result should be served from cache rather than hitting the database.

**Validates: Requirements 12.3**

### Property 32: Slow Query Monitoring
*For any* database query that exceeds the performance threshold (e.g., 1000ms), it should be logged for optimization review.

**Validates: Requirements 12.5**

### Property 33: Orphaned Record Prevention
*For any* attempt to create a rating without a valid request_id, or a request without a valid user_id, the operation should be rejected by foreign key constraints.

**Validates: Requirements 13.3**

### Property 34: Consistency Check Detection
*For any* data inconsistency (e.g., completed request without provider_id, held wallet balance without corresponding hold), the consistency check function should detect and report it.

**Validates: Requirements 13.4**

### Property 35: Backward Compatibility During Migration
*For any* service type being refactored, both old and new code paths should work simultaneously during the transition period without data corruption.

**Validates: Requirements 14.2**

### Property 36: Post-Migration Data Integrity
*For any* completed migration, running consistency checks should find no data integrity violations.

**Validates: Requirements 14.4**


## Error Handling

### Error Classification

```typescript
enum ErrorType {
  // Client Errors (4xx)
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  
  // Business Logic Errors
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  WALLET_NOT_FOUND = 'WALLET_NOT_FOUND',
  RIDE_ALREADY_ACCEPTED = 'RIDE_ALREADY_ACCEPTED',
  INVALID_STATE_TRANSITION = 'INVALID_STATE_TRANSITION',
  PROVIDER_NOT_AVAILABLE = 'PROVIDER_NOT_AVAILABLE',
  
  // Server Errors (5xx)
  DATABASE_ERROR = 'DATABASE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR'
}

interface AppError {
  type: ErrorType
  message: string
  messageEn: string
  messageTh: string
  code: string
  statusCode: number
  context?: Record<string, any>
  timestamp: string
}
```

### Error Handling Strategy

#### 1. Database Layer (Atomic Functions)

```sql
-- Example error handling in atomic functions
CREATE OR REPLACE FUNCTION create_ride_atomic(...)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $
BEGIN
  -- Validate inputs
  IF p_estimated_fare <= 0 THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: Fare must be positive';
  END IF;
  
  -- Check wallet
  IF v_wallet_balance < v_final_fare THEN
    RAISE EXCEPTION 'INSUFFICIENT_BALANCE: Balance %.2f, Required %.2f', 
      v_wallet_balance, v_final_fare;
  END IF;
  
  -- Perform operations
  -- ...
  
  RETURN result;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log error
    INSERT INTO error_log (error_type, error_message, context)
    VALUES ('DATABASE_ERROR', SQLERRM, jsonb_build_object(
      'function', 'create_ride_atomic',
      'user_id', p_user_id,
      'fare', p_estimated_fare
    ));
    
    -- Re-raise with context
    RAISE;
END;
$;
```

#### 2. Business Logic Layer (Composables)

```typescript
// src/lib/errorHandler.ts
export class AppError extends Error {
  constructor(
    public type: ErrorType,
    public messageEn: string,
    public messageTh: string,
    public code: string,
    public statusCode: number,
    public context?: Record<string, any>
  ) {
    super(messageEn)
    this.name = 'AppError'
    this.timestamp = new Date().toISOString()
  }
}

export function handleRpcError(error: any): AppError {
  const message = error.message || 'Unknown error'
  
  // Parse error type from message
  if (message.includes('INSUFFICIENT_BALANCE')) {
    return new AppError(
      ErrorType.INSUFFICIENT_BALANCE,
      'Insufficient wallet balance',
      'ยอดเงินในกระเป๋าไม่เพียงพอ',
      'ERR_WALLET_001',
      400,
      { originalError: message }
    )
  }
  
  if (message.includes('RIDE_ALREADY_ACCEPTED')) {
    return new AppError(
      ErrorType.CONFLICT,
      'This ride has already been accepted by another provider',
      'งานนี้ถูกรับโดยผู้ให้บริการคนอื่นแล้ว',
      'ERR_RIDE_001',
      409,
      { originalError: message }
    )
  }
  
  // Default error
  return new AppError(
    ErrorType.INTERNAL_ERROR,
    'An unexpected error occurred',
    'เกิดข้อผิดพลาดที่ไม่คาดคิด',
    'ERR_INTERNAL_001',
    500,
    { originalError: message }
  )
}

// Usage in composables
export function useCustomerBooking(serviceType: ServiceType) {
  const error = ref<AppError | null>(null)
  
  async function createRequest(params: CreateRequestParams) {
    try {
      const { data, error: rpcError } = await supabase.rpc(...)
      
      if (rpcError) {
        const appError = handleRpcError(rpcError)
        error.value = appError
        
        // Log to monitoring service
        logError(appError)
        
        // Show user-friendly message
        showToast(appError.messageTh, 'error')
        
        throw appError
      }
      
      return data
    } catch (err) {
      if (err instanceof AppError) {
        throw err
      }
      
      // Unexpected error
      const appError = new AppError(
        ErrorType.INTERNAL_ERROR,
        'An unexpected error occurred',
        'เกิดข้อผิดพลาดที่ไม่คาดคิด',
        'ERR_INTERNAL_001',
        500,
        { originalError: err }
      )
      
      error.value = appError
      logError(appError)
      throw appError
    }
  }
  
  return { error, createRequest }
}
```

#### 3. Retry Strategy

```typescript
// src/lib/retry.ts
interface RetryOptions {
  maxAttempts: number
  initialDelay: number
  maxDelay: number
  backoffMultiplier: number
  retryableErrors: ErrorType[]
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  let lastError: Error
  let delay = options.initialDelay
  
  for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error as Error
      
      // Check if error is retryable
      if (error instanceof AppError && 
          !options.retryableErrors.includes(error.type)) {
        throw error
      }
      
      // Last attempt, don't retry
      if (attempt === options.maxAttempts) {
        throw error
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, delay))
      
      // Exponential backoff
      delay = Math.min(delay * options.backoffMultiplier, options.maxDelay)
      
      console.log(`Retry attempt ${attempt}/${options.maxAttempts} after ${delay}ms`)
    }
  }
  
  throw lastError!
}

// Usage
const result = await withRetry(
  () => supabase.rpc('create_ride_atomic', params),
  {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 5000,
    backoffMultiplier: 2,
    retryableErrors: [ErrorType.NETWORK_ERROR, ErrorType.TIMEOUT_ERROR]
  }
)
```

#### 4. Circuit Breaker Pattern

```typescript
// src/lib/circuitBreaker.ts
enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Failing, reject requests
  HALF_OPEN = 'HALF_OPEN' // Testing if recovered
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED
  private failureCount = 0
  private successCount = 0
  private lastFailureTime: number | null = null
  
  constructor(
    private threshold: number = 5,
    private timeout: number = 60000,
    private halfOpenAttempts: number = 3
  ) {}
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() - this.lastFailureTime! > this.timeout) {
        this.state = CircuitState.HALF_OPEN
        this.successCount = 0
      } else {
        throw new AppError(
          ErrorType.INTERNAL_ERROR,
          'Service temporarily unavailable',
          'บริการไม่พร้อมใช้งานชั่วคราว',
          'ERR_CIRCUIT_OPEN',
          503
        )
      }
    }
    
    try {
      const result = await operation()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }
  
  private onSuccess(): void {
    this.failureCount = 0
    
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++
      if (this.successCount >= this.halfOpenAttempts) {
        this.state = CircuitState.CLOSED
      }
    }
  }
  
  private onFailure(): void {
    this.failureCount++
    this.lastFailureTime = Date.now()
    
    if (this.failureCount >= this.threshold) {
      this.state = CircuitState.OPEN
    }
  }
}

// Usage
const rideServiceCircuit = new CircuitBreaker(5, 60000, 3)

async function createRide(params: CreateRequestParams) {
  return await rideServiceCircuit.execute(async () => {
    const { data, error } = await supabase.rpc('create_ride_atomic', params)
    if (error) throw handleRpcError(error)
    return data
  })
}
```

### Error Recovery Strategies

| Error Type | Recovery Strategy | User Experience |
|------------|------------------|-----------------|
| INSUFFICIENT_BALANCE | Prompt user to top up wallet | Show wallet balance and top-up button |
| RIDE_ALREADY_ACCEPTED | Refresh available rides list | Show "This ride was just taken" message |
| NETWORK_ERROR | Retry with exponential backoff | Show loading indicator, retry automatically |
| TIMEOUT_ERROR | Retry with exponential backoff | Show "Taking longer than usual" message |
| VALIDATION_ERROR | Show validation message | Highlight invalid fields |
| AUTHORIZATION_ERROR | Redirect to login | Show "Session expired" message |
| DATABASE_ERROR | Log and show generic error | Show "Something went wrong" with support contact |

## Testing Strategy

### 1. Unit Tests

Unit tests verify individual functions and components in isolation.

```typescript
// tests/unit/serviceRegistry.test.ts
import { describe, it, expect } from 'vitest'
import { getServiceDefinition, getAllServiceTypes } from '@/lib/serviceRegistry'

describe('Service Registry', () => {
  it('should return correct service definition for ride', () => {
    const def = getServiceDefinition('ride')
    expect(def.type).toBe('ride')
    expect(def.tableName).toBe('ride_requests')
    expect(def.trackingPrefix).toBe('RID')
    expect(def.hasLocation).toBe(true)
    expect(def.hasDestination).toBe(true)
  })
  
  it('should return all service types', () => {
    const types = getAllServiceTypes()
    expect(types).toContain('ride')
    expect(types).toContain('delivery')
    expect(types).toContain('shopping')
    expect(types).toContain('queue')
    expect(types).toContain('moving')
    expect(types).toContain('laundry')
  })
})
```

### 2. Integration Tests

Integration tests verify cross-role interactions and database operations.

```typescript
// tests/integration/rideBooking.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { createClient } from '@supabase/supabase-js'

describe('Ride Booking Integration', () => {
  let customerClient: SupabaseClient
  let providerClient: SupabaseClient
  let adminClient: SupabaseClient
  
  beforeEach(async () => {
    // Setup test clients with different auth
    customerClient = createTestClient('customer')
    providerClient = createTestClient('provider')
    adminClient = createTestClient('admin')
  })
  
  it('should complete full ride lifecycle', async () => {
    // Customer creates ride
    const { data: ride } = await customerClient.rpc('create_ride_atomic', {
      p_user_id: customerId,
      p_pickup_lat: 13.7563,
      p_pickup_lng: 100.5018,
      p_pickup_address: 'Bangkok',
      p_destination_lat: 13.7467,
      p_destination_lng: 100.5342,
      p_destination_address: 'Siam',
      p_vehicle_type: 'car',
      p_estimated_fare: 100
    })
    
    expect(ride.ride_id).toBeDefined()
    expect(ride.tracking_id).toMatch(/^RID-/)
    
    // Provider sees ride in available list
    const { data: available } = await providerClient
      .from('ride_requests')
      .select('*')
      .eq('status', 'pending')
    
    expect(available).toContainEqual(
      expect.objectContaining({ id: ride.ride_id })
    )
    
    // Provider accepts ride
    const { data: accepted } = await providerClient.rpc('accept_ride_atomic', {
      p_ride_id: ride.ride_id,
      p_provider_id: providerId
    })
    
    expect(accepted.success).toBe(true)
    
    // Customer sees matched status
    const { data: matched } = await customerClient
      .from('ride_requests')
      .select('*')
      .eq('id', ride.ride_id)
      .single()
    
    expect(matched.status).toBe('matched')
    expect(matched.provider_id).toBe(providerId)
    
    // Admin sees ride in monitoring
    const { data: adminView } = await adminClient
      .from('ride_requests')
      .select('*')
      .eq('id', ride.ride_id)
      .single()
    
    expect(adminView).toBeDefined()
    expect(adminView.status).toBe('matched')
  })
})
```

### 3. Property-Based Tests

Property-based tests verify universal properties across many generated inputs.

```typescript
// tests/property/stateTransitions.test.ts
import { describe, it } from 'vitest'
import * as fc from 'fast-check'

describe('State Transition Properties', () => {
  it('Property 3: State Machine Consistency - should only allow valid transitions', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('pending', 'matched', 'arriving', 'picked_up', 'in_progress', 'completed', 'cancelled'),
        fc.constantFrom('pending', 'matched', 'arriving', 'picked_up', 'in_progress', 'completed', 'cancelled'),
        (fromStatus, toStatus) => {
          const isValid = isValidTransition(fromStatus, toStatus)
          const expected = VALID_TRANSITIONS[fromStatus].includes(toStatus)
          return isValid === expected
        }
      ),
      { numRuns: 100 }
    )
  })
  
  it('Property 6: Atomic Acceptance - should prevent double-booking', async () => {
    fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.array(fc.uuid(), { minLength: 2, maxLength: 10 }),
        async (rideId, providerIds) => {
          // Create a pending ride
          await createTestRide(rideId)
          
          // Multiple providers try to accept simultaneously
          const results = await Promise.allSettled(
            providerIds.map(pid => acceptRide(rideId, pid))
          )
          
          // Exactly one should succeed
          const successes = results.filter(r => r.status === 'fulfilled')
          const failures = results.filter(r => r.status === 'rejected')
          
          return successes.length === 1 && failures.length === providerIds.length - 1
        }
      ),
      { numRuns: 100 }
    )
  })
})
```

### 4. End-to-End Tests

E2E tests verify complete user flows across the UI.

```typescript
// tests/e2e/customerRideFlow.spec.ts
import { test, expect } from '@playwright/test'

test('Customer can book and track a ride', async ({ page }) => {
  // Login as customer
  await page.goto('/login')
  await page.fill('[name="phone"]', '0812345678')
  await page.fill('[name="otp"]', '123456')
  await page.click('button[type="submit"]')
  
  // Navigate to ride booking
  await page.click('text=เรียกรถ')
  
  // Enter pickup location
  await page.fill('[placeholder="ต้นทาง"]', 'Bangkok')
  await page.click('text=Bangkok, Thailand')
  
  // Enter destination
  await page.fill('[placeholder="ปลายทาง"]', 'Siam')
  await page.click('text=Siam, Bangkok')
  
  // Select vehicle type
  await page.click('text=รถเก๋ง')
  
  // Confirm booking
  await page.click('text=ยืนยันการจอง')
  
  // Wait for matching
  await expect(page.locator('text=กำลังหาคนขับ')).toBeVisible()
  
  // Simulate provider acceptance (via API)
  // ...
  
  // Verify matched status
  await expect(page.locator('text=พบคนขับแล้ว')).toBeVisible()
  await expect(page.locator('[data-testid="provider-name"]')).toBeVisible()
  await expect(page.locator('[data-testid="provider-phone"]')).toBeVisible()
})
```

### 5. Performance Tests

```typescript
// tests/performance/concurrentAcceptance.test.ts
import { describe, it, expect } from 'vitest'

describe('Performance Tests', () => {
  it('should handle 100 concurrent ride acceptances', async () => {
    const startTime = Date.now()
    
    // Create 100 pending rides
    const rides = await Promise.all(
      Array.from({ length: 100 }, () => createTestRide())
    )
    
    // 100 providers try to accept simultaneously
    const results = await Promise.all(
      rides.map((ride, i) => acceptRide(ride.id, `provider-${i}`))
    )
    
    const endTime = Date.now()
    const duration = endTime - startTime
    
    // All should succeed
    expect(results.every(r => r.success)).toBe(true)
    
    // Should complete within 5 seconds
    expect(duration).toBeLessThan(5000)
  })
})
```

### Test Coverage Requirements

- **Unit Tests**: 80% code coverage minimum
- **Integration Tests**: All critical paths (create, accept, complete, cancel)
- **Property Tests**: All correctness properties (36 properties)
- **E2E Tests**: All user flows for each role
- **Performance Tests**: Concurrent operations, large datasets

### Continuous Integration

```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test:unit
      
      - name: Run integration tests
        run: npm run test:integration
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_KEY: ${{ secrets.SUPABASE_KEY }}
      
      - name: Run property tests
        run: npm run test:property
      
      - name: Run E2E tests
        run: npm run test:e2e
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

