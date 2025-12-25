-- Migration: Fix Customer Home Errors
-- Date: 2024-12-25
-- Issues Fixed:
-- 1. Analytics events 401 Unauthorized - RLS policy fix
-- 2. get_reorderable_items 404 Not Found - Function creation
-- 3. Ensure all quick reorder functions exist

-- =====================================================
-- 1. Fix analytics_events RLS policies
-- =====================================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "customer_insert_own_analytics" ON analytics_events;
DROP POLICY IF EXISTS "admin_full_access_analytics" ON analytics_events;
DROP POLICY IF EXISTS "authenticated_insert_analytics" ON analytics_events;
DROP POLICY IF EXISTS "authenticated_read_own_analytics" ON analytics_events;
DROP POLICY IF EXISTS "Users can insert their own analytics" ON analytics_events;
DROP POLICY IF EXISTS "Users can read their own analytics" ON analytics_events;

-- Allow ALL authenticated users to insert analytics (including anonymous session data)
CREATE POLICY "authenticated_can_insert_analytics"
ON analytics_events FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow users to read their own analytics
CREATE POLICY "authenticated_can_read_own_analytics"
ON analytics_events FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR user_id IS NULL);

-- Admin full access
CREATE POLICY "admin_full_access_analytics_events"
ON analytics_events FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- =====================================================
-- 2. Ensure reorder columns exist on all tables
-- =====================================================

-- Ride Requests
ALTER TABLE ride_requests
ADD COLUMN IF NOT EXISTS is_reorder BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS original_request_id UUID,
ADD COLUMN IF NOT EXISTS reorder_count INTEGER DEFAULT 0;

-- Delivery Requests
ALTER TABLE delivery_requests
ADD COLUMN IF NOT EXISTS is_reorder BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS original_request_id UUID,
ADD COLUMN IF NOT EXISTS reorder_count INTEGER DEFAULT 0;

-- Shopping Requests
ALTER TABLE shopping_requests
ADD COLUMN IF NOT EXISTS is_reorder BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS original_request_id UUID,
ADD COLUMN IF NOT EXISTS reorder_count INTEGER DEFAULT 0;

-- Queue Bookings
ALTER TABLE queue_bookings
ADD COLUMN IF NOT EXISTS is_reorder BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS original_booking_id UUID,
ADD COLUMN IF NOT EXISTS reorder_count INTEGER DEFAULT 0;

-- =====================================================
-- 3. Create/Replace get_reorderable_items function
-- =====================================================

