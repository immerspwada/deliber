# 🚀 Deploy Migrations 297-305 - Complete Guide

## ⚠️ Prerequisites

1. **Start Docker & Supabase**

   ```bash
   # Start Docker Desktop (macOS)
   open -a Docker

   # Wait for Docker to start, then verify
   docker ps

   # Start Supabase local stack
   npx supabase start

   # Verify status
   npx supabase status
   ```

2. **Check Current Migration Status**
   ```bash
   # List applied migrations
   npx supabase migration list --local
   ```

## 📋 Migration Deployment Order

### Migration 297 - Admin Priority 1 RPC Functions

**Purpose**: Core admin RPC functions (customers, providers)

```bash
# Apply migration
npx supabase db push --local

# Verify functions created
npx supabase db execute --local "
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE 'admin_get_%'
ORDER BY routine_name;
"
```

**Expected Functions**:

- `admin_get_customers`
- `admin_get_providers`

---

### Migration 298 - Admin Priority 2 RPC Functions

**Purpose**: Additional admin functions (orders, payments, revenue)

```bash
# Apply migration (if not auto-applied)
npx supabase db push --local

# Verify functions
npx supabase db execute --local "
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'admin_get_orders',
    'admin_get_payments',
    'admin_get_revenue_stats'
  );
"
```

---

### Migration 299 - Admin Priority 3 RPC Functions

**Purpose**: Advanced admin functions (scheduled rides, withdrawals, topup)

```bash
# Apply migration
npx supabase db push --local

# Verify functions
npx supabase db execute --local "
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'admin_get_scheduled_rides',
    'admin_get_withdrawals',
    'admin_get_topup_requests'
  );
"
```

---

### Migration 300 - Admin RLS Policy Verification

**Purpose**: Comprehensive RLS policies for admin access

```bash
# Apply migration
npx supabase db push --local

# Verify RLS policies
npx supabase db execute --local "
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE policyname LIKE 'admin_%'
ORDER BY tablename, policyname;
"
```

**Expected Policies**: Admin policies on all major tables

---

### Migration 301 - Fix Admin RPC Role Check

**Purpose**: Fix role checking in admin RPC functions

```bash
# Apply migration
npx supabase db push --local

# Test role check
npx supabase db execute --local "
-- This should work for admin users
SELECT admin_get_customers(
  p_limit := 10,
  p_offset := 0
);
"
```

---

### Migration 302 - Fix Admin Providers Ambiguous ID

**Purpose**: Fix ambiguous column references in admin_get_providers

```bash
# Apply migration
npx supabase db push --local

# Test providers query
npx supabase db execute --local "
SELECT admin_get_providers(
  p_limit := 10,
  p_offset := 0
);
"
```

---

### Migration 303 - Fix Wallets Table Reference

**Purpose**: Fix wallet-related queries in admin functions

```bash
# Apply migration
npx supabase db push --local

# Verify wallet references
npx supabase db execute --local "
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_name = 'wallets'
  AND column_name IN ('balance', 'user_id', 'provider_id');
"
```

---

### Migration 304 - Fix Admin Providers Missing Columns

**Purpose**: Add missing columns to admin_get_providers response

```bash
# Apply migration
npx supabase db push --local

# Test complete provider data
npx supabase db execute --local "
SELECT * FROM admin_get_providers(
  p_limit := 1,
  p_offset := 0
) LIMIT 1;
"
```

---

### Migration 305 - Fix Topup Requests Columns

**Purpose**: Fix column references in admin_get_topup_requests

```bash
# Apply migration
npx supabase db push --local

# Test topup requests query
npx supabase db execute --local "
SELECT * FROM admin_get_topup_requests(
  p_limit := 10,
  p_offset := 0
);
"
```

---

## ✅ Complete Verification Script

After all migrations are applied:

```bash
# Generate updated types
npx supabase gen types --local > src/types/database.ts

# Run comprehensive verification
npx supabase db execute --local "
-- 1. Check all admin RPC functions exist
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE 'admin_%'
ORDER BY routine_name;

-- 2. Check all admin RLS policies
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE policyname LIKE 'admin_%'
ORDER BY tablename, policyname;

-- 3. Test each admin function
SELECT 'admin_get_customers' as function,
       COUNT(*) as result_count
FROM admin_get_customers(10, 0);

SELECT 'admin_get_providers' as function,
       COUNT(*) as result_count
FROM admin_get_providers(10, 0);

SELECT 'admin_get_orders' as function,
       COUNT(*) as result_count
FROM admin_get_orders(10, 0);

SELECT 'admin_get_topup_requests' as function,
       COUNT(*) as result_count
FROM admin_get_topup_requests(10, 0);
"
```

---

## 🔍 Troubleshooting

### Issue: Docker not running

```bash
# Start Docker Desktop
open -a Docker

# Wait 30 seconds, then check
docker ps
```

### Issue: Supabase not started

```bash
# Start Supabase
npx supabase start

# Check status
npx supabase status
```

### Issue: Migration already applied

```bash
# Check migration history
npx supabase migration list --local

# If needed, reset and reapply
npx supabase db reset --local
```

### Issue: Function errors

```bash
# Check Postgres logs
npx supabase db execute --local "
SELECT * FROM pg_stat_statements
WHERE query LIKE '%admin_%'
ORDER BY total_exec_time DESC
LIMIT 10;
"

# Check for errors in logs
tail -f $(npx supabase status | grep 'DB URL' | awk '{print $NF}')/logs/postgres.log
```

---

## 🎯 Quick Deploy (All at Once)

If you want to deploy all migrations at once:

```bash
# 1. Start services
open -a Docker
sleep 30
npx supabase start

# 2. Apply all migrations
npx supabase db push --local

# 3. Generate types
npx supabase gen types --local > src/types/database.ts

# 4. Verify
npx supabase db execute --local "
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE 'admin_%'
ORDER BY routine_name;
"

# 5. Run tests
npm run test -- src/tests/admin-*.test.ts
```

---

## 📊 Expected Results

After successful deployment:

- ✅ 15+ admin RPC functions created
- ✅ 20+ admin RLS policies applied
- ✅ All admin views functional
- ✅ Types generated successfully
- ✅ All tests passing

---

## 🚀 Production Deployment

Once verified locally, deploy to production:

```bash
# 1. Link to production project
npx supabase link --project-ref YOUR_PROJECT_REF

# 2. Push migrations to production
npx supabase db push

# 3. Generate production types
npx supabase gen types --project-ref YOUR_PROJECT_REF > src/types/database.ts

# 4. Verify in production
npx supabase db execute --project-ref YOUR_PROJECT_REF "
SELECT routine_name
FROM information_schema.routines
WHERE routine_name LIKE 'admin_%';
"
```

---

## 📝 Notes

- Migrations are applied in order automatically by `db push`
- Each migration builds on the previous one
- Always verify locally before production deployment
- Keep types in sync after schema changes
- Run tests after each deployment

---

## 🎉 Success Criteria

- [ ] Docker running
- [ ] Supabase started
- [ ] All migrations applied (297-305)
- [ ] Types generated
- [ ] All admin functions working
- [ ] All RLS policies active
- [ ] Tests passing
- [ ] No errors in logs
