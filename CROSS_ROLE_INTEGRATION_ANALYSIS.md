# Cross-Role Integration Architecture Analysis
## Thai Ride Hailing App - System Decoupling Architecture

**Analysis Date**: 2024-12-19  
**Scope**: Customer, Provider, and Admin role integration  
**Status**: ✅ COMPREHENSIVE ARCHITECTURE IMPLEMENTED

---

## Executive Summary

The Thai Ride Hailing App has successfully implemented a **unified cross-role integration architecture** that eliminates siloed development. The system follows a **4-Layer Impact Rule** ensuring every feature works cohesively across Customer, Provider, and Admin roles:

1. **Layer 1: Database & Schema** - Unified service request pattern with atomic operations
2. **Layer 2: Business Logic** - Role-specific composables with shared utilities
3. **Layer 3: API/RPC Layer** - Atomic functions with SECURITY DEFINER for consistency
4. **Layer 4: Real-time Sync** - Realtime subscriptions and notifications across roles

---

## Architecture Overview

### High-Level System Design

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                           │
├─────────────────────────────────────────────────────────────────┤
│  Customer App    │    Provider App    │    Admin Dashboard     │
│  - RideView      │    - JobsView      │    - OrdersView        │
│  - DeliveryView  │    - ActiveRide    │    - ProvidersView     │
│  - ShoppingView  │    - Earnings      │    - Analytics         │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   BUSINESS LOGIC LAYER                          │
├─────────────────────────────────────────────────────────────────┤
│  useCustomerBooking  │  useProviderJobPool  │  useAdminService  │
│  - Create requests   │  - Accept jobs       │  - Manage all     │
│  - Track status      │  - Update status     │  - Monitor        │
│  - Cancel/Rate       │  - Complete jobs     │  - Analytics      │
│                                                                  │
│  Shared: useServices, useRealtime, useNotifications            │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API/RPC LAYER                              │
├─────────────────────────────────────────────────────────────────┤
│  Atomic Functions (SECURITY DEFINER)                            │
│  - create_*_atomic()    - accept_*_atomic()                     │
│  - complete_*_atomic()  - cancel_*_atomic()                     │
│                                                                  │
│  Service Registry: Unified service type definitions             │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     DATABASE LAYER                              │
├─────────────────────────────────────────────────────────────────┤
│  Core Tables          Service Tables         Support Tables     │
│  - users              - ride_requests         - wallet_holds    │
│  - service_providers  - delivery_requests     - notifications   │
│  - user_wallets       - shopping_requests     - ratings         │
│                       - queue_bookings                           │
│                       - moving_requests                          │
│                       - laundry_requests                         │
│                                                                  │
│  RLS: Customer (own), Provider (assigned/available), Admin (all)│
│  Realtime: Enabled on all service request tables                │
└─────────────────────────────────────────────────────────────────┘
```

---

## 1. Database Layer Architecture

### 1.1 Unified Service Request Schema Pattern

All service types (Ride, Delivery, Shopping, Queue, Moving, Laundry) follow a consistent base schema:

**Core Columns (All Services)**:
- `id` - UUID primary key
- `tracking_id` - Unique tracking identifier (RID-, DEL-, SHP-, QUE-, MOV-, LAU-)
- `user_id` - Customer reference
- `provider_id` - Provider reference (NULL until matched)
- `status` - Unified status (pending → matched → in_progress → completed/cancelled)
- `estimated_fare` - Initial fare estimate
- `actual_fare` - Final fare (set on completion)
- `created_at`, `matched_at`, `completed_at`, `cancelled_at` - Timestamps
- `cancelled_by`, `cancelled_by_role`, `cancel_reason` - Cancellation tracking

**Service-Specific Columns**:
- Ride: `vehicle_type`, `passenger_count`
- Delivery: `package_size`, `package_weight`, `recipient_name`, `delivery_proof_photo`
- Shopping: `store_name`, `shopping_list`, `items_total`
- Queue: `place_name`, `appointment_time`, `queue_position`
- Moving: `moving_type`, `helpers_count`, `floor_from`, `floor_to`
- Laundry: `service_type`, `weight_kg`, `special_instructions`

### 1.2 Wallet Hold System

**Purpose**: Prevent double-spending and ensure funds are available before service completion

**Flow**:
1. Customer creates request → Funds held in `wallet_holds` table
2. Provider accepts → Hold remains
3. Service completes → Hold settled, payment transferred
4. Service cancelled → Hold released, funds returned

**Key Table**: `wallet_holds`
- Tracks held amount per request
- Status: `held` → `settled` or `released`
- Supports all service types via `request_type` field

### 1.3 RLS Policies (Row-Level Security)

**Customer Policy**:
```sql
-- View own requests only
SELECT: auth.uid() = user_id
INSERT: auth.uid() = user_id
UPDATE: auth.uid() = user_id (limited fields)
```

**Provider Policy**:
```sql
-- View assigned requests + available (pending with no provider)
SELECT: auth.uid() = provider_id OR (status = 'pending' AND provider_id IS NULL)
UPDATE: auth.uid() = provider_id (only assigned requests)
```

**Admin Policy**:
```sql
-- View and manage all requests
SELECT: EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
ALL: Same condition
```

### 1.4 Realtime Subscriptions

**Enabled Tables**:
- `ride_requests`, `delivery_requests`, `shopping_requests`
- `queue_bookings`, `moving_requests`, `laundry_requests`
- `wallet_holds`, `user_notifications`

**Subscription Patterns**:
- Customer: Subscribes to own request updates
- Provider: Subscribes to new jobs + current job updates
- Admin: Subscribes to all requests for monitoring

---

## 2. Business Logic Layer

### 2.1 Customer Composable: `useCustomerBooking`

**Responsibilities**:
- Create service requests with wallet validation
- Subscribe to real-time status updates
- Cancel requests with refund handling
- Track provider information

**Key Methods**:
```typescript
createRequest(params)          // Calls create_*_atomic()
fetchRequest(requestId)        // Get full request details
subscribeToRequestUpdates()    // Realtime subscription
cancelRequest(reason)          // Calls cancel_request_atomic()
```

**Data Flow**:
1. User enters request details
2. `createRequest()` calls `create_ride_atomic()` RPC
3. RPC validates wallet, holds funds, creates request
4. Frontend subscribes to updates
5. Realtime broadcasts to nearby providers
6. Customer sees provider info when matched

### 2.2 Provider Composable: `useProviderJobPool`

**Responsibilities**:
- Load available jobs filtered by location and service type
- Subscribe to new job notifications
- Accept jobs with race-condition prevention
- Update job status and complete jobs

**Key Methods**:
```typescript
loadAvailableJobs()            // Initial load with distance filtering
subscribeToNewJobs()           // Realtime subscription to new jobs
acceptJob(requestId, type)     // Calls accept_*_atomic()
updateJobStatus(status)        // Update current job status
completeJob(actualFare)        // Calls complete_*_atomic()
```

**Race Condition Prevention**:
- Uses `FOR UPDATE NOWAIT` lock in database
- If job already accepted, returns `ALREADY_ACCEPTED` error
- Frontend removes job from list immediately

**Distance Filtering**:
- Calculates Haversine distance from provider location
- Only shows jobs within 5km radius
- Sorts by distance for optimal routing

### 2.3 Admin Composable: `useAdminServiceManagement`

**Responsibilities**:
- Fetch all requests across all service types
- Filter and search requests
- Update request status with audit logging
- Cancel requests and issue refunds
- Generate analytics

**Key Methods**:
```typescript
fetchAllRequests(filters)      // Unified view of all services
getRequestDetails(id, type)    // Full request with relationships
updateRequestStatus(id, type, status)  // With audit logging
cancelRequestAsAdmin(id, type, reason) // With refund option
issueRefund(id, type, amount)  // Direct refund
getAnalytics(dateRange)        // Dashboard metrics
```

**Unified View**:
- Queries all service tables
- Merges results with service type metadata
- Supports filtering by status, provider, customer, date range

---

## 3. API/RPC Layer - Atomic Functions

### 3.1 Create Functions Pattern

**Function**: `create_*_atomic()`  
**Security**: SECURITY DEFINER (runs as database owner)  
**Atomicity**: Single transaction, all-or-nothing

**Steps**:
1. Validate input parameters
2. Lock wallet row (FOR UPDATE)
3. Check wallet balance
4. Apply promo code if provided
5. Generate tracking ID
6. Insert request record
7. Hold wallet funds
8. Notify nearby providers
9. Return result with request ID

**Error Handling**:
- `WALLET_NOT_FOUND` - User has no wallet
- `INSUFFICIENT_BALANCE` - Not enough funds
- `VALIDATION_ERROR` - Invalid input parameters

**Example**: `create_ride_atomic()`
```sql
-- Validates vehicle type, passenger count
-- Holds estimated fare in wallet_holds
-- Notifies drivers within 5km radius
-- Returns: { ride_id, tracking_id, estimated_fare, wallet_held }
```

### 3.2 Accept Functions Pattern

**Function**: `accept_*_atomic()`  
**Race Condition Prevention**: FOR UPDATE NOWAIT lock

**Steps**:
1. Lock request row with NOWAIT (fail if already locked)
2. Check if status is still 'pending'
3. Update status to 'matched'
4. Set provider_id
5. Update provider status to 'busy'
6. Log status change in audit log
7. Notify customer with provider details
8. Return success

**Error Handling**:
- `lock_not_available` → `ALREADY_ACCEPTED`
- `status != 'pending'` → `ALREADY_ACCEPTED`
- `provider_not_found` → `PROVIDER_NOT_FOUND`

### 3.3 Complete Functions Pattern

**Function**: `complete_*_atomic()`  
**Payment Settlement**: Atomic transfer of funds

**Steps**:
1. Get request details (locked)
2. Calculate final fare and platform fee
3. Update request status to 'completed'
4. Release wallet hold
5. Transfer earnings to provider
6. Record transaction
7. Award loyalty points
8. Trigger rating request notification
9. Log audit trail
10. Return settlement details

**Calculations**:
- Platform fee: 20% of final fare
- Provider earnings: Final fare - platform fee
- Refund: If actual_fare < estimated_fare

### 3.4 Cancel Functions Pattern

**Function**: `cancel_request_atomic()`  
**Flexibility**: Supports cancellation by customer, provider, or admin

**Steps**:
1. Validate cancellation role and permissions
2. Check if request can be cancelled (not already completed)
3. Update status to 'cancelled'
4. Release wallet hold
5. Issue refund if applicable
6. Apply cancellation fee if applicable
7. Log cancellation with reason
8. Notify all affected parties
9. Return cancellation details

---

## 4. Service Registry System

### 4.1 Service Definition Structure

**File**: `src/lib/serviceRegistry.ts`

**Purpose**: Single source of truth for all service types

**Definition Fields**:
```typescript
interface ServiceDefinition {
  type: ServiceType                    // 'ride', 'delivery', etc.
  displayName: string                  // English name
  displayNameTh: string                // Thai name
  icon: string                         // Icon identifier
  color: string                        // Brand color
  tableName: string                    // Database table
  trackingPrefix: string               // Tracking ID prefix
  hasPickupLocation: boolean           // Location support
  hasDestination: boolean              // Destination support
  specificFields: string[]             // Service-specific columns
  validStatuses: RequestStatus[]       // Allowed statuses
  atomicFunctions: {                   // RPC function names
    create: string
    accept: string
    complete: string
    cancel: string
  }
  providerType: string                 // Provider role name
  providerTypeTh: string               // Thai provider name
}
```

### 4.2 Service Types Registered

| Service | Table | Prefix | Provider Type | Status |
|---------|-------|--------|---------------|--------|
| Ride | ride_requests | RID | driver | ✅ |
| Delivery | delivery_requests | DEL | rider | ✅ |
| Shopping | shopping_requests | SHP | shopper | ✅ |
| Queue | queue_bookings | QUE | queue_agent | ✅ |
| Moving | moving_requests | MOV | mover | ✅ |
| Laundry | laundry_requests | LAU | laundry_provider | ✅ |

### 4.3 Helper Functions

```typescript
getServiceDefinition(type)     // Get definition by type
getAllServiceTypes()           // Get all registered types
getTableName(type)             // Get database table name
getAtomicFunction(type, op)    // Get RPC function name
isValidStatus(type, status)    // Validate status for service
getDisplayName(type, locale)   // Get localized display name
```

---

## 5. State Machine & Validation

### 5.1 Valid Status Transitions

**File**: `src/lib/stateMachine.ts`

**Universal Statuses**:
- `pending` - Waiting for provider acceptance
- `matched` - Provider accepted, on the way
- `arriving` - Provider arriving at pickup
- `picked_up` - Customer/package picked up
- `in_progress` - Service in progress
- `completed` - Service completed
- `cancelled` - Service cancelled

**Service-Specific Statuses**:
- Delivery: `delivering` (in transit to destination)
- Shopping: `shopping` (provider shopping)
- Moving: `loading`, `in_transit`, `unloading`
- Laundry: `ready` (laundry ready for delivery)
- Queue: `in_queue`, `waiting`

**Transition Rules**:
```
pending → [matched, cancelled]
matched → [arriving, picked_up, in_progress, cancelled]
arriving → [picked_up, cancelled]
picked_up → [in_progress, delivering, cancelled]
in_progress → [completed, cancelled]
completed → [] (terminal)
cancelled → [] (terminal)
```

### 5.2 Validation Functions

```typescript
isValidTransition(current, next, serviceType)  // Check if allowed
getValidNextStatuses(current, serviceType)     // Get allowed next states
isTerminalStatus(status)                       // Check if final state
isActiveStatus(status)                         // Check if not terminal
validateTransition(current, next)              // Throw if invalid
```

---

## 6. Error Handling System

### 6.1 Error Types

**File**: `src/lib/errorHandler.ts`

**Categories**:
- **Auth Errors**: `AUTH_REQUIRED`, `AUTH_INVALID`, `AUTH_EXPIRED`
- **Validation Errors**: `VALIDATION`, `INVALID_INPUT`, `MISSING_REQUIRED`
- **Business Logic Errors**: `INSUFFICIENT_BALANCE`, `REQUEST_NOT_FOUND`, `ALREADY_ACCEPTED`
- **Provider Errors**: `PROVIDER_NOT_FOUND`, `PROVIDER_UNAVAILABLE`
- **Network Errors**: `NETWORK_ERROR`, `TIMEOUT`, `SERVER_ERROR`
- **Database Errors**: `DB_ERROR`, `CONSTRAINT_VIOLATION`

### 6.2 Error Mapping

**RPC Error → AppError**:
```
'WALLET_NOT_FOUND' → INSUFFICIENT_BALANCE
'INSUFFICIENT_BALANCE' → INSUFFICIENT_BALANCE
'*_NOT_FOUND' → REQUEST_NOT_FOUND
'*_ALREADY_ACCEPTED' → ALREADY_ACCEPTED
'INVALID_STATUS_FOR_COMPLETION' → INVALID_STATUS
```

### 6.3 Bilingual Messages

All errors have Thai and English messages:
```typescript
error.getMessage('th')  // Thai message
error.getMessage('en')  // English message
```

---

## 7. Real-time Synchronization

### 7.1 Subscription Patterns

**Customer Subscription**:
```typescript
// Subscribe to own request updates
channel = supabase
  .channel(`ride:${requestId}`)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'ride_requests',
    filter: `id=eq.${requestId}`
  }, (payload) => {
    // Update local state with new data
    currentRequest.value = payload.new
  })
  .subscribe()
