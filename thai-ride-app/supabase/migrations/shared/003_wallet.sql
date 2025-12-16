-- =============================================
-- SHARED MODULE: Wallet System
-- =============================================
-- Feature: F05 - Wallet/Balance
-- Used by: Customer, Provider
-- Depends on: core/001_users_auth.sql
-- =============================================

-- User wallets table
CREATE TABLE IF NOT EXISTS user_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  balance DECIMAL(12,2) DEFAULT 0,
  total_earned DECIMAL(12,2) DEFAULT 0,
  total_spent DECIMAL(12,2) DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'THB',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Wallet transactions table
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_id VARCHAR(25) UNIQUE,
  wallet_id UUID REFERENCES user_wallets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('topup', 'payment', 'refund', 'cashback', 'referral', 'promo', 'withdrawal', 'earning')),
  amount DECIMAL(12,2) NOT NULL,
  balance_before DECIMAL(12,2),
  balance_after DECIMAL(12,2),
  reference_type VARCHAR(50),
  reference_id UUID,
  description TEXT,
  status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies (permissive for dev)
CREATE POLICY "Allow all user_wallets" ON user_wallets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all wallet_transactions" ON wallet_transactions FOR ALL USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_wallets_user ON user_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet ON wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user ON wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_type ON wallet_transactions(type);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created ON wallet_transactions(created_at DESC);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE wallet_transactions;

-- Transaction tracking ID trigger
CREATE OR REPLACE FUNCTION set_transaction_tracking_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tracking_id IS NULL THEN
    NEW.tracking_id := 'TXN-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_transaction_tracking_id ON wallet_transactions;
CREATE TRIGGER trigger_transaction_tracking_id
  BEFORE INSERT ON wallet_transactions
  FOR EACH ROW EXECUTE FUNCTION set_transaction_tracking_id();

-- Ensure user wallet exists
CREATE OR REPLACE FUNCTION ensure_user_wallet(p_user_id UUID)
RETURNS UUID AS $$
DECLARE
  v_wallet_id UUID;
BEGIN
  SELECT id INTO v_wallet_id FROM user_wallets WHERE user_id = p_user_id;
  
  IF v_wallet_id IS NULL THEN
    INSERT INTO user_wallets (user_id, balance)
    VALUES (p_user_id, 0)
    RETURNING id INTO v_wallet_id;
  END IF;
  
  RETURN v_wallet_id;
END;
$$ LANGUAGE plpgsql;

-- Add wallet transaction
CREATE OR REPLACE FUNCTION add_wallet_transaction(
  p_user_id UUID,
  p_type VARCHAR(20),
  p_amount DECIMAL(12,2),
  p_description TEXT DEFAULT NULL,
  p_reference_type VARCHAR(50) DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL
)
RETURNS TABLE (
  transaction_id UUID,
  new_balance DECIMAL(12,2)
) AS $$
DECLARE
  v_wallet_id UUID;
  v_current_balance DECIMAL(12,2);
  v_new_balance DECIMAL(12,2);
  v_txn_id UUID;
BEGIN
  v_wallet_id := ensure_user_wallet(p_user_id);
  
  SELECT balance INTO v_current_balance FROM user_wallets WHERE id = v_wallet_id FOR UPDATE;
  
  IF p_type IN ('topup', 'refund', 'cashback', 'referral', 'promo', 'earning') THEN
    v_new_balance := v_current_balance + p_amount;
  ELSE
    v_new_balance := v_current_balance - p_amount;
  END IF;
  
  IF p_type = 'payment' AND v_new_balance < 0 THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;
  
  INSERT INTO wallet_transactions (
    wallet_id, user_id, type, amount, balance_before, balance_after,
    reference_type, reference_id, description
  ) VALUES (
    v_wallet_id, p_user_id, p_type, p_amount, v_current_balance, v_new_balance,
    p_reference_type, p_reference_id, p_description
  ) RETURNING id INTO v_txn_id;
  
  UPDATE user_wallets 
  SET balance = v_new_balance,
      total_earned = CASE WHEN p_type IN ('topup', 'refund', 'cashback', 'referral', 'promo', 'earning') 
                     THEN total_earned + p_amount ELSE total_earned END,
      total_spent = CASE WHEN p_type IN ('payment', 'withdrawal') 
                    THEN total_spent + p_amount ELSE total_spent END,
      updated_at = NOW()
  WHERE id = v_wallet_id;
  
  RETURN QUERY SELECT v_txn_id, v_new_balance;
END;
$$ LANGUAGE plpgsql;

-- Get wallet balance
CREATE OR REPLACE FUNCTION get_wallet_balance(p_user_id UUID)
RETURNS TABLE (
  balance DECIMAL(12,2),
  total_earned DECIMAL(12,2),
  total_spent DECIMAL(12,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT w.balance, w.total_earned, w.total_spent
  FROM user_wallets w
  WHERE w.user_id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT 0::DECIMAL(12,2), 0::DECIMAL(12,2), 0::DECIMAL(12,2);
  END IF;
END;
$$ LANGUAGE plpgsql;
