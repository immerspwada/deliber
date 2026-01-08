-- ============================================
-- Migration: 206_provider_production_optimizations.sql
-- Feature: F14 - Provider Dashboard Production Optimizations
-- Date: 2026-01-01
-- ============================================
-- Description: Production optimizations for Provider system
-- - Add indexes for common queries
-- - Add helper functions for provider operations
-- - Optimize RLS policies
-- ============================================

-- 1. Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_ride_requests_status_provider 
  ON ride_requests(status, provider_id) 
  WHERE status IN ('pending', 'matched', 'in_progress');

CREATE INDEX IF NOT EXISTS idx_delivery_requests_status_provider 
  ON delivery_requests(status, provider_id) 
  WHERE status IN ('pending', 'matched', 'pickup', 'in_transit');

CREATE INDEX IF NOT EXISTS idx_shopping_requests_status_provider 
  ON shopping_requests(status, provider_id) 
  WHERE status IN ('pending', 'matched', 'shopping', 'delivering');

CREATE INDEX IF NOT EXISTS idx_service_providers_user_status 
  ON service_providers(user_id, status) 
  WHERE status IN ('approved', 'active');

CREATE INDEX IF NOT EXISTS idx_service_providers_available 
  ON service_providers(is_available, status) 
  WHERE is_available = true AND status IN ('approved', 'active');

