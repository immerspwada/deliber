-- Migration: 060_payment_gateway.sql
-- Feature: F08 - Payment Gateway Integration
-- Description: Multi-gateway payment support, refunds, and payment analytics

-- =====================================================
-- 1. Payment Gateways Configuration
-- =====================================================
CREATE TABLE IF NOT EXISTS payment_gateways (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  display_name_th TEXT,
  gateway_type TEXT NOT NULL CHECK (gateway_type IN ('card', 'bank_transfer', 'ewallet', 'qr', 'cash')),
  provider TEXT NOT NULL, -- omise, 2c2p, promptpay, truemoney, etc.
  config JSONB DEFAULT '{}',
  supported_currencies TEXT[] DEFAULT ARRAY['THB'],
  min_amount NUMERIC(10,2) DEFAULT 1,
  max_amount NUMERIC(10,2) DEFAULT 100000,
  fee_type TEXT CHECK (fee_type IN ('fixed', 'percentage', 'mixed')),
  fee_fixed NUMERIC(10,2) DEFAULT 0,
  fee_percentage NUMERIC(5,4) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  icon_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default gateways
INSERT INTO payment_gateways (name, display_name, display_name_th, gateway_type, provider, fee_type, fee_percentage, sort_order) VALUES
('promptpay', 'PromptPay', 'พร้อมเพย์', 'qr', 'promptpay', 'fixed', 0, 1),
('credit_card', 'Credit/Debit Card', 'บัตรเครดิต/เดบิต', 'card', 'omise', 'percentage', 0.029, 2),
('truemoney', 'TrueMoney Wallet', 'ทรูมันนี่ วอลเล็ท', 'ewallet', 'truemoney', 'percentage', 0.02, 3),
('mobile_banking', 'Mobile Banking', 'โมบายแบงก์กิ้ง', 'bank_transfer', '2c2p', 'fixed', 0, 4),
('cash', 'Cash', 'เงินสด', 'cash', 'internal', 'fixed', 0, 5),
('wallet', 'ThaiRide Wallet', 'กระเป๋าเงิน ThaiRide', 'ewallet', 'internal', 'fixed', 0, 0)
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- 2. Payment Transactions (Enhanced)
-- =====================================================
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  gateway_id UUID REFERENCES payment_gateways(id),
  gateway_name TEXT NOT NULL,
  
  -- Request reference
  request_id UUID,
  request_type TEXT CHECK (request_type IN ('ride', 'delivery', 'shopping', 'queue', 'moving', 'laundry', 'wallet_topup', 'subscription')),
  
  -- Amount details
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'THB',
  fee_amount NUMERIC(10,2) DEFAULT 0,
  net_amount NUMERIC(10,2),
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded', 'partially_refunded')),
  
  -- Gateway response
  gateway_transaction_id TEXT,
  gateway_reference TEXT,
  gateway_response JSONB DEFAULT '{}',
  
  -- Card details (masked)
  card_last_four TEXT,
  card_brand TEXT,
  
  -- Metadata
  description TEXT,
  metadata JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  
  -- Timestamps
  paid_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  failure_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_tx_user ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_tx_request ON payment_transactions(request_id, request_type);
CREATE INDEX IF NOT EXISTS idx_payment_tx_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_tx_gateway ON payment_transactions(gateway_name);
CREATE INDEX IF NOT EXISTS idx_payment_tx_date ON payment_transactions(created_at);

-- =====================================================
-- 3. Refunds
-- =====================================================
CREATE TABLE IF NOT EXISTS payment_refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES payment_transactions(id),
  user_id UUID NOT NULL REFERENCES users(id),
  
  amount NUMERIC(10,2) NOT NULL,
  reason TEXT NOT NULL,
  reason_code TEXT,
  
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'rejected')),
  
  -- Gateway response
  gateway_refund_id TEXT,
  gateway_response JSONB DEFAULT '{}',
  
  -- Admin
  processed_by UUID REFERENCES users(id),
  admin_notes TEXT,
  
  -- Timestamps
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refunds_transaction ON payment_refunds(transaction_id);
CREATE INDEX IF NOT EXISTS idx_refunds_user ON payment_refunds(user_id);
CREATE INDEX IF NOT EXISTS idx_refunds_status ON payment_refunds(status);

