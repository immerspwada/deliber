-- Migration: 073_shopping_v2.sql
-- Feature: F04 - Shopping Service Optimization V2
-- Description: Store catalog, shopping lists, price comparison

-- =====================================================
-- 1. Store Catalog
-- =====================================================
CREATE TABLE IF NOT EXISTS store_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_th TEXT NOT NULL,
  category TEXT NOT NULL, -- 'supermarket', 'convenience', 'pharmacy', 'restaurant'
  
  -- Location
  lat NUMERIC(10,7),
  lng NUMERIC(10,7),
  address TEXT,
  
  -- Info
  logo_url TEXT,
  phone TEXT,
  operating_hours JSONB,
  
  -- Service
  delivery_available BOOLEAN DEFAULT TRUE,
  min_order_amount NUMERIC(10,2),
  delivery_fee NUMERIC(10,2),
  avg_prep_time_minutes INTEGER DEFAULT 30,
  
  -- Rating
  rating NUMERIC(3,2) DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  
  is_active BOOLEAN DEFAULT TRUE,
  is_featured BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_catalog_category ON store_catalog(category);
CREATE INDEX IF NOT EXISTS idx_store_catalog_location ON store_catalog(lat, lng);

-- =====================================================
-- 2. Shopping List Templates
-- =====================================================
CREATE TABLE IF NOT EXISTS shopping_list_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  description TEXT,
  
  items JSONB NOT NULL DEFAULT '[]', -- [{name, quantity, unit, estimated_price}]
  
  preferred_store_id UUID REFERENCES store_catalog(id),
  estimated_total NUMERIC(10,2),
  
  is_public BOOLEAN DEFAULT FALSE,
  use_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shopping_templates_user ON shopping_list_templates(user_id);

-- =====================================================
-- 3. Shopping Request Items
-- =====================================================
CREATE TABLE IF NOT EXISTS shopping_request_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shopping_id UUID NOT NULL REFERENCES shopping_requests(id) ON DELETE CASCADE,
  
  item_name TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  unit TEXT DEFAULT 'ชิ้น',
  notes TEXT,
  
  -- Pricing
  estimated_price NUMERIC(10,2),
  actual_price NUMERIC(10,2),
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'found', 'not_found', 'substituted', 'purchased')),
  substitution_name TEXT,
  substitution_price NUMERIC(10,2),
  
  -- Photo
  photo_url TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shopping_items_request ON shopping_request_items(shopping_id);

