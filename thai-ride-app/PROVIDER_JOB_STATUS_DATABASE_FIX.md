# Provider Job Status Database Fix

## 🚨 Critical Issue Fixed

### Problem

Database constraint violation error:

```
new row for relation "ride_requests" violates check constraint "ride_requests_status_check"
```

### Root Cause

**Frontend was using incorrect status values that don't exist in database!**

#### Database CHECK Constraint (Actual Values):

```sql
CHECK (status IN ('pending', 'matched', 'pickup', 'in_progress', 'completed', 'cancelled'))
```

#### Frontend Was Trying to Use (WRONG):

- `'accepted'` ❌ (doesn't exist in database)
- `'arrived'` ❌ (doesn't exist in database)

## ✅ Solution Applied

### 1. Fixed `src/composables/useJobStatusFlow.ts`

**Changed STATUS_FLOW keys to match ACTUAL database values:**

```typescript
// ❌ BEFORE (WRONG)
export const STATUS_FLOW: StatusStep[] = [
  { key: 'accepted', ... },   // ❌ Not in database!
  { key: 'arrived', ... },    // ❌ Not in database!
  { key: 'in_progress', ... },
  { key: 'completed', ... }
]

// ✅ AFTER (CORRECT)
export const STATUS_FLOW: StatusStep[] = [
  { key: 'matched', ... },      // ✅ Actual database value
  { key: 'pickup', ... },       // ✅ Actual database value
  { key: 'in_progress', ... },  // ✅ Actual database value
  { key: 'completed', ... }     // ✅ Actual database value
]
```

**Fixed STATUS_ALIASES mapping:**

```typescript
// ❌ BEFORE (WRONG - mapped TO non-existent values)
const STATUS_ALIASES: Record<string, string> = {
  matched: "accepted", // ❌ Maps TO non-existent value
  pickup: "arrived", // ❌ Maps TO non-existent value
};

// ✅ AFTER (CORRECT - maps FROM aliases TO actual database values)
const STATUS_ALIASES: Record<string, string> = {
  accepted: "matched", // ✅ Maps FROM alias TO database value
  arrived: "pickup", // ✅ Maps FROM alias TO database value
};
```

**Fixed nextDbStatus to return actual database value:**

```typescript
// ❌ BEFORE
const nextDbStatus = computed(() => {
  if (!nextStep.value) return null;
  return nextStep.value.dbStatus[0]; // Could return alias!
});

// ✅ AFTER
const nextDbStatus = computed(() => {
  if (!nextStep.value) return null;
  return nextStep.value.key; // Returns actual database value
});
```

### 2. Fixed `src/views/provider/ProviderJobDetailView.vue`

**Updated all status checks to use correct database values:**

```typescript
// ❌ BEFORE
if (newStatus === "arrived") {
  // ❌ Not in database
  updateData.arrived_at = new Date().toISOString();
}

// ✅ AFTER
if (newStatus === "pickup") {
  // ✅ Actual database value
  updateData.arrived_at = new Date().toISOString();
}
```

**Updated status arrays in computed properties:**

```typescript
// ✅ CORRECT - Primary database values first, aliases for backward compatibility
if (
  ["matched", "pickup", "accepted", "offered", "confirmed", "arrived"].includes(
    status
  )
) {
  // Navigate to pickup
}
```

### 3. Verified `src/composables/useURLTracking.ts`

Already using correct database values! ✅

```typescript
provider_job: {
  'matched': '1-matched',          // ✅ Correct
  'pickup': '2-pickup',            // ✅ Correct
  'in_progress': '3-in-progress',  // ✅ Correct
  'completed': '4-completed',      // ✅ Correct
}
```

## 📊 Database Schema Reference

From `supabase/migrations/customer/001_rides.sql`:

```sql
status VARCHAR(20) DEFAULT 'pending'
CHECK (status IN (
  'pending',      -- รอดำเนินการ
  'matched',      -- จับคู่แล้ว (Provider รับงาน)
  'pickup',       -- ถึงจุดรับแล้ว
  'in_progress',  -- กำลังเดินทาง (รับลูกค้าแล้ว)
  'completed',    -- เสร็จสิ้น
  'cancelled'     -- ยกเลิก
))
```

## 🔄 Status Flow (Corrected)

```
pending → matched → pickup → in_progress → completed
   ↓         ↓        ↓           ↓
cancelled cancelled cancelled  cancelled
```

### UI Labels (Thai):

1. **matched** = "รับงานแล้ว" → Action: "ถึงจุดรับแล้ว"
2. **pickup** = "ถึงจุดรับแล้ว" → Action: "รับลูกค้าแล้ว"
3. **in_progress** = "กำลังเดินทาง" → Action: "ส่งลูกค้าสำเร็จ"
4. **completed** = "เสร็จสิ้น"

## 🧪 Testing

### Test URL:

```
http://localhost:5173/provider/job/[JOB_ID]?status=matched&step=1-matched&timestamp=...
```

### Expected Behavior:

1. ✅ Page loads without errors
2. ✅ Status button shows "ถึงจุดรับแล้ว" (next action)
3. ✅ Clicking button updates status to `'pickup'` (not `'arrived'`)
4. ✅ No database constraint violation errors
5. ✅ URL updates to `?status=pickup&step=2-pickup`

### Test Status Updates:

```typescript
// Test sequence
matched → pickup → in_progress → completed
```

Each update should:

- ✅ Update database successfully
- ✅ Update URL parameters
- ✅ Show correct UI labels
- ✅ Enable/disable buttons correctly

## 🎯 Key Takeaways

1. **Always use actual database enum values** - Never create aliases that don't exist in DB
2. **STATUS_FLOW keys MUST match database values** - These are used for updates
3. **Aliases map FROM alternative names TO database values** - Not the other way around
4. **nextDbStatus must return the key** - The key IS the database value
5. **Check database schema first** - Before implementing status logic

## 📝 Files Modified

1. ✅ `src/composables/useJobStatusFlow.ts` - Fixed status flow and aliases
2. ✅ `src/views/provider/ProviderJobDetailView.vue` - Updated status checks
3. ✅ `src/types/ride-requests.ts` - Already correct
4. ✅ `src/composables/useURLTracking.ts` - Already correct

## 🚀 Next Steps

1. Test the status update flow in browser
2. Verify no database errors in console
3. Check URL updates correctly
4. Verify realtime updates work
5. Test complete flow: matched → pickup → in_progress → completed

---

**Status**: ✅ FIXED - Ready for testing
**Date**: 2026-01-15
**Impact**: Critical - Fixes database constraint violation preventing status updates
