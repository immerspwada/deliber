-- =====================================================
-- Migration: 293_tip_support_system.sql
-- Description: Tip Support System for 3 Roles
-- 
-- Role Impact:
-- 👤 Customer: ให้ทิปหลังจบงาน (ภายใน 24 ชม.)
-- 🚗 Provider: รับทิปและดูประวัติทิป
-- 👑 Admin: ดูรายงานทิปทั้งหมด, analytics
-- =====================================================

-- =====================================================
-- 1. ADD TIP COLUMNS TO ride_requests
-- =====================================================

-- Add tip_amount column to ride_requests
ALTER TABLE ride_requests 
ADD COLUMN IF NOT EXISTS tip_amount DECIMAL(10,2) DEFAULT 0;

-- Add tip_at timestamp
ALTER TABLE ride_requests 
ADD COLUMN IF NOT EXISTS tip_at TIMESTAMPTZ;

-- Add tip_message (optional thank you message)
ALTER TABLE ride_requests 
ADD COLUMN IF NOT EXISTS tip_message TEXT;

-- Add index for tip queries
CREATE INDEX IF NOT EXISTS idx_ride_requests_tip 
ON ride_requests(provider_id, tip_amount) 
WHERE tip_amount > 0;

-- =====================================================
-- 2. CREATE tips TABLE FOR DETAILED TRACKING
-- =====================================================

CREATE TABLE IF NOT EXISTS tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID NOT NULL REFERENCES ride_requests(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES auth.users(id),
  provider_id UUID NOT NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  message TEXT,
  payment_method TEXT DEFAULT 'wallet',
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  
  -- Prevent duplicate tips for same ride
  UNIQUE(ride_id)
);

-- Indexes for tips table
CREATE INDEX IF NOT EXISTS idx_tips_customer ON tips(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tips_provider ON tips(provider_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tips_status ON tips(status) WHERE status = 'pending';

-- =====================================================
-- 3. RLS POLICIES FOR tips TABLE
-- =====================================================

ALTER TABLE tips ENABLE ROW LEVEL SECURITY;

-- Customer: Can view and create their own tips
CREATE POLICY "customer_view_own_tips" ON tips
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = customer_id);

CREATE POLICY "customer_create_tip" ON tips
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = customer_id);

-- Provider: Can view tips they received (via providers_v2.user_id)
CREATE POLICY "provider_view_received_tips" ON tips
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM providers_v2
      WHERE providers_v2.id = tips.provider_id
      AND providers_v2.user_id = (SELECT auth.uid())
    )
  );

-- Admin: Full access
CREATE POLICY "admin_full_tips_access" ON tips
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- =====================================================
-- 4. FUNCTION: give_tip (Customer)
-- =====================================================

