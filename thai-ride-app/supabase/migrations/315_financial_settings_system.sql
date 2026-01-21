-- ============================================================================
-- Migration: 315_financial_settings_system
-- Description: Admin Financial Settings System (Commission, Withdrawal, Top-up)
-- Created: 2026-01-19
-- ============================================================================

-- ============================================================================
-- 1. CREATE TABLES
-- ============================================================================

-- Financial Settings Table
CREATE TABLE IF NOT EXISTS financial_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category TEXT NOT NULL CHECK (category IN (
    'commission',
    'withdrawal',
    'topup',
    'surge',
    'subscription'
  )),
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(category, key)
);

-- Financial Settings Audit Log
CREATE TABLE IF NOT EXISTS financial_settings_audit (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_id UUID REFERENCES financial_settings(id),
  category TEXT NOT NULL,
  key TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB NOT NULL,
  change_reason TEXT,
  changed_by UUID REFERENCES users(id) NOT NULL,
  changed_by_email TEXT,
  changed_by_name TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment Receiving Accounts (for top-up)
CREATE TABLE IF NOT EXISTS payment_receiving_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_type TEXT NOT NULL CHECK (account_type IN (
    'promptpay',
    'bank_transfer'
  )),
  account_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  bank_code TEXT,
  bank_name TEXT,
  qr_code_url TEXT,
  display_name TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 2. CREATE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_financial_settings_category ON financial_settings(category);
CREATE INDEX IF NOT EXISTS idx_financial_settings_active ON financial_settings(is_active);
CREATE INDEX IF NOT EXISTS idx_settings_audit_setting ON financial_settings_audit(setting_id);
CREATE INDEX IF NOT EXISTS idx_settings_audit_category ON financial_settings_audit(category);
CREATE INDEX IF NOT EXISTS idx_settings_audit_changed_by ON financial_settings_audit(changed_by);
CREATE INDEX IF NOT EXISTS idx_settings_audit_created ON financial_settings_audit(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_accounts_type ON payment_receiving_accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_payment_accounts_active ON payment_receiving_accounts(is_active);
CREATE INDEX IF NOT EXISTS idx_payment_accounts_order ON payment_receiving_accounts(display_order);

-- ============================================================================
-- 3. ENABLE RLS
-- ============================================================================

ALTER TABLE financial_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_settings_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_receiving_accounts ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. CREATE RLS POLICIES
-- ============================================================================

-- Financial Settings: Admin full access
DROP POLICY IF EXISTS "admin_full_access_financial_settings" ON financial_settings;
CREATE POLICY "admin_full_access_financial_settings" ON financial_settings
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Audit Log: Admin read access
DROP POLICY IF EXISTS "admin_read_audit" ON financial_settings_audit;
CREATE POLICY "admin_read_audit" ON financial_settings_audit
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Payment Accounts: Admin full access
DROP POLICY IF EXISTS "admin_full_access_payment_accounts" ON payment_receiving_accounts;
CREATE POLICY "admin_full_access_payment_accounts" ON payment_receiving_accounts
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- ============================================================================
-- 5. CREATE RPC FUNCTIONS
-- ============================================================================

-- Function: Get Financial Settings
CREATE OR REPLACE FUNCTION get_financial_settings(
  p_category TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  category TEXT,
  key TEXT,
  value JSONB,
  description TEXT,
  is_active BOOLEAN,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  -- Check admin role
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  RETURN QUERY
  SELECT
    fs.id,
    fs.category,
    fs.key,
    fs.value,
    fs.description,
    fs.is_active,
    fs.updated_at
  FROM financial_settings fs
  WHERE (p_category IS NULL OR fs.category = p_category)
  AND fs.is_active = true
  ORDER BY fs.category, fs.key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Update Financial Setting
CREATE OR REPLACE FUNCTION update_financial_setting(
  p_category TEXT,
  p_key TEXT,
  p_value JSONB,
  p_reason TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  setting_id UUID
) AS $$
DECLARE
  v_admin_id UUID;
  v_admin_email TEXT;
  v_admin_name TEXT;
  v_setting_id UUID;
  v_old_value JSONB;
BEGIN
  -- Check admin role
  SELECT id, email, full_name
  INTO v_admin_id, v_admin_email, v_admin_name
  FROM users
  WHERE id = auth.uid()
  AND role = 'admin';

  IF v_admin_id IS NULL THEN
    RETURN QUERY SELECT false, 'Unauthorized: Admin access required', NULL::UUID;
    RETURN;
  END IF;

  -- Get old value
  SELECT id, value
  INTO v_setting_id, v_old_value
  FROM financial_settings
  WHERE category = p_category
  AND key = p_key;

  -- Insert or update
  INSERT INTO financial_settings (category, key, value, updated_by)
  VALUES (p_category, p_key, p_value, v_admin_id)
  ON CONFLICT (category, key)
  DO UPDATE SET
    value = p_value,
    updated_by = v_admin_id,
    updated_at = NOW()
  RETURNING id INTO v_setting_id;

  -- Create audit log
  INSERT INTO financial_settings_audit (
    setting_id,
    category,
    key,
    old_value,
    new_value,
    change_reason,
    changed_by,
    changed_by_email,
    changed_by_name
  ) VALUES (
    v_setting_id,
    p_category,
    p_key,
    v_old_value,
    p_value,
    p_reason,
    v_admin_id,
    v_admin_email,
    v_admin_name
  );

  RETURN QUERY SELECT true, 'Settings updated successfully', v_setting_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get Settings Audit Log
CREATE OR REPLACE FUNCTION get_settings_audit_log(
  p_category TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  category TEXT,
  key TEXT,
  old_value JSONB,
  new_value JSONB,
  change_reason TEXT,
  changed_by_email TEXT,
  changed_by_name TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  -- Check admin role
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  RETURN QUERY
  SELECT
    fsa.id,
    fsa.category,
    fsa.key,
    fsa.old_value,
    fsa.new_value,
    fsa.change_reason,
    fsa.changed_by_email,
    fsa.changed_by_name,
    fsa.created_at
  FROM financial_settings_audit fsa
  WHERE (p_category IS NULL OR fsa.category = p_category)
  ORDER BY fsa.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Calculate Commission Impact
CREATE OR REPLACE FUNCTION calculate_commission_impact(
  p_service_type TEXT,
  p_new_rate DECIMAL
)
RETURNS TABLE (
  current_rate DECIMAL,
  new_rate DECIMAL,
  rate_change DECIMAL,
  estimated_monthly_impact DECIMAL,
  affected_providers INTEGER
) AS $$
DECLARE
  v_current_rate DECIMAL;
  v_monthly_revenue DECIMAL;
  v_affected_providers INTEGER;
BEGIN
  -- Check admin role
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Get current rate
  SELECT (value->>p_service_type)::DECIMAL
  INTO v_current_rate
  FROM financial_settings
  WHERE category = 'commission'
  AND key = 'service_rates';

  -- If no current rate, use 0
  v_current_rate := COALESCE(v_current_rate, 0);

  -- Calculate monthly revenue (last 30 days)
  SELECT 
    COALESCE(SUM(final_fare), 0),
    COUNT(DISTINCT provider_id)::INTEGER
  INTO v_monthly_revenue, v_affected_providers
  FROM ride_requests
  WHERE service_type = p_service_type
  AND status = 'completed'
  AND completed_at >= NOW() - INTERVAL '30 days';

  RETURN QUERY
  SELECT
    v_current_rate,
    p_new_rate,
    p_new_rate - v_current_rate AS rate_change,
    v_monthly_revenue * (p_new_rate - v_current_rate) AS estimated_monthly_impact,
    v_affected_providers;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. INSERT DEFAULT SETTINGS
-- ============================================================================

-- Commission Rates (from business model)
INSERT INTO financial_settings (category, key, value, description)
VALUES (
  'commission',
  'service_rates',
  '{
    "ride": 0.20,
    "delivery": 0.25,
    "shopping": 0.15,
    "moving": 0.18,
    "queue": 0.15,
    "laundry": 0.20
  }'::JSONB,
  'Commission rates by service type (percentage)'
)
ON CONFLICT (category, key) DO NOTHING;

-- Surge Pricing Multipliers
INSERT INTO financial_settings (category, key, value, description)
VALUES (
  'surge',
  'multipliers',
  '{
    "low_demand": 1.0,
    "medium_demand": 1.3,
    "high_demand": 1.5,
    "peak_demand": 2.0
  }'::JSONB,
  'Surge pricing multipliers by demand level'
)
ON CONFLICT (category, key) DO NOTHING;

-- Subscription Discounts
INSERT INTO financial_settings (category, key, value, description)
VALUES (
  'subscription',
  'commission_discounts',
  '{
    "basic": 0,
    "premium": 0.25,
    "pro": 0.50
  }'::JSONB,
  'Commission discount by subscription tier (percentage off)'
)
ON CONFLICT (category, key) DO NOTHING;

-- Withdrawal Settings
INSERT INTO financial_settings (category, key, value, description)
VALUES (
  'withdrawal',
  'limits',
  '{
    "min_amount": 100,
    "max_amount": 50000,
    "daily_limit": 100000,
    "bank_transfer_fee": 10,
    "promptpay_fee": 5,
    "auto_approval_threshold": 5000,
    "max_pending": 3,
    "processing_days": "1-3",
    "min_account_age_days": 7,
    "min_completed_trips": 5,
    "min_rating": 4.0
  }'::JSONB,
  'Provider withdrawal limits and fees'
)
ON CONFLICT (category, key) DO NOTHING;

