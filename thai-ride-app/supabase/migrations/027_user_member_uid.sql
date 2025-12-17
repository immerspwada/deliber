-- =============================================
-- Migration: 027_user_member_uid.sql
-- Feature: F01 - User Member UID System
-- Description: เพิ่มระบบ Member UID สำหรับผู้ใช้ทุกคน
--              ใช้ติดตามการสั่งอาหาร, ประวัติเติมเงิน, และอื่นๆ
-- Format: TRD-XXXXXXXX (8 หลักสุ่ม)
-- =============================================

-- 1. Add member_uid column to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS member_uid VARCHAR(15) UNIQUE;

-- 2. Create index for fast lookup
CREATE INDEX IF NOT EXISTS idx_users_member_uid ON public.users(member_uid);

-- 3. Function to generate unique member UID
CREATE OR REPLACE FUNCTION generate_member_uid()
RETURNS VARCHAR(15) AS $$
DECLARE
  new_uid VARCHAR(15);
  uid_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate format: TRD-XXXXXXXX (8 random alphanumeric)
    new_uid := 'TRD-' || UPPER(
      SUBSTRING(
        MD5(gen_random_uuid()::TEXT || EXTRACT(EPOCH FROM NOW())::TEXT) 
        FROM 1 FOR 8
      )
    );
    
    -- Check if UID already exists
    SELECT EXISTS(SELECT 1 FROM public.users WHERE member_uid = new_uid) INTO uid_exists;
    
    -- Exit loop if unique
    EXIT WHEN NOT uid_exists;
  END LOOP;
  
  RETURN new_uid;
END;
$$ LANGUAGE plpgsql;

-- 4. Trigger to auto-set member_uid on insert
CREATE OR REPLACE FUNCTION set_user_member_uid()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.member_uid IS NULL THEN
    NEW.member_uid := generate_member_uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_user_member_uid ON public.users;
CREATE TRIGGER trigger_user_member_uid
  BEFORE INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION set_user_member_uid();

-- 5. Generate member_uid for existing users who don't have one
UPDATE public.users 
SET member_uid = generate_member_uid()
WHERE member_uid IS NULL;

-- 6. Function to lookup user by member_uid
CREATE OR REPLACE FUNCTION get_user_by_member_uid(p_member_uid VARCHAR)
RETURNS TABLE (
  id UUID,
  email VARCHAR,
  phone VARCHAR,
  name VARCHAR,
  role VARCHAR,
  member_uid VARCHAR,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    u.phone,
    u.name,
    u.role,
    u.member_uid,
    u.is_active,
    u.created_at
  FROM public.users u
  WHERE u.member_uid = p_member_uid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Function to get user's activity summary by member_uid
CREATE OR REPLACE FUNCTION get_member_activity_summary(p_member_uid VARCHAR)
RETURNS JSON AS $$
DECLARE
  user_record RECORD;
  result JSON;
BEGIN
  -- Get user info
  SELECT * INTO user_record FROM public.users WHERE member_uid = p_member_uid;
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  -- Build activity summary
  SELECT json_build_object(
    'member_uid', user_record.member_uid,
    'name', user_record.name,
    'email', user_record.email,
    'phone', user_record.phone,
    'role', user_record.role,
    'member_since', user_record.created_at,
    'stats', json_build_object(
      'total_rides', (SELECT COUNT(*) FROM public.ride_requests WHERE user_id = user_record.id),
      'total_deliveries', (SELECT COUNT(*) FROM public.delivery_requests WHERE user_id = user_record.id),
      'total_shopping', (SELECT COUNT(*) FROM public.shopping_requests WHERE user_id = user_record.id),
      'wallet_balance', COALESCE((SELECT balance FROM public.user_wallets WHERE user_id = user_record.id), 0)
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Grant execute permissions
GRANT EXECUTE ON FUNCTION generate_member_uid() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_by_member_uid(VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION get_member_activity_summary(VARCHAR) TO authenticated;

-- 9. Comment for documentation
COMMENT ON COLUMN public.users.member_uid IS 'Unique member ID for tracking (Format: TRD-XXXXXXXX)';
COMMENT ON FUNCTION generate_member_uid() IS 'Generates unique member UID in format TRD-XXXXXXXX';
COMMENT ON FUNCTION get_user_by_member_uid(VARCHAR) IS 'Lookup user by member UID';
COMMENT ON FUNCTION get_member_activity_summary(VARCHAR) IS 'Get user activity summary by member UID';
