# Troubleshooting PGRST203 Function Overloading Errors

**Date**: 2026-01-22  
**Status**: ✅ Resolved  
**Related Migrations**: 316, 317, 318

---

## What is PGRST203?

PGRST203 is a PostgREST error that occurs when multiple PostgreSQL functions have the same name and number of arguments, causing ambiguity when calling the function through the API.

**Error Message Example**:

```
PGRST203: Could not find the function admin_get_topup_requests(text, integer, integer) in the schema cache
```

---

## Root Cause

PostgreSQL allows function overloading (multiple functions with the same name but different parameter types). However, PostgREST cannot distinguish between:

- `admin_get_topup_requests(VARCHAR, INTEGER, INTEGER)`
- `admin_get_topup_requests(TEXT, INTEGER, INTEGER)`
- `admin_get_topup_requests(character varying, integer, integer)`

Even though these are technically different in PostgreSQL, they appear identical to PostgREST because:

- `VARCHAR` and `TEXT` are aliases
- `character varying` is the canonical name for `VARCHAR`
- Type case variations (UUID vs uuid, TEXT vs text) create additional conflicts

---

## Topup Function Conflicts - Case Study

### The Problem

Over time, multiple migrations created topup-related functions with inconsistent naming:

**Old Functions** (from migrations 187, 198):

- `admin_get_topup_requests(VARCHAR, INTEGER, INTEGER)`
- `admin_get_topup_requests_enhanced(VARCHAR, INTEGER, TEXT)`
- `admin_get_topup_requests_enhanced(VARCHAR, INTEGER, INTEGER, TEXT, TEXT, TEXT)`
- `admin_get_topup_stats(TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE)`
- `admin_approve_topup_request(UUID, TEXT)`
- `admin_reject_topup_request(UUID, TEXT)`

**New Functions** (from migration 316):

- `get_topup_requests_admin(TEXT, INT, INT)` - Different name pattern
- `count_topup_requests_admin(TEXT)`
- `approve_topup_request(UUID, UUID, TEXT)` - Different signature
- `reject_topup_request(UUID, UUID, TEXT)` - Different signature

### The Solution

Three migrations were needed to fully resolve the conflicts:

#### Migration 316: Create New Standardized Functions

- Created new functions with consistent naming (`*_admin` suffix)
- Used consistent parameter types (TEXT, INT, UUID)
- Standardized parameter order

#### Migration 317: First Cleanup Attempt

- Dropped most old function variations
- Verified new functions exist
- Resolved most conflicts

#### Migration 318: Comprehensive Cleanup

- Dropped ALL remaining variations including:
  - Type aliases (VARCHAR, character varying, TEXT, text)
  - Case variations (UUID vs uuid, TEXT vs text)
  - Generic function names that might conflict
- Added verification checks to ensure no conflicts remain
- Lists all functions before and after cleanup for visibility

---

## How to Diagnose PGRST203 Errors

### Step 1: List All Functions with Same Name

Use the diagnostic SQL file provided in the project root:

```bash
# Run the diagnostic query
psql -h <host> -U <user> -d <database> -f check-topup-functions.sql
```

Or copy the query directly:

```sql
-- Check for duplicate function names
SELECT
  proname as function_name,
  pronargs as num_args,
  pg_get_function_arguments(oid) as arguments,
  pg_get_function_identity_arguments(oid) as identity_args,
  pronamespace::regnamespace as schema_name,
  oid
FROM pg_proc
WHERE proname = 'get_topup_requests_admin'  -- Replace with your function name
ORDER BY pronargs;
```

**Diagnostic File**: `check-topup-functions.sql` - Pre-configured query to check topup function conflicts

### Step 2: Check for Conflicts

```sql
-- Find functions with same name and argument count
SELECT
  proname,
  pronargs,
  COUNT(*) as count
FROM pg_proc
WHERE proname LIKE '%topup%'
GROUP BY proname, pronargs
HAVING COUNT(*) > 1;
```

If this query returns any rows, you have conflicts.

### Step 3: Identify Exact Signatures

```sql
-- Get detailed information about conflicting functions
SELECT
  proname,
  pronargs,
  pg_get_function_arguments(oid) as arguments,
  pg_get_function_identity_arguments(oid) as identity_args,
  prosrc as source_code
FROM pg_proc
WHERE proname = 'admin_get_topup_requests'  -- Replace with your function
ORDER BY oid;
```

