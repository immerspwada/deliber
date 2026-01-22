# 🚨 Apply Topup Requests Migration

**Date**: 2026-01-22  
**Status**: ⚠️ Pending Application  
**Priority**: 🔥 URGENT

---

## 📋 Issue

The topup requests page (`/admin/topup-requests`) is showing a rate limit error because the RPC functions don't exist in the production database yet.

**Error**: `คำขอมากเกินไป กรุณารอสักครู่` (Rate limit error)

**Root Cause**: Migration `316_topup_requests_system.sql` was created but not applied to production database.

---

## ✅ Solution

Apply the migration file to production database using one of these methods:

### Method 1: Supabase Dashboard (Recommended)

1. Go to https://supabase.com/dashboard/project/onsflqhkgqhydeupiqyt
2. Navigate to **SQL Editor**
3. Open the migration file: `supabase/migrations/316_topup_requests_system.sql`
4. Copy the entire SQL content
5. Paste into SQL Editor
6. Click **Run** to execute
7. Verify functions exist:
   ```sql
   SELECT proname FROM pg_proc WHERE proname LIKE '%topup%';
   ```

### Method 2: Supabase CLI (If Linked)

```bash
# Link project (if not already linked)
supabase link --project-ref onsflqhkgqhydeupiqyt

# Push migration
supabase db push --linked

# Verify
supabase db remote commit
```

### Method 3: Direct SQL Execution

If you have the database connection string:

```bash
psql "postgresql://postgres:[PASSWORD]@db.onsflqhkgqhydeupiqyt.supabase.co:5432/postgres" \
  -f supabase/migrations/316_topup_requests_system.sql
```

---

## 🔍 Verification Steps

After applying the migration, verify it worked:

### 1. Check Table Exists

```sql
SELECT * FROM topup_requests LIMIT 1;
```

### 2. Check RLS Policies

```sql
SELECT * FROM pg_policies WHERE tablename = 'topup_requests';
```

### 3. Check Functions Exist

```sql
SELECT proname, pronargs
FROM pg_proc
WHERE proname IN (
  'get_topup_requests_admin',
  'count_topup_requests_admin',
  'approve_topup_request',
  'reject_topup_request'
);
```

Expected output:

```
           proname            | pronargs
------------------------------+----------
 get_topup_requests_admin     |        3
 count_topup_requests_admin   |        1
 approve_topup_request        |        3
 reject_topup_request         |        3
```

### 4. Test Function Call

```sql
-- Should return empty array or data (not error)
SELECT * FROM get_topup_requests_admin(NULL, 10, 0);
```

### 5. Test in Application

1. Navigate to http://localhost:5173/admin/topup-requests
2. Page should load without rate limit error
3. Should show empty state or existing topup requests

---

## 📝 Migration Contents

The migration creates:

1. **Table**: `topup_requests`
   - Stores customer topup requests
   - Includes payment proof, status, amounts

2. **Indexes**:
   - `idx_topup_requests_user_id`
   - `idx_topup_requests_status`
   - `idx_topup_requests_requested_at`
   - `idx_topup_requests_processed_by`

3. **RLS Policies**:
   - Users can view/create own requests
   - Admins can view/update all requests

4. **Functions**:
   - `get_topup_requests_admin()` - Get paginated requests
   - `count_topup_requests_admin()` - Count for pagination
   - `approve_topup_request()` - Approve and credit wallet
   - `reject_topup_request()` - Reject with reason

5. **Permissions**:
   - GRANT SELECT, INSERT on topup_requests
   - GRANT EXECUTE on all functions

---

## ⚠️ Important Notes

### Security

- All functions use `SECURITY DEFINER`
- Admin role check using `public.users` table
- RLS policies protect customer data

### Dependencies

- Requires `wallets` table
- Requires `wallet_transactions` table
- Requires `users` table with `role` column

### Atomic Operations

- Approval uses `FOR UPDATE` locking
- Wallet updates are atomic
- Transaction records created automatically

---

## 🐛 Troubleshooting

### Error: "relation topup_requests does not exist"

- Migration not applied yet
- Apply using one of the methods above

### Error: "function get_topup_requests_admin does not exist"

- Functions not created
- Check if migration was fully executed
- Look for errors in migration execution

### Error: "Access denied. Admin privileges required"

- User doesn't have admin role
- Check: `SELECT role FROM users WHERE id = auth.uid();`
- Should return `'admin'`

### Error: "violates row-level security policy"

- RLS policies not created correctly
- Re-run RLS policy section of migration
- Verify policies exist: `SELECT * FROM pg_policies WHERE tablename = 'topup_requests';`

---

## 📊 Post-Migration Checklist

- [ ] Migration applied successfully
- [ ] Table `topup_requests` exists
- [ ] All 4 functions exist
- [ ] RLS policies created (4 policies)
- [ ] Indexes created (4 indexes)
- [ ] Permissions granted
- [ ] Admin page loads without error
- [ ] Can view topup requests (empty or with data)
- [ ] Documentation updated

---

## 🔗 Related Files

- Migration: `supabase/migrations/316_topup_requests_system.sql`
- Composable: `src/admin/composables/useAdminTopupRequests.ts`
- View: `src/admin/views/AdminTopupRequestsView.vue`
- Documentation: `.kiro/specs/admin-financial-settings/TOPUP-REQUESTS-SYSTEM.md`
- API Docs: `docs/admin-rpc-functions.md`

---

**Status**: ⚠️ Awaiting manual application via Supabase Dashboard  
**Next Step**: Apply migration using Method 1 (Dashboard) above  
**ETA**: 2-3 minutes to apply and verify
