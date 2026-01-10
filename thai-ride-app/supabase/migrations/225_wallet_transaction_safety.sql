-- =====================================================
-- CRITICAL: Wallet Transaction Safety & Integrity
-- ระบบป้องกันการหักลบเครดิตผิดพลาด
-- =====================================================

-- 1. Add constraints to prevent negative balance
ALTER TABLE user_wallets
  ADD CONSTRAINT check_balance_non_negative 
  CHECK (balance >= 0);

ALTER TABLE user_wallets
  ADD CONSTRAINT check_total_earned_non_negative 
  CHECK (total_earned >= 0);

ALTER TABLE user_wallets
  ADD CONSTRAINT check_total_spent_non_negative 
  CHECK (total_spent >= 0);

-- 2. Add transaction amount validation
ALTER TABLE wallet_transactions
  ADD CONSTRAINT check_amount_not_zero 
  CHECK (amount != 0);

-- 3. Create atomic transaction function with SERIALIZABLE isolation
CREATE OR REPLACE FUNCTION process_wallet_transaction(
  p_user_id UUID,
  p_type VARCHAR(20),
  p_amount DECIMAL(12,2),
  p_description TEXT,
  p_reference_type VARCHAR(50) DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  transaction_id UUID,
  new_balance DECIMAL(12,2)
) AS $$
DECLARE
  v_wallet_id UUID;
  v_current_balance DECIMAL(12,2);
  v_new_balance DECIMAL(12,2);
  v_transaction_id UUID;
  v_is_debit BOOLEAN;
BEGIN
  -- Set transaction isolation level to SERIALIZABLE for maximum safety
  SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
  
  -- Lock wallet row for update (prevents concurrent modifications)
  SELECT id, balance INTO v_wallet_id, v_current_balance
  FROM user_wallets
  WHERE user_id = p_user_id
  FOR UPDATE;
  
  -- Ensure wallet exists
  IF v_wallet_id IS NULL THEN
    RETURN QUERY SELECT 
      FALSE,
      'Wallet not found'::TEXT,
      NULL::UUID,
      0::DECIMAL(12,2);
    RETURN;
  END IF;
  
  -- Determine if this is a debit (negative) transaction
  v_is_debit := p_type IN ('payment', 'withdrawal', 'fee');
  
  -- Calculate new balance
  IF v_is_debit THEN
    v_new_balance := v_current_balance - ABS(p_amount);
  ELSE
    v_new_balance := v_current_balance + ABS(p_amount);
  END IF;
  
  -- CRITICAL: Check for sufficient balance on debit
  IF v_is_debit AND v_new_balance < 0 THEN
    RETURN QUERY SELECT 
      FALSE,
      'Insufficient balance'::TEXT,
      NULL::UUID,
      v_current_balance;
    RETURN;
  END IF;
  
  -- CRITICAL: Validate amount is positive
  IF ABS(p_amount) <= 0 THEN
    RETURN QUERY SELECT 
      FALSE,
      'Invalid amount'::TEXT,
      NULL::UUID,
      v_current_balance;
    RETURN;
  END IF;
  
  -- Create transaction record
  INSERT INTO wallet_transactions (
    user_id,
    type,
    amount,
    balance_before,
    balance_after,
    description,
    reference_type,
    reference_id,
    status,
    created_at
  ) VALUES (
    p_user_id,
    p_type,
    CASE WHEN v_is_debit THEN -ABS(p_amount) ELSE ABS(p_amount) END,
    v_current_balance,
    v_new_balance,
    p_description,
    p_reference_type,
    p_reference_id,
    'completed',
    NOW()
  )
  RETURNING id INTO v_transaction_id;
  
  -- Update wallet balance
  UPDATE user_wallets
  SET 
    balance = v_new_balance,
    total_earned = CASE 
      WHEN NOT v_is_debit THEN total_earned + ABS(p_amount)
      ELSE total_earned
    END,
    total_spent = CASE 
      WHEN v_is_debit THEN total_spent + ABS(p_amount)
      ELSE total_spent
    END,
    updated_at = NOW()
  WHERE id = v_wallet_id;
  
  -- Log to audit table
  INSERT INTO wallet_audit_log (
    wallet_id,
    user_id,
    action,
    old_balance,
    new_balance,
    amount,
    transaction_id,
    metadata
  ) VALUES (
    v_wallet_id,
    p_user_id,
    p_type,
    v_current_balance,
    v_new_balance,
    p_amount,
    v_transaction_id,
    jsonb_build_object(
      'description', p_description,
      'reference_type', p_reference_type,
      'reference_id', p_reference_id
    )
  );
  
  -- Return success
  RETURN QUERY SELECT 
    TRUE,
    'Transaction completed successfully'::TEXT,
    v_transaction_id,
    v_new_balance;
    
EXCEPTION
  WHEN OTHERS THEN
    -- Log error
    RAISE WARNING 'Transaction failed: %', SQLERRM;
    
    RETURN QUERY SELECT 
      FALSE,
      ('Transaction failed: ' || SQLERRM)::TEXT,
      NULL::UUID,
      v_current_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create safe payment function