---

## How to Fix PGRST203 Errors

### Option 1: Apply Migration 318 (Recommended)

If you're experiencing topup function conflicts:

```bash
# Apply the comprehensive cleanup migration
npx supabase db push
```

Migration 318 will:

1. List all existing topup functions
2. Drop ALL old variations
3. Verify new functions exist
4. Check for remaining conflicts
5. Raise exception if conflicts still exist

### Option 2: Manual Cleanup

If you have custom function conflicts:

```sql
-- 1. List all variations
SELECT proname, pronargs, pg_get_function_arguments(oid)
FROM pg_proc
WHERE proname = 'your_function_name';

-- 2. Drop old variations (be specific with types)
DROP FUNCTION IF EXISTS your_function_name(VARCHAR, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS your_function_name(character varying, integer) CASCADE;
DROP FUNCTION IF EXISTS your_function_name(TEXT, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS your_function_name(text, integer) CASCADE;

-- 3. Keep only the new standardized version
-- (Make sure it exists first!)

-- 4. Verify no conflicts remain
SELECT proname, pronargs, COUNT(*)
FROM pg_proc
WHERE proname = 'your_function_name'
GROUP BY proname, pronargs
HAVING COUNT(*) > 1;
```

### Option 3: Rename Functions

If you need to keep multiple versions:

```sql
-- Rename old function to avoid conflict
ALTER FUNCTION old_function_name(VARCHAR, INTEGER)
RENAME TO old_function_name_deprecated;

-- Or create with different name
CREATE OR REPLACE FUNCTION new_function_name(TEXT, INTEGER)
...
```

---

## Prevention Best Practices

### 1. Use Consistent Type Names

```sql
-- ✅ GOOD: Use TEXT consistently
CREATE FUNCTION my_function(p_name TEXT, p_count INT)

-- ❌ BAD: Mixing VARCHAR and TEXT
CREATE FUNCTION my_function(p_name VARCHAR, p_count INT)
```

### 2. Use Consistent Naming Patterns

```sql
-- ✅ GOOD: Consistent pattern
get_customers_admin(...)
get_providers_admin(...)
get_orders_admin(...)

-- ❌ BAD: Inconsistent patterns
admin_get_customers(...)
get_providers_admin(...)
get_admin_orders(...)
```

### 3. Avoid Function Overloading

```sql
-- ✅ GOOD: Different names for different purposes
get_customers_admin(p_status TEXT, p_limit INT, p_offset INT)
get_customers_admin_with_search(p_search TEXT, p_status TEXT, p_limit INT, p_offset INT)

-- ❌ BAD: Overloading with similar signatures
get_customers_admin(p_status TEXT, p_limit INT, p_offset INT)
get_customers_admin(p_status VARCHAR, p_limit INT, p_offset INT)
```

### 4. Drop Old Functions Before Creating New Ones

```sql
-- ✅ GOOD: Clean up first
DROP FUNCTION IF EXISTS old_function(VARCHAR, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS old_function(TEXT, INTEGER) CASCADE;
CREATE FUNCTION new_function(TEXT, INTEGER) ...

-- ❌ BAD: Create without cleanup
CREATE FUNCTION new_function(TEXT, INTEGER) ...
-- Old function still exists, causing conflict
```

### 5. Use Migration Comments

```sql
-- Migration: 318_verify_and_fix_topup_conflicts.sql
-- Description: Comprehensive cleanup of topup function conflicts
-- Issue: PGRST203 - Function overloading conflict
-- Drops: All old topup function variations
-- Verifies: New standardized functions from migration 316
```

---

## Verification After Fix

### Check Function List

```sql
-- Should show only new standardized functions
SELECT
  proname,
  pronargs,
  pg_get_function_arguments(oid) as arguments
FROM pg_proc
WHERE proname LIKE '%topup%'
ORDER BY proname, pronargs;
```

**Expected Output** (after migration 318):

