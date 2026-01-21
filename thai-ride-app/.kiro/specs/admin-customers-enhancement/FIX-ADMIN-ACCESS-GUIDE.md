# Fix Admin Customers Access - Quick Guide

## Problem
Getting error: `Unauthorized: Admin access required` when accessing `/admin/customers`

## Root Cause
The `admin_get_customers` RPC function checks the `profiles` table for admin role, but your admin user's role might only exist in the `users` table.

## Solution: Run Quick Fix SQL

### Step 1: Open Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to **SQL Editor**

### Step 2: Run This SQL

```sql
-- Sync users to profiles table
INSERT INTO profiles (id, email, full_name, phone_number, role, status, created_at, updated_at)
SELECT 
  u.id,
  u.email,
  u.name as full_name,
  u.phone as phone_number,
  COALESCE(u.role, 'customer') as role,
  'active' as status,
  u.created_at,
  u.updated_at
FROM users u
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  phone_number = EXCLUDED.phone_number,
  role = EXCLUDED.role,
  updated_at = NOW();
```

### Step 3: Verify
```sql
-- Check admin users in profiles
SELECT id, email, role FROM profiles WHERE role = 'admin';
```

### Step 4: Test
- Refresh browser at `http://localhost:5173/admin/customers`
- Should now work!

## If Still Not Working

### Check Your Login
```sql
-- Find your current user
SELECT id, email, role FROM users WHERE email = 'your-email@example.com';
```

### Make Sure You're Admin
```sql
-- Update your user to admin if needed
UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
UPDATE profiles SET role = 'admin' WHERE email = 'your-email@example.com';
```

### Clear Cache & Re-login
1. Logout
2. Clear browser cache (Ctrl+Shift+Delete)
3. Login again
4. Try /admin/customers

## For Permanent Fix

Apply migration 314 which creates automatic sync:
```bash
# Copy content of supabase/migrations/314_fix_admin_customers_access.sql
# Paste into Supabase SQL Editor
# Click Run
```

This creates a trigger that keeps users and profiles in sync automatically.
