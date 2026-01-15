# Provider Job Status Flow - Complete Fix

## 🎯 Problem Identified

**User Report**: Only cancel button showing, no "next step" button visible on job detail page.

**Root Cause**: Database status values didn't match the STATUS_FLOW mapping exactly.

### Database vs Flow Mismatch

**Database Enum** (from `218_provider_system_redesign_schema.sql`):

```sql
CREATE TYPE job_status AS ENUM (
  'pending',
  'offered',
  'accepted',  -- ⚠️ Database uses this
  'arrived',   -- ⚠️ Database uses this
  'in_progress',
  'completed',
  'cancelled'
);
```

**Original Flow Keys**:

- `matched` (not in database)
- `pickup` (not in database)
- `in_progress` ✅
- `completed` ✅

## ✅ Solution Implemented

### 1. Enhanced STATUS_ALIASES Mapping

```typescript
const STATUS_ALIASES: Record<string, string> = {
  // Database uses 'accepted' → Flow uses 'matched'
  accepted: "matched",
  confirmed: "matched",
  offered: "matched", // Added

  // Database uses 'arrived' → Flow uses 'pickup'
  arrived: "pickup",
  arriving: "pickup",
  at_pickup: "pickup",

  // in_progress mappings
  picked_up: "in_progress",
  ongoing: "in_progress",
  started: "in_progress",

  // completed mappings
  finished: "completed",
  done: "completed",
};
```

### 2. Updated STATUS_FLOW with Database Values

```typescript
export const STATUS_FLOW: StatusStep[] = [
  {
    key: "matched",
    label: "รับงานแล้ว",
    icon: "✅",
    action: "ถึงจุดรับแล้ว",
    dbStatus: ["matched", "accepted", "confirmed", "offered"], // Added 'offered'
  },
  {
    key: "pickup",
    label: "ถึงจุดรับแล้ว",
    icon: "📍",
    action: "รับลูกค้าแล้ว",
    dbStatus: ["pickup", "arrived", "arriving", "at_pickup"],
  },
  {
    key: "in_progress",
    label: "กำลังเดินทาง",
    icon: "🛣️",
    action: "ส่งลูกค้าสำเร็จ", // Fixed action text
    dbStatus: ["in_progress", "picked_up", "ongoing", "started"],
  },
  {
    key: "completed",
    label: "เสร็จสิ้น",
    icon: "🎉",
    action: "เสร็จสิ้น",
    dbStatus: ["completed", "finished", "done"],
  },
];
```

### 3. Fixed Navigation Logic

Updated all status checks to use actual database values:

```typescript
// Navigation destination
if (['matched', 'accepted', 'confirmed', 'offered'].includes(status)) {
  // Go to pickup
}

// ETA destination
if (['matched', 'accepted', 'confirmed', 'offered', 'pickup', 'arrived'].includes(status)) {
  return { lat: pickup_lat, lng: pickup_lng, label: 'จุดรับ' }
}

// Photo evidence
showPickupPhoto: ['pickup', 'arrived', 'in_progress', ...].includes(status)
showDropoffPhoto: ['in_progress', 'picked_up', ...].includes(status)
```

### 4. Fixed Status Update Timestamps

```typescript
// Use correct database status values
if (newStatus === "arrived") {
  // Not 'pickup'
  updateData.arrived_at = new Date().toISOString();
} else if (newStatus === "in_progress") {
  updateData.started_at = new Date().toISOString();
} else if (newStatus === "completed") {
  updateData.completed_at = new Date().toISOString();
}
```

## 🔍 How to Debug

### 1. Check Console Logs

Open browser console and look for:

```
[JobDetail] Status Debug: {
  jobStatus: "accepted",
  currentIndex: 0,
  currentStep: "matched",
  nextStep: "pickup",
  nextDbStatus: "arrived",
  canProgress: true,
  canUpdateStatus: true
}
```

### 2. Check Debug Panel (Development Mode)

The component shows a debug panel in development:

- Current status from database
- Normalized status
- Current flow index
- Next step available
- All flow steps with their database mappings

### 3. Use Debug Tool

Open `debug-job-status.html` in browser:

1. Click "Check Job Status" - shows actual database status
2. Click "Check Status Flow Logic" - verifies flow mapping
3. Check if status is found in STATUS_FLOW
4. Verify next step is available

## 📊 Status Flow Diagram

```
Database Status → Flow Key → Button Action
─────────────────────────────────────────
accepted        → matched     → "ถึงจุดรับแล้ว"
arrived         → pickup      → "รับลูกค้าแล้ว"
in_progress     → in_progress → "ส่งลูกค้าสำเร็จ"
completed       → completed   → (no button)
cancelled       → (no flow)   → (no button)
```

## 🧪 Testing Checklist

- [ ] Job with status `accepted` shows "ถึงจุดรับแล้ว" button
- [ ] Job with status `arrived` shows "รับลูกค้าแล้ว" button
- [ ] Job with status `in_progress` shows "ส่งลูกค้าสำเร็จ" button
- [ ] Job with status `completed` shows NO button (only completed banner)
- [ ] Job with status `cancelled` shows NO button (only cancelled banner)
- [ ] Cancel button shows for all active statuses (index < 3)
- [ ] Navigation goes to correct destination based on status
- [ ] ETA shows correct destination
- [ ] Photo evidence shows at correct stages

## 🚀 Next Steps

1. **Test with actual job**: Navigate to job detail page and verify button shows
2. **Check console logs**: Verify status mapping is working
3. **Test status updates**: Click button and verify status changes correctly
4. **Test all statuses**: Create jobs in different statuses and verify flow

## 📝 Files Modified

1. `src/composables/useJobStatusFlow.ts` - Enhanced status mapping
2. `src/views/provider/ProviderJobDetailView.vue` - Fixed all status checks
3. `debug-job-status.html` - Debugging tool (already exists)

## 🔧 Technical Details

### Why This Fix Works

1. **Flexible Mapping**: STATUS_ALIASES normalizes any database status to flow keys
2. **Multiple Values**: Each flow step accepts multiple database status values
3. **Backward Compatible**: Supports both old and new status naming conventions
4. **Type Safe**: TypeScript ensures all status checks are correct

### Performance Impact

- ✅ No performance impact
- ✅ All computations are cached (computed properties)
- ✅ Status normalization is O(1) lookup

### Security Considerations

- ✅ Provider ownership verified before updates
- ✅ Status validation prevents invalid transitions
- ✅ RLS policies enforce database-level security
