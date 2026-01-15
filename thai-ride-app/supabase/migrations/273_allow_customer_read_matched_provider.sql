-- Migration: 273_allow_customer_read_matched_provider.sql
-- Author: Kiro
-- Date: 2026-01-15
-- Description: Allow customers to read provider info for their matched rides

BEGIN;

-- Drop existing policy if exists
DROP POLICY IF EXISTS "customer_read_matched_provider" ON providers_v2;

-- Allow customers to read provider info if they have a ride with that provider
CREATE POLICY "customer_read_matched_provider" ON providers_v2
  FOR SELECT TO authenticated
  USING (
    -- Provider can see their own record
    (SELECT auth.uid()) = user_id
    OR
    -- Customer can see provider if they have a ride with them
    EXISTS (
      SELECT 1 FROM ride_requests rr
      WHERE rr.provider_id = providers_v2.id
      AND rr.user_id = (SELECT auth.uid())
      AND rr.status IN ('matched', 'arriving', 'arrived', 'pickup', 'picked_up', 'in_progress', 'completed')
    )
    OR
    -- Admin can see all
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = (SELECT auth.uid())
      AND u.role IN ('admin', 'super_admin', 'manager')
    )
  );

-- Also create the RPC function for fallback
CREATE OR REPLACE FUNCTION get_matched_provider_for_ride(p_ride_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_ride RECORD;
  v_provider RECORD;
  v_result JSONB;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'not_authenticated');
  END IF;
  
  SELECT id, user_id, provider_id, status
  INTO v_ride
  FROM ride_requests
  WHERE id = p_ride_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'ride_not_found');
  END IF;
  
  IF v_ride.user_id != v_user_id THEN
    RETURN jsonb_build_object('error', 'unauthorized');
  END IF;
  
  IF v_ride.provider_id IS NULL THEN
    RETURN jsonb_build_object('error', 'no_provider_assigned');
  END IF;
  
  SELECT 
    id, first_name, last_name, phone_number, rating, total_trips,
    vehicle_type, vehicle_plate, vehicle_color, avatar_url,
    vehicle_photo_url, current_lat, current_lng
  INTO v_provider
  FROM providers_v2
  WHERE id = v_ride.provider_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'provider_not_found');
  END IF;
  
  v_result := jsonb_build_object(
    'success', true,
    'provider', jsonb_build_object(
      'id', v_provider.id,
      'first_name', v_provider.first_name,
      'last_name', v_provider.last_name,
      'phone_number', v_provider.phone_number,
      'rating', COALESCE(v_provider.rating, 4.8),
      'total_trips', COALESCE(v_provider.total_trips, 0),
      'vehicle_type', v_provider.vehicle_type,
      'vehicle_plate', v_provider.vehicle_plate,
      'vehicle_color', v_provider.vehicle_color,
      'avatar_url', v_provider.avatar_url,
      'vehicle_photo_url', v_provider.vehicle_photo_url,
      'current_lat', v_provider.current_lat,
      'current_lng', v_provider.current_lng
    )
  );
  
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_matched_provider_for_ride(UUID) TO authenticated;

COMMIT;
