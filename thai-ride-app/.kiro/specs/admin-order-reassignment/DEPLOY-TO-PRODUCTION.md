# Deploy Order Reassignment to Production

## Quick Deployment Steps

### Step 1: Apply Database Migration

#### Option A: Using Supabase CLI (Recommended)

```bash
# Make sure you're linked to production
npx supabase link --project-ref YOUR_PROJECT_REF

# Push migration to production
npx supabase db push --linked

# Verify migration applied
npx supabase migration list --linked
```

#### Option B: Using Supabase Dashboard

1. Go to https://supabase.com/dashboard/project/YOUR_PROJECT/editor
2. Open SQL Editor
3. Copy entire contents of `supabase/migrations/306_admin_order_reassignment_system.sql`
4. Paste and run in SQL Editor
5. Verify no errors

### Step 2: Verify Database Functions

Run these queries in Supabase SQL Editor to verify:

```sql
-- 1. Check table exists
SELECT COUNT(*) FROM public.order_reassignments;
-- Expected: 0 (empty table)

-- 2. Check functions exist
SELECT proname FROM pg_proc WHERE proname IN (
  'reassign_order',
  'get_reassignment_history',
  'get_available_providers'
);
-- Expected: 3 rows

-- 3. Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'order_reassignments';
-- Expected: rowsecurity = true

-- 4. Check policies exist
SELECT policyname FROM pg_policies
WHERE tablename = 'order_reassignments';
-- Expected: admin_full_access_reassignments
```

### Step 3: Test Functions in Production

```sql
-- Test get_available_providers (as admin)
SELECT * FROM get_available_providers('ride', 5);
-- Should return list of approved providers

-- Test get_reassignment_history (as admin)
SELECT * FROM get_reassignment_history(NULL, NULL, 10, 0);
-- Should return empty array (no reassignments yet)
```

### Step 4: Deploy Frontend Code

```bash
# Build production bundle
npm run build

# Deploy to your hosting platform
# For Vercel:
vercel --prod

# For other platforms, follow their deployment process
```

### Step 5: Verify in Production

1. **Login as Admin**
   - Go to your production URL
   - Login with admin credentials

2. **Navigate to Orders**
   - Go to `/admin/orders`
   - Find an order with a provider assigned

3. **Test Reassignment**
   - Click the orange reassignment button (circular arrows)
   - Modal should open showing available providers
   - Select a different provider
   - Add reason (optional)
   - Click "ยืนยันการย้ายงาน"
   - Should see success message

4. **Verify Changes**
   - Order should show new provider
   - Check database for audit record:
   ```sql
   SELECT * FROM order_reassignments
   ORDER BY created_at DESC
   LIMIT 1;
   ```

### Step 6: Monitor for Issues

Check for errors in:

1. **Supabase Logs**: Dashboard → Logs → API/Postgres
2. **Browser Console**: Check for JavaScript errors
3. **Network Tab**: Check for failed API calls

## Rollback Plan

If issues occur, you can rollback:

### Rollback Database Changes

```sql
-- Drop functions
DROP FUNCTION IF EXISTS public.reassign_order;
DROP FUNCTION IF EXISTS public.get_reassignment_history;
DROP FUNCTION IF EXISTS public.get_available_providers;

-- Drop table
DROP TABLE IF EXISTS public.order_reassignments;
```

### Rollback Frontend

```bash
# Revert to previous deployment
vercel rollback

# Or redeploy previous version
git revert HEAD
npm run build
vercel --prod
```

## Production Checklist

- [ ] Migration 306 applied successfully
- [ ] All 3 RPC functions exist
- [ ] RLS policies are active
- [ ] Table indexes created
- [ ] Functions tested with admin user
- [ ] Frontend deployed
- [ ] Reassignment button visible on orders page
- [ ] Modal opens and loads providers
- [ ] Reassignment completes successfully
- [ ] Audit trail records correctly
- [ ] No console errors
- [ ] No API errors in Supabase logs

## Common Production Issues

### Issue: "Function does not exist"

**Solution:**

```sql
-- Check if functions are in correct schema
SELECT n.nspname, p.proname
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname LIKE '%reassign%';

-- If in wrong schema, recreate in public schema
```

### Issue: "Permission denied for function"

**Solution:**

```sql
-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.reassign_order TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_reassignment_history TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_available_providers TO authenticated;
```

### Issue: "Only admins can reassign orders"

**Solution:**

```sql
-- Verify user has admin role
SELECT id, email, role FROM profiles WHERE email = 'your-admin@email.com';

-- If role is not 'admin', update it
UPDATE profiles SET role = 'admin' WHERE email = 'your-admin@email.com';
```

### Issue: "Provider not found"

**Solution:**

```sql
-- Check provider exists in providers_v2
SELECT id, full_name, status FROM providers_v2 WHERE id = 'provider-id';

-- Check provider is approved
UPDATE providers_v2 SET status = 'approved' WHERE id = 'provider-id';
```

## Performance Monitoring

After deployment, monitor these metrics:

```sql
-- Check reassignment frequency
SELECT
  DATE(created_at) as date,
  COUNT(*) as reassignments
FROM order_reassignments
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Check most common reasons
SELECT
  reason,
  COUNT(*) as count
FROM order_reassignments
WHERE reason IS NOT NULL
GROUP BY reason
ORDER BY count DESC;

-- Check which admins are reassigning
SELECT
  p.full_name,
  COUNT(*) as reassignments
FROM order_reassignments r
JOIN profiles p ON p.id = r.reassigned_by
GROUP BY p.full_name
ORDER BY reassignments DESC;
```

## Support Contacts

If you encounter issues during deployment:

1. Check Supabase Dashboard logs
2. Review this documentation
3. Check test cases for examples
4. Review migration SQL for schema details

## Post-Deployment Tasks

1. **Notify Team**
   - Inform admin users about new feature
   - Provide training if needed

2. **Monitor Usage**
   - Track reassignment frequency
   - Identify common reasons
   - Optimize provider selection

3. **Gather Feedback**
   - Ask admins for feedback
   - Note any issues or improvements
   - Plan future enhancements

## Success Criteria

Deployment is successful when:

- ✅ Migration applied without errors
- ✅ All functions working correctly
- ✅ RLS policies protecting data
- ✅ Frontend deployed and accessible
- ✅ Reassignment completes successfully
- ✅ Audit trail records correctly
- ✅ No errors in logs
- ✅ Admin users can use feature
