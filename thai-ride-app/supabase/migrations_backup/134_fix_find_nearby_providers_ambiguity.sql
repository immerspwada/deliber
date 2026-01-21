-- Migration: 134_fix_find_nearby_providers_ambiguity.sql
-- Fix: Could not choose the best candidate function between INTEGER and NUMERIC versions
-- Date: 2025-12-21

-- Drop ALL existing versions of find_nearby_providers
DROP FUNCTION IF EXISTS public.find_nearby_providers(DECIMAL, DECIMAL, INTEGER, VARCHAR);
DROP FUNCTION IF EXISTS public.find_nearby_providers(DECIMAL, DECIMAL, NUMERIC, VARCHAR);
DROP FUNCTION IF EXISTS public.find_nearby_providers(NUMERIC, NUMERIC, INTEGER, VARCHAR);
DROP FUNCTION IF EXISTS public.find_nearby_providers(NUMERIC, NUMERIC, NUMERIC, VARCHAR);
DROP FUNCTION IF EXISTS public.find_nearby_providers(NUMERIC, NUMERIC, NUMERIC, CHARACTER VARYING);

-- Create single unified function with NUMERIC for radius_km (accepts both integer and decimal)
CREATE OR REPLACE FUNCTION public.find_nearby_providers(
  lat NUMERIC,
  lng NUMERIC,
  radius_km NUMERIC DEFAULT 5,
  provider_type_filter VARCHAR(20) DEFAULT NULL
)
RETURNS TABLE (
  provider_id UUID,
  user_id UUID,
  provider_type VARCHAR(20),
  rating DECIMAL(3,2),
  distance_km DECIMAL(10,2)
) AS $func$
BEGIN
  RETURN QUERY
  SELECT 
    sp.id as provider_id,
    sp.user_id,
    sp.provider_type::VARCHAR(20),
    COALESCE(sp.rating, 4.5)::DECIMAL(3,2) as rating,
    (6371 * acos(
      LEAST(1.0, GREATEST(-1.0,
        cos(radians(lat)) * cos(radians(sp.current_lat)) *
        cos(radians(sp.current_lng) - radians(lng)) +
        sin(radians(lat)) * sin(radians(sp.current_lat))
      ))
    ))::DECIMAL(10,2) as distance_km
  FROM public.service_providers sp
  WHERE sp.is_available = true
    AND sp.is_verified = true
    AND sp.status = 'active'
    AND sp.current_lat IS NOT NULL
    AND sp.current_lng IS NOT NULL
    AND (provider_type_filter IS NULL OR sp.provider_type = provider_type_filter)
    AND (6371 * acos(
      LEAST(1.0, GREATEST(-1.0,
        cos(radians(lat)) * cos(radians(sp.current_lat)) *
        cos(radians(sp.current_lng) - radians(lng)) +
        sin(radians(lat)) * sin(radians(sp.current_lat))
      ))
    )) <= radius_km
  ORDER BY distance_km ASC
  LIMIT 20;
END;
$func$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.find_nearby_providers(NUMERIC, NUMERIC, NUMERIC, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_nearby_providers(NUMERIC, NUMERIC, NUMERIC, VARCHAR) TO anon;

COMMENT ON FUNCTION public.find_nearby_providers IS 'Find nearby available providers within radius_km. Accepts NUMERIC for all coordinate and radius parameters.';
