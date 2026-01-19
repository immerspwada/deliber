-- =====================================================
-- Migration: 192_fix_admin_payments_complete.sql
-- Description: Complete fix for Admin Payments RPC functions
-- Adds missing payment_method columns and fixes all RPC functions
-- Feature: F08 - Payment Methods, Admin Dashboard
-- =====================================================

-- =====================================================
-- 1. ADD MISSING PAYMENT_METHOD COLUMNS
-- =====================================================

-- Add payment_method to queue_bookings if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'queue_bookings' AND column_name = 'payment_method') THEN
    ALTER TABLE queue_bookings ADD COLUMN payment_method VARCHAR(50) DEFAULT 'cash';
  END IF;
END $$;

-- Add payment_method to moving_requests if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'moving_requests' AND column_name = 'payment_method') THEN
    ALTER TABLE moving_requests ADD COLUMN payment_method VARCHAR(50) DEFAULT 'cash';
  END IF;
END $$;

-- Add payment_method to laundry_requests if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'laundry_requests' AND column_name = 'payment_method') THEN
    ALTER TABLE laundry_requests ADD COLUMN payment_method VARCHAR(50) DEFAULT 'cash';
  END IF;
END $$;

-- =====================================================
-- 2. DROP AND RECREATE ALL PAYMENT FUNCTIONS
-- =====================================================

DROP FUNCTION IF EXISTS get_all_payments_for_admin(TEXT, TEXT, INT, INT);
DROP FUNCTION IF EXISTS count_payments_for_admin(TEXT, TEXT);
DROP FUNCTION IF EXISTS get_payment_stats_for_admin();
DROP FUNCTION IF EXISTS admin_update_payment_status(UUID, TEXT, TEXT);

