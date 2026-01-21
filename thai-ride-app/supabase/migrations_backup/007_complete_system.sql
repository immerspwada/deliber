-- Complete System Migration
-- Ensures ALL features work with real database
-- Covers: wallet, referral, delivery, shopping, notifications

-- =====================================================
-- 1. WALLET / BALANCE SYSTEM
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  balance DECIMAL(12,2) DEFAULT 0,
  total_earned DECIMAL(12,2) DEFAULT 0,
  total_spent DECIMAL(12,2) DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'THB',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id UUID REFERENCES public.user_wallets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('topup', 'payment', 'refund', 'cashback', 'referral', 'promo', 'withdrawal')),
  amount DECIMAL(12,2) NOT NULL,
  balance_before DECIMAL(12,2),
  balance_after DECIMAL(12,2),
  reference_type VARCHAR(50),
  reference_id UUID,
  description TEXT,
  status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. REFERRAL SYSTEM
-- =====================================================

CREATE TABLE IF NOT EXISTS public.referral_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  code VARCHAR(20) UNIQUE NOT NULL,
  reward_amount DECIMAL(10,2) DEFAULT 50,
  referee_reward DECIMAL(10,2) DEFAULT 50,
  usage_count INTEGER DEFAULT 0,
  max_usage INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  referee_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  referral_code VARCHAR(20),
  referrer_reward DECIMAL(10,2),
  referee_reward DECIMAL(10,2),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(referrer_id, referee_id)
);

-- =====================================================
-- 3. USER NOTIFICATIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('promo', 'ride', 'delivery', 'shopping', 'payment', 'system', 'sos', 'referral', 'subscription')),
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  is_read BOOLEAN DEFAULT false,
  is_push_sent BOOLEAN DEFAULT false,
  action_url VARCHAR(255),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. ADD TRACKING_ID TO DELIVERY/SHOPPING IF MISSING
-- =====================================================

ALTER TABLE public.delivery_requests 
ADD COLUMN IF NOT EXISTS tracking_id VARCHAR(25) UNIQUE;

ALTER TABLE public.shopping_requests 
ADD COLUMN IF NOT EXISTS tracking_id VARCHAR(25) UNIQUE;

-- =====================================================
-- 5. INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_user_wallets_user ON public.user_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet ON public.wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user ON public.wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_type ON public.wallet_transactions(type);

CREATE INDEX IF NOT EXISTS idx_referral_codes_user ON public.referral_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON public.referral_codes(code);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referee ON public.referrals(referee_id);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user ON public.user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_type ON public.user_notifications(type);
CREATE INDEX IF NOT EXISTS idx_user_notifications_read ON public.user_notifications(is_read);

-- =====================================================
-- 6. ROW LEVEL SECURITY - PERMISSIVE FOR DEV
-- =====================================================

ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all user_wallets" ON public.user_wallets;
CREATE POLICY "Allow all user_wallets" ON public.user_wallets FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all wallet_transactions" ON public.wallet_transactions;
CREATE POLICY "Allow all wallet_transactions" ON public.wallet_transactions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all referral_codes" ON public.referral_codes;
CREATE POLICY "Allow all referral_codes" ON public.referral_codes FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all referrals" ON public.referrals;
CREATE POLICY "Allow all referrals" ON public.referrals FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all user_notifications" ON public.user_notifications;
CREATE POLICY "Allow all user_notifications" ON public.user_notifications FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- 7. ENABLE REALTIME
-- =====================================================

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.user_notifications;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.wallet_transactions;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- 8. TRACKING ID TRIGGERS
-- =====================================================

CREATE OR REPLACE FUNCTION set_delivery_tracking_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tracking_id IS NULL THEN
    NEW.tracking_id := 'DEL-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_delivery_tracking_id ON public.delivery_requests;
CREATE TRIGGER trigger_delivery_tracking_id
  BEFORE INSERT ON public.delivery_requests
  FOR EACH ROW EXECUTE FUNCTION set_delivery_tracking_id();

CREATE OR REPLACE FUNCTION set_shopping_tracking_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tracking_id IS NULL THEN
    NEW.tracking_id := 'SHP-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_shopping_tracking_id ON public.shopping_requests;
CREATE TRIGGER trigger_shopping_tracking_id
  BEFORE INSERT ON public.shopping_requests
  FOR EACH ROW EXECUTE FUNCTION set_shopping_tracking_id();

