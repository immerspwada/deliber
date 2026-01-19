-- Migration: 167_service_bundles.sql
-- Feature: Service Bundles - Allow customers to book multiple services at once
-- Example: Moving + Laundry, Ride + Shopping, etc.
-- Total Role Coverage: Customer creates, Provider accepts, Admin manages

-- ============================================================================
-- 1. SERVICE BUNDLES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS service_bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_uid TEXT UNIQUE NOT NULL DEFAULT 'BDL-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0'),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  
  -- Bundle details
  name TEXT NOT NULL, -- e.g., "Moving + Laundry Package"
  description TEXT,
  
  -- Services included (array of service types)
  services JSONB NOT NULL, -- [{"type": "moving", "request_id": "uuid"}, {"type": "laundry", "request_id": "uuid"}]
  
  -- Pricing
  total_estimated_price DECIMAL(10,2) NOT NULL,
  total_final_price DECIMAL(10,2),
  bundle_discount DECIMAL(10,2) DEFAULT 0, -- Discount for booking bundle
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending',
  -- pending: Bundle created, waiting for all services to be matched
  -- active: At least one service is in progress
  -- completed: All services completed
  -- cancelled: Bundle cancelled
  -- partial: Some services completed, some cancelled
  
  -- Tracking
  all_services_matched BOOLEAN DEFAULT FALSE,
  all_services_completed BOOLEAN DEFAULT FALSE,
  completed_services_count INTEGER DEFAULT 0,
  total_services_count INTEGER NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  CONSTRAINT valid_status CHECK (status IN ('pending', 'active', 'completed', 'cancelled', 'partial')),
  CONSTRAINT valid_services CHECK (jsonb_array_length(services) > 1), -- Must have at least 2 services
  CONSTRAINT valid_discount CHECK (bundle_discount >= 0)
);

-- Indexes
CREATE INDEX idx_service_bundles_user_id ON service_bundles(user_id);
CREATE INDEX idx_service_bundles_status ON service_bundles(status);
CREATE INDEX idx_service_bundles_created_at ON service_bundles(created_at DESC);
CREATE INDEX idx_service_bundles_bundle_uid ON service_bundles(bundle_uid);

-- ============================================================================
-- 2. BUNDLE TEMPLATES (Pre-defined popular bundles)
-- ============================================================================

CREATE TABLE IF NOT EXISTS bundle_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_th TEXT NOT NULL,
  description TEXT,
  description_th TEXT,
  
  -- Services included
  service_types TEXT[] NOT NULL, -- ['moving', 'laundry']
  
  -- Pricing
  discount_percentage DECIMAL(5,2) DEFAULT 10.00, -- 10% discount for bundle
  
  -- Display
  icon TEXT,
  color TEXT DEFAULT '#00A86B',
  is_popular BOOLEAN DEFAULT FALSE,
  display_order INTEGER DEFAULT 0,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed popular bundle templates
INSERT INTO bundle_templates (name, name_th, service_types, discount_percentage, is_popular, display_order) VALUES
('Moving + Laundry', 'ขนย้าย + ซักผ้า', ARRAY['moving', 'laundry'], 15.00, TRUE, 1),
('Ride + Shopping', 'เรียกรถ + ซื้อของ', ARRAY['ride', 'shopping'], 10.00, TRUE, 2),
('Delivery + Shopping', 'ส่งของ + ซื้อของ', ARRAY['delivery', 'shopping'], 10.00, FALSE, 3),
('Moving + Cleaning', 'ขนย้าย + ทำความสะอาด', ARRAY['moving', 'laundry'], 20.00, TRUE, 4);

-- ============================================================================
-- 3. RLS POLICIES
-- ============================================================================

ALTER TABLE service_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bundle_templates ENABLE ROW LEVEL SECURITY;

-- Customers can view their own bundles
CREATE POLICY "customers_view_own_bundles" ON service_bundles
  FOR SELECT USING (auth.uid() = user_id);

-- Customers can create bundles
CREATE POLICY "customers_create_bundles" ON service_bundles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Customers can update their own bundles (cancel only)
CREATE POLICY "customers_update_own_bundles" ON service_bundles
  FOR UPDATE USING (auth.uid() = user_id);

