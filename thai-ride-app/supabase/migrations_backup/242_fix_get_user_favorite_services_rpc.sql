-- Migration: Fix get_user_favorite_services RPC function
-- Description: Update function to work as RPC without parameters using auth.uid()

-- Drop the existing function
DROP FUNCTION IF EXISTS get_user_favorite_services(UUID);

-- Create new function that uses auth.uid() internally
CREATE OR REPLACE FUNCTION get_user_favorite_services()
RETURNS TABLE (
  service_id TEXT,
  display_order INT
) AS $$
BEGIN
  -- Check if user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  RETURN QUERY
  SELECT ufs.service_id, ufs.display_order
  FROM user_favorite_services ufs
  WHERE ufs.user_id = auth.uid()
  ORDER BY ufs.display_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also update toggle_favorite_service to work without user_id parameter
DROP FUNCTION IF EXISTS toggle_favorite_service(UUID, TEXT);

CREATE OR REPLACE FUNCTION toggle_favorite_service(p_service_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_exists BOOLEAN;
  v_user_id UUID;
BEGIN
  -- Check if user is authenticated
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM user_favorite_services 
    WHERE user_id = v_user_id AND service_id = p_service_id
  ) INTO v_exists;
  
  IF v_exists THEN
    DELETE FROM user_favorite_services 
    WHERE user_id = v_user_id AND service_id = p_service_id;
    RETURN false; -- Removed from favorites
  ELSE
    INSERT INTO user_favorite_services (user_id, service_id, display_order)
    VALUES (v_user_id, p_service_id, (
      SELECT COALESCE(MAX(display_order), 0) + 1 
      FROM user_favorite_services WHERE user_id = v_user_id
    ));
    RETURN true; -- Added to favorites
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_favorite_services() TO authenticated;
GRANT EXECUTE ON FUNCTION toggle_favorite_service(TEXT) TO authenticated;