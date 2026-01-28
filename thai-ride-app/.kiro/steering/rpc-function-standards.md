# 🔧 RPC Function Standards

**Date**: 2026-01-27  
**Status**: ✅ Active  
**Priority**: 🔥 MANDATORY

---

## 🎯 Purpose

Standards for creating PostgreSQL RPC functions that work correctly with Supabase PostgREST API.

---

## 🚨 Critical Rules

### Rule 1: NEVER Use RAISE EXCEPTION

**❌ WRONG** (Causes 400 Bad Request):

```sql
CREATE OR REPLACE FUNCTION my_function(p_id UUID)
RETURNS TABLE (...)
AS $$
BEGIN
  IF p_id IS NULL THEN
    RAISE EXCEPTION 'Invalid ID';  -- ❌ PostgREST returns 400!
  END IF;
  ...
END;
$$;
```

**✅ CORRECT** (Returns empty result):

```sql
CREATE OR REPLACE FUNCTION my_function(p_id UUID)
RETURNS TABLE (...)
AS $$
BEGIN
  IF p_id IS NULL THEN
    RETURN;  -- ✅ Returns empty TABLE (200 OK)
  END IF;
  ...
END;
$$;
```

### Rule 2: Use Correct Return Types

**Return Type Guidelines**:

| Purpose       | Return Type  | On Error          |
| ------------- | ------------ | ----------------- |
| Get list      | `TABLE(...)` | `RETURN;` (empty) |
| Create/Update | `TABLE(...)` | `RETURN;` (empty) |
| Count         | `INTEGER`    | `RETURN 0;`       |
| Check         | `BOOLEAN`    | `RETURN FALSE;`   |
| Get value     | `TEXT`       | `RETURN NULL;`    |

**❌ WRONG** (Old pattern):

```sql
RETURNS JSONB  -- ❌ Hard to type in frontend
```

**✅ CORRECT** (New pattern):

```sql
RETURNS TABLE (
  id UUID,
  name TEXT,
  created_at TIMESTAMPTZ
)  -- ✅ Type-safe, auto-documented
```

### Rule 3: Always Grant Permissions

```sql
-- After creating function
GRANT EXECUTE ON FUNCTION my_function TO authenticated;

-- For admin-only functions
GRANT EXECUTE ON FUNCTION admin_function TO service_role;
```

### Rule 4: Use SECURITY DEFINER Carefully

```sql
CREATE OR REPLACE FUNCTION my_function(...)
RETURNS ...
LANGUAGE plpgsql
SECURITY DEFINER  -- ✅ Runs with function owner's permissions
SET search_path = public  -- ✅ Prevent search_path attacks
AS $$
BEGIN
  -- Always validate auth.uid() first
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;
  ...
END;
$$;
```

---

## 📋 Function Template

### Standard Template

```sql
CREATE OR REPLACE FUNCTION function_name(
  p_param1 UUID,
  p_param2 TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  column1 TEXT,
  column2 TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_variable TYPE;
BEGIN
  -- 1. Get authenticated user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN;  -- Not authenticated
  END IF;

  -- 2. Validate input
  IF p_param1 IS NULL THEN
    RETURN;  -- Invalid input
  END IF;

  -- 3. Check permissions
  v_variable := check_permission(p_param1, v_user_id);
  IF v_variable IS NULL THEN
    RETURN;  -- No permission
  END IF;

  -- 4. Execute query
  RETURN QUERY
  SELECT
    t.id,
    t.column1,
    t.column2
  FROM table_name t
  WHERE t.id = p_param1
  AND t.user_id = v_user_id;
END;
$$;

-- 5. Grant permissions
GRANT EXECUTE ON FUNCTION function_name TO authenticated;

-- 6. Add comment
COMMENT ON FUNCTION function_name IS 'Description of what this function does';
```

---

## 🧪 Testing Checklist

Before deploying any RPC function:

```sql
-- 1. Check function exists
SELECT proname, pg_get_function_identity_arguments(oid)
FROM pg_proc
WHERE proname = 'my_function';

-- 2. Check return type
SELECT pg_get_function_result(oid)
FROM pg_proc
WHERE proname = 'my_function';

-- 3. Check for RAISE EXCEPTION
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'my_function';
-- Should NOT contain 'RAISE EXCEPTION'

-- 4. Check permissions
SELECT routine_name, grantee, privilege_type
FROM information_schema.routine_privileges
WHERE routine_name = 'my_function'
AND grantee = 'authenticated';

-- 5. Test with valid data
SELECT * FROM my_function('<valid_uuid>');

-- 6. Test with invalid data (should return empty, not error)
SELECT * FROM my_function('<invalid_uuid>');
SELECT * FROM my_function(NULL);
```

---

## 🔍 Common Patterns

### Pattern 1: Get User Role

