-- ============================================
-- Migration: 204_get_user_used_promos.sql
-- Feature: F10 - Promo System (Used Promos Tab)
-- Date: 2026-01-01
-- ============================================
-- Description: RPC function to get user's used promos history
-- Tables: user_promo_usage, promo_codes
-- RLS: N/A (function)
-- Realtime: N/A
-- ============================================

-- Create get_user_used_promos RPC function
CREATE OR REPLACE FUNCTION get_user_used_promos(
  p_user_id UUID,
  p_limit INT DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  promo_id UUID,
  promo_code TEXT,
  discount_type TEXT,
  discount_value NUMERIC,
  discount_amount NUMERIC,
  order_amount NUMERIC,
  service_type TEXT,
  request_id UUID,
  used_at TIMESTAMPTZ,
  promo_description TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    upu.id,
    upu.promo_id,
    pc.code AS promo_code,
    pc.discount_type,
    pc.discount_value,
    upu.discount_amount,
    upu.order_amount,
    upu.service_type,
    upu.request_id,
    upu.used_at,
    pc.description AS promo_description
  FROM user_promo_usage upu
  JOIN promo_codes pc ON pc.id = upu.promo_id
  WHERE upu.user_id = p_user_id
  ORDER BY upu.used_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_user_used_promos(UUID, INT) TO authenticated;

-- ============================================
-- ROLLBACK:
-- DROP FUNCTION IF EXISTS get_user_used_promos(UUID, INT);
-- ============================================