-- =====================================================
-- 4. Price Comparison
-- =====================================================
CREATE TABLE IF NOT EXISTS price_comparison (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name TEXT NOT NULL,
  store_id UUID REFERENCES store_catalog(id),
  
  price NUMERIC(10,2) NOT NULL,
  unit TEXT,
  
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  reported_by UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_price_comparison_product ON price_comparison(product_name);

-- =====================================================
-- 5. Add columns to shopping_requests
-- =====================================================
ALTER TABLE shopping_requests
ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES store_catalog(id),
ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES shopping_list_templates(id),
ADD COLUMN IF NOT EXISTS item_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS items_found INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS items_not_found INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS allow_substitutions BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS max_budget NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS actual_total NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS receipt_photo_url TEXT;

-- =====================================================
-- 6. Enable RLS
-- =====================================================
ALTER TABLE store_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_list_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_request_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_comparison ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone read active stores" ON store_catalog
  FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "Users manage own templates" ON shopping_list_templates
  FOR ALL TO authenticated USING (user_id = auth.uid() OR is_public = true);

CREATE POLICY "Users read own shopping_items" ON shopping_request_items
  FOR SELECT TO authenticated USING (
    shopping_id IN (SELECT id FROM shopping_requests WHERE user_id = auth.uid())
  );

CREATE POLICY "Anyone read price_comparison" ON price_comparison
  FOR SELECT TO authenticated USING (true);

-- =====================================================
-- 7. Functions
-- =====================================================

-- Find nearby stores
CREATE OR REPLACE FUNCTION find_nearby_stores(
  p_lat NUMERIC,
  p_lng NUMERIC,
  p_radius_km NUMERIC DEFAULT 5,
  p_category TEXT DEFAULT NULL
) RETURNS TABLE (
  store_id UUID,
  name TEXT,
  name_th TEXT,
  category TEXT,
  distance_km NUMERIC,
  rating NUMERIC,
  delivery_fee NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sc.id,
    sc.name,
    sc.name_th,
    sc.category,
    ROUND((SQRT(POWER(sc.lat - p_lat, 2) + POWER(sc.lng - p_lng, 2)) * 111)::NUMERIC, 2) as distance_km,
    sc.rating,
    sc.delivery_fee
  FROM store_catalog sc
  WHERE sc.is_active = true
    AND sc.delivery_available = true
    AND (p_category IS NULL OR sc.category = p_category)
    AND SQRT(POWER(sc.lat - p_lat, 2) + POWER(sc.lng - p_lng, 2)) * 111 <= p_radius_km
  ORDER BY distance_km;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create shopping from template
CREATE OR REPLACE FUNCTION create_shopping_from_template(
  p_user_id UUID,
  p_template_id UUID,
  p_delivery_address TEXT,
  p_delivery_lat NUMERIC,
  p_delivery_lng NUMERIC
) RETURNS UUID AS $$
DECLARE
  v_template shopping_list_templates%ROWTYPE;
  v_shopping_id UUID;
  v_item JSONB;
BEGIN
  SELECT * INTO v_template FROM shopping_list_templates WHERE id = p_template_id;
  
  -- Create shopping request
  INSERT INTO shopping_requests (
    user_id, template_id, store_id, delivery_address, delivery_lat, delivery_lng,
    item_count, status
  ) VALUES (
    p_user_id, p_template_id, v_template.preferred_store_id,
    p_delivery_address, p_delivery_lat, p_delivery_lng,
    jsonb_array_length(v_template.items), 'pending'
  ) RETURNING id INTO v_shopping_id;
  
  -- Create items
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_template.items)
  LOOP
    INSERT INTO shopping_request_items (
      shopping_id, item_name, quantity, unit, estimated_price
    ) VALUES (
      v_shopping_id,
      v_item->>'name',
      (v_item->>'quantity')::INTEGER,
      COALESCE(v_item->>'unit', 'ชิ้น'),
      (v_item->>'estimated_price')::NUMERIC
    );
  END LOOP;
  
  -- Update template use count
  UPDATE shopping_list_templates SET use_count = use_count + 1 WHERE id = p_template_id;
  
  RETURN v_shopping_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update item status
CREATE OR REPLACE FUNCTION update_shopping_item_status(
  p_item_id UUID,
  p_status TEXT,
  p_actual_price NUMERIC DEFAULT NULL,
  p_substitution_name TEXT DEFAULT NULL,
  p_substitution_price NUMERIC DEFAULT NULL,
  p_photo_url TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_shopping_id UUID;
BEGIN
  UPDATE shopping_request_items
  SET status = p_status,
      actual_price = COALESCE(p_actual_price, actual_price),
      substitution_name = p_substitution_name,
      substitution_price = p_substitution_price,
      photo_url = COALESCE(p_photo_url, photo_url)
  WHERE id = p_item_id
  RETURNING shopping_id INTO v_shopping_id;
  
  -- Update shopping request counts
  UPDATE shopping_requests sr
  SET items_found = (SELECT COUNT(*) FROM shopping_request_items WHERE shopping_id = v_shopping_id AND status IN ('found', 'substituted', 'purchased')),
      items_not_found = (SELECT COUNT(*) FROM shopping_request_items WHERE shopping_id = v_shopping_id AND status = 'not_found'),
      actual_total = (SELECT SUM(COALESCE(actual_price, substitution_price, 0)) FROM shopping_request_items WHERE shopping_id = v_shopping_id)
  WHERE id = v_shopping_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE store_catalog IS 'Store directory for shopping service';
COMMENT ON TABLE shopping_list_templates IS 'Reusable shopping list templates';
COMMENT ON TABLE shopping_request_items IS 'Individual items in shopping request';
COMMENT ON TABLE price_comparison IS 'Price comparison data';