```sql
CREATE OR REPLACE FUNCTION get_user_role(p_resource_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN NULL;  -- ✅ Not authenticated
  END IF;

  -- Check if customer
  IF EXISTS (
    SELECT 1 FROM resources
    WHERE id = p_resource_id
    AND customer_id = v_user_id
  ) THEN
    RETURN 'customer';
  END IF;

  -- Check if provider (dual-role system)
  IF EXISTS (
    SELECT 1 FROM resources r
    INNER JOIN providers_v2 p ON p.id = r.provider_id
    WHERE r.id = p_resource_id
    AND p.user_id = v_user_id
  ) THEN
    RETURN 'provider';
  END IF;

  RETURN NULL;  -- ✅ No role
END;
$$;
```

### Pattern 2: Check Permission

```sql
CREATE OR REPLACE FUNCTION is_action_allowed(p_resource_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_role TEXT;
  v_status TEXT;
BEGIN
  -- Check role
  v_user_role := get_user_role(p_resource_id);
  IF v_user_role IS NULL THEN
    RETURN FALSE;  -- ✅ No permission
  END IF;

  -- Check status
  SELECT status INTO v_status
  FROM resources
  WHERE id = p_resource_id;

  -- Business logic
  IF v_status IN ('active', 'pending') THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;  -- ✅ Not allowed
END;
$$;
```

### Pattern 3: Get Data

```sql
CREATE OR REPLACE FUNCTION get_data(
  p_resource_id UUID,
  p_limit INT DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_role TEXT;
BEGIN
  -- Check permission
  v_user_role := get_user_role(p_resource_id);
  IF v_user_role IS NULL THEN
    RETURN;  -- ✅ Empty result
  END IF;

  -- Return data
  RETURN QUERY
  SELECT
    d.id,
    d.name,
    d.created_at
  FROM data d
  WHERE d.resource_id = p_resource_id
  ORDER BY d.created_at DESC
  LIMIT p_limit;
END;
$$;
```

### Pattern 4: Create/Update Data

```sql
CREATE OR REPLACE FUNCTION create_data(
  p_resource_id UUID,
  p_name TEXT
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_role TEXT;
  v_allowed BOOLEAN;
  v_new_id UUID;
BEGIN
  -- Check permission
  v_user_role := get_user_role(p_resource_id);
  IF v_user_role IS NULL THEN
    RETURN;  -- ✅ Empty result
  END IF;

  -- Check if action allowed
  v_allowed := is_action_allowed(p_resource_id);
  IF NOT v_allowed THEN
    RETURN;  -- ✅ Empty result
  END IF;

  -- Insert data
  INSERT INTO data (resource_id, name, user_id)
  VALUES (p_resource_id, p_name, auth.uid())
  RETURNING id INTO v_new_id;

  -- Return new data
  RETURN QUERY
  SELECT
    d.id,
    d.name,
    d.created_at
  FROM data d
  WHERE d.id = v_new_id;
END;
$$;
```

---

## 🚫 Anti-Patterns

### Anti-Pattern 1: Using RAISE EXCEPTION

```sql
-- ❌ WRONG
IF NOT is_allowed THEN
  RAISE EXCEPTION 'Permission denied';  -- Causes 400!
END IF;

-- ✅ CORRECT
IF NOT is_allowed THEN
  RETURN;  -- Returns empty result
END IF;
```

### Anti-Pattern 2: Returning JSONB

```sql
-- ❌ WRONG (Old pattern)
RETURNS JSONB
AS $$
BEGIN
  RETURN jsonb_build_object(
    'success', true,
    'data', data_value
  );
END;
$$;

-- ✅ CORRECT (New pattern)
RETURNS TABLE (
  success BOOLEAN,
  data TEXT
)
AS $$
BEGIN
  RETURN QUERY
  SELECT true, data_value;
END;
$$;
```

### Anti-Pattern 3: No Permission Check

```sql
-- ❌ WRONG (Security risk)
CREATE OR REPLACE FUNCTION get_all_data()
RETURNS TABLE (...)
AS $$
BEGIN
  RETURN QUERY SELECT * FROM sensitive_data;  -- ❌ No auth check!
END;
$$;

-- ✅ CORRECT
CREATE OR REPLACE FUNCTION get_all_data()
RETURNS TABLE (...)
AS $$
BEGIN
  -- Check auth
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  -- Check admin role
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role = 'admin'
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY SELECT * FROM sensitive_data;
END;
$$;
```

---

## 📚 References

- [Supabase RPC Documentation](https://supabase.com/docs/guides/database/functions)
- [PostgREST Error Handling](https://postgrest.org/en/stable/errors.html)
- [PostgreSQL PL/pgSQL](https://www.postgresql.org/docs/current/plpgsql.html)

---

## ✅ Checklist

Before creating/modifying RPC function:

- [ ] Read this document
- [ ] Use correct return type (TABLE/INT/TEXT/BOOLEAN)
- [ ] No RAISE EXCEPTION statements
- [ ] Return empty/NULL/FALSE on errors
- [ ] Check auth.uid() first
- [ ] Validate all inputs
- [ ] Use SECURITY DEFINER with SET search_path
- [ ] Grant EXECUTE permission
- [ ] Add function comment
- [ ] Test with valid data
- [ ] Test with invalid data
- [ ] Test without auth
- [ ] Run validation function
- [ ] Document in code

---

**Last Updated**: 2026-01-27  
**Maintained By**: Development Team
