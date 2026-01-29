# Admin Customers - last_login Column Fix

**Date**: 2026-01-28  
**Status**: ✅ Fixed  
**Priority**: 🔥 Critical

---

## 🐛 Issue #8: Missing last_login Column

### Error

```
column u.last_login does not exist (Error code: 42703)
```

### Root Cause

The `get_admin_customers` RPC function was trying to SELECT `u.last_login`, but this column doesn't exist in the `users` table. The actual column name is `last_sign_in_at`.

### Investigation

Checked the `users` table schema:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name LIKE '%login%'
```

Result: No columns with 'login' in the name.

Found the correct column:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name LIKE '%sign%'
```

Result: `last_sign_in_at` (TIMESTAMPTZ)

---

## ✅ Solution

### 1. Updated RPC Function Return Type

Changed from:

```sql
-- ❌ WRONG
RETURNS TABLE (
  ...
  last_login TIMESTAMPTZ,
  ...
)
```

To:

```sql
-- ✅ CORRECT
RETURNS TABLE (
  ...
  last_sign_in_at TIMESTAMPTZ,
  ...
)
```

### 2. Updated SELECT Statement

Changed from:

```sql
-- ❌ WRONG
SELECT
  ...
  u.last_login,
  ...
```

To:

```sql
-- ✅ CORRECT
SELECT
  ...
  u.last_sign_in_at,
  ...
```

### 3. Updated GROUP BY Clause

Changed from:

```sql
-- ❌ WRONG
GROUP BY u.id, ..., u.last_login
```

To:

```sql
-- ✅ CORRECT
GROUP BY u.id, ..., u.last_sign_in_at
```

### 4. Complete Fixed Function

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
  last_sign_in_at TIMESTAMPTZ,
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
    u.last_sign_in_at,
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
  GROUP BY u.id, u.email, u.phone, u.full_name, u.status, u.suspended_reason, u.created_at, u.last_sign_in_at
  ORDER BY u.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION get_admin_customers TO authenticated;

COMMENT ON FUNCTION get_admin_customers IS 'Get customers list for admin. Uses last_sign_in_at instead of last_login.';
```

### 5. Updated Frontend Interface

Changed `src/admin/composables/useAdminCustomers.ts`:

```typescript
// ❌ OLD Interface
export interface AdminCustomer {
  id: string;
  email: string;
  full_name: string;
  phone_number: string;
  status: "active" | "suspended" | "banned";
  wallet_balance: number;
  total_orders: number;
  total_spent: number;
  average_rating: number;
  created_at: string;
  last_order_at: string | null;
  suspension_reason: string | null;
  suspended_at: string | null;
  suspended_by: string | null;
}

// ✅ NEW Interface (matches RPC function)
export interface AdminCustomer {
  id: string;
  email: string;
  phone: string;
  full_name: string;
  status: "active" | "suspended" | "banned";
  suspended_reason: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  total_rides: number;
  total_spent: number;
}
```

### 6. Reloaded Schema Cache

```sql
NOTIFY pgrst, 'reload schema';
```

---

## 📊 Summary of All 8 Issues Fixed

| Issue                  | Problem                             | Solution                          | Status   |
| ---------------------- | ----------------------------------- | --------------------------------- | -------- |
| 1. Missing Function    | 404 - function not found            | Created `get_admin_customers`     | ✅ Fixed |
| 2. Ambiguous Column    | `column "id" is ambiguous`          | Fully qualified with `u.`         | ✅ Fixed |
| 3. Wrong Column Name   | `u.suspension_reason` doesn't exist | Changed to `u.suspended_reason`   | ✅ Fixed |
| 4. Schema Cache        | PGRST202 - not in cache             | Reloaded schema cache             | ✅ Fixed |
| 5. Parameter Mismatch  | `p_search_term` vs `p_search`       | Changed frontend to `p_search`    | ✅ Fixed |
| 6. Missing Role Filter | No customers returned               | Added `WHERE u.role = 'customer'` | ✅ Fixed |
| 7. Wrong Column Name   | `rr.customer_id` doesn't exist      | Changed to `rr.user_id`           | ✅ Fixed |
| 8. Wrong Column Name   | `u.last_login` doesn't exist        | Changed to `u.last_sign_in_at`    | ✅ Fixed |

---

## 🎯 Next Steps

1. ✅ Fixed all 8 database schema issues
2. ✅ Updated RPC function
3. ✅ Updated frontend interface
4. ✅ Reloaded schema cache
5. ⏳ **Hard refresh browser and test**

---

## 🧪 Testing Instructions

### 1. Hard Refresh Browser (CRITICAL!)

```
Chrome/Edge: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
Firefox: Ctrl+F5 (Windows) or Cmd+Shift+R (Mac)
Safari: Cmd+Option+R
```

**Why?** Browser has cached the old JavaScript code with wrong interface.

### 2. Navigate to Admin Customers

```
https://your-app.vercel.app/admin/customers
```

### 3. Expected Results

- ✅ Customer list displays with 5+ customers
- ✅ Each customer shows:
  - Email (e.g., immersowada@gmail.com)
  - Phone number
  - Full name
  - Status (ใช้งาน/ระงับ/แบน)
  - Created date
  - Last sign in date
  - Total rides count
  - Total spent amount
- ✅ Search works (by email, phone, name)
- ✅ Status filter works (ทั้งหมด, ใช้งาน, ระงับ, แบน)
- ✅ Pagination works
- ✅ No console errors

---

## 📝 Technical Notes

### Column Naming in users Table

- ✅ `last_sign_in_at` - Last time user signed in (from Supabase Auth)
- ❌ `last_login` - Does NOT exist
- ❌ `last_order_at` - Does NOT exist in users table

### Data Flow

1. User signs in → Supabase Auth updates `last_sign_in_at`
2. Admin views customers → RPC function returns `last_sign_in_at`
3. Frontend displays as "เข้าสู่ระบบล่าสุด"

### Interface Alignment

Frontend interface now matches exactly with RPC function return type:

- Same column names
- Same data types
- No extra fields
- No missing fields

---

## 🔍 Verification Queries

### Check Function Signature

```sql
SELECT
  proname as function_name,
  pg_get_function_result(oid) as return_type
FROM pg_proc
WHERE proname = 'get_admin_customers';
```

Expected: Should show `last_sign_in_at` in return type

### Test Function Call

```sql
SELECT * FROM get_admin_customers(NULL, NULL, 5, 0);
```

Expected: Should return 5 customers with all columns including `last_sign_in_at`

---

## 🎓 Lessons Learned

### 1. Always Check Actual Schema

Don't assume column names - always verify with:

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'table_name';
```

### 2. Match Frontend to Backend

Frontend TypeScript interface must match exactly with RPC function return type.

### 3. Supabase Auth Columns

Supabase Auth uses specific column names:

- `last_sign_in_at` (not `last_login`)
- `email_confirmed_at` (not `email_verified_at`)
- `phone_confirmed_at` (not `phone_verified_at`)

### 4. Hard Refresh Required

After changing TypeScript interfaces, users MUST hard refresh browser to get new code.

---

**Status**: ✅ All 8 issues fixed  
**Ready for Testing**: Yes  
**Requires**: Hard browser refresh  
**Deployment**: Production database updated via MCP
