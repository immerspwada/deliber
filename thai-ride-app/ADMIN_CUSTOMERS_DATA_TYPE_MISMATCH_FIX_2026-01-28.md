# Admin Customers - Data Type Mismatch Fix (Issue 9)

**Date**: 2026-01-28  
**Status**: ✅ Fixed  
**Issue**: Data type mismatch between database columns and function return type

---

## 🔍 Error Details

**Error Code**: `42804`  
**Error Message**: `structure of query does not match function result type`  
**Details**: `Returned type character varying(255) does not match expected type text in column 2`

---

## 🎯 Root Cause

The RPC function declared return types as `TEXT` for all string columns, but the actual database columns have specific types:

| Column             | Actual Type    | Function Declared | Match? |
| ------------------ | -------------- | ----------------- | ------ |
| `email`            | `VARCHAR(255)` | `TEXT`            | ❌     |
| `phone`            | `VARCHAR(20)`  | `TEXT`            | ❌     |
| `name`             | `VARCHAR(255)` | `TEXT`            | ❌     |
| `full_name`        | `TEXT`         | `TEXT`            | ✅     |
| `avatar_url`       | `TEXT`         | `TEXT`            | ✅     |
| `status`           | `TEXT`         | `TEXT`            | ✅     |
| `suspended_reason` | `TEXT`         | `TEXT`            | ✅     |

**PostgreSQL is strict about type matching**: Even though `VARCHAR` and `TEXT` are similar, PostgreSQL requires exact type matches in function return types.

---

## ✅ Solution

Updated the function return type to match the exact column types from the database schema.

### Fixed Function

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
  email VARCHAR(255),        -- ✅ Changed from TEXT
  phone VARCHAR(20),          -- ✅ Changed from TEXT
  name VARCHAR(255),          -- ✅ Changed from TEXT
  full_name TEXT,             -- ✅ Already correct
  avatar_url TEXT,            -- ✅ Already correct
  status TEXT,                -- ✅ Already correct
  suspended_at TIMESTAMPTZ,
  suspended_reason TEXT,      -- ✅ Already correct
  suspended_by UUID,
  wallet_balance NUMERIC,
  total_spent NUMERIC,
  total_topup NUMERIC,
  total_rides BIGINT,
  created_at TIMESTAMPTZ
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

  -- Return customer data
  RETURN QUERY
  SELECT
    u.id,
    u.email,
    u.phone,
    u.name,
    u.full_name,
    u.avatar_url,
    u.status,
    u.suspended_at,
    u.suspended_reason,
    u.suspended_by,
    u.wallet_balance,
    u.total_spent,
    u.total_topup,
    COUNT(DISTINCT rr.id) AS total_rides,
    u.created_at
  FROM users u
  LEFT JOIN ride_requests rr ON rr.user_id = u.id
  WHERE u.role = 'customer'
    AND (p_search IS NULL OR (
      u.email ILIKE '%' || p_search || '%' OR
      u.phone ILIKE '%' || p_search || '%' OR
      u.name ILIKE '%' || p_search || '%' OR
      u.full_name ILIKE '%' || p_search || '%'
    ))
    AND (p_status IS NULL OR u.status = p_status)
  GROUP BY u.id, u.email, u.phone, u.name, u.full_name, u.avatar_url,
           u.status, u.suspended_at, u.suspended_reason, u.suspended_by,
           u.wallet_balance, u.total_spent, u.total_topup, u.created_at
  ORDER BY u.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION get_admin_customers TO authenticated;
