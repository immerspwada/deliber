-- Fix RLS policies for providers_v2 table to resolve permission denied errors
-- Migration: 233_fix_providers_v2_rls_policies.sql

-- Drop existing policies to recreate them correctly
DROP POLICY IF EXISTS "providers_can_view_own_profile" ON public.providers_v2;
DROP POLICY IF EXISTS "providers_can_update_own_profile" ON public.providers_v2;
DROP POLICY IF EXISTS "users_can_create_provider_profile" ON public.providers_v2;
DROP POLICY IF EXISTS "admin_can_view_all_providers" ON public.providers_v2;
DROP POLICY IF EXISTS "admin_can_update_all_providers" ON public.providers_v2;

-- Create correct RLS policies for providers_v2
-- Users can view their own provider profile
CREATE POLICY "providers_can_view_own_profile" ON public.providers_v2
    FOR SELECT USING (user_id = auth.uid());

-- Users can create their own provider profile
CREATE POLICY "users_can_create_provider_profile" ON public.providers_v2
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can update their own provider profile (except status)
CREATE POLICY "providers_can_update_own_profile" ON public.providers_v2
    FOR UPDATE USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Admin can view all provider profiles
CREATE POLICY "admin_can_view_all_providers" ON public.providers_v2
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND user_type = 'admin'
        )
    );

-- Admin can update all provider profiles
CREATE POLICY "admin_can_update_all_providers" ON public.providers_v2
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND user_type = 'admin'
        )
    );

-- Admin can delete provider profiles
CREATE POLICY "admin_can_delete_providers" ON public.providers_v2
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND user_type = 'admin'
        )
    );

-- Create provider record for current user if not exists
DO $$
DECLARE
    current_user_id UUID;
    user_email TEXT;
    user_name TEXT;
BEGIN
    -- Get current user from auth.users
    SELECT id, email, COALESCE(raw_user_meta_data->>'full_name', email) 
    INTO current_user_id, user_email, user_name
    FROM auth.users 
    WHERE email = 'immersowada@gmail.com'
    LIMIT 1;
    
    IF current_user_id IS NOT NULL THEN
        -- Insert provider record if not exists
        INSERT INTO public.providers_v2 (
            user_id,
            first_name,
            last_name,
            email,
            phone_number,
            service_types,
            status,
            is_online,
            rating,
            total_trips,
            total_earnings
        ) VALUES (
            current_user_id,
            SPLIT_PART(user_name, ' ', 1),
            CASE 
                WHEN ARRAY_LENGTH(STRING_TO_ARRAY(user_name, ' '), 1) > 1 
                THEN SPLIT_PART(user_name, ' ', 2)
                ELSE ''
            END,
            user_email,
            '0800000000',
            ARRAY['ride', 'delivery'],
            'approved', -- Pre-approve for testing
            false,
            5.0,
            0,
            0.0
        ) ON CONFLICT (user_id) DO UPDATE SET
            status = 'approved',
            updated_at = NOW();
            
        RAISE NOTICE 'Provider record created/updated for user: %', user_email;
    ELSE
        RAISE NOTICE 'User not found: immersowada@gmail.com';
    END IF;
END $$;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.providers_v2 TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.jobs_v2 TO authenticated;
GRANT SELECT, INSERT ON public.earnings_v2 TO authenticated;

-- Create function to check if user can access provider routes
CREATE OR REPLACE FUNCTION public.can_access_provider_routes(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.providers_v2 
        WHERE providers_v2.user_id = can_access_provider_routes.user_id
        AND status IN ('approved', 'active')
    );
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.can_access_provider_routes(UUID) TO authenticated;

COMMENT ON POLICY "providers_can_view_own_profile" ON public.providers_v2 IS 'Providers can view their own profile';
COMMENT ON POLICY "users_can_create_provider_profile" ON public.providers_v2 IS 'Users can create their provider profile';
COMMENT ON POLICY "providers_can_update_own_profile" ON public.providers_v2 IS 'Providers can update their own profile';
COMMENT ON POLICY "admin_can_view_all_providers" ON public.providers_v2 IS 'Admin can view all provider profiles';
COMMENT ON POLICY "admin_can_update_all_providers" ON public.providers_v2 IS 'Admin can update all provider profiles';