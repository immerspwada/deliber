-- ============================================
-- Migration: 205_provider_promo_visibility.sql
-- Feature: F10 - Promo Codes (Provider Visibility)
-- Date: 2026-01-01
-- ============================================
-- Description: Add promo_code fields to provider job functions
-- so providers can see when customers used promo codes
-- Tables: delivery_requests, shopping_requests, ride_requests
-- RLS: No changes
-- Realtime: No changes
-- ============================================

-- NOTE: Before running this migration, drop existing functions:
-- DROP FUNCTION IF EXISTS get_available_deliveries_for_provider(UUID, double precision);
-- DROP FUNCTION IF EXISTS get_available_shopping_for_provider(UUID, double precision);

-- ============================================================================
-- 1. CREATE get_available_deliveries_for_provider with promo fields
-- ============================================================================

CREATE OR REPLACE FUNCTION get_available_deliveries_for_provider(
  p_provider_id UUID,
  p_radius_km INTEGER DEFAULT 10
)
RETURNS TABLE (
  delivery_id UUID,
  tracking_id VARCHAR(25),
  user_id UUID,
  customer_name TEXT,
  sender_name TEXT,
  sender_phone TEXT,
  sender_address TEXT,
  sender_lat DECIMAL(10,8),
  sender_lng DECIMAL(11,8),
  recipient_name TEXT,
  recipient_phone TEXT,
  recipient_address TEXT,
  recipient_lat DECIMAL(10,8),
  recipient_lng DECIMAL(11,8),
  package_type TEXT,
  package_description TEXT,
  estimated_fee DECIMAL(10,2),
  distance_km DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE,
  -- Promo fields
  promo_code TEXT,
  promo_code_id UUID,
  promo_discount_amount DECIMAL(10,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id as delivery_id,
    d.tracking_id,
    d.user_id,
    COALESCE(u.first_name || ' ' || u.last_name, 'ลูกค้า')::TEXT as customer_name,
    COALESCE(d.sender_name, '')::TEXT,
    COALESCE(d.sender_phone, '')::TEXT,
    COALESCE(d.sender_address, '')::TEXT,
    d.sender_lat,
    d.sender_lng,
    COALESCE(d.recipient_name, '')::TEXT,
    COALESCE(d.recipient_phone, '')::TEXT,
    COALESCE(d.recipient_address, '')::TEXT,
    d.recipient_lat,
    d.recipient_lng,
    COALESCE(d.package_type, 'standard')::TEXT,
    d.package_description::TEXT,
    COALESCE(d.estimated_fee, 0)::DECIMAL(10,2),
    (6371 * acos(
      LEAST(1.0, GREATEST(-1.0,
        cos(radians(d.sender_lat)) * cos(radians(d.recipient_lat)) *
        cos(radians(d.recipient_lng) - radians(d.sender_lng)) +
        sin(radians(d.sender_lat)) * sin(radians(d.recipient_lat))
      ))
    ))::DECIMAL(10,2) as distance_km,
    d.created_at,
    -- Promo fields
    d.promo_code::TEXT,
    d.promo_code_id,
    COALESCE(d.promo_discount_amount, 0)::DECIMAL(10,2)
  FROM public.delivery_requests d
  LEFT JOIN public.users u ON u.id = d.user_id
  WHERE d.status = 'pending'
    AND d.provider_id IS NULL
  ORDER BY d.created_at DESC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 2. CREATE get_available_shopping_for_provider with promo fields
-- ============================================================================

CREATE OR REPLACE FUNCTION get_available_shopping_for_provider(
  p_provider_id UUID,
  p_radius_km INTEGER DEFAULT 10
)
RETURNS TABLE (
  shopping_id UUID,
  tracking_id VARCHAR(25),
  user_id UUID,
  customer_name TEXT,
  store_name TEXT,
  store_address TEXT,
  store_lat DECIMAL(10,8),
  store_lng DECIMAL(11,8),
  delivery_address TEXT,
  delivery_lat DECIMAL(10,8),
  delivery_lng DECIMAL(11,8),
  items JSONB,
  item_list TEXT,
  budget_limit DECIMAL(10,2),
  service_fee DECIMAL(10,2),
  special_instructions TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  -- Promo fields
  promo_code TEXT,
  promo_code_id UUID,
  promo_discount_amount DECIMAL(10,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id as shopping_id,
    s.tracking_id,
    s.user_id,
    COALESCE(u.first_name || ' ' || u.last_name, 'ลูกค้า')::TEXT as customer_name,
    COALESCE(s.store_name, 'ร้านค้า')::TEXT,
    s.store_address::TEXT,
    s.store_lat,
    s.store_lng,
    COALESCE(s.delivery_address, '')::TEXT,
    s.delivery_lat,
    s.delivery_lng,
    s.items,
    s.item_list::TEXT,
    COALESCE(s.budget_limit, 0)::DECIMAL(10,2),
    COALESCE(s.service_fee, 0)::DECIMAL(10,2),
    s.special_instructions::TEXT,
    s.created_at,
    -- Promo fields
    s.promo_code::TEXT,
    s.promo_code_id,
    COALESCE(s.promo_discount_amount, 0)::DECIMAL(10,2)
  FROM public.shopping_requests s
  LEFT JOIN public.users u ON u.id = s.user_id
  WHERE s.status = 'pending'
    AND s.provider_id IS NULL
  ORDER BY s.created_at DESC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 3. Grant permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION get_available_deliveries_for_provider TO authenticated;
GRANT EXECUTE ON FUNCTION get_available_deliveries_for_provider TO anon;
GRANT EXECUTE ON FUNCTION get_available_shopping_for_provider TO authenticated;
GRANT EXECUTE ON FUNCTION get_available_shopping_for_provider TO anon;

-- ============================================
-- ROLLBACK (if needed):
-- ============================================
-- Run migration 140 again to restore original functions
-- ============================================