-- =====================================================
-- 3. GET ALL PAYMENTS FOR ADMIN (FIXED)
-- Correct column names:
-- - ride_requests: final_fare, estimated_fare
-- - delivery_requests: final_fee, estimated_fee
-- - shopping_requests: total_cost, items_cost, service_fee
-- - queue_bookings: final_fee, service_fee
-- - moving_requests: final_price, estimated_price
-- - laundry_requests: final_price, estimated_price
-- =====================================================
CREATE OR REPLACE FUNCTION get_all_payments_for_admin(
  p_status TEXT DEFAULT NULL,
  p_method TEXT DEFAULT NULL,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  tracking_id TEXT,
  service_type TEXT,
  amount NUMERIC,
  payment_method TEXT,
  payment_status TEXT,
  user_id UUID,
  user_name TEXT,
  user_phone TEXT,
  provider_id UUID,
  provider_name TEXT,
  created_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  WITH all_payments AS (
    -- Ride payments (uses final_fare, estimated_fare)
    SELECT 
      r.id,
      COALESCE(r.tracking_id, 'RID-' || LEFT(r.id::TEXT, 8))::TEXT as tracking_id,
      'ride'::TEXT as service_type,
      COALESCE(r.final_fare, r.estimated_fare, 0)::NUMERIC as amount,
      COALESCE(r.payment_method, 'cash')::TEXT as payment_method,
      COALESCE(r.payment_status, 
        CASE WHEN r.status = 'completed' THEN 'paid' ELSE 'pending' END
      )::TEXT as payment_status,
      r.user_id,
      COALESCE(u.first_name || ' ' || u.last_name, '')::TEXT as user_name,
      COALESCE(u.phone_number, '')::TEXT as user_phone,
      r.provider_id,
      COALESCE(pu.first_name || ' ' || pu.last_name, '')::TEXT as provider_name,
      r.created_at,
      r.completed_at
    FROM ride_requests r
    LEFT JOIN users u ON r.user_id = u.id
    LEFT JOIN service_providers sp ON r.provider_id = sp.id
    LEFT JOIN users pu ON sp.user_id = pu.id
    WHERE r.final_fare IS NOT NULL OR r.estimated_fare IS NOT NULL
    
    UNION ALL
    
    -- Delivery payments (uses final_fee, estimated_fee)
    SELECT 
      d.id,
      COALESCE(d.tracking_id, 'DEL-' || LEFT(d.id::TEXT, 8))::TEXT,
      'delivery'::TEXT,
      COALESCE(d.final_fee, d.estimated_fee, 0)::NUMERIC,
      COALESCE(d.payment_method, 'cash')::TEXT,
      COALESCE(d.payment_status, 
        CASE WHEN d.status = 'delivered' THEN 'paid' ELSE 'pending' END
      )::TEXT,
      d.user_id,
      COALESCE(u.first_name || ' ' || u.last_name, '')::TEXT,
      COALESCE(u.phone_number, '')::TEXT,
      d.provider_id,
      COALESCE(pu.first_name || ' ' || pu.last_name, '')::TEXT,
      d.created_at,
      d.delivered_at
    FROM delivery_requests d
    LEFT JOIN users u ON d.user_id = u.id
    LEFT JOIN service_providers sp ON d.provider_id = sp.id
    LEFT JOIN users pu ON sp.user_id = pu.id
    WHERE d.final_fee IS NOT NULL OR d.estimated_fee IS NOT NULL
    
    UNION ALL
    
    -- Shopping payments (uses total_cost, items_cost, service_fee)
    SELECT 
      s.id,
      COALESCE(s.tracking_id, 'SHP-' || LEFT(s.id::TEXT, 8))::TEXT,
      'shopping'::TEXT,
      COALESCE(s.total_cost, s.items_cost + COALESCE(s.service_fee, 0), 0)::NUMERIC,
      COALESCE(s.payment_method, 'cash')::TEXT,
      COALESCE(s.payment_status, 
        CASE WHEN s.status = 'delivered' THEN 'paid' ELSE 'pending' END
      )::TEXT,
      s.user_id,
      COALESCE(u.first_name || ' ' || u.last_name, '')::TEXT,
      COALESCE(u.phone_number, '')::TEXT,
      s.provider_id,
      COALESCE(pu.first_name || ' ' || pu.last_name, '')::TEXT,
      s.created_at,
      s.delivered_at
    FROM shopping_requests s
    LEFT JOIN users u ON s.user_id = u.id
    LEFT JOIN service_providers sp ON s.provider_id = sp.id
    LEFT JOIN users pu ON sp.user_id = pu.id
    WHERE s.total_cost IS NOT NULL OR s.items_cost IS NOT NULL
    
    UNION ALL
    
    -- Queue booking payments (uses final_fee, service_fee)
    SELECT 
      q.id,
      COALESCE(q.tracking_id, 'QUE-' || LEFT(q.id::TEXT, 8))::TEXT,
      'queue'::TEXT,
      COALESCE(q.final_fee, q.service_fee, 0)::NUMERIC,
      COALESCE(q.payment_method, 'cash')::TEXT,
      COALESCE(q.payment_status, 
        CASE WHEN q.status = 'completed' THEN 'paid' ELSE 'pending' END
      )::TEXT,
      q.user_id,
      COALESCE(u.first_name || ' ' || u.last_name, '')::TEXT,
      COALESCE(u.phone_number, '')::TEXT,
      q.provider_id,
      COALESCE(pu.first_name || ' ' || pu.last_name, '')::TEXT,
      q.created_at,
      q.completed_at
    FROM queue_bookings q
    LEFT JOIN users u ON q.user_id = u.id
    LEFT JOIN service_providers sp ON q.provider_id = sp.id
    LEFT JOIN users pu ON sp.user_id = pu.id
    WHERE q.final_fee IS NOT NULL OR q.service_fee IS NOT NULL
    
    UNION ALL
    
    -- Moving payments (uses final_price, estimated_price)
    SELECT 
      m.id,
      COALESCE(m.tracking_id, 'MOV-' || LEFT(m.id::TEXT, 8))::TEXT,
      'moving'::TEXT,
      COALESCE(m.final_price, m.estimated_price, 0)::NUMERIC,
      COALESCE(m.payment_method, 'cash')::TEXT,
      COALESCE(m.payment_status, 
        CASE WHEN m.status = 'completed' THEN 'paid' ELSE 'pending' END
      )::TEXT,
      m.user_id,
      COALESCE(u.first_name || ' ' || u.last_name, '')::TEXT,
      COALESCE(u.phone_number, '')::TEXT,
      m.provider_id,
      COALESCE(pu.first_name || ' ' || pu.last_name, '')::TEXT,
      m.created_at,
      m.completed_at
    FROM moving_requests m
    LEFT JOIN users u ON m.user_id = u.id
    LEFT JOIN service_providers sp ON m.provider_id = sp.id
    LEFT JOIN users pu ON sp.user_id = pu.id
    WHERE m.final_price IS NOT NULL OR m.estimated_price IS NOT NULL
    
    UNION ALL
    
    -- Laundry payments (uses final_price, estimated_price)
    SELECT 
      l.id,
      COALESCE(l.tracking_id, 'LAU-' || LEFT(l.id::TEXT, 8))::TEXT,
      'laundry'::TEXT,
      COALESCE(l.final_price, l.estimated_price, 0)::NUMERIC,
      COALESCE(l.payment_method, 'cash')::TEXT,
      COALESCE(l.payment_status, 
        CASE WHEN l.status = 'delivered' THEN 'paid' ELSE 'pending' END
      )::TEXT,
      l.user_id,
      COALESCE(u.first_name || ' ' || u.last_name, '')::TEXT,
      COALESCE(u.phone_number, '')::TEXT,
      l.provider_id,
      COALESCE(pu.first_name || ' ' || pu.last_name, '')::TEXT,
      l.created_at,
      l.delivered_at
    FROM laundry_requests l
    LEFT JOIN users u ON l.user_id = u.id
    LEFT JOIN service_providers sp ON l.provider_id = sp.id
    LEFT JOIN users pu ON sp.user_id = pu.id
    WHERE l.final_price IS NOT NULL OR l.estimated_price IS NOT NULL
  )
  SELECT * FROM all_payments ap
  WHERE (p_status IS NULL OR ap.payment_status = p_status)
    AND (p_method IS NULL OR ap.payment_method = p_method)
  ORDER BY ap.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. COUNT PAYMENTS FOR ADMIN (FIXED)
-- =====================================================
CREATE OR REPLACE FUNCTION count_payments_for_admin(
  p_status TEXT DEFAULT NULL,
  p_method TEXT DEFAULT NULL
)
RETURNS BIGINT AS $$
DECLARE
  v_count BIGINT := 0;
BEGIN
  WITH all_payments AS (
    SELECT 
      r.id,
      COALESCE(r.payment_status, 
        CASE WHEN r.status = 'completed' THEN 'paid' ELSE 'pending' END
      ) as payment_status,
      COALESCE(r.payment_method, 'cash') as payment_method
    FROM ride_requests r
    WHERE r.final_fare IS NOT NULL OR r.estimated_fare IS NOT NULL
    
    UNION ALL
    
    SELECT 
      d.id,
      COALESCE(d.payment_status, 
        CASE WHEN d.status = 'delivered' THEN 'paid' ELSE 'pending' END
      ),
      COALESCE(d.payment_method, 'cash')
    FROM delivery_requests d
    WHERE d.final_fee IS NOT NULL OR d.estimated_fee IS NOT NULL
    
    UNION ALL
    
    SELECT 
      s.id,
      COALESCE(s.payment_status, 
        CASE WHEN s.status = 'delivered' THEN 'paid' ELSE 'pending' END
      ),
      COALESCE(s.payment_method, 'cash')
    FROM shopping_requests s
    WHERE s.total_cost IS NOT NULL OR s.items_cost IS NOT NULL
    
    UNION ALL
    
    SELECT 
      q.id,
      COALESCE(q.payment_status, 
        CASE WHEN q.status = 'completed' THEN 'paid' ELSE 'pending' END
      ),
      COALESCE(q.payment_method, 'cash')
    FROM queue_bookings q
    WHERE q.final_fee IS NOT NULL OR q.service_fee IS NOT NULL
    
    UNION ALL
    
    SELECT 
      m.id,
      COALESCE(m.payment_status, 
        CASE WHEN m.status = 'completed' THEN 'paid' ELSE 'pending' END
      ),
      COALESCE(m.payment_method, 'cash')
    FROM moving_requests m
    WHERE m.final_price IS NOT NULL OR m.estimated_price IS NOT NULL
    
    UNION ALL
    
    SELECT 
      l.id,
      COALESCE(l.payment_status, 
        CASE WHEN l.status = 'delivered' THEN 'paid' ELSE 'pending' END
      ),
      COALESCE(l.payment_method, 'cash')
    FROM laundry_requests l
    WHERE l.final_price IS NOT NULL OR l.estimated_price IS NOT NULL
  )
  SELECT COUNT(*) INTO v_count
  FROM all_payments ap
  WHERE (p_status IS NULL OR ap.payment_status = p_status)
    AND (p_method IS NULL OR ap.payment_method = p_method);
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. GET PAYMENT STATS FOR ADMIN (FIXED)
-- =====================================================
CREATE OR REPLACE FUNCTION get_payment_stats_for_admin()
RETURNS TABLE (
  total_payments BIGINT,
  total_amount NUMERIC,
  paid_count BIGINT,
  paid_amount NUMERIC,
  pending_count BIGINT,
  pending_amount NUMERIC,
  today_count BIGINT,
  today_amount NUMERIC,
  cash_count BIGINT,
  wallet_count BIGINT,
  card_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH all_payments AS (
    SELECT 
      COALESCE(r.final_fare, r.estimated_fare, 0)::NUMERIC as amount,
      COALESCE(r.payment_status, 
        CASE WHEN r.status = 'completed' THEN 'paid' ELSE 'pending' END
      ) as payment_status,
      COALESCE(r.payment_method, 'cash') as payment_method,
      r.created_at
    FROM ride_requests r
    WHERE r.final_fare IS NOT NULL OR r.estimated_fare IS NOT NULL
    
    UNION ALL
    
    SELECT 
      COALESCE(d.final_fee, d.estimated_fee, 0)::NUMERIC,
      COALESCE(d.payment_status, 
        CASE WHEN d.status = 'delivered' THEN 'paid' ELSE 'pending' END
      ),
      COALESCE(d.payment_method, 'cash'),
      d.created_at
    FROM delivery_requests d
    WHERE d.final_fee IS NOT NULL OR d.estimated_fee IS NOT NULL
    
    UNION ALL
    
    SELECT 
      COALESCE(s.total_cost, s.items_cost + COALESCE(s.service_fee, 0), 0)::NUMERIC,
      COALESCE(s.payment_status, 
        CASE WHEN s.status = 'delivered' THEN 'paid' ELSE 'pending' END
      ),
      COALESCE(s.payment_method, 'cash'),
      s.created_at
    FROM shopping_requests s
    WHERE s.total_cost IS NOT NULL OR s.items_cost IS NOT NULL
    
    UNION ALL
    
    SELECT 
      COALESCE(q.final_fee, q.service_fee, 0)::NUMERIC,
      COALESCE(q.payment_status, 
        CASE WHEN q.status = 'completed' THEN 'paid' ELSE 'pending' END
      ),
      COALESCE(q.payment_method, 'cash'),
      q.created_at
    FROM queue_bookings q
    WHERE q.final_fee IS NOT NULL OR q.service_fee IS NOT NULL
    
    UNION ALL
    
    SELECT 
      COALESCE(m.final_price, m.estimated_price, 0)::NUMERIC,
      COALESCE(m.payment_status, 
        CASE WHEN m.status = 'completed' THEN 'paid' ELSE 'pending' END
      ),
      COALESCE(m.payment_method, 'cash'),
      m.created_at
    FROM moving_requests m
    WHERE m.final_price IS NOT NULL OR m.estimated_price IS NOT NULL
    
    UNION ALL
    
    SELECT 
      COALESCE(l.final_price, l.estimated_price, 0)::NUMERIC,
      COALESCE(l.payment_status, 
        CASE WHEN l.status = 'delivered' THEN 'paid' ELSE 'pending' END
      ),
      COALESCE(l.payment_method, 'cash'),
      l.created_at
    FROM laundry_requests l
    WHERE l.final_price IS NOT NULL OR l.estimated_price IS NOT NULL
  )
  SELECT 
    COUNT(*)::BIGINT as total_payments,
    COALESCE(SUM(ap.amount), 0)::NUMERIC as total_amount,
    COUNT(*) FILTER (WHERE ap.payment_status = 'paid')::BIGINT as paid_count,
    COALESCE(SUM(ap.amount) FILTER (WHERE ap.payment_status = 'paid'), 0)::NUMERIC as paid_amount,
    COUNT(*) FILTER (WHERE ap.payment_status = 'pending')::BIGINT as pending_count,
    COALESCE(SUM(ap.amount) FILTER (WHERE ap.payment_status = 'pending'), 0)::NUMERIC as pending_amount,
    COUNT(*) FILTER (WHERE ap.created_at >= CURRENT_DATE)::BIGINT as today_count,
    COALESCE(SUM(ap.amount) FILTER (WHERE ap.created_at >= CURRENT_DATE), 0)::NUMERIC as today_amount,
    COUNT(*) FILTER (WHERE ap.payment_method = 'cash')::BIGINT as cash_count,
    COUNT(*) FILTER (WHERE ap.payment_method = 'wallet')::BIGINT as wallet_count,
    COUNT(*) FILTER (WHERE ap.payment_method IN ('card', 'credit_card'))::BIGINT as card_count
  FROM all_payments ap;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. UPDATE PAYMENT STATUS (FIXED)
-- =====================================================
CREATE OR REPLACE FUNCTION admin_update_payment_status(
  p_order_id UUID,
  p_service_type TEXT,
  p_new_status TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_table_name TEXT;
BEGIN
  v_table_name := CASE p_service_type
    WHEN 'ride' THEN 'ride_requests'
    WHEN 'delivery' THEN 'delivery_requests'
    WHEN 'shopping' THEN 'shopping_requests'
    WHEN 'queue' THEN 'queue_bookings'
    WHEN 'moving' THEN 'moving_requests'
    WHEN 'laundry' THEN 'laundry_requests'
    ELSE NULL
  END;
  
  IF v_table_name IS NULL THEN
    RAISE EXCEPTION 'Invalid service type: %', p_service_type;
  END IF;
  
  EXECUTE format('UPDATE %I SET payment_status = $1 WHERE id = $2', v_table_name)
  USING p_new_status, p_order_id;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error updating payment status: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. GRANT PERMISSIONS
-- =====================================================
GRANT EXECUTE ON FUNCTION get_all_payments_for_admin(TEXT, TEXT, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION count_payments_for_admin(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_payment_stats_for_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION admin_update_payment_status(UUID, TEXT, TEXT) TO authenticated;
