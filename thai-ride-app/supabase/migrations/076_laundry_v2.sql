-- Migration: 076_laundry_v2.sql
-- Feature: F160 - Laundry Service Features V2
-- Description: Laundry items, pricing, subscriptions

-- =====================================================
-- 1. Laundry Service Types
-- =====================================================
CREATE TABLE IF NOT EXISTS laundry_service_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_th TEXT NOT NULL,
  description TEXT,
  
  -- Pricing
  price_per_kg NUMERIC(10,2),
  price_per_piece NUMERIC(10,2),
  min_order_amount NUMERIC(10,2),
  
  -- Processing
  processing_hours INTEGER DEFAULT 24,
  is_express_available BOOLEAN DEFAULT TRUE,
  express_surcharge_pct NUMERIC(3,2) DEFAULT 0.5,
  
  icon_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0
);

INSERT INTO laundry_service_types (name, name_th, price_per_kg, processing_hours, sort_order) VALUES
('Wash & Fold', 'ซัก-พับ', 40, 24, 1),
('Wash & Iron', 'ซัก-รีด', 60, 48, 2),
('Dry Clean', 'ซักแห้ง', 150, 72, 3),
('Iron Only', 'รีดอย่างเดียว', 30, 24, 4),
('Bedding', 'ผ้าปูที่นอน', 100, 48, 5),
('Curtains', 'ผ้าม่าน', 120, 72, 6)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 2. Laundry Items
-- =====================================================
CREATE TABLE IF NOT EXISTS laundry_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laundry_id UUID NOT NULL REFERENCES laundry_requests(id) ON DELETE CASCADE,
  
  service_type_id UUID REFERENCES laundry_service_types(id),
  item_type TEXT, -- 'shirt', 'pants', 'dress', 'bedsheet', etc.
  quantity INTEGER DEFAULT 1,
  weight_kg NUMERIC(5,2),
  
  -- Special handling
  color TEXT,
  fabric_type TEXT,
  special_instructions TEXT,
  has_stains BOOLEAN DEFAULT FALSE,
  stain_notes TEXT,
  
  -- Pricing
  unit_price NUMERIC(10,2),
  total_price NUMERIC(10,2),
  
  -- Status
  status TEXT DEFAULT 'received' CHECK (status IN ('received', 'washing', 'drying', 'ironing', 'ready', 'delivered')),
  
  -- Photos
  before_photo_url TEXT,
  after_photo_url TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_laundry_items_laundry ON laundry_items(laundry_id);

-- =====================================================
-- 3. Laundry Subscriptions
-- =====================================================
CREATE TABLE IF NOT EXISTS laundry_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  plan_name TEXT NOT NULL,
  plan_name_th TEXT NOT NULL,
  
  -- Allowance
  kg_per_month NUMERIC(5,2),
  pieces_per_month INTEGER,
  
  -- Pricing
  monthly_price NUMERIC(10,2) NOT NULL,
  
  -- Usage
  kg_used_this_month NUMERIC(5,2) DEFAULT 0,
  pieces_used_this_month INTEGER DEFAULT 0,
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled', 'expired')),
  start_date DATE NOT NULL,
  end_date DATE,
  next_billing_date DATE,
  
  -- Pickup schedule
  preferred_pickup_day TEXT, -- 'monday', 'wednesday', etc.
  preferred_pickup_time TIME,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_laundry_subs_user ON laundry_subscriptions(user_id);

