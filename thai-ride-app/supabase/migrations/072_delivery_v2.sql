-- Migration: 072_delivery_v2.sql
-- Feature: F03 - Delivery Service Improvements V2
-- Description: Package tracking, insurance, multi-package delivery

-- =====================================================
-- 1. Package Types
-- =====================================================
CREATE TABLE IF NOT EXISTS package_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_th TEXT NOT NULL,
  description TEXT,
  max_weight_kg NUMERIC(5,2),
  max_dimensions_cm JSONB, -- {"length": 50, "width": 50, "height": 50}
  base_price NUMERIC(10,2) NOT NULL,
  price_per_km NUMERIC(10,2) NOT NULL,
  icon_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0
);

INSERT INTO package_types (name, name_th, max_weight_kg, base_price, price_per_km, sort_order) VALUES
('Document', 'เอกสาร', 1, 30, 5, 1),
('Small Package', 'พัสดุเล็ก', 5, 40, 6, 2),
('Medium Package', 'พัสดุกลาง', 15, 60, 8, 3),
('Large Package', 'พัสดุใหญ่', 30, 100, 12, 4),
('Fragile', 'สิ่งของแตกง่าย', 10, 80, 10, 5),
('Food', 'อาหาร', 10, 50, 7, 6)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 2. Delivery Packages (Multi-package support)
-- =====================================================
CREATE TABLE IF NOT EXISTS delivery_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID NOT NULL REFERENCES delivery_requests(id) ON DELETE CASCADE,
  
  package_type_id UUID REFERENCES package_types(id),
  description TEXT,
  weight_kg NUMERIC(5,2),
  dimensions_cm JSONB,
  
  -- Value & Insurance
  declared_value NUMERIC(10,2),
  is_insured BOOLEAN DEFAULT FALSE,
  insurance_fee NUMERIC(10,2),
  
  -- Photos
  photo_urls TEXT[] DEFAULT '{}',
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'picked_up', 'in_transit', 'delivered', 'returned')),
  picked_up_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_delivery_packages_delivery ON delivery_packages(delivery_id);

-- =====================================================
-- 3. Delivery Tracking Events
-- =====================================================
CREATE TABLE IF NOT EXISTS delivery_tracking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID NOT NULL REFERENCES delivery_requests(id) ON DELETE CASCADE,
  
  event_type TEXT NOT NULL CHECK (event_type IN (
    'created', 'assigned', 'pickup_started', 'picked_up',
    'in_transit', 'arrived', 'delivered', 'failed', 'returned'
  )),
  
  lat NUMERIC(10,7),
  lng NUMERIC(10,7),
  address TEXT,
  
  notes TEXT,
  photo_url TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID
);

CREATE INDEX IF NOT EXISTS idx_tracking_events_delivery ON delivery_tracking_events(delivery_id);

-- =====================================================
-- 4. Delivery Insurance Claims
-- =====================================================
CREATE TABLE IF NOT EXISTS delivery_insurance_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID NOT NULL REFERENCES delivery_requests(id),
  package_id UUID REFERENCES delivery_packages(id),
  user_id UUID NOT NULL REFERENCES users(id),
  
  claim_type TEXT NOT NULL CHECK (claim_type IN ('damage', 'loss', 'delay', 'other')),
  description TEXT NOT NULL,
  claimed_amount NUMERIC(10,2) NOT NULL,
  
  -- Evidence
  photo_urls TEXT[] DEFAULT '{}',
  
  -- Status
  status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'approved', 'rejected', 'paid')),
  approved_amount NUMERIC(10,2),
  reviewer_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_insurance_claims_delivery ON delivery_insurance_claims(delivery_id);

-- =====================================================
-- 5. Add columns to delivery_requests
-- =====================================================
ALTER TABLE delivery_requests
ADD COLUMN IF NOT EXISTS package_count INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS total_weight_kg NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS is_express BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS express_fee NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS insurance_total NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS estimated_pickup_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS estimated_delivery_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS actual_pickup_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS actual_delivery_time TIMESTAMPTZ;

