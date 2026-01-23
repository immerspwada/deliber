-- =============================================
-- DELIVERY SYSTEM - Complete 3-Role Implementation
-- =============================================
-- Date: 2026-01-23
-- Author: System
-- Description: Complete delivery system for Customer, Provider, Admin
-- =============================================

BEGIN;

-- =============================================
-- 1. UPDATE DELIVERY_REQUESTS TABLE SCHEMA
-- =============================================

-- Add missing columns if they don't exist
ALTER TABLE delivery_requests 
  ADD COLUMN IF NOT EXISTS package_photo TEXT,
  ADD COLUMN IF NOT EXISTS special_instructions TEXT,
  ADD COLUMN IF NOT EXISTS distance_km DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS final_fee DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS matched_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS picked_up_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancel_reason TEXT,
  ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) DEFAULT 'wallet',
  ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'pending';

-- Update provider_id to reference providers_v2
DO $$ 
BEGIN
  -- Drop old constraint if exists
  ALTER TABLE delivery_requests DROP CONSTRAINT IF EXISTS delivery_requests_provider_id_fkey;
  
  -- Add new constraint to providers_v2
  ALTER TABLE delivery_requests 
    ADD CONSTRAINT delivery_requests_provider_id_fkey 
    FOREIGN KEY (provider_id) REFERENCES providers_v2(id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add comments
COMMENT ON COLUMN delivery_requests.package_photo IS 'Customer uploaded photo of the package';
COMMENT ON COLUMN delivery_requests.special_instructions IS 'Special delivery instructions';
COMMENT ON COLUMN delivery_requests.distance_km IS 'Estimated distance in kilometers';
COMMENT ON COLUMN delivery_requests.final_fee IS 'Final fee after delivery completion';

-- =============================================
-- 2. ADMIN RPC FUNCTIONS
-- =============================================

-- Get all deliveries for admin with pagination and filters
CREATE OR REPLACE FUNCTION get_all_deliveries_for_admin(
  p_status TEXT DEFAULT NULL,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  tracking_id VARCHAR,
  status VARCHAR,
  user_id UUID,
  user_name TEXT,
  user_phone TEXT,
  provider_id UUID,
  provider_name TEXT,
  provider_phone TEXT,
  sender_name VARCHAR,
  sender_phone VARCHAR,
  sender_address TEXT,
  recipient_name VARCHAR,
  recipient_phone VARCHAR,
  recipient_address TEXT,
  package_type VARCHAR,
  package_description TEXT,
  distance_km DECIMAL,
  amount DECIMAL,
  payment_method VARCHAR,
  payment_status VARCHAR,
  created_at TIMESTAMPTZ,
  picked_up_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check admin role
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('admin', 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  RETURN QUERY
  SELECT 
    d.id,
    d.tracking_id,
    d.status,
    d.user_id,
    COALESCE(u.name, u.email) as user_name,
    u.phone as user_phone,
    d.provider_id,
    COALESCE(p.first_name || ' ' || p.last_name, 'ไม่มีผู้รับงาน') as provider_name,
    p.phone_number as provider_phone,
    d.sender_name,
    d.sender_phone,
    d.sender_address,
    d.recipient_name,
    d.recipient_phone,
    d.recipient_address,
    d.package_type,
    d.package_description,
    d.distance_km,
    COALESCE(d.final_fee, d.estimated_fee) as amount,
    COALESCE(d.payment_method, 'wallet') as payment_method,
    COALESCE(d.payment_status, 'pending') as payment_status,
    d.created_at,
    d.picked_up_at,
    d.delivered_at,
    d.cancelled_at
  FROM delivery_requests d
  LEFT JOIN users u ON d.user_id = u.id
  LEFT JOIN providers_v2 p ON d.provider_id = p.id
  WHERE (p_status IS NULL OR d.status = p_status)
  ORDER BY d.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Count deliveries for admin
CREATE OR REPLACE FUNCTION count_deliveries_for_admin(
  p_status TEXT DEFAULT NULL
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INT;
BEGIN
  -- Check admin role
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('admin', 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  SELECT COUNT(*)::INT INTO v_count
  FROM delivery_requests
  WHERE (p_status IS NULL OR status = p_status);

  RETURN v_count;
END;
$$;

-- Get delivery stats for admin
CREATE OR REPLACE FUNCTION get_delivery_stats_for_admin()
RETURNS TABLE (
  total BIGINT,
  pending BIGINT,
  matched BIGINT,
  in_transit BIGINT,
  delivered BIGINT,
  cancelled BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check admin role
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('admin', 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total,
    COUNT(*) FILTER (WHERE status = 'pending')::BIGINT as pending,
    COUNT(*) FILTER (WHERE status = 'matched')::BIGINT as matched,
    COUNT(*) FILTER (WHERE status = 'in_transit')::BIGINT as in_transit,
    COUNT(*) FILTER (WHERE status = 'delivered')::BIGINT as delivered,
    COUNT(*) FILTER (WHERE status = 'cancelled')::BIGINT as cancelled
  FROM delivery_requests;
END;
$$;

-- =============================================
-- 3. PROVIDER RPC FUNCTIONS
-- =============================================

-- Get available delivery jobs for provider
CREATE OR REPLACE FUNCTION get_available_delivery_jobs(
  p_provider_lat DECIMAL DEFAULT NULL,
  p_provider_lng DECIMAL DEFAULT NULL,
  p_max_distance_km DECIMAL DEFAULT 10,
  p_limit INT DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  tracking_id VARCHAR,
  sender_name VARCHAR,
  sender_phone VARCHAR,
  sender_address TEXT,
  sender_lat DECIMAL,
  sender_lng DECIMAL,
  recipient_name VARCHAR,
  recipient_phone VARCHAR,
  recipient_address TEXT,
  recipient_lat DECIMAL,
  recipient_lng DECIMAL,
  package_type VARCHAR,
  package_description TEXT,
  package_weight DECIMAL,
  estimated_fee DECIMAL,
  distance_km DECIMAL,
  distance_from_provider_km DECIMAL,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_provider_id UUID;
BEGIN
  -- Get provider_id from providers_v2 using user_id
  SELECT p.id INTO v_provider_id
  FROM providers_v2 p
  WHERE p.user_id = auth.uid()
  AND p.status = 'approved';

  IF v_provider_id IS NULL THEN
    RAISE EXCEPTION 'Provider not found or not approved';
  END IF;

  RETURN QUERY
  SELECT 
    d.id,
    d.tracking_id,
    d.sender_name,
    d.sender_phone,
    d.sender_address,
    d.sender_lat,
    d.sender_lng,
    d.recipient_name,
    d.recipient_phone,
    d.recipient_address,
    d.recipient_lat,
    d.recipient_lng,
    d.package_type,
    d.package_description,
    d.package_weight,
    d.estimated_fee,
    d.distance_km,
    CASE 
      WHEN p_provider_lat IS NOT NULL AND p_provider_lng IS NOT NULL THEN
        (6371 * acos(
          cos(radians(p_provider_lat)) * 
          cos(radians(d.sender_lat)) * 
          cos(radians(d.sender_lng) - radians(p_provider_lng)) + 
          sin(radians(p_provider_lat)) * 
          sin(radians(d.sender_lat))
        ))
      ELSE NULL
    END as distance_from_provider_km,
    d.created_at
  FROM delivery_requests d
  WHERE d.status = 'pending'
  AND (
    p_provider_lat IS NULL 
    OR p_provider_lng IS NULL 
    OR (6371 * acos(
      cos(radians(p_provider_lat)) * 
      cos(radians(d.sender_lat)) * 
      cos(radians(d.sender_lng) - radians(p_provider_lng)) + 
      sin(radians(p_provider_lat)) * 
      sin(radians(d.sender_lat))
    )) <= p_max_distance_km
  )
  ORDER BY d.created_at ASC
  LIMIT p_limit;
END;
$$;

-- Accept delivery job (provider)
CREATE OR REPLACE FUNCTION accept_delivery_job(
  p_delivery_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_provider_id UUID;
  v_current_status VARCHAR;
  v_user_id UUID;
  v_result JSON;
BEGIN
  -- Get provider_id from providers_v2
  SELECT p.id INTO v_provider_id
  FROM providers_v2 p
  WHERE p.user_id = auth.uid()
  AND p.status = 'approved';

  IF v_provider_id IS NULL THEN
    RAISE EXCEPTION 'PROVIDER_NOT_APPROVED';
  END IF;

  -- Lock and check delivery status
  SELECT status, user_id INTO v_current_status, v_user_id
  FROM delivery_requests
  WHERE id = p_delivery_id
  FOR UPDATE NOWAIT;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'DELIVERY_NOT_FOUND';
  END IF;

  IF v_current_status != 'pending' THEN
    RAISE EXCEPTION 'DELIVERY_ALREADY_ACCEPTED';
  END IF;

  -- Update delivery
  UPDATE delivery_requests
  SET 
    status = 'matched',
    provider_id = v_provider_id,
    matched_at = NOW(),
    updated_at = NOW()
  WHERE id = p_delivery_id;

  -- Create notification for customer
  INSERT INTO notifications (user_id, title, message, type, reference_id, reference_type)
  VALUES (
    v_user_id,
    'มีคนขับรับงานแล้ว',
    'คนขับกำลังเดินทางไปรับพัสดุของคุณ',
    'delivery_matched',
    p_delivery_id,
    'delivery'
  );

  v_result := json_build_object(
    'success', true,
    'delivery_id', p_delivery_id,
    'message', 'รับงานสำเร็จ'
  );

  RETURN v_result;
END;
$$;

-- Update delivery status (provider)
CREATE OR REPLACE FUNCTION update_delivery_status(
  p_delivery_id UUID,
  p_new_status VARCHAR,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_provider_id UUID;
  v_current_status VARCHAR;
  v_user_id UUID;
  v_result JSON;
  v_notification_title TEXT;
  v_notification_message TEXT;
BEGIN
  -- Get provider_id
  SELECT p.id INTO v_provider_id
  FROM providers_v2 p
  WHERE p.user_id = auth.uid()
  AND p.status = 'approved';

  IF v_provider_id IS NULL THEN
    RAISE EXCEPTION 'PROVIDER_NOT_APPROVED';
  END IF;

  -- Lock and check delivery
  SELECT status, user_id INTO v_current_status, v_user_id
  FROM delivery_requests
  WHERE id = p_delivery_id
  AND provider_id = v_provider_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'DELIVERY_NOT_FOUND_OR_NOT_ASSIGNED';
  END IF;

  -- Validate status transition
  IF v_current_status = 'delivered' OR v_current_status = 'cancelled' THEN
    RAISE EXCEPTION 'DELIVERY_ALREADY_FINALIZED';
  END IF;

  -- Update delivery based on new status
  CASE p_new_status
    WHEN 'pickup' THEN
      UPDATE delivery_requests
      SET status = 'pickup', updated_at = NOW()
      WHERE id = p_delivery_id;
      
      v_notification_title := 'คนขับกำลังมารับพัสดุ';
      v_notification_message := 'คนขับกำลังเดินทางไปยังจุดรับพัสดุ';

    WHEN 'in_transit' THEN
      UPDATE delivery_requests
      SET 
        status = 'in_transit',
        picked_up_at = NOW(),
        updated_at = NOW()
      WHERE id = p_delivery_id;
      
      v_notification_title := 'รับพัสดุแล้ว';
      v_notification_message := 'คนขับกำลังจัดส่งพัสดุของคุณ';

    WHEN 'delivered' THEN
      UPDATE delivery_requests
      SET 
        status = 'delivered',
        delivered_at = NOW(),
        final_fee = estimated_fee,
        payment_status = 'completed',
        updated_at = NOW()
      WHERE id = p_delivery_id;
      
      v_notification_title := 'ส่งพัสดุสำเร็จ';
      v_notification_message := 'พัสดุของคุณถูกส่งเรียบร้อยแล้ว';

    WHEN 'failed' THEN
      UPDATE delivery_requests
      SET 
        status = 'failed',
        updated_at = NOW()
      WHERE id = p_delivery_id;
      
      v_notification_title := 'ส่งพัสดุไม่สำเร็จ';
      v_notification_message := p_notes;

    ELSE
      RAISE EXCEPTION 'INVALID_STATUS';
  END CASE;

  -- Create notification
  IF v_notification_title IS NOT NULL THEN
    INSERT INTO notifications (user_id, title, message, type, reference_id, reference_type)
    VALUES (
      v_user_id,
      v_notification_title,
      v_notification_message,
      'delivery_status_update',
      p_delivery_id,
      'delivery'
    );
  END IF;

  v_result := json_build_object(
    'success', true,
    'delivery_id', p_delivery_id,
    'new_status', p_new_status,
    'message', 'อัพเดทสถานะสำเร็จ'
  );

  RETURN v_result;
END;
$$;

-- Get provider's active deliveries
CREATE OR REPLACE FUNCTION get_provider_active_deliveries()
RETURNS TABLE (
  id UUID,
  tracking_id VARCHAR,
  status VARCHAR,
  sender_name VARCHAR,
  sender_phone VARCHAR,
  sender_address TEXT,
  sender_lat DECIMAL,
  sender_lng DECIMAL,
  recipient_name VARCHAR,
  recipient_phone VARCHAR,
  recipient_address TEXT,
  recipient_lat DECIMAL,
  recipient_lng DECIMAL,
  package_type VARCHAR,
  package_description TEXT,
  estimated_fee DECIMAL,
  distance_km DECIMAL,
  created_at TIMESTAMPTZ,
  matched_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_provider_id UUID;
BEGIN
  -- Get provider_id
  SELECT p.id INTO v_provider_id
  FROM providers_v2 p
  WHERE p.user_id = auth.uid()
  AND p.status = 'approved';

  IF v_provider_id IS NULL THEN
    RAISE EXCEPTION 'Provider not found or not approved';
  END IF;

  RETURN QUERY
  SELECT 
    d.id,
    d.tracking_id,
    d.status,
    d.sender_name,
    d.sender_phone,
    d.sender_address,
    d.sender_lat,
    d.sender_lng,
    d.recipient_name,
    d.recipient_phone,
    d.recipient_address,
    d.recipient_lat,
    d.recipient_lng,
    d.package_type,
    d.package_description,
    d.estimated_fee,
    d.distance_km,
    d.created_at,
    d.matched_at
  FROM delivery_requests d
  WHERE d.provider_id = v_provider_id
  AND d.status IN ('matched', 'pickup', 'in_transit')
  ORDER BY d.matched_at DESC;
END;
$$;

-- =============================================
-- 4. CUSTOMER RPC FUNCTIONS
-- =============================================

-- Create delivery with atomic wallet check
CREATE OR REPLACE FUNCTION create_delivery_atomic(
  p_user_id UUID,
  p_sender_name VARCHAR,
  p_sender_phone VARCHAR,
  p_sender_address TEXT,
  p_sender_lat DECIMAL,
  p_sender_lng DECIMAL,
  p_recipient_name VARCHAR,
  p_recipient_phone VARCHAR,
  p_recipient_address TEXT,
  p_recipient_lat DECIMAL,
  p_recipient_lng DECIMAL,
  p_package_type VARCHAR,
  p_package_weight DECIMAL,
  p_package_description TEXT,
  p_package_photo TEXT,
  p_special_instructions TEXT,
  p_estimated_fee DECIMAL,
  p_distance_km DECIMAL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_wallet_balance DECIMAL;
  v_delivery_id UUID;
  v_tracking_id VARCHAR;
  v_result JSON;
BEGIN
  -- Check wallet balance
  SELECT balance INTO v_wallet_balance
  FROM wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'WALLET_NOT_FOUND';
  END IF;

  IF v_wallet_balance < p_estimated_fee THEN
    RAISE EXCEPTION 'INSUFFICIENT_BALANCE';
  END IF;

  -- Deduct from wallet
  UPDATE wallets
  SET 
    balance = balance - p_estimated_fee,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Create delivery request
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
    package_weight,
    package_description,
    package_photo,
    special_instructions,
    estimated_fee,
    distance_km,
    status,
    payment_method,
    payment_status
  ) VALUES (
    p_user_id,
    p_sender_name,
    p_sender_phone,
    p_sender_address,
    p_sender_lat,
    p_sender_lng,
    p_recipient_name,
    p_recipient_phone,
    p_recipient_address,
    p_recipient_lat,
    p_recipient_lng,
    p_package_type,
    p_package_weight,
    p_package_description,
    p_package_photo,
    p_special_instructions,
    p_estimated_fee,
    p_distance_km,
    'pending',
    'wallet',
    'paid'
  )
  RETURNING id, tracking_id INTO v_delivery_id, v_tracking_id;

  -- Record wallet transaction
  INSERT INTO wallet_transactions (
    user_id,
    type,
    amount,
    balance_before,
    balance_after,
    reference_type,
    reference_id,
    description
  ) VALUES (
    p_user_id,
    'deduct',
    p_estimated_fee,
    v_wallet_balance,
    v_wallet_balance - p_estimated_fee,
    'delivery',
    v_delivery_id,
    'ค่าบริการส่งพัสดุ ' || v_tracking_id
  );

  v_result := json_build_object(
    'success', true,
    'delivery_id', v_delivery_id,
    'tracking_id', v_tracking_id,
    'message', 'สร้างคำขอส่งพัสดุสำเร็จ'
  );

  RETURN v_result;
END;
$$;

-- =============================================
-- 5. RLS POLICIES
-- =============================================

-- Drop all existing policies
DROP POLICY IF EXISTS "Allow all delivery_requests" ON delivery_requests;
DROP POLICY IF EXISTS "Users can view own deliveries" ON delivery_requests;
DROP POLICY IF EXISTS "Users can create deliveries" ON delivery_requests;
DROP POLICY IF EXISTS "Users can update own deliveries" ON delivery_requests;
DROP POLICY IF EXISTS "providers_view_pending_deliveries" ON delivery_requests;
DROP POLICY IF EXISTS "providers_update_own_deliveries" ON delivery_requests;
DROP POLICY IF EXISTS "provider_read_pending_deliveries" ON delivery_requests;
DROP POLICY IF EXISTS "provider_read_assigned_deliveries" ON delivery_requests;

-- Customer policies
CREATE POLICY "customer_view_own_deliveries" ON delivery_requests
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "customer_create_deliveries" ON delivery_requests
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Provider policies
CREATE POLICY "provider_view_pending_deliveries" ON delivery_requests
  FOR SELECT TO authenticated
  USING (
    status = 'pending'
    OR EXISTS (
      SELECT 1 FROM providers_v2 p
      WHERE p.user_id = auth.uid()
      AND p.id = delivery_requests.provider_id
      AND p.status = 'approved'
    )
  );

CREATE POLICY "provider_update_assigned_deliveries" ON delivery_requests
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM providers_v2 p
      WHERE p.user_id = auth.uid()
      AND p.id = delivery_requests.provider_id
      AND p.status = 'approved'
    )
  );

-- Admin policies
CREATE POLICY "admin_full_access_deliveries" ON delivery_requests
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- =============================================
-- 6. REALTIME
-- =============================================

-- Enable realtime for delivery_requests
ALTER PUBLICATION supabase_realtime ADD TABLE delivery_requests;

COMMIT;

-- =============================================
-- VERIFICATION QUERIES
-- =============================================

-- Verify table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'delivery_requests'
ORDER BY ordinal_position;

-- Verify RLS policies
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'delivery_requests';

-- Verify functions
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name LIKE '%delivery%'
AND routine_schema = 'public'
ORDER BY routine_name;
