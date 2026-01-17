# 🚀 Deploy Migration 301 to Production - Quick Guide

## ⚠️ Current Issue

Your admin providers page shows **404 errors** because migration 301 hasn't been applied to production yet.

**Error in console:**

```
POST https://onsflqhkgqhydeupiqyt.supabase.co/rest/v1/rpc/get_admin_providers_v2 404 (Not Found)
```

## ✅ Quick Fix (3 Steps)

### Step 1: Open Supabase Dashboard

Go to: https://supabase.com/dashboard/project/onsflqhkgqhydeupiqyt/sql/new

### Step 2: Copy & Paste Migration

1. Open file: `supabase/migrations/301_fix_admin_rpc_role_check.sql`
2. Copy **all content** (Cmd+A, Cmd+C)
3. Paste into SQL Editor
4. Click **"Run"** button

### Step 3: Test Admin Page

1. Go to: http://localhost:5173/admin/providers
2. Should load successfully ✅
3. No more 404 errors ✅

## 🔍 Verify It Worked

Run this in Supabase SQL Editor:

```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'get_admin_providers_v2',
  'count_admin_providers_v2'
);
```

**Expected result:** 2 rows showing both functions

## 🐛 Troubleshooting

### "Access denied. Admin privileges required"

Your user needs admin role. Run this:

```sql
UPDATE users
SET role = 'super_admin'
WHERE email = 'superadmin@gobear.app';
```

### "User not found"

Create user record:

```sql
-- First, get your auth user ID
SELECT id FROM auth.users WHERE email = 'superadmin@gobear.app';

-- Then create user record (replace YOUR-ID with the ID from above)
INSERT INTO users (id, email, role, first_name, last_name)
VALUES (
  'YOUR-ID',
  'superadmin@gobear.app',
  'super_admin',
  'Super',
  'Admin'
)
ON CONFLICT (id) DO UPDATE SET role = 'super_admin';
```

## 📚 More Details

See `PRODUCTION-DEPLOYMENT.md` for:

- Alternative deployment methods
- Detailed troubleshooting
- Rollback plan
- Security notes

## ✨ What This Migration Does

Fixes 4 RPC functions to check admin role in the correct table:

- ❌ Old: Checks `profiles` table (doesn't exist)
- ✅ New: Checks `users` table (correct)

Functions fixed:

1. `get_admin_providers_v2()` - Get provider list
2. `count_admin_providers_v2()` - Count providers
3. `get_admin_customers()` - Get customer list
4. `count_admin_customers()` - Count customers

## 🎯 Next Steps After Deploy

1. ✅ Test admin providers page loads
2. ✅ Test approve/reject provider actions
3. ✅ Verify real-time updates work
4. ✅ Test other admin pages (customers, orders)

---

**Need help?** Check `PRODUCTION-DEPLOYMENT.md` for detailed instructions.
