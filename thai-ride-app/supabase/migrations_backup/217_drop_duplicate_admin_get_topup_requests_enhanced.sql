-- Migration: 217_drop_duplicate_admin_get_topup_requests_enhanced.sql
-- Description: Drop duplicate admin_get_topup_requests_enhanced function to fix overloading error
-- This fixes the "Could not choose the best candidate function" error in admin panel

-- Drop the duplicate function with more parameters (6 params)
-- Keep the simpler version with 3 params that the frontend uses
DROP FUNCTION IF EXISTS public.admin_get_topup_requests_enhanced(
  p_status character varying,
  p_limit integer,
  p_offset integer,
  p_date_from timestamp with time zone,
  p_date_to timestamp with time zone,
  p_search text
);

COMMENT ON FUNCTION public.admin_get_topup_requests_enhanced(character varying, integer, text) 
IS 'Get topup requests for admin with search and filtering - simplified version';
