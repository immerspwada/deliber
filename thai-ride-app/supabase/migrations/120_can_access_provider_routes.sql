-- =====================================================
-- Migration: 120_can_access_provider_routes.sql
-- Description: Function to check if user can access provider routes
-- Feature: F14 - Provider Dashboard
-- =====================================================

-- Function: can_access_provider_routes
-- Check if user can access provider routes
CREATE OR REPLACE FUNCTION public.can_access_provider_routes(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_provider_exists BOOLEAN;
  v_provider_status TEXT;
BEGIN
  -- Check if user has a provider profile
  SELECT 
    EXISTS(SELECT 1 FROM service_providers WHERE user_id = p_user_id),
    (SELECT status FROM service_providers WHERE user_id = p_user_id LIMIT 1)
  INTO v_provider_exists, v_provider_status;
  
  -- User can access provider routes if:
  -- 1. They have a provider profile AND
  -- 2. Their status is 'approved' or 'active' or they are verified
  IF v_provider_exists THEN
    -- Allow access for approved/active providers
    IF v_provider_status IN ('approved', 'active') THEN
      RETURN TRUE;
    END IF;
    
    -- Also check is_verified flag as fallback
    IF EXISTS(
      SELECT 1 FROM service_providers 
      WHERE user_id = p_user_id AND is_verified = true
    ) THEN
      RETURN TRUE;
    END IF;
    
    -- Allow pending providers to see onboarding page
    IF v_provider_status = 'pending' THEN
      RETURN TRUE;
    END IF;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.can_access_provider_routes(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_provider_routes(UUID) TO anon;

COMMENT ON FUNCTION public.can_access_provider_routes IS 'Check if user can access provider dashboard routes';
