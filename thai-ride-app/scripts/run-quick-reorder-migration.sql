-- Quick Reorder System Migration Runner
-- Run this in Supabase SQL Editor

-- Check if migration already applied
DO $
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ride_requests' 
    AND column_name = 'is_reorder'
  ) THEN
    RAISE NOTICE 'Applying Quick Reorder migration...';
  ELSE
    RAISE NOTICE 'Quick Reorder migration already applied';
  END IF;
END $;

-- =====================================================
-- 1. Add reorder tracking columns to existing tables
-- =====================================================

-- Ride Requests
ALTER TABLE ride_requests
ADD COLUMN IF NOT EXISTS is_reorder BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS original_request_id UUID REFERENCES ride_requests(id),
ADD COLUMN IF NOT EXISTS reorder_count INTEGER DEFAULT 0;

-- Delivery Requests
ALTER TABLE delivery_requests
ADD COLUMN IF NOT EXISTS is_reorder BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS original_request_id UUID REFERENCES delivery_requests(id),
ADD COLUMN IF NOT EXISTS reorder_count INTEGER DEFAULT 0;

-- Shopping Requests
ALTER TABLE shopping_requests
ADD COLUMN IF NOT EXISTS is_reorder BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS original_request_id UUID REFERENCES shopping_requests(id),
ADD COLUMN IF NOT EXISTS reorder_count INTEGER DEFAULT 0;

-- Queue Bookings
ALTER TABLE queue_bookings
ADD COLUMN IF NOT EXISTS is_reorder BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS original_booking_id UUID REFERENCES queue_bookings(id),
ADD COLUMN IF NOT EXISTS reorder_count INTEGER DEFAULT 0;

-- Moving Requests
ALTER TABLE moving_requests
ADD COLUMN IF NOT EXISTS is_reorder BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS original_request_id UUID REFERENCES moving_requests(id),
ADD COLUMN IF NOT EXISTS reorder_count INTEGER DEFAULT 0;

-- Laundry Requests
ALTER TABLE laundry_requests
ADD COLUMN IF NOT EXISTS is_reorder BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS original_request_id UUID REFERENCES laundry_requests(id),
ADD COLUMN IF NOT EXISTS reorder_count INTEGER DEFAULT 0;

-- =====================================================
-- 2. Create reorder analytics table
-- =====================================================

CREATE TABLE IF NOT EXISTS reorder_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL CHECK (service_type IN ('ride', 'delivery', 'shopping', 'queue', 'moving', 'laundry')),
  original_request_id UUID NOT NULL,
  reorder_request_id UUID NOT NULL,
  reorder_method TEXT NOT NULL CHECK (reorder_method IN ('quick_button', 'history', 'suggestion')),
  time_since_original INTERVAL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_reorder_analytics_user ON reorder_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_reorder_analytics_service ON reorder_analytics(service_type);
CREATE INDEX IF NOT EXISTS idx_reorder_analytics_created ON reorder_analytics(created_at);

-- =====================================================
-- 3. RLS Policies for reorder_analytics
-- =====================================================

ALTER TABLE reorder_analytics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customer_read_own_reorder_analytics" ON reorder_analytics;
CREATE POLICY "customer_read_own_reorder_analytics"
ON reorder_analytics FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "customer_insert_own_reorder_analytics" ON reorder_analytics;
CREATE POLICY "customer_insert_own_reorder_analytics"
ON reorder_analytics FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "admin_full_access_reorder_analytics" ON reorder_analytics;
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

-- =====================================================
-- 4. Functions: Quick Reorder for Ride
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
  -- Get user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  -- Get original ride
  SELECT * INTO v_original_ride
  FROM ride_requests
  WHERE id = p_original_ride_id
  AND user_id = v_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Original ride not found';
  END IF;
  
  -- Create new ride with same details
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
  
  -- Update reorder count
  UPDATE ride_requests
  SET reorder_count = COALESCE(reorder_count, 0) + 1
  WHERE id = p_original_ride_id;
  
  -- Track analytics
  INSERT INTO reorder_analytics (
    user_id,
    service_type,
    original_request_id,
    reorder_request_id,
    reorder_method,
    time_since_original
  ) VALUES (
    v_user_id,
    'ride',
    p_original_ride_id,
    v_new_ride_id,
    p_reorder_method,
    NOW() - v_original_ride.created_at
  );
  
  RETURN v_new_ride_id;
END;
$$;

-- =====================================================
-- 5. Functions: Quick Reorder for Delivery
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
  
  INSERT INTO reorder_analytics (
    user_id,
    service_type,
    original_request_id,
    reorder_request_id,
    reorder_method,
    time_since_original
  ) VALUES (
    v_user_id,
    'delivery',
    p_original_delivery_id,
    v_new_delivery_id,
    p_reorder_method,
    NOW() - v_original_delivery.created_at
  );
  
  RETURN v_new_delivery_id;
END;
$$;

-- =====================================================
-- 6. Functions: Get Reorderable Items
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
    r.pickup_address as from_location,
    r.destination_address as to_location,
    r.completed_at,
    COALESCE(r.reorder_count, 0) as reorder_count,
    TRUE as can_reorder
  FROM ride_requests r
  WHERE r.user_id = p_user_id
  AND r.status = 'completed'
  AND r.completed_at > NOW() - INTERVAL '30 days'
  
  UNION ALL
  
  -- Deliveries
  SELECT 
    d.id,
    'delivery'::TEXT,
    d.sender_address,
    d.recipient_address,
    d.completed_at,
    COALESCE(d.reorder_count, 0),
    TRUE
  FROM delivery_requests d
  WHERE d.user_id = p_user_id
  AND d.status = 'completed'
  AND d.completed_at > NOW() - INTERVAL '30 days'
  
  UNION ALL
  
  -- Queue Bookings
  SELECT 
    q.id,
    'queue'::TEXT,
    q.service_name,
    q.location_name,
    q.completed_at,
    COALESCE(q.reorder_count, 0),
    TRUE
  FROM queue_bookings q
  WHERE q.user_id = p_user_id
  AND q.status = 'completed'
  AND q.completed_at > NOW() - INTERVAL '30 days'
  
  ORDER BY completed_at DESC
  LIMIT p_limit;
END;
$$;

-- =====================================================
-- 7. Grant permissions
-- =====================================================

GRANT EXECUTE ON FUNCTION quick_reorder_ride TO authenticated;
GRANT EXECUTE ON FUNCTION quick_reorder_delivery TO authenticated;
GRANT EXECUTE ON FUNCTION get_reorderable_items TO authenticated;

-- =====================================================
-- 8. Verify installation
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Quick Reorder System installed successfully!';
  RAISE NOTICE 'Functions created:';
  RAISE NOTICE '  - quick_reorder_ride()';
  RAISE NOTICE '  - quick_reorder_delivery()';
  RAISE NOTICE '  - get_reorderable_items()';
  RAISE NOTICE 'Table created: reorder_analytics';
END $$;