-- Admins can view all bundles
CREATE POLICY "admins_view_all_bundles" ON service_bundles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Admins can update all bundles
CREATE POLICY "admins_update_all_bundles" ON service_bundles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Everyone can view active bundle templates
CREATE POLICY "public_view_active_templates" ON bundle_templates
  FOR SELECT USING (is_active = TRUE);

-- Admins can manage templates
CREATE POLICY "admins_manage_templates" ON bundle_templates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================================
-- 4. FUNCTIONS
-- ============================================================================

-- Calculate bundle discount
CREATE OR REPLACE FUNCTION calculate_bundle_discount(
  p_service_types TEXT[],
  p_total_price DECIMAL
) RETURNS DECIMAL AS $$
DECLARE
  v_discount_percentage DECIMAL;
  v_discount_amount DECIMAL;
BEGIN
  -- Get discount percentage from template
  SELECT discount_percentage INTO v_discount_percentage
  FROM bundle_templates
  WHERE service_types = p_service_types
    AND is_active = TRUE
  LIMIT 1;
  
  -- Default 10% if no template found
  v_discount_percentage := COALESCE(v_discount_percentage, 10.00);
  
  -- Calculate discount amount
  v_discount_amount := (p_total_price * v_discount_percentage / 100);
  
  RETURN ROUND(v_discount_amount, 2);
END;
$$ LANGUAGE plpgsql;

-- Create service bundle
CREATE OR REPLACE FUNCTION create_service_bundle(
  p_user_id UUID,
  p_name TEXT,
  p_services JSONB,
  p_total_estimated_price DECIMAL
) RETURNS UUID AS $$
DECLARE
  v_bundle_id UUID;
  v_discount DECIMAL;
  v_service_types TEXT[];
BEGIN
  -- Extract service types from services JSON
  SELECT ARRAY_AGG(value->>'type')
  INTO v_service_types
  FROM jsonb_array_elements(p_services);
  
  -- Calculate bundle discount
  v_discount := calculate_bundle_discount(v_service_types, p_total_estimated_price);
  
  -- Create bundle
  INSERT INTO service_bundles (
    user_id,
    name,
    services,
    total_estimated_price,
    bundle_discount,
    total_services_count,
    status
  ) VALUES (
    p_user_id,
    p_name,
    p_services,
    p_total_estimated_price,
    v_discount,
    jsonb_array_length(p_services),
    'pending'
  )
  RETURNING id INTO v_bundle_id;
  
  RETURN v_bundle_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update bundle status based on service statuses
CREATE OR REPLACE FUNCTION update_bundle_status(
  p_bundle_id UUID
) RETURNS VOID AS $$
DECLARE
  v_bundle service_bundles%ROWTYPE;
  v_service JSONB;
  v_service_status TEXT;
  v_matched_count INTEGER := 0;
  v_completed_count INTEGER := 0;
  v_cancelled_count INTEGER := 0;
  v_total_count INTEGER;
  v_new_status TEXT;
