# Admin Order 404 Error - Debugging Guide

**Date**: 2026-01-23  
**Status**: 🔍 Investigating  
**Issue**: 404 error when admin tries to update delivery status

---

## 🐛 Problem

When admin clicks to cancel a delivery order (DEL-20260123-000005), the system returns:

```
PATCH https://onsflqhkgqhydeupiqyt.supabase.co/rest/v1/delivery_requests?id=eq.cf1897a4-a200-49fa-bb2f-1d0c276036b4 404 (Not Found)
```

### Error Context

- **User**: superadmin@gobear.app (ID: 05ea4b43-ccef-40dc-a998-810d19e8024f)
- **Role**: super_admin
- **Order**: DEL-20260123-000005 (ID: cf1897a4-a200-49fa-bb2f-1d0c276036b4)
- **Action**: Change status from "pending" to "cancelled"
- **Location**: http://localhost:5173/admin/orders

---

## 🔍 Investigation Results

### 1. Database Verification ✅

**Admin User Role**:

```sql
SELECT id, email, role FROM users WHERE email = 'superadmin@gobear.app';
-- Result: role = 'super_admin' ✅
```

**Order Exists**:

```sql
SELECT id, tracking_id, status FROM delivery_requests
WHERE tracking_id = 'DEL-20260123-000005';
-- Result: Order exists, status = 'pending' ✅
```

### 2. RLS Policies ✅

**Admin policies exist and are correct**:

```sql
-- Policy: admin_full_access_deliveries
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'super_admin')
  )
)
```

### 3. Direct SQL Test ✅

**Direct UPDATE works**:

```sql
UPDATE delivery_requests
SET
  status = 'cancelled',
  cancelled_by = '05ea4b43-ccef-40dc-a998-810d19e8024f',
  cancelled_by_role = 'admin'
WHERE id = 'cf1897a4-a200-49fa-bb2f-1d0c276036b4';
-- Result: SUCCESS ✅
```

This confirms:

- ✅ RLS policies are correct
- ✅ Admin has proper role
- ✅ Database schema is correct
- ✅ Direct SQL works

### 4. Root Cause Analysis

The 404 error from Supabase REST API typically means:

1. **RLS policy blocked the request** (but we verified policies are correct)
2. **Auth token not sent with request** (most likely)
3. **Session expired or invalid**
4. **Race condition** (auth not ready when request made)

---

## 🔧 Debugging Steps Added

### Enhanced Logging

Added comprehensive logging to `useAdminAPI.ts`:

```typescript
async function updateOrderStatus(...) {
  // 1. Log the request
  console.log('[Admin API] updateOrderStatus called:', { orderId, status, options })

  // 2. Verify session exists
  const { data: { session } } = await supabase.auth.getSession()
  console.log('[Admin API] Current session:', {
    hasSession: !!session,
    userId: session?.user?.id,
    expiresAt: session?.expires_at
  })

  if (!session) {
    throw new Error('No active session - please login again')
  }

  // 3. Log update data
  console.log('[Admin API] Updating table:', tableName, 'with data:', updateData)

  // 4. Log result
  const { data, error } = await supabase.from(tableName).update(updateData)...
  console.log('[Admin API] Update result:', { data, error })
}
```

---

## 🧪 Testing Instructions

### Step 1: Check Console Logs

1. Open browser DevTools (F12)
2. Go to Console tab
3. Clear console
4. Try to cancel the order again
5. Look for these logs:

```
[Admin API] updateOrderStatus called: {...}
[Admin API] Current session: {...}
[Admin API] Updating table: delivery_requests with data: {...}
[Admin API] Update result: {...}
```

### Step 2: Verify Session

Check if session exists:

```javascript
// In browser console
const {
  data: { session },
} = await supabase.auth.getSession();
console.log("Session:", session);
console.log("User ID:", session?.user?.id);
console.log("Expires:", new Date(session?.expires_at * 1000));
```

### Step 3: Check Auth State

```javascript
// In browser console
const {
  data: { user },
} = await supabase.auth.getUser();
console.log("User:", user);
console.log("User ID:", user?.id);
console.log("Email:", user?.email);
```

