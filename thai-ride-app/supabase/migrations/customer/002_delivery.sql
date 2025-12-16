-- =============================================
-- CUSTOMER MODULE: Delivery Service
-- =============================================
-- Feature: F03 - Delivery Service
-- Used by: Customer App
-- Depends on: core/001_users_auth.sql, provider/001_service_providers.sql
-- =============================================

-- Delivery requests table
CREATE TABLE IF NOT EXISTS delivery_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_id VARCHAR(25) UNIQUE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES service_providers(id),
  
  -- Sender info
  sender_name VARCHAR(100) NOT NULL,
  sender_phone VARCHAR(15) NOT NULL,
  sender_address TEXT NOT NULL,
  sender_lat DECIMAL(10,8) NOT NULL,
  sender_lng DECIMAL(11,8) NOT NULL,
  
  -- Recipient info
  recipient_name VARCHAR(100) NOT NULL,
  recipient_phone VARCHAR(15) NOT NULL,
  recipient_address TEXT NOT NULL,
  recipient_lat DECIMAL(10,8) NOT NULL,
  recipient_lng DECIMAL(11,8) NOT NULL,
  
  -- Package info
  package_description TEXT NOT NULL,
  package_weight DECIMAL(5,2) NOT NULL,
  package_type VARCHAR(20) DEFAULT 'small' CHECK (package_type IN ('document', 'small', 'medium', 'large', 'fragile')),
  
  -- Fees
  estimated_fee DECIMAL(10,2) NOT NULL,
  actual_fee DECIMAL(10,2),
  
  -- Photos
  pickup_photo TEXT,
  delivery_photo TEXT,
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'matched', 'pickup', 'in_transit', 'delivered', 'failed', 'cancelled')),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE delivery_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies (permissive for dev)
CREATE POLICY "Allow all delivery_requests" ON delivery_requests 
  FOR ALL USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_delivery_requests_user ON delivery_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_delivery_requests_provider ON delivery_requests(provider_id);
CREATE INDEX IF NOT EXISTS idx_delivery_requests_status ON delivery_requests(status);
CREATE INDEX IF NOT EXISTS idx_delivery_requests_tracking ON delivery_requests(tracking_id);
CREATE INDEX IF NOT EXISTS idx_delivery_requests_created ON delivery_requests(created_at DESC);

-- Tracking ID trigger
CREATE OR REPLACE FUNCTION set_delivery_tracking_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tracking_id IS NULL THEN
    NEW.tracking_id := 'DEL-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_delivery_tracking_id ON delivery_requests;
CREATE TRIGGER trigger_delivery_tracking_id
  BEFORE INSERT ON delivery_requests
  FOR EACH ROW EXECUTE FUNCTION set_delivery_tracking_id();

-- Calculate delivery fee function
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