-- =====================================================
-- 4. Payment Analytics
-- =====================================================
CREATE TABLE IF NOT EXISTS payment_analytics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  gateway_name TEXT NOT NULL,
  
  -- Counts
  total_transactions INTEGER DEFAULT 0,
  successful_transactions INTEGER DEFAULT 0,
  failed_transactions INTEGER DEFAULT 0,
  
  -- Amounts
  total_amount NUMERIC(12,2) DEFAULT 0,
  total_fees NUMERIC(10,2) DEFAULT 0,
  total_refunds NUMERIC(10,2) DEFAULT 0,
  net_amount NUMERIC(12,2) DEFAULT 0,
  
  -- Rates
  success_rate NUMERIC(5,4),
  avg_transaction_amount NUMERIC(10,2),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date, gateway_name)
);

CREATE INDEX IF NOT EXISTS idx_payment_analytics_date ON payment_analytics_daily(date);

-- =====================================================
-- 5. Enable RLS
-- =====================================================
ALTER TABLE payment_gateways ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_analytics_daily ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone read active gateways" ON payment_gateways
  FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "Admin manage gateways" ON payment_gateways
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Users read own transactions" ON payment_transactions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admin read all transactions" ON payment_transactions
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "System insert transactions" ON payment_transactions
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users read own refunds" ON payment_refunds
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admin manage refunds" ON payment_refunds
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admin read analytics" ON payment_analytics_daily
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- =====================================================
-- 6. Functions
-- =====================================================