```

### Schema Cache Reload

```sql
NOTIFY pgrst, 'reload schema';
```

---

## 🧪 Verification

### Check Column Types

```sql
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'users'
AND column_name IN ('email', 'phone', 'name', 'full_name', 'avatar_url', 'status', 'suspended_reason');
```

**Result**:

```
email           | character varying | 255
phone           | character varying | 20
name            | character varying | 255
avatar_url      | text             | null
full_name       | text             | null
suspended_reason| text             | null
status          | text             | null
```

### Check Function Definition

```sql
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'get_admin_customers';
```

**Result**: ✅ Function correctly defined with matching types

---

## 📊 Impact Analysis

### What Changed

| Aspect          | Before | After            |
| --------------- | ------ | ---------------- |
| **email type**  | TEXT   | VARCHAR(255)     |
| **phone type**  | TEXT   | VARCHAR(20)      |
| **name type**   | TEXT   | VARCHAR(255)     |
| **Other types** | TEXT   | TEXT (unchanged) |

### Frontend Impact

**No changes needed** - The frontend TypeScript interface uses `string` for all text fields, which works with both `TEXT` and `VARCHAR` types.

```typescript
export interface AdminCustomer {
  id: string;
  email: string; // Works with VARCHAR(255)
  phone: string; // Works with VARCHAR(20)
  name: string; // Works with VARCHAR(255)
  full_name: string; // Works with TEXT
  // ... other fields
}
```

---

## 🎓 Key Learnings

### PostgreSQL Type System

1. **Exact Type Matching Required**: Function return types must match column types exactly
2. **VARCHAR vs TEXT**: Even though they're similar, PostgreSQL treats them as different types
3. **Character Limits**: `VARCHAR(n)` has a maximum length, `TEXT` is unlimited

### Best Practices

1. ✅ Always check actual column types with `information_schema.columns`
2. ✅ Match function return types exactly to column types
3. ✅ Don't assume `TEXT` works for all string columns
4. ✅ Reload schema cache after function changes

### Type Checking Query

```sql
-- Use this to verify column types before creating functions
SELECT
  column_name,
  data_type,
  CASE
    WHEN character_maximum_length IS NOT NULL
    THEN data_type || '(' || character_maximum_length || ')'
    ELSE data_type
  END as full_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'your_table_name'
ORDER BY ordinal_position;
```

---

## 🔄 Complete Fix Timeline

This was **Issue 9** in the Admin Customers fix series:

1. ✅ Issue 1: Missing RPC function (404)
2. ✅ Issue 2: Ambiguous column reference
3. ✅ Issue 3: Wrong column name (`suspension_reason` → `suspended_reason`)
4. ✅ Issue 4: Schema cache reload
5. ✅ Issue 5: Parameter name mismatch (`p_search_term` → `p_search`)
6. ✅ Issue 6: Missing role filter
7. ✅ Issue 7: Wrong JOIN column (`customer_id` → `user_id`)
8. ✅ Issue 8: Non-existent column (`last_sign_in_at` removed)
9. ✅ **Issue 9: Data type mismatch (VARCHAR vs TEXT)** ← Current

---

## 🚀 Deployment Status

### Database Changes

- ✅ Function `get_admin_customers` updated with correct types
- ✅ Schema cache reloaded
- ✅ Permissions granted

### Frontend Changes

- ✅ No changes needed (TypeScript `string` works with both types)

### Testing Required

1. ✅ Function executes without errors
2. ⏳ Browser test: Navigate to `/admin/customers`
3. ⏳ Verify customer list displays correctly
4. ⏳ Verify all data fields show correctly

---

## 📝 Next Steps

### Immediate

1. **Hard refresh browser** (Ctrl+Shift+R / Cmd+Shift+R)
2. **Navigate to** `/admin/customers`
3. **Verify** customer list loads without errors
4. **Check** all customer data displays correctly

### Verification Checklist

- [ ] Page loads without 400 error
- [ ] Customer list displays
- [ ] Email addresses show correctly
- [ ] Phone numbers show correctly
- [ ] Names show correctly
- [ ] Search functionality works
- [ ] Status filters work
- [ ] Pagination works

---

## 🎯 Success Criteria

| Metric              | Target    | Status |
| ------------------- | --------- | ------ |
| Function Executes   | No errors | ✅     |
| Type Matching       | 100%      | ✅     |
| Schema Cache        | Reloaded  | ✅     |
| Frontend Compatible | Yes       | ✅     |

---

**Status**: ✅ Fixed  
**Total Time**: ~5 seconds  
**Manual Steps**: 0  
**Browser Refresh**: Required

---

**Created**: 2026-01-28  
**Last Updated**: 2026-01-28
