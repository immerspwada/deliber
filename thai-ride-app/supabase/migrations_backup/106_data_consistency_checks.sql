-- Feature: System Decoupling Architecture
-- Migration: 106_data_consistency_checks.sql
-- Description: Data consistency validation functions
-- Task: 16 - Implement data consistency validation
-- Requirements: 13.1, 13.2, 13.3, 13.4, 13.5

-- ============================================================================
-- check_orphaned_records() - Find orphaned records
-- ============================================================================

CREATE OR REPLACE FUNCTION check_orphaned_records()
RETURNS TABLE (
  table_name TEXT,
  record_id UUID,
  issue TEXT
) AS $
BEGIN
  -- Check ride_requests with non-existent users
  RETURN QUERY
  SELECT 'ride_requests'::TEXT, r.id, 'User not found'::TEXT
  FROM ride_requests r
  LEFT JOIN users u ON r.user_id = u.id
  WHERE u.id IS NULL;

  -- Check ride_requests with non-existent providers
  RETURN QUERY
  SELECT 'ride_requests'::TEXT, r.id, 'Provider not found'::TEXT
  FROM ride_requests r
  LEFT JOIN service_providers p ON r.provider_id = p.id
  WHERE r.provider_id IS NOT NULL AND p.id IS NULL;

  -- Check delivery_requests with non-existent users
  RETURN QUERY
  SELECT 'delivery_requests'::TEXT, d.id, 'User not found'::TEXT
  FROM delivery_requests d
  LEFT JOIN users u ON d.user_id = u.id
  WHERE u.id IS NULL;

  -- Check wallet_holds without corresponding requests
  RETURN QUERY
  SELECT 'wallet_holds'::TEXT, wh.id, 'Request not found for hold'::TEXT
  FROM wallet_holds wh
  WHERE wh.status = 'held'
    AND NOT EXISTS (
      SELECT 1 FROM ride_requests WHERE id = wh.request_id
      UNION ALL
      SELECT 1 FROM delivery_requests WHERE id = wh.request_id
      UNION ALL
      SELECT 1 FROM shopping_requests WHERE id = wh.request_id
    );
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- check_invalid_status_combinations() - Find invalid status combinations
-- ============================================================================

CREATE OR REPLACE FUNCTION check_invalid_status_combinations()
RETURNS TABLE (
  table_name TEXT,
  record_id UUID,
  issue TEXT
) AS $
BEGIN
  -- Completed rides without completed_at
  RETURN QUERY
  SELECT 'ride_requests'::TEXT, id, 'Completed without completed_at'::TEXT
  FROM ride_requests
  WHERE status = 'completed' AND completed_at IS NULL;

  -- Matched rides without provider
  RETURN QUERY
  SELECT 'ride_requests'::TEXT, id, 'Matched without provider_id'::TEXT
  FROM ride_requests
  WHERE status IN ('matched', 'arriving', 'picked_up', 'in_progress', 'completed')
    AND provider_id IS NULL;

  -- Cancelled rides without cancelled_at
  RETURN QUERY
  SELECT 'ride_requests'::TEXT, id, 'Cancelled without cancelled_at'::TEXT
  FROM ride_requests
  WHERE status = 'cancelled' AND cancelled_at IS NULL;

  -- Same checks for delivery
  RETURN QUERY
  SELECT 'delivery_requests'::TEXT, id, 'Completed without completed_at'::TEXT
  FROM delivery_requests
  WHERE status = 'completed' AND completed_at IS NULL;

  RETURN QUERY
  SELECT 'delivery_requests'::TEXT, id, 'Matched without provider_id'::TEXT
  FROM delivery_requests
  WHERE status IN ('matched', 'arriving', 'picked_up', 'delivering', 'completed')
    AND provider_id IS NULL;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- check_wallet_balance_consistency() - Verify wallet balances
-- ============================================================================

CREATE OR REPLACE FUNCTION check_wallet_balance_consistency()
RETURNS TABLE (
  user_id UUID,
  wallet_balance DECIMAL,
  calculated_balance DECIMAL,
  difference DECIMAL
) AS $
BEGIN
  RETURN QUERY
  SELECT 
    w.user_id,
    w.balance,
    COALESCE(SUM(
      CASE 
        WHEN t.type IN ('topup', 'refund', 'ride_refund', 'delivery_refund', 'admin_refund') THEN t.amount
        WHEN t.type IN ('ride_payment', 'delivery_payment', 'shopping_payment', 'cancellation_fee') THEN -ABS(t.amount)
        ELSE 0
      END
    ), 0) as calc_balance,
    w.balance - COALESCE(SUM(
      CASE 
        WHEN t.type IN ('topup', 'refund', 'ride_refund', 'delivery_refund', 'admin_refund') THEN t.amount
        WHEN t.type IN ('ride_payment', 'delivery_payment', 'shopping_payment', 'cancellation_fee') THEN -ABS(t.amount)
        ELSE 0
      END
    ), 0) as diff
  FROM user_wallets w
  LEFT JOIN wallet_transactions t ON w.user_id = t.user_id AND t.status = 'completed'
  GROUP BY w.user_id, w.balance
  HAVING ABS(w.balance - COALESCE(SUM(
    CASE 
      WHEN t.type IN ('topup', 'refund', 'ride_refund', 'delivery_refund', 'admin_refund') THEN t.amount
      WHEN t.type IN ('ride_payment', 'delivery_payment', 'shopping_payment', 'cancellation_fee') THEN -ABS(t.amount)
      ELSE 0
    END
  ), 0)) > 0.01;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- run_all_consistency_checks() - Run all checks and return summary
-- ============================================================================

CREATE OR REPLACE FUNCTION run_all_consistency_checks()
RETURNS JSON AS $
DECLARE
  v_orphaned INTEGER;
  v_invalid_status INTEGER;
  v_wallet_issues INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_orphaned FROM check_orphaned_records();
  SELECT COUNT(*) INTO v_invalid_status FROM check_invalid_status_combinations();
  SELECT COUNT(*) INTO v_wallet_issues FROM check_wallet_balance_consistency();

  RETURN json_build_object(
    'timestamp', NOW(),
    'orphaned_records', v_orphaned,
    'invalid_status_combinations', v_invalid_status,
    'wallet_balance_issues', v_wallet_issues,
    'total_issues', v_orphaned + v_invalid_status + v_wallet_issues,
    'status', CASE 
      WHEN v_orphaned + v_invalid_status + v_wallet_issues = 0 THEN 'healthy'
      ELSE 'issues_found'
    END
  );
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION check_orphaned_records TO authenticated;
GRANT EXECUTE ON FUNCTION check_invalid_status_combinations TO authenticated;
GRANT EXECUTE ON FUNCTION check_wallet_balance_consistency TO authenticated;
GRANT EXECUTE ON FUNCTION run_all_consistency_checks TO authenticated;
