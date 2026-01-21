-- =====================================================
-- Migration: 121_fix_can_access_provider_routes.sql
-- Description: Fix function to return JSON object instead of BOOLEAN
-- Feature: F14 - Provider Dashboard
-- Issue: Router expects { can_access: boolean, message?: string }
-- =====================================================

-- Drop existing function
DROP FUNCTION IF EXISTS public.can_access_provider_routes(UUID);

-- Function: can_access_provider_routes
-- Returns JSON object with can_access and message fields
CREATE OR REPLACE FUNCTION public.can_access_provider_routes(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_provider_exists BOOLEAN;
  v_provider_status TEXT;
  v_is_verified BOOLEAN;
BEGIN
  -- Check if user has a provider profile
  SELECT 
    EXISTS(SELECT 1 FROM service_providers WHERE user_id = p_user_id),
    (SELECT status FROM service_providers WHERE user_id = p_user_id LIMIT 1),
    (SELECT is_verified FROM service_providers WHERE user_id = p_user_id LIMIT 1)
  INTO v_provider_exists, v_provider_status, v_is_verified;
  
  -- No provider profile
  IF NOT v_provider_exists THEN
    RETURN json_build_object(
      'can_access', false,
      'message', 'No provider profile found',
      'status', 'none'
    );
  END IF;
  
  -- Check status
  IF v_provider_status IN ('approved', 'active') THEN
    RETURN json_build_object(
      'can_access', true,
      'message', 'Provider approved',
      'status', v_provider_status
    );
  END IF;
  
  -- Check is_verified flag as fallback
  IF v_is_verified = true THEN
    RETURN json_build_object(
      'can_access', true,
      'message', 'Provider verified',
      'status', v_provider_status
    );
  END IF;
  
  -- Pending status - allow access to onboarding
  IF v_provider_status = 'pending' THEN
    RETURN json_build_object(
      'can_access', true,
      'message', 'Provider pending approval',
      'status', 'pending'
    );
  END IF;
  
  -- Rejected or other status
  RETURN json_build_object(
    'can_access', false,
    'message', 'Provider status: ' || COALESCE(v_provider_status, 'unknown'),
    'status', COALESCE(v_provider_status, 'unknown')
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.can_access_provider_routes(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_provider_routes(UUID) TO anon;

COMMENT ON FUNCTION public.can_access_provider_routes IS 'Check if user can access provider dashboard routes - returns JSON with can_access, message, and status';
