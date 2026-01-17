# Deploy Migration 302 - Quick Guide

## Issue

Admin providers page shows errors:

- ❌ "column reference 'id' is ambiguous"
- ❌ "operator does not exist: provider_status = text"

## Fix

Migration 302 fixes both issues by:

1. Qualifying all column references explicitly
2. Ensuring proper type casting for enum comparisons

## Deploy Now

### Option 1: Production (Supabase Dashboard)

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard/project/YOUR_PROJECT_ID

2. **Navigate to SQL Editor**
   - Click "SQL Editor" in left sidebar

3. **Copy & Paste Migration**
   - Open: `supabase/migrations/302_fix_admin_providers_ambiguous_id.sql`
   - Copy entire contents
   - Paste into SQL Editor
   - Click "Run"

4. **Verify**

   ```sql
   -- Test the fix
   SELECT id, email, status
   FROM get_admin_providers_v2(NULL, NULL, 5, 0);

   SELECT count_admin_providers_v2(NULL, NULL);
   ```

### Option 2: Local Development

```bash
# 1. Start Docker Desktop
open -a "Docker Desktop"

# 2. Wait for Docker to start, then start Supabase
npx supabase start

# 3. Apply migration
npx supabase db push --local

# 4. Test in browser
# Navigate to: http://localhost:5173/admin/providers
```

### Option 3: CLI to Production

```bash
# Link to your project (if not already linked)
npx supabase link --project-ref YOUR_PROJECT_REF

# Push migration to production
npx supabase db push

# Verify
npx supabase db remote commit
```

## Verification

After deployment, the admin providers page should:

- ✅ Load without errors
- ✅ Display provider list
- ✅ Show correct pagination count
- ✅ Filter by status works
- ✅ Filter by provider type works

## Rollback (if needed)

If something goes wrong:

```sql
-- Restore previous version (migration 301)
-- Copy contents from: supabase/migrations/301_fix_admin_rpc_role_check.sql
-- Run in SQL Editor
```

## Next Steps

After successful deployment:

1. Test admin providers page thoroughly
2. Check all filter combinations
3. Verify pagination works
4. Test with different admin users

## Support

If issues persist:

1. Check browser console for errors
2. Check Supabase logs in Dashboard
3. Verify admin user has correct role in `users` table
4. Check RLS policies are enabled
