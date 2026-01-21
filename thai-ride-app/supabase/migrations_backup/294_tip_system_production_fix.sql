-- =====================================================
-- Migration: 294_tip_system_production_fix.sql
-- Description: Fix Tip System for Production (uses user_wallets)
-- 
-- Role Impact:
-- 👤 Customer: ให้ทิปหลังจบงาน (ภายใน 24 ชม.)
-- 🚗 Provider: รับทิปและดูประวัติทิป
-- 👑 Admin: ดูรายงานทิปทั้งหมด
-- 
-- FIXES:
-- 1. Uses user_wallets instead of wallets (production table)
-- 2. Adds missing tip columns to ride_requests
-- 3. Creates tips table with proper RLS
-- 4. Creates tip functions with dual-role support
-- =====================================================

-- =====================================================
-- 1. ADD TIP COLUMNS TO ride_requests (IF NOT EXISTS)
-- =====================================================

DO $$ 
BEGIN
  -- Add tip_amount column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ride_requests' AND column_name = 'tip_amount'
  ) THEN
    ALTER TABLE public.ride_requests ADD COLUMN tip_amount DECIMAL(10,2) DEFAULT 0;
  END IF;
  
  -- Add tip_at timestamp
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ride_requests' AND column_name = 'tip_at'
  ) THEN
    ALTER TABLE public.ride_requests ADD COLUMN tip_at TIMESTAMPTZ;
  END IF;
  
  -- Add tip_message
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ride_requests' AND column_name = 'tip_message'
  ) THEN
    ALTER TABLE public.ride_requests ADD COLUMN tip_message TEXT;
  END IF;
END $$;

-- Add index for tip queries
CREATE INDEX IF NOT EXISTS idx_ride_requests_tip 
ON public.ride_requests(provider_id, tip_amount) 
WHERE tip_amount > 0;

-- =====================================================
-- 2. CREATE tips TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID NOT NULL REFERENCES public.ride_requests(id) ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS idx_tips_customer ON public.tips(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tips_provider ON public.tips(provider_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tips_status ON public.tips(status) WHERE status = 'pending';

-- =====================================================
-- 3. RLS POLICIES FOR tips TABLE
-- =====================================================

ALTER TABLE public.tips ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "customer_view_own_tips" ON public.tips;
DROP POLICY IF EXISTS "customer_create_tip" ON public.tips;
DROP POLICY IF EXISTS "provider_view_received_tips" ON public.tips;
DROP POLICY IF EXISTS "admin_full_tips_access" ON public.tips;

-- Customer: Can view their own tips
CREATE POLICY "customer_view_own_tips" ON public.tips
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = customer_id);

-- Customer: Can create tips
CREATE POLICY "customer_create_tip" ON public.tips
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = customer_id);

-- Provider: Can view tips they received (via providers_v2.user_id - DUAL ROLE)
CREATE POLICY "provider_view_received_tips" ON public.tips
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.providers_v2
      WHERE providers_v2.id = tips.provider_id
      AND providers_v2.user_id = (SELECT auth.uid())
    )
  );

-- Admin: Full access
CREATE POLICY "admin_full_tips_access" ON public.tips
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- =====================================================
-- 4. FUNCTION: can_give_tip (Check if customer can tip)
-- =====================================================