-- Create payment transaction
CREATE OR REPLACE FUNCTION create_payment_transaction(
  p_user_id UUID,
  p_gateway_name TEXT,
  p_amount NUMERIC,
  p_request_id UUID DEFAULT NULL,
  p_request_type TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_transaction_id UUID;
  v_gateway payment_gateways%ROWTYPE;
  v_fee NUMERIC;
  v_net NUMERIC;
BEGIN
  -- Get gateway info
  SELECT * INTO v_gateway FROM payment_gateways WHERE name = p_gateway_name AND is_active = true;
  
  IF v_gateway.id IS NULL THEN
    RAISE EXCEPTION 'Payment gateway not found or inactive';
  END IF;
  
  -- Calculate fee
  IF v_gateway.fee_type = 'fixed' THEN
    v_fee := v_gateway.fee_fixed;
  ELSIF v_gateway.fee_type = 'percentage' THEN
    v_fee := p_amount * v_gateway.fee_percentage;
  ELSE
    v_fee := v_gateway.fee_fixed + (p_amount * v_gateway.fee_percentage);
  END IF;
  
  v_net := p_amount - v_fee;
  
  -- Create transaction
  INSERT INTO payment_transactions (
    user_id, gateway_id, gateway_name,
    request_id, request_type,
    amount, fee_amount, net_amount,
    description, status
  ) VALUES (
    p_user_id, v_gateway.id, p_gateway_name,
    p_request_id, p_request_type,
    p_amount, v_fee, v_net,
    p_description, 'pending'
  )
  RETURNING id INTO v_transaction_id;
  
  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Complete payment
CREATE OR REPLACE FUNCTION complete_payment(
  p_transaction_id UUID,
  p_gateway_transaction_id TEXT DEFAULT NULL,
  p_gateway_response JSONB DEFAULT '{}'
) RETURNS BOOLEAN AS $$
DECLARE
  v_tx payment_transactions%ROWTYPE;
BEGIN
  SELECT * INTO v_tx FROM payment_transactions WHERE id = p_transaction_id;
  
  IF v_tx.id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  IF v_tx.status != 'pending' AND v_tx.status != 'processing' THEN
    RETURN FALSE;
  END IF;
  
  UPDATE payment_transactions
  SET 
    status = 'completed',
    gateway_transaction_id = p_gateway_transaction_id,
    gateway_response = p_gateway_response,
    paid_at = NOW(),
    updated_at = NOW()
  WHERE id = p_transaction_id;
  
  -- Update related request if applicable
  IF v_tx.request_type = 'ride' AND v_tx.request_id IS NOT NULL THEN
    UPDATE ride_requests SET payment_status = 'paid' WHERE id = v_tx.request_id;
  ELSIF v_tx.request_type = 'delivery' AND v_tx.request_id IS NOT NULL THEN
    UPDATE delivery_requests SET payment_status = 'paid' WHERE id = v_tx.request_id;
  ELSIF v_tx.request_type = 'wallet_topup' THEN
    -- Add to wallet
    PERFORM add_wallet_transaction(v_tx.user_id, v_tx.amount, 'topup', 'เติมเงินผ่าน ' || v_tx.gateway_name);
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fail payment
CREATE OR REPLACE FUNCTION fail_payment(
  p_transaction_id UUID,
  p_reason TEXT,
  p_gateway_response JSONB DEFAULT '{}'
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE payment_transactions
  SET 
    status = 'failed',
    failure_reason = p_reason,
    gateway_response = p_gateway_response,
    failed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_transaction_id
    AND status IN ('pending', 'processing');
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Request refund
CREATE OR REPLACE FUNCTION request_refund(
  p_transaction_id UUID,
  p_amount NUMERIC,
  p_reason TEXT
) RETURNS UUID AS $$
DECLARE
  v_tx payment_transactions%ROWTYPE;
  v_refund_id UUID;
  v_total_refunded NUMERIC;
BEGIN
  SELECT * INTO v_tx FROM payment_transactions WHERE id = p_transaction_id;
  
  IF v_tx.id IS NULL OR v_tx.status != 'completed' THEN
    RAISE EXCEPTION 'Transaction not found or not completed';
  END IF;
  
  -- Check total refunded amount
  SELECT COALESCE(SUM(amount), 0) INTO v_total_refunded
  FROM payment_refunds
  WHERE transaction_id = p_transaction_id AND status IN ('completed', 'pending', 'processing');
  
  IF v_total_refunded + p_amount > v_tx.amount THEN
    RAISE EXCEPTION 'Refund amount exceeds transaction amount';
  END IF;
  
  INSERT INTO payment_refunds (transaction_id, user_id, amount, reason)
  VALUES (p_transaction_id, v_tx.user_id, p_amount, p_reason)
  RETURNING id INTO v_refund_id;
  
  RETURN v_refund_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Process refund (Admin)
CREATE OR REPLACE FUNCTION process_refund(
  p_refund_id UUID,
  p_admin_id UUID,
  p_approved BOOLEAN,
  p_notes TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_refund payment_refunds%ROWTYPE;
BEGIN
  SELECT * INTO v_refund FROM payment_refunds WHERE id = p_refund_id;
  
  IF v_refund.id IS NULL OR v_refund.status != 'pending' THEN
    RETURN FALSE;
  END IF;
  
  IF p_approved THEN
    UPDATE payment_refunds
    SET 
      status = 'completed',
      processed_by = p_admin_id,
      admin_notes = p_notes,
      processed_at = NOW()
    WHERE id = p_refund_id;
    
    -- Update transaction status
    UPDATE payment_transactions
    SET status = CASE 
      WHEN (SELECT SUM(amount) FROM payment_refunds WHERE transaction_id = v_refund.transaction_id AND status = 'completed') >= amount 
      THEN 'refunded' 
      ELSE 'partially_refunded' 
    END
    WHERE id = v_refund.transaction_id;
    
    -- Add refund to wallet
    PERFORM add_wallet_transaction(v_refund.user_id, v_refund.amount, 'refund', 'คืนเงิน: ' || v_refund.reason);
    
    -- Notify user
    INSERT INTO user_notifications (user_id, type, title, message)
    VALUES (v_refund.user_id, 'payment', 'คืนเงินสำเร็จ', format('คืนเงิน %.2f บาท เข้ากระเป๋าเงินแล้ว', v_refund.amount));
  ELSE
    UPDATE payment_refunds
    SET 
      status = 'rejected',
      processed_by = p_admin_id,
      admin_notes = p_notes,
      processed_at = NOW()
    WHERE id = p_refund_id;
    
    -- Notify user
    INSERT INTO user_notifications (user_id, type, title, message)
    VALUES (v_refund.user_id, 'payment', 'คำขอคืนเงินถูกปฏิเสธ', COALESCE(p_notes, 'กรุณาติดต่อฝ่ายสนับสนุน'));
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update daily analytics
CREATE OR REPLACE FUNCTION update_payment_analytics()
RETURNS VOID AS $$
BEGIN
  INSERT INTO payment_analytics_daily (
    date, gateway_name,
    total_transactions, successful_transactions, failed_transactions,
    total_amount, total_fees, total_refunds, net_amount,
    success_rate, avg_transaction_amount
  )
  SELECT 
    DATE(created_at) as date,
    gateway_name,
    COUNT(*) as total_transactions,
    COUNT(*) FILTER (WHERE status = 'completed') as successful_transactions,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_transactions,
    COALESCE(SUM(amount) FILTER (WHERE status = 'completed'), 0) as total_amount,
    COALESCE(SUM(fee_amount) FILTER (WHERE status = 'completed'), 0) as total_fees,
    0 as total_refunds,
    COALESCE(SUM(net_amount) FILTER (WHERE status = 'completed'), 0) as net_amount,
    CASE WHEN COUNT(*) > 0 
      THEN COUNT(*) FILTER (WHERE status = 'completed')::NUMERIC / COUNT(*)
      ELSE 0 
    END as success_rate,
    AVG(amount) FILTER (WHERE status = 'completed') as avg_transaction_amount
  FROM payment_transactions
  WHERE DATE(created_at) = CURRENT_DATE - 1
  GROUP BY DATE(created_at), gateway_name
  ON CONFLICT (date, gateway_name) DO UPDATE SET
    total_transactions = EXCLUDED.total_transactions,
    successful_transactions = EXCLUDED.successful_transactions,
    failed_transactions = EXCLUDED.failed_transactions,
    total_amount = EXCLUDED.total_amount,
    total_fees = EXCLUDED.total_fees,
    net_amount = EXCLUDED.net_amount,
    success_rate = EXCLUDED.success_rate,
    avg_transaction_amount = EXCLUDED.avg_transaction_amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get payment summary for admin
CREATE OR REPLACE FUNCTION get_payment_summary(p_days INTEGER DEFAULT 30)
RETURNS TABLE (
  gateway_name TEXT,
  total_transactions BIGINT,
  total_amount NUMERIC,
  success_rate NUMERIC,
  avg_amount NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pt.gateway_name,
    COUNT(*) as total_transactions,
    COALESCE(SUM(pt.amount) FILTER (WHERE pt.status = 'completed'), 0) as total_amount,
    CASE WHEN COUNT(*) > 0 
      THEN (COUNT(*) FILTER (WHERE pt.status = 'completed')::NUMERIC / COUNT(*) * 100)
      ELSE 0 
    END as success_rate,
    AVG(pt.amount) FILTER (WHERE pt.status = 'completed') as avg_amount
  FROM payment_transactions pt
  WHERE pt.created_at > NOW() - (p_days || ' days')::INTERVAL
  GROUP BY pt.gateway_name
  ORDER BY total_amount DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON TABLE payment_gateways IS 'Payment gateway configurations';
COMMENT ON TABLE payment_transactions IS 'All payment transactions';
COMMENT ON TABLE payment_refunds IS 'Refund requests and processing';
COMMENT ON TABLE payment_analytics_daily IS 'Daily payment analytics';
