# Verification Queue Debug Steps

## Problem
`/admin/verification-queue` page shows empty state ("ไม่มีรายการรอตรวจสอบ") even when there should be pending providers.

## Root Cause
The `useAdminAPI.ts` file had corrupted code in the `updateProviderStatus` function, which has now been fixed.

## ✅ What Has Been Fixed

1. **Fixed `useAdminAPI.ts`** - Corrected the corrupted `updateProviderStatus` function
2. **Created Migration 166** - Complete verification queue system with RPC functions
3. **Added Debug Logs** - Console logs in `VerificationQueueView.vue` to track issues
4. **Created Helper Scripts** - SQL scripts to check and test the system

## 🔍 Step-by-Step Debugging

### Step 1: Check Browser Console

1. Open the page: `http://localhost:5173/admin/verification-queue`
2. Open browser console (F12 or Cmd+Option+I)
3. Look for these logs:
   ```
   [VerificationQueue] Loading queue...
   [VerificationQueue] Result: [...]
   [VerificationQueue] Result length: X
   ```
4. Check for any error messages

**Expected Output:**
- If working: `Result length: 0` or `Result length: 1+`
- If error: Red error message with details

### Step 2: Check if Migration 166 is Run

Run this in Supabase SQL Editor:

```sql
-- Copy and paste from: scripts/check-and-run-migration-166.sql
```

**Expected Output:**
```
✓ Table provider_verification_queue exists
✓ Function admin_get_verification_queue exists
✓ Function admin_get_pending_providers exists
✓ Function admin_approve_provider_from_queue exists
✓ Function admin_reject_provider_from_queue exists
Found X pending providers in service_providers table
```

**If you see ✗ marks:**
1. Open `supabase/migrations/166_fix_verification_queue_complete.sql`
2. Copy the entire contents
3. Paste into Supabase SQL Editor
4. Run it
5. Refresh the admin page

### Step 3: Check for Pending Providers

Run this in Supabase SQL Editor:

```sql
-- Check service_providers table
SELECT 
  id,
  provider_uid,
  provider_type,
  status,
  user_id,
  created_at
FROM service_providers
WHERE status = 'pending'
ORDER BY created_at DESC;
```

**Expected Output:**
- If empty: No pending providers exist (this is why the page is empty!)
- If has rows: Providers exist but not showing up (continue debugging)

### Step 4: Create Test Data (If No Pending Providers)

Run this in Supabase SQL Editor:

```sql
-- Copy and paste from: scripts/create-test-pending-provider.sql
```

This will:
1. Find the `customer@demo.com` user
2. Create or update their provider record to `pending` status
3. Automatically add them to the verification queue (if migration 166 is run)

### Step 5: Test the RPC Function Directly

Run this in Supabase SQL Editor:

```sql
-- Test the RPC function
SELECT * FROM admin_get_verification_queue('pending');
```

**Expected Output:**
- Should return rows with provider details
- If empty: Check if providers are in the queue table
- If error: RPC function not created (run migration 166)

### Step 6: Check Queue Table Directly

Run this in Supabase SQL Editor:

```sql
-- Check queue table
SELECT 
  q.id,
  q.provider_id,
  q.status,
  q.created_at,
  sp.provider_uid,
  sp.provider_type,
  sp.status as provider_status,
  u.first_name,
  u.last_name
FROM provider_verification_queue q
LEFT JOIN service_providers sp ON q.provider_id = sp.id
LEFT JOIN users u ON sp.user_id = u.id
WHERE q.status IN ('pending', 'in_review')
ORDER BY q.created_at DESC;
```

**Expected Output:**
- Should show pending providers in the queue
- If empty: Trigger not working or no pending providers

### Step 7: Check RLS Policies

Run this in Supabase SQL Editor:

```sql
-- Check if admin can access the queue table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'provider_verification_queue';
```

**Expected Output:**
- Should show "Admin full access to verification queue" policy
- If missing: Run migration 166

## 🐛 Common Issues and Solutions

### Issue 1: Page Shows Empty But Providers Exist

**Symptoms:**
- SQL query shows pending providers
- Page shows "ไม่มีรายการรอตรวจสอบ"
- Console shows `Result length: 0`

**Solution:**
1. Check if migration 166 is run
2. Check if RPC function works (Step 5)
3. Check browser console for errors
4. Verify admin is logged in with correct credentials

### Issue 2: RPC Function Not Found

**Symptoms:**
- Console error: `function admin_get_verification_queue does not exist`

**Solution:**
1. Run migration 166 in Supabase SQL Editor
2. Refresh the page

### Issue 3: Permission Denied

**Symptoms:**
- Console error: `permission denied for function admin_get_verification_queue`

**Solution:**
1. Check if logged in as admin (`admin@demo.com`)
2. Check RLS policies (Step 7)
3. Re-run migration 166 to fix policies

### Issue 4: No Pending Providers

**Symptoms:**
- Everything works but legitimately no pending providers
- SQL query returns 0 rows

**Solution:**
1. Create test data (Step 4)
2. Or wait for real users to apply as providers

## 📝 Quick Test Checklist

- [ ] Migration 166 is run
- [ ] RPC functions exist
- [ ] Queue table exists
- [ ] At least one pending provider exists
- [ ] Admin is logged in
- [ ] Browser console shows no errors
- [ ] RPC function returns data when tested directly

## 🔧 Manual Fix (If All Else Fails)

If the page still doesn't work after all steps:

1. **Clear browser cache and reload**
2. **Restart dev server:**
   ```bash
   # Stop server (Ctrl+C)
   npm run dev
   ```
3. **Check Supabase connection:**
   ```sql
   SELECT current_user, current_database();
   ```
4. **Verify environment variables:**
   - Check `.env` file has correct Supabase URL and keys

## 📞 Support

If still not working, provide these details:

1. Browser console output (full logs)
2. Result of Step 2 (migration check)
3. Result of Step 3 (pending providers count)
4. Result of Step 5 (RPC function test)
5. Screenshot of the empty page

## ✅ Success Indicators

When everything is working:

1. ✅ Page loads without errors
2. ✅ Console shows: `[VerificationQueue] Result length: X` (where X > 0)
3. ✅ Provider cards appear on the page
4. ✅ Can click "อนุมัติ" or "ปฏิเสธ" buttons
5. ✅ Actions work and update the database

---

**Last Updated:** 2024-12-23
**Migration Version:** 166
**File:** `VERIFICATION_QUEUE_DEBUG_STEPS.md`