CREATE OR REPLACE FUNCTION public.can_give_tip(p_ride_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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
  FROM public.ride_requests
  WHERE id = p_ride_id
  AND user_id = v_customer_id;
  
  IF v_ride IS NULL THEN
    RETURN json_build_object('can_tip', false, 'reason', 'RIDE_NOT_FOUND');
  END IF;
  
  IF v_ride.status != 'completed' THEN
    RETURN json_build_object('can_tip', false, 'reason', 'RIDE_NOT_COMPLETED');
  END IF;
  
  IF v_ride.tip_amount IS NOT NULL AND v_ride.tip_amount > 0 THEN
    RETURN json_build_object('can_tip', false, 'reason', 'ALREADY_TIPPED', 'tip_amount', v_ride.tip_amount);
  END IF;
  
  IF v_ride.completed_at < NOW() - INTERVAL '24 hours' THEN
    RETURN json_build_object('can_tip', false, 'reason', 'TIP_WINDOW_EXPIRED');
  END IF;
  
  IF v_ride.provider_id IS NULL THEN
    RETURN json_build_object('can_tip', false, 'reason', 'NO_PROVIDER');
  END IF;
  
  -- Get wallet balance from user_wallets (PRODUCTION TABLE)
  SELECT balance INTO v_wallet_balance
  FROM public.user_wallets
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
-- 5. FUNCTION: give_tip (Customer gives tip)
-- =====================================================

CREATE OR REPLACE FUNCTION public.give_tip(
  p_ride_id UUID,
  p_amount DECIMAL,
  p_message TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_ride RECORD;
  v_customer_id UUID;
  v_provider_id UUID;
  v_provider_user_id UUID;
  v_wallet_balance DECIMAL;
  v_tip_id UUID;
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
  FROM public.ride_requests
  WHERE id = p_ride_id
  AND user_id = v_customer_id
  AND status = 'completed';
  
  IF v_ride IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'RIDE_NOT_FOUND');
  END IF;
  
  -- Check if already tipped
  IF v_ride.tip_amount IS NOT NULL AND v_ride.tip_amount > 0 THEN
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
  
  -- Get provider's user_id for wallet credit (DUAL ROLE SYSTEM)
  SELECT user_id INTO v_provider_user_id
  FROM public.providers_v2
  WHERE id = v_provider_id;
  
  IF v_provider_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'PROVIDER_NOT_FOUND');
  END IF;
  
  -- Check customer wallet balance (user_wallets - PRODUCTION TABLE)
  SELECT balance INTO v_wallet_balance
  FROM public.user_wallets
  WHERE user_id = v_customer_id;
  
  IF v_wallet_balance IS NULL OR v_wallet_balance < p_amount THEN
    RETURN json_build_object('success', false, 'error', 'INSUFFICIENT_BALANCE');
  END IF;
  
  -- Start transaction
  -- 1. Deduct from customer wallet
  UPDATE public.user_wallets
  SET balance = balance - p_amount,
      total_spent = COALESCE(total_spent, 0) + p_amount,
      updated_at = NOW()
  WHERE user_id = v_customer_id;
  
  -- 2. Add to provider wallet (create if not exists)
  INSERT INTO public.user_wallets (user_id, balance, total_earned, currency)
  VALUES (v_provider_user_id, p_amount, p_amount, 'THB')
  ON CONFLICT (user_id) DO UPDATE
  SET balance = public.user_wallets.balance + p_amount,
      total_earned = COALESCE(public.user_wallets.total_earned, 0) + p_amount,
      updated_at = NOW();
  
  -- 3. Update providers_v2 total_earnings
  UPDATE public.providers_v2
  SET total_earnings = COALESCE(total_earnings, 0) + p_amount,
      updated_at = NOW()
  WHERE id = v_provider_id;
  
  -- 4. Update ride_requests
  UPDATE public.ride_requests
  SET tip_amount = p_amount,
      tip_at = NOW(),
      tip_message = p_message
  WHERE id = p_ride_id;
  
  -- 5. Create tip record
  INSERT INTO public.tips (ride_id, customer_id, provider_id, amount, message, status, processed_at)
  VALUES (p_ride_id, v_customer_id, v_provider_id, p_amount, p_message, 'completed', NOW())
  RETURNING id INTO v_tip_id;
  
  -- 6. Create wallet transactions for customer
  INSERT INTO public.wallet_transactions (wallet_id, type, amount, description, reference_id, reference_type)
  SELECT w.id, 'tip_sent', -p_amount, 'ทิปให้คนขับ', p_ride_id::TEXT, 'tip'
  FROM public.user_wallets w WHERE w.user_id = v_customer_id;
  
  -- 7. Create wallet transactions for provider
  INSERT INTO public.wallet_transactions (wallet_id, type, amount, description, reference_id, reference_type)
  SELECT w.id, 'tip_received', p_amount, 'ได้รับทิปจากลูกค้า', p_ride_id::TEXT, 'tip'
  FROM public.user_wallets w WHERE w.user_id = v_provider_user_id;
  
  -- 8. Create notification for provider (if notifications table exists)
  BEGIN
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      v_provider_user_id, 
      'tip_received', 
      'ได้รับทิป! 🎉', 
      'คุณได้รับทิป ฿' || p_amount::TEXT || ' จากลูกค้า',
      json_build_object('ride_id', p_ride_id, 'amount', p_amount, 'message', p_message)
    );
  EXCEPTION WHEN OTHERS THEN
    -- Ignore if notifications table doesn't exist
    NULL;
  END;
  
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
-- 6. FUNCTION: get_provider_tips (Provider views tips)
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_provider_tips(
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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
  
  -- Get provider_id from providers_v2 (DUAL ROLE)
  SELECT id INTO v_provider_id
  FROM public.providers_v2
  WHERE user_id = v_user_id;
  
  IF v_provider_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'NOT_A_PROVIDER');
  END IF;
  
  -- Get tips with customer info
  SELECT json_agg(tip_data)
  INTO v_tips
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
    FROM public.tips t
    JOIN public.ride_requests rr ON rr.id = t.ride_id
    LEFT JOIN public.users u ON u.id = t.customer_id
    WHERE t.provider_id = v_provider_id
    AND t.status = 'completed'
    ORDER BY t.created_at DESC
    LIMIT p_limit OFFSET p_offset
  ) tip_data;
  
  -- Get total stats
  SELECT COUNT(*), COALESCE(SUM(amount), 0)
  INTO v_tip_count, v_total_tips
  FROM public.tips
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
-- 7. GRANT PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION public.give_tip TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_provider_tips TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_give_tip TO authenticated;

-- =====================================================
-- 8. COMMENTS
-- =====================================================

COMMENT ON TABLE public.tips IS 'Tip records from customers to providers';
COMMENT ON COLUMN public.ride_requests.tip_amount IS 'Tip amount given by customer (0 if no tip)';
COMMENT ON COLUMN public.ride_requests.tip_at IS 'Timestamp when tip was given';
COMMENT ON COLUMN public.ride_requests.tip_message IS 'Optional thank you message from customer';
COMMENT ON FUNCTION public.give_tip IS 'Customer gives tip to provider (within 24h of completion)';
COMMENT ON FUNCTION public.get_provider_tips IS 'Provider views their tip history';
COMMENT ON FUNCTION public.can_give_tip IS 'Check if customer can give tip for a ride';
