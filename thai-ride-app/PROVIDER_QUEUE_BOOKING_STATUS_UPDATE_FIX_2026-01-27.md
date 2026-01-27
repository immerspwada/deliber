# Provider Queue Booking Status Update Fix - 2026-01-27

## 🐛 Issue

Provider couldn't update queue_booking status when clicking "ถึงจุดรับแล้ว" (Arrived at pickup). The status update was failing silently.

### Error Symptoms

```
[JobLayout] Status update failed: ไม่สามารถอัพเดทสถานะได้
```

### Root Cause

The `updateStatus()` function in `useProviderJobDetail.ts` was trying to set `arrived_at` and `started_at` columns on `queue_bookings` table, but these columns **only exist in `ride_requests` table**.

```typescript
// ❌ OLD CODE - Tried to set columns that don't exist in queue_bookings
const updateData: Partial<RideRequestRow> = {
  status: newStatus,
  updated_at: new Date().toISOString(),
};

switch (newStatus) {
  case "pickup":
    updateData.arrived_at = new Date().toISOString(); // ❌ Doesn't exist in queue_bookings
    break;
  case "in_progress":
    updateData.started_at = new Date().toISOString(); // ❌ Doesn't exist in queue_bookings
    break;
}
```

---

## ✅ Solution

Updated `useProviderJobDetail.ts` to handle different table schemas correctly:

### Key Changes

1. **Conditional Timestamp Fields**: Only set `arrived_at`/`started_at` for `ride_requests`
2. **Dynamic Update Object**: Build update data based on table type
3. **Better Logging**: Added `updateData` to console logs for debugging

### Fixed Code

```typescript
// ✅ NEW CODE - Handles both tables correctly
const tableName =
  job.value!.type === "queue" ? "queue_bookings" : "ride_requests";

const updateData: Record<string, any> = {
  status: newStatus,
  updated_at: new Date().toISOString(),
};

// Add status-specific timestamps (only for ride_requests)
if (tableName === "ride_requests") {
  switch (newStatus) {
    case "pickup":
      updateData.arrived_at = new Date().toISOString();
      break;
    case "in_progress":
      updateData.started_at = new Date().toISOString();
      break;
    case "completed":
      updateData.completed_at = new Date().toISOString();
      break;
  }
} else {
  // For queue_bookings, only set completed_at
  if (newStatus === "completed") {
    updateData.completed_at = new Date().toISOString();
  }
}
```

---

## 📊 Table Schema Comparison

### ride_requests (Ride/Delivery)

```sql
CREATE TABLE ride_requests (
  id UUID PRIMARY KEY,
  status TEXT,
  arrived_at TIMESTAMPTZ,      -- ✅ Has this
  started_at TIMESTAMPTZ,      -- ✅ Has this
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  ...
);
```

### queue_bookings (Queue Service)

```sql
CREATE TABLE queue_bookings (
  id UUID PRIMARY KEY,
  status TEXT,
  -- ❌ NO arrived_at column
  -- ❌ NO started_at column
  completed_at TIMESTAMPTZ,    -- ✅ Only has this
  updated_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,    -- ✅ Has this instead
  ...
);
```

---

## 🧪 Testing

### Test Case 1: Queue Booking Status Update

```typescript
// Given: Provider has accepted a queue booking (status: 'confirmed')
// When: Provider clicks "ถึงจุดรับแล้ว"
// Then: Status should update to 'pickup' without errors

Expected Console Output:
[JobDetail] Updating status: {
  table: 'queue_bookings',
  jobId: 'd8ed2c45-ebd6-4e3b-831b-71a581d12bbe',
  jobType: 'queue',
  from: 'confirmed',
  to: 'pickup',
  updateData: { status: 'pickup', updated_at: '2026-01-27T...' }
}
[JobDetail] Status updated successfully: pickup
[JobLayout] Status update success: pickup
```

### Test Case 2: Ride Request Status Update

```typescript
// Given: Provider has accepted a ride (status: 'matched')
// When: Provider clicks "ถึงจุดรับแล้ว"
// Then: Status should update to 'pickup' with arrived_at timestamp

Expected Console Output:
[JobDetail] Updating status: {
  table: 'ride_requests',
  jobId: '...',
  jobType: 'ride',
  from: 'matched',
  to: 'pickup',
  updateData: {
    status: 'pickup',
    arrived_at: '2026-01-27T...',
    updated_at: '2026-01-27T...'
  }
}
[JobDetail] Status updated successfully: pickup
```

---

## 🔍 Status Flow Comparison

### Queue Booking Flow

```
pending → confirmed → pickup → in_progress → completed
          ↑ (confirmed_at)    ↑ (no timestamp)  ↑ (completed_at)
```

### Ride Request Flow

```
pending → matched → pickup → in_progress → completed
                    ↑ (arrived_at)  ↑ (started_at)  ↑ (completed_at)
```

---

## 📝 Files Modified

1. **src/composables/useProviderJobDetail.ts**
   - Fixed `updateStatus()` function
   - Added table-specific timestamp logic
   - Improved logging with `updateData`

---

## ✅ Verification Checklist

- [x] Queue booking status updates work (confirmed → pickup)
- [x] Ride request status updates work (matched → pickup)
- [x] No database errors in console
- [x] Timestamps set correctly for each table type
- [x] Status transitions trigger URL updates
- [x] Toast messages show success feedback

---

## 🎯 Impact

### Before Fix

- ❌ Queue booking status updates failed
- ❌ Provider stuck on "กำลังไปรับลูกค้า" screen
- ❌ Silent database errors
- ❌ Poor user experience

### After Fix

- ✅ Queue booking status updates work perfectly
- ✅ Provider can progress through all job steps
- ✅ Clean database operations
- ✅ Smooth user experience

---

## 🔐 Security Notes

- ✅ RLS policies still enforced (provider can only update their own jobs)
- ✅ Status validation still in place
- ✅ No new security vulnerabilities introduced

---

## 📚 Related Documentation

- [Queue Booking System](QUEUE_BOOKING_COMPLETE_INTEGRATION_2026-01-27.md)
- [Provider Job Views](PROVIDER_JOB_VIEWS_CLEANUP_2026-01-27.md)
- [Database Schema](src/types/database.ts)

---

**Fixed**: 2026-01-27  
**Status**: ✅ Complete  
**Tested**: Queue booking status updates working  
**Deployed**: Ready for production

---

## 💡 Key Takeaway

Always check table schemas before setting columns in updates. Different service types (ride vs queue) may have different database structures even if they share similar workflows.
