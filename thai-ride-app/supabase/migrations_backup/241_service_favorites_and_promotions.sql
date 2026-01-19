-- Migration: Service Favorites and Promotions
-- Description: Add tables for user favorite services and service promotions

-- =====================================================
-- 1. USER FAVORITE SERVICES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS user_favorite_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_id TEXT NOT NULL, -- e.g., 'ride', 'delivery', 'shopping'
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, service_id)
);

-- Enable RLS
ALTER TABLE user_favorite_services ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own favorite services"
  ON user_favorite_services FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own favorite services"
  ON user_favorite_services FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorite services"
  ON user_favorite_services FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own favorite services"
  ON user_favorite_services FOR UPDATE
  USING (auth.uid() = user_id);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_user_favorite_services_user 
  ON user_favorite_services(user_id, display_order);

-- =====================================================
-- 2. SERVICE PROMOTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS service_promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id TEXT NOT NULL, -- e.g., 'ride', 'delivery', 'shopping'
  title TEXT NOT NULL,
  description TEXT,
  discount_type TEXT CHECK (discount_type IN ('percentage', 'fixed', 'free_delivery')),
  discount_value DECIMAL(10,2),
  min_order_amount DECIMAL(10,2) DEFAULT 0,
  max_discount DECIMAL(10,2),
  promo_code TEXT,
  image_url TEXT,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  usage_limit INT, -- NULL = unlimited
  used_count INT DEFAULT 0,
  target_users TEXT[] DEFAULT '{}', -- empty = all users, or specific user_ids
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE service_promotions ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Everyone can view active promotions
CREATE POLICY "Anyone can view active promotions"
  ON service_promotions FOR SELECT
  USING (
    is_active = true 
    AND NOW() BETWEEN start_date AND end_date
    AND (usage_limit IS NULL OR used_count < usage_limit)
  );

-- Admin can manage promotions
CREATE POLICY "Admin can manage promotions"
  ON service_promotions FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_service_promotions_service 
  ON service_promotions(service_id, is_active);
CREATE INDEX IF NOT EXISTS idx_service_promotions_dates 
  ON service_promotions(start_date, end_date) WHERE is_active = true;

-- =====================================================
-- 3. USER PROMOTION USAGE TRACKING
-- =====================================================
CREATE TABLE IF NOT EXISTS user_promotion_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  promotion_id UUID NOT NULL REFERENCES service_promotions(id) ON DELETE CASCADE,
  order_id UUID, -- Reference to the order where promo was used
  order_type TEXT, -- 'ride', 'delivery', etc.
  discount_applied DECIMAL(10,2),
  used_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, promotion_id, order_id)
);

-- Enable RLS
ALTER TABLE user_promotion_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own promotion usage"
  ON user_promotion_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own promotion usage"
  ON user_promotion_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Index
CREATE INDEX IF NOT EXISTS idx_user_promotion_usage_user 
  ON user_promotion_usage(user_id, promotion_id);

-- =====================================================
-- 4. HELPER FUNCTIONS
-- =====================================================

-- Function to get user's favorite services
CREATE OR REPLACE FUNCTION get_user_favorite_services(p_user_id UUID)
RETURNS TABLE (
  service_id TEXT,
  display_order INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT ufs.service_id, ufs.display_order
  FROM user_favorite_services ufs
  WHERE ufs.user_id = p_user_id
  ORDER BY ufs.display_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to toggle favorite service
CREATE OR REPLACE FUNCTION toggle_favorite_service(
  p_user_id UUID,
  p_service_id TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM user_favorite_services 
    WHERE user_id = p_user_id AND service_id = p_service_id
  ) INTO v_exists;
  
  IF v_exists THEN
    DELETE FROM user_favorite_services 
    WHERE user_id = p_user_id AND service_id = p_service_id;
    RETURN false; -- Removed from favorites
  ELSE
    INSERT INTO user_favorite_services (user_id, service_id, display_order)
    VALUES (p_user_id, p_service_id, (
      SELECT COALESCE(MAX(display_order), 0) + 1 
      FROM user_favorite_services WHERE user_id = p_user_id
    ));
    RETURN true; -- Added to favorites
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get active promotions for a service
CREATE OR REPLACE FUNCTION get_service_promotions(p_service_id TEXT DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  service_id TEXT,
  title TEXT,
  description TEXT,
  discount_type TEXT,
  discount_value DECIMAL,
  min_order_amount DECIMAL,
  max_discount DECIMAL,
  promo_code TEXT,
  image_url TEXT,
  end_date TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sp.id,
    sp.service_id,
    sp.title,
    sp.description,
    sp.discount_type,
    sp.discount_value,
    sp.min_order_amount,
    sp.max_discount,
    sp.promo_code,
    sp.image_url,
    sp.end_date
  FROM service_promotions sp
  WHERE sp.is_active = true
    AND NOW() BETWEEN sp.start_date AND sp.end_date
    AND (sp.usage_limit IS NULL OR sp.used_count < sp.usage_limit)
    AND (p_service_id IS NULL OR sp.service_id = p_service_id)
  ORDER BY sp.end_date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. SEED SAMPLE PROMOTIONS
-- =====================================================
INSERT INTO service_promotions (service_id, title, description, discount_type, discount_value, min_order_amount, max_discount, start_date, end_date, is_active)
VALUES 
  ('ride', 'ลด 20% เรียกรถ', 'ลดทันที 20% สำหรับการเรียกรถทุกเที่ยว', 'percentage', 20, 50, 100, NOW(), NOW() + INTERVAL '30 days', true),
  ('delivery', 'ส่งฟรี!', 'ส่งฟรีไม่มีขั้นต่ำ เฉพาะสัปดาห์นี้', 'free_delivery', 0, 0, 50, NOW(), NOW() + INTERVAL '7 days', true),
  ('shopping', 'ลด ฿30', 'ลด 30 บาท เมื่อสั่งซื้อขั้นต่ำ 200 บาท', 'fixed', 30, 200, 30, NOW(), NOW() + INTERVAL '14 days', true)
ON CONFLICT DO NOTHING;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_favorite_services(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION toggle_favorite_service(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_service_promotions(TEXT) TO authenticated;
