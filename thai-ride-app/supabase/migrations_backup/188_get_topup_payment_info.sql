-- =====================================================
-- Migration: 188_get_topup_payment_info.sql
-- Feature: F05 - Get payment info for topup
-- STATUS: APPLIED VIA MCP (December 27, 2025)
-- =====================================================

-- Function to get payment info for topup (bank account, promptpay)
-- This is public info that customers need to see when topping up
DROP FUNCTION IF EXISTS get_topup_payment_info();

CREATE OR REPLACE FUNCTION get_topup_payment_info()
RETURNS TABLE (
  bank_name TEXT,
  bank_account_number TEXT,
  bank_account_name TEXT,
  promptpay_id TEXT,
  promptpay_name TEXT,
  min_amount DECIMAL(12,2),
  max_amount DECIMAL(12,2)
) AS $$
BEGIN
  -- Return default values (can be updated to read from a settings table later)
  RETURN QUERY
  SELECT 
    'ธนาคารกสิกรไทย'::TEXT,
    '123-4-56789-0'::TEXT,
    'บริษัท ไทยไรด์ จำกัด'::TEXT,
    '0812345678'::TEXT,
    'บริษัท ไทยไรด์ จำกัด'::TEXT,
    20::DECIMAL(12,2),
    50000::DECIMAL(12,2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to all (public info)
GRANT EXECUTE ON FUNCTION get_topup_payment_info TO anon;
GRANT EXECUTE ON FUNCTION get_topup_payment_info TO authenticated;
