-- Migration: 098_auto_create_user_profile.sql
-- Feature: F01 - Auto-create user profile on signup
-- Description: Ensure user profile exists in public.users when auth.users is created

-- =====================================================
-- FUNCTION: Auto-create user profile on signup
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_first_name text;
  v_last_name text;
  v_name text;
  v_phone text;
  v_role text;
BEGIN
  -- Extract data from metadata
  v_name := COALESCE(
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1)
  );
  
  -- Parse first and last name
  v_first_name := split_part(v_name, ' ', 1);
  v_last_name := CASE 
    WHEN position(' ' in v_name) > 0 
    THEN substring(v_name from position(' ' in v_name) + 1)
    ELSE ''
  END;
  
  v_phone := COALESCE(
    NEW.raw_user_meta_data->>'phone',
    NEW.phone,
    ''
  );
  
  v_role := COALESCE(
    NEW.raw_user_meta_data->>'role',
    'customer'
  );

  -- Insert into public.users
  INSERT INTO public.users (
    id,
    email,
    name,
    first_name,
    last_name,
    phone,
    phone_number,
    role,
    is_active,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    v_name,
    v_first_name,
    v_last_name,
    v_phone,
    v_phone,
    v_role,
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();

  RETURN NEW;
END;
$$;

-- =====================================================
-- TRIGGER: Create user profile on auth signup
-- =====================================================

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- FUNCTION: Sync existing auth users to public.users
-- =====================================================

CREATE OR REPLACE FUNCTION public.sync_auth_users_to_public()
RETURNS TABLE (
  synced_count int,
  error_count int,
  details text
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_synced int := 0;
  v_errors int := 0;
  v_user record;
  v_name text;
  v_first_name text;
  v_last_name text;
BEGIN
  FOR v_user IN 
    SELECT * FROM auth.users 
    WHERE id NOT IN (SELECT id FROM public.users)
  LOOP
    BEGIN
      v_name := COALESCE(
        v_user.raw_user_meta_data->>'name',
        v_user.raw_user_meta_data->>'full_name',
        split_part(v_user.email, '@', 1)
      );
      
      v_first_name := split_part(v_name, ' ', 1);
      v_last_name := CASE 
        WHEN position(' ' in v_name) > 0 
        THEN substring(v_name from position(' ' in v_name) + 1)
        ELSE ''
      END;

      INSERT INTO public.users (
        id,
        email,
        name,
        first_name,
        last_name,
        phone,
        phone_number,
        role,
        is_active,
        created_at,
        updated_at
      ) VALUES (
        v_user.id,
        v_user.email,
        v_name,
        v_first_name,
        v_last_name,
        COALESCE(v_user.raw_user_meta_data->>'phone', v_user.phone, ''),
        COALESCE(v_user.raw_user_meta_data->>'phone', v_user.phone, ''),
        COALESCE(v_user.raw_user_meta_data->>'role', 'customer'),
        true,
        v_user.created_at,
        NOW()
      );
      
      v_synced := v_synced + 1;
    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors + 1;
    END;
  END LOOP;

  RETURN QUERY SELECT v_synced, v_errors, 
    format('Synced %s users, %s errors', v_synced, v_errors);
END;
$$;

-- Grant execute to service role
GRANT EXECUTE ON FUNCTION public.sync_auth_users_to_public() TO service_role;

-- =====================================================
-- FUNCTION: Ensure user profile exists (for app use)
-- =====================================================

CREATE OR REPLACE FUNCTION public.ensure_user_profile()
RETURNS json
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id uuid;
  v_auth_user record;
  v_name text;
  v_first_name text;
  v_last_name text;
  v_result json;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Check if user already exists
  IF EXISTS (SELECT 1 FROM public.users WHERE id = v_user_id) THEN
    SELECT json_build_object(
      'success', true,
      'action', 'exists',
      'user_id', id,
      'email', email,
      'role', role
    ) INTO v_result
    FROM public.users WHERE id = v_user_id;
    RETURN v_result;
  END IF;

  -- Get auth user data
  SELECT * INTO v_auth_user FROM auth.users WHERE id = v_user_id;
  
  IF v_auth_user IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Auth user not found');
  END IF;

  -- Parse name
  v_name := COALESCE(
    v_auth_user.raw_user_meta_data->>'name',
    v_auth_user.raw_user_meta_data->>'full_name',
    split_part(v_auth_user.email, '@', 1)
  );
  
  v_first_name := split_part(v_name, ' ', 1);
  v_last_name := CASE 
    WHEN position(' ' in v_name) > 0 
    THEN substring(v_name from position(' ' in v_name) + 1)
    ELSE ''
  END;

  -- Create user profile
  INSERT INTO public.users (
    id,
    email,
    name,
    first_name,
    last_name,
    phone,
    phone_number,
    role,
    is_active,
    created_at,
    updated_at
  ) VALUES (
    v_user_id,
    v_auth_user.email,
    v_name,
    v_first_name,
    v_last_name,
    COALESCE(v_auth_user.raw_user_meta_data->>'phone', v_auth_user.phone, ''),
    COALESCE(v_auth_user.raw_user_meta_data->>'phone', v_auth_user.phone, ''),
    COALESCE(v_auth_user.raw_user_meta_data->>'role', 'customer'),
    true,
    v_auth_user.created_at,
    NOW()
  );

  RETURN json_build_object(
    'success', true,
    'action', 'created',
    'user_id', v_user_id,
    'email', v_auth_user.email
  );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.ensure_user_profile() TO authenticated;

COMMENT ON FUNCTION public.ensure_user_profile() IS 'Ensure user profile exists in public.users - creates if missing';

-- =====================================================
-- RUN SYNC FOR EXISTING USERS
-- =====================================================

-- This will sync any existing auth users that don't have public.users records
SELECT * FROM public.sync_auth_users_to_public();
