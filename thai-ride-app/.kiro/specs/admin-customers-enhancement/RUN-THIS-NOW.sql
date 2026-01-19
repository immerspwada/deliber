-- ⚡ QUICK FIX: Run this in Supabase SQL Editor NOW
-- This will fix the "Unauthorized: Admin access required" error

-- 1. Sync all users to profiles table
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

-- 2. Verify it worked
SELECT 
  'SUCCESS! Admin users in profiles:' as message,
  COUNT(*) as admin_count
FROM profiles 
WHERE role = 'admin';

-- 3. Show your admin users
SELECT 
  id,
  email,
  role,
  status
FROM profiles
WHERE role = 'admin'
ORDER BY created_at DESC;
