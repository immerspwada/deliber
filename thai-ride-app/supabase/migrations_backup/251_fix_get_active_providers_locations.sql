-- Fix get_active_providers_locations to use providers_v2 table
-- Drop existing function
DROP FUNCTION IF EXISTS get_active_providers_locations() CASCADE;

-- Create updated function using providers_v2
CREATE OR REPLACE FUNCTION get_active_providers_locations()
RETURNS TABLE (
  id UUID,
  provider_uid TEXT,
  provider_type TEXT,
  user_name TEXT,
  phone_number TEXT,
  current_lat NUMERIC,
  current_lng NUMERIC,
  is_online BOOLEAN,
  rating NUMERIC,
  total_trips INT,
  last_updated TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    COALESCE(p.provider_uid, 'PRV-' || LEFT(p.id::TEXT, 8))::TEXT,
    COALESCE(p.provider_type, 'driver')::TEXT,
    COALESCE(p.first_name || ' ' || p.last_name, '')::TEXT,
    COALESCE(p.phone_number, '')::TEXT,
    p.current_lat::NUMERIC,
    p.current_lng::NUMERIC,
    COALESCE(p.is_online, false),
    COALESCE(p.rating, 0)::NUMERIC,
    COALESCE(p.total_trips, 0)::INT,
    p.updated_at
  FROM providers_v2 p
  WHERE p.status IN ('approved', 'active')
    AND p.is_online = true
    AND p.current_lat IS NOT NULL 
    AND p.current_lng IS NOT NULL
  ORDER BY p.updated_at DESC;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_active_providers_locations() TO anon, authenticated, service_role;
