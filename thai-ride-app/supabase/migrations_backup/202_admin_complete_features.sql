-- =====================================================
-- Migration 202: Complete Admin Features
-- =====================================================
-- Purpose: Add all missing RPC functions for admin features
-- Features: Referrals, Loyalty, Refunds, Fraud, Incentives, 
--           Reports, Analytics, Ratings, Feedback
-- =====================================================

-- =====================================================
-- 1. REFERRALS MANAGEMENT
-- =====================================================

-- Get all referrals for admin
CREATE OR REPLACE FUNCTION admin_get_referrals(
  p_status TEXT DEFAULT NULL,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  referrer_id UUID,
  referrer_name TEXT,
  referrer_phone TEXT,
  referrer_member_uid TEXT,
  referred_id UUID,
  referred_name TEXT,
  referred_phone TEXT,
  referred_member_uid TEXT,
  referral_code TEXT,
  status TEXT,
  reward_amount NUMERIC,
  reward_paid BOOLEAN,
  created_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.referrer_id,
    COALESCE(u1.first_name || ' ' || u1.last_name, u1.email, 'Unknown') as referrer_name,
    u1.phone_number as referrer_phone,
    u1.member_uid as referrer_member_uid,
    r.referred_id,
    COALESCE(u2.first_name || ' ' || u2.last_name, u2.email, 'Unknown') as referred_name,
    u2.phone_number as referred_phone,
    u2.member_uid as referred_member_uid,
    rc.code as referral_code,
    r.status,
    COALESCE(r.reward_amount, 50) as reward_amount,
    COALESCE(r.reward_paid, false) as reward_paid,
    r.created_at,
    r.completed_at
  FROM referrals r
  LEFT JOIN users u1 ON r.referrer_id = u1.id
  LEFT JOIN users u2 ON r.referred_id = u2.id
  LEFT JOIN referral_codes rc ON r.referrer_id = rc.user_id
  WHERE (p_status IS NULL OR r.status = p_status)
  ORDER BY r.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Count referrals for admin
CREATE OR REPLACE FUNCTION admin_count_referrals(p_status TEXT DEFAULT NULL)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM referrals r
  WHERE (p_status IS NULL OR r.status = p_status);
  RETURN v_count;
END;
$$;

-- Get referral stats
CREATE OR REPLACE FUNCTION admin_get_referral_stats()
RETURNS TABLE (
  total_referrals BIGINT,
  completed_referrals BIGINT,
  pending_referrals BIGINT,
  total_rewards_paid NUMERIC,
  total_rewards_pending NUMERIC,
  today_referrals BIGINT,
  this_month_referrals BIGINT,
  avg_conversion_days NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_referrals,
    COUNT(*) FILTER (WHERE r.status = 'completed')::BIGINT as completed_referrals,
    COUNT(*) FILTER (WHERE r.status = 'pending')::BIGINT as pending_referrals,
    COALESCE(SUM(r.reward_amount) FILTER (WHERE r.reward_paid = true), 0) as total_rewards_paid,
    COALESCE(SUM(r.reward_amount) FILTER (WHERE r.reward_paid = false AND r.status = 'completed'), 0) as total_rewards_pending,
    COUNT(*) FILTER (WHERE r.created_at >= CURRENT_DATE)::BIGINT as today_referrals,
    COUNT(*) FILTER (WHERE r.created_at >= date_trunc('month', CURRENT_DATE))::BIGINT as this_month_referrals,
    COALESCE(AVG(EXTRACT(EPOCH FROM (r.completed_at - r.created_at))/86400) FILTER (WHERE r.completed_at IS NOT NULL), 0) as avg_conversion_days
  FROM referrals r;
END;
$$;

-- =====================================================
-- 2. LOYALTY PROGRAM MANAGEMENT
-- =====================================================

-- Get all loyalty users for admin
CREATE OR REPLACE FUNCTION admin_get_loyalty_users(
  p_tier TEXT DEFAULT NULL,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  user_name TEXT,
  user_phone TEXT,
  member_uid TEXT,
  current_tier TEXT,
  total_points BIGINT,
  available_points BIGINT,
  lifetime_points BIGINT,
  tier_progress NUMERIC,
  next_tier TEXT,
  points_to_next_tier INT,
  joined_at TIMESTAMPTZ,
  last_activity TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ul.id,
    ul.user_id,
    COALESCE(u.first_name || ' ' || u.last_name, u.email, 'Unknown') as user_name,
    u.phone_number as user_phone,
    u.member_uid,
    COALESCE(ul.current_tier, 'bronze') as current_tier,
    COALESCE(ul.total_points, 0)::BIGINT as total_points,
    COALESCE(ul.available_points, ul.total_points, 0)::BIGINT as available_points,
    COALESCE(ul.lifetime_points, ul.total_points, 0)::BIGINT as lifetime_points,
    CASE 
      WHEN ul.current_tier = 'bronze' THEN (COALESCE(ul.total_points, 0)::NUMERIC / 1000 * 100)
      WHEN ul.current_tier = 'silver' THEN (COALESCE(ul.total_points, 0)::NUMERIC / 5000 * 100)
      WHEN ul.current_tier = 'gold' THEN (COALESCE(ul.total_points, 0)::NUMERIC / 10000 * 100)
      ELSE 100
    END as tier_progress,
    CASE 
      WHEN ul.current_tier = 'bronze' THEN 'silver'
      WHEN ul.current_tier = 'silver' THEN 'gold'
      WHEN ul.current_tier = 'gold' THEN 'platinum'
      ELSE NULL
    END as next_tier,
    CASE 
      WHEN ul.current_tier = 'bronze' THEN GREATEST(1000 - COALESCE(ul.total_points, 0), 0)
      WHEN ul.current_tier = 'silver' THEN GREATEST(5000 - COALESCE(ul.total_points, 0), 0)
      WHEN ul.current_tier = 'gold' THEN GREATEST(10000 - COALESCE(ul.total_points, 0), 0)
      ELSE 0
    END::INT as points_to_next_tier,
    ul.created_at as joined_at,
    ul.updated_at as last_activity
  FROM user_loyalty ul
  LEFT JOIN users u ON ul.user_id = u.id
  WHERE (p_tier IS NULL OR ul.current_tier = p_tier)
  ORDER BY ul.total_points DESC NULLS LAST
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Get loyalty stats
CREATE OR REPLACE FUNCTION admin_get_loyalty_stats()
RETURNS TABLE (
  total_members BIGINT,
  bronze_members BIGINT,
  silver_members BIGINT,
  gold_members BIGINT,
  platinum_members BIGINT,
  total_points_issued BIGINT,
  total_points_redeemed BIGINT,
  total_rewards_claimed BIGINT,
  avg_points_per_user NUMERIC,
  active_this_month BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_members,
    COUNT(*) FILTER (WHERE ul.current_tier = 'bronze')::BIGINT as bronze_members,
    COUNT(*) FILTER (WHERE ul.current_tier = 'silver')::BIGINT as silver_members,
    COUNT(*) FILTER (WHERE ul.current_tier = 'gold')::BIGINT as gold_members,
    COUNT(*) FILTER (WHERE ul.current_tier = 'platinum')::BIGINT as platinum_members,
    COALESCE(SUM(ul.lifetime_points), 0)::BIGINT as total_points_issued,
    COALESCE(SUM(ul.lifetime_points) - SUM(ul.available_points), 0)::BIGINT as total_points_redeemed,
    (SELECT COUNT(*) FROM user_rewards WHERE status = 'redeemed')::BIGINT as total_rewards_claimed,
    COALESCE(AVG(ul.total_points), 0) as avg_points_per_user,
    COUNT(*) FILTER (WHERE ul.updated_at >= date_trunc('month', CURRENT_DATE))::BIGINT as active_this_month
  FROM user_loyalty ul;
END;
$$;

-- Adjust user points (admin action)
CREATE OR REPLACE FUNCTION admin_adjust_loyalty_points(
  p_user_id UUID,
  p_points INT,
  p_reason TEXT,
  p_admin_id UUID DEFAULT NULL
)
RETURNS TABLE (success BOOLEAN, message TEXT, new_balance BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_points BIGINT;
  v_new_points BIGINT;
BEGIN
  -- Get current points
  SELECT COALESCE(total_points, 0) INTO v_current_points
  FROM user_loyalty WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    -- Create loyalty record if not exists
    INSERT INTO user_loyalty (user_id, total_points, available_points, current_tier)
    VALUES (p_user_id, GREATEST(p_points, 0), GREATEST(p_points, 0), 'bronze');
    v_new_points := GREATEST(p_points, 0);
  ELSE
    v_new_points := GREATEST(v_current_points + p_points, 0);
    UPDATE user_loyalty 
    SET total_points = v_new_points,
        available_points = v_new_points,
        updated_at = NOW()
    WHERE user_id = p_user_id;
  END IF;
  
  -- Log the transaction
  INSERT INTO points_transactions (user_id, points, type, description, created_at)
  VALUES (p_user_id, p_points, CASE WHEN p_points >= 0 THEN 'admin_credit' ELSE 'admin_debit' END, p_reason, NOW());
  
  RETURN QUERY SELECT true, 'Points adjusted successfully'::TEXT, v_new_points;
END;
$$;

-- =====================================================
-- 3. REFUNDS MANAGEMENT
-- =====================================================

-- Get all refunds for admin
CREATE OR REPLACE FUNCTION admin_get_refunds(
  p_status TEXT DEFAULT NULL,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  order_id UUID,
  service_type TEXT,
  tracking_id TEXT,
  user_id UUID,
  user_name TEXT,
  user_phone TEXT,
  member_uid TEXT,
  amount NUMERIC,
  reason TEXT,
  status TEXT,
  refund_method TEXT,
  processed_by UUID,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rf.id,
    rf.order_id,
    rf.service_type,
    rf.tracking_id,
    rf.user_id,
    COALESCE(u.first_name || ' ' || u.last_name, u.email, 'Unknown') as user_name,
    u.phone_number as user_phone,
    u.member_uid,
    rf.amount,
    rf.reason,
    rf.status,
    COALESCE(rf.refund_method, 'wallet') as refund_method,
    rf.processed_by,
    rf.processed_at,
    rf.created_at
  FROM refunds rf
  LEFT JOIN users u ON rf.user_id = u.id
  WHERE (p_status IS NULL OR rf.status = p_status)
  ORDER BY rf.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Count refunds
CREATE OR REPLACE FUNCTION admin_count_refunds(p_status TEXT DEFAULT NULL)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM refunds rf
  WHERE (p_status IS NULL OR rf.status = p_status);
  RETURN v_count;
END;
$$;

-- Get refund stats
CREATE OR REPLACE FUNCTION admin_get_refund_stats()
RETURNS TABLE (
  total_refunds BIGINT,
  pending_refunds BIGINT,
  approved_refunds BIGINT,
  rejected_refunds BIGINT,
  total_amount_refunded NUMERIC,
  total_amount_pending NUMERIC,
  today_refunds BIGINT,
  today_amount NUMERIC,
  avg_refund_amount NUMERIC,
  avg_processing_hours NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_refunds,
    COUNT(*) FILTER (WHERE rf.status = 'pending')::BIGINT as pending_refunds,
    COUNT(*) FILTER (WHERE rf.status = 'approved')::BIGINT as approved_refunds,
    COUNT(*) FILTER (WHERE rf.status = 'rejected')::BIGINT as rejected_refunds,
    COALESCE(SUM(rf.amount) FILTER (WHERE rf.status = 'approved'), 0) as total_amount_refunded,
    COALESCE(SUM(rf.amount) FILTER (WHERE rf.status = 'pending'), 0) as total_amount_pending,
    COUNT(*) FILTER (WHERE rf.created_at >= CURRENT_DATE)::BIGINT as today_refunds,
    COALESCE(SUM(rf.amount) FILTER (WHERE rf.created_at >= CURRENT_DATE), 0) as today_amount,
    COALESCE(AVG(rf.amount), 0) as avg_refund_amount,
    COALESCE(AVG(EXTRACT(EPOCH FROM (rf.processed_at - rf.created_at))/3600) FILTER (WHERE rf.processed_at IS NOT NULL), 0) as avg_processing_hours
  FROM refunds rf;
END;
$$;

-- Process refund (approve/reject)
CREATE OR REPLACE FUNCTION admin_process_refund(
  p_refund_id UUID,
  p_action TEXT, -- 'approve' or 'reject'
  p_admin_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS TABLE (success BOOLEAN, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_refund RECORD;
  v_wallet_id UUID;
BEGIN
  -- Get refund details
  SELECT * INTO v_refund FROM refunds WHERE id = p_refund_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Refund not found'::TEXT;
    RETURN;
  END IF;
  
  IF v_refund.status != 'pending' THEN
    RETURN QUERY SELECT false, 'Refund already processed'::TEXT;
    RETURN;
  END IF;
  
  IF p_action = 'approve' THEN
    -- Update refund status
    UPDATE refunds SET 
      status = 'approved',
      processed_by = p_admin_id,
      processed_at = NOW(),
      admin_notes = p_notes
    WHERE id = p_refund_id;
    
    -- Add to user wallet
    SELECT id INTO v_wallet_id FROM user_wallets WHERE user_id = v_refund.user_id;
    
    IF v_wallet_id IS NOT NULL THEN
      UPDATE user_wallets SET balance = balance + v_refund.amount WHERE id = v_wallet_id;
      
      INSERT INTO wallet_transactions (user_id, amount, type, description, reference_id, created_at)
      VALUES (v_refund.user_id, v_refund.amount, 'refund', 'Refund for order ' || COALESCE(v_refund.tracking_id, v_refund.order_id::TEXT), p_refund_id, NOW());
    END IF;
    
    RETURN QUERY SELECT true, 'Refund approved and credited to wallet'::TEXT;
  ELSE
    UPDATE refunds SET 
      status = 'rejected',
      processed_by = p_admin_id,
      processed_at = NOW(),
      admin_notes = p_notes
    WHERE id = p_refund_id;
    
    RETURN QUERY SELECT true, 'Refund rejected'::TEXT;
  END IF;
END;
$$;

-- =====================================================
-- 4. FRAUD ALERTS MANAGEMENT
-- =====================================================

-- Get all fraud alerts for admin
CREATE OR REPLACE FUNCTION admin_get_fraud_alerts(
  p_status TEXT DEFAULT NULL,
  p_severity TEXT DEFAULT NULL,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  alert_type TEXT,
  severity TEXT,
  user_id UUID,
  user_name TEXT,
  user_phone TEXT,
  member_uid TEXT,
  provider_id UUID,
  provider_name TEXT,
  order_id UUID,
  tracking_id TEXT,
  description TEXT,
  evidence JSONB,
  status TEXT,
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    fa.id,
    fa.alert_type,
    COALESCE(fa.severity, 'medium') as severity,
    fa.user_id,
    COALESCE(u.first_name || ' ' || u.last_name, u.email, 'Unknown') as user_name,
    u.phone_number as user_phone,
    u.member_uid,
    fa.provider_id,
    COALESCE(pu.first_name || ' ' || pu.last_name, 'Unknown') as provider_name,
    fa.order_id,
    fa.tracking_id,
    fa.description,
    fa.evidence,
    fa.status,
    fa.resolved_by,
    fa.resolved_at,
    fa.resolution_notes,
    fa.created_at
  FROM fraud_alerts fa
  LEFT JOIN users u ON fa.user_id = u.id
  LEFT JOIN service_providers sp ON fa.provider_id = sp.id
  LEFT JOIN users pu ON sp.user_id = pu.id
  WHERE (p_status IS NULL OR fa.status = p_status)
    AND (p_severity IS NULL OR fa.severity = p_severity)
  ORDER BY 
    CASE fa.severity 
      WHEN 'critical' THEN 1 
      WHEN 'high' THEN 2 
      WHEN 'medium' THEN 3 
      ELSE 4 
    END,
    fa.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Get fraud stats
CREATE OR REPLACE FUNCTION admin_get_fraud_stats()
RETURNS TABLE (
  total_alerts BIGINT,
  open_alerts BIGINT,
  critical_alerts BIGINT,
  high_alerts BIGINT,
  resolved_today BIGINT,
  avg_resolution_hours NUMERIC,
  top_alert_types JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_alerts,
    COUNT(*) FILTER (WHERE fa.status = 'open')::BIGINT as open_alerts,
    COUNT(*) FILTER (WHERE fa.severity = 'critical' AND fa.status = 'open')::BIGINT as critical_alerts,
    COUNT(*) FILTER (WHERE fa.severity = 'high' AND fa.status = 'open')::BIGINT as high_alerts,
    COUNT(*) FILTER (WHERE fa.resolved_at >= CURRENT_DATE)::BIGINT as resolved_today,
    COALESCE(AVG(EXTRACT(EPOCH FROM (fa.resolved_at - fa.created_at))/3600) FILTER (WHERE fa.resolved_at IS NOT NULL), 0) as avg_resolution_hours,
    (SELECT jsonb_agg(jsonb_build_object('type', alert_type, 'count', cnt))
     FROM (SELECT alert_type, COUNT(*) as cnt FROM fraud_alerts GROUP BY alert_type ORDER BY cnt DESC LIMIT 5) t) as top_alert_types
  FROM fraud_alerts fa;
END;
$$;

-- Resolve fraud alert
CREATE OR REPLACE FUNCTION admin_resolve_fraud_alert(
  p_alert_id UUID,
  p_admin_id UUID,
  p_action TEXT, -- 'dismiss', 'warn_user', 'suspend_user', 'ban_user'
  p_notes TEXT DEFAULT NULL
)
RETURNS TABLE (success BOOLEAN, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_alert RECORD;
BEGIN
  SELECT * INTO v_alert FROM fraud_alerts WHERE id = p_alert_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Alert not found'::TEXT;
    RETURN;
  END IF;
  
  -- Update alert
  UPDATE fraud_alerts SET 
    status = 'resolved',
    resolved_by = p_admin_id,
    resolved_at = NOW(),
    resolution_notes = p_notes,
    resolution_action = p_action
  WHERE id = p_alert_id;
  
  -- Take action based on resolution
  IF p_action = 'suspend_user' AND v_alert.user_id IS NOT NULL THEN
    UPDATE users SET verification_status = 'suspended' WHERE id = v_alert.user_id;
  ELSIF p_action = 'ban_user' AND v_alert.user_id IS NOT NULL THEN
    UPDATE users SET verification_status = 'banned' WHERE id = v_alert.user_id;
  END IF;
  
  RETURN QUERY SELECT true, 'Alert resolved with action: ' || p_action;
END;
$$;

-- =====================================================
-- 5. PROVIDER INCENTIVES MANAGEMENT
-- =====================================================

-- Get all incentives for admin
CREATE OR REPLACE FUNCTION admin_get_incentives(
  p_status TEXT DEFAULT NULL,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  incentive_type TEXT,
  target_value INT,
  reward_amount NUMERIC,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  status TEXT,
  total_participants BIGINT,
  total_completions BIGINT,
  total_paid NUMERIC,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pi.id,
    pi.name,
    pi.description,
    pi.incentive_type,
    pi.target_value,
    pi.reward_amount,
    pi.start_date,
    pi.end_date,
    CASE 
      WHEN pi.end_date < NOW() THEN 'expired'
      WHEN pi.start_date > NOW() THEN 'scheduled'
      ELSE 'active'
    END as status,
    (SELECT COUNT(DISTINCT provider_id) FROM provider_incentive_progress WHERE incentive_id = pi.id)::BIGINT as total_participants,
    (SELECT COUNT(*) FROM provider_incentive_progress WHERE incentive_id = pi.id AND is_completed = true)::BIGINT as total_completions,
    (SELECT COALESCE(SUM(reward_amount), 0) FROM provider_incentive_progress WHERE incentive_id = pi.id AND is_paid = true) as total_paid,
    pi.created_at
  FROM provider_incentives pi
  WHERE (p_status IS NULL OR 
    (p_status = 'active' AND pi.start_date <= NOW() AND pi.end_date >= NOW()) OR
    (p_status = 'expired' AND pi.end_date < NOW()) OR
    (p_status = 'scheduled' AND pi.start_date > NOW()))
  ORDER BY pi.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Get incentive stats
CREATE OR REPLACE FUNCTION admin_get_incentive_stats()
RETURNS TABLE (
  total_incentives BIGINT,
  active_incentives BIGINT,
  total_participants BIGINT,
  total_completions BIGINT,
  total_rewards_paid NUMERIC,
  total_rewards_pending NUMERIC,
  avg_completion_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT pi.id)::BIGINT as total_incentives,
    COUNT(DISTINCT pi.id) FILTER (WHERE pi.start_date <= NOW() AND pi.end_date >= NOW())::BIGINT as active_incentives,
    COUNT(DISTINCT pip.provider_id)::BIGINT as total_participants,
    COUNT(*) FILTER (WHERE pip.is_completed = true)::BIGINT as total_completions,
    COALESCE(SUM(pip.reward_amount) FILTER (WHERE pip.is_paid = true), 0) as total_rewards_paid,
    COALESCE(SUM(pip.reward_amount) FILTER (WHERE pip.is_completed = true AND pip.is_paid = false), 0) as total_rewards_pending,
    CASE WHEN COUNT(DISTINCT pip.provider_id) > 0 
      THEN (COUNT(*) FILTER (WHERE pip.is_completed = true)::NUMERIC / COUNT(DISTINCT pip.provider_id) * 100)
      ELSE 0 
    END as avg_completion_rate
  FROM provider_incentives pi
  LEFT JOIN provider_incentive_progress pip ON pi.id = pip.incentive_id;
END;
$$;

-- Create new incentive
CREATE OR REPLACE FUNCTION admin_create_incentive(
  p_name TEXT,
  p_description TEXT,
  p_incentive_type TEXT,
  p_target_value INT,
  p_reward_amount NUMERIC,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ,
  p_provider_types TEXT[] DEFAULT NULL
)
RETURNS TABLE (success BOOLEAN, message TEXT, incentive_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO provider_incentives (name, description, incentive_type, target_value, reward_amount, start_date, end_date, provider_types, created_at)
  VALUES (p_name, p_description, p_incentive_type, p_target_value, p_reward_amount, p_start_date, p_end_date, p_provider_types, NOW())
  RETURNING id INTO v_id;
  
  RETURN QUERY SELECT true, 'Incentive created successfully'::TEXT, v_id;
END;
$$;

-- =====================================================
-- 6. RATINGS & REVIEWS MANAGEMENT
-- =====================================================

-- Get all ratings for admin
CREATE OR REPLACE FUNCTION admin_get_ratings(
  p_service_type TEXT DEFAULT NULL,
  p_min_rating INT DEFAULT NULL,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  service_type TEXT,
  order_id UUID,
  tracking_id TEXT,
  user_id UUID,
  user_name TEXT,
  provider_id UUID,
  provider_name TEXT,
  rating INT,
  comment TEXT,
  tags TEXT[],
  provider_response TEXT,
  response_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Combine ratings from all service types
  RETURN QUERY
  -- Ride ratings
  SELECT 
    rr.id,
    'ride'::TEXT as service_type,
    rr.ride_id as order_id,
    r.tracking_id,
    rr.user_id,
    COALESCE(u.first_name || ' ' || u.last_name, 'Unknown') as user_name,
    rr.provider_id,
    COALESCE(pu.first_name || ' ' || pu.last_name, 'Unknown') as provider_name,
    rr.rating,
    rr.comment,
    rr.tags,
    rr.provider_response,
    rr.response_at,
    rr.created_at
  FROM ride_ratings rr
  LEFT JOIN ride_requests r ON rr.ride_id = r.id
  LEFT JOIN users u ON rr.user_id = u.id
  LEFT JOIN service_providers sp ON rr.provider_id = sp.id
  LEFT JOIN users pu ON sp.user_id = pu.id
  WHERE (p_service_type IS NULL OR p_service_type = 'ride')
    AND (p_min_rating IS NULL OR rr.rating >= p_min_rating)
  
  UNION ALL
  
  -- Delivery ratings
  SELECT 
    dr.id,
    'delivery'::TEXT as service_type,
    dr.delivery_id as order_id,
    d.tracking_id,
    dr.user_id,
    COALESCE(u.first_name || ' ' || u.last_name, 'Unknown') as user_name,
    dr.provider_id,
    COALESCE(pu.first_name || ' ' || pu.last_name, 'Unknown') as provider_name,
    dr.rating,
    dr.comment,
    dr.tags,
    dr.provider_response,
    dr.response_at,
    dr.created_at
  FROM delivery_ratings dr
  LEFT JOIN delivery_requests d ON dr.delivery_id = d.id
  LEFT JOIN users u ON dr.user_id = u.id
  LEFT JOIN service_providers sp ON dr.provider_id = sp.id
  LEFT JOIN users pu ON sp.user_id = pu.id
  WHERE (p_service_type IS NULL OR p_service_type = 'delivery')
    AND (p_min_rating IS NULL OR dr.rating >= p_min_rating)
  
  ORDER BY created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Get rating stats
CREATE OR REPLACE FUNCTION admin_get_rating_stats()
RETURNS TABLE (
  total_ratings BIGINT,
  avg_rating NUMERIC,
  five_star BIGINT,
  four_star BIGINT,
  three_star BIGINT,
  two_star BIGINT,
  one_star BIGINT,
  with_comments BIGINT,
  with_responses BIGINT,
  today_ratings BIGINT,
  response_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH all_ratings AS (
    SELECT rating, comment, provider_response, created_at FROM ride_ratings
    UNION ALL
    SELECT rating, comment, provider_response, created_at FROM delivery_ratings
  )
  SELECT 
    COUNT(*)::BIGINT as total_ratings,
    COALESCE(AVG(rating), 0) as avg_rating,
    COUNT(*) FILTER (WHERE rating = 5)::BIGINT as five_star,
    COUNT(*) FILTER (WHERE rating = 4)::BIGINT as four_star,
    COUNT(*) FILTER (WHERE rating = 3)::BIGINT as three_star,
    COUNT(*) FILTER (WHERE rating = 2)::BIGINT as two_star,
    COUNT(*) FILTER (WHERE rating = 1)::BIGINT as one_star,
    COUNT(*) FILTER (WHERE comment IS NOT NULL AND comment != '')::BIGINT as with_comments,
    COUNT(*) FILTER (WHERE provider_response IS NOT NULL)::BIGINT as with_responses,
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE)::BIGINT as today_ratings,
    CASE WHEN COUNT(*) > 0 
      THEN (COUNT(*) FILTER (WHERE provider_response IS NOT NULL)::NUMERIC / COUNT(*) * 100)
      ELSE 0 
    END as response_rate
  FROM all_ratings;
END;
$$;

-- =====================================================
-- 7. CUSTOMER FEEDBACK MANAGEMENT
-- =====================================================

-- Get all feedback for admin
CREATE OR REPLACE FUNCTION admin_get_feedback(
  p_type TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  user_name TEXT,
  user_phone TEXT,
  member_uid TEXT,
  feedback_type TEXT,
  category TEXT,
  subject TEXT,
  message TEXT,
  rating INT,
  status TEXT,
  admin_response TEXT,
  responded_by UUID,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cf.id,
    cf.user_id,
    COALESCE(u.first_name || ' ' || u.last_name, 'Unknown') as user_name,
    u.phone_number as user_phone,
    u.member_uid,
    cf.feedback_type,
    cf.category,
    cf.subject,
    cf.message,
    cf.rating,
    cf.status,
    cf.admin_response,
    cf.responded_by,
    cf.responded_at,
    cf.created_at
  FROM customer_feedback cf
  LEFT JOIN users u ON cf.user_id = u.id
  WHERE (p_type IS NULL OR cf.feedback_type = p_type)
    AND (p_status IS NULL OR cf.status = p_status)
  ORDER BY cf.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Get feedback stats
CREATE OR REPLACE FUNCTION admin_get_feedback_stats()
RETURNS TABLE (
  total_feedback BIGINT,
  pending_feedback BIGINT,
  resolved_feedback BIGINT,
  avg_rating NUMERIC,
  nps_score NUMERIC,
  promoters BIGINT,
  passives BIGINT,
  detractors BIGINT,
  today_feedback BIGINT,
  avg_response_hours NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_feedback,
    COUNT(*) FILTER (WHERE cf.status = 'pending')::BIGINT as pending_feedback,
    COUNT(*) FILTER (WHERE cf.status = 'resolved')::BIGINT as resolved_feedback,
    COALESCE(AVG(cf.rating), 0) as avg_rating,
    -- NPS calculation (promoters - detractors) / total * 100
    CASE WHEN COUNT(*) FILTER (WHERE cf.rating IS NOT NULL) > 0 THEN
      ((COUNT(*) FILTER (WHERE cf.rating >= 9)::NUMERIC - COUNT(*) FILTER (WHERE cf.rating <= 6)::NUMERIC) 
       / COUNT(*) FILTER (WHERE cf.rating IS NOT NULL) * 100)
    ELSE 0 END as nps_score,
    COUNT(*) FILTER (WHERE cf.rating >= 9)::BIGINT as promoters,
    COUNT(*) FILTER (WHERE cf.rating >= 7 AND cf.rating <= 8)::BIGINT as passives,
    COUNT(*) FILTER (WHERE cf.rating <= 6)::BIGINT as detractors,
    COUNT(*) FILTER (WHERE cf.created_at >= CURRENT_DATE)::BIGINT as today_feedback,
    COALESCE(AVG(EXTRACT(EPOCH FROM (cf.responded_at - cf.created_at))/3600) FILTER (WHERE cf.responded_at IS NOT NULL), 0) as avg_response_hours
  FROM customer_feedback cf;
END;
$$;

-- Respond to feedback
CREATE OR REPLACE FUNCTION admin_respond_feedback(
  p_feedback_id UUID,
  p_admin_id UUID,
  p_response TEXT
)
RETURNS TABLE (success BOOLEAN, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE customer_feedback SET 
    admin_response = p_response,
    responded_by = p_admin_id,
    responded_at = NOW(),
    status = 'resolved'
  WHERE id = p_feedback_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Feedback not found'::TEXT;
    RETURN;
  END IF;
  
  RETURN QUERY SELECT true, 'Response saved successfully'::TEXT;
END;
$$;

-- =====================================================
-- 8. ANALYTICS & REPORTS
-- =====================================================

-- Get comprehensive analytics
CREATE OR REPLACE FUNCTION admin_get_analytics(
  p_start_date TIMESTAMPTZ DEFAULT (NOW() - INTERVAL '30 days'),
  p_end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  -- Orders
  total_orders BIGINT,
  completed_orders BIGINT,
  cancelled_orders BIGINT,
  completion_rate NUMERIC,
  -- Revenue
  total_revenue NUMERIC,
  avg_order_value NUMERIC,
  total_tips NUMERIC,
  total_discounts NUMERIC,
  -- Users
  new_users BIGINT,
  active_users BIGINT,
  returning_users BIGINT,
  -- Providers
  active_providers BIGINT,
  new_providers BIGINT,
  avg_provider_rating NUMERIC,
  -- Performance
  avg_wait_time_minutes NUMERIC,
  avg_trip_duration_minutes NUMERIC,
  peak_hour INT,
  busiest_day TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH ride_stats AS (
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'completed') as completed,
      COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
      COALESCE(SUM(total_fare) FILTER (WHERE status = 'completed'), 0) as revenue,
      COALESCE(SUM(tip_amount), 0) as tips,
      COALESCE(SUM(promo_discount), 0) as discounts,
      AVG(EXTRACT(EPOCH FROM (matched_at - created_at))/60) FILTER (WHERE matched_at IS NOT NULL) as avg_wait,
      AVG(EXTRACT(EPOCH FROM (completed_at - pickup_at))/60) FILTER (WHERE completed_at IS NOT NULL AND pickup_at IS NOT NULL) as avg_duration
    FROM ride_requests
    WHERE created_at BETWEEN p_start_date AND p_end_date
  ),
  user_stats AS (
    SELECT 
      COUNT(*) FILTER (WHERE created_at BETWEEN p_start_date AND p_end_date) as new_users,
      COUNT(DISTINCT user_id) as active_users
    FROM users u
    LEFT JOIN ride_requests r ON u.id = r.user_id AND r.created_at BETWEEN p_start_date AND p_end_date
  ),
  provider_stats AS (
    SELECT 
      COUNT(*) FILTER (WHERE is_available = true) as active,
      COUNT(*) FILTER (WHERE created_at BETWEEN p_start_date AND p_end_date) as new_providers,
      AVG(rating) as avg_rating
    FROM service_providers
  ),
  peak_analysis AS (
    SELECT 
      EXTRACT(HOUR FROM created_at)::INT as hour,
      COUNT(*) as cnt
    FROM ride_requests
    WHERE created_at BETWEEN p_start_date AND p_end_date
    GROUP BY EXTRACT(HOUR FROM created_at)
    ORDER BY cnt DESC
    LIMIT 1
  ),
  day_analysis AS (
    SELECT 
      to_char(created_at, 'Day') as day_name,
      COUNT(*) as cnt
    FROM ride_requests
    WHERE created_at BETWEEN p_start_date AND p_end_date
    GROUP BY to_char(created_at, 'Day')
    ORDER BY cnt DESC
    LIMIT 1
  )
  SELECT 
    rs.total::BIGINT,
    rs.completed::BIGINT,
    rs.cancelled::BIGINT,
    CASE WHEN rs.total > 0 THEN (rs.completed::NUMERIC / rs.total * 100) ELSE 0 END,
    rs.revenue,
    CASE WHEN rs.completed > 0 THEN (rs.revenue / rs.completed) ELSE 0 END,
    rs.tips,
    rs.discounts,
    us.new_users::BIGINT,
    us.active_users::BIGINT,
    0::BIGINT, -- returning_users placeholder
    ps.active::BIGINT,
    ps.new_providers::BIGINT,
    COALESCE(ps.avg_rating, 0),
    COALESCE(rs.avg_wait, 0),
    COALESCE(rs.avg_duration, 0),
    COALESCE(pa.hour, 0),
    COALESCE(TRIM(da.day_name), 'N/A')
  FROM ride_stats rs
  CROSS JOIN user_stats us
  CROSS JOIN provider_stats ps
  LEFT JOIN peak_analysis pa ON true
  LEFT JOIN day_analysis da ON true;
END;
$$;

-- Get revenue breakdown by service
CREATE OR REPLACE FUNCTION admin_get_revenue_breakdown(
  p_start_date TIMESTAMPTZ DEFAULT (NOW() - INTERVAL '30 days'),
  p_end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  service_type TEXT,
  total_orders BIGINT,
  completed_orders BIGINT,
  total_revenue NUMERIC,
  avg_order_value NUMERIC,
  growth_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  -- Rides
  SELECT 
    'ride'::TEXT,
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE status = 'completed')::BIGINT,
    COALESCE(SUM(total_fare) FILTER (WHERE status = 'completed'), 0),
    COALESCE(AVG(total_fare) FILTER (WHERE status = 'completed'), 0),
    0::NUMERIC -- growth_rate placeholder
  FROM ride_requests
  WHERE created_at BETWEEN p_start_date AND p_end_date
  
  UNION ALL
  
  -- Deliveries
  SELECT 
    'delivery'::TEXT,
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE status = 'completed')::BIGINT,
    COALESCE(SUM(total_price) FILTER (WHERE status = 'completed'), 0),
    COALESCE(AVG(total_price) FILTER (WHERE status = 'completed'), 0),
    0::NUMERIC
  FROM delivery_requests
  WHERE created_at BETWEEN p_start_date AND p_end_date
  
  UNION ALL
  
  -- Shopping
  SELECT 
    'shopping'::TEXT,
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE status = 'completed')::BIGINT,
    COALESCE(SUM(total_price) FILTER (WHERE status = 'completed'), 0),
    COALESCE(AVG(total_price) FILTER (WHERE status = 'completed'), 0),
    0::NUMERIC
  FROM shopping_requests
  WHERE created_at BETWEEN p_start_date AND p_end_date
  
  UNION ALL
  
  -- Queue bookings
  SELECT 
    'queue'::TEXT,
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE status = 'completed')::BIGINT,
    COALESCE(SUM(service_fee) FILTER (WHERE status = 'completed'), 0),
    COALESCE(AVG(service_fee) FILTER (WHERE status = 'completed'), 0),
    0::NUMERIC
  FROM queue_bookings
  WHERE created_at BETWEEN p_start_date AND p_end_date
  
  UNION ALL
  
  -- Moving
  SELECT 
    'moving'::TEXT,
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE status = 'completed')::BIGINT,
    COALESCE(SUM(final_price) FILTER (WHERE status = 'completed'), 0),
    COALESCE(AVG(final_price) FILTER (WHERE status = 'completed'), 0),
    0::NUMERIC
  FROM moving_requests
  WHERE created_at BETWEEN p_start_date AND p_end_date
  
  UNION ALL
  
  -- Laundry
  SELECT 
    'laundry'::TEXT,
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE status = 'completed')::BIGINT,
    COALESCE(SUM(final_price) FILTER (WHERE status = 'completed'), 0),
    COALESCE(AVG(final_price) FILTER (WHERE status = 'completed'), 0),
    0::NUMERIC
  FROM laundry_requests
  WHERE created_at BETWEEN p_start_date AND p_end_date;
END;
$$;

-- Get daily revenue trend
CREATE OR REPLACE FUNCTION admin_get_revenue_trend(
  p_days INT DEFAULT 30
)
RETURNS TABLE (
  date DATE,
  revenue NUMERIC,
  orders BIGINT,
  avg_value NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH dates AS (
    SELECT generate_series(
      CURRENT_DATE - (p_days - 1),
      CURRENT_DATE,
      '1 day'::INTERVAL
    )::DATE as date
  ),
  daily_rides AS (
    SELECT 
      created_at::DATE as date,
      SUM(total_fare) as revenue,
      COUNT(*) as orders
    FROM ride_requests
    WHERE status = 'completed'
      AND created_at >= CURRENT_DATE - p_days
    GROUP BY created_at::DATE
  )
  SELECT 
    d.date,
    COALESCE(dr.revenue, 0) as revenue,
    COALESCE(dr.orders, 0)::BIGINT as orders,
    CASE WHEN COALESCE(dr.orders, 0) > 0 
      THEN COALESCE(dr.revenue, 0) / dr.orders 
      ELSE 0 
    END as avg_value
  FROM dates d
  LEFT JOIN daily_rides dr ON d.date = dr.date
  ORDER BY d.date;
END;
$$;

-- =====================================================
-- 9. ENSURE REQUIRED TABLES EXIST
-- =====================================================

-- Ensure refunds table exists
CREATE TABLE IF NOT EXISTS refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID,
  service_type TEXT,
  tracking_id TEXT,
  user_id UUID REFERENCES users(id),
  amount NUMERIC NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'pending',
  refund_method TEXT DEFAULT 'wallet',
  processed_by UUID,
  processed_at TIMESTAMPTZ,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure fraud_alerts table exists
CREATE TABLE IF NOT EXISTS fraud_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL,
  severity TEXT DEFAULT 'medium',
  user_id UUID REFERENCES users(id),
  provider_id UUID,
  order_id UUID,
  tracking_id TEXT,
  description TEXT,
  evidence JSONB,
  status TEXT DEFAULT 'open',
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  resolution_action TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure customer_feedback table exists
CREATE TABLE IF NOT EXISTS customer_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  feedback_type TEXT,
  category TEXT,
  subject TEXT,
  message TEXT,
  rating INT,
  status TEXT DEFAULT 'pending',
  admin_response TEXT,
  responded_by UUID,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns to existing tables if needed
DO $$
BEGIN
  -- Add reward_amount to referrals if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'referrals' AND column_name = 'reward_amount') THEN
    ALTER TABLE referrals ADD COLUMN reward_amount NUMERIC DEFAULT 50;
  END IF;
  
  -- Add reward_paid to referrals if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'referrals' AND column_name = 'reward_paid') THEN
    ALTER TABLE referrals ADD COLUMN reward_paid BOOLEAN DEFAULT false;
  END IF;
  
  -- Add completed_at to referrals if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'referrals' AND column_name = 'completed_at') THEN
    ALTER TABLE referrals ADD COLUMN completed_at TIMESTAMPTZ;
  END IF;
  
  -- Add provider_response to ride_ratings if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ride_ratings' AND column_name = 'provider_response') THEN
    ALTER TABLE ride_ratings ADD COLUMN provider_response TEXT;
  END IF;
  
  -- Add response_at to ride_ratings if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ride_ratings' AND column_name = 'response_at') THEN
    ALTER TABLE ride_ratings ADD COLUMN response_at TIMESTAMPTZ;
  END IF;
  
  -- Add tags to ride_ratings if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ride_ratings' AND column_name = 'tags') THEN
    ALTER TABLE ride_ratings ADD COLUMN tags TEXT[];
  END IF;
  
  -- Add provider_response to delivery_ratings if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'delivery_ratings' AND column_name = 'provider_response') THEN
    ALTER TABLE delivery_ratings ADD COLUMN provider_response TEXT;
  END IF;
  
  -- Add response_at to delivery_ratings if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'delivery_ratings' AND column_name = 'response_at') THEN
    ALTER TABLE delivery_ratings ADD COLUMN response_at TIMESTAMPTZ;
  END IF;
  
  -- Add tags to delivery_ratings if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'delivery_ratings' AND column_name = 'tags') THEN
    ALTER TABLE delivery_ratings ADD COLUMN tags TEXT[];
  END IF;
END $$;

-- =====================================================
-- 10. RLS POLICIES
-- =====================================================

-- Refunds RLS
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin full access to refunds" ON refunds;
CREATE POLICY "Admin full access to refunds" ON refunds
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Fraud alerts RLS
ALTER TABLE fraud_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin full access to fraud_alerts" ON fraud_alerts;
CREATE POLICY "Admin full access to fraud_alerts" ON fraud_alerts
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Customer feedback RLS
ALTER TABLE customer_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own feedback" ON customer_feedback;
CREATE POLICY "Users can view own feedback" ON customer_feedback
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create feedback" ON customer_feedback;
CREATE POLICY "Users can create feedback" ON customer_feedback
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admin full access to customer_feedback" ON customer_feedback;
CREATE POLICY "Admin full access to customer_feedback" ON customer_feedback
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- 11. GRANT PERMISSIONS
-- =====================================================

-- Referrals
GRANT EXECUTE ON FUNCTION admin_get_referrals(TEXT, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_count_referrals(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_referral_stats() TO authenticated;

-- Loyalty
GRANT EXECUTE ON FUNCTION admin_get_loyalty_users(TEXT, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_loyalty_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION admin_adjust_loyalty_points(UUID, INT, TEXT, UUID) TO authenticated;

-- Refunds
GRANT EXECUTE ON FUNCTION admin_get_refunds(TEXT, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_count_refunds(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_refund_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION admin_process_refund(UUID, TEXT, UUID, TEXT) TO authenticated;

-- Fraud
GRANT EXECUTE ON FUNCTION admin_get_fraud_alerts(TEXT, TEXT, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_fraud_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION admin_resolve_fraud_alert(UUID, UUID, TEXT, TEXT) TO authenticated;

-- Incentives
GRANT EXECUTE ON FUNCTION admin_get_incentives(TEXT, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_incentive_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION admin_create_incentive(TEXT, TEXT, TEXT, INT, NUMERIC, TIMESTAMPTZ, TIMESTAMPTZ, TEXT[]) TO authenticated;

-- Ratings
GRANT EXECUTE ON FUNCTION admin_get_ratings(TEXT, INT, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_rating_stats() TO authenticated;

-- Feedback
GRANT EXECUTE ON FUNCTION admin_get_feedback(TEXT, TEXT, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_feedback_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION admin_respond_feedback(UUID, UUID, TEXT) TO authenticated;

-- Analytics
GRANT EXECUTE ON FUNCTION admin_get_analytics(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_revenue_breakdown(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_revenue_trend(INT) TO authenticated;

-- Table permissions
GRANT ALL ON refunds TO authenticated;
GRANT ALL ON fraud_alerts TO authenticated;
GRANT ALL ON customer_feedback TO authenticated;
