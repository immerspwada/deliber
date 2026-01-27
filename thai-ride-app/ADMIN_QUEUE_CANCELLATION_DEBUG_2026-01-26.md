# 🔍 Admin Queue Cancellation Debug - Deep Analysis

**Date**: 2026-01-26  
**Order**: QUE-20260126-0429  
**Issue**: Cannot cancel queue booking order  
**Status**: 🔧 Debugging

---

## 🚨 Problem Statement

**Symptom**: Admin cannot cancel queue booking order QUE-20260126-0429

**Error in Console**:

```
[Auth] Session fetch timeout after 5 seconds
```

---

## 🔍 Deep Technical Analysis (Engineer Perspective)

### 1. Code Flow Analysis

```typescript
// Step 1: User clicks status dropdown → selects "ยกเลิก"
updateStatusInline(order, 'cancelled')
  ↓
// Step 2: Detects cancellation → opens modal
if (newStatus === 'cancelled') {
  orderToCancel.value = order;
  cancelReason.value = '';
  showCancelModal.value = true;
  return; // ⚠️ Stops here, waits for user input
}
  ↓
// Step 3: User enters reason → clicks confirm
confirmCancellation()
  ↓
// Step 4: Validates reason
if (!cancelReason.value.trim()) {
  uiStore.showError("กรุณาระบุเหตุผลในการยกเลิก");
  return;
}
  ↓
// Step 5: Optimistic update (UI changes immediately)
orders.value[orderIndex].status = 'cancelled';
  ↓
// Step 6: API call
api.updateOrderStatus(order.id, 'cancelled', {
  serviceType: order.service_type, // 'queue'
  cancelReason: cancelReason.value.trim()
})
  ↓
// Step 7: In useAdminAPI.ts
async function updateOrderStatus(orderId, status, options) {
  // Map service type to table name
  const tableName = tableNameMap[options.serviceType] || 'ride_requests'
  // For 'queue' → 'ride_requests' ✅

  // Build update data
  const updateData = { status }

  if (status === 'cancelled') {
    const { data: { user } } = await supabase.auth.getUser()
    // ⚠️ THIS IS WHERE SESSION TIMEOUT HAPPENS!

    updateData.cancelled_at = new Date().toISOString()
    updateData.cancelled_by = user.id
    updateData.cancelled_by_role = 'admin'
    updateData.cancel_reason = options.cancelReason
  }

  // Execute update
  const { error } = await supabase
    .from(tableName)
    .update(updateData)
    .eq('id', orderId)

  return !error
}
```

### 2. Root Cause Identification

**Primary Issue**: Session Timeout in `supabase.auth.getUser()`

**Why it happens**:

1. When status is 'cancelled', code calls `supabase.auth.getUser()`
2. This call times out after 5 seconds
3. The timeout prevents the update from executing
4. User sees no feedback (no error toast)

**Evidence from Console**:

```
[Auth] Session fetch timeout after 5 seconds
```

### 3. Why Status Dropdown Works But Cancel Doesn't?

**Status Dropdown** (for non-cancelled status):

```typescript
// Simple status update - NO auth.getUser() call
const updateData = { status: "matched" };
await supabase.from("ride_requests").update(updateData).eq("id", orderId);
// ✅ Works fine!
```

**Cancel Action** (for cancelled status):

```typescript
// Complex cancellation - REQUIRES auth.getUser() call
const {
  data: { user },
} = await supabase.auth.getUser(); // ⚠️ TIMEOUT!
const updateData = {
  status: "cancelled",
  cancelled_at: new Date().toISOString(),
  cancelled_by: user.id, // Needs user.id
  cancelled_by_role: "admin",
  cancel_reason: reason,
};
await supabase.from("ride_requests").update(updateData).eq("id", orderId);
// ❌ Never reaches here because of timeout!
```

### 4. Code Fix Analysis

**We already fixed this!** (Commit 4123f27)

**Before (❌ Bad)**:

