# Task 16.3: Production Testing Guide

## Overview

This guide provides step-by-step instructions for testing the admin providers page after deploying the fixed migration 301.

## Prerequisites

✅ Migration 301 has been applied to production
✅ Admin user exists with role 'super_admin'
✅ Local development server is running and connected to production

## Testing Checklist

### 1. Initial Page Load

**Steps:**

1. Navigate to: `http://localhost:5173/admin/providers`
2. Login with: `superadmin@gobear.app`

**Expected Results:**

- ✅ Page loads without errors
- ✅ No 404 errors in browser console
- ✅ No SQL errors in browser console
- ✅ Provider list displays (or empty state if no providers)
- ✅ Real-time indicator shows "Live" (green dot)
- ✅ Pagination controls visible
- ✅ Filter controls visible

**Console Check:**

```javascript
// Open browser console (F12)
// Should see NO errors like:
// ❌ "column reference 'id' is ambiguous"
// ❌ "operator does not exist: provider_status = text"
```

### 2. Test Status Filters

**Steps:**

1. Click "Status" dropdown
2. Select "Pending"
3. Observe results
4. Repeat for "Approved", "Rejected"

**Expected Results:**

- ✅ Filter applies without errors
- ✅ Provider list updates
- ✅ Count updates correctly
- ✅ URL updates with filter parameter
- ✅ No console errors

**SQL Verification:**

```sql
-- Run in Supabase Dashboard SQL Editor
SELECT * FROM get_admin_providers_v2('pending', NULL, 20, 0);
SELECT count_admin_providers_v2('pending', NULL);
```

### 3. Test Provider Type Filters

**Steps:**

1. Click "Provider Type" dropdown
2. Select "Ride"
3. Observe results
4. Repeat for "Delivery", "Moving"

**Expected Results:**

- ✅ Filter applies without errors
- ✅ Provider list updates
- ✅ Count updates correctly
- ✅ No console errors

### 4. Test Pagination

**Steps:**

1. If more than 20 providers exist:
   - Click "Next Page" button
   - Observe page 2 loads
   - Click "Previous Page"
   - Observe page 1 loads
2. If less than 20 providers:
   - Verify pagination controls are disabled/hidden

**Expected Results:**

- ✅ Pagination works correctly
- ✅ Page number updates
- ✅ Provider list updates
- ✅ No duplicate providers
- ✅ No console errors

### 5. Test Real-Time Updates

**Steps:**

1. Keep admin providers page open
2. In another tab/window:
   - Update a provider's status in Supabase Dashboard
   - Or have a provider go online/offline
3. Observe admin page

**Expected Results:**

- ✅ Real-time indicator shows "Live" (green)
- ✅ Provider list updates automatically
- ✅ No page refresh needed
- ✅ No console errors

**Manual Test:**

```sql
-- Run in Supabase Dashboard SQL Editor
UPDATE providers_v2
SET is_online = NOT is_online
WHERE id = (SELECT id FROM providers_v2 LIMIT 1);
```

### 6. Test Combined Filters

**Steps:**

1. Select Status: "Approved"
2. Select Provider Type: "Ride"
3. Observe results

**Expected Results:**

- ✅ Both filters apply correctly
- ✅ Only approved ride providers show
- ✅ Count is accurate
- ✅ No console errors

### 7. Test Provider Details

**Steps:**

1. Click on a provider row
2. Observe provider details modal/page

**Expected Results:**

- ✅ Provider details load
- ✅ All fields display correctly
- ✅ Actions available (approve, reject, etc.)
- ✅ No console errors

### 8. Test Error Handling

**Steps:**

1. Disconnect internet
2. Try to load page
3. Reconnect internet

**Expected Results:**

- ✅ Error message displays
- ✅ Retry button available
- ✅ Page recovers after reconnection
- ✅ No crashes

## Common Issues & Solutions

### Issue 1: 404 Errors

**Symptom:** Console shows 404 errors for RPC functions
**Solution:**

- Verify migration 301 was applied
- Check function exists: `SELECT routine_name FROM information_schema.routines WHERE routine_name = 'get_admin_providers_v2'`

### Issue 2: Type Errors

**Symptom:** Console shows "operator does not exist" errors
**Solution:**

- Verify migration 301 includes `::TEXT` casts
- Re-apply migration if needed

### Issue 3: Empty List

**Symptom:** No providers show even though they exist
**Solution:**

- Check RLS policies: `SELECT * FROM pg_policies WHERE tablename = 'providers_v2'`
- Verify admin role: `SELECT role FROM users WHERE email = 'superadmin@gobear.app'`

### Issue 4: Real-Time Not Working

**Symptom:** Real-time indicator shows "Disconnected"
**Solution:**

- Check Supabase realtime is enabled
- Verify subscription in browser console
- Check network tab for websocket connection

## Performance Checks

### 1. Page Load Time

**Target:** < 2 seconds
**Measure:** Browser DevTools → Network tab

### 2. Filter Response Time

**Target:** < 500ms
**Measure:** Browser DevTools → Network tab

### 3. Real-Time Latency

**Target:** < 1 second
**Measure:** Time from DB update to UI update

## Browser Console Verification

Open browser console (F12) and run:

```javascript
// Check for errors
console.log("Errors:", performance.getEntriesByType("navigation"));

// Check API calls
console.log(
  "API calls:",
  performance
    .getEntriesByType("resource")
    .filter((r) => r.name.includes("supabase")),
);

// Check realtime connection
console.log("Realtime:", window.supabase?.realtime?.channels);
```

## SQL Verification Queries

Run these in Supabase Dashboard SQL Editor:

```sql
-- 1. Verify functions exist
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name LIKE '%admin_providers%';

-- 2. Test function with filters
SELECT * FROM get_admin_providers_v2('pending', 'ride', 5, 0);

-- 3. Test count function
SELECT count_admin_providers_v2('pending', 'ride');

-- 4. Check for errors in logs
SELECT * FROM pg_stat_statements
WHERE query LIKE '%get_admin_providers_v2%'
AND calls > 0
ORDER BY last_exec_time DESC
LIMIT 10;

-- 5. Verify admin user
SELECT id, email, role
FROM users
WHERE email = 'superadmin@gobear.app';
```

## Success Criteria

All of the following must be true:

- ✅ Page loads without errors
- ✅ No 404 errors in console
- ✅ No SQL errors in console
- ✅ Provider list displays correctly
- ✅ All filters work
- ✅ Pagination works
- ✅ Real-time updates work
- ✅ Performance is acceptable (< 2s load time)
- ✅ Error handling works

## Sign-Off

After completing all tests:

- [ ] All tests passed
- [ ] No console errors
- [ ] Performance acceptable
- [ ] Real-time working
- [ ] Ready for production use

**Tested by:** ********\_********
**Date:** ********\_********
**Notes:** ********\_********

## Next Steps

After successful testing:

1. ✅ Mark task 16.3 as complete
2. ✅ Move to task 16.4 (Verify admin user role)
3. ✅ Update production deployment checklist
4. ✅ Document any issues found
5. ✅ Generate updated TypeScript types