CREATE OR REPLACE FUNCTION give_tip(
  p_ride_id UUID,
  p_amount DECIMAL,
  p_message TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ride RECORD;
  v_customer_id UUID;
  v_provider_id UUID;
  v_wallet_balance DECIMAL;
  v_tip_id UUID;
  v_can_tip BOOLEAN;
BEGIN
  -- Get current user
  v_customer_id := auth.uid();
  
  IF v_customer_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'NOT_AUTHENTICATED');
  END IF;
  
  -- Validate amount
  IF p_amount <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'INVALID_AMOUNT');
  END IF;
  
  IF p_amount > 10000 THEN
    RETURN json_build_object('success', false, 'error', 'AMOUNT_TOO_HIGH');
  END IF;
  
  -- Get ride details
  SELECT * INTO v_ride
  FROM ride_requests
  WHERE id = p_ride_id
  AND user_id = v_customer_id
  AND status = 'completed';
  
  IF v_ride IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'RIDE_NOT_FOUND');
  END IF;
  
  -- Check if already tipped
  IF v_ride.tip_amount > 0 THEN
    RETURN json_build_object('success', false, 'error', 'ALREADY_TIPPED');
  END IF;
  
  -- Check if within 24 hours of completion
  IF v_ride.completed_at < NOW() - INTERVAL '24 hours' THEN
    RETURN json_build_object('success', false, 'error', 'TIP_WINDOW_EXPIRED');
  END IF;
  
  v_provider_id := v_ride.provider_id;
  
  IF v_provider_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'NO_PROVIDER');
  END IF;
  
  -- Check customer wallet balance
  SELECT balance INTO v_wallet_balance
  FROM wallets
  WHERE user_id = v_customer_id;
  
  IF v_wallet_balance IS NULL OR v_wallet_balance < p_amount THEN
    RETURN json_build_object('success', false, 'error', 'INSUFFICIENT_BALANCE');
  END IF;
  
  -- Start transaction
  -- 1. Deduct from customer wallet
  UPDATE wallets
  SET balance = balance - p_amount,
      updated_at = NOW()
  WHERE user_id = v_customer_id;
  
  -- 2. Add to provider earnings (via providers_v2)
  UPDATE providers_v2
  SET total_earnings = COALESCE(total_earnings, 0) + p_amount,
      updated_at = NOW()
  WHERE id = v_provider_id;
  
  -- 3. Update ride_requests
  UPDATE ride_requests
  SET tip_amount = p_amount,
      tip_at = NOW(),
      tip_message = p_message
  WHERE id = p_ride_id;
  
  -- 4. Create tip record
  INSERT INTO tips (ride_id, customer_id, provider_id, amount, message, status, processed_at)
  VALUES (p_ride_id, v_customer_id, v_provider_id, p_amount, p_message, 'completed', NOW())
  RETURNING id INTO v_tip_id;
  
  -- 5. Create wallet transactions
  INSERT INTO wallet_transactions (wallet_id, type, amount, description, reference_id, reference_type)
  SELECT w.id, 'tip_sent', -p_amount, 'ทิปให้คนขับ', p_ride_id::TEXT, 'tip'
  FROM wallets w WHERE w.user_id = v_customer_id;
  
  -- 6. Create notification for provider
  INSERT INTO notifications (user_id, type, title, message, data)
  SELECT pv.user_id, 'tip_received', 'ได้รับทิป! 🎉', 
         'คุณได้รับทิป ฿' || p_amount::TEXT || ' จากลูกค้า',
         json_build_object('ride_id', p_ride_id, 'amount', p_amount, 'message', p_message)
  FROM providers_v2 pv WHERE pv.id = v_provider_id;
  
  RETURN json_build_object(
    'success', true,
    'tip_id', v_tip_id,
    'amount', p_amount,
    'message', 'ให้ทิปสำเร็จ'
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- =====================================================
-- 5. FUNCTION: get_provider_tips (Provider)
-- =====================================================

CREATE OR REPLACE FUNCTION get_provider_tips(
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_provider_id UUID;
  v_tips JSON;
  v_total_tips DECIMAL;
  v_tip_count INT;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'NOT_AUTHENTICATED');
  END IF;
  
  -- Get provider_id from providers_v2
  SELECT id INTO v_provider_id
  FROM providers_v2
  WHERE user_id = v_user_id;
  
  IF v_provider_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'NOT_A_PROVIDER');
  END IF;
  
  -- Get tips with customer info
  SELECT json_agg(tip_data), COUNT(*), COALESCE(SUM(amount), 0)
  INTO v_tips, v_tip_count, v_total_tips
  FROM (
    SELECT 
      t.id,
      t.amount,
      t.message,
      t.created_at,
      t.ride_id,
      json_build_object(
        'name', COALESCE(u.name, 'ลูกค้า'),
        'avatar_url', u.avatar_url
      ) as customer,
      rr.pickup_address,
      rr.destination_address
    FROM tips t
    JOIN ride_requests rr ON rr.id = t.ride_id
    LEFT JOIN users u ON u.id = t.customer_id
    WHERE t.provider_id = v_provider_id
    AND t.status = 'completed'
    ORDER BY t.created_at DESC
    LIMIT p_limit OFFSET p_offset
  ) tip_data;
  
  -- Get total stats
  SELECT COUNT(*), COALESCE(SUM(amount), 0)
  INTO v_tip_count, v_total_tips
  FROM tips
  WHERE provider_id = v_provider_id
  AND status = 'completed';
  
  RETURN json_build_object(
    'success', true,
    'tips', COALESCE(v_tips, '[]'::JSON),
    'total_tips', v_total_tips,
    'tip_count', v_tip_count
  );
END;
$$;

-- =====================================================
-- 6. FUNCTION: get_tip_analytics (Admin)
-- =====================================================

