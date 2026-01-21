# 🚀 Quick Start - Production Deployment

## 5-Minute Deployment Guide

### Prerequisites

- ✅ Supabase Dashboard access
- ✅ Admin credentials
- ✅ Migrations 306, 308, 309 ready

### Step 1: Backup (1 minute)

```
Dashboard → Database → Backups → Create backup
```

### Step 2: Deploy Migrations (3 minutes)

**A. Migration 306**

1. Open SQL Editor
2. Copy `supabase/migrations/306_admin_order_reassignment_system.sql`
3. Paste and Run
4. Verify: `SELECT COUNT(*) FROM order_reassignments;` → Should work

**B. Migration 308**

1. New query in SQL Editor
2. Copy `supabase/migrations/308_customer_suspension_system_production_ready.sql`
3. Paste and Run
4. Verify: `SELECT column_name FROM information_schema.columns WHERE table_name='profiles' AND column_name='status';` → Should return 1 row

**C. Migration 309**

1. New query in SQL Editor
2. Copy `supabase/migrations/309_fix_get_admin_customers_status.sql`
3. Paste and Run
4. Verify: `SELECT * FROM get_admin_customers(1, 5, NULL, NULL);` → Should return customers with status

### Step 3: Verify (1 minute)

Run this one query:

```sql
-- Quick verification
SELECT
  (SELECT COUNT(*) FROM information_schema.routines
   WHERE routine_schema = 'public'
   AND routine_name IN ('reassign_order', 'get_available_providers',
                         'suspend_customer_account', 'get_admin_customers')) as functions_count,
  (SELECT COUNT(*) FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name = 'order_reassignments') as table_count,
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = 'public'
   AND table_name = 'profiles'
   AND column_name IN ('status', 'suspension_reason')) as columns_count;
```

**Expected Result:**

```
functions_count: 6
table_count: 1
columns_count: 2
```

### Success! ✅

If all numbers match, deployment is successful.

### If Something Goes Wrong

See full guide: `DEPLOYMENT-GUIDE.md`

Or quick rollback:

```sql
-- Rollback 309
DROP FUNCTION IF EXISTS public.get_admin_customers(INTEGER, INTEGER, TEXT, TEXT);

-- Rollback 308
ALTER TABLE profiles DROP COLUMN IF EXISTS status, DROP COLUMN IF EXISTS suspension_reason;
DROP FUNCTION IF EXISTS suspend_customer_account;

-- Rollback 306
DROP TABLE IF EXISTS order_reassignments CASCADE;
```

### Next Steps

1. Test in admin panel: `/admin/orders` and `/admin/customers`
2. Monitor logs for 1 hour
3. Document deployment

---

**Full Documentation:** See `DEPLOYMENT-GUIDE.md` for detailed instructions, troubleshooting, and rollback procedures.
