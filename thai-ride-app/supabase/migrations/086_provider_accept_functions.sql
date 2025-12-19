-- Migration: 086_provider_accept_functions.sql
-- Feature: F14 - Provider Job Acceptance Functions
-- Description: เพิ่ม functions สำหรับ provider รับงาน delivery และ shopping
-- Fix: Provider ไม่สามารถรับงานได้เพราะไม่มี RPC functions

-- =====================================================
-- ACCEPT DELIVERY REQUEST
-- =====================================================
CREATE OR REPLACE FUNCTION accept_delivery_request(
  p_delivery_id UUID,
  p_provider_id UUID
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  delivery_data JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $
DECLARE
  v_delivery RECORD;
  v_provider RECORD;
  v_result JSONB;
BEGIN
  -- Lock the delivery row for update (prevents race condition)
  SELECT * INTO v_delivery
  FROM public.delivery_requests
  WHERE id = p_delivery_id
  FOR UPDATE NOWAIT;  -- Fail immediately if locked
  
  -- Check if delivery exists
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'ไม่พบคำขอส่งของนี้'::TEXT, NULL::JSONB;
    RETURN;
  END IF;
  
  -- Check if delivery is still pending
  IF v_delivery.status != 'pending' THEN
    RETURN QUERY SELECT false, 'งานนี้ไม่อยู่ในสถานะรอรับแล้ว'::TEXT, NULL::JSONB;
    RETURN;
  END IF;
  
  -- Check if delivery already has a provider
  IF v_delivery.provider_id IS NOT NULL THEN
    RETURN QUERY SELECT false, 'งานนี้ถูกรับไปแล้ว'::TEXT, NULL::JSONB;
    RETURN;
  END IF;
  
  -- Verify provider exists and is available
  SELECT * INTO v_provider
  FROM public.service_providers
  WHERE id = p_provider_id
  AND is_available = true
  AND is_verified = true
  AND status = 'approved';
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'ผู้ให้บริการไม่พร้อมรับงาน'::TEXT, NULL::JSONB;
    RETURN;
  END IF;
  
  -- Check if provider has permission for delivery service
  IF v_provider.allowed_services IS NOT NULL 
     AND jsonb_array_length(v_provider.allowed_services) > 0 
     AND NOT (v_provider.allowed_services ? 'delivery') THEN
    RETURN QUERY SELECT false, 'คุณไม่มีสิทธิ์รับงานประเภทนี้'::TEXT, NULL::JSONB;
    RETURN;
  END IF;
  
  -- Update delivery with provider assignment
  UPDATE public.delivery_requests
  SET 
    provider_id = p_provider_id,
    status = 'matched',
    matched_at = NOW(),
    updated_at = NOW()
  WHERE id = p_delivery_id;
  
  -- Build result with delivery and customer info
  SELECT jsonb_build_object(
    'id', d.id,
    'tracking_id', d.tracking_id,
    'user_id', d.user_id,
    'sender_name', d.sender_name,
    'sender_phone', d.sender_phone,
    'sender_address', d.sender_address,
    'sender_lat', d.sender_lat,
    'sender_lng', d.sender_lng,
    'recipient_name', d.recipient_name,
    'recipient_phone', d.recipient_phone,
    'recipient_address', d.recipient_address,
    'recipient_lat', d.recipient_lat,
    'recipient_lng', d.recipient_lng,
    'package_type', d.package_type,
    'package_description', d.package_description,
    'estimated_fee', d.estimated_fee,
    'status', 'matched',
    'created_at', d.created_at,
    'customer', jsonb_build_object(
      'id', u.id,
      'name', COALESCE(u.name, u.first_name || ' ' || u.last_name, 'ลูกค้า'),
      'phone', COALESCE(u.phone_number, u.phone, ''),
      'avatar_url', u.avatar_url
    )
  ) INTO v_result
  FROM public.delivery_requests d
  LEFT JOIN public.users u ON u.id = d.user_id
  WHERE d.id = p_delivery_id;
  
  RETURN QUERY SELECT true, 'รับงานสำเร็จ'::TEXT, v_result;
  
EXCEPTION
  WHEN lock_not_available THEN
    RETURN QUERY SELECT false, 'งานนี้กำลังถูกรับโดยคนอื่น'::TEXT, NULL::JSONB;
  WHEN OTHERS THEN
    RETURN QUERY SELECT false, SQLERRM::TEXT, NULL::JSONB;
END;
$;

-- =====================================================
-- ACCEPT SHOPPING REQUEST
-- =====================================================
CREATE OR REPLACE FUNCTION accept_shopping_request(
  p_shopping_id UUID,
  p_provider_id UUID
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  shopping_data JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $
DECLARE
  v_shopping RECORD;
  v_provider RECORD;
  v_result JSONB;
BEGIN
  -- Lock the shopping row for update (prevents race condition)
  SELECT * INTO v_shopping
  FROM public.shopping_requests
  WHERE id = p_shopping_id
  FOR UPDATE NOWAIT;  -- Fail immediately if locked
  
  -- Check if shopping exists
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'ไม่พบคำขอซื้อของนี้'::TEXT, NULL::JSONB;
    RETURN;
  END IF;
  
  -- Check if shopping is still pending
  IF v_shopping.status != 'pending' THEN
    RETURN QUERY SELECT false, 'งานนี้ไม่อยู่ในสถานะรอรับแล้ว'::TEXT, NULL::JSONB;
    RETURN;
  END IF;
  
  -- Check if shopping already has a provider
  IF v_shopping.provider_id IS NOT NULL THEN
    RETURN QUERY SELECT false, 'งานนี้ถูกรับไปแล้ว'::TEXT, NULL::JSONB;
    RETURN;
  END IF;
  
  -- Verify provider exists and is available
  SELECT * INTO v_provider
  FROM public.service_providers
  WHERE id = p_provider_id
  AND is_available = true
  AND is_verified = true
  AND status = 'approved';
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'ผู้ให้บริการไม่พร้อมรับงาน'::TEXT, NULL::JSONB;
    RETURN;
  END IF;
  
  -- Check if provider has permission for shopping service
  IF v_provider.allowed_services IS NOT NULL 
     AND jsonb_array_length(v_provider.allowed_services) > 0 
     AND NOT (v_provider.allowed_services ? 'shopping') THEN
    RETURN QUERY SELECT false, 'คุณไม่มีสิทธิ์รับงานประเภทนี้'::TEXT, NULL::JSONB;
    RETURN;
  END IF;
  
  -- Update shopping with provider assignment
  UPDATE public.shopping_requests
  SET 
    provider_id = p_provider_id,
    status = 'matched',
    matched_at = NOW(),
    updated_at = NOW()
  WHERE id = p_shopping_id;
  
  -- Build result with shopping and customer info
  SELECT jsonb_build_object(
    'id', s.id,
    'tracking_id', s.tracking_id,
    'user_id', s.user_id,
    'store_name', s.store_name,
    'store_address', s.store_address,
    'store_lat', s.store_lat,
    'store_lng', s.store_lng,
    'delivery_address', s.delivery_address,
    'delivery_lat', s.delivery_lat,
    'delivery_lng', s.delivery_lng,
    'items', s.items,
    'item_list', s.item_list,
    'budget_limit', s.budget_limit,
    'service_fee', s.service_fee,
    'special_instructions', s.special_instructions,
    'status', 'matched',
    'created_at', s.created_at,
    'customer', jsonb_build_object(
      'id', u.id,
      'name', COALESCE(u.name, u.first_name || ' ' || u.last_name, 'ลูกค้า'),
      'phone', COALESCE(u.phone_number, u.phone, ''),
      'avatar_url', u.avatar_url
    )
  ) INTO v_result
  FROM public.shopping_requests s
  LEFT JOIN public.users u ON u.id = s.user_id
  WHERE s.id = p_shopping_id;
  
  RETURN QUERY SELECT true, 'รับงานสำเร็จ'::TEXT, v_result;
  
EXCEPTION
  WHEN lock_not_available THEN
    RETURN QUERY SELECT false, 'งานนี้กำลังถูกรับโดยคนอื่น'::TEXT, NULL::JSONB;
  WHEN OTHERS THEN
    RETURN QUERY SELECT false, SQLERRM::TEXT, NULL::JSONB;
END;
$;

-- =====================================================
-- UPDATE DELIVERY STATUS
-- =====================================================
CREATE OR REPLACE FUNCTION update_delivery_status(
  p_delivery_id UUID,
  p_provider_id UUID,
  p_new_status TEXT
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $
DECLARE
  v_delivery RECORD;
BEGIN
  -- Get delivery and verify provider
  SELECT * INTO v_delivery
  FROM public.delivery_requests
  WHERE id = p_delivery_id
  AND provider_id = p_provider_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'ไม่พบงานนี้หรือคุณไม่ใช่ผู้รับงาน'::TEXT;
    RETURN;
  END IF;
  
  -- Validate status transition
  IF v_delivery.status = 'completed' OR v_delivery.status = 'cancelled' THEN
    RETURN QUERY SELECT false, 'งานนี้จบแล้ว ไม่สามารถเปลี่ยนสถานะได้'::TEXT;
    RETURN;
  END IF;
  
  -- Update status
  UPDATE public.delivery_requests
  SET 
    status = p_new_status,
    updated_at = NOW(),
    picked_up_at = CASE WHEN p_new_status = 'in_transit' THEN NOW() ELSE picked_up_at END,
    delivered_at = CASE WHEN p_new_status = 'delivered' THEN NOW() ELSE delivered_at END
  WHERE id = p_delivery_id;
  
  RETURN QUERY SELECT true, 'อัพเดทสถานะสำเร็จ'::TEXT;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT false, SQLERRM::TEXT;
END;
$;

-- =====================================================
-- UPDATE SHOPPING STATUS
-- =====================================================
CREATE OR REPLACE FUNCTION update_shopping_status(
  p_shopping_id UUID,
  p_provider_id UUID,
  p_new_status TEXT,
  p_items_cost NUMERIC DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $
DECLARE
  v_shopping RECORD;
BEGIN
  -- Get shopping and verify provider
  SELECT * INTO v_shopping
  FROM public.shopping_requests
  WHERE id = p_shopping_id
  AND provider_id = p_provider_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'ไม่พบงานนี้หรือคุณไม่ใช่ผู้รับงาน'::TEXT;
    RETURN;
  END IF;
  
  -- Validate status transition
  IF v_shopping.status = 'completed' OR v_shopping.status = 'cancelled' THEN
    RETURN QUERY SELECT false, 'งานนี้จบแล้ว ไม่สามารถเปลี่ยนสถานะได้'::TEXT;
    RETURN;
  END IF;
  
  -- Update status
  UPDATE public.shopping_requests
  SET 
    status = p_new_status,
    updated_at = NOW(),
    items_cost = COALESCE(p_items_cost, items_cost),
    shopped_at = CASE WHEN p_new_status = 'delivering' THEN NOW() ELSE shopped_at END,
    delivered_at = CASE WHEN p_new_status = 'completed' THEN NOW() ELSE delivered_at END
  WHERE id = p_shopping_id;
  
  RETURN QUERY SELECT true, 'อัพเดทสถานะสำเร็จ'::TEXT;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT false, SQLERRM::TEXT;
END;
$;

-- =====================================================
-- GET AVAILABLE DELIVERIES FOR PROVIDER
-- =====================================================
CREATE OR REPLACE FUNCTION get_available_deliveries_for_provider(
  p_provider_id UUID,
  p_radius_km NUMERIC DEFAULT 10
)
RETURNS TABLE (
  delivery_id UUID,
  tracking_id VARCHAR,
  user_id UUID,
  sender_name VARCHAR,
  sender_phone VARCHAR,
  sender_address TEXT,
  sender_lat NUMERIC,
  sender_lng NUMERIC,
  recipient_name VARCHAR,
  recipient_address TEXT,
  recipient_lat NUMERIC,
  recipient_lng NUMERIC,
  package_type VARCHAR,
  package_description TEXT,
  estimated_fee NUMERIC,
  distance_km NUMERIC,
  created_at TIMESTAMPTZ,
  customer_name TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $
DECLARE
  v_provider RECORD;
BEGIN
  -- Get provider info
  SELECT * INTO v_provider
  FROM public.service_providers
  WHERE id = p_provider_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Check if provider has permission for delivery
  IF v_provider.allowed_services IS NOT NULL 
     AND jsonb_array_length(v_provider.allowed_services) > 0 
     AND NOT (v_provider.allowed_services ? 'delivery') THEN
    RETURN;
  END IF;
  
  -- Return available deliveries
  RETURN QUERY
  SELECT 
    d.id,
    d.tracking_id,
    d.user_id,
    d.sender_name,
    d.sender_phone,
    d.sender_address,
    d.sender_lat,
    d.sender_lng,
    d.recipient_name,
    d.recipient_address,
    d.recipient_lat,
    d.recipient_lng,
    d.package_type,
    d.package_description,
    d.estimated_fee,
    d.distance_km,
    d.created_at,
    COALESCE(u.name, u.first_name || ' ' || u.last_name, 'ลูกค้า') as customer_name
  FROM public.delivery_requests d
  LEFT JOIN public.users u ON u.id = d.user_id
  WHERE d.status = 'pending'
  AND d.provider_id IS NULL
  ORDER BY d.created_at ASC;
END;
$;

-- =====================================================
-- GET AVAILABLE SHOPPING FOR PROVIDER
-- =====================================================
CREATE OR REPLACE FUNCTION get_available_shopping_for_provider(
  p_provider_id UUID,
  p_radius_km NUMERIC DEFAULT 10
)
RETURNS TABLE (
  shopping_id UUID,
  tracking_id VARCHAR,
  user_id UUID,
  store_name VARCHAR,
  store_address TEXT,
  store_lat NUMERIC,
  store_lng NUMERIC,
  delivery_address TEXT,
  delivery_lat NUMERIC,
  delivery_lng NUMERIC,
  items JSONB,
  item_list TEXT,
  budget_limit NUMERIC,
  service_fee NUMERIC,
  special_instructions TEXT,
  created_at TIMESTAMPTZ,
  customer_name TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $
DECLARE
  v_provider RECORD;
BEGIN
  -- Get provider info
  SELECT * INTO v_provider
  FROM public.service_providers
  WHERE id = p_provider_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Check if provider has permission for shopping
  IF v_provider.allowed_services IS NOT NULL 
     AND jsonb_array_length(v_provider.allowed_services) > 0 
     AND NOT (v_provider.allowed_services ? 'shopping') THEN
    RETURN;
  END IF;
  
  -- Return available shopping requests
  RETURN QUERY
  SELECT 
    s.id,
    s.tracking_id,
    s.user_id,
    s.store_name,
    s.store_address,
    s.store_lat,
    s.store_lng,
    s.delivery_address,
    s.delivery_lat,
    s.delivery_lng,
    s.items,
    s.item_list,
    s.budget_limit,
    s.service_fee,
    s.special_instructions,
    s.created_at,
    COALESCE(u.name, u.first_name || ' ' || u.last_name, 'ลูกค้า') as customer_name
  FROM public.shopping_requests s
  LEFT JOIN public.users u ON u.id = s.user_id
  WHERE s.status = 'pending'
  AND s.provider_id IS NULL
  ORDER BY s.created_at ASC;
END;
$;

-- Comments
COMMENT ON FUNCTION accept_delivery_request IS 'Provider รับงานส่งของ - atomic operation with race condition protection';
COMMENT ON FUNCTION accept_shopping_request IS 'Provider รับงานซื้อของ - atomic operation with race condition protection';
COMMENT ON FUNCTION update_delivery_status IS 'อัพเดทสถานะงานส่งของ';
COMMENT ON FUNCTION update_shopping_status IS 'อัพเดทสถานะงานซื้อของ';
COMMENT ON FUNCTION get_available_deliveries_for_provider IS 'ดึงงานส่งของที่ provider มีสิทธิ์เห็น';
COMMENT ON FUNCTION get_available_shopping_for_provider IS 'ดึงงานซื้อของที่ provider มีสิทธิ์เห็น';