CREATE OR REPLACE FUNCTION admin_get_tip_analytics(
  p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_is_admin BOOLEAN;
  v_result JSON;
BEGIN
  v_user_id := auth.uid();
  
  -- Check admin
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = v_user_id AND role = 'admin'
  ) INTO v_is_admin;
  
  IF NOT v_is_admin THEN
    RETURN json_build_object('success', false, 'error', 'NOT_ADMIN');
  END IF;
  
  SELECT json_build_object(
    'success', true,
    'period', json_build_object('start', p_start_date, 'end', p_end_date),
    'summary', (
      SELECT json_build_object(
        'total_tips', COALESCE(SUM(amount), 0),
        'tip_count', COUNT(*),
        'avg_tip', COALESCE(AVG(amount), 0),
        'max_tip', COALESCE(MAX(amount), 0),
        'min_tip', COALESCE(MIN(amount), 0),
        'unique_customers', COUNT(DISTINCT customer_id),
        'unique_providers', COUNT(DISTINCT provider_id)
      )
      FROM tips
      WHERE created_at >= p_start_date
      AND created_at < p_end_date + INTERVAL '1 day'
      AND status = 'completed'
    ),
    'daily_stats', (
      SELECT json_agg(daily ORDER BY day)
      FROM (
        SELECT 
          DATE(created_at) as day,
          COUNT(*) as count,
          SUM(amount) as total,
          AVG(amount) as avg
        FROM tips
        WHERE created_at >= p_start_date
        AND created_at < p_end_date + INTERVAL '1 day'
        AND status = 'completed'
        GROUP BY DATE(created_at)
      ) daily
    ),
    'top_providers', (
      SELECT json_agg(provider_stats ORDER BY total_tips DESC)
      FROM (
        SELECT 
          t.provider_id,
          pv.name as provider_name,
          COUNT(*) as tip_count,
          SUM(t.amount) as total_tips,
          AVG(t.amount) as avg_tip
        FROM tips t
        JOIN providers_v2 pv ON pv.id = t.provider_id
        WHERE t.created_at >= p_start_date
        AND t.created_at < p_end_date + INTERVAL '1 day'
        AND t.status = 'completed'
        GROUP BY t.provider_id, pv.name
        ORDER BY total_tips DESC
        LIMIT 10
      ) provider_stats
    )
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;

-- =====================================================
-- 7. FUNCTION: can_give_tip (Check if customer can tip)
-- =====================================================

CREATE OR REPLACE FUNCTION can_give_tip(p_ride_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ride RECORD;
  v_customer_id UUID;
  v_wallet_balance DECIMAL;
BEGIN
  v_customer_id := auth.uid();
  
  IF v_customer_id IS NULL THEN
    RETURN json_build_object('can_tip', false, 'reason', 'NOT_AUTHENTICATED');
  END IF;
  
  -- Get ride
  SELECT * INTO v_ride
  FROM ride_requests
  WHERE id = p_ride_id
  AND user_id = v_customer_id;
  
  IF v_ride IS NULL THEN
    RETURN json_build_object('can_tip', false, 'reason', 'RIDE_NOT_FOUND');
  END IF;
  
  IF v_ride.status != 'completed' THEN
    RETURN json_build_object('can_tip', false, 'reason', 'RIDE_NOT_COMPLETED');
  END IF;
  
  IF v_ride.tip_amount > 0 THEN
    RETURN json_build_object('can_tip', false, 'reason', 'ALREADY_TIPPED', 'tip_amount', v_ride.tip_amount);
  END IF;
  
  IF v_ride.completed_at < NOW() - INTERVAL '24 hours' THEN
    RETURN json_build_object('can_tip', false, 'reason', 'TIP_WINDOW_EXPIRED');
  END IF;
  
  IF v_ride.provider_id IS NULL THEN
    RETURN json_build_object('can_tip', false, 'reason', 'NO_PROVIDER');
  END IF;
  
  -- Get wallet balance
  SELECT balance INTO v_wallet_balance
  FROM wallets
  WHERE user_id = v_customer_id;
  
  RETURN json_build_object(
    'can_tip', true,
    'ride_id', p_ride_id,
    'provider_id', v_ride.provider_id,
    'wallet_balance', COALESCE(v_wallet_balance, 0),
    'completed_at', v_ride.completed_at,
    'expires_at', v_ride.completed_at + INTERVAL '24 hours'
  );
END;
$$;

-- =====================================================
-- 8. GRANT PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION give_tip TO authenticated;
GRANT EXECUTE ON FUNCTION get_provider_tips TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_tip_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION can_give_tip TO authenticated;

-- =====================================================
-- 9. COMMENTS
-- =====================================================

COMMENT ON TABLE tips IS 'Tip records from customers to providers';
COMMENT ON COLUMN ride_requests.tip_amount IS 'Tip amount given by customer (0 if no tip)';
COMMENT ON COLUMN ride_requests.tip_at IS 'Timestamp when tip was given';
COMMENT ON COLUMN ride_requests.tip_message IS 'Optional thank you message from customer';
COMMENT ON FUNCTION give_tip IS 'Customer gives tip to provider (within 24h of completion)';
COMMENT ON FUNCTION get_provider_tips IS 'Provider views their tip history';
COMMENT ON FUNCTION admin_get_tip_analytics IS 'Admin views tip analytics and reports';
COMMENT ON FUNCTION can_give_tip IS 'Check if customer can give tip for a ride';
