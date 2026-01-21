# Production Status Report: Customer Suspension System

**Date:** January 18, 2026  
**Migration:** 312_customer_suspension_system.sql  
**Status:** ⚠️ PARTIALLY DEPLOYED - NEEDS FIX

## Current Situation

### ✅ What's Working

- Migration 312 has been applied to production
- All 4 RPC functions exist in production:
  - `admin_suspend_customer`
  - `admin_unsuspend_customer`
  - `admin_bulk_suspend_customers`
  - `admin_get_customers`

### ❌ What's NOT Working

- **Critical Issue:** Functions reference `profiles` table which doesn't exist
- **Actual Table:** Production uses `users` table (not `profiles`)
- **Required Columns Missing:** The `users` table is missing suspension-related columns:
  - `status` (with check constraint for 'active', 'suspended', 'banned')
  - `suspended_at`
  - `suspension_reason`

### 📊 Production Database Schema

- **Table Name:** `users` (21 rows)
- **Existing Columns:**
  - `id`, `email`, `phone`, `name`, `role`
  - `full_name`, `phone_number`
  - `suspended_at`, `suspended_reason`, `suspended_by` ✅ (already exist!)
  - Missing: `status` column with proper constraint

## Root Cause

Migration 312 was written for a `profiles` table but production uses `users` table. The DO block in the migration checked for columns in `profiles` table, found nothing, and didn't add the columns.

## Required Fix

### Option 1: Add Missing Column (Recommended)

Add only the `status` column to `users` table:

```sql
-- Add status column with check constraint
ALTER TABLE users
ADD COLUMN IF NOT EXISTS status TEXT
DEFAULT 'active'
CHECK (status IN ('active', 'suspended', 'banned'));

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_users_status
ON users(status)
WHERE role = 'customer';
```

### Option 2: Update Functions (Alternative)

Update all 4 functions to use `users` table instead of `profiles`.

## Verification Query

Run this to check current state:

```sql
-- Check if status column exists
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name IN ('status', 'suspended_at', 'suspension_reason', 'suspended_by');

-- Check existing suspension columns
SELECT
  suspended_at,
  suspended_reason,
  suspended_by,
  COUNT(*) as count
FROM users
WHERE suspended_at IS NOT NULL
GROUP BY suspended_at, suspended_reason, suspended_by;
```

## Next Steps

1. **Create Fix Migration:** Create migration 313 to add `status` column
2. **Test Functions:** Verify all 4 functions work after adding column
3. **Update Frontend:** Ensure admin panel uses correct column names
4. **Deploy:** Apply migration 313 to production

## Impact Assessment

- **Severity:** HIGH - Admin panel cannot suspend customers
- **Users Affected:** Admin users only
- **Data Loss Risk:** NONE - No data will be lost
- **Downtime Required:** NO - Can be applied without downtime

## Recommended Action

Create and apply migration 313 immediately to add the missing `status` column.
