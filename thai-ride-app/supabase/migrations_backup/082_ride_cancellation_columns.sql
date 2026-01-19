-- =====================================================
-- Migration: 082_ride_cancellation_columns.sql
-- Feature: F02, F53 - Ride Cancellation System
-- Description: Add cancellation columns to ride_requests
-- =====================================================

-- Add cancellation columns to ride_requests
ALTER TABLE public.ride_requests 
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS cancel_reason TEXT,
ADD COLUMN IF NOT EXISTS cancelled_by VARCHAR(20) CHECK (cancelled_by IN ('customer', 'provider', 'admin', 'system')),
ADD COLUMN IF NOT EXISTS cancellation_fee DECIMAL(10,2) DEFAULT 0;

-- Add cancellation columns to delivery_requests
ALTER TABLE public.delivery_requests 
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS cancel_reason TEXT,
ADD COLUMN IF NOT EXISTS cancelled_by VARCHAR(20) CHECK (cancelled_by IN ('customer', 'provider', 'admin', 'system')),
ADD COLUMN IF NOT EXISTS cancellation_fee DECIMAL(10,2) DEFAULT 0;

-- Add cancellation columns to shopping_requests
ALTER TABLE public.shopping_requests 
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS cancel_reason TEXT,
ADD COLUMN IF NOT EXISTS cancelled_by VARCHAR(20) CHECK (cancelled_by IN ('customer', 'provider', 'admin', 'system')),
ADD COLUMN IF NOT EXISTS cancellation_fee DECIMAL(10,2) DEFAULT 0;

-- Add cancellation columns to queue_bookings (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'queue_bookings') THEN
    ALTER TABLE public.queue_bookings 
    ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS cancel_reason TEXT,
    ADD COLUMN IF NOT EXISTS cancelled_by VARCHAR(20);
  END IF;
END $$;

-- Add cancellation columns to moving_requests (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'moving_requests') THEN
    ALTER TABLE public.moving_requests 
    ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS cancel_reason TEXT,
    ADD COLUMN IF NOT EXISTS cancelled_by VARCHAR(20);
  END IF;
END $$;

-- Add cancellation columns to laundry_requests (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'laundry_requests') THEN
    ALTER TABLE public.laundry_requests 
    ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS cancel_reason TEXT,
    ADD COLUMN IF NOT EXISTS cancelled_by VARCHAR(20);
  END IF;
END $$;

-- Create index for cancelled rides (for admin reporting)
CREATE INDEX IF NOT EXISTS idx_ride_requests_cancelled 
ON public.ride_requests(cancelled_at) 
WHERE status = 'cancelled';

CREATE INDEX IF NOT EXISTS idx_delivery_requests_cancelled 
ON public.delivery_requests(cancelled_at) 
WHERE status = 'cancelled';

CREATE INDEX IF NOT EXISTS idx_shopping_requests_cancelled 
ON public.shopping_requests(cancelled_at) 
WHERE status = 'cancelled';