BEGIN
  -- Get bundle
  SELECT * INTO v_bundle FROM service_bundles WHERE id = p_bundle_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  v_total_count := v_bundle.total_services_count;
  
  -- Check status of each service
  FOR v_service IN SELECT * FROM jsonb_array_elements(v_bundle.services)
  LOOP
    -- Get service status based on type
    CASE v_service->>'type'
      WHEN 'ride' THEN
        SELECT status INTO v_service_status FROM ride_requests WHERE id = (v_service->>'request_id')::UUID;
      WHEN 'delivery' THEN
        SELECT status INTO v_service_status FROM delivery_requests WHERE id = (v_service->>'request_id')::UUID;
      WHEN 'shopping' THEN
        SELECT status INTO v_service_status FROM shopping_requests WHERE id = (v_service->>'request_id')::UUID;
      WHEN 'queue' THEN
        SELECT status INTO v_service_status FROM queue_bookings WHERE id = (v_service->>'request_id')::UUID;
      WHEN 'moving' THEN
        SELECT status INTO v_service_status FROM moving_requests WHERE id = (v_service->>'request_id')::UUID;
      WHEN 'laundry' THEN
        SELECT status INTO v_service_status FROM laundry_requests WHERE id = (v_service->>'request_id')::UUID;
    END CASE;
    
    -- Count statuses
    IF v_service_status IN ('matched', 'in_progress', 'completed') THEN
      v_matched_count := v_matched_count + 1;
    END IF;
    
    IF v_service_status = 'completed' THEN
      v_completed_count := v_completed_count + 1;
    END IF;
    
    IF v_service_status = 'cancelled' THEN
      v_cancelled_count := v_cancelled_count + 1;
    END IF;
  END LOOP;
  
  -- Determine new bundle status
  IF v_completed_count = v_total_count THEN
    v_new_status := 'completed';
  ELSIF v_cancelled_count = v_total_count THEN
    v_new_status := 'cancelled';
  ELSIF v_completed_count > 0 AND (v_completed_count + v_cancelled_count) = v_total_count THEN
    v_new_status := 'partial';
  ELSIF v_matched_count > 0 THEN
    v_new_status := 'active';
  ELSE
    v_new_status := 'pending';
  END IF;
  
  -- Update bundle
  UPDATE service_bundles
  SET 
    status = v_new_status,
    all_services_matched = (v_matched_count = v_total_count),
    all_services_completed = (v_completed_count = v_total_count),
    completed_services_count = v_completed_count,
    completed_at = CASE WHEN v_new_status = 'completed' THEN NOW() ELSE NULL END,
    updated_at = NOW()
  WHERE id = p_bundle_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. TRIGGERS
-- ============================================================================

-- Auto-update bundle status when any service status changes
CREATE OR REPLACE FUNCTION trigger_update_bundle_status()
RETURNS TRIGGER AS $$
DECLARE
  v_bundle_id UUID;
BEGIN
  -- Find bundle containing this service
  SELECT id INTO v_bundle_id
  FROM service_bundles
  WHERE services @> jsonb_build_array(jsonb_build_object('request_id', NEW.id::TEXT))
  LIMIT 1;
  
  IF v_bundle_id IS NOT NULL THEN
    PERFORM update_bundle_status(v_bundle_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for all service tables
CREATE TRIGGER update_bundle_on_ride_status
  AFTER UPDATE OF status ON ride_requests
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_bundle_status();

CREATE TRIGGER update_bundle_on_delivery_status
  AFTER UPDATE OF status ON delivery_requests
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_bundle_status();

CREATE TRIGGER update_bundle_on_shopping_status
  AFTER UPDATE OF status ON shopping_requests
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_bundle_status();

CREATE TRIGGER update_bundle_on_queue_status
  AFTER UPDATE OF status ON queue_bookings
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_bundle_status();

CREATE TRIGGER update_bundle_on_moving_status
  AFTER UPDATE OF status ON moving_requests
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_bundle_status();

CREATE TRIGGER update_bundle_on_laundry_status
  AFTER UPDATE OF status ON laundry_requests
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_bundle_status();

-- ============================================================================
-- 6. REALTIME
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE service_bundles;

-- ============================================================================
-- 7. COMMENTS
-- ============================================================================

COMMENT ON TABLE service_bundles IS 'Service bundles - allows customers to book multiple services together with discount';
COMMENT ON TABLE bundle_templates IS 'Pre-defined bundle templates with discount rates';
COMMENT ON COLUMN service_bundles.services IS 'JSONB array of services: [{"type": "moving", "request_id": "uuid"}, ...]';
COMMENT ON COLUMN service_bundles.bundle_discount IS 'Discount amount for booking bundle (in THB)';
COMMENT ON FUNCTION create_service_bundle IS 'Create a new service bundle with automatic discount calculation';
COMMENT ON FUNCTION update_bundle_status IS 'Update bundle status based on individual service statuses';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Verify tables created
DO $$
BEGIN
  RAISE NOTICE 'Migration 167 Complete: Service Bundles';
  RAISE NOTICE 'Tables: service_bundles, bundle_templates';
  RAISE NOTICE 'Functions: create_service_bundle, update_bundle_status, calculate_bundle_discount';
  RAISE NOTICE 'Triggers: Auto-update bundle status on service status changes';
END $$;
