-- Feature: Multi-Role Ride Booking System V3
-- Migration: 087_multi_role_ride_booking_v3.sql
-- Description: Enhanced ride booking with atomic transactions, wallet holds, and race condition handling

-- ============================================================================
-- 1. CREATE wallet_holds TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS wallet_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  ride_id UUID REFERENCES ride_requests(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount >= 0),
  status TEXT NOT NULL DEFAULT 'held',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  released_at TIMESTAMPTZ,
  
  CONSTRAINT valid_hold_status CHECK (status IN ('held', 'released', 'settled'))
);

-- Indexes for performance
CREATE INDEX idx_wallet_holds_user_id ON wallet_holds(user_id);
CREATE INDEX idx_wallet_holds_ride_id ON wallet_holds(ride_id);
CREATE INDEX idx_wallet_holds_status ON wallet_holds(status);

-- ============================================================================
-- 2. ENHANCE ride_requests TABLE
-- ============================================================================

-- Add cancellation columns if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'ride_requests' AND column_name = 'cancelled_by') THEN
    ALTER TABLE ride_requests ADD COLUMN cancelled_by UUID;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'ride_requests' AND column_name = 'cancelled_by_role') THEN
    ALTER TABLE ride_requests ADD COLUMN cancelled_by_role TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'ride_requests' AND column_name = 'cancel_reason') THEN
    ALTER TABLE ride_requests ADD COLUMN cancel_reason TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'ride_requests' AND column_name = 'cancellation_fee') THEN
    ALTER TABLE ride_requests ADD COLUMN cancellation_fee DECIMAL(10, 2) DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'ride_requests' AND column_name = 'arriving_at') THEN
    ALTER TABLE ride_requests ADD COLUMN arriving_at TIMESTAMPTZ;
  END IF;
END $$;

-- ============================================================================
-- 3. WALLET BALANCE CONSTRAINTS
-- ============================================================================

-- Ensure balance cannot be negative
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_wallets_balance_non_negative'
  ) THEN
    ALTER TABLE user_wallets 
    ADD CONSTRAINT user_wallets_balance_non_negative CHECK (balance >= 0);
  END IF;
END $$;

-- Ensure held_balance cannot be negative
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_wallets_held_balance_non_negative'
  ) THEN
    ALTER TABLE user_wallets 
    ADD CONSTRAINT user_wallets_held_balance_non_negative CHECK (held_balance >= 0);
  END IF;
END $$;

-- ============================================================================
-- 4. WALLET CONSISTENCY TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION check_wallet_consistency()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure total wallet value (balance + held) doesn't go negative
  IF NEW.balance + NEW.held_balance < 0 THEN
    RAISE EXCEPTION 'Wallet consistency violation: balance + held_balance cannot be negative';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS wallet_consistency_check ON user_wallets;
CREATE TRIGGER wallet_consistency_check
  BEFORE UPDATE ON user_wallets
  FOR EACH ROW EXECUTE FUNCTION check_wallet_consistency();

-- ============================================================================
-- 5. RLS POLICIES FOR wallet_holds
-- ============================================================================

-- Enable RLS
ALTER TABLE wallet_holds ENABLE ROW LEVEL SECURITY;

-- Customers can view their own holds
CREATE POLICY "customers_view_own_holds" ON wallet_holds
  FOR SELECT USING (auth.uid() = user_id);

-- Admins can view all holds
CREATE POLICY "admins_view_all_holds" ON wallet_holds
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- System can insert/update holds (via SECURITY DEFINER functions)
CREATE POLICY "system_manage_holds" ON wallet_holds
  FOR ALL USING (true);

-- ============================================================================
-- 6. COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE wallet_holds IS 'Tracks wallet holds for pending ride requests';
COMMENT ON COLUMN wallet_holds.status IS 'held: amount is held, released: hold cancelled, settled: payment completed';
COMMENT ON COLUMN ride_requests.cancelled_by IS 'UUID of user/provider/admin who cancelled';
COMMENT ON COLUMN ride_requests.cancelled_by_role IS 'Role of canceller: customer, provider, admin, system';
COMMENT ON COLUMN ride_requests.cancellation_fee IS 'Fee charged for cancellation (0-20% of fare)';