-- =====================================================
-- Function: Get cancellation statistics
-- =====================================================
CREATE OR REPLACE FUNCTION get_cancellation_stats(
  p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  service_type TEXT,
  total_cancelled BIGINT,
  cancelled_by_customer BIGINT,
  cancelled_by_provider BIGINT,
  cancelled_by_admin BIGINT,
  top_reason TEXT
) AS $$
BEGIN
  RETURN QUERY
  
  -- Ride cancellations
  SELECT 
    'ride'::TEXT as service_type,
    COUNT(*)::BIGINT as total_cancelled,
    COUNT(*) FILTER (WHERE cancelled_by = 'customer')::BIGINT,
    COUNT(*) FILTER (WHERE cancelled_by = 'provider')::BIGINT,
    COUNT(*) FILTER (WHERE cancelled_by = 'admin')::BIGINT,
    (SELECT cancel_reason FROM public.ride_requests 
     WHERE status = 'cancelled' 
     AND cancelled_at BETWEEN p_start_date AND p_end_date + INTERVAL '1 day'
     GROUP BY cancel_reason 
     ORDER BY COUNT(*) DESC 
     LIMIT 1) as top_reason
  FROM public.ride_requests
  WHERE status = 'cancelled'
  AND cancelled_at BETWEEN p_start_date AND p_end_date + INTERVAL '1 day'
  
  UNION ALL
  
  -- Delivery cancellations
  SELECT 
    'delivery'::TEXT,
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE cancelled_by = 'customer')::BIGINT,
    COUNT(*) FILTER (WHERE cancelled_by = 'provider')::BIGINT,
    COUNT(*) FILTER (WHERE cancelled_by = 'admin')::BIGINT,
    (SELECT cancel_reason FROM public.delivery_requests 
     WHERE status = 'cancelled' 
     AND cancelled_at BETWEEN p_start_date AND p_end_date + INTERVAL '1 day'
     GROUP BY cancel_reason 
     ORDER BY COUNT(*) DESC 
     LIMIT 1)
  FROM public.delivery_requests
  WHERE status = 'cancelled'
  AND cancelled_at BETWEEN p_start_date AND p_end_date + INTERVAL '1 day'
  
  UNION ALL
  
  -- Shopping cancellations
  SELECT 
    'shopping'::TEXT,
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE cancelled_by = 'customer')::BIGINT,
    COUNT(*) FILTER (WHERE cancelled_by = 'provider')::BIGINT,
    COUNT(*) FILTER (WHERE cancelled_by = 'admin')::BIGINT,
    (SELECT cancel_reason FROM public.shopping_requests 
     WHERE status = 'cancelled' 
     AND cancelled_at BETWEEN p_start_date AND p_end_date + INTERVAL '1 day'
     GROUP BY cancel_reason 
     ORDER BY COUNT(*) DESC 
     LIMIT 1)
  FROM public.shopping_requests
  WHERE status = 'cancelled'
  AND cancelled_at BETWEEN p_start_date AND p_end_date + INTERVAL '1 day';
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_cancellation_stats TO authenticated;

COMMENT ON FUNCTION get_cancellation_stats IS 'Get cancellation statistics for admin dashboard';

-- =====================================================
-- Add cancellation_fee column
-- =====================================================
ALTER TABLE public.ride_requests 
ADD COLUMN IF NOT EXISTS cancellation_fee DECIMAL(10,2) DEFAULT 0;

ALTER TABLE public.delivery_requests 
ADD COLUMN IF NOT EXISTS cancellation_fee DECIMAL(10,2) DEFAULT 0;

ALTER TABLE public.shopping_requests 
ADD COLUMN IF NOT EXISTS cancellation_fee DECIMAL(10,2) DEFAULT 0;

-- =====================================================
-- Function: Calculate cancellation fee
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_cancellation_fee(
  p_status VARCHAR(20),
  p_estimated_fare DECIMAL(10,2),
  p_service_type VARCHAR(20) DEFAULT 'ride'
)
RETURNS DECIMAL(10,2) AS $$
DECLARE
  v_fee DECIMAL(10,2) := 0;
  v_fee_percentage DECIMAL(5,2);
BEGIN
  -- Fee structure based on status
  -- pending: FREE (0%)
  -- matched: 30% of estimated fare
  -- pickup: 50% of estimated fare (driver already on the way)
  -- in_progress: 100% (cannot cancel)
  
  CASE p_status
    WHEN 'pending' THEN
      v_fee_percentage := 0;
    WHEN 'scheduled' THEN
      v_fee_percentage := 0;
    WHEN 'matched' THEN
      v_fee_percentage := 0.30;
    WHEN 'pickup' THEN
      v_fee_percentage := 0.50;
    WHEN 'in_progress' THEN
      -- Cannot cancel during trip, but if forced by admin
      v_fee_percentage := 1.00;
    ELSE
      v_fee_percentage := 0;
  END CASE;
  
  v_fee := ROUND(p_estimated_fare * v_fee_percentage, 2);
  
  -- Minimum fee of 20 baht if there's any fee
  IF v_fee > 0 AND v_fee < 20 THEN
    v_fee := 20;
  END IF;
  
  -- Maximum fee cap at 200 baht for customer protection
  IF v_fee > 200 THEN
    v_fee := 200;
  END IF;
  
  RETURN v_fee;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

GRANT EXECUTE ON FUNCTION calculate_cancellation_fee TO authenticated;

COMMENT ON FUNCTION calculate_cancellation_fee IS 'Calculate cancellation fee based on ride status';

-- =====================================================
-- Function: Cancel ride with fee calculation
-- =====================================================
CREATE OR REPLACE FUNCTION cancel_ride_with_fee(
  p_ride_id UUID,
  p_reason TEXT,
  p_cancelled_by VARCHAR(20)
)
RETURNS TABLE (
  success BOOLEAN,
  cancellation_fee DECIMAL(10,2),
  message TEXT
) AS $$
DECLARE
  v_ride RECORD;
  v_fee DECIMAL(10,2);
  v_provider_user_id UUID;
BEGIN
  -- Get ride details
  SELECT * INTO v_ride
  FROM public.ride_requests
  WHERE id = p_ride_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0::DECIMAL(10,2), 'ไม่พบข้อมูลการเดินทาง'::TEXT;
    RETURN;
  END IF;
  
  -- Check if can be cancelled
  IF v_ride.status IN ('completed', 'cancelled') THEN
    RETURN QUERY SELECT false, 0::DECIMAL(10,2), 'ไม่สามารถยกเลิกได้ สถานะปัจจุบัน: ' || v_ride.status;
    RETURN;
  END IF;
  
  -- Calculate fee
  v_fee := calculate_cancellation_fee(v_ride.status, v_ride.estimated_fare, 'ride');
  
  -- Update ride
  UPDATE public.ride_requests
  SET 
    status = 'cancelled',
    cancelled_at = NOW(),
    cancel_reason = p_reason,
    cancelled_by = p_cancelled_by,
    cancellation_fee = v_fee,
    updated_at = NOW()
  WHERE id = p_ride_id;
  
  -- Send notification to provider if matched
  IF v_ride.provider_id IS NOT NULL THEN
    -- Get provider's user_id
    SELECT user_id INTO v_provider_user_id
    FROM public.service_providers
    WHERE id = v_ride.provider_id;
    
    IF v_provider_user_id IS NOT NULL THEN
      INSERT INTO public.user_notifications (
        user_id,
        title,
        message,
        type,
        data
      ) VALUES (
        v_provider_user_id,
        'การเดินทางถูกยกเลิก',
        'ลูกค้ายกเลิกการเดินทาง: ' || COALESCE(p_reason, 'ไม่ระบุเหตุผล'),
        'ride_cancelled',
        jsonb_build_object(
          'ride_id', p_ride_id,
          'reason', p_reason,
          'cancelled_by', p_cancelled_by,
          'pickup_address', v_ride.pickup_address,
          'destination_address', v_ride.destination_address
        )
      );
    END IF;
  END IF;
  
  RETURN QUERY SELECT true, v_fee, 'ยกเลิกสำเร็จ'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION cancel_ride_with_fee TO authenticated;

COMMENT ON FUNCTION cancel_ride_with_fee IS 'Cancel ride with automatic fee calculation and provider notification';

-- =====================================================
-- Trigger: Auto-notify provider on cancellation
-- =====================================================
CREATE OR REPLACE FUNCTION notify_provider_on_cancellation()
RETURNS TRIGGER AS $$
DECLARE
  v_provider_user_id UUID;
BEGIN
  -- Only trigger when status changes to cancelled
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    -- Check if there's a provider assigned
    IF NEW.provider_id IS NOT NULL THEN
      -- Get provider's user_id
      SELECT user_id INTO v_provider_user_id
      FROM public.service_providers
      WHERE id = NEW.provider_id;
      
      IF v_provider_user_id IS NOT NULL THEN
        -- Insert notification
        INSERT INTO public.user_notifications (
          user_id,
          title,
          message,
          type,
          data
        ) VALUES (
          v_provider_user_id,
          'การเดินทางถูกยกเลิก',
          'ลูกค้ายกเลิกการเดินทาง: ' || COALESCE(NEW.cancel_reason, 'ไม่ระบุเหตุผล'),
          'ride_cancelled',
          jsonb_build_object(
            'ride_id', NEW.id,
            'reason', NEW.cancel_reason,
            'cancelled_by', NEW.cancelled_by,
            'pickup_address', NEW.pickup_address,
            'destination_address', NEW.destination_address,
            'cancellation_fee', NEW.cancellation_fee
          )
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for ride_requests
DROP TRIGGER IF EXISTS trigger_notify_provider_ride_cancelled ON public.ride_requests;
CREATE TRIGGER trigger_notify_provider_ride_cancelled
  AFTER UPDATE ON public.ride_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_provider_on_cancellation();

-- Similar trigger for delivery_requests
CREATE OR REPLACE FUNCTION notify_provider_on_delivery_cancellation()
RETURNS TRIGGER AS $$
DECLARE
  v_provider_user_id UUID;
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    IF NEW.provider_id IS NOT NULL THEN
      SELECT user_id INTO v_provider_user_id
      FROM public.service_providers
      WHERE id = NEW.provider_id;
      
      IF v_provider_user_id IS NOT NULL THEN
        INSERT INTO public.user_notifications (
          user_id, title, message, type, data
        ) VALUES (
          v_provider_user_id,
          'งานส่งของถูกยกเลิก',
          'ลูกค้ายกเลิกงานส่งของ: ' || COALESCE(NEW.cancel_reason, 'ไม่ระบุเหตุผล'),
          'delivery_cancelled',
          jsonb_build_object(
            'delivery_id', NEW.id,
            'reason', NEW.cancel_reason,
            'cancelled_by', NEW.cancelled_by
          )
        );
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_provider_delivery_cancelled ON public.delivery_requests;
CREATE TRIGGER trigger_notify_provider_delivery_cancelled
  AFTER UPDATE ON public.delivery_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_provider_on_delivery_cancellation();

-- =====================================================
-- REFUND SYSTEM
-- Feature: Auto-refund to wallet when cancelling paid orders
-- =====================================================

-- Add refund tracking columns
ALTER TABLE public.ride_requests 
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) DEFAULT 'cash',
ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS refund_status VARCHAR(20) CHECK (refund_status IN ('pending', 'processing', 'completed', 'failed')),
ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.delivery_requests 
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) DEFAULT 'cash',
ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS refund_status VARCHAR(20),
ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.shopping_requests 
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) DEFAULT 'cash',
ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS refund_status VARCHAR(20),
ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMP WITH TIME ZONE;

-- Create refunds table for tracking
CREATE TABLE IF NOT EXISTS public.refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id),
  service_type VARCHAR(20) NOT NULL CHECK (service_type IN ('ride', 'delivery', 'shopping', 'queue', 'moving', 'laundry')),
  service_id UUID NOT NULL,
  original_amount DECIMAL(10,2) NOT NULL,
  cancellation_fee DECIMAL(10,2) DEFAULT 0,
  refund_amount DECIMAL(10,2) NOT NULL,
  refund_method VARCHAR(20) NOT NULL DEFAULT 'wallet' CHECK (refund_method IN ('wallet', 'card', 'bank_transfer')),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  reason TEXT,
  processed_by UUID REFERENCES public.users(id),
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for refunds
CREATE INDEX IF NOT EXISTS idx_refunds_user_id ON public.refunds(user_id);
CREATE INDEX IF NOT EXISTS idx_refunds_service ON public.refunds(service_type, service_id);
CREATE INDEX IF NOT EXISTS idx_refunds_status ON public.refunds(status);

-- Enable RLS
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own refunds" ON public.refunds
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admin can view all refunds" ON public.refunds
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- =====================================================
-- Function: Process refund to wallet
-- =====================================================
CREATE OR REPLACE FUNCTION process_wallet_refund(
  p_user_id UUID,
  p_service_type VARCHAR(20),
  p_service_id UUID,
  p_original_amount DECIMAL(10,2),
  p_cancellation_fee DECIMAL(10,2),
  p_reason TEXT DEFAULT 'ยกเลิกบริการ'
)
RETURNS TABLE (
  success BOOLEAN,
  refund_id UUID,
  refund_amount DECIMAL(10,2),
  message TEXT
) AS $
DECLARE
  v_refund_amount DECIMAL(10,2);
  v_refund_id UUID;
  v_wallet_id UUID;
