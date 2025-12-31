-- ============================================
-- Migration: 207_wallet_system_optimization.sql
-- Feature: F05 - Wallet System Optimization
-- Date: 2024-12-30
-- ============================================
-- Description: Optimize wallet system performance and add missing indexes
-- Tables: user_wallets, wallet_transactions, topup_requests, customer_withdrawals
-- RLS: Enhanced
-- Realtime: Optimized
-- ============================================

-- 1. Add missing indexes for better performance
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_created 
  ON wallet_transactions(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_topup_requests_user_status 
  ON topup_requests(user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_customer_withdrawals_user_status 
  ON customer_withdrawals(user_id, status, created_at DESC);

-- 2. Create optimized wallet dashboard function
CREATE OR REPLACE FUNCTION get_wallet_dashboard(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
  v_balance RECORD;
  v_transactions JSON;
  v_topup_requests JSON;
  v_withdrawals JSON;
BEGIN
  -- Get wallet balance
  SELECT balance, total_earned, total_spent
  INTO v_balance
  FROM user_wallets
  WHERE user_id = p_user_id;

  -- Get recent transactions (last 10)
  SELECT json_agg(
    json_build_object(
      'id', id,
      'type', type,
      'amount', amount,
      'description', description,
      'created_at', created_at,
      'balance_after', balance_after
    ) ORDER BY created_at DESC
  )
  INTO v_transactions
  FROM (
    SELECT * FROM wallet_transactions
    WHERE user_id = p_user_id
    ORDER BY created_at DESC
    LIMIT 10
  ) t;

  -- Get pending topup requests
  SELECT json_agg(
    json_build_object(
      'id', id,
      'tracking_id', tracking_id,
      'amount', amount,
      'payment_method', payment_method,
      'status', status,
      'created_at', created_at,
      'admin_note', admin_note
    ) ORDER BY created_at DESC
  )
  INTO v_topup_requests
  FROM topup_requests
  WHERE user_id = p_user_id
    AND status IN ('pending', 'approved', 'rejected')
  ORDER BY created_at DESC
  LIMIT 20;

  -- Get recent withdrawals
  SELECT json_agg(
    json_build_object(
      'id', id,
      'amount', amount,
      'status', status,
      'bank_name', bank_name,
      'account_number', account_number,
      'created_at', created_at,
      'failed_reason', failed_reason
    ) ORDER BY created_at DESC
  )
  INTO v_withdrawals
  FROM customer_withdrawals
  WHERE user_id = p_user_id
  ORDER BY created_at DESC
  LIMIT 10;

  -- Build result
  v_result := json_build_object(
    'balance', COALESCE(v_balance.balance, 0),
    'total_earned', COALESCE(v_balance.total_earned, 0),
    'total_spent', COALESCE(v_balance.total_spent, 0),
    'transactions', COALESCE(v_transactions, '[]'::json),
    'topup_requests', COALESCE(v_topup_requests, '[]'::json),
    'withdrawals', COALESCE(v_withdrawals, '[]'::json)
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Enhanced RLS policies with better performance
DROP POLICY IF EXISTS "wallet_transactions_user_access" ON wallet_transactions;
CREATE POLICY "wallet_transactions_user_access" ON wallet_transactions
  FOR ALL TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 4. Add wallet balance validation function
CREATE OR REPLACE FUNCTION validate_wallet_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure balance never goes negative
  IF NEW.balance < 0 THEN
    RAISE EXCEPTION 'Wallet balance cannot be negative: %', NEW.balance;
  END IF;
  
  -- Update timestamp
  NEW.updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for balance validation
DROP TRIGGER IF EXISTS trigger_validate_wallet_balance ON user_wallets;
CREATE TRIGGER trigger_validate_wallet_balance
  BEFORE UPDATE ON user_wallets
  FOR EACH ROW
  EXECUTE FUNCTION validate_wallet_balance();

-- 5. Create wallet statistics function for admin
CREATE OR REPLACE FUNCTION get_wallet_statistics()
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'total_users_with_wallet', (
      SELECT COUNT(*) FROM user_wallets WHERE balance > 0
    ),
    'total_balance', (
      SELECT COALESCE(SUM(balance), 0) FROM user_wallets
    ),
    'pending_topups', (
      SELECT COUNT(*) FROM topup_requests WHERE status = 'pending'
    ),
    'pending_topup_amount', (
      SELECT COALESCE(SUM(amount), 0) FROM topup_requests WHERE status = 'pending'
    ),
    'pending_withdrawals', (
      SELECT COUNT(*) FROM customer_withdrawals WHERE status = 'pending'
    ),
    'pending_withdrawal_amount', (
      SELECT COALESCE(SUM(amount), 0) FROM customer_withdrawals WHERE status = 'pending'
    ),
    'daily_transactions', (
      SELECT COUNT(*) FROM wallet_transactions 
      WHERE created_at >= CURRENT_DATE
    ),
    'daily_transaction_volume', (
      SELECT COALESCE(SUM(ABS(amount)), 0) FROM wallet_transactions 
      WHERE created_at >= CURRENT_DATE
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_wallet_dashboard(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_wallet_statistics() TO authenticated;

-- Add RLS policy for admin statistics
CREATE POLICY "admin_wallet_statistics" ON user_wallets
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );