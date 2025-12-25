-- ========================================
-- Fix Wallet Issues Script
-- ========================================
-- Run this script to fix common wallet problems
-- Usage: psql -d your_database -f fix-wallet-issues.sql

BEGIN;

-- ========================================
-- 1. Ensure payment_settings table exists and has data
-- ========================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_settings') THEN
    RAISE NOTICE 'Creating payment_settings table...';
    CREATE TABLE payment_settings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      bank_name TEXT NOT NULL,
      bank_account_number TEXT NOT NULL,
      bank_account_name TEXT NOT NULL,
      promptpay_id TEXT,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  END IF;
END $$;

-- Insert default payment settings
INSERT INTO payment_settings (
  bank_name,
  bank_account_number,
  bank_account_name,
  promptpay_id,
  is_active
) VALUES (
  'ธนาคารกสิกรไทย',
  '123-4-56789-0',
  'บริษัท โกแบร์ จำกัด',
  '0812345678',
  true
) ON CONFLICT (id) DO UPDATE SET
  bank_name = EXCLUDED.bank_name,
  bank_account_number = EXCLUDED.bank_account_number,
  bank_account_name = EXCLUDED.bank_account_name,
  promptpay_id = EXCLUDED.promptpay_id,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

RAISE NOTICE 'Payment settings configured';

-- ========================================
-- 2. Ensure user_wallets RLS policies
-- ========================================
DO $$
BEGIN
  -- Enable RLS
  ALTER TABLE user_wallets ENABLE ROW LEVEL SECURITY;

  -- Drop existing policies if any
  DROP POLICY IF EXISTS "Users can view own wallet" ON user_wallets;
  DROP POLICY IF EXISTS "Users can update own wallet" ON user_wallets;
  DROP POLICY IF EXISTS "Admin full access to wallets" ON user_wallets;

  -- Create policies
  CREATE POLICY "Users can view own wallet"
    ON user_wallets
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

  CREATE POLICY "Users can update own wallet"
    ON user_wallets
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid());

  CREATE POLICY "Admin full access to wallets"
    ON user_wallets
    FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
      )
    );

  RAISE NOTICE 'user_wallets RLS policies created';
END $$;

-- ========================================
-- 3. Ensure wallet_transactions RLS policies
-- ========================================
DO $$
BEGIN
  ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS "Users can view own transactions" ON wallet_transactions;
  DROP POLICY IF EXISTS "Admin full access to transactions" ON wallet_transactions;

  CREATE POLICY "Users can view own transactions"
    ON wallet_transactions
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

  CREATE POLICY "Admin full access to transactions"
    ON wallet_transactions
    FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
      )
    );

  RAISE NOTICE 'wallet_transactions RLS policies created';
END $$;

-- ========================================
-- 4. Ensure topup_requests RLS policies
-- ========================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'topup_requests') THEN
    ALTER TABLE topup_requests ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users can view own topup requests" ON topup_requests;
    DROP POLICY IF EXISTS "Users can create topup requests" ON topup_requests;
    DROP POLICY IF EXISTS "Users can cancel own pending requests" ON topup_requests;
    DROP POLICY IF EXISTS "Admin full access to topup requests" ON topup_requests;

    CREATE POLICY "Users can view own topup requests"
      ON topup_requests
      FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());

    CREATE POLICY "Users can create topup requests"
      ON topup_requests
      FOR INSERT
      TO authenticated
      WITH CHECK (user_id = auth.uid());

    CREATE POLICY "Users can cancel own pending requests"
      ON topup_requests
      FOR UPDATE
      TO authenticated
      USING (user_id = auth.uid() AND status = 'pending')
      WITH CHECK (user_id = auth.uid() AND status IN ('pending', 'cancelled'));

    CREATE POLICY "Admin full access to topup requests"
      ON topup_requests
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM users
          WHERE users.id = auth.uid()
          AND users.role = 'admin'
        )
      );

    RAISE NOTICE 'topup_requests RLS policies created';
  END IF;
END $$;

-- ========================================
-- 5. Ensure payment_settings RLS policies
-- ========================================
DO $$
BEGIN
  ALTER TABLE payment_settings ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS "Anyone can view active payment settings" ON payment_settings;
  DROP POLICY IF EXISTS "Admin can manage payment settings" ON payment_settings;

  CREATE POLICY "Anyone can view active payment settings"
    ON payment_settings
    FOR SELECT
    TO authenticated
    USING (is_active = true);

  CREATE POLICY "Admin can manage payment settings"
    ON payment_settings
    FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
      )
    );

  RAISE NOTICE 'payment_settings RLS policies created';
END $$;

-- ========================================
-- 6. Create wallets for existing users without one
-- ========================================
INSERT INTO user_wallets (user_id, balance, total_earned, total_spent)
SELECT 
  u.id,
  0,
  0,
  0
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM user_wallets w WHERE w.user_id = u.id
)
ON CONFLICT (user_id) DO NOTHING;

RAISE NOTICE 'Created wallets for users without one';

-- ========================================
-- 7. Verify setup
-- ========================================
DO $$
DECLARE
  wallet_count INTEGER;
  payment_settings_count INTEGER;
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO wallet_count FROM user_wallets;
  SELECT COUNT(*) INTO payment_settings_count FROM payment_settings WHERE is_active = true;
  SELECT COUNT(*) INTO policy_count FROM pg_policies WHERE tablename = 'user_wallets';

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Verification Results:';
  RAISE NOTICE '- Total wallets: %', wallet_count;
  RAISE NOTICE '- Active payment settings: %', payment_settings_count;
  RAISE NOTICE '- user_wallets policies: %', policy_count;
  RAISE NOTICE '========================================';

  IF payment_settings_count = 0 THEN
    RAISE WARNING 'No active payment settings found!';
  END IF;

  IF policy_count < 3 THEN
    RAISE WARNING 'Missing some RLS policies!';
  END IF;
END $$;

COMMIT;

-- ========================================
-- Success Message
-- ========================================
SELECT 'Wallet issues fixed successfully!' AS status;
