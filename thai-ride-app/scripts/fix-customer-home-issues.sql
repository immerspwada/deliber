-- Fix Customer Home Issues
-- Date: 2024-12-25
-- Issues Fixed:
-- 1. Analytics events 401 Unauthorized
-- 2. get_reorderable_items 404 Not Found
-- 3. RLS policies for analytics_events

-- =====================================================
-- 1. Fix analytics_events RLS policies
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "customer_insert_own_analytics" ON analytics_events;
DROP POLICY IF EXISTS "admin_full_access_analytics" ON analytics_events;

-- Allow authenticated users to insert their own analytics
CREATE POLICY "authenticated_insert_analytics"
ON analytics_events FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- Allow authenticated users to read their own analytics
CREATE POLICY "authenticated_read_own_analytics"
ON analytics_events FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR user_id IS NULL);

-- Admin full access
CREATE POLICY "admin_full_access_analytics"
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
-- 2. Verify get_reorderable_items function exists
-- =====================================================

-- Check if function exists, if not create it
DO $
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'get_reorderable_items'
  ) THEN
    -- Create the function
    CREATE FUNCTION get_reorderable_items(
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
    AS $func$
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
    $func$;
    
    -- Grant permissions
    GRANT EXECUTE ON FUNCTION get_reorderable_items TO authenticated;
    
    RAISE NOTICE 'Created get_reorderable_items function';
  ELSE
    RAISE NOTICE 'get_reorderable_items function already exists';
  END IF;
END $;

-- =====================================================
-- 3. Verify quick_reorder functions exist
-- =====================================================

-- Check quick_reorder_ride
DO $
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'quick_reorder_ride'
  ) THEN
    CREATE FUNCTION quick_reorder_ride(
      p_original_ride_id UUID,
      p_reorder_method TEXT DEFAULT 'quick_button'
    )
    RETURNS UUID
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $func$
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
    $func$;
    
    GRANT EXECUTE ON FUNCTION quick_reorder_ride TO authenticated;
    RAISE NOTICE 'Created quick_reorder_ride function';
  END IF;
END $;

-- Check quick_reorder_delivery
DO $
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'quick_reorder_delivery'
  ) THEN
    CREATE FUNCTION quick_reorder_delivery(
      p_original_delivery_id UUID,
      p_reorder_method TEXT DEFAULT 'quick_button'
    )
    RETURNS UUID
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $func$
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
    $func$;
    
    GRANT EXECUTE ON FUNCTION quick_reorder_delivery TO authenticated;
    RAISE NOTICE 'Created quick_reorder_delivery function';
  END IF;
END $;

-- =====================================================
-- 4. Add reorder columns if missing
-- =====================================================

-- Ride Requests
DO $
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ride_requests' AND column_name = 'is_reorder'
  ) THEN
    ALTER TABLE ride_requests
    ADD COLUMN is_reorder BOOLEAN DEFAULT FALSE,
    ADD COLUMN original_request_id UUID REFERENCES ride_requests(id),
    ADD COLUMN reorder_count INTEGER DEFAULT 0;
    RAISE NOTICE 'Added reorder columns to ride_requests';
  END IF;
END $;

-- Delivery Requests
DO $
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'delivery_requests' AND column_name = 'is_reorder'
  ) THEN
    ALTER TABLE delivery_requests
    ADD COLUMN is_reorder BOOLEAN DEFAULT FALSE,
    ADD COLUMN original_request_id UUID REFERENCES delivery_requests(id),
    ADD COLUMN reorder_count INTEGER DEFAULT 0;
    RAISE NOTICE 'Added reorder columns to delivery_requests';
  END IF;
END $;

-- Queue Bookings
DO $
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'queue_bookings' AND column_name = 'is_reorder'
  ) THEN
    ALTER TABLE queue_bookings
    ADD COLUMN is_reorder BOOLEAN DEFAULT FALSE,
    ADD COLUMN original_booking_id UUID REFERENCES queue_bookings(id),
    ADD COLUMN reorder_count INTEGER DEFAULT 0;
    RAISE NOTICE 'Added reorder columns to queue_bookings';
  END IF;
END $;

-- =====================================================
-- 5. Verify permissions
-- =====================================================

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_reorderable_items TO authenticated;
GRANT EXECUTE ON FUNCTION quick_reorder_ride TO authenticated;
GRANT EXECUTE ON FUNCTION quick_reorder_delivery TO authenticated;

-- =====================================================
-- Summary
-- =====================================================

DO $
BEGIN
  RAISE NOTICE '✅ Customer Home Issues Fixed:';
  RAISE NOTICE '1. Analytics events RLS policies updated';
  RAISE NOTICE '2. get_reorderable_items function verified/created';
  RAISE NOTICE '3. quick_reorder functions verified/created';
  RAISE NOTICE '4. Reorder columns added to tables';
  RAISE NOTICE '5. Permissions granted';
END $;