-- 2. Create optimized function to get provider's active job count
CREATE OR REPLACE FUNCTION get_provider_active_job_count(p_provider_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  -- Count active rides
  SELECT COUNT(*) INTO v_count
  FROM ride_requests
  WHERE provider_id = p_provider_id
    AND status IN ('matched', 'arriving', 'arrived', 'pickup', 'picked_up', 'in_progress');
  
  -- Add active deliveries
  v_count := v_count + (
    SELECT COUNT(*)
    FROM delivery_requests
    WHERE provider_id = p_provider_id
      AND status IN ('matched', 'pickup', 'in_transit')
  );
  
  -- Add active shopping
  v_count := v_count + (
    SELECT COUNT(*)
    FROM shopping_requests
    WHERE provider_id = p_provider_id
      AND status IN ('matched', 'shopping', 'delivering')
  );
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create function to safely toggle provider online status
CREATE OR REPLACE FUNCTION safe_toggle_provider_online(
  p_user_id UUID,
  p_is_online BOOLEAN,
  p_lat DOUBLE PRECISION DEFAULT NULL,
  p_lng DOUBLE PRECISION DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_provider_id UUID;
  v_provider_status TEXT;
  v_active_jobs INTEGER;
BEGIN
  -- Get provider info
  SELECT id, status INTO v_provider_id, v_provider_status
  FROM service_providers
  WHERE user_id = p_user_id
  LIMIT 1;
  
  IF v_provider_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'ไม่พบข้อมูลผู้ให้บริการ'
    );
  END IF;
  
  -- Check if provider is approved
  IF v_provider_status NOT IN ('approved', 'active') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'บัญชียังไม่ได้รับการอนุมัติ'
    );
  END IF;
  
  -- If going offline, check for active jobs
  IF NOT p_is_online THEN
    v_active_jobs := get_provider_active_job_count(v_provider_id);
    IF v_active_jobs > 0 THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'ไม่สามารถออฟไลน์ได้ เนื่องจากมีงานที่กำลังทำอยู่',
        'active_jobs', v_active_jobs
      );
    END IF;
  END IF;
  
  -- Update provider status
  UPDATE service_providers
  SET 
    is_available = p_is_online,
    current_lat = COALESCE(p_lat, current_lat),
    current_lng = COALESCE(p_lng, current_lng),
    updated_at = NOW()
  WHERE id = v_provider_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'provider_id', v_provider_id,
    'is_online', p_is_online
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create function to get available jobs for provider with distance calculation
CREATE OR REPLACE FUNCTION get_available_jobs_for_provider(
  p_provider_id UUID,
  p_lat DOUBLE PRECISION DEFAULT NULL,
  p_lng DOUBLE PRECISION DEFAULT NULL,
  p_radius_km DOUBLE PRECISION DEFAULT 15,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  job_id UUID,
  job_type TEXT,
  tracking_id TEXT,
  pickup_address TEXT,
  destination_address TEXT,
  estimated_fare DECIMAL,
  distance_km DOUBLE PRECISION,
  customer_name TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  -- Rides
  SELECT 
    r.id AS job_id,
    'ride'::TEXT AS job_type,
    r.tracking_id,
    r.pickup_address,
    r.destination_address,
    r.estimated_fare,
    CASE 
      WHEN p_lat IS NOT NULL AND p_lng IS NOT NULL THEN
        6371 * acos(
          cos(radians(p_lat)) * cos(radians(r.pickup_lat)) *
          cos(radians(r.pickup_lng) - radians(p_lng)) +
          sin(radians(p_lat)) * sin(radians(r.pickup_lat))
        )
      ELSE NULL
    END AS distance_km,
    COALESCE(u.first_name || ' ' || u.last_name, 'ผู้โดยสาร') AS customer_name,
    r.created_at
  FROM ride_requests r
  LEFT JOIN users u ON r.user_id = u.id
  WHERE r.status = 'pending'
    AND r.provider_id IS NULL
    AND (
      p_lat IS NULL OR p_lng IS NULL OR
      6371 * acos(
        cos(radians(p_lat)) * cos(radians(r.pickup_lat)) *
        cos(radians(r.pickup_lng) - radians(p_lng)) +
        sin(radians(p_lat)) * sin(radians(r.pickup_lat))
      ) <= p_radius_km
    )
  
  UNION ALL
  
  -- Deliveries
  SELECT 
    d.id AS job_id,
    'delivery'::TEXT AS job_type,
    d.tracking_id,
    d.sender_address AS pickup_address,
    d.recipient_address AS destination_address,
    d.estimated_fee AS estimated_fare,
    CASE 
      WHEN p_lat IS NOT NULL AND p_lng IS NOT NULL THEN
        6371 * acos(
          cos(radians(p_lat)) * cos(radians(d.sender_lat)) *
          cos(radians(d.sender_lng) - radians(p_lng)) +
          sin(radians(p_lat)) * sin(radians(d.sender_lat))
        )
      ELSE NULL
    END AS distance_km,
    COALESCE(u.first_name || ' ' || u.last_name, 'ลูกค้า') AS customer_name,
    d.created_at
  FROM delivery_requests d
  LEFT JOIN users u ON d.user_id = u.id
  WHERE d.status = 'pending'
    AND d.provider_id IS NULL
    AND (
      p_lat IS NULL OR p_lng IS NULL OR
      6371 * acos(
        cos(radians(p_lat)) * cos(radians(d.sender_lat)) *
        cos(radians(d.sender_lng) - radians(p_lng)) +
        sin(radians(p_lat)) * sin(radians(d.sender_lat))
      ) <= p_radius_km
    )
  
  UNION ALL
  
  -- Shopping
  SELECT 
    s.id AS job_id,
    'shopping'::TEXT AS job_type,
    s.tracking_id,
    COALESCE(s.store_address, s.store_name, 'ร้านค้า') AS pickup_address,
    s.delivery_address AS destination_address,
    s.service_fee AS estimated_fare,
    CASE 
      WHEN p_lat IS NOT NULL AND p_lng IS NOT NULL AND s.store_lat IS NOT NULL THEN
        6371 * acos(
          cos(radians(p_lat)) * cos(radians(s.store_lat)) *
          cos(radians(s.store_lng) - radians(p_lng)) +
          sin(radians(p_lat)) * sin(radians(s.store_lat))
        )
      ELSE NULL
    END AS distance_km,
    COALESCE(u.first_name || ' ' || u.last_name, 'ลูกค้า') AS customer_name,
    s.created_at
  FROM shopping_requests s
  LEFT JOIN users u ON s.user_id = u.id
  WHERE s.status = 'pending'
    AND s.provider_id IS NULL
    AND (
      p_lat IS NULL OR p_lng IS NULL OR s.store_lat IS NULL OR
      6371 * acos(
        cos(radians(p_lat)) * cos(radians(s.store_lat)) *
        cos(radians(s.store_lng) - radians(p_lng)) +
        sin(radians(p_lat)) * sin(radians(s.store_lat))
      ) <= p_radius_km
    )
  
  ORDER BY created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Grant execute permissions
GRANT EXECUTE ON FUNCTION get_provider_active_job_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION safe_toggle_provider_online(UUID, BOOLEAN, DOUBLE PRECISION, DOUBLE PRECISION) TO authenticated;
GRANT EXECUTE ON FUNCTION get_available_jobs_for_provider(UUID, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, INTEGER) TO authenticated;

-- ============================================
-- END OF MIGRATION
-- ============================================
