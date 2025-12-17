-- Migration: 025_fix_loyalty_functions.sql
-- Feature: F156 - Customer Loyalty Program
-- Description: Fix loyalty functions to work correctly with database schema

-- =============================================
-- Fix get_loyalty_summary function
-- =============================================
DROP FUNCTION IF EXISTS get_loyalty_summary(uuid);

CREATE OR REPLACE FUNCTION get_loyalty_summary(p_user_id UUID)
RETURNS TABLE (
  current_points INTEGER,
  lifetime_points INTEGER,
  tier JSONB,
  next_tier JSONB
) AS $$
DECLARE
  v_current_points INTEGER;
  v_lifetime_points INTEGER;
  v_current_tier_id UUID;
  v_tier JSONB;
  v_next_tier JSONB;
BEGIN
  -- Get user loyalty data
  SELECT ul.current_points, ul.lifetime_points, ul.current_tier_id
  INTO v_current_points, v_lifetime_points, v_current_tier_id
  FROM user_loyalty ul
  WHERE ul.user_id = p_user_id;
  
  -- If no loyalty record, create one with default values
  IF v_current_points IS NULL THEN
    -- Get the default (lowest) tier
    SELECT lt.id INTO v_current_tier_id
    FROM loyalty_tiers lt
    WHERE lt.is_active = true
    ORDER BY lt.min_points ASC
    LIMIT 1;
    
    -- Insert new loyalty record
    INSERT INTO user_loyalty (user_id, current_points, lifetime_points, current_tier_id)
    VALUES (p_user_id, 0, 0, v_current_tier_id)
    RETURNING user_loyalty.current_points, user_loyalty.lifetime_points, user_loyalty.current_tier_id
    INTO v_current_points, v_lifetime_points, v_current_tier_id;
  END IF;
  
  -- Get current tier info
  SELECT jsonb_build_object(
    'id', lt.id,
    'name', lt.name,
    'name_th', lt.name_th,
    'min_points', lt.min_points,
    'multiplier', lt.multiplier,
    'benefits', lt.benefits,
    'badge_color', lt.badge_color,
    'icon_name', lt.icon_name
  ) INTO v_tier
  FROM loyalty_tiers lt
  WHERE lt.id = v_current_tier_id;
  
  -- If no tier found, get default tier
  IF v_tier IS NULL THEN
    SELECT jsonb_build_object(
      'id', lt.id,
      'name', lt.name,
      'name_th', lt.name_th,
      'min_points', lt.min_points,
      'multiplier', lt.multiplier,
      'benefits', lt.benefits,
      'badge_color', lt.badge_color,
      'icon_name', lt.icon_name
    ) INTO v_tier
    FROM loyalty_tiers lt
    WHERE lt.is_active = true
    ORDER BY lt.min_points ASC
    LIMIT 1;
  END IF;
  
  -- Get next tier info
  SELECT jsonb_build_object(
    'id', lt.id,
    'name', lt.name,
    'name_th', lt.name_th,
    'min_points', lt.min_points,
    'points_needed', lt.min_points - COALESCE(v_lifetime_points, 0)
  ) INTO v_next_tier
  FROM loyalty_tiers lt
  WHERE lt.is_active = true
    AND lt.min_points > COALESCE(v_lifetime_points, 0)
  ORDER BY lt.min_points ASC
  LIMIT 1;
  
  RETURN QUERY SELECT 
    COALESCE(v_current_points, 0),
    COALESCE(v_lifetime_points, 0),
    v_tier,
    v_next_tier;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Fix redeem_reward function
-- =============================================
DROP FUNCTION IF EXISTS redeem_reward(uuid, uuid);

CREATE OR REPLACE FUNCTION redeem_reward(p_user_id UUID, p_reward_id UUID)
RETURNS TABLE (success BOOLEAN, message TEXT, reward_code TEXT) AS $$
DECLARE
  v_points_required INTEGER;
  v_current_points INTEGER;
  v_reward_name VARCHAR;
  v_valid_days INTEGER;
  v_code VARCHAR;
BEGIN
  -- Get reward info
  SELECT points_required, name, valid_days INTO v_points_required, v_reward_name, v_valid_days
  FROM loyalty_rewards WHERE id = p_reward_id AND is_active = true;

  IF v_points_required IS NULL THEN
    RETURN QUERY SELECT false, 'รางวัลไม่พร้อมใช้งาน'::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  -- Get user points
  SELECT current_points INTO v_current_points
  FROM user_loyalty WHERE user_id = p_user_id;

  IF v_current_points IS NULL OR v_current_points < v_points_required THEN
    RETURN QUERY SELECT false, 'คะแนนไม่เพียงพอ'::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  -- Generate unique code
  v_code := 'RWD' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));

  -- Deduct points
  PERFORM add_loyalty_points(p_user_id, -v_points_required, 'redeem', 'แลกรางวัล: ' || v_reward_name, 'reward', p_reward_id);

  -- Create user reward with all required fields
  INSERT INTO user_rewards (user_id, reward_id, points_spent, code, status, expires_at)
  VALUES (
    p_user_id, 
    p_reward_id, 
    v_points_required,
    v_code,
    'active',
    NOW() + (COALESCE(v_valid_days, 30) || ' days')::INTERVAL
  );

  -- Update quantity_redeemed
  UPDATE loyalty_rewards SET quantity_redeemed = quantity_redeemed + 1 WHERE id = p_reward_id;

  RETURN QUERY SELECT true, 'แลกรางวัลสำเร็จ'::TEXT, v_code::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Grant execute permissions
-- =============================================
GRANT EXECUTE ON FUNCTION get_loyalty_summary(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION redeem_reward(uuid, uuid) TO anon, authenticated;
