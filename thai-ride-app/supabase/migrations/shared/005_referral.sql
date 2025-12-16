-- =============================================
-- SHARED MODULE: Referral System
-- =============================================
-- Feature: F06 - Referral System
-- Used by: Customer
-- Depends on: core/001_users_auth.sql, shared/003_wallet.sql
-- =============================================

-- Referral codes table
CREATE TABLE IF NOT EXISTS referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  code VARCHAR(20) UNIQUE NOT NULL,
  reward_amount DECIMAL(10,2) DEFAULT 50,
  referee_reward DECIMAL(10,2) DEFAULT 50,
  usage_count INTEGER DEFAULT 0,
  max_usage INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Referrals table
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  referee_id UUID REFERENCES users(id) ON DELETE CASCADE,
  referral_code VARCHAR(20),
  referrer_reward DECIMAL(10,2),
  referee_reward DECIMAL(10,2),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(referrer_id, referee_id)
);

-- Enable RLS
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- RLS Policies (permissive for dev)
CREATE POLICY "Allow all referral_codes" ON referral_codes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all referrals" ON referrals FOR ALL USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_referral_codes_user ON referral_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes(code);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referee ON referrals(referee_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);

-- Generate referral code
CREATE OR REPLACE FUNCTION generate_referral_code(p_user_id UUID)
RETURNS VARCHAR(20) AS $$
DECLARE
  v_code VARCHAR(20);
  v_exists BOOLEAN;
BEGIN
  SELECT code INTO v_code FROM referral_codes WHERE user_id = p_user_id;
  IF v_code IS NOT NULL THEN
    RETURN v_code;
  END IF;
  
  LOOP
    v_code := 'TR' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
    SELECT EXISTS(SELECT 1 FROM referral_codes WHERE code = v_code) INTO v_exists;
    EXIT WHEN NOT v_exists;
  END LOOP;
  
  INSERT INTO referral_codes (user_id, code)
  VALUES (p_user_id, v_code);
  
  RETURN v_code;
END;
$$ LANGUAGE plpgsql;

-- Apply referral code
CREATE OR REPLACE FUNCTION apply_referral_code(p_referee_id UUID, p_code VARCHAR(20))
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  reward_amount DECIMAL(10,2)
) AS $$
DECLARE
  v_referral_code RECORD;
  v_already_referred BOOLEAN;
BEGIN
  SELECT * INTO v_referral_code FROM referral_codes 
  WHERE code = UPPER(p_code) AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'รหัสแนะนำไม่ถูกต้อง'::TEXT, 0::DECIMAL(10,2);
    RETURN;
  END IF;
  
  IF v_referral_code.user_id = p_referee_id THEN
    RETURN QUERY SELECT false, 'ไม่สามารถใช้รหัสของตัวเองได้'::TEXT, 0::DECIMAL(10,2);
    RETURN;
  END IF;
  
  SELECT EXISTS(SELECT 1 FROM referrals WHERE referee_id = p_referee_id) INTO v_already_referred;
  IF v_already_referred THEN
    RETURN QUERY SELECT false, 'คุณเคยใช้รหัสแนะนำแล้ว'::TEXT, 0::DECIMAL(10,2);
    RETURN;
  END IF;
  
  IF v_referral_code.max_usage IS NOT NULL AND v_referral_code.usage_count >= v_referral_code.max_usage THEN
    RETURN QUERY SELECT false, 'รหัสนี้ถูกใช้ครบจำนวนแล้ว'::TEXT, 0::DECIMAL(10,2);
    RETURN;
  END IF;
  
  INSERT INTO referrals (referrer_id, referee_id, referral_code, referrer_reward, referee_reward)
  VALUES (v_referral_code.user_id, p_referee_id, p_code, v_referral_code.reward_amount, v_referral_code.referee_reward);
  
  UPDATE referral_codes SET usage_count = usage_count + 1 WHERE id = v_referral_code.id;
  
  PERFORM add_wallet_transaction(p_referee_id, 'referral', v_referral_code.referee_reward, 'โบนัสจากการใช้รหัสแนะนำ');
  
  RETURN QUERY SELECT true, 'ใช้รหัสแนะนำสำเร็จ!'::TEXT, v_referral_code.referee_reward;
END;
$$ LANGUAGE plpgsql;

-- Complete referral (when referee completes first ride)
CREATE OR REPLACE FUNCTION complete_referral(p_referee_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_referral RECORD;
BEGIN
  SELECT * INTO v_referral FROM referrals 
  WHERE referee_id = p_referee_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  UPDATE referrals 
  SET status = 'completed', completed_at = NOW()
  WHERE id = v_referral.id;
  
  PERFORM add_wallet_transaction(v_referral.referrer_id, 'referral', v_referral.referrer_reward, 'โบนัสจากการแนะนำเพื่อน');
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;