```
proname                      | pronargs | arguments
-----------------------------+----------+------------------------------------------
approve_topup_request        | 3        | p_request_id uuid, p_admin_id uuid, p_admin_note text
count_topup_requests_admin   | 1        | p_status text
get_topup_requests_admin     | 3        | p_status text, p_limit integer, p_offset integer
reject_topup_request         | 3        | p_request_id uuid, p_admin_id uuid, p_admin_note text
```

### Test API Calls

```typescript
// Should work without PGRST203 error
const { data, error } = await supabase.rpc("get_topup_requests_admin", {
  p_status: "pending",
  p_limit: 20,
  p_offset: 0,
});

if (error) {
  console.error("Error:", error);
} else {
  console.log("Success:", data);
}
```

---

## Common Scenarios

### Scenario 1: Type Alias Conflicts

**Problem**: `VARCHAR` and `TEXT` are aliases

```sql
-- These conflict:
CREATE FUNCTION test(p_name VARCHAR);
CREATE FUNCTION test(p_name TEXT);
```

**Solution**: Use TEXT consistently

```sql
DROP FUNCTION IF EXISTS test(VARCHAR);
CREATE FUNCTION test(p_name TEXT);
```

### Scenario 2: Case Sensitivity Conflicts

**Problem**: PostgreSQL stores types in canonical form

```sql
-- These conflict:
CREATE FUNCTION test(p_id UUID);
CREATE FUNCTION test(p_id uuid);
```

**Solution**: Drop all variations

```sql
DROP FUNCTION IF EXISTS test(UUID);
DROP FUNCTION IF EXISTS test(uuid);
CREATE FUNCTION test(p_id UUID);  -- Use one consistently
```

### Scenario 3: Parameter Order Conflicts

**Problem**: Same types, different order

```sql
-- These are different functions but confusing:
CREATE FUNCTION test(p_id UUID, p_name TEXT);
CREATE FUNCTION test(p_name TEXT, p_id UUID);
```

**Solution**: Use descriptive names or consolidate

```sql
DROP FUNCTION IF EXISTS test(UUID, TEXT);
DROP FUNCTION IF EXISTS test(TEXT, UUID);
CREATE FUNCTION test_by_id(p_id UUID, p_name TEXT);
CREATE FUNCTION test_by_name(p_name TEXT, p_id UUID);
```

---

## Diagnostic Tools

### check-topup-functions.sql

A diagnostic SQL file is provided in the project root to quickly check for function conflicts:

**Location**: `check-topup-functions.sql`

**Purpose**: Lists all `get_topup_requests_admin` functions with their signatures to identify conflicts

**Usage**:

```bash
# Via psql
psql -h <host> -U <user> -d <database> -f check-topup-functions.sql

# Via Supabase Dashboard SQL Editor
# Copy and paste the file contents into SQL Editor and run
```

**What it checks**:

- Function name
- Number of arguments
- Full argument list with types
- Identity arguments (for overload resolution)
- Schema name
- Function OID

**Expected output** (after migration 318):

```
function_name              | num_args | arguments                                    | schema_name
---------------------------+----------+----------------------------------------------+-------------
get_topup_requests_admin   | 3        | p_status text, p_limit integer, p_offset integer | public
```

If you see multiple rows with the same `num_args`, you have a conflict that needs resolution.

---

## Related Documentation

- [Admin RPC Functions](./admin-rpc-functions.md) - Complete API documentation
- [Migration 316](../supabase/migrations/316_topup_requests_system.sql) - New topup system
- [Migration 317](../supabase/migrations/317_fix_topup_function_conflict.sql) - First cleanup
- [Migration 318](../supabase/migrations/318_verify_and_fix_topup_conflicts.sql) - Comprehensive cleanup
- [Diagnostic Tool](../check-topup-functions.sql) - Function conflict checker

---

## Summary

PGRST203 errors occur when PostgreSQL function overloading creates ambiguity for PostgREST. The solution is to:

1. ✅ Use consistent type names (TEXT, not VARCHAR)
2. ✅ Use consistent naming patterns
3. ✅ Avoid unnecessary function overloading
4. ✅ Drop all old variations before creating new functions
5. ✅ Verify no conflicts remain after cleanup

For topup functions specifically, migration 318 provides comprehensive cleanup and should resolve all PGRST203 errors.

---

**Last Updated**: 2026-01-22  
**Status**: ✅ Resolved with Migration 318