```

**Provider Subscription**:
```typescript
// Subscribe to new jobs
channel = supabase
  .channel(`new_ride_jobs`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'ride_requests',
    filter: 'status=eq.pending'
  }, (payload) => {
    // Add to available jobs if within radius
    availableJobs.value.push(payload.new)
  })
  .subscribe()
```

**Admin Subscription**:
```typescript
// Subscribe to all request updates
channel = supabase
  .channel(`admin_all_requests`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'ride_requests'
  }, (payload) => {
    // Update admin dashboard
    refreshRequestList()
  })
  .subscribe()
```

### 7.2 Notification Flow

**Status Change Notifications**:
1. Provider accepts job → Customer notified with provider details
2. Provider updates status → Customer sees live update
3. Service completed → Customer prompted to rate
4. Admin cancels service → Both customer and provider notified

---

## 8. Cross-Role Integration Flows

### 8.1 Complete Service Lifecycle

```
CUSTOMER CREATES REQUEST
    ↓
[create_*_atomic()]
  - Validate wallet
  - Hold funds
  - Insert request (pending)
  - Notify nearby providers
    ↓
REALTIME: Broadcast to providers
    ↓
PROVIDER SEES IN JOB POOL
  - Filtered by location (5km)
  - Filtered by service type
  - Sorted by distance
    ↓
