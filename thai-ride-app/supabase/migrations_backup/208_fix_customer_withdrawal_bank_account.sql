-- ============================================
-- Migration: 208_fix_customer_withdrawal_bank_account.sql
-- Feature: F05 - Fix Customer Withdrawal Bank Account Issue
-- Date: 2026-01-03
-- ============================================
-- Description: Fix bank_account_id column issue in customer_withdrawals
-- The table was recreated in migration 206 without bank_account_id
-- This migration ensures compatibility with both old and new functions
-- ============================================

-- 1. Drop old functions that use bank_account_id
DROP FUNCTION IF EXISTS request_customer_withdrawal(UUID, UUID, DECIMAL);
DROP FUNCTION IF EXISTS get_customer_withdrawals(UUID, INTEGER);
DROP FUNCTION IF EXISTS admin_get_customer_withdrawals(TEXT, INTEGER, INTEGER);

-- 2. Recreate get_customer_withdrawals function (without bank_account_id)
CREATE OR REPLACE FUNCTION get_customer_withdrawals(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  withdrawal_uid TEXT,
  amount DECIMAL(10,2),
  bank_name TEXT,
  bank_account_number TEXT,
  bank_account_name TEXT,
  status TEXT,
  reason TEXT,
  admin_notes TEXT,
  processed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cw.id,
    cw.withdrawal_uid,
    cw.amount,
    cw.bank_name,
    cw.bank_account_number,
    cw.bank_account_name,
    cw.status,
    cw.reason,
    cw.admin_notes,
    cw.processed_at,
    cw.completed_at,
    cw.created_at
  FROM customer_withdrawals cw
  WHERE cw.user_id = p_user_id
  ORDER BY cw.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Grant permissions
GRANT EXECUTE ON FUNCTION get_customer_withdrawals TO anon, authenticated;

-- 4. Verify table structure
DO $$
BEGIN
  -- Check if bank_account_id column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customer_withdrawals' 
    AND column_name = 'bank_account_id'
  ) THEN
    RAISE NOTICE 'Warning: bank_account_id column still exists in customer_withdrawals table';
    RAISE NOTICE 'Consider dropping it if not needed: ALTER TABLE customer_withdrawals DROP COLUMN bank_account_id;';
  ELSE
    RAISE NOTICE 'OK: customer_withdrawals table structure is correct (no bank_account_id)';
  END IF;
END $$;

-- ROLLBACK COMMANDS (for reference):
-- This migration fixes function signatures, no rollback needed
-- Original functions are already replaced in migration 206
