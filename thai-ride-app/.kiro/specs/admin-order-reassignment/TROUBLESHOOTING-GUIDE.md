# 🔧 Order Reassignment Troubleshooting Guide

**Date**: 2026-01-19  
**Feature**: Order Reassignment at `/admin/orders`

## 🎯 Quick Fix Checklist

If you're seeing errors, follow these steps in order:

### 1. ✅ Hard Refresh Browser (CRITICAL!)

The browser may have cached the 404 error response. You MUST clear this cache:

**Windows/Linux:**

```
Ctrl + Shift + R
```

**Mac:**

```
Cmd + Shift + R
```

**Alternative:** Clear browser cache completely:

- Chrome: Settings → Privacy → Clear browsing data → Cached images and files
- Firefox: Settings → Privacy → Clear Data → Cached Web Content
- Safari: Develop → Empty Caches

### 2. 🔍 Check Console for Actual Error

Open DevTools Console (F12) and look for the error details:

```javascript
// Expand the AdminError object in console
[AdminError] {
  name: "AdminError",
  code: "ADMIN_UNKNOWN_ERROR",
  message: "เกิดข้อผิดพลาด กรุณาลองใหม่",
  context: {...},
  originalError: {...}  // ← THIS IS THE KEY!
}
```

**Click on `originalError` to see the real error!**

### 3. 📊 Common Error Patterns

#### Error Pattern 1: 404 Not Found

```
POST https://...supabase.co/rest/v1/rpc/get_available_providers 404 (Not Found)
```

**Cause:** Functions don't exist in database  
**Status:** ✅ FIXED - Functions were created  
**Action:** Hard refresh browser (Step 1)

---

#### Error Pattern 2: 401 Unauthorized

```
originalError: {
  code: "PGRST301",
  message: "JWT expired",
  ...
}
```

**Cause:** Session expired  
**Action:**

1. Log out from admin panel
2. Log back in
3. Try again

---

#### Error Pattern 3: 403 Forbidden / Unauthorized

```
originalError: {
  message: "Unauthorized: Admin access required",
  ...
}
```

**Cause:** User role doesn't have access  
**Status:** ✅ FIXED - Functions now check for both 'admin' and 'super_admin'  
**Action:** Hard refresh browser (Step 1)

---

#### Error Pattern 4: 400 Bad Request

```
originalError: {
  code: "PGRST204",
  message: "Could not find the function...",
  ...
}
```

**Cause:** Function signature mismatch  
**Action:** Check function exists with correct parameters

---

#### Error Pattern 5: Network Error

```
originalError: {
  message: "Failed to fetch",
  ...
}
```

**Cause:** Network connectivity issue  
**Action:**

1. Check internet connection
2. Check if Supabase is accessible
3. Check browser network tab for blocked requests

---

## 🧪 Step-by-Step Testing

### Test 1: Verify Functions Exist

Run this in Supabase SQL Editor:

```sql
-- Check all three functions exist
SELECT
  p.proname AS function_name,
  pg_get_function_arguments(p.oid) AS arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'get_available_providers',
    'reassign_order',
    'get_reassignment_history'
  )
ORDER BY p.proname;
```

**Expected Result:** 3 rows returned

---

### Test 2: Verify Your Admin Role

```sql
-- Check your user role
SELECT id, email, role
FROM users
WHERE email = 'superadmin@gobear.app';
```

**Expected Result:**

- `role` should be `'admin'` or `'super_admin'`

---

### Test 3: Test Function Directly

```sql
-- Test get_available_providers
SELECT * FROM get_available_providers('ride', 5);
```

**Expected Result:**

- If you're logged in as admin: Returns list of providers
- If not logged in: Error "Unauthorized: Admin access required"

---

### Test 4: Check Browser Network Tab

1. Open DevTools (F12)
2. Go to Network tab
3. Click "ย้ายงาน" button
4. Look for request to `get_available_providers`

**Check:**

- Status Code: Should be `200 OK` (not 404, 403, or 401)
- Response: Should contain array of providers
- Request Headers: Should include `Authorization: Bearer ...`

---

## 🔍 Detailed Error Investigation

### How to Extract originalError Details

In browser console:

```javascript
// When you see [AdminError], click to expand it
// Then look for originalError property

// Example structure:
{
  name: "AdminError",
  code: "ADMIN_UNKNOWN_ERROR",
  originalError: {
    code: "PGRST301",           // ← Supabase error code
    message: "...",              // ← Actual error message
    details: "...",              // ← More details
    hint: "...",                 // ← Helpful hint
    status: 401,                 // ← HTTP status code
  }
}
```

### Common Supabase Error Codes

| Code       | Meaning                 | Solution                                    |
| ---------- | ----------------------- | ------------------------------------------- |
| `PGRST301` | JWT expired             | Re-login                                    |
| `PGRST204` | Function not found      | Hard refresh or verify function exists      |
| `PGRST116` | Invalid JWT             | Clear cookies and re-login                  |
| `42883`    | Function does not exist | Verify function was created                 |
| `42501`    | Permission denied       | Check RLS policies                          |
| `P0001`    | Raised exception        | Check function logic (e.g., "Unauthorized") |

---

## 🛠️ Advanced Debugging

### Enable Detailed Logging

Add this to `src/admin/composables/useOrderReassignment.ts`:

```typescript
// In getAvailableProviders function
try {
  const { data, error } = await supabase.rpc("get_available_providers", {
    p_service_type: serviceType,
    p_limit: limit,
  });

  // Add detailed logging
  console.log("[DEBUG] RPC Response:", { data, error });

  if (error) {
    console.error("[DEBUG] RPC Error Details:", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    throw error;
  }

  return data;
} catch (error) {
  console.error("[DEBUG] Caught Error:", error);
  throw handleSupabaseError(error);
}
```

### Check Supabase Logs

1. Go to Supabase Dashboard
2. Navigate to Logs → API Logs
3. Filter by time when error occurred
4. Look for requests to `get_available_providers`

---

## ✅ Success Indicators

When everything is working correctly, you should see:

### In Browser Console:

```
✅ No AdminError
✅ No 404 errors
✅ Network request returns 200 OK
✅ Modal loads with provider list
```

### In Network Tab:

```
Request URL: .../rest/v1/rpc/get_available_providers
Status: 200 OK
Response: [{id: "...", full_name: "...", ...}, ...]
```

### In UI:

```
✅ Modal opens smoothly
✅ List of providers appears
✅ Can select a provider
✅ Can add reason/notes
✅ Reassignment completes successfully
```

---

## 🚨 If Still Not Working

### Last Resort Checks

1. **Verify Supabase Connection:**

   ```javascript
   // In browser console
   const { data, error } = await supabase.auth.getSession();
   console.log("Session:", data.session);
   ```

2. **Check Function Permissions:**

   ```sql
   -- Verify EXECUTE permission granted
   SELECT
     p.proname,
     array_agg(DISTINCT pr.rolname) AS granted_to
   FROM pg_proc p
   JOIN pg_namespace n ON p.pronamespace = n.oid
   LEFT JOIN pg_proc_acl pa ON p.oid = pa.oid
   LEFT JOIN pg_roles pr ON pr.oid = ANY(pa.grantee)
   WHERE p.proname = 'get_available_providers'
   GROUP BY p.proname;
   ```

3. **Test with Postman/cURL:**

   ```bash
   curl -X POST 'https://onsflqhkgqhydeupiqyt.supabase.co/rest/v1/rpc/get_available_providers' \
     -H "apikey: YOUR_ANON_KEY" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"p_service_type": "ride", "p_limit": 5}'
   ```

4. **Check for CORS Issues:**
   - Look for CORS errors in console
   - Verify Supabase project settings allow your domain

---

## 📞 Getting Help

If you're still stuck, provide these details:

1. **Error Details:**
   - Full `originalError` object from console
   - HTTP status code
   - Supabase error code (if any)

2. **Environment:**
   - Browser and version
   - User role from database
   - Timestamp of error

3. **What You've Tried:**
   - Hard refresh? ✅/❌
   - Re-login? ✅/❌
   - Verified functions exist? ✅/❌
   - Checked network tab? ✅/❌

---

## 📚 Related Documentation

- [ORDER-REASSIGNMENT-FIX-COMPLETE.md](./ORDER-REASSIGNMENT-FIX-COMPLETE.md) - Original fix
- [ROLE-FIX-COMPLETE.md](./ROLE-FIX-COMPLETE.md) - Role check fix
- [VERIFY-FUNCTIONS.sql](./VERIFY-FUNCTIONS.sql) - Verification queries
- `src/admin/composables/useOrderReassignment.ts` - Frontend code
- `src/admin/components/OrderReassignmentModal.vue` - Modal component

---

**Last Updated**: 2026-01-19  
**Status**: Functions fixed and deployed ✅  
**Next Step**: Hard refresh browser and test!