BEGIN
  -- Calculate refund amount (original - fee)
  v_refund_amount := GREATEST(p_original_amount - p_cancellation_fee, 0);
  
  -- If no refund needed
  IF v_refund_amount <= 0 THEN
    RETURN QUERY SELECT true, NULL::UUID, 0::DECIMAL(10,2), 'ไม่มียอดคืนเงิน'::TEXT;
    RETURN;
  END IF;
  
  -- Get or create user wallet
  SELECT id INTO v_wallet_id FROM public.user_wallets WHERE user_id = p_user_id;
  
  IF v_wallet_id IS NULL THEN
    INSERT INTO public.user_wallets (user_id, balance)
    VALUES (p_user_id, 0)
    RETURNING id INTO v_wallet_id;
  END IF;
  
  -- Create refund record
  INSERT INTO public.refunds (
    user_id, service_type, service_id, 
    original_amount, cancellation_fee, refund_amount,
    refund_method, status, reason
  ) VALUES (
    p_user_id, p_service_type, p_service_id,
    p_original_amount, p_cancellation_fee, v_refund_amount,
    'wallet', 'completed', p_reason
  ) RETURNING id INTO v_refund_id;
  
  -- Add to wallet
  UPDATE public.user_wallets
  SET balance = balance + v_refund_amount,
      updated_at = NOW()
  WHERE id = v_wallet_id;
  
  -- Create wallet transaction
  INSERT INTO public.wallet_transactions (
    wallet_id, type, amount, description, reference_type, reference_id
  ) VALUES (
    v_wallet_id, 'refund', v_refund_amount,
    'คืนเงิน: ' || p_reason || ' (หักค่าธรรมเนียม ฿' || p_cancellation_fee || ')',
    p_service_type, p_service_id
  );
  
  -- Update refund record
  UPDATE public.refunds
  SET status = 'completed', processed_at = NOW(), updated_at = NOW()
  WHERE id = v_refund_id;
  
  -- Send notification to user
  INSERT INTO public.user_notifications (
    user_id, title, message, type, data
  ) VALUES (
    p_user_id,
    'คืนเงินสำเร็จ',
    'คืนเงิน ฿' || v_refund_amount || ' เข้า Wallet แล้ว',
    'refund_completed',
    jsonb_build_object(
      'refund_id', v_refund_id,
      'refund_amount', v_refund_amount,
      'cancellation_fee', p_cancellation_fee,
      'service_type', p_service_type,
      'service_id', p_service_id
    )
  );
  
  RETURN QUERY SELECT true, v_refund_id, v_refund_amount, 'คืนเงินสำเร็จ'::TEXT;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION process_wallet_refund TO authenticated;

COMMENT ON FUNCTION process_wallet_refund IS 'Process refund to user wallet with fee deduction';

-- =====================================================
-- Function: Cancel ride with refund (Enhanced)
-- =====================================================
CREATE OR REPLACE FUNCTION cancel_ride_with_refund(
  p_ride_id UUID,
  p_reason TEXT,
  p_cancelled_by VARCHAR(20)
)
RETURNS TABLE (
  success BOOLEAN,
  cancellation_fee DECIMAL(10,2),
  refund_amount DECIMAL(10,2),
  message TEXT
) AS $
DECLARE
  v_ride RECORD;
  v_fee DECIMAL(10,2);
  v_refund DECIMAL(10,2) := 0;
  v_provider_user_id UUID;