-- =====================================================
-- 9. WALLET FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION ensure_user_wallet(p_user_id UUID)
RETURNS UUID AS $$
DECLARE
  v_wallet_id UUID;
BEGIN
  SELECT id INTO v_wallet_id FROM public.user_wallets WHERE user_id = p_user_id;
  
  IF v_wallet_id IS NULL THEN
    INSERT INTO public.user_wallets (user_id, balance)
    VALUES (p_user_id, 0)
    RETURNING id INTO v_wallet_id;
  END IF;
  
  RETURN v_wallet_id;
END;
$$ LANGUAGE plpgsql;

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
  
  SELECT balance INTO v_current_balance FROM public.user_wallets WHERE id = v_wallet_id FOR UPDATE;
  
  IF p_type IN ('topup', 'refund', 'cashback', 'referral', 'promo') THEN
    v_new_balance := v_current_balance + p_amount;
  ELSE
    v_new_balance := v_current_balance - p_amount;
  END IF;
  
  IF p_type = 'payment' AND v_new_balance < 0 THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;
  
  INSERT INTO public.wallet_transactions (
    wallet_id, user_id, type, amount, balance_before, balance_after,
    reference_type, reference_id, description
  ) VALUES (
    v_wallet_id, p_user_id, p_type, p_amount, v_current_balance, v_new_balance,
    p_reference_type, p_reference_id, p_description
  ) RETURNING id INTO v_txn_id;
  
  UPDATE public.user_wallets 
  SET balance = v_new_balance,
      total_earned = CASE WHEN p_type IN ('topup', 'refund', 'cashback', 'referral', 'promo') 
                     THEN total_earned + p_amount ELSE total_earned END,
      total_spent = CASE WHEN p_type IN ('payment', 'withdrawal') 
                    THEN total_spent + p_amount ELSE total_spent END,
      updated_at = NOW()
  WHERE id = v_wallet_id;
  
  RETURN QUERY SELECT v_txn_id, v_new_balance;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_wallet_balance(p_user_id UUID)