CREATE OR REPLACE FUNCTION pay_from_wallet_safe(
  p_user_id UUID,
  p_amount DECIMAL(12,2),
  p_description TEXT,
  p_reference_type VARCHAR(50) DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  transaction_id UUID,
  new_balance DECIMAL(12,2)
) AS $$
BEGIN
  -- Validate amount
  IF p_amount <= 0 THEN
    RETURN QUERY SELECT 
      FALSE,
      'Amount must be positive'::TEXT,
      NULL::UUID,
      0::DECIMAL(12,2);
    RETURN;
  END IF;
  
  -- Process transaction
  RETURN QUERY 
  SELECT * FROM process_wallet_transaction(
    p_user_id,
    'payment',
    p_amount,
    p_description,
    p_reference_type,
    p_reference_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create safe topup function
CREATE OR REPLACE FUNCTION topup_wallet_safe(
  p_user_id UUID,
  p_amount DECIMAL(12,2),
  p_description TEXT,
  p_reference_type VARCHAR(50) DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  transaction_id UUID,
  new_balance DECIMAL(12,2)
) AS $$
BEGIN
  -- Validate amount
  IF p_amount <= 0 THEN
    RETURN QUERY SELECT 
      FALSE,
      'Amount must be positive'::TEXT,
      NULL::UUID,
      0::DECIMAL(12,2);
    RETURN;
  END IF;
  
  -- Process transaction
  RETURN QUERY 
  SELECT * FROM process_wallet_transaction(
    p_user_id,
    'topup',
    p_amount,
    p_description,
    p_reference_type,
    p_reference_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create balance verification function
CREATE OR REPLACE FUNCTION verify_wallet_balance(p_user_id UUID)
RETURNS TABLE (
  is_valid BOOLEAN,
  calculated_balance DECIMAL(12,2),
  stored_balance DECIMAL(12,2),
  difference DECIMAL(12,2),
  message TEXT
) AS $$
DECLARE
  v_calculated_balance DECIMAL(12,2);
  v_stored_balance DECIMAL(12,2);
  v_difference DECIMAL(12,2);
BEGIN
  -- Calculate balance from transactions
  SELECT COALESCE(SUM(amount), 0)
  INTO v_calculated_balance
  FROM wallet_transactions
  WHERE user_id = p_user_id AND status = 'completed';
  
  -- Get stored balance
  SELECT balance
  INTO v_stored_balance
  FROM user_wallets
  WHERE user_id = p_user_id;
  
  -- Calculate difference
  v_difference := ABS(v_calculated_balance - COALESCE(v_stored_balance, 0));
  
  -- Return result
  RETURN QUERY SELECT 
    v_difference < 0.01, -- Allow 1 cent tolerance for rounding
    v_calculated_balance,
    COALESCE(v_stored_balance, 0),
    v_difference,
    CASE 
      WHEN v_difference < 0.01 THEN 'Balance is correct'
      ELSE 'Balance mismatch detected!'
    END::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create daily balance reconciliation function
CREATE OR REPLACE FUNCTION reconcile_wallet_balance(p_user_id UUID)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  old_balance DECIMAL(12,2),
  new_balance DECIMAL(12,2)
) AS $$
DECLARE
  v_calculated_balance DECIMAL(12,2);
  v_stored_balance DECIMAL(12,2);
  v_wallet_id UUID;
BEGIN
  -- Lock wallet
  SELECT id, balance INTO v_wallet_id, v_stored_balance
  FROM user_wallets
  WHERE user_id = p_user_id
  FOR UPDATE;
  
  -- Calculate correct balance
  SELECT COALESCE(SUM(amount), 0)
  INTO v_calculated_balance
  FROM wallet_transactions
  WHERE user_id = p_user_id AND status = 'completed';
  
  -- Update if different
  IF ABS(v_calculated_balance - v_stored_balance) >= 0.01 THEN
    UPDATE user_wallets
    SET 
      balance = v_calculated_balance,
      updated_at = NOW()
    WHERE id = v_wallet_id;
    
    -- Log reconciliation
    INSERT INTO wallet_audit_log (
      wallet_id,
      user_id,
      action,
      old_balance,
      new_balance,
      amount,
      metadata
    ) VALUES (
      v_wallet_id,
      p_user_id,
      'reconciliation',
      v_stored_balance,
      v_calculated_balance,
      v_calculated_balance - v_stored_balance,
      jsonb_build_object(
        'reason', 'balance_mismatch',
        'difference', v_calculated_balance - v_stored_balance
      )
    );
    
    RETURN QUERY SELECT 
      TRUE,
      'Balance reconciled'::TEXT,
      v_stored_balance,
      v_calculated_balance;
  ELSE
    RETURN QUERY SELECT 
      TRUE,
      'Balance is correct'::TEXT,
      v_stored_balance,
      v_stored_balance;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Grant permissions
GRANT EXECUTE ON FUNCTION process_wallet_transaction TO authenticated;
GRANT EXECUTE ON FUNCTION pay_from_wallet_safe TO authenticated;
GRANT EXECUTE ON FUNCTION topup_wallet_safe TO authenticated;
GRANT EXECUTE ON FUNCTION verify_wallet_balance TO authenticated;
GRANT EXECUTE ON FUNCTION reconcile_wallet_balance TO authenticated;

-- 9. Create index for performance
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_status 
  ON wallet_transactions(user_id, status);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created 
  ON wallet_transactions(created_at DESC);

-- 10. Add comments
COMMENT ON FUNCTION process_wallet_transaction IS 'CRITICAL: Atomic transaction processing with SERIALIZABLE isolation';
COMMENT ON FUNCTION pay_from_wallet_safe IS 'Safe payment function with balance validation';
COMMENT ON FUNCTION topup_wallet_safe IS 'Safe topup function with amount validation';
COMMENT ON FUNCTION verify_wallet_balance IS 'Verify wallet balance integrity';
COMMENT ON FUNCTION reconcile_wallet_balance IS 'Reconcile wallet balance from transactions';
