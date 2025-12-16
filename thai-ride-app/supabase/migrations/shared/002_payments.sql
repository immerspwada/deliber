-- =============================================
-- SHARED MODULE: Payments
-- =============================================
-- Feature: F08 - Payment Methods
-- Used by: Customer, Provider, Admin
-- Depends on: core/001_users_auth.sql
-- =============================================

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_id VARCHAR(25) UNIQUE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES service_providers(id),
  request_type VARCHAR(20) NOT NULL CHECK (request_type IN ('ride', 'delivery', 'shopping')),
  request_id UUID NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('promptpay', 'credit_card', 'cash', 'mobile_banking', 'wallet')),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
  transaction_ref VARCHAR(100),
  receipt_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Payment methods table
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('credit_card', 'debit_card', 'promptpay', 'mobile_banking')),
  name VARCHAR(100) NOT NULL,
  last_four VARCHAR(4),
  brand VARCHAR(20),
  bank_name VARCHAR(50),
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

-- RLS Policies (permissive for dev)
CREATE POLICY "Allow all payments" ON payments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all payment_methods" ON payment_methods FOR ALL USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_provider ON payments(provider_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_request ON payments(request_type, request_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_user ON payment_methods(user_id);

-- Payment tracking ID trigger
CREATE OR REPLACE FUNCTION set_payment_tracking_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tracking_id IS NULL THEN
    NEW.tracking_id := 'PAY-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_payment_tracking_id ON payments;
CREATE TRIGGER trigger_payment_tracking_id
  BEFORE INSERT ON payments
  FOR EACH ROW EXECUTE FUNCTION set_payment_tracking_id();

-- Set default payment method
CREATE OR REPLACE FUNCTION set_default_payment_method(p_user_id UUID, p_method_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE payment_methods SET is_default = false WHERE user_id = p_user_id;
  UPDATE payment_methods SET is_default = true WHERE id = p_method_id AND user_id = p_user_id;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;
