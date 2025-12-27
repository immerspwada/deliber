-- =====================================================
-- RUN THIS FIRST IN SUPABASE SQL EDITOR
-- =====================================================
-- This fixes the user creation trigger and allows admin signup

-- Step 1: Fix the trigger function
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
  
  v_role := COALESCE(
    NEW.raw_user_meta_data->>'role',
    'customer'
  );

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

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user error: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Step 2: Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 3: Make columns nullable (ignore errors if already nullable)
DO $$ BEGIN ALTER TABLE public.users ALTER COLUMN phone DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.users ALTER COLUMN phone_number DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.users ALTER COLUMN name DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.users ALTER COLUMN first_name DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.users ALTER COLUMN last_name DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT 'Done! Now try creating admin account again.' as status;