CREATE OR REPLACE FUNCTION get_reorderable_items(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  service_type TEXT,
  from_location TEXT,
  to_location TEXT,
  completed_at TIMESTAMPTZ,
  reorder_count INTEGER,
  can_reorder BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  
  -- Rides
  SELECT 
    r.id,
    'ride'::TEXT as service_type,
    COALESCE(r.pickup_address, 'ไม่ระบุ') as from_location,
    COALESCE(r.destination_address, 'ไม่ระบุ') as to_location,
    r.completed_at,
    COALESCE(r.reorder_count, 0) as reorder_count,
    TRUE as can_reorder
  FROM ride_requests r
  WHERE r.user_id = p_user_id
  AND r.status = 'completed'
  AND r.completed_at IS NOT NULL
  AND r.completed_at > NOW() - INTERVAL '30 days'
  
  UNION ALL
  
  -- Deliveries
  SELECT 
    d.id,
    'delivery'::TEXT,
    COALESCE(d.sender_address, 'ไม่ระบุ'),
    COALESCE(d.recipient_address, 'ไม่ระบุ'),
    d.completed_at,
    COALESCE(d.reorder_count, 0),
    TRUE
  FROM delivery_requests d
  WHERE d.user_id = p_user_id
  AND d.status = 'completed'
  AND d.completed_at IS NOT NULL
  AND d.completed_at > NOW() - INTERVAL '30 days'
  
  UNION ALL
  
  -- Queue Bookings (if table exists and has data)
  SELECT 
    q.id,
    'queue'::TEXT,
    COALESCE(q.service_name, 'ไม่ระบุ'),
    COALESCE(q.location_name, 'ไม่ระบุ'),
    q.completed_at,
    COALESCE(q.reorder_count, 0),
    TRUE
  FROM queue_bookings q
  WHERE q.user_id = p_user_id
  AND q.status = 'completed'
  AND q.completed_at IS NOT NULL
  AND q.completed_at > NOW() - INTERVAL '30 days'
  
  ORDER BY completed_at DESC
  LIMIT p_limit;
END;
$$;

-- =====================================================
-- 4. Create/Replace quick_reorder_ride function
-- =====================================================

CREATE OR REPLACE FUNCTION quick_reorder_ride(
  p_original_ride_id UUID,
  p_reorder_method TEXT DEFAULT 'quick_button'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_original_ride ride_requests%ROWTYPE;
  v_new_ride_id UUID;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  SELECT * INTO v_original_ride
  FROM ride_requests
  WHERE id = p_original_ride_id
  AND user_id = v_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Original ride not found';
  END IF;
  
  INSERT INTO ride_requests (
    user_id,
    pickup_lat,
    pickup_lng,
    pickup_address,
    destination_lat,
    destination_lng,
    destination_address,
    vehicle_type,
    payment_method,
    notes,
    is_reorder,
    original_request_id,
    status
  ) VALUES (
    v_user_id,
    v_original_ride.pickup_lat,
    v_original_ride.pickup_lng,
    v_original_ride.pickup_address,
    v_original_ride.destination_lat,
    v_original_ride.destination_lng,
    v_original_ride.destination_address,
    v_original_ride.vehicle_type,
    v_original_ride.payment_method,
    'สั่งซ้ำจากคำสั่งเดิม',
    TRUE,
    p_original_ride_id,
    'pending'
  )
  RETURNING id INTO v_new_ride_id;
  
  UPDATE ride_requests
  SET reorder_count = COALESCE(reorder_count, 0) + 1
  WHERE id = p_original_ride_id;
  
  RETURN v_new_ride_id;
END;
$$;

-- =====================================================
-- 5. Create/Replace quick_reorder_delivery function
-- =====================================================

CREATE OR REPLACE FUNCTION quick_reorder_delivery(
  p_original_delivery_id UUID,
  p_reorder_method TEXT DEFAULT 'quick_button'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_original_delivery delivery_requests%ROWTYPE;
  v_new_delivery_id UUID;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  SELECT * INTO v_original_delivery
  FROM delivery_requests
  WHERE id = p_original_delivery_id
  AND user_id = v_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Original delivery not found';
  END IF;
  
  INSERT INTO delivery_requests (
    user_id,
    sender_name,
    sender_phone,
    sender_address,
    sender_lat,
    sender_lng,
    recipient_name,
    recipient_phone,
    recipient_address,
    recipient_lat,
    recipient_lng,
    package_type,
    package_size,
    payment_method,
    notes,
    is_reorder,
    original_request_id,
    status
  ) VALUES (
    v_user_id,
    v_original_delivery.sender_name,
    v_original_delivery.sender_phone,
    v_original_delivery.sender_address,
    v_original_delivery.sender_lat,
    v_original_delivery.sender_lng,
    v_original_delivery.recipient_name,
    v_original_delivery.recipient_phone,
    v_original_delivery.recipient_address,
    v_original_delivery.recipient_lat,
    v_original_delivery.recipient_lng,
    v_original_delivery.package_type,
    v_original_delivery.package_size,
    v_original_delivery.payment_method,
    'สั่งซ้ำจากคำสั่งเดิม',
    TRUE,
    p_original_delivery_id,
    'pending'
  )
  RETURNING id INTO v_new_delivery_id;
  
  UPDATE delivery_requests
  SET reorder_count = COALESCE(reorder_count, 0) + 1
  WHERE id = p_original_delivery_id;
  
  RETURN v_new_delivery_id;
END;
$$;

-- =====================================================
-- 6. Grant permissions
-- =====================================================

GRANT EXECUTE ON FUNCTION get_reorderable_items(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION quick_reorder_ride(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION quick_reorder_delivery(UUID, TEXT) TO authenticated;

-- =====================================================
-- 7. Create reorder_analytics table if not exists
-- =====================================================

CREATE TABLE IF NOT EXISTS reorder_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL,
  original_request_id UUID NOT NULL,
  reorder_request_id UUID NOT NULL,
  reorder_method TEXT NOT NULL DEFAULT 'quick_button',
  time_since_original INTERVAL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE reorder_analytics ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "customer_read_own_reorder_analytics" ON reorder_analytics;
DROP POLICY IF EXISTS "customer_insert_own_reorder_analytics" ON reorder_analytics;
DROP POLICY IF EXISTS "admin_full_access_reorder_analytics" ON reorder_analytics;

-- Create policies
CREATE POLICY "customer_read_own_reorder_analytics"
ON reorder_analytics FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "customer_insert_own_reorder_analytics"
ON reorder_analytics FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "admin_full_access_reorder_analytics"
ON reorder_analytics FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Index
CREATE INDEX IF NOT EXISTS idx_reorder_analytics_user ON reorder_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_reorder_analytics_created ON reorder_analytics(created_at);

-- =====================================================
-- Summary
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 173 Complete:';
  RAISE NOTICE '1. Fixed analytics_events RLS policies';
  RAISE NOTICE '2. Added reorder columns to all service tables';
  RAISE NOTICE '3. Created get_reorderable_items function';
  RAISE NOTICE '4. Created quick_reorder_ride function';
  RAISE NOTICE '5. Created quick_reorder_delivery function';
  RAISE NOTICE '6. Created reorder_analytics table';
END $$;
