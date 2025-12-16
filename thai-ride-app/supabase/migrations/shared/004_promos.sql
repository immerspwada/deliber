-- =============================================
-- SHARED MODULE: Promo Codes
-- =============================================
-- Feature: F10 - Promo Codes
-- Used by: Customer, Admin
-- Depends on: core/001_users_auth.sql
-- =============================================

-- Promo codes table
CREATE TABLE IF NOT EXISTS promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) UNIQUE NOT NULL,
  description TEXT,
  discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value DECIMAL(10,2) NOT NULL,
  min_order_amount DECIMAL(10,2) DEFAULT 0,
  max_discount DECIMAL(10,2),
  usage_limit INTEGER,
  usage_count INTEGER DEFAULT 0,
  per_user_limit INTEGER DEFAULT 1,
  valid_from TIMESTAMPTZ DEFAULT now(),
  valid_until TIMESTAMPTZ,
  service_type VARCHAR(20) CHECK (service_type IN ('ride', 'delivery', 'shopping', 'all')),
  category VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- User promo usage table
CREATE TABLE IF NOT EXISTS user_promo_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  promo_id UUID REFERENCES promo_codes(id) ON DELETE CASCADE,
  request_type VARCHAR(20),
  request_id UUID,
  discount_amount DECIMAL(10,2),
  used_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, promo_id, request_id)
);

-- Favorite promos table
CREATE TABLE IF NOT EXISTS favorite_promos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  promo_id UUID REFERENCES promo_codes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, promo_id)
);

-- Enable RLS
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_promo_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorite_promos ENABLE ROW LEVEL SECURITY;

-- RLS Policies (permissive for dev)
CREATE POLICY "Allow all promo_codes" ON promo_codes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all user_promo_usage" ON user_promo_usage FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all favorite_promos" ON favorite_promos FOR ALL USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_codes_active ON promo_codes(is_active);
CREATE INDEX IF NOT EXISTS idx_promo_codes_valid ON promo_codes(valid_from, valid_until);
CREATE INDEX IF NOT EXISTS idx_user_promo_usage_user ON user_promo_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_user_promo_usage_promo ON user_promo_usage(promo_id);
CREATE INDEX IF NOT EXISTS idx_favorite_promos_user ON favorite_promos(user_id);

-- Validate promo code
CREATE OR REPLACE FUNCTION validate_promo_code(
  p_code VARCHAR(20),
  p_user_id UUID,
  p_service_type VARCHAR(20) DEFAULT 'ride',
  p_order_amount DECIMAL(10,2) DEFAULT 0
)
RETURNS TABLE (
  is_valid BOOLEAN,
  message TEXT,
  discount_type VARCHAR(20),
  discount_value DECIMAL(10,2),
  max_discount DECIMAL(10,2),
  calculated_discount DECIMAL(10,2)
) AS $$
DECLARE
  v_promo RECORD;
  v_user_usage INTEGER;
  v_calculated_discount DECIMAL(10,2);
BEGIN
  SELECT * INTO v_promo FROM promo_codes 
  WHERE code = UPPER(p_code) AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'รหัสโปรโมชั่นไม่ถูกต้อง'::TEXT, NULL::VARCHAR(20), NULL::DECIMAL(10,2), NULL::DECIMAL(10,2), NULL::DECIMAL(10,2);
    RETURN;
  END IF;
  
  IF v_promo.valid_from > NOW() THEN
    RETURN QUERY SELECT false, 'โปรโมชั่นยังไม่เริ่มใช้งาน'::TEXT, NULL::VARCHAR(20), NULL::DECIMAL(10,2), NULL::DECIMAL(10,2), NULL::DECIMAL(10,2);
    RETURN;
  END IF;
  
  IF v_promo.valid_until IS NOT NULL AND v_promo.valid_until < NOW() THEN
    RETURN QUERY SELECT false, 'โปรโมชั่นหมดอายุแล้ว'::TEXT, NULL::VARCHAR(20), NULL::DECIMAL(10,2), NULL::DECIMAL(10,2), NULL::DECIMAL(10,2);
    RETURN;
  END IF;
  
  IF v_promo.usage_limit IS NOT NULL AND v_promo.usage_count >= v_promo.usage_limit THEN
    RETURN QUERY SELECT false, 'โปรโมชั่นถูกใช้ครบจำนวนแล้ว'::TEXT, NULL::VARCHAR(20), NULL::DECIMAL(10,2), NULL::DECIMAL(10,2), NULL::DECIMAL(10,2);
    RETURN;
  END IF;
  
  IF v_promo.service_type IS NOT NULL AND v_promo.service_type != 'all' AND v_promo.service_type != p_service_type THEN
    RETURN QUERY SELECT false, 'โปรโมชั่นไม่สามารถใช้กับบริการนี้ได้'::TEXT, NULL::VARCHAR(20), NULL::DECIMAL(10,2), NULL::DECIMAL(10,2), NULL::DECIMAL(10,2);
    RETURN;
  END IF;
  
  IF p_order_amount < v_promo.min_order_amount THEN
    RETURN QUERY SELECT false, ('ยอดขั้นต่ำ ' || v_promo.min_order_amount || ' บาท')::TEXT, NULL::VARCHAR(20), NULL::DECIMAL(10,2), NULL::DECIMAL(10,2), NULL::DECIMAL(10,2);
    RETURN;
  END IF;
  
  SELECT COUNT(*) INTO v_user_usage FROM user_promo_usage WHERE user_id = p_user_id AND promo_id = v_promo.id;
  IF v_promo.per_user_limit IS NOT NULL AND v_user_usage >= v_promo.per_user_limit THEN
    RETURN QUERY SELECT false, 'คุณใช้โปรโมชั่นนี้ครบจำนวนแล้ว'::TEXT, NULL::VARCHAR(20), NULL::DECIMAL(10,2), NULL::DECIMAL(10,2), NULL::DECIMAL(10,2);
    RETURN;
  END IF;
  
  IF v_promo.discount_type = 'percentage' THEN
    v_calculated_discount := p_order_amount * (v_promo.discount_value / 100);
    IF v_promo.max_discount IS NOT NULL THEN
      v_calculated_discount := LEAST(v_calculated_discount, v_promo.max_discount);
    END IF;
  ELSE
    v_calculated_discount := v_promo.discount_value;
  END IF;
  
  RETURN QUERY SELECT true, 'โปรโมชั่นใช้ได้'::TEXT, v_promo.discount_type, v_promo.discount_value, v_promo.max_discount, v_calculated_discount;
END;
$$ LANGUAGE plpgsql;

-- Use promo code
CREATE OR REPLACE FUNCTION use_promo_code(
  p_code VARCHAR(20),
  p_user_id UUID,
  p_request_type VARCHAR(20),
  p_request_id UUID,
  p_discount_amount DECIMAL(10,2)
)
RETURNS BOOLEAN AS $$
DECLARE
  v_promo_id UUID;
BEGIN
  SELECT id INTO v_promo_id FROM promo_codes WHERE code = UPPER(p_code);
  
  IF v_promo_id IS NULL THEN
    RETURN false;
  END IF;
  
  INSERT INTO user_promo_usage (user_id, promo_id, request_type, request_id, discount_amount)
  VALUES (p_user_id, v_promo_id, p_request_type, p_request_id, p_discount_amount);
  
  UPDATE promo_codes SET usage_count = usage_count + 1 WHERE id = v_promo_id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;