PROVIDER ACCEPTS
    ↓
[accept_*_atomic()]
  - Check if still pending (race condition)
  - Update to matched
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
  - Update to completed
  - Release wallet hold
  - Transfer earnings
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

### 8.2 Cancellation Flow

```
CUSTOMER/PROVIDER/ADMIN INITIATES CANCEL
    ↓
[cancel_request_atomic()]
  - Validate cancellation role
  - Check if cancellable
  - Update status to cancelled
  - Release wallet hold
  - Issue refund
  - Apply cancellation fee if applicable
  - Log cancellation reason
    ↓
REALTIME: Notify all affected parties
    ↓
CUSTOMER: Sees refund in wallet
PROVIDER: Removed from job pool
ADMIN: Sees cancellation in audit log
```

---

## 9. Key Strengths

### ✅ Unified Architecture
- All service types follow same pattern
- Consistent status flow across services
- Shared utilities reduce duplication

### ✅ Race Condition Prevention
- `FOR UPDATE NOWAIT` locks prevent double-booking
- Atomic functions ensure consistency
- Database-level validation

### ✅ Real-time Synchronization
- Instant updates across all roles
- Realtime subscriptions on all service tables
- Notification system for critical events

### ✅ Role-Based Access Control
- RLS policies enforce data access
- Admin has full visibility
- Customers see only own data
- Providers see assigned + available jobs

