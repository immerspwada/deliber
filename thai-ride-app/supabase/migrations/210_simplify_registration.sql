-- Migration: 210_simplify_registration.sql
-- Feature: Simplified Registration System
-- Description: Remove national_id requirement, simplify user registration

-- =====================================================
-- STEP 1: Make national_id optional (remove NOT NULL constraint)
-- =====================================================

-- Drop the validation constraint if exists
ALTER TABLE users DROP CONSTRAINT IF EXISTS valid_national_id;

-- Make national_id nullable (it should already be, but ensure it)
ALTER TABLE users ALTER COLUMN national_id DROP NOT NULL;

-- =====================================================
-- STEP 2: Update complete_user_registration function (simplified)
-- =====================================================

CREATE OR REPLACE FUNCTION complete_user_registration(
  p_user_id UUID,
  p_first_name VARCHAR,
  p_last_name VARCHAR,
  p_national_id VARCHAR DEFAULT NULL,
  p_phone_number VARCHAR DEFAULT NULL,
  p_role VARCHAR DEFAULT 'customer'
)
RETURNS JSONB AS $$
BEGIN
  -- Update user profile (no national_id validation required)
  UPDATE users SET
    first_name = p_first_name,
    last_name = p_last_name,
    name = TRIM(CONCAT(p_first_name, ' ', p_last_name)),
    national_id = NULLIF(p_national_id, ''),
    phone_number = p_phone_number,
    phone = p_phone_number,
    role = p_role,
    verification_status = 'verified', -- Auto-verify for simplified flow
    is_active = true,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    -- Insert if not exists
    INSERT INTO users (
      id, first_name, last_name, name, national_id, 
      phone_number, phone, role, email, verification_status, is_active
    )
    VALUES (
      p_user_id,
      p_first_name,
      p_last_name,
      TRIM(CONCAT(p_first_name, ' ', p_last_name)),
      NULLIF(p_national_id, ''),
      p_phone_number,
      p_phone_number,
      p_role,
      (SELECT email FROM auth.users WHERE id = p_user_id),
      'verified',
      true
    );
  END IF;
  
  RETURN jsonb_build_object('success', true, 'message', 'Registration completed');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 3: Update handle_new_user trigger for auto-verification
-- =====================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create user profile with auto-verification
  INSERT INTO public.users (
    id, email, name, role, phone, is_active, verification_status
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer'),
    NEW.raw_user_meta_data->>'phone',
    true,
    'verified'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, users.name),
    phone = COALESCE(EXCLUDED.phone, users.phone),
    verification_status = 'verified',
    updated_at = NOW();
  
  -- Create wallet for new user
  INSERT INTO public.user_wallets (user_id, balance, currency)
  VALUES (NEW.id, 0, 'THB')
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Create loyalty record for new user
  INSERT INTO public.user_loyalty (user_id, current_points, lifetime_points)
  VALUES (NEW.id, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 4: Grant permissions
-- =====================================================

GRANT EXECUTE ON FUNCTION complete_user_registration(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION complete_user_registration(UUID, VARCHAR, VARCHAR) TO authenticated;

