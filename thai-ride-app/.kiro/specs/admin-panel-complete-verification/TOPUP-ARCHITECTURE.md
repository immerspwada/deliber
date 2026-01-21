# Admin Topup Requests - Architecture

## System Flow

```
┌─────────────┐
│  Customer   │
│   (User)    │
└──────┬──────┘
       │
       │ 1. Create topup request
       │    (with payment proof)
       ▼
┌─────────────────────────────────┐
│   topup_requests table          │
│                                 │
│  - id                           │
│  - user_id                      │
│  - amount                       │
│  - payment_method               │
│  - payment_reference            │
│  - payment_proof_url ✨ NEW     │
│  - status (pending)             │
│  - requested_at ✨ NEW          │
│  - processed_at ✨ NEW          │
│  - processed_by ✨ NEW          │
│  - rejection_reason ✨ NEW      │
└─────────────────────────────────┘
       │
       │ 2. Admin views requests
       ▼
┌─────────────────────────────────┐
│  get_topup_requests_admin()     │
│  (RPC Function)                 │
│                                 │
│  - Checks admin role            │
│  - Joins with users table       │
│  - Joins with wallets table     │
│  - Returns formatted data       │
└─────────────────────────────────┘
       │
       │ 3. Display in admin panel
       ▼
┌─────────────────────────────────┐
│  AdminTopupRequestsView.vue     │
│                                 │
│  - Stats cards                  │
│  - Filter by status             │
│  - Table with requests          │
│  - Approve/Reject buttons       │
│  - Image viewer                 │
└─────────────────────────────────┘
       │
       │ 4. Admin approves/rejects
       ▼
┌─────────────────────────────────┐
│  approve_topup_request() or     │
│  reject_topup_request()         │
│  (RPC Functions)                │
│                                 │
│  - Checks admin role            │
│  - Updates topup status         │
│  - Updates wallet (if approved) │
│  - Sends notification           │
└─────────────────────────────────┘
       │
       │ 5. Notification sent
       ▼
┌─────────────┐
│  Customer   │
│  (Notified) │
└─────────────┘
```

## Data Flow

### Before Fix (❌ Broken)

```
RPC Function expects:
- requested_at
- processed_at
- processed_by
- rejection_reason
- payment_proof_url

Table has:
- created_at
- approved_at / rejected_at
- admin_id
- admin_note
- slip_image_url

Result: Column mismatch → Query fails → Page breaks
```

### After Fix (✅ Working)

```
RPC Function expects:
- requested_at ✅
- processed_at ✅
- processed_by ✅
- rejection_reason ✅
- payment_proof_url ✅

Table has:
- requested_at ✅ (backfilled from created_at)
- processed_at ✅ (backfilled from approved_at/rejected_at)
- processed_by ✅ (backfilled from admin_id)
- rejection_reason ✅ (backfilled from admin_note)
- payment_proof_url ✅ (backfilled from slip_image_url)
+ Old columns kept for compatibility

Result: All columns exist → Query succeeds → Page works
```

## Component Architecture

```
┌────────────────────────────────────────────────────────┐
│  AdminTopupRequestsView.vue                            │
│                                                        │
│  ┌──────────────────────────────────────────────┐    │
│  │  Stats Cards                                  │    │
│  │  - Pending count & amount                     │    │
│  │  - Approved count & amount                    │    │
│  │  - Rejected count                             │    │
│  │  - Today's approved count & amount            │    │
│  └──────────────────────────────────────────────┘    │
│                                                        │
│  ┌──────────────────────────────────────────────┐    │
│  │  Filter                                       │    │
│  │  - All / Pending / Approved / Rejected        │    │
│  └──────────────────────────────────────────────┘    │
│                                                        │
│  ┌──────────────────────────────────────────────┐    │
│  │  Table                                        │    │
│  │  - Customer info                              │    │
│  │  - Amount & wallet balance                    │    │
│  │  - Payment method & reference                 │    │
│  │  - Payment proof (image)                      │    │
│  │  - Status badge                               │    │
│  │  - Dates                                      │    │
│  │  - Action buttons (Approve/Reject)            │    │
│  └──────────────────────────────────────────────┘    │
│                                                        │
│  ┌──────────────────────────────────────────────┐    │
│  │  Modals                                       │    │
│  │  - Approve confirmation                       │    │
│  │  - Reject with reason                         │    │
│  │  - Image viewer                               │    │
│  └──────────────────────────────────────────────┘    │
└────────────────────────────────────────────────────────┘
                        │
                        │ uses
                        ▼
┌────────────────────────────────────────────────────────┐
│  useAdminTopupRequests.ts                              │
│                                                        │
│  State:                                                │
│  - topupRequests[]                                     │
│  - loading                                             │
│  - error                                               │
│  - totalCount                                          │
│                                                        │
│  Computed:                                             │
│  - pendingRequests                                     │
│  - approvedRequests                                    │
│  - rejectedRequests                                    │
│  - totalPendingAmount                                  │
│                                                        │
│  Methods:                                              │
│  - fetchTopupRequests()                                │
│  - fetchCount()                                        │
│  - approveTopup()                                      │
│  - rejectTopup()                                       │
│                                                        │
│  Helpers:                                              │
│  - formatCurrency()                                    │
│  - formatDate()                                        │
│  - getStatusLabel()                                    │
│  - getStatusColor()                                    │
│  - getPaymentMethodLabel()                             │
└────────────────────────────────────────────────────────┘
                        │
                        │ calls
                        ▼
┌────────────────────────────────────────────────────────┐
│  Supabase RPC Functions                                │
│                                                        │
│  - get_topup_requests_admin(status, limit, offset)    │
│  - count_topup_requests_admin(status)                  │
│  - approve_topup_request(request_id, admin_id, note)   │
│  - reject_topup_request(request_id, admin_id, note)    │
└────────────────────────────────────────────────────────┘
```