-- =====================================================
-- 6. Enable RLS
-- =====================================================
ALTER TABLE package_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_tracking_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_insurance_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone read package_types" ON package_types
  FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "Users read own delivery_packages" ON delivery_packages
  FOR SELECT TO authenticated USING (
    delivery_id IN (SELECT id FROM delivery_requests WHERE user_id = auth.uid())
  );

CREATE POLICY "Users read own tracking_events" ON delivery_tracking_events
  FOR SELECT TO authenticated USING (
    delivery_id IN (SELECT id FROM delivery_requests WHERE user_id = auth.uid())
  );

CREATE POLICY "Users manage own insurance_claims" ON delivery_insurance_claims
  FOR ALL TO authenticated USING (user_id = auth.uid());

-- =====================================================
-- 7. Functions
-- =====================================================

-- Calculate delivery fee
CREATE OR REPLACE FUNCTION calculate_delivery_fee_v2(
  p_package_type_id UUID,
  p_distance_km NUMERIC,
  p_is_express BOOLEAN DEFAULT FALSE,
  p_declared_value NUMERIC DEFAULT 0
) RETURNS TABLE (
  base_fee NUMERIC,
  distance_fee NUMERIC,
  express_fee NUMERIC,
  insurance_fee NUMERIC,
  total_fee NUMERIC
) AS $$
DECLARE
  v_pkg package_types%ROWTYPE;
  v_base NUMERIC;
  v_distance NUMERIC;
  v_express NUMERIC := 0;
  v_insurance NUMERIC := 0;
BEGIN
  SELECT * INTO v_pkg FROM package_types WHERE id = p_package_type_id;
  
  v_base := COALESCE(v_pkg.base_price, 40);
  v_distance := COALESCE(v_pkg.price_per_km, 6) * p_distance_km;
  
  IF p_is_express THEN
    v_express := (v_base + v_distance) * 0.5; -- 50% express surcharge
  END IF;
  
  IF p_declared_value > 0 THEN
    v_insurance := p_declared_value * 0.02; -- 2% insurance fee
  END IF;
  
  RETURN QUERY SELECT v_base, v_distance, v_express, v_insurance, 
    (v_base + v_distance + v_express + v_insurance);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add tracking event
CREATE OR REPLACE FUNCTION add_delivery_tracking_event(
  p_delivery_id UUID,
  p_event_type TEXT,
  p_lat NUMERIC DEFAULT NULL,
  p_lng NUMERIC DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_photo_url TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO delivery_tracking_events (
    delivery_id, event_type, lat, lng, notes, photo_url, created_by
  ) VALUES (
    p_delivery_id, p_event_type, p_lat, p_lng, p_notes, p_photo_url, auth.uid()
  ) RETURNING id INTO v_event_id;
  
  -- Update delivery status
  UPDATE delivery_requests
  SET status = CASE p_event_type
    WHEN 'assigned' THEN 'matched'
    WHEN 'picked_up' THEN 'in_transit'
    WHEN 'delivered' THEN 'completed'
    WHEN 'failed' THEN 'failed'
    ELSE status
  END,
  actual_pickup_time = CASE WHEN p_event_type = 'picked_up' THEN NOW() ELSE actual_pickup_time END,
  actual_delivery_time = CASE WHEN p_event_type = 'delivered' THEN NOW() ELSE actual_delivery_time END
  WHERE id = p_delivery_id;
  
  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get delivery timeline
CREATE OR REPLACE FUNCTION get_delivery_timeline(p_delivery_id UUID)
RETURNS TABLE (
  event_id UUID,
  event_type TEXT,
  event_time TIMESTAMPTZ,
  lat NUMERIC,
  lng NUMERIC,
  notes TEXT,
  photo_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT id, dte.event_type, created_at, dte.lat, dte.lng, dte.notes, dte.photo_url
  FROM delivery_tracking_events dte
  WHERE delivery_id = p_delivery_id
  ORDER BY created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE package_types IS 'Package type definitions with pricing';
COMMENT ON TABLE delivery_packages IS 'Individual packages in a delivery';
COMMENT ON TABLE delivery_tracking_events IS 'Delivery tracking timeline';
COMMENT ON TABLE delivery_insurance_claims IS 'Insurance claims for deliveries';
