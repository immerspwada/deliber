-- =====================================================
-- Migration: 199_admin_withdrawals_functions.sql
-- Description: Admin functions for provider withdrawals
-- Feature: F27 - Provider Earnings & Withdrawal
-- =====================================================

-- 1. GET ALL WITHDRAWALS FOR ADMIN
CREATE OR REPLACE FUNCTION admin_get_withdrawals(
  p_status TEXT DEFAULT NULL,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  provider_id UUID,
  provider_uid TEXT,
  provider_name TEXT,
  provider_phone TEXT,
  amount NUMERIC,
  fee NUMERIC,
  net_amount NUMERIC,
  bank_name TEXT,
  bank_code TEXT,
  account_number TEXT,
  account_name TEXT,
  status TEXT,
  transaction_ref TEXT,
  failed_reason TEXT,
  created_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    w.id,
    w.provider_id,
    COALESCE(sp.provider_uid, '')::TEXT as provider_uid,
    COALESCE(u.first_name || ' ' || u.last_name, '')::TEXT as provider_name,
    COALESCE(u.phone_number, '')::TEXT as provider_phone,
    w.amount,
    COALESCE(w.fee, 0)::NUMERIC as fee,
    w.net_amount,
    COALESCE(ba.bank_name, '')::TEXT as bank_name,
    COALESCE(ba.bank_code, '')::TEXT as bank_code,
    COALESCE(ba.account_number, '')::TEXT as account_number,
    COALESCE(ba.account_name, '')::TEXT as account_name,
    COALESCE(w.status, 'pending')::TEXT as status,
    w.transaction_ref::TEXT,
    w.failed_reason::TEXT,
    w.created_at,
    w.processed_at
  FROM provider_withdrawals w
  LEFT JOIN provider_bank_accounts ba ON w.bank_account_id = ba.id
  LEFT JOIN service_providers sp ON w.provider_id = sp.id
  LEFT JOIN users u ON sp.user_id = u.id
  WHERE (p_status IS NULL OR w.status = p_status)
  ORDER BY w.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. COUNT WITHDRAWALS FOR ADMIN
CREATE OR REPLACE FUNCTION admin_count_withdrawals(
  p_status TEXT DEFAULT NULL
)
RETURNS BIGINT AS $$
DECLARE
  v_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM provider_withdrawals w
  WHERE (p_status IS NULL OR w.status = p_status);
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. GET WITHDRAWAL STATS FOR ADMIN
CREATE OR REPLACE FUNCTION admin_get_withdrawal_stats()
RETURNS TABLE (
  total_count BIGINT,
  total_amount NUMERIC,
  pending_count BIGINT,
  pending_amount NUMERIC,
  completed_count BIGINT,
  completed_amount NUMERIC,
  rejected_count BIGINT,
  rejected_amount NUMERIC,
  today_count BIGINT,
  today_amount NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_count,
    COALESCE(SUM(w.amount), 0)::NUMERIC as total_amount,
    COUNT(*) FILTER (WHERE w.status = 'pending')::BIGINT as pending_count,
    COALESCE(SUM(w.amount) FILTER (WHERE w.status = 'pending'), 0)::NUMERIC as pending_amount,
    COUNT(*) FILTER (WHERE w.status = 'completed')::BIGINT as completed_count,
    COALESCE(SUM(w.amount) FILTER (WHERE w.status = 'completed'), 0)::NUMERIC as completed_amount,
    COUNT(*) FILTER (WHERE w.status = 'rejected')::BIGINT as rejected_count,
    COALESCE(SUM(w.amount) FILTER (WHERE w.status = 'rejected'), 0)::NUMERIC as rejected_amount,
    COUNT(*) FILTER (WHERE w.created_at >= CURRENT_DATE)::BIGINT as today_count,
    COALESCE(SUM(w.amount) FILTER (WHERE w.created_at >= CURRENT_DATE), 0)::NUMERIC as today_amount
  FROM provider_withdrawals w;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. APPROVE WITHDRAWAL
CREATE OR REPLACE FUNCTION admin_approve_withdrawal(
  p_withdrawal_id UUID,
  p_transaction_ref TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT
) AS $$
DECLARE
  v_withdrawal RECORD;
BEGIN
  -- Get withdrawal
  SELECT * INTO v_withdrawal
  FROM provider_withdrawals
  WHERE id = p_withdrawal_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Withdrawal not found'::TEXT;
    RETURN;
  END IF;
  
  IF v_withdrawal.status != 'pending' THEN
    RETURN QUERY SELECT false, 'Withdrawal is not pending'::TEXT;
    RETURN;
  END IF;
  
  -- Update withdrawal
  UPDATE provider_withdrawals
  SET 
    status = 'completed',
    processed_at = NOW(),
    transaction_ref = COALESCE(p_transaction_ref, transaction_ref)
  WHERE id = p_withdrawal_id;
  
  RETURN QUERY SELECT true, 'Withdrawal approved successfully'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. REJECT WITHDRAWAL
CREATE OR REPLACE FUNCTION admin_reject_withdrawal(
  p_withdrawal_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT
) AS $$
DECLARE
  v_withdrawal RECORD;
BEGIN
  -- Get withdrawal
  SELECT * INTO v_withdrawal
  FROM provider_withdrawals
  WHERE id = p_withdrawal_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Withdrawal not found'::TEXT;
    RETURN;
  END IF;
  
  IF v_withdrawal.status != 'pending' THEN
    RETURN QUERY SELECT false, 'Withdrawal is not pending'::TEXT;
    RETURN;
  END IF;
  
  -- Update withdrawal
  UPDATE provider_withdrawals
  SET 
    status = 'rejected',
    processed_at = NOW(),
    failed_reason = p_reason
  WHERE id = p_withdrawal_id;
  
  -- TODO: Refund amount back to provider balance
  
  RETURN QUERY SELECT true, 'Withdrawal rejected'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. GRANT PERMISSIONS
GRANT EXECUTE ON FUNCTION admin_get_withdrawals(TEXT, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_count_withdrawals(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_withdrawal_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION admin_approve_withdrawal(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_reject_withdrawal(UUID, TEXT) TO authenticated;