-- Top-up Settings
INSERT INTO financial_settings (category, key, value, description)
VALUES (
  'topup',
  'config',
  '{
    "min_amount": 50,
    "max_amount": 50000,
    "daily_limit": 100000,
    "credit_card_fee": 0.025,
    "bank_transfer_fee": 0,
    "promptpay_fee": 0.01,
    "truemoney_fee": 0.02,
    "auto_approval_threshold": 10000,
    "expiry_hours": 24,
    "require_slip_threshold": 1000
  }'::JSONB,
  'Customer top-up configuration and fees'
)
ON CONFLICT (category, key) DO NOTHING;

-- ============================================================================
-- 7. GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE ON financial_settings TO authenticated;
GRANT SELECT ON financial_settings_audit TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON payment_receiving_accounts TO authenticated;

GRANT EXECUTE ON FUNCTION get_financial_settings TO authenticated;
GRANT EXECUTE ON FUNCTION update_financial_setting TO authenticated;
GRANT EXECUTE ON FUNCTION get_settings_audit_log TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_commission_impact TO authenticated;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

COMMENT ON TABLE financial_settings IS 'Admin financial settings for commission, withdrawal, and top-up';
COMMENT ON TABLE financial_settings_audit IS 'Audit log for all financial settings changes';
COMMENT ON TABLE payment_receiving_accounts IS 'Payment receiving accounts for customer top-ups';
