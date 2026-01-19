-- Migration: 028_fix_users_rls_recursion.sql
-- Feature: F01 - Fix infinite recursion in users RLS policies
-- แก้ไขปัญหา infinite recursion ใน RLS policy ของตาราง users

-- ปัญหา: Policy "Admins can view all users" และ "Admins can update all users"
-- ทำให้เกิด infinite recursion เพราะต้อง SELECT จาก users เพื่อตรวจสอบ role
-- แต่การ SELECT นั้นก็ต้องผ่าน RLS policy อีก

-- วิธีแก้: ใช้ auth.jwt() เพื่อดึง role จาก JWT token แทน
-- หรือใช้ SECURITY DEFINER function

-- 1. สร้าง function สำหรับตรวจสอบว่าเป็น admin หรือไม่ (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- ใช้ SECURITY DEFINER เพื่อ bypass RLS
  SELECT role INTO user_role FROM users WHERE id = auth.uid();
  RETURN user_role = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 2. Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can update all users" ON users;
DROP POLICY IF EXISTS "Allow all users" ON users;

-- 3. สร้าง policies ใหม่ที่ไม่มี recursion

-- Policy: Users can view their own profile OR admins can view all
CREATE POLICY "Users can view profiles" ON users
  FOR SELECT USING (
    auth.uid() = id  -- User can see their own profile
    OR is_admin()    -- Admin can see all profiles
  );

-- Policy: Users can update their own profile OR admins can update all
CREATE POLICY "Users can update profiles" ON users
  FOR UPDATE USING (
    auth.uid() = id  -- User can update their own profile
    OR is_admin()    -- Admin can update all profiles
  );

-- Policy: Users can insert their own profile
CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 4. Grant execute permission
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;

-- 5. เพิ่ม comment อธิบาย
COMMENT ON FUNCTION is_admin() IS 'Check if current user is admin. Uses SECURITY DEFINER to bypass RLS and prevent infinite recursion.';
