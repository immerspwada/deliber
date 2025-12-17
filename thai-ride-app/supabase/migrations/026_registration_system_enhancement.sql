-- Migration: 026_registration_system_enhancement.sql
-- Feature: F01 - Enhanced User Registration System
-- เพิ่ม columns สำหรับระบบสมัครสมาชิกที่สมบูรณ์

-- 1. เพิ่ม columns ใหม่ในตาราง users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS first_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS last_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS national_id VARCHAR(13),
ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20),
ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS gender VARCHAR(10);

-- 2. อัพเดท role constraint เพื่อรองรับ driver
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
CHECK (role::text = ANY (ARRAY['admin', 'customer', 'restaurant', 'rider', 'driver']::text[]));

-- 3. เพิ่ม constraint สำหรับ verification_status
ALTER TABLE users ADD CONSTRAINT users_verification_status_check 
CHECK (verification_status::text = ANY (ARRAY['pending', 'verified', 'rejected', 'suspended']::text[]));

-- 4. สร้าง index สำหรับ national_id (unique)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_national_id ON users(national_id) WHERE national_id IS NOT NULL;

-- 5. สร้าง index สำหรับ phone_number
CREATE INDEX IF NOT EXISTS idx_users_phone_number ON users(phone_number) WHERE phone_number IS NOT NULL;

-- 6. สร้าง function สำหรับ validate Thai National ID
CREATE OR REPLACE FUNCTION validate_thai_national_id(id_number TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  sum_val INTEGER := 0;
  check_digit INTEGER;
  i INTEGER;
BEGIN
  -- ต้องมี 13 หลัก
  IF LENGTH(id_number) != 13 THEN
    RETURN FALSE;
  END IF;
  
  -- ต้องเป็นตัวเลขทั้งหมด
  IF id_number !~ '^[0-9]+$' THEN
    RETURN FALSE;
  END IF;
  
  -- คำนวณ checksum
  FOR i IN 1..12 LOOP
    sum_val := sum_val + (CAST(SUBSTRING(id_number, i, 1) AS INTEGER) * (14 - i));
  END LOOP;
  
  check_digit := (11 - (sum_val % 11)) % 10;
  
  RETURN check_digit = CAST(SUBSTRING(id_number, 13, 1) AS INTEGER);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 7. สร้าง function สำหรับสร้าง user profile หลัง signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- สร้าง user profile ถ้ายังไม่มี
  INSERT INTO public.users (id, email, name, role, phone, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer'),
    NEW.raw_user_meta_data->>'phone',
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();
  
  -- สร้าง wallet สำหรับ user ใหม่
  INSERT INTO public.user_wallets (user_id, balance, currency)
  VALUES (NEW.id, 0, 'THB')
  ON CONFLICT (user_id) DO NOTHING;
  
  -- สร้าง loyalty record สำหรับ user ใหม่
  INSERT INTO public.user_loyalty (user_id, current_points, lifetime_points)
  VALUES (NEW.id, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. สร้าง trigger สำหรับ auto-create user profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 9. อัพเดท RLS policies สำหรับ users table
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can update all users" ON users;

-- Allow users to view their own profile
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Allow users to insert their own profile (for registration)
CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Allow admins to view all users
CREATE POLICY "Admins can view all users" ON users
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Allow admins to update all users
CREATE POLICY "Admins can update all users" ON users
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- 10. สร้าง function สำหรับ complete registration
CREATE OR REPLACE FUNCTION complete_user_registration(
  p_user_id UUID,
  p_first_name VARCHAR,
  p_last_name VARCHAR,
  p_national_id VARCHAR,
  p_phone_number VARCHAR,
  p_role VARCHAR DEFAULT 'customer'
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Validate national ID
  IF p_national_id IS NOT NULL AND NOT validate_thai_national_id(p_national_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid Thai National ID');
  END IF;
  
  -- Check if national ID already exists
  IF p_national_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM users WHERE national_id = p_national_id AND id != p_user_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'National ID already registered');
  END IF;
  
  -- Update user profile
  UPDATE users SET
    first_name = p_first_name,
    last_name = p_last_name,
    name = CONCAT(p_first_name, ' ', p_last_name),
    national_id = p_national_id,
    phone_number = p_phone_number,
    phone = p_phone_number,
    role = p_role,
    verification_status = 'pending',
    updated_at = NOW()
  WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    -- Insert if not exists
    INSERT INTO users (id, first_name, last_name, name, national_id, phone_number, phone, role, email, verification_status)
    VALUES (
      p_user_id,
      p_first_name,
      p_last_name,
      CONCAT(p_first_name, ' ', p_last_name),
      p_national_id,
      p_phone_number,
      p_phone_number,
      p_role,
      (SELECT email FROM auth.users WHERE id = p_user_id),
      'pending'
    );
  END IF;
  
  RETURN jsonb_build_object('success', true, 'message', 'Registration completed');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Grant execute permission
GRANT EXECUTE ON FUNCTION validate_thai_national_id(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION complete_user_registration(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR) TO authenticated;
