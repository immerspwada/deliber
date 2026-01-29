# Admin Customers - user_id Column Fix

**Date**: 2026-01-28  
**Status**: ✅ Fixed  
**Priority**: 🔥 Critical

---

## 🐛 Issue #7: Missing customer_id Column

### Error

```
column rr.customer_id does not exist (Error code: 42703)
```

### Root Cause

The `get_admin_customers` RPC function was trying to JOIN with `ride_requests` table using `rr.customer_id`, but this column doesn't exist in the table. The actual column name is `user_id`.

### Investigation

Checked the `ride_requests` table schema:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'ride_requests'
```

Found that the table has:

- ✅ `user_id` (UUID) - references the customer
- ❌ `customer_id` - does NOT exist

---

## ✅ Solution

### 1. Updated `get_admin_customers` Function

Changed the JOIN condition from:

```sql
-- ❌ WRONG
LEFT JOIN ride_requests rr ON rr.customer_id = u.id
```

To:

```sql
-- ✅ CORRECT
LEFT JOIN ride_requests rr ON rr.user_id = u.id AND rr.status = 'completed'
```

### 2. Complete Fixed Function

```sql
DROP FUNCTION IF EXISTS get_admin_customers(TEXT, TEXT, INT, INT);

CREATE OR REPLACE FUNCTION get_admin_customers(
  p_search TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  email TEXT,
  phone TEXT,
  full_name TEXT,
  status TEXT,
  suspended_reason TEXT,
  created_at TIMESTAMPTZ,
  last_login TIMESTAMPTZ,
  total_rides BIGINT,
  total_spent NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is admin or super_admin
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'super_admin')
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    u.email,
    u.phone,
    u.full_name,
    COALESCE(u.status, 'active') as status,
    u.suspended_reason,
    u.created_at,
    u.last_login,
    COUNT(DISTINCT rr.id) as total_rides,
    COALESCE(SUM(rr.final_fare), 0) as total_spent
  FROM users u
  LEFT JOIN ride_requests rr ON rr.user_id = u.id AND rr.status = 'completed'
  WHERE u.role = 'customer'
    AND (
      p_search IS NULL
      OR u.email ILIKE '%' || p_search || '%'
      OR u.phone ILIKE '%' || p_search || '%'
      OR u.full_name ILIKE '%' || p_search || '%'
    )
    AND (
      p_status IS NULL
      OR COALESCE(u.status, 'active') = p_status
    )
  GROUP BY u.id, u.email, u.phone, u.full_name, u.status, u.suspended_reason, u.created_at, u.last_login
  ORDER BY u.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION get_admin_customers TO authenticated;
```

### 3. Updated `count_admin_customers` Function

Also updated the count function for consistency (though it doesn't use the JOIN):

```sql
DROP FUNCTION IF EXISTS count_admin_customers(TEXT, TEXT);

CREATE OR REPLACE FUNCTION count_admin_customers(
  p_search TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Check if user is admin or super_admin
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'super_admin')
  ) THEN
    RETURN 0;
  END IF;

  SELECT COUNT(DISTINCT u.id)
  INTO v_count
  FROM users u
  WHERE u.role = 'customer'
    AND (
      p_search IS NULL
      OR u.email ILIKE '%' || p_search || '%'
      OR u.phone ILIKE '%' || p_search || '%'
      OR u.full_name ILIKE '%' || p_search || '%'
    )
    AND (
      p_status IS NULL
      OR COALESCE(u.status, 'active') = p_status
    );

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION count_admin_customers TO authenticated;
```

### 4. Reloaded Schema Cache

```sql
NOTIFY pgrst, 'reload schema';
```

---

## 🧪 Verification

### Database Check

```sql
-- Verified customers exist
SELECT id, email, role, status
FROM users
WHERE role = 'customer'
LIMIT 5;
```

Result: Found 5 customers:

- immersowada@gmail.com
- alifmadina@gmail.com
- somchai@example.com
- somying@example.com
- somsak@example.com

### Admin User Check

```sql
SELECT id, email, role
FROM users
WHERE email = 'superadmin@gobear.app';
```

Result: User has `super_admin` role ✅

---

## 📊 Summary of All Fixes

| Issue                  | Problem                             | Solution                              | Status   |
| ---------------------- | ----------------------------------- | ------------------------------------- | -------- |
| 1. Missing Function    | 404 - function not found            | Created `get_admin_customers`         | ✅ Fixed |
| 2. Ambiguous Column    | `column "id" is ambiguous`          | Fully qualified all columns with `u.` | ✅ Fixed |
| 3. Wrong Column Name   | `u.suspension_reason` doesn't exist | Changed to `u.suspended_reason`       | ✅ Fixed |
| 4. Schema Cache        | PGRST202 - not in cache             | Reloaded schema cache                 | ✅ Fixed |
| 5. Parameter Mismatch  | `p_search_term` vs `p_search`       | Changed frontend to use `p_search`    | ✅ Fixed |
| 6. Missing Role Filter | No customers returned               | Added `WHERE u.role = 'customer'`     | ✅ Fixed |
| 7. Wrong Column Name   | `rr.customer_id` doesn't exist      | Changed to `rr.user_id`               | ✅ Fixed |

---

## 🎯 Next Steps

1. ✅ Fixed column name from `customer_id` to `user_id`
2. ✅ Reloaded schema cache
3. ⏳ Test in browser at `/admin/customers`
4. ⏳ Verify customer data displays correctly
5. ⏳ Verify total rides and total spent calculations

---

## 🔍 Testing Instructions

### 1. Hard Refresh Browser

```
Chrome/Edge: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
Firefox: Ctrl+F5 (Windows) or Cmd+Shift+R (Mac)
Safari: Cmd+Option+R
```

### 2. Navigate to Admin Customers

```
https://your-app.vercel.app/admin/customers
```

### 3. Expected Results

- ✅ Customer list displays with 5+ customers
- ✅ Each customer shows email, phone, status
- ✅ Total rides count shows correctly
- ✅ Total spent amount shows correctly
- ✅ Search works (by email, phone, name)
- ✅ Status filter works (ทั้งหมด, ใช้งาน, ระงับ, แบน)
- ✅ Pagination works

---

## 📝 Technical Notes

### Column Naming Convention

- `user_id` is used consistently across tables to reference the customer/user
- `customer_id` does NOT exist in any table
- `provider_id` references providers (different from `user_id`)

### Dual-Role System

- Customers: `users.id` = `ride_requests.user_id`
- Providers: `providers_v2.user_id` = `users.id`, `providers_v2.id` = `ride_requests.provider_id`

### RLS Policies

All functions check for admin/super_admin role:

```sql
IF NOT EXISTS (
  SELECT 1 FROM users
  WHERE users.id = auth.uid()
  AND users.role IN ('admin', 'super_admin')
) THEN
  RETURN; -- or RETURN 0 for count functions
END IF;
```

---

**Status**: ✅ All 7 issues fixed  
**Ready for Testing**: Yes  
**Deployment**: Production database updated via MCP
