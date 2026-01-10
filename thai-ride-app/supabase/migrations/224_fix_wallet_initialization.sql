-- =====================================================
-- Fix Wallet Initialization
-- Ensure wallet is created automatically for all users
-- =====================================================

-- 1. Create or replace ensure_user_wallet function
CREATE OR REPLACE FUNCTION ensure_user_wallet(p_user_id UUID)
RETURNS UUID AS $$
DECLARE
  v_wallet_id UUID;
BEGIN
  -- Try to get existing wallet
  SELECT id INTO v_wallet_id
  FROM user_wallets
  WHERE user_id = p_user_id;
  
  -- If no wallet exists, create one
  IF v_wallet_id IS NULL THEN
    INSERT INTO user_wallets (user_id, balance, total_earned, total_spent)
    VALUES (p_user_id, 0, 0, 0)
    RETURNING id INTO v_wallet_id;
    
    RAISE NOTICE 'Created wallet % for user %', v_wallet_id, p_user_id;
  END IF;
  
  RETURN v_wallet_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update get_customer_wallet to always return data
CREATE OR REPLACE FUNCTION get_customer_wallet(p_user_id UUID)
RETURNS TABLE (
  wallet_id UUID,
  balance DECIMAL(12,2),
  total_earned DECIMAL(12,2),
  total_spent DECIMAL(12,2),
  pending_topup_amount DECIMAL(12,2),
  pending_topup_count INTEGER
) AS $$
DECLARE
  v_wallet_id UUID;
BEGIN
  -- Ensure wallet exists (will create if not exists)
  v_wallet_id := ensure_user_wallet(p_user_id);
  
  -- Return wallet data
  RETURN QUERY
  SELECT 
    w.id,
    COALESCE(w.balance, 0)::DECIMAL(12,2),
    COALESCE(w.total_earned, 0)::DECIMAL(12,2),
    COALESCE(w.total_spent, 0)::DECIMAL(12,2),
    COALESCE((
      SELECT SUM(amount) FROM topup_requests 
      WHERE user_id = p_user_id AND status = 'pending'
    ), 0)::DECIMAL(12,2),
    COALESCE((
      SELECT COUNT(*)::INTEGER FROM topup_requests 
      WHERE user_id = p_user_id AND status = 'pending'
    ), 0)
  FROM user_wallets w
  WHERE w.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create trigger to auto-create wallet on user creation
CREATE OR REPLACE FUNCTION handle_new_user_create_wallet()
RETURNS TRIGGER AS $$
BEGIN
  -- Create wallet for new user
  INSERT INTO user_wallets (user_id, balance, total_earned, total_spent)
  VALUES (NEW.id, 0, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created_create_wallet ON auth.users;

-- Create trigger
CREATE TRIGGER on_auth_user_created_create_wallet
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user_create_wallet();

-- 4. Backfill wallets for existing users without wallets
INSERT INTO user_wallets (user_id, balance, total_earned, total_spent)
SELECT 
  u.id,
  0,
  0,
  0
FROM auth.users u
LEFT JOIN user_wallets w ON w.user_id = u.id
WHERE w.id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- 5. Grant necessary permissions
GRANT EXECUTE ON FUNCTION ensure_user_wallet(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_customer_wallet(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION handle_new_user_create_wallet() TO authenticated;

-- 6. Verify RLS policies on user_wallets
DO $$
BEGIN
  -- Enable RLS if not already enabled
  ALTER TABLE user_wallets ENABLE ROW LEVEL SECURITY;
  
  -- Drop existing policies
  DROP POLICY IF EXISTS "Users can view own wallet" ON user_wallets;
  DROP POLICY IF EXISTS "Users can update own wallet" ON user_wallets;
  DROP POLICY IF EXISTS "System can create wallets" ON user_wallets;
  
  -- Create policies
  CREATE POLICY "Users can view own wallet" ON user_wallets
    FOR SELECT
    USING (auth.uid() = user_id);
  
  CREATE POLICY "Users can update own wallet" ON user_wallets
    FOR UPDATE
    USING (auth.uid() = user_id);
  
  CREATE POLICY "System can create wallets" ON user_wallets
    FOR INSERT
    WITH CHECK (true);
END $$;

-- 7. Create test data for current user (run this manually if needed)
-- This will be executed when user logs in
COMMENT ON FUNCTION ensure_user_wallet IS 'Ensures a wallet exists for the given user, creating one if necessary';
COMMENT ON FUNCTION get_customer_wallet IS 'Gets wallet information for a user, auto-creating wallet if needed';
