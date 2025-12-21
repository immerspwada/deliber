-- Migration: 138_admin_get_verification_queue_rpc.sql
-- Feature: Admin Verification Queue RPC Function
-- Description: Creates RPC function for admin to fetch verification queue with all related data
-- This bypasses RLS issues with nested JOINs by using SECURITY DEFINER

-- Drop existing function if exists
DROP FUNCTION IF EXISTS admin_get_verification_queue(TEXT);

-- Create RPC function for admin to get verification queue with all related data
CREATE OR REPLACE FUNCTION admin_get_verification_queue(p_status TEXT DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  provider_id UUID,
  assigned_admin_id UUID,
  priority INT,
  queue_position INT,
  status TEXT,
  notes TEXT,
  estimated_review_time INTERVAL,
  actual_review_time INTERVAL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  provider_type TEXT,
  vehicle_type TEXT,
  vehicle_plate TEXT,
  provider_status TEXT,
  documents JSONB,
  user_id UUID,
  user_email TEXT,
  user_name TEXT,
  user_first_name TEXT,
  user_last_name TEXT,
  user_phone TEXT
) AS $$
BEGIN
  -- Check if user is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  RETURN QUERY
  SELECT 
    q.id,
    q.provider_id,
    q.assigned_admin_id,
    q.priority,
    q.queue_position,
    q.status::TEXT,
    q.notes::TEXT,
    q.estimated_review_time,
    q.actual_review_time,
    q.started_at,
    q.completed_at,
    q.created_at,
    sp.provider_type::TEXT,
    sp.vehicle_type::TEXT,
    sp.vehicle_plate::TEXT,
    sp.status::TEXT as provider_status,
    sp.documents,
    sp.user_id,
    u.email::TEXT as user_email,
    u.name::TEXT as user_name,
    u.first_name::TEXT as user_first_name,
    u.last_name::TEXT as user_last_name,
    COALESCE(u.phone_number, u.phone)::TEXT as user_phone
  FROM provider_verification_queue q
  LEFT JOIN service_providers sp ON q.provider_id = sp.id
  LEFT JOIN users u ON sp.user_id = u.id
  WHERE (p_status IS NULL OR q.status = p_status)
  ORDER BY q.priority DESC, q.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION admin_get_verification_queue(TEXT) TO authenticated;

-- Add comment
COMMENT ON FUNCTION admin_get_verification_queue IS 'Admin function to fetch verification queue with provider and user details. Bypasses RLS using SECURITY DEFINER.';
