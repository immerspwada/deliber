-- Migration: 181_fix_admin_user_creation.sql
-- Fix: Allow admin user creation via signup
-- Description: Update handle_new_user trigger to properly handle admin role

-- =====================================================
-- DROP AND RECREATE FUNCTION WITH PROPER SYNTAX
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
    NEW.raw_user_meta_data->>'first_name',
    split_part(NEW.email, '@', 1)
  );
  
  -- Parse first and last name
  v_first_name := COALESCE(
    NEW.raw_user_meta_data->>'first_name',
    split_part(v_name, ' ', 1)
  );
  
  v_last_name := COALESCE(
    NEW.raw_user_meta_data->>'last_name',
    CASE 
      WHEN position(' ' in v_name) > 0 
      THEN substring(v_name from position(' ' in v_name) + 1)
      ELSE ''
    END
  );
  
  v_phone := COALESCE(
    NEW.raw_user_meta_data->>'phone',
    NEW.phone,
    ''
  );
  
  -- Support admin role from metadata
  v_role := COALESCE(
    NEW.raw_user_meta_data->>'role',
    'customer'
  );

  -- Insert into public.users with all required fields
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
    verification_status,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    v_name,
    v_first_name,
    v_last_name,
    v_phone,
    v_phone,
    v_role,
    true,
    CASE WHEN v_role IN ('admin', 'super_admin') THEN 'verified' ELSE 'pending' END,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, users.email),
    role = CASE 
      WHEN EXCLUDED.role IN ('admin', 'super_admin') THEN EXCLUDED.role 
      ELSE users.role 
    END,
    updated_at = NOW();

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the signup
  RAISE WARNING 'handle_new_user error: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- =====================================================
-- RECREATE TRIGGER
-- =====================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- FUNCTION: Create admin user directly (for manual setup)
-- =====================================================

CREATE OR REPLACE FUNCTION public.create_admin_user(
  p_email text,
  p_first_name text DEFAULT 'Admin',
  p_last_name text DEFAULT 'User',
  p_role text DEFAULT 'admin'
)
RETURNS json
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id uuid;
  v_existing_user record;
BEGIN
  -- Check if user already exists in auth.users
  SELECT id INTO v_user_id FROM auth.users WHERE email = p_email;
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User not found in auth.users. Please create user in Supabase Auth first.'
    );
  END IF;
  
  -- Check if user exists in public.users
  SELECT * INTO v_existing_user FROM public.users WHERE id = v_user_id;
  
  IF v_existing_user IS NOT NULL THEN
    -- Update existing user to admin
    UPDATE public.users 
    SET 
      role = p_role,
      first_name = COALESCE(NULLIF(p_first_name, ''), first_name),
      last_name = COALESCE(NULLIF(p_last_name, ''), last_name),
      verification_status = 'verified',
      updated_at = NOW()
    WHERE id = v_user_id;
    
    RETURN json_build_object(
      'success', true,
      'action', 'updated',
      'user_id', v_user_id,
      'email', p_email,
      'role', p_role
    );
  ELSE
    -- Create new user record
    INSERT INTO public.users (
      id,
      email,
      first_name,
      last_name,
      name,
      role,
      is_active,
      verification_status,
      created_at,
      updated_at
    ) VALUES (
      v_user_id,
      p_email,
      p_first_name,
      p_last_name,
      p_first_name || ' ' || p_last_name,
      p_role,
      true,
      'verified',
      NOW(),
      NOW()
    );
    
    RETURN json_build_object(
      'success', true,
      'action', 'created',
      'user_id', v_user_id,
      'email', p_email,
      'role', p_role
    );
  END IF;
END;
$$;

-- Grant execute to service_role only (admin operation)
GRANT EXECUTE ON FUNCTION public.create_admin_user(text, text, text, text) TO service_role;

-- =====================================================
-- ENSURE USERS TABLE HAS ALL REQUIRED COLUMNS
-- =====================================================

-- Add missing columns if they don't exist
DO $$
BEGIN
  -- Add name column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'name') THEN
    ALTER TABLE public.users ADD COLUMN name text;
  END IF;
  
  -- Add is_active column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_active') THEN
    ALTER TABLE public.users ADD COLUMN is_active boolean DEFAULT true;
  END IF;
  
  -- Add verification_status column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'verification_status') THEN
    ALTER TABLE public.users ADD COLUMN verification_status text DEFAULT 'pending';
  END IF;
  
  -- Add phone column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'phone') THEN
    ALTER TABLE public.users ADD COLUMN phone text DEFAULT '';
  END IF;
END $$;

-- =====================================================
-- ALLOW NULL/EMPTY VALUES FOR OPTIONAL COLUMNS
-- =====================================================

ALTER TABLE public.users ALTER COLUMN phone DROP NOT NULL;
ALTER TABLE public.users ALTER COLUMN phone_number DROP NOT NULL;
ALTER TABLE public.users ALTER COLUMN name DROP NOT NULL;
ALTER TABLE public.users ALTER COLUMN first_name DROP NOT NULL;
ALTER TABLE public.users ALTER COLUMN last_name DROP NOT NULL;

-- Set defaults
ALTER TABLE public.users ALTER COLUMN phone SET DEFAULT '';
ALTER TABLE public.users ALTER COLUMN phone_number SET DEFAULT '';
ALTER TABLE public.users ALTER COLUMN name SET DEFAULT '';
ALTER TABLE public.users ALTER COLUMN first_name SET DEFAULT '';
ALTER TABLE public.users ALTER COLUMN last_name SET DEFAULT '';
ALTER TABLE public.users ALTER COLUMN role SET DEFAULT 'customer';
ALTER TABLE public.users ALTER COLUMN is_active SET DEFAULT true;
ALTER TABLE public.users ALTER COLUMN verification_status SET DEFAULT 'pending';

COMMENT ON FUNCTION public.handle_new_user() IS 'Auto-create user profile on signup with admin role support';
COMMENT ON FUNCTION public.create_admin_user(text, text, text, text) IS 'Create or update admin user - requires auth user to exist first';
