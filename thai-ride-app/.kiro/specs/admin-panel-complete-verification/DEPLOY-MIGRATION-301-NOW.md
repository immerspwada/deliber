# 🚀 Deploy Migration 301 to Production - Quick Guide

## What This Does

Fixes the admin providers page 404 errors by updating 4 RPC functions to check the correct table (`users` instead of `profiles`).

## ⚡ Quick Deploy (5 Minutes)

### Step 1: Backup (1 min)

1. Go to: https://supabase.com/dashboard/project/onsflqhkgqhydeupiqyt/database/backups
2. Click "Create backup"
3. Wait for confirmation

### Step 2: Apply Migration (2 min)

1. Go to: https://supabase.com/dashboard/project/onsflqhkgqhydeupiqyt/sql/new
2. Open file: `supabase/migrations/301_fix_admin_rpc_role_check.sql`
3. Copy ALL content (Ctrl+A, Ctrl+C)
4. Paste into SQL Editor
5. Click "Run" (or Ctrl+Enter)
6. Wait for: "Success. No rows returned"

### Step 3: Verify (2 min)

Run this query in SQL Editor:

```sql
-- Check functions exist
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'get_admin_providers_v2',
  'count_admin_providers_v2',
  'get_admin_customers',
  'count_admin_customers'
);
```

**Expected:** 4 rows

### Step 4: Test Admin Page

1. Open: http://localhost:5173/admin/providers
2. Check: Page loads without 404 errors
3. Check: Provider list displays
4. Check: Real-time indicator shows "Live"

## ✅ Success Indicators

- ✅ No 404 errors in browser console
- ✅ Admin providers page loads
- ✅ Provider list displays
- ✅ Real-time updates working

## ❌ If Something Goes Wrong

### Error: "User not found"

Run this query:

```sql
-- Check your user
SELECT id, email, role FROM users WHERE email = 'superadmin@gobear.app';
```

If no results, you need to create the user record. See `PRODUCTION-DEPLOYMENT-CHECKLIST.md` for details.

### Error: "Access denied"

Run this query:

```sql
-- Update role
UPDATE users
SET role = 'super_admin'
WHERE email = 'superadmin@gobear.app';
```

### Functions Still Return 404

1. Verify migration ran without errors
2. Check functions exist with verification query above
3. Clear browser cache and reload
4. Check Supabase Dashboard → Database → Functions

## 📋 Full Documentation

For detailed instructions, troubleshooting, and rollback plan:

- **Checklist:** `PRODUCTION-DEPLOYMENT-CHECKLIST.md`
- **Verification Script:** `verify-production-deployment.sql`
- **Full Guide:** `PRODUCTION-DEPLOYMENT.md`

## 🆘 Need Help?

1. Check Supabase Dashboard → Logs → Postgres Logs
2. Check browser console (F12) for detailed errors
3. Review the full documentation files above
4. Contact Supabase support if needed

---

**Migration File:** `supabase/migrations/301_fix_admin_rpc_role_check.sql`
**Production URL:** `https://onsflqhkgqhydeupiqyt.supabase.co`
**Admin Email:** `superadmin@gobear.app`
