-- =============================================
-- CUSTOMER MODULE: Shopping Service
-- =============================================
-- Feature: F04 - Shopping Service
-- Used by: Customer App
-- Depends on: core/001_users_auth.sql, provider/001_service_providers.sql
-- =============================================

-- Shopping requests table
CREATE TABLE IF NOT EXISTS shopping_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_id VARCHAR(25) UNIQUE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES service_providers(id),
  
  -- Store info
  store_name VARCHAR(200) NOT NULL,
  store_address TEXT NOT NULL,
  store_lat DECIMAL(10,8) NOT NULL,
  store_lng DECIMAL(11,8) NOT NULL,
  
  -- Delivery info
  delivery_address TEXT NOT NULL,
  delivery_lat DECIMAL(10,8) NOT NULL,
  delivery_lng DECIMAL(11,8) NOT NULL,
  
  -- Items
  item_list TEXT NOT NULL,
  budget_limit DECIMAL(10,2) NOT NULL,
  special_instructions TEXT,
  
  -- Costs
  service_fee DECIMAL(10,2) NOT NULL,
  items_cost DECIMAL(10,2),
  total_cost DECIMAL(10,2),
  
  -- Photos
  receipt_photo TEXT,
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'matched', 'shopping', 'delivering', 'completed', 'cancelled')),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE shopping_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies (permissive for dev)
CREATE POLICY "Allow all shopping_requests" ON shopping_requests 
  FOR ALL USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_shopping_requests_user ON shopping_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_shopping_requests_provider ON shopping_requests(provider_id);
CREATE INDEX IF NOT EXISTS idx_shopping_requests_status ON shopping_requests(status);
CREATE INDEX IF NOT EXISTS idx_shopping_requests_tracking ON shopping_requests(tracking_id);
CREATE INDEX IF NOT EXISTS idx_shopping_requests_created ON shopping_requests(created_at DESC);

-- Tracking ID trigger
CREATE OR REPLACE FUNCTION set_shopping_tracking_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tracking_id IS NULL THEN
    NEW.tracking_id := 'SHP-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_shopping_tracking_id ON shopping_requests;
CREATE TRIGGER trigger_shopping_tracking_id
  BEFORE INSERT ON shopping_requests
  FOR EACH ROW EXECUTE FUNCTION set_shopping_tracking_id();

-- Calculate shopping fee function
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