### ✅ Comprehensive Error Handling
- Bilingual error messages
- Specific error codes for debugging
- Graceful degradation

### ✅ Audit Trail
- All status changes logged
- Admin actions tracked
- Cancellation reasons recorded

---

## 10. Potential Improvements

### 🔧 Performance Optimization
1. **Caching**: Cache frequently accessed data (service definitions, provider locations)
2. **Query Optimization**: Add composite indexes for common filter combinations
3. **Pagination**: Implement cursor-based pagination for large result sets
4. **Connection Pooling**: Optimize database connection management

### 🔧 Resilience
1. **Offline Support**: Queue operations when offline, sync when reconnected
2. **Retry Logic**: Implement exponential backoff for transient failures
3. **Circuit Breaker**: Prevent cascading failures
4. **Dead Letter Queue**: Handle failed notifications

### 🔧 Monitoring
1. **Performance Metrics**: Track RPC execution times
2. **Error Tracking**: Aggregate error patterns
3. **User Analytics**: Track feature adoption
4. **System Health**: Monitor database performance

### 🔧 Scalability
1. **Sharding**: Partition service tables by date or region
2. **Read Replicas**: Distribute read-heavy queries
3. **Caching Layer**: Redis for hot data
4. **Message Queue**: Decouple notifications from main flow