BEGIN
  -- Get ride details
  SELECT * INTO v_ride
  FROM public.ride_requests
  WHERE id = p_ride_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0::DECIMAL(10,2), 0::DECIMAL(10,2), 'ไม่พบข้อมูลการเดินทาง'::TEXT;
    RETURN;
  END IF;
  
  -- Check if can be cancelled
  IF v_ride.status IN ('completed', 'cancelled') THEN
    RETURN QUERY SELECT false, 0::DECIMAL(10,2), 0::DECIMAL(10,2), 'ไม่สามารถยกเลิกได้ สถานะปัจจุบัน: ' || v_ride.status;
    RETURN;
  END IF;
  
  -- Calculate fee
  v_fee := calculate_cancellation_fee(v_ride.status, v_ride.estimated_fare, 'ride');
  
  -- Process refund if paid via wallet
  IF v_ride.payment_method = 'wallet' AND v_ride.paid_amount > 0 THEN
    v_refund := GREATEST(v_ride.paid_amount - v_fee, 0);
    
    IF v_refund > 0 THEN
      PERFORM process_wallet_refund(
        v_ride.user_id,
        'ride',
        p_ride_id,
        v_ride.paid_amount,
        v_fee,
        p_reason
      );
    END IF;
  END IF;
  
  -- Update ride
  UPDATE public.ride_requests
  SET 
    status = 'cancelled',
    cancelled_at = NOW(),
    cancel_reason = p_reason,
    cancelled_by = p_cancelled_by,
    cancellation_fee = v_fee,
    refund_amount = v_refund,
    refund_status = CASE WHEN v_refund > 0 THEN 'completed' ELSE NULL END,
    refunded_at = CASE WHEN v_refund > 0 THEN NOW() ELSE NULL END,
    updated_at = NOW()
  WHERE id = p_ride_id;
  
  -- Send notification to provider if matched
  IF v_ride.provider_id IS NOT NULL THEN
    SELECT user_id INTO v_provider_user_id
    FROM public.service_providers
    WHERE id = v_ride.provider_id;
    
    IF v_provider_user_id IS NOT NULL THEN
      INSERT INTO public.user_notifications (
        user_id, title, message, type, data
      ) VALUES (
        v_provider_user_id,
        'การเดินทางถูกยกเลิก',
        'ลูกค้ายกเลิกการเดินทาง: ' || COALESCE(p_reason, 'ไม่ระบุเหตุผล'),
        'ride_cancelled',
        jsonb_build_object(
          'ride_id', p_ride_id,
          'reason', p_reason,
          'cancelled_by', p_cancelled_by,
          'pickup_address', v_ride.pickup_address,
          'destination_address', v_ride.destination_address
        )
      );
    END IF;
  END IF;
  
  RETURN QUERY SELECT true, v_fee, v_refund, 
    CASE WHEN v_refund > 0 
      THEN 'ยกเลิกสำเร็จ คืนเงิน ฿' || v_refund || ' เข้า Wallet'
      ELSE 'ยกเลิกสำเร็จ'
    END::TEXT;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION cancel_ride_with_refund TO authenticated;

COMMENT ON FUNCTION cancel_ride_with_refund IS 'Cancel ride with automatic fee calculation, refund processing, and provider notification';

-- =====================================================
-- Function: Get refund history for user
-- =====================================================
CREATE OR REPLACE FUNCTION get_user_refunds(
  p_user_id UUID,
  p_limit INT DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  service_type VARCHAR(20),
  service_id UUID,
  original_amount DECIMAL(10,2),
  cancellation_fee DECIMAL(10,2),
  refund_amount DECIMAL(10,2),
  status VARCHAR(20),
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $
BEGIN
  RETURN QUERY
  SELECT 
    r.id, r.service_type, r.service_id,
    r.original_amount, r.cancellation_fee, r.refund_amount,
    r.status, r.reason, r.created_at
  FROM public.refunds r
  WHERE r.user_id = p_user_id
  ORDER BY r.created_at DESC
  LIMIT p_limit;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_user_refunds TO authenticated;

-- =====================================================
-- Admin function: Get refund statistics
-- =====================================================
CREATE OR REPLACE FUNCTION get_refund_stats(
  p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  total_refunds BIGINT,
  total_refund_amount DECIMAL(10,2),
  total_fees_collected DECIMAL(10,2),
  avg_refund_amount DECIMAL(10,2),
  refunds_by_service JSONB
) AS $
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT,
    COALESCE(SUM(refund_amount), 0)::DECIMAL(10,2),
    COALESCE(SUM(cancellation_fee), 0)::DECIMAL(10,2),
    COALESCE(AVG(refund_amount), 0)::DECIMAL(10,2),
    jsonb_object_agg(
      service_type, 
      jsonb_build_object('count', cnt, 'amount', amt)
    )
  FROM (
    SELECT 
      service_type,
      COUNT(*) as cnt,
      SUM(refund_amount) as amt
    FROM public.refunds
    WHERE created_at BETWEEN p_start_date AND p_end_date + INTERVAL '1 day'
    GROUP BY service_type
  ) sub;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_refund_stats TO authenticated;
