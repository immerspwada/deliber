-- =====================================================
-- Migration: 306_admin_order_reassignment_system.sql
-- Description: Admin Order Reassignment System with Audit Trail
-- Author: AI Assistant
-- Date: 2026-01-18
-- =====================================================

BEGIN;

-- =====================================================
-- 1. Create order_reassignments audit table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.order_reassignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL,
  order_type VARCHAR(20) NOT NULL CHECK (order_type IN ('ride', 'delivery', 'shopping', 'queue', 'moving', 'laundry')),
  old_provider_id UUID,
  new_provider_id UUID NOT NULL,
  reassigned_by UUID NOT NULL REFERENCES auth.users(id),
  reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for performance
CREATE INDEX idx_order_reassignments_order ON public.order_reassignments(order_id, order_type);
CREATE INDEX idx_order_reassignments_provider ON public.order_reassignments(new_provider_id);
CREATE INDEX idx_order_reassignments_admin ON public.order_reassignments(reassigned_by, created_at DESC);

-- RLS policies
ALTER TABLE public.order_reassignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_full_access_reassignments" ON public.order_reassignments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- =====================================================
-- 2. Create reassign_order function
-- =====================================================
CREATE OR REPLACE FUNCTION public.reassign_order(
  p_order_id UUID,
  p_order_type VARCHAR(20),
  p_new_provider_id UUID,
  p_reason TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
  v_admin_role TEXT;
  v_old_provider_id UUID;
  v_order_status TEXT;
  v_table_name TEXT;
  v_provider_exists BOOLEAN;
  v_provider_status TEXT;
  v_result JSON;
BEGIN
  -- Get admin user ID and verify role
  v_admin_id := auth.uid();
  
  SELECT role INTO v_admin_role
  FROM public.profiles
  WHERE id = v_admin_id;
  
  IF v_admin_role != 'admin' THEN
    RAISE EXCEPTION 'Only admins can reassign orders';
  END IF;
  
  -- Validate order type
  IF p_order_type NOT IN ('ride', 'delivery', 'shopping', 'queue', 'moving', 'laundry') THEN
    RAISE EXCEPTION 'Invalid order type: %', p_order_type;
  END IF;
  
  -- Determine table name
  v_table_name := CASE p_order_type
    WHEN 'ride' THEN 'ride_requests'
    WHEN 'delivery' THEN 'delivery_requests'
    WHEN 'shopping' THEN 'shopping_requests'
    WHEN 'queue' THEN 'queue_requests'
    WHEN 'moving' THEN 'moving_requests'
    WHEN 'laundry' THEN 'laundry_requests'
  END;
  
  -- Verify new provider exists and is approved
  SELECT 
    EXISTS(SELECT 1 FROM public.providers_v2 WHERE id = p_new_provider_id),
    (SELECT status FROM public.providers_v2 WHERE id = p_new_provider_id)
  INTO v_provider_exists, v_provider_status;
  
  IF NOT v_provider_exists THEN
    RAISE EXCEPTION 'Provider not found: %', p_new_provider_id;
  END IF;
  
  IF v_provider_status != 'approved' THEN
    RAISE EXCEPTION 'Provider is not approved. Status: %', v_provider_status;
  END IF;
  
  -- Get current provider and status using dynamic SQL
  EXECUTE format(
    'SELECT provider_id, status FROM %I WHERE id = $1',
    v_table_name
  ) USING p_order_id
  INTO v_old_provider_id, v_order_status;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found: % in table %', p_order_id, v_table_name;
  END IF;
  
  -- Validate order status (can't reassign completed or cancelled orders)
  IF v_order_status IN ('completed', 'cancelled', 'delivered') THEN
    RAISE EXCEPTION 'Cannot reassign % orders. Current status: %', v_order_status, v_order_status;
  END IF;
  
  -- Check if already assigned to the same provider
  IF v_old_provider_id = p_new_provider_id THEN
    RAISE EXCEPTION 'Order is already assigned to this provider';
  END IF;
  
  -- Update the order with new provider
  EXECUTE format(
    'UPDATE %I SET provider_id = $1, updated_at = NOW() WHERE id = $2',
    v_table_name
  ) USING p_new_provider_id, p_order_id;
  
  -- Record the reassignment in audit table
  INSERT INTO public.order_reassignments (
    order_id,
    order_type,
    old_provider_id,
    new_provider_id,
    reassigned_by,
    reason,
    notes
  ) VALUES (
    p_order_id,
    p_order_type,
    v_old_provider_id,
    p_new_provider_id,
    v_admin_id,
    p_reason,
    p_notes
  );
  
  -- Return success result
  v_result := json_build_object(
    'success', true,
    'order_id', p_order_id,
    'order_type', p_order_type,
    'old_provider_id', v_old_provider_id,
    'new_provider_id', p_new_provider_id,
    'reassigned_by', v_admin_id,
    'reassigned_at', NOW()
  );
  
  RETURN v_result;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Return error result
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'error_detail', SQLSTATE
    );
END;
$$;

-- Grant execute permission to authenticated users (function checks admin role internally)
GRANT EXECUTE ON FUNCTION public.reassign_order TO authenticated;

-- =====================================================
-- 3. Create get_reassignment_history function
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_reassignment_history(
  p_order_id UUID DEFAULT NULL,
  p_provider_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  order_id UUID,
  order_type VARCHAR(20),
  old_provider_id UUID,
  old_provider_name TEXT,
  new_provider_id UUID,
  new_provider_name TEXT,
  reassigned_by UUID,
  admin_name TEXT,
  reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_role TEXT;
BEGIN
  -- Verify admin role
  SELECT role INTO v_admin_role
  FROM public.profiles
  WHERE id = auth.uid();
  
  IF v_admin_role != 'admin' THEN
    RAISE EXCEPTION 'Only admins can view reassignment history';
  END IF;
  
  RETURN QUERY
  SELECT 
    r.id,
    r.order_id,
    r.order_type,
    r.old_provider_id,
    COALESCE(old_p.full_name, old_p.first_name || ' ' || old_p.last_name) as old_provider_name,
    r.new_provider_id,
    COALESCE(new_p.full_name, new_p.first_name || ' ' || new_p.last_name) as new_provider_name,
    r.reassigned_by,
    COALESCE(admin.full_name, admin.first_name || ' ' || admin.last_name) as admin_name,
    r.reason,
    r.notes,
    r.created_at
  FROM public.order_reassignments r
  LEFT JOIN public.providers_v2 old_p ON old_p.id = r.old_provider_id
  LEFT JOIN public.providers_v2 new_p ON new_p.id = r.new_provider_id
  LEFT JOIN public.profiles admin ON admin.id = r.reassigned_by
  WHERE 
    (p_order_id IS NULL OR r.order_id = p_order_id)
    AND (p_provider_id IS NULL OR r.new_provider_id = p_provider_id OR r.old_provider_id = p_provider_id)
  ORDER BY r.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_reassignment_history TO authenticated;

-- =====================================================
-- 4. Create get_available_providers function
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_available_providers(
  p_service_type VARCHAR(20) DEFAULT NULL,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  phone TEXT,
  vehicle_type TEXT,
  vehicle_plate TEXT,
  rating DECIMAL(3,2),
  total_jobs INTEGER,
  status VARCHAR(20),
  is_online BOOLEAN,
  current_location JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_role TEXT;
BEGIN
  -- Verify admin role
  SELECT role INTO v_admin_role
  FROM public.profiles
  WHERE id = auth.uid();
  
  IF v_admin_role != 'admin' THEN
    RAISE EXCEPTION 'Only admins can view available providers';
  END IF;
  
  RETURN QUERY
  SELECT 
    p.id,
    COALESCE(p.full_name, p.first_name || ' ' || p.last_name) as full_name,
    p.phone,
    p.vehicle_type,
    p.vehicle_plate,
    p.rating,
    p.total_jobs,
    p.status,
    p.is_online,
    jsonb_build_object(
      'lat', p.current_lat,
      'lng', p.current_lng,
      'updated_at', p.location_updated_at
    ) as current_location
  FROM public.providers_v2 p
  WHERE 
    p.status = 'approved'
    AND (p_service_type IS NULL OR p.service_type = p_service_type)
  ORDER BY 
    p.is_online DESC,
    p.rating DESC NULLS LAST,
    p.total_jobs DESC
  LIMIT p_limit;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_available_providers TO authenticated;

COMMIT;

-- =====================================================
-- Migration Complete
-- =====================================================
-- Summary:
-- 1. Created order_reassignments audit table
-- 2. Created reassign_order() function with validation
-- 3. Created get_reassignment_history() function
-- 4. Created get_available_providers() function
-- 5. Added proper RLS policies and indexes
-- =====================================================