---

## 11. Compliance Checklist

### ✅ 4-Layer Impact Rule
- [x] Layer 1: Database schema with unified pattern
- [x] Layer 2: Business logic composables per role
- [x] Layer 3: Atomic RPC functions
- [x] Layer 4: Real-time cross-role visibility

### ✅ Admin Rules
- [x] Admin can view all requests
- [x] Admin can modify status
- [x] Admin can cancel and refund
- [x] Admin actions are audited

### ✅ Database Rules
- [x] No mock data - all from database
- [x] Member UID system implemented
- [x] RLS policies enforced
- [x] Realtime enabled

### ✅ Service Types
- [x] Ride (F02)
- [x] Delivery (F03)
- [x] Shopping (F04)
- [x] Queue (F158)
- [x] Moving (F159)
- [x] Laundry (F160)

---

## 12. Conclusion

The Thai Ride Hailing App has successfully implemented a **comprehensive cross-role integration architecture** that:

1. **Eliminates Siloed Development** - All features work across Customer, Provider, and Admin
2. **Ensures Data Consistency** - Atomic operations prevent race conditions
3. **Provides Real-time Sync** - Instant updates across all roles
4. **Maintains Security** - RLS policies enforce proper access control
5. **Supports Extensibility** - New service types can be added following the pattern

The architecture is **production-ready** and provides a solid foundation for platform growth.

---

**Analysis Completed**: 2024-12-19  
**Status**: ✅ COMPREHENSIVE ARCHITECTURE VERIFIED
