-- Migration: 124_admin_provider_functions.sql
-- Description: Create RPC functions for Admin to fetch providers (bypass RLS)
-- Feature: F23 - Admin Dashboard

-- Function: Get all providers for admin with user info
CREATE OR REPLACE FUNCTION get_all_providers_for_admin(
  p_status TEXT DEFAULT NULL,
  p_provider_type TEXT DEFAULT NULL,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  provider_type TEXT,
  vehicle_type TEXT,
  vehicle_plate TEXT,
  vehicle_color TEXT,
  license_number TEXT,
  is_available BOOLEAN,
  is_verified BOOLEAN,
  current_lat NUMERIC,
  current_lng NUMERIC,
  rating NUMERIC,
  total_trips INT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  vehicle_info JSONB,
  license_expiry DATE,
  national_id TEXT,
  documents JSONB,
  status TEXT,
  rejection_reason TEXT,
  approved_at TIMESTAMPTZ,
  approved_by UUID,
  allowed_services JSONB,
  provider_uid TEXT,
  applied_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID,
  admin_notes TEXT,
  application_count INT,
  suspended_at TIMESTAMPTZ,
  suspension_reason TEXT,
  user_email TEXT,
  user_first_name TEXT,
  user_last_name TEXT,
  user_phone TEXT,
  user_member_uid TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sp.id,
    sp.user_id,
    sp.provider_type::TEXT,
    sp.vehicle_type::TEXT,
    sp.vehicle_plate::TEXT,
    sp.vehicle_color::TEXT,
    sp.license_number::TEXT,
    sp.is_available,
    sp.is_verified,
    sp.current_lat,
    sp.current_lng,
    sp.rating,
    sp.total_trips,
    sp.created_at,
    sp.updated_at,
    sp.vehicle_info,
    sp.license_expiry,
    sp.national_id::TEXT,
    sp.documents,
    sp.status::TEXT,
    sp.rejection_reason::TEXT,
    sp.approved_at,
    sp.approved_by,
    sp.allowed_services,
    sp.provider_uid::TEXT,
    sp.applied_at,
    sp.reviewed_at,
    sp.reviewed_by,
    sp.admin_notes::TEXT,
    sp.application_count,
    sp.suspended_at,
    sp.suspension_reason::TEXT,
    u.email::TEXT AS user_email,
    u.first_name::TEXT AS user_first_name,
    u.last_name::TEXT AS user_last_name,
    COALESCE(u.phone_number, u.phone)::TEXT AS user_phone,
    u.member_uid::TEXT AS user_member_uid
  FROM service_providers sp
  LEFT JOIN users u ON sp.user_id = u.id
  WHERE 
    (p_status IS NULL OR sp.status::TEXT = p_status)
    AND (p_provider_type IS NULL OR sp.provider_type::TEXT = p_provider_type)
  ORDER BY sp.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Function: Count providers for admin
CREATE OR REPLACE FUNCTION count_providers_for_admin(
  p_status TEXT DEFAULT NULL,
  p_provider_type TEXT DEFAULT NULL
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*)::INT INTO v_count
  FROM service_providers sp
  WHERE 
    (p_status IS NULL OR sp.status::TEXT = p_status)
    AND (p_provider_type IS NULL OR sp.provider_type::TEXT = p_provider_type);
  
  RETURN v_count;
END;
$$;

-- Function: Search providers by email, name, phone, or UID
CREATE OR REPLACE FUNCTION search_providers_for_admin(
  p_search_query TEXT,
  p_limit INT DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  provider_type TEXT,
  vehicle_type TEXT,
  vehicle_plate TEXT,
  status TEXT,
  is_available BOOLEAN,
  is_verified BOOLEAN,
  rating NUMERIC,
  total_trips INT,
  created_at TIMESTAMPTZ,
  provider_uid TEXT,
  user_email TEXT,
  user_first_name TEXT,
  user_last_name TEXT,
  user_phone TEXT,
  user_member_uid TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sp.id,
    sp.user_id,
    sp.provider_type::TEXT,
    sp.vehicle_type::TEXT,
    sp.vehicle_plate::TEXT,
    sp.status::TEXT,
    sp.is_available,
    sp.is_verified,
    sp.rating,
    sp.total_trips,
    sp.created_at,
    sp.provider_uid::TEXT,
    u.email::TEXT AS user_email,
    u.first_name::TEXT AS user_first_name,
    u.last_name::TEXT AS user_last_name,
    COALESCE(u.phone_number, u.phone)::TEXT AS user_phone,
    u.member_uid::TEXT AS user_member_uid
  FROM service_providers sp
  LEFT JOIN users u ON sp.user_id = u.id
  WHERE 
    u.email ILIKE '%' || p_search_query || '%'
    OR u.first_name ILIKE '%' || p_search_query || '%'
    OR u.last_name ILIKE '%' || p_search_query || '%'
    OR u.phone_number ILIKE '%' || p_search_query || '%'
    OR u.phone ILIKE '%' || p_search_query || '%'
    OR u.member_uid ILIKE '%' || p_search_query || '%'
    OR sp.provider_uid ILIKE '%' || p_search_query || '%'
    OR sp.vehicle_plate ILIKE '%' || p_search_query || '%'
    OR sp.license_number ILIKE '%' || p_search_query || '%'
  ORDER BY sp.created_at DESC
  LIMIT p_limit;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_all_providers_for_admin TO authenticated;
GRANT EXECUTE ON FUNCTION count_providers_for_admin TO authenticated;
GRANT EXECUTE ON FUNCTION search_providers_for_admin TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_all_providers_for_admin IS 'Admin function to fetch all providers with user info (bypasses RLS)';
COMMENT ON FUNCTION count_providers_for_admin IS 'Admin function to count providers by status/type';
COMMENT ON FUNCTION search_providers_for_admin IS 'Admin function to search providers by email, name, phone, or UID';