## Database Schema

### topup_requests Table

```sql
CREATE TABLE topup_requests (
  -- Primary
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),

  -- Amount & Payment
  amount DECIMAL(12,2),
  payment_method VARCHAR(30),
  payment_reference VARCHAR(100),

  -- Images (dual columns for compatibility)
  slip_image_url TEXT,           -- Old column (kept)
  payment_proof_url TEXT,         -- New column ✨

  -- Status
  status VARCHAR(20),             -- pending/approved/rejected

  -- Timestamps (dual columns for compatibility)
  created_at TIMESTAMPTZ,         -- Old column (kept)
  requested_at TIMESTAMPTZ,       -- New column ✨
  approved_at TIMESTAMPTZ,        -- Old column (kept)
  rejected_at TIMESTAMPTZ,        -- Old column (kept)
  processed_at TIMESTAMPTZ,       -- New column ✨

  -- Admin info (dual columns for compatibility)
  admin_id UUID,                  -- Old column (kept)
  processed_by UUID,              -- New column ✨
  admin_note TEXT,                -- Old column (kept)
  rejection_reason TEXT,          -- New column ✨

  -- Other
  tracking_id VARCHAR(25),
  expires_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### Indexes

```sql
-- Existing indexes
idx_topup_requests_user
idx_topup_requests_status
idx_topup_requests_created
idx_topup_requests_tracking

-- New indexes ✨
idx_topup_requests_requested_at
idx_topup_requests_processed_at
idx_topup_requests_processed_by
```

## Security Model

```
┌─────────────────────────────────────────────────────┐
│  RLS Policies                                       │
│                                                     │
│  - Allow all (for now)                              │
│  - TODO: Restrict to admin + own user               │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│  RPC Functions (SECURITY DEFINER)                   │
│                                                     │
│  1. Check if user is admin                          │
│  2. If not admin → RAISE EXCEPTION                  │
│  3. If admin → Execute query                        │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│  Admin Role Check                                   │
│                                                     │
│  SELECT 1 FROM profiles                             │
│  WHERE id = auth.uid()                              │
│    AND role = 'admin'                               │
└─────────────────────────────────────────────────────┘
```

## Error Handling

```
┌─────────────────────────────────────────────────────┐
│  Frontend (Vue Component)                           │
│                                                     │
│  try {                                              │
│    await composable.approveTopup(id)                │
│  } catch (err) {                                    │
│    // Show error toast                              │
│    // Log to console                                │
│  }                                                  │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│  Composable (useAdminTopupRequests)                 │
│                                                     │
│  try {                                              │
│    const { data, error } = await supabase.rpc(...)  │
│    if (error) throw error                           │
│    if (!data[0].success) throw new Error(...)       │
│  } catch (err) {                                    │
│    handleError(err)                                 │
│    showError('ไม่สามารถอนุมัติได้')                 │
│    return { success: false, message: err.message }  │
│  }                                                  │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│  RPC Function (Database)                            │
│                                                     │
│  IF NOT admin THEN                                  │
│    RAISE EXCEPTION 'Access denied'                  │
│  END IF;                                            │
│                                                     │
│  IF status != 'pending' THEN                        │
│    RETURN { success: false, message: '...' }        │
│  END IF;                                            │
└─────────────────────────────────────────────────────┘
```

## Performance Considerations

### Query Optimization

- ✅ Indexes on frequently queried columns
- ✅ Limit results with pagination
- ✅ Filter at database level (not frontend)
- ✅ Use INNER JOIN for required relations
- ✅ Use LEFT JOIN for optional relations

### Frontend Optimization

- ✅ Lazy load images
- ✅ Debounce filter changes
- ✅ Cache formatted values
- ✅ Virtual scrolling for large lists (future)
- ✅ Optimistic UI updates

### Database Optimization

- ✅ Proper indexes
- ✅ Efficient queries
- ✅ Connection pooling
- ✅ Query result caching (future)
