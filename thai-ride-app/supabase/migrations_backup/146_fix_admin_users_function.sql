-- Migration: 146_fix_admin_users_function.sql
-- Description: Fix get_all_users_for_admin to support verification_status filter
-- Date: 2025-01-22

-- Drop and recreate function with proper verification_status support
DROP FUNCTION IF EXISTS get_all_users_for_admin(TEXT, TEXT, INT, INT);

CREATE OR REPLACE FUNCTION get_all_users_for_admin(
  p_status TEXT DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  email TEXT,
  name TEXT,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  phone_number TEXT,
  member_uid TEXT,
  role TEXT,
  is_active BOOLEAN,
  verification_status TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    u.name,
    u.first_name,
    u.last_name,
    u.phone,
    u.phone_number,
    u.member_uid,
    u.role,
    COALESCE(u.is_active, true) as is_active,
    COALESCE(u.verification_status, 'pending') as verification_status,
    u.created_at,
    u.updated_at
  FROM users u
  WHERE (p_status IS NULL OR 
         -- Support verification_status values
         COALESCE(u.verification_status, 'pending') = p_status OR
         -- Also support active/inactive for backwards compatibility
         (p_status = 'active' AND COALESCE(u.is_active, true) = true) OR
         (p_status = 'inactive' AND COALESCE(u.is_active, true) = false))
    AND (p_search IS NULL OR 
         u.name ILIKE '%' || p_search || '%' OR
         u.email ILIKE '%' || p_search || '%' OR
         u.phone ILIKE '%' || p_search || '%' OR
         u.phone_number ILIKE '%' || p_search || '%' OR
         u.first_name ILIKE '%' || p_search || '%' OR
         u.last_name ILIKE '%' || p_search || '%' OR
         u.member_uid ILIKE '%' || p_search || '%')
  ORDER BY u.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate count function
DROP FUNCTION IF EXISTS count_users_for_admin(TEXT, TEXT);

CREATE OR REPLACE FUNCTION count_users_for_admin(
  p_status TEXT DEFAULT NULL,
  p_search TEXT DEFAULT NULL
)
RETURNS BIGINT AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM users u
    WHERE (p_status IS NULL OR 
           -- Support verification_status values
           COALESCE(u.verification_status, 'pending') = p_status OR
           -- Also support active/inactive for backwards compatibility
           (p_status = 'active' AND COALESCE(u.is_active, true) = true) OR
           (p_status = 'inactive' AND COALESCE(u.is_active, true) = false))
      AND (p_search IS NULL OR 
           u.name ILIKE '%' || p_search || '%' OR
           u.email ILIKE '%' || p_search || '%' OR
           u.phone ILIKE '%' || p_search || '%' OR
           u.phone_number ILIKE '%' || p_search || '%' OR
           u.first_name ILIKE '%' || p_search || '%' OR
           u.last_name ILIKE '%' || p_search || '%' OR
           u.member_uid ILIKE '%' || p_search || '%')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_all_users_for_admin TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_users_for_admin TO anon;
GRANT EXECUTE ON FUNCTION count_users_for_admin TO authenticated;
GRANT EXECUTE ON FUNCTION count_users_for_admin TO anon;

-- Add comments
COMMENT ON FUNCTION get_all_users_for_admin IS 'Get all users with search and filter for admin - supports verification_status filter';
COMMENT ON FUNCTION count_users_for_admin IS 'Count users for admin pagination - supports verification_status filter';