-- =====================================================
-- 4. Laundry Pickup Schedule
-- =====================================================
CREATE TABLE IF NOT EXISTS laundry_pickup_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES laundry_subscriptions(id),
  user_id UUID NOT NULL REFERENCES users(id),
  
  scheduled_date DATE NOT NULL,
  scheduled_time TIME,
  
  pickup_address TEXT NOT NULL,
  pickup_lat NUMERIC(10,7),
  pickup_lng NUMERIC(10,7),
  
  -- Status
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'picked_up', 'cancelled')),
  
  -- Linked request
  laundry_request_id UUID REFERENCES laundry_requests(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pickup_schedule_user ON laundry_pickup_schedule(user_id);
CREATE INDEX IF NOT EXISTS idx_pickup_schedule_date ON laundry_pickup_schedule(scheduled_date);

-- =====================================================
-- 5. Add columns to laundry_requests
-- =====================================================
ALTER TABLE laundry_requests
ADD COLUMN IF NOT EXISTS subscription_id UUID REFERENCES laundry_subscriptions(id),
ADD COLUMN IF NOT EXISTS total_weight_kg NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS total_pieces INTEGER,
ADD COLUMN IF NOT EXISTS is_express BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS express_fee NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS estimated_ready_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS actual_ready_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS quality_check_passed BOOLEAN,
ADD COLUMN IF NOT EXISTS quality_notes TEXT;

-- =====================================================
-- 6. Enable RLS
-- =====================================================
ALTER TABLE laundry_service_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE laundry_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE laundry_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE laundry_pickup_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone read service_types" ON laundry_service_types
  FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "Users read own laundry_items" ON laundry_items
  FOR SELECT TO authenticated USING (
    laundry_id IN (SELECT id FROM laundry_requests WHERE user_id = auth.uid())
  );

CREATE POLICY "Users manage own subscriptions" ON laundry_subscriptions
  FOR ALL TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users manage own pickup_schedule" ON laundry_pickup_schedule
  FOR ALL TO authenticated USING (user_id = auth.uid());

-- =====================================================
-- 7. Functions
-- =====================================================

-- Calculate laundry price
CREATE OR REPLACE FUNCTION calculate_laundry_price(
  p_items JSONB,
  p_is_express BOOLEAN DEFAULT FALSE
) RETURNS TABLE (
  subtotal NUMERIC,
  express_fee NUMERIC,
  total NUMERIC,
  item_breakdown JSONB
) AS $$
DECLARE
  v_item JSONB;
  v_subtotal NUMERIC := 0;
  v_express NUMERIC := 0;
  v_breakdown JSONB := '[]';
  v_service laundry_service_types%ROWTYPE;
  v_item_total NUMERIC;
BEGIN
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT * INTO v_service FROM laundry_service_types WHERE id = (v_item->>'service_type_id')::UUID;
    
    IF v_service.price_per_kg IS NOT NULL THEN
      v_item_total := v_service.price_per_kg * COALESCE((v_item->>'weight_kg')::NUMERIC, 1);
    ELSE
      v_item_total := COALESCE(v_service.price_per_piece, 50) * COALESCE((v_item->>'quantity')::INTEGER, 1);
    END IF;
    
    v_subtotal := v_subtotal + v_item_total;
    v_breakdown := v_breakdown || jsonb_build_object(
      'service', v_service.name_th,
      'quantity', COALESCE((v_item->>'quantity')::INTEGER, 1),
      'price', v_item_total
    );
  END LOOP;
  
  IF p_is_express THEN
    v_express := v_subtotal * 0.5;
  END IF;
  
  RETURN QUERY SELECT v_subtotal, v_express, v_subtotal + v_express, v_breakdown;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create subscription
CREATE OR REPLACE FUNCTION create_laundry_subscription(
  p_user_id UUID,
  p_plan_name TEXT,
  p_kg_per_month NUMERIC,
  p_monthly_price NUMERIC,
  p_pickup_day TEXT DEFAULT NULL,
  p_pickup_time TIME DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_sub_id UUID;
BEGIN
  INSERT INTO laundry_subscriptions (
    user_id, plan_name, plan_name_th, kg_per_month, monthly_price,
    start_date, next_billing_date, preferred_pickup_day, preferred_pickup_time
  ) VALUES (
    p_user_id, p_plan_name, p_plan_name, p_kg_per_month, p_monthly_price,
    CURRENT_DATE, CURRENT_DATE + INTERVAL '1 month', p_pickup_day, p_pickup_time
  ) RETURNING id INTO v_sub_id;
  
  RETURN v_sub_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update item status
CREATE OR REPLACE FUNCTION update_laundry_item_status(
  p_item_id UUID,
  p_status TEXT,
  p_after_photo TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_laundry_id UUID;
BEGIN
  UPDATE laundry_items
  SET status = p_status,
      after_photo_url = COALESCE(p_after_photo, after_photo_url)
  WHERE id = p_item_id
  RETURNING laundry_id INTO v_laundry_id;
  
  -- Check if all items ready
  IF NOT EXISTS (SELECT 1 FROM laundry_items WHERE laundry_id = v_laundry_id AND status != 'ready') THEN
    UPDATE laundry_requests
    SET status = 'ready', actual_ready_time = NOW()
    WHERE id = v_laundry_id;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE laundry_service_types IS 'Types of laundry services';
COMMENT ON TABLE laundry_items IS 'Individual items in laundry request';
COMMENT ON TABLE laundry_subscriptions IS 'Laundry subscription plans';
COMMENT ON TABLE laundry_pickup_schedule IS 'Scheduled laundry pickups';
