-- Migration: 030_fix_loyalty_and_promo_functions.sql
-- Feature: F156 - Loyalty Program, F10 - Promo System
-- Description: Fix add_loyalty_points, validate_promo_code, and add check_tier_upgrade functions

-- =====================================================
-- 1. CREATE check_tier_upgrade FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION check_tier_upgrade(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_lifetime_points INTEGER;
  v_new_tier_id UUID;
BEGIN
  -- Get user's lifetime points
  SELECT lifetime_points INTO v_lifetime_points
  FROM user_loyalty
  WHERE user_id = p_user_id;
  
  IF v_lifetime_points IS NULL THEN
    RETURN;
  END IF;
  
  -- Find the highest tier the user qualifies for
  SELECT id INTO v_new_tier_id
  FROM loyalty_tiers
  WHERE min_points <= v_lifetime_points
  ORDER BY min_points DESC
  LIMIT 1;
  
  -- Update user's tier if found
  IF v_new_tier_id IS NOT NULL THEN
    UPDATE user_loyalty
    SET current_tier_id = v_new_tier_id,
        updated_at = NOW()
    WHERE user_id = p_user_id
    AND (current_tier_id IS NULL OR current_tier_id != v_new_tier_id);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 2. FIX add_loyalty_points FUNCTION
-- Uses 'source' column instead of 'reference_type'
-- =====================================================
DROP FUNCTION IF EXISTS add_loyalty_points(uuid, integer, character varying, text, character varying, uuid);

CREATE OR REPLACE FUNCTION add_loyalty_points(
  p_user_id UUID,
  p_points INTEGER,
  p_type VARCHAR(50),
  p_description TEXT DEFAULT NULL,
  p_source VARCHAR(50) DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL
)
RETURNS TABLE (
  new_points INTEGER,
  new_lifetime_points INTEGER,
  transaction_id UUID
) AS $$
DECLARE
  v_txn_id UUID;
  v_new_points INTEGER;
  v_new_lifetime INTEGER;
BEGIN
  -- Insert transaction
  INSERT INTO points_transactions (user_id, points, type, description, source, reference_id)
  VALUES (p_user_id, p_points, p_type, p_description, p_source, p_reference_id)
  RETURNING id INTO v_txn_id;
  
  -- Update user_loyalty
  INSERT INTO user_loyalty (user_id, current_points, lifetime_points)
  VALUES (p_user_id, GREATEST(0, p_points), CASE WHEN p_points > 0 THEN p_points ELSE 0 END)
  ON CONFLICT (user_id) DO UPDATE SET
    current_points = GREATEST(0, user_loyalty.current_points + p_points),
    lifetime_points = CASE 
      WHEN p_points > 0 THEN user_loyalty.lifetime_points + p_points 
      ELSE user_loyalty.lifetime_points 
    END,
    updated_at = NOW()
  RETURNING current_points, lifetime_points INTO v_new_points, v_new_lifetime;
  
  -- Check tier upgrade
  PERFORM check_tier_upgrade(p_user_id);
  
  RETURN QUERY SELECT v_new_points, v_new_lifetime, v_txn_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 3. FIX validate_promo_code FUNCTION
-- Uses correct column names: valid_until, used_count
-- =====================================================
CREATE OR REPLACE FUNCTION validate_promo_code(
  p_code VARCHAR(50),
  p_user_id UUID,
  p_order_amount NUMERIC
)
RETURNS TABLE (
  is_valid BOOLEAN,
  discount_amount NUMERIC,
  message TEXT,
  promo_id UUID
) AS $$
DECLARE
  v_promo RECORD;
  v_discount NUMERIC;
  v_already_used BOOLEAN;
BEGIN
  -- Find promo code
  SELECT * INTO v_promo FROM promo_codes WHERE code = UPPER(p_code) AND is_active = true;
  
  IF v_promo IS NULL THEN
    RETURN QUERY SELECT false, 0::NUMERIC, 'รหัสโปรโมชั่นไม่ถูกต้อง'::TEXT, NULL::UUID;
    RETURN;
  END IF;
  
  -- Check if already used by this user
  SELECT EXISTS(
    SELECT 1 FROM user_promo_usage upu
    WHERE upu.user_id = p_user_id AND upu.promo_id = v_promo.id
  ) INTO v_already_used;
  
  IF v_already_used THEN
    RETURN QUERY SELECT false, 0::NUMERIC, 'คุณใช้โค้ดนี้ไปแล้ว'::TEXT, NULL::UUID;
    RETURN;
  END IF;
  
  -- Check expiry (valid_until instead of expires_at)
  IF v_promo.valid_until IS NOT NULL AND v_promo.valid_until < NOW() THEN
    RETURN QUERY SELECT false, 0::NUMERIC, 'โค้ดหมดอายุแล้ว'::TEXT, NULL::UUID;
    RETURN;
  END IF;
  
  -- Check valid_from
  IF v_promo.valid_from IS NOT NULL AND v_promo.valid_from > NOW() THEN
    RETURN QUERY SELECT false, 0::NUMERIC, 'โค้ดยังไม่เริ่มใช้งาน'::TEXT, NULL::UUID;
    RETURN;
  END IF;
  
  -- Check usage limit (used_count instead of usage_count)
  IF v_promo.usage_limit IS NOT NULL AND v_promo.used_count >= v_promo.usage_limit THEN
    RETURN QUERY SELECT false, 0::NUMERIC, 'โค้ดถูกใช้ครบจำนวนแล้ว'::TEXT, NULL::UUID;
    RETURN;
  END IF;
  
  -- Check minimum order
  IF v_promo.min_order_amount IS NOT NULL AND p_order_amount < v_promo.min_order_amount THEN
    RETURN QUERY SELECT false, 0::NUMERIC, 
      format('ยอดขั้นต่ำ ฿%.2f', v_promo.min_order_amount)::TEXT, NULL::UUID;
    RETURN;
  END IF;
  
  -- Calculate discount
  IF v_promo.discount_type = 'percentage' THEN
    v_discount := p_order_amount * (v_promo.discount_value / 100);
    IF v_promo.max_discount IS NOT NULL AND v_discount > v_promo.max_discount THEN
      v_discount := v_promo.max_discount;
    END IF;
  ELSE
    v_discount := v_promo.discount_value;
  END IF;
  
  RETURN QUERY SELECT true, v_discount, 'โค้ดใช้ได้'::TEXT, v_promo.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
