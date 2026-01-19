-- Migration: 023_loyalty_program.sql
-- Feature: F156 - Customer Loyalty Program
-- Description: ระบบสะสมแต้มจากการใช้บริการ แลกส่วนลดหรือของรางวัล

-- =============================================
-- LOYALTY TIERS (ระดับสมาชิก)
-- =============================================
CREATE TABLE IF NOT EXISTS loyalty_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL,
  name_th VARCHAR(50) NOT NULL,
  min_points INTEGER NOT NULL DEFAULT 0,
  multiplier DECIMAL(3,2) NOT NULL DEFAULT 1.0, -- ตัวคูณแต้ม
  benefits JSONB DEFAULT '[]', -- สิทธิประโยชน์
  badge_color VARCHAR(20) DEFAULT '#000000',
  icon_name VARCHAR(50),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- USER LOYALTY (แต้มสะสมของผู้ใช้)
-- =============================================
CREATE TABLE IF NOT EXISTS user_loyalty (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  current_points INTEGER NOT NULL DEFAULT 0,
  lifetime_points INTEGER NOT NULL DEFAULT 0, -- แต้มสะสมตลอดกาล
  current_tier_id UUID REFERENCES loyalty_tiers(id),
  tier_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- =============================================
-- POINTS TRANSACTIONS (ประวัติแต้ม)
-- =============================================
CREATE TABLE IF NOT EXISTS points_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  points INTEGER NOT NULL, -- บวก = ได้รับ, ลบ = ใช้ไป
  type VARCHAR(30) NOT NULL, -- earn, redeem, expire, bonus, adjust
  source VARCHAR(30), -- ride, delivery, shopping, referral, promo, admin
  reference_id UUID, -- อ้างอิง ride_id, delivery_id, etc.
  description TEXT,
  expires_at TIMESTAMPTZ, -- วันหมดอายุของแต้ม (ถ้ามี)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- LOYALTY REWARDS (รางวัลที่แลกได้)
-- =============================================
CREATE TABLE IF NOT EXISTS loyalty_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  name_th VARCHAR(100) NOT NULL,
  description TEXT,
  description_th TEXT,
  type VARCHAR(30) NOT NULL, -- discount, free_ride, voucher, gift
  points_required INTEGER NOT NULL,
  value DECIMAL(10,2), -- มูลค่า (บาท หรือ %)
  value_type VARCHAR(20) DEFAULT 'fixed', -- fixed, percentage
  max_discount DECIMAL(10,2), -- ส่วนลดสูงสุด (สำหรับ percentage)
  min_order_value DECIMAL(10,2) DEFAULT 0, -- ยอดขั้นต่ำ
  valid_days INTEGER DEFAULT 30, -- จำนวนวันที่ใช้ได้หลังแลก
  quantity_limit INTEGER, -- จำกัดจำนวน (null = ไม่จำกัด)
  quantity_redeemed INTEGER DEFAULT 0,
  tier_required UUID REFERENCES loyalty_tiers(id), -- ต้องเป็น tier นี้ขึ้นไป
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- USER REWARDS (รางวัลที่ผู้ใช้แลกแล้ว)
-- =============================================
CREATE TABLE IF NOT EXISTS user_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reward_id UUID NOT NULL REFERENCES loyalty_rewards(id),
  points_spent INTEGER NOT NULL,
  code VARCHAR(20) UNIQUE, -- รหัสสำหรับใช้งาน
  status VARCHAR(20) DEFAULT 'active', -- active, used, expired
  used_at TIMESTAMPTZ,
  used_reference_id UUID, -- อ้างอิงการใช้งาน
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- POINTS RULES (กฎการได้รับแต้ม)
-- =============================================
CREATE TABLE IF NOT EXISTS points_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  source VARCHAR(30) NOT NULL, -- ride, delivery, shopping, referral, signup
  points_per_baht DECIMAL(5,2) DEFAULT 1.0, -- แต้มต่อบาท
  bonus_points INTEGER DEFAULT 0, -- แต้มโบนัสเพิ่มเติม
  min_amount DECIMAL(10,2) DEFAULT 0, -- ยอดขั้นต่ำ
  max_points INTEGER, -- แต้มสูงสุดต่อครั้ง
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_user_loyalty_user ON user_loyalty(user_id);
CREATE INDEX IF NOT EXISTS idx_points_transactions_user ON points_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_points_transactions_created ON points_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_rewards_user ON user_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_user_rewards_status ON user_rewards(status);
CREATE INDEX IF NOT EXISTS idx_user_rewards_code ON user_rewards(code);

-- =============================================
-- DEFAULT DATA
-- =============================================

-- Default Tiers
INSERT INTO loyalty_tiers (name, name_th, min_points, multiplier, benefits, badge_color, sort_order) VALUES
('Bronze', 'บรอนซ์', 0, 1.0, '["สะสมแต้ม 1 แต้ม/บาท"]', '#CD7F32', 1),
('Silver', 'ซิลเวอร์', 1000, 1.2, '["สะสมแต้ม 1.2 แต้ม/บาท", "ส่วนลด 5% ทุกเดือน"]', '#C0C0C0', 2),
('Gold', 'โกลด์', 5000, 1.5, '["สะสมแต้ม 1.5 แต้ม/บาท", "ส่วนลด 10% ทุกเดือน", "Priority Support"]', '#FFD700', 3),
('Platinum', 'แพลทินัม', 15000, 2.0, '["สะสมแต้ม 2 แต้ม/บาท", "ส่วนลด 15% ทุกเดือน", "Priority Support", "Free Cancellation"]', '#E5E4E2', 4)
ON CONFLICT DO NOTHING;

-- Default Points Rules
INSERT INTO points_rules (name, source, points_per_baht, bonus_points, description) VALUES
('Ride Points', 'ride', 1.0, 0, 'ได้รับ 1 แต้มต่อทุก 1 บาท'),
('Delivery Points', 'delivery', 1.0, 0, 'ได้รับ 1 แต้มต่อทุก 1 บาท'),
('Shopping Points', 'shopping', 0.5, 0, 'ได้รับ 0.5 แต้มต่อทุก 1 บาท'),
('Referral Bonus', 'referral', 0, 100, 'ได้รับ 100 แต้มเมื่อชวนเพื่อน'),
('Signup Bonus', 'signup', 0, 50, 'ได้รับ 50 แต้มเมื่อสมัครสมาชิก')
ON CONFLICT DO NOTHING;

-- Default Rewards
INSERT INTO loyalty_rewards (name, name_th, description_th, type, points_required, value, value_type, valid_days) VALUES
('ส่วนลด 20 บาท', 'ส่วนลด 20 บาท', 'ส่วนลด 20 บาทสำหรับการเดินทางครั้งถัดไป', 'discount', 200, 20, 'fixed', 30),
('ส่วนลด 50 บาท', 'ส่วนลด 50 บาท', 'ส่วนลด 50 บาทสำหรับการเดินทางครั้งถัดไป', 'discount', 450, 50, 'fixed', 30),
('ส่วนลด 10%', 'ส่วนลด 10%', 'ส่วนลด 10% สูงสุด 100 บาท', 'discount', 800, 10, 'percentage', 30),
('เดินทางฟรี', 'เดินทางฟรี', 'เดินทางฟรี 1 ครั้ง (สูงสุด 100 บาท)', 'free_ride', 1500, 100, 'fixed', 60)
ON CONFLICT DO NOTHING;

-- =============================================
-- FUNCTIONS
-- =============================================

-- Function: Initialize user loyalty
CREATE OR REPLACE FUNCTION ensure_user_loyalty(p_user_id UUID)
RETURNS user_loyalty AS $$
DECLARE
  v_loyalty user_loyalty;
  v_bronze_tier_id UUID;
BEGIN
  SELECT id INTO v_bronze_tier_id FROM loyalty_tiers WHERE sort_order = 1 LIMIT 1;
  
  INSERT INTO user_loyalty (user_id, current_tier_id, tier_updated_at)
  VALUES (p_user_id, v_bronze_tier_id, NOW())
  ON CONFLICT (user_id) DO NOTHING;
  
  SELECT * INTO v_loyalty FROM user_loyalty WHERE user_id = p_user_id;
  RETURN v_loyalty;
END;
$$ LANGUAGE plpgsql;

-- Function: Add points to user
CREATE OR REPLACE FUNCTION add_loyalty_points(
  p_user_id UUID,
  p_points INTEGER,
  p_type VARCHAR(30),
  p_source VARCHAR(30) DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS points_transactions AS $$
DECLARE
  v_transaction points_transactions;
  v_loyalty user_loyalty;
  v_new_tier_id UUID;
  v_new_lifetime INTEGER;
BEGIN
  -- Ensure user has loyalty record
  PERFORM ensure_user_loyalty(p_user_id);
  
  -- Create transaction
  INSERT INTO points_transactions (user_id, points, type, source, reference_id, description, expires_at)
  VALUES (p_user_id, p_points, p_type, p_source, p_reference_id, p_description, p_expires_at)
  RETURNING * INTO v_transaction;
  
  -- Update user points
  UPDATE user_loyalty
  SET 
    current_points = current_points + p_points,
    lifetime_points = CASE WHEN p_points > 0 THEN lifetime_points + p_points ELSE lifetime_points END,
    updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING * INTO v_loyalty;
  
  -- Check for tier upgrade
  v_new_lifetime := v_loyalty.lifetime_points;
  SELECT id INTO v_new_tier_id 
  FROM loyalty_tiers 
  WHERE min_points <= v_new_lifetime AND is_active = true
  ORDER BY min_points DESC 
  LIMIT 1;
  
  IF v_new_tier_id IS DISTINCT FROM v_loyalty.current_tier_id THEN
    UPDATE user_loyalty
    SET current_tier_id = v_new_tier_id, tier_updated_at = NOW()
    WHERE user_id = p_user_id;
  END IF;
  
  RETURN v_transaction;
END;
$$ LANGUAGE plpgsql;

-- Function: Calculate points for service
CREATE OR REPLACE FUNCTION calculate_service_points(
  p_user_id UUID,
  p_amount DECIMAL,
  p_source VARCHAR(30)
)
RETURNS INTEGER AS $$
DECLARE
  v_rule points_rules;
  v_loyalty user_loyalty;
  v_tier loyalty_tiers;
  v_base_points INTEGER;
  v_final_points INTEGER;
BEGIN
  -- Get rule
  SELECT * INTO v_rule FROM points_rules WHERE source = p_source AND is_active = true LIMIT 1;
  IF v_rule IS NULL THEN RETURN 0; END IF;
  
  -- Check min amount
  IF p_amount < v_rule.min_amount THEN RETURN 0; END IF;
  
  -- Calculate base points
  v_base_points := FLOOR(p_amount * v_rule.points_per_baht) + v_rule.bonus_points;
  
  -- Apply tier multiplier
  SELECT * INTO v_loyalty FROM user_loyalty WHERE user_id = p_user_id;
  IF v_loyalty IS NOT NULL AND v_loyalty.current_tier_id IS NOT NULL THEN
    SELECT * INTO v_tier FROM loyalty_tiers WHERE id = v_loyalty.current_tier_id;
    IF v_tier IS NOT NULL THEN
      v_base_points := FLOOR(v_base_points * v_tier.multiplier);
    END IF;
  END IF;
  
  -- Apply max limit
  IF v_rule.max_points IS NOT NULL AND v_base_points > v_rule.max_points THEN
    v_base_points := v_rule.max_points;
  END IF;
  
  RETURN v_base_points;
END;
$$ LANGUAGE plpgsql;

-- Function: Redeem reward
CREATE OR REPLACE FUNCTION redeem_reward(
  p_user_id UUID,
  p_reward_id UUID
)
RETURNS user_rewards AS $$
DECLARE
  v_reward loyalty_rewards;
  v_loyalty user_loyalty;
  v_user_reward user_rewards;
  v_code VARCHAR(20);
BEGIN
  -- Get reward
  SELECT * INTO v_reward FROM loyalty_rewards WHERE id = p_reward_id AND is_active = true;
  IF v_reward IS NULL THEN
    RAISE EXCEPTION 'Reward not found or inactive';
  END IF;
  
  -- Check quantity
  IF v_reward.quantity_limit IS NOT NULL AND v_reward.quantity_redeemed >= v_reward.quantity_limit THEN
    RAISE EXCEPTION 'Reward out of stock';
  END IF;
  
  -- Check dates
  IF v_reward.start_date IS NOT NULL AND NOW() < v_reward.start_date THEN
    RAISE EXCEPTION 'Reward not yet available';
  END IF;
  IF v_reward.end_date IS NOT NULL AND NOW() > v_reward.end_date THEN
    RAISE EXCEPTION 'Reward expired';
  END IF;
  
  -- Get user loyalty
  SELECT * INTO v_loyalty FROM user_loyalty WHERE user_id = p_user_id;
  IF v_loyalty IS NULL OR v_loyalty.current_points < v_reward.points_required THEN
    RAISE EXCEPTION 'Insufficient points';
  END IF;
  
  -- Check tier requirement
  IF v_reward.tier_required IS NOT NULL THEN
    -- TODO: Check tier hierarchy
  END IF;
  
  -- Generate unique code
  v_code := 'RWD' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
  
  -- Create user reward
  INSERT INTO user_rewards (user_id, reward_id, points_spent, code, expires_at)
  VALUES (p_user_id, p_reward_id, v_reward.points_required, v_code, NOW() + (v_reward.valid_days || ' days')::INTERVAL)
  RETURNING * INTO v_user_reward;
  
  -- Deduct points
  PERFORM add_loyalty_points(p_user_id, -v_reward.points_required, 'redeem', 'reward', v_user_reward.id, 'แลกรางวัล: ' || v_reward.name_th);
  
  -- Update reward quantity
  UPDATE loyalty_rewards SET quantity_redeemed = quantity_redeemed + 1 WHERE id = p_reward_id;
  
  RETURN v_user_reward;
END;
$$ LANGUAGE plpgsql;

-- Function: Get user loyalty summary
CREATE OR REPLACE FUNCTION get_loyalty_summary(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_loyalty user_loyalty;
  v_tier loyalty_tiers;
  v_next_tier loyalty_tiers;
  v_result JSON;
BEGIN
  PERFORM ensure_user_loyalty(p_user_id);
  
  SELECT * INTO v_loyalty FROM user_loyalty WHERE user_id = p_user_id;
  SELECT * INTO v_tier FROM loyalty_tiers WHERE id = v_loyalty.current_tier_id;
  SELECT * INTO v_next_tier FROM loyalty_tiers 
    WHERE min_points > v_loyalty.lifetime_points AND is_active = true 
    ORDER BY min_points ASC LIMIT 1;
  
  v_result := json_build_object(
    'current_points', v_loyalty.current_points,
    'lifetime_points', v_loyalty.lifetime_points,
    'tier', json_build_object(
      'id', v_tier.id,
      'name', v_tier.name,
      'name_th', v_tier.name_th,
      'multiplier', v_tier.multiplier,
      'benefits', v_tier.benefits,
      'badge_color', v_tier.badge_color
    ),
    'next_tier', CASE WHEN v_next_tier IS NOT NULL THEN json_build_object(
      'id', v_next_tier.id,
      'name', v_next_tier.name,
      'name_th', v_next_tier.name_th,
      'min_points', v_next_tier.min_points,
      'points_needed', v_next_tier.min_points - v_loyalty.lifetime_points
    ) ELSE NULL END
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- RLS POLICIES (Permissive for Demo Mode)
-- =============================================
ALTER TABLE user_loyalty ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_rules ENABLE ROW LEVEL SECURITY;

-- Permissive policies for demo mode
CREATE POLICY "Allow all loyalty_tiers" ON loyalty_tiers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all loyalty_rewards" ON loyalty_rewards FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all user_loyalty" ON user_loyalty FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all points_transactions" ON points_transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all user_rewards" ON user_rewards FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all points_rules" ON points_rules FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- TRIGGERS
-- =============================================

-- Auto-add points after ride completion
CREATE OR REPLACE FUNCTION auto_add_ride_points()
RETURNS TRIGGER AS $$
DECLARE
  v_points INTEGER;
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    v_points := calculate_service_points(NEW.user_id, NEW.final_fare, 'ride');
    IF v_points > 0 THEN
      PERFORM add_loyalty_points(
        NEW.user_id, 
        v_points, 
        'earn', 
        'ride', 
        NEW.id, 
        'แต้มจากการเดินทาง'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_add_ride_points ON ride_requests;
CREATE TRIGGER trigger_auto_add_ride_points
  AFTER UPDATE ON ride_requests
  FOR EACH ROW
  EXECUTE FUNCTION auto_add_ride_points();

-- Auto-add points after delivery completion
CREATE OR REPLACE FUNCTION auto_add_delivery_points()
RETURNS TRIGGER AS $$
DECLARE
  v_points INTEGER;
BEGIN
  IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
    v_points := calculate_service_points(NEW.user_id, NEW.delivery_fee, 'delivery');
    IF v_points > 0 THEN
      PERFORM add_loyalty_points(
        NEW.user_id, 
        v_points, 
        'earn', 
        'delivery', 
        NEW.id, 
        'แต้มจากการส่งของ'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_add_delivery_points ON delivery_requests;
CREATE TRIGGER trigger_auto_add_delivery_points
  AFTER UPDATE ON delivery_requests
  FOR EACH ROW
  EXECUTE FUNCTION auto_add_delivery_points();

-- Auto-add points after shopping completion
CREATE OR REPLACE FUNCTION auto_add_shopping_points()
RETURNS TRIGGER AS $$
DECLARE
  v_points INTEGER;
BEGIN
  IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
    v_points := calculate_service_points(NEW.user_id, NEW.service_fee, 'shopping');
    IF v_points > 0 THEN
      PERFORM add_loyalty_points(
        NEW.user_id, 
        v_points, 
        'earn', 
        'shopping', 
        NEW.id, 
        'แต้มจากการซื้อของ'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_add_shopping_points ON shopping_requests;
CREATE TRIGGER trigger_auto_add_shopping_points
  AFTER UPDATE ON shopping_requests
  FOR EACH ROW
  EXECUTE FUNCTION auto_add_shopping_points();
