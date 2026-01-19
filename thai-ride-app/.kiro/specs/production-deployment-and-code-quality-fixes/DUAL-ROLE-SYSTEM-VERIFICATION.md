# Dual-Role System Verification Guide

## Overview

The Thai Ride App uses a **dual-role architecture** for providers, where each provider has:

1. **`user_id`** (from `auth.users`) - Used for authentication and session management
2. **`provider_id`** (from `providers_v2.id`) - Used for business logic and relationships

This architecture allows a single user account to have multiple roles (e.g., both customer and provider).

## Why Dual-Role System?

### Problem Without Dual-Role

```sql
-- ❌ WRONG: Direct provider_id = auth.uid() check
CREATE POLICY "provider_access" ON ride_requests
  FOR SELECT TO authenticated
  USING (provider_id = auth.uid());  -- FAILS! provider_id ≠ auth.uid()
```

**Issue**: `provider_id` is the provider's business ID, NOT their authentication ID.

### Solution With Dual-Role

```sql
-- ✅ CORRECT: JOIN through providers_v2.user_id
CREATE POLICY "provider_access" ON ride_requests
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM providers_v2
      WHERE providers_v2.id = ride_requests.provider_id
      AND providers_v2.user_id = auth.uid()
    )
  );
```

**How it works**:

1. `auth.uid()` returns the authenticated user's ID
2. JOIN to `providers_v2` to find the provider record for this user
3. Check if `providers_v2.id` matches the `provider_id` in the target table

## Verification Requirements

### Requirement 12.1: Column Existence

**Verify**: `providers_v2.user_id` column exists and has foreign key to `auth.users`

**SQL Query**: See `verify-dual-role-1-column-exists.sql`

**Expected Results**:

- 1 row showing `user_id` column with type `uuid`
- 1 row showing foreign key constraint to `auth.users(id)`

**How to Run**:

```bash
# Option 1: Via Supabase Dashboard SQL Editor
# Copy content of verify-dual-role-1-column-exists.sql and execute

# Option 2: Via CLI (if Supabase is running locally)
npx supabase db execute --file .kiro/specs/production-deployment-and-code-quality-fixes/verify-dual-role-1-column-exists.sql --local
```

### Requirement 12.2: RLS Policies

**Verify**: RLS policies use dual-role JOIN pattern, not direct `provider_id = auth.uid()`

**SQL Query**: See `verify-dual-role-2-rls-policies.sql`

**Expected Results**:

- All policies for provider-related tables should contain `providers_v2` JOIN
- Pattern: `EXISTS (SELECT 1 FROM providers_v2 WHERE providers_v2.id = table.provider_id AND providers_v2.user_id = auth.uid())`
- **Anti-pattern check should return 0 rows** (no direct `provider_id = auth.uid()`)

**Critical Tables to Check**:

- `ride_requests`
- `provider_earnings`
- `provider_withdrawals`
- `provider_locations`
- `provider_ratings`

**How to Run**:

```bash
# Option 1: Via Supabase Dashboard SQL Editor
# Copy content of verify-dual-role-2-rls-policies.sql and execute

# Option 2: Via CLI (if Supabase is running locally)
npx supabase db execute --file .kiro/specs/production-deployment-and-code-quality-fixes/verify-dual-role-2-rls-policies.sql --local
```

### Requirement 12.3: Storage Bucket Policies

**Verify**: Storage bucket policies use dual-role checks for provider-related buckets

**SQL Query**: See `verify-dual-role-3-storage-policies.sql`

**Expected Results**:

- Storage policies for provider-related buckets should JOIN `providers_v2`
- Pattern: `JOIN providers_v2 p ON p.id = [related_table].provider_id AND p.user_id = auth.uid()`

**Critical Buckets to Check**:

- `ride-evidence` - Provider uploads ride completion photos
- `provider-documents` - Provider uploads verification documents

**How to Run**:

```bash
# Option 1: Via Supabase Dashboard SQL Editor
# Copy content of verify-dual-role-3-storage-policies.sql and execute

# Option 2: Via CLI (if Supabase is running locally)
npx supabase db execute --file .kiro/specs/production-deployment-and-code-quality-fixes/verify-dual-role-3-storage-policies.sql --local
```

## Complete Verification Script

For a comprehensive check, use the main verification script:

**File**: `verify-dual-role-system.sql`

This script includes:

1. Column existence check (Requirement 12.1)
2. RLS policy pattern check (Requirement 12.2)
3. Storage policy check (Requirement 12.3)
4. Sample data integrity check
5. Anti-pattern detection
6. Summary checklist

**How to Run**:

```bash
# Via Supabase Dashboard SQL Editor
# Copy entire content of verify-dual-role-system.sql and execute

# Via CLI (if Supabase is running locally)
npx supabase db execute --file .kiro/specs/production-deployment-and-code-quality-fixes/verify-dual-role-system.sql --local
```

## Common Issues and Fixes

### Issue 1: Missing user_id Column

**Symptom**: Query returns 0 rows for `providers_v2.user_id`

**Fix**: Run migration to add column

```sql
ALTER TABLE providers_v2
ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- Backfill existing providers (if needed)
UPDATE providers_v2
SET user_id = id
WHERE user_id IS NULL;

-- Make NOT NULL after backfill
ALTER TABLE providers_v2
ALTER COLUMN user_id SET NOT NULL;
```

### Issue 2: RLS Policy Uses Direct provider_id Check

**Symptom**: Anti-pattern query returns rows

**Fix**: Update policy to use dual-role JOIN

```sql
-- Drop old policy
DROP POLICY IF EXISTS "old_policy_name" ON table_name;

-- Create new policy with dual-role check
CREATE POLICY "new_policy_name" ON table_name
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM providers_v2
      WHERE providers_v2.id = table_name.provider_id
      AND providers_v2.user_id = auth.uid()
    )
  );
```

### Issue 3: Storage Policy Missing Dual-Role Check

**Symptom**: Storage policy doesn't JOIN `providers_v2`

**Fix**: Update storage policy

```sql
-- Drop old policy
DROP POLICY IF EXISTS "old_storage_policy" ON storage.objects;

-- Create new policy with dual-role check
CREATE POLICY "provider_upload_evidence" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'ride-evidence' AND
    EXISTS (
      SELECT 1 FROM ride_requests rr
      INNER JOIN providers_v2 p ON p.id = rr.provider_id
      WHERE rr.id::text = (string_to_array(name, '/'))[1]
      AND p.user_id = auth.uid()
      AND p.status = 'approved'
    )
  );
```

## Verification Checklist

Use this checklist after running verification scripts:

- [ ] **Column Existence** (Requirement 12.1)
  - [ ] `providers_v2.user_id` column exists
  - [ ] Column type is `uuid`
  - [ ] Foreign key to `auth.users(id)` exists
- [ ] **RLS Policies** (Requirement 12.2)
  - [ ] All `ride_requests` provider policies use dual-role JOIN
  - [ ] All `provider_earnings` policies use dual-role JOIN
  - [ ] All `provider_withdrawals` policies use dual-role JOIN
  - [ ] All `provider_locations` policies use dual-role JOIN
  - [ ] Anti-pattern check returns 0 rows
- [ ] **Storage Policies** (Requirement 12.3)
  - [ ] `ride-evidence` bucket policies use dual-role JOIN
  - [ ] `provider-documents` bucket policies use dual-role JOIN
  - [ ] All provider-related storage policies verified

- [ ] **Data Integrity**
  - [ ] All providers have valid `user_id`
  - [ ] No orphaned providers (user_id doesn't exist in auth.users)
  - [ ] Foreign key constraints enforced

## Production Deployment

### Before Deployment

1. Run all verification scripts in **local environment**
2. Ensure all checks pass
3. Document any issues found and fixes applied

### During Deployment

1. Run verification scripts in **production environment**
2. If issues found, apply fixes immediately
3. Re-run verification to confirm fixes

### After Deployment

1. Monitor logs for RLS policy violations
2. Check for 403 errors related to provider access
3. Verify provider features work correctly (job acceptance, earnings, withdrawals)

## References

- **MCP Automation Guide**: `.kiro/steering/mcp-automation.md` (Dual-Role System section)
- **Migration Examples**: `supabase/migrations/` (search for `providers_v2.user_id`)
- **RLS Policy Guide**: `.kiro/steering/supabase-prompts-database-rls-policies.md`

## Support

If verification fails or issues are found:

1. Check migration history: `npx supabase migration list --local`
2. Review recent migrations for dual-role changes
3. Consult `.kiro/steering/mcp-automation.md` for examples
4. Create fix migration following dual-role pattern
5. Re-run verification scripts

---

**Last Updated**: 2025-01-XX  
**Requirements**: 12.1, 12.2, 12.3  
**Task**: 1.6 Verify dual-role system integrity
