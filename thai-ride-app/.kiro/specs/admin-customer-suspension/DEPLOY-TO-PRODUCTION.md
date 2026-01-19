# 🚀 Production Deployment Guide

## Pre-Deployment Checklist

### ✅ Local Testing

- [x] Migration tested locally
- [x] All tests passing (15/15)
- [x] Components working
- [x] Real-time updates verified
- [x] Performance acceptable

### ✅ Code Review

- [x] TypeScript types correct
- [x] A11y compliant
- [x] Security reviewed
- [x] Error handling complete
- [x] Mobile responsive

## Deployment Steps

### 1. Backup Production Database

```bash
# Create backup before migration
npx supabase db dump --linked > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 2. Apply Migration to Production

#### Option A: Via Supabase CLI (Recommended)

```bash
# Link to production project (if not already)
npx supabase link --project-ref YOUR_PROJECT_REF

# Push migration
npx supabase db push --linked

# Verify migration applied
npx supabase migration list --linked
```

#### Option B: Via Supabase Dashboard

1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **SQL Editor**
4. Copy content from `supabase/migrations/312_customer_suspension_system.sql`
5. Paste and run
6. Verify no errors

### 3. Verify Database Changes

```sql
-- Check columns added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'profiles'
AND column_name IN ('status', 'suspended_at', 'suspension_reason');

-- Check functions created
SELECT routine_name
FROM information_schema.routines
WHERE routine_name LIKE 'admin_%customer%';

-- Expected output:
-- admin_suspend_customer
-- admin_unsuspend_customer
-- admin_bulk_suspend_customers
-- admin_get_customers

-- Check indexes
SELECT indexname
FROM pg_indexes
WHERE tablename = 'profiles'
AND indexname LIKE '%status%';
```

### 4. Test RPC Functions

```sql
-- Test as admin user
SELECT admin_get_customers(
  p_search := NULL,
  p_status := NULL,
  p_limit := 10,
  p_offset := 0
);

-- Should return customer list
```

### 5. Deploy Frontend

```bash
# Build production
npm run build

# Deploy to Vercel (or your platform)
vercel --prod

# Or if using other platform:
# npm run deploy
```

### 6. Verify Production

#### Test Checklist:

- [ ] Login as admin
- [ ] Navigate to `/admin/customers`
- [ ] Search works
- [ ] Filter works
- [ ] Can view customer details
- [ ] Can suspend customer
- [ ] Can unsuspend customer
- [ ] Real-time updates work
- [ ] Bulk actions work
- [ ] Mobile responsive
- [ ] No console errors

### 7. Monitor

```bash
# Watch logs
npx supabase functions logs --linked

# Check for errors
# Monitor performance
# Watch real-time connections
```

## Rollback Plan

### If Issues Occur:

#### 1. Rollback Migration

```sql
-- Drop functions
DROP FUNCTION IF EXISTS admin_suspend_customer;
DROP FUNCTION IF EXISTS admin_unsuspend_customer;
DROP FUNCTION IF EXISTS admin_bulk_suspend_customers;
DROP FUNCTION IF EXISTS admin_get_customers;

-- Remove columns (CAREFUL!)
ALTER TABLE profiles
DROP COLUMN IF EXISTS status,
DROP COLUMN IF EXISTS suspended_at,
DROP COLUMN IF EXISTS suspension_reason;

-- Drop indexes
DROP INDEX IF EXISTS idx_profiles_status;
DROP INDEX IF EXISTS idx_profiles_email;
DROP INDEX IF EXISTS idx_profiles_phone;
```

#### 2. Restore from Backup

```bash
# Restore database
psql $DATABASE_URL < backup_YYYYMMDD_HHMMSS.sql
```

#### 3. Revert Frontend

```bash
# Revert to previous deployment
vercel rollback
```

## Post-Deployment

### 1. Monitor Performance

```sql
-- Check query performance
SELECT
  query,
  mean_exec_time,
  calls
FROM pg_stat_statements
WHERE query LIKE '%admin_%customer%'
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### 2. Monitor Errors

```bash
# Check Supabase logs
npx supabase functions logs --linked

# Check application logs
# Check Sentry (if configured)
```

### 3. User Feedback

- Monitor support tickets
- Check user reports
- Gather admin feedback

## Security Verification

### RLS Policies

```sql
-- Verify only admins can access
SELECT * FROM pg_policies
WHERE tablename = 'profiles';

-- Test as non-admin (should fail)
-- Test as admin (should work)
```

### Function Security

```sql
-- Verify SECURITY DEFINER
SELECT
  routine_name,
  security_type
FROM information_schema.routines
WHERE routine_name LIKE 'admin_%customer%';

-- All should be 'DEFINER'
```

## Performance Benchmarks

### Expected Metrics:

- Load customers: < 500ms
- Search: < 300ms
- Suspend action: < 200ms
- Real-time update: < 100ms

### Monitor:

```sql
-- Slow queries
SELECT * FROM pg_stat_statements
WHERE mean_exec_time > 1000
ORDER BY mean_exec_time DESC;

-- Index usage
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan
FROM pg_stat_user_indexes
WHERE tablename = 'profiles';
```

## Troubleshooting

### Issue: Migration Fails

**Error**: Column already exists

```sql
-- Check existing columns
SELECT column_name FROM information_schema.columns
WHERE table_name = 'profiles';

-- Migration uses IF NOT EXISTS, should not fail
-- If fails, check for typos or conflicts
```

### Issue: RPC Function Not Found

**Error**: function admin_suspend_customer does not exist

```sql
-- Check function exists
SELECT routine_name FROM information_schema.routines
WHERE routine_name = 'admin_suspend_customer';

-- If not exists, re-run migration
```

### Issue: Permission Denied

**Error**: permission denied for function

```sql
-- Grant permissions
GRANT EXECUTE ON FUNCTION admin_suspend_customer TO authenticated;
GRANT EXECUTE ON FUNCTION admin_unsuspend_customer TO authenticated;
GRANT EXECUTE ON FUNCTION admin_bulk_suspend_customers TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_customers TO authenticated;
```

### Issue: Real-time Not Working

**Check**:

1. Supabase Realtime enabled?
2. Table replication enabled?
3. Subscription connected?

```typescript
// Debug subscription
console.log(realtimeChannel.state); // should be 'joined'
```

## Success Criteria

### ✅ Deployment Successful When:

- [ ] Migration applied without errors
- [ ] All RPC functions working
- [ ] Frontend deployed successfully
- [ ] Admin can suspend/unsuspend customers
- [ ] Real-time updates working
- [ ] No performance degradation
- [ ] No security issues
- [ ] Mobile works correctly
- [ ] Tests passing in production
- [ ] Monitoring shows healthy metrics

## Support

### Contact:

- Dev Team: [your-team@example.com]
- On-call: [on-call-number]
- Slack: #admin-panel-support

### Documentation:

- [IMPLEMENTATION-COMPLETE.md](./IMPLEMENTATION-COMPLETE.md)
- [QUICK-START-TH.md](./QUICK-START-TH.md)
- [Migration File](../../migrations/312_customer_suspension_system.sql)

## Timeline

### Estimated Deployment Time:

- Backup: 5 minutes
- Migration: 2 minutes
- Verification: 10 minutes
- Frontend Deploy: 5 minutes
- Testing: 15 minutes
- **Total: ~40 minutes**

### Recommended Window:

- Low traffic period
- Have rollback plan ready
- Team available for support

---

**Deployment Date**: ******\_******
**Deployed By**: ******\_******
**Status**: ⬜ Success ⬜ Rollback ⬜ Issues

**Notes**:

---

---

---