RETURNS TABLE (
  balance DECIMAL(12,2),
  total_earned DECIMAL(12,2),
  total_spent DECIMAL(12,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT w.balance, w.total_earned, w.total_spent
  FROM public.user_wallets w
  WHERE w.user_id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT 0::DECIMAL(12,2), 0::DECIMAL(12,2), 0::DECIMAL(12,2);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 10. REFERRAL FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION generate_referral_code(p_user_id UUID)
RETURNS VARCHAR(20) AS $$
DECLARE
  v_code VARCHAR(20);
  v_exists BOOLEAN;
BEGIN
  SELECT code INTO v_code FROM public.referral_codes WHERE user_id = p_user_id;
  IF v_code IS NOT NULL THEN
    RETURN v_code;
  END IF;
  
  LOOP
    v_code := 'TR' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
    SELECT EXISTS(SELECT 1 FROM public.referral_codes WHERE code = v_code) INTO v_exists;
    EXIT WHEN NOT v_exists;
  END LOOP;
  
  INSERT INTO public.referral_codes (user_id, code)
  VALUES (p_user_id, v_code);
  
  RETURN v_code;
END;
$$ LANGUAGE plpgsql;

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
  SELECT * INTO v_referral_code FROM public.referral_codes 
  WHERE code = UPPER(p_code) AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'รหัสแนะนำไม่ถูกต้อง'::TEXT, 0::DECIMAL(10,2);
    RETURN;
  END IF;
  
  IF v_referral_code.user_id = p_referee_id THEN
    RETURN QUERY SELECT false, 'ไม่สามารถใช้รหัสของตัวเองได้'::TEXT, 0::DECIMAL(10,2);
    RETURN;
  END IF;
  
  SELECT EXISTS(SELECT 1 FROM public.referrals WHERE referee_id = p_referee_id) INTO v_already_referred;
  IF v_already_referred THEN
    RETURN QUERY SELECT false, 'คุณเคยใช้รหัสแนะนำแล้ว'::TEXT, 0::DECIMAL(10,2);
    RETURN;
  END IF;
  
  IF v_referral_code.max_usage IS NOT NULL AND v_referral_code.usage_count >= v_referral_code.max_usage THEN
    RETURN QUERY SELECT false, 'รหัสนี้ถูกใช้ครบจำนวนแล้ว'::TEXT, 0::DECIMAL(10,2);
    RETURN;
  END IF;
  
  INSERT INTO public.referrals (referrer_id, referee_id, referral_code, referrer_reward, referee_reward)
  VALUES (v_referral_code.user_id, p_referee_id, p_code, v_referral_code.reward_amount, v_referral_code.referee_reward);
  
  UPDATE public.referral_codes SET usage_count = usage_count + 1 WHERE id = v_referral_code.id;
  
  PERFORM add_wallet_transaction(p_referee_id, 'referral', v_referral_code.referee_reward, 'โบนัสจากการใช้รหัสแนะนำ');
  
  RETURN QUERY SELECT true, 'ใช้รหัสแนะนำสำเร็จ!'::TEXT, v_referral_code.referee_reward;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 11. NOTIFICATION FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION send_notification(
  p_user_id UUID,
  p_type VARCHAR(50),
  p_title VARCHAR(200),
  p_message TEXT,
  p_data JSONB DEFAULT NULL,
  p_action_url VARCHAR(255) DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO public.user_notifications (user_id, type, title, message, data, action_url)
  VALUES (p_user_id, p_type, p_title, p_message, p_data, p_action_url)
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 12. DELIVERY/SHOPPING FEE FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_delivery_fee(
  p_distance_km DECIMAL(10,2),
  p_package_type VARCHAR(20) DEFAULT 'small'
)
RETURNS DECIMAL(10,2) AS $$
DECLARE
  v_base_fee DECIMAL(10,2) := 35;
  v_per_km DECIMAL(10,2) := 8;
  v_size_multiplier DECIMAL(3,2) := 1.0;
BEGIN
  CASE p_package_type
    WHEN 'document' THEN v_size_multiplier := 0.8;
    WHEN 'small' THEN v_size_multiplier := 1.0;
    WHEN 'medium' THEN v_size_multiplier := 1.3;
    WHEN 'large' THEN v_size_multiplier := 1.6;
    WHEN 'fragile' THEN v_size_multiplier := 1.5;
    ELSE v_size_multiplier := 1.0;
  END CASE;
  
  RETURN ROUND((v_base_fee + (p_distance_km * v_per_km)) * v_size_multiplier, 2);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calculate_shopping_fee(
  p_estimated_items_cost DECIMAL(10,2),
  p_distance_km DECIMAL(10,2)
)
RETURNS DECIMAL(10,2) AS $$
DECLARE
  v_base_fee DECIMAL(10,2) := 29;
  v_per_km DECIMAL(10,2) := 5;
  v_percentage_fee DECIMAL(10,2);
BEGIN
  v_percentage_fee := GREATEST(20, LEAST(100, p_estimated_items_cost * 0.05));
  RETURN ROUND(v_base_fee + (p_distance_km * v_per_km) + v_percentage_fee, 2);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 13. UPDATED_AT TRIGGERS (skip if exists)
-- =====================================================

DO $$
BEGIN
  CREATE TRIGGER update_user_wallets_updated_at BEFORE UPDATE ON public.user_wallets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- 14. SAMPLE DATA
-- =====================================================

-- Create wallets for demo users
INSERT INTO public.user_wallets (user_id, balance, total_earned, total_spent)
SELECT id, 500, 1000, 500 FROM public.users WHERE email IN ('customer@demo.com', 'rider@demo.com')
ON CONFLICT (user_id) DO UPDATE SET balance = 500;

-- Create referral codes for demo users
INSERT INTO public.referral_codes (user_id, code, reward_amount, referee_reward)
SELECT id, 'DEMO' || UPPER(SUBSTRING(id::TEXT FROM 1 FOR 4)), 50, 50 
FROM public.users WHERE email = 'customer@demo.com'
ON CONFLICT (user_id) DO NOTHING;

-- Sample notifications
INSERT INTO public.user_notifications (user_id, type, title, message, data)
SELECT 
  id,
  'promo',
  'โปรโมชั่นพิเศษ!',
  'รับส่วนลด 50 บาท ใช้โค้ด DEMO50',
  '{"promo_code": "DEMO50"}'::JSONB
FROM public.users WHERE email = 'customer@demo.com';

INSERT INTO public.user_notifications (user_id, type, title, message)
SELECT 
  id,
  'system',
  'ยินดีต้อนรับสู่ ThaiRide',
  'ขอบคุณที่ใช้บริการ เริ่มต้นเรียกรถได้เลย!'
FROM public.users WHERE email = 'customer@demo.com';

-- =====================================================
-- 15. GRANT PERMISSIONS
-- =====================================================

GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
