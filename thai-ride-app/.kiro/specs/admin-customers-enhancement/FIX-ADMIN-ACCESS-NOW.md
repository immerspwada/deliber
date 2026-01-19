# 🚨 FIX ADMIN ACCESS - DO THIS NOW

## The Problem

You're seeing this error in the browser console:

```
POST /rest/v1/rpc/admin_get_customers 400 (Bad Request)
Error: Unauthorized: Admin access required
```

## The Solution (2 minutes)

### Step 1: Open Supabase SQL Editor

Go to: https://supabase.com/dashboard/project/onsflqhkgqhydeupiqyt/sql/new

### Step 2: Run the Quick Fix

1. Open the file: `.kiro/specs/admin-customers-enhancement/QUICK-FIX.sql`
2. Copy ALL the content
3. Paste into Supabase SQL Editor
4. Click **"Run"** button

### Step 3: Verify

Refresh your browser at: http://localhost:5173/admin/customers

The customers list should now load successfully! ✅

## What This Does

1. ✅ Ensures your admin user (superadmin@gobear.app) has `role = 'admin'` in the profiles table
2. ✅ Recreates the `admin_get_customers` function with proper authentication checks
3. ✅ Grants necessary permissions
4. ✅ Tests the fix automatically

## Alternative: Apply Full Migration 314

If you prefer to apply the complete migration:

```bash
# Option 1: Via Dashboard
# Copy content from: supabase/migrations/314_fix_admin_customers_access.sql
# Paste and run in SQL Editor

# Option 2: Via CLI (if you have it set up)
npx supabase db push --linked
```

## Troubleshooting

### Still getting errors?

Run the verification script:

```bash
# Open: .kiro/specs/admin-customers-enhancement/verify-admin-role.sql
# Copy and paste into SQL Editor
# Check the results
```

### Need to check your admin role?

```sql
SELECT id, email, role FROM profiles WHERE email = 'superadmin@gobear.app';
```

Should show: `role = 'admin'`

## Files Created

- ✅ `QUICK-FIX.sql` - One-click fix script
- ✅ `verify-admin-role.sql` - Diagnostic queries
- ✅ `PRODUCTION-FIX-NOW.md` - Detailed deployment guide

## Next Steps After Fix

1. Test customer list loads
2. Test customer suspension features
3. Test other admin functions
4. Monitor for any auth errors

---

**Estimated Time**: 2 minutes  
**Downtime**: None (atomic function replacement)  
**Rollback**: Available if needed