### Step 4: Test Direct Update

```javascript
// In browser console
const { data, error } = await supabase
  .from("delivery_requests")
  .update({ status: "cancelled" })
  .eq("id", "cf1897a4-a200-49fa-bb2f-1d0c276036b4")
  .select();

console.log("Result:", { data, error });
```

---

## 🎯 Possible Solutions

### Solution 1: Session Refresh

If session is expired or invalid:

```typescript
// Force session refresh before update
const {
  data: { session },
  error: sessionError,
} = await supabase.auth.refreshSession();
if (sessionError || !session) {
  // Redirect to login
  router.push("/admin/login");
  return false;
}
```

### Solution 2: Use Service Role Key

For admin operations, consider using service role key (server-side only):

```typescript
// Create admin client with service role
const adminClient = createClient(
  supabaseUrl,
  supabaseServiceRoleKey, // Server-side only!
);
```

### Solution 3: RPC Function

Create a database function that bypasses RLS:

```sql
CREATE OR REPLACE FUNCTION admin_update_order_status(
  p_order_id UUID,
  p_status TEXT,
  p_service_type TEXT
) RETURNS VOID AS $$
BEGIN
  -- Check admin role
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('admin', 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Update order
  EXECUTE format(
    'UPDATE %I SET status = $1, cancelled_by = $2, cancelled_by_role = $3, cancelled_at = NOW() WHERE id = $4',
    p_service_type || '_requests'
  ) USING p_status, auth.uid(), 'admin', p_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

Then call from frontend:

```typescript
const { error } = await supabase.rpc("admin_update_order_status", {
  p_order_id: orderId,
  p_status: status,
  p_service_type: serviceType,
});
```

### Solution 4: Check Auth Headers

Verify Supabase client is sending auth headers:

```typescript
// Check if Authorization header is set
const headers = supabase.rest.headers;
console.log("Auth header:", headers.Authorization);
```

---

## 📊 Expected Console Output

### If Session is Valid

```
[Admin API] updateOrderStatus called: {orderId: "cf1897a4...", status: "cancelled", ...}
[Admin API] Current session: {hasSession: true, userId: "05ea4b43...", expiresAt: 1737...}
[Admin API] Cancelling as admin: 05ea4b43-ccef-40dc-a998-810d19e8024f
[Admin API] Updating table: delivery_requests with data: {status: "cancelled", ...}
[Admin API] Update result: {data: [{...}], error: null}
✅ Status updated successfully
```

### If Session is Invalid

```
[Admin API] updateOrderStatus called: {orderId: "cf1897a4...", status: "cancelled", ...}
[Admin API] Current session: {hasSession: false, userId: undefined, expiresAt: undefined}
❌ Error: No active session - please login again
```

### If RLS Blocks

```
[Admin API] updateOrderStatus called: {orderId: "cf1897a4...", status: "cancelled", ...}
[Admin API] Current session: {hasSession: true, userId: "05ea4b43...", expiresAt: 1737...}
[Admin API] Updating table: delivery_requests with data: {status: "cancelled", ...}
[Admin API] Update result: {data: null, error: {code: "PGRST116", message: "..."}}
[Admin API] Update error details: {message: "...", code: "PGRST116", ...}
❌ Error: ...
```

---

## 🚀 Next Steps

1. ✅ Added enhanced logging
2. ⏳ Test with logging enabled
3. ⏳ Analyze console output
4. ⏳ Identify root cause (session vs RLS vs timing)
5. ⏳ Implement appropriate solution

---

## 📝 Notes

- The 404 error is misleading - it's actually an RLS/auth issue, not "not found"
- Supabase REST API returns 404 when RLS blocks access (security by obscurity)
- Direct SQL works, so the issue is with the Supabase client auth
- Admin is logged in (we can see auth state in logs)
- Most likely cause: Auth token not being sent with the PATCH request

---

**Last Updated**: 2026-01-23  
**Status**: Debugging in progress  
**Next Action**: Test with enhanced logging
