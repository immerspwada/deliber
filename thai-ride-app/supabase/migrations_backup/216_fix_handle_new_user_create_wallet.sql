-- Migration: 216_fix_handle_new_user_create_wallet.sql
-- Description: Update handle_new_user trigger to automatically create wallet for new users
-- This fixes the "User not found" error when users try to create topup requests

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_first_name text;
  v_last_name text;
  v_name text;
  v_phone text;
  v_role text;
BEGIN
  v_name := COALESCE(
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'first_name',
    split_part(COALESCE(NEW.email, ''), '@', 1)
  );
  
  v_first_name := COALESCE(
    NEW.raw_user_meta_data->>'first_name',
    split_part(v_name, ' ', 1),
    ''
  );
  
  v_last_name := COALESCE(
    NEW.raw_user_meta_data->>'last_name',
    CASE 
      WHEN position(' ' in v_name) > 0 
      THEN substring(v_name from position(' ' in v_name) + 1)
      ELSE ''
    END,
    ''
  );
  
  v_phone := COALESCE(
    NEW.raw_user_meta_data->>'phone',
    NEW.phone,
    ''
  );
  
  -- Support both admin and super_admin roles
  v_role := COALESCE(
    NEW.raw_user_meta_data->>'role',
    'customer'
  );

  -- Create user record
  INSERT INTO public.users (
    id, email, name, first_name, last_name, phone, phone_number,
    role, is_active, verification_status, created_at, updated_at
  ) VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(v_name, ''),
    COALESCE(v_first_name, ''),
    COALESCE(v_last_name, ''),
    COALESCE(v_phone, ''),
    COALESCE(v_phone, ''),
    v_role,
    true,
    CASE WHEN v_role IN ('admin', 'super_admin') THEN 'verified' ELSE 'pending' END,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, users.email),
    role = CASE WHEN EXCLUDED.role IN ('admin', 'super_admin') THEN EXCLUDED.role ELSE users.role END,
    updated_at = NOW();

  -- Create wallet for customer and provider roles
  IF v_role IN ('customer', 'provider') THEN
    INSERT INTO public.user_wallets (
      user_id, balance, total_earned, total_spent, created_at, updated_at
    ) VALUES (
      NEW.id, 0, 0, 0, NOW(), NOW()
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user error: %', SQLERRM;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS 'Auto-create user profile and wallet on signup';