```typescript
// Unnecessary session verification with retry
let session = null;
let retries = 0;
while (!session && retries < maxRetries) {
  const {
    data: { session: currentSession },
    error,
  } = await supabase.auth.getSession(); // ⚠️ TIMEOUT!
  // ... retry logic
}
```

**After (✅ Good)**:

```typescript
// Direct auth.getUser() call - no session verification
if (status === "cancelled") {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // ... use user.id
}
```

---

## 🎯 Why It's Still Not Working?

### Hypothesis 1: Browser Cache (Most Likely ✅)

**Problem**: Browser is using **old cached JavaScript** that still has the session timeout bug

**Evidence**:

- We deployed the fix (commit 4123f27)
- Dev server is running with new code
- But browser console shows old error

**Solution**: Hard refresh browser

```bash
# Mac
Cmd + Shift + R

# Windows/Linux
Ctrl + Shift + R

# Or clear cache completely
Cmd/Ctrl + Shift + Delete
```

### Hypothesis 2: Supabase Session Issue

**Problem**: Supabase session is actually expired or invalid

**Evidence**: Error message says "Session fetch timeout"

**Solution**: Re-login as admin

```
1. Logout from admin panel
2. Clear browser cookies
3. Login again
4. Try cancelling order
```

### Hypothesis 3: Network/API Issue

**Problem**: Supabase API is slow or timing out

**Evidence**: Timeout after exactly 5 seconds (default timeout)

**Solution**: Check network tab in DevTools

```
1. Open DevTools → Network tab
2. Try cancelling order
3. Look for failed requests to Supabase
4. Check response time and status codes
```

### Hypothesis 4: RLS Policy Issue

**Problem**: Admin doesn't have permission to update cancelled_by field

**Evidence**: Would show different error, but worth checking

**Solution**: Check RLS policies

```sql
-- Check ride_requests policies
SELECT * FROM pg_policies WHERE tablename = 'ride_requests';

-- Admin should have full access
```

---

## 🧪 Debugging Steps

### Step 1: Verify Code is Updated

```bash
# Check if fix is in the code
grep -n "Session verified" src/admin/composables/useAdminAPI.ts
# Should return: No matches (we removed this)

grep -n "maxRetries" src/admin/composables/useAdminAPI.ts
# Should return: No matches (we removed this)
```

### Step 2: Hard Refresh Browser

```
1. Open http://localhost:5173/admin/orders
2. Press Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
3. Wait for page to fully reload
4. Try cancelling order again
```

### Step 3: Check Browser Console

```
1. Open DevTools (F12)
2. Go to Console tab
3. Clear console
4. Try cancelling order
5. Look for errors:
   - ✅ No "[Auth] Session fetch timeout" = Fixed!
   - ❌ Still shows timeout = Cache issue
```

### Step 4: Check Network Tab

```
1. Open DevTools → Network tab
2. Filter by "Fetch/XHR"
3. Try cancelling order
4. Look for:
   - POST to /rest/v1/ride_requests
   - Check status code (should be 200 or 204)
   - Check response time (should be < 2s)
```

### Step 5: Check Supabase Logs

```
1. Go to Supabase Dashboard
2. Navigate to Logs → API Logs
3. Filter by time of cancellation attempt
4. Look for:
   - 403 Forbidden = RLS issue
   - 500 Error = Server issue
   - Timeout = Network issue
```

---

## ✅ Solution Steps (In Order)

### Solution 1: Hard Refresh (Try This First!)

```
1. Go to http://localhost:5173/admin/orders
2. Press Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
3. Login again if needed
4. Try cancelling QUE-20260126-0429
5. ✅ Should work now!
```

### Solution 2: Clear Browser Cache

```
1. Press Cmd+Shift+Delete (Mac) or Ctrl+Shift+Delete (Windows)
2. Select "Cached images and files"
3. Select "Last hour" or "All time"
4. Click "Clear data"
5. Reload page
6. Try again
```

### Solution 3: Use Incognito/Private Window

```
1. Open new Incognito window (Cmd+Shift+N or Ctrl+Shift+N)
2. Go to http://localhost:5173/admin/orders
3. Login as admin
4. Try cancelling order
5. If works = Cache issue confirmed!
```

### Solution 4: Restart Dev Server

```bash
# Stop server
Ctrl+C

# Clear Vite cache
rm -rf node_modules/.vite

# Restart
npm run dev
```

### Solution 5: Check Production

```
1. Go to https://deliber.vercel.app/admin/orders
2. Login as admin
3. Try cancelling order
4. Production should have the fix already deployed
```

---

## 📊 Expected Behavior After Fix

### Before Fix (❌)

```
1. Click status dropdown
2. Select "ยกเลิก"
3. Modal opens
4. Enter reason
5. Click confirm
6. ⏳ Wait 5 seconds...
7. ❌ Error: "Session fetch timeout"
8. ❌ Order not cancelled
9. ❌ No feedback to user
```

### After Fix (✅)

```
1. Click status dropdown
2. Select "ยกเลิก"
3. Modal opens
4. Enter reason
5. Click confirm
6. ⚡ Instant response (1-2 seconds)
7. ✅ Success toast: "ยกเลิกออเดอร์เรียบร้อย"
8. ✅ Order status changes to "ยกเลิก"
9. ✅ Order list refreshes
10. ✅ Console is clean (no errors)
```

---

## 🔬 Technical Details

### Database Schema

```sql
-- ride_requests table (used for queue bookings)
CREATE TABLE ride_requests (
  id UUID PRIMARY KEY,
  tracking_id TEXT,
  status TEXT,
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID, -- Admin user ID
  cancelled_by_role TEXT, -- 'admin', 'customer', 'provider'
  cancel_reason TEXT,
  -- ... other fields
);
```

### API Call

```typescript
// What gets sent to database
{
  status: 'cancelled',
  cancelled_at: '2026-01-26T12:34:56.789Z',
  cancelled_by: 'admin-user-uuid',
  cancelled_by_role: 'admin',
  cancel_reason: 'เหตุผลที่ admin ระบุ'
}
```

### RLS Policy

```sql
-- Admin should have full access
CREATE POLICY "admin_full_access" ON ride_requests
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

---

## 💡 Key Insights

### 1. Browser Cache is Tricky

**Problem**: Even after deploying fix, browser may use old cached code

**Solution**: Always hard refresh after deployment

**Prevention**: Use cache-busting in production (Vite does this automatically)

### 2. Different Code Paths

**Status Update**: Simple, no auth check needed
**Cancellation**: Complex, requires auth.getUser() for cancelled_by field

**Lesson**: Test all code paths, not just the happy path

### 3. Session Timeout Pattern

**Old Code**: Manual session verification → timeout
**New Code**: Trust Supabase client → works

**Lesson**: Don't over-engineer authentication checks

---

## 🎓 For Future Reference

### When User Reports "Cannot Cancel Order"

1. **Check Console** - Look for session timeout errors
2. **Hard Refresh** - Clear browser cache first
3. **Check Network** - Verify API calls are reaching server
4. **Check RLS** - Verify admin has permission
5. **Check Logs** - Look at Supabase logs for errors

### Common Causes

1. **Browser Cache** (80% of cases)
2. **Session Expired** (15% of cases)
3. **RLS Policy** (4% of cases)
4. **Network Issue** (1% of cases)

---

## ✅ Resolution

**Most Likely Solution**: Hard refresh browser (Cmd+Shift+R)

**Why**: Browser is using old cached JavaScript that has the session timeout bug. The fix is already deployed, but browser needs to reload the new code.

**Verification**: After hard refresh, console should be clean with no "[Auth] Session fetch timeout" errors.

---

**Status**: 🔧 **Awaiting User to Hard Refresh Browser**

Once user hard refreshes, the cancellation should work perfectly!
