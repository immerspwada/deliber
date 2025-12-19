-- Migration: 075_moving_v2.sql
-- Feature: F159 - Moving Service Features V2
-- Description: Inventory management, crew scheduling, pricing calculator

-- =====================================================
-- 1. Moving Inventory Items
-- =====================================================
CREATE TABLE IF NOT EXISTS moving_inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  moving_id UUID NOT NULL REFERENCES moving_requests(id) ON DELETE CASCADE,
  
  item_name TEXT NOT NULL,
  category TEXT CHECK (category IN ('furniture', 'appliance', 'box', 'fragile', 'special', 'other')),
  quantity INTEGER DEFAULT 1,
  
  -- Dimensions
  length_cm INTEGER,
  width_cm INTEGER,
  height_cm INTEGER,
  weight_kg NUMERIC(6,2),
  
  -- Special handling
  requires_disassembly BOOLEAN DEFAULT FALSE,
  is_fragile BOOLEAN DEFAULT FALSE,
  special_instructions TEXT,
  
  -- Photos
  photo_urls TEXT[] DEFAULT '{}',
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'loaded', 'in_transit', 'unloaded', 'damaged')),
  damage_notes TEXT,
  damage_photos TEXT[] DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_moving_inventory_moving ON moving_inventory_items(moving_id);

-- =====================================================
-- 2. Moving Crew
-- =====================================================
CREATE TABLE IF NOT EXISTS moving_crew (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES service_providers(id),
  
  crew_role TEXT CHECK (crew_role IN ('driver', 'helper', 'supervisor')),
  hourly_rate NUMERIC(10,2),
  
  -- Skills
  can_drive_truck BOOLEAN DEFAULT FALSE,
  can_handle_fragile BOOLEAN DEFAULT FALSE,
  can_disassemble BOOLEAN DEFAULT FALSE,
  
  -- Availability
  is_available BOOLEAN DEFAULT TRUE,
  
  -- Stats
  total_jobs INTEGER DEFAULT 0,
  rating NUMERIC(3,2) DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 3. Moving Job Assignments
-- =====================================================
CREATE TABLE IF NOT EXISTS moving_job_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  moving_id UUID NOT NULL REFERENCES moving_requests(id) ON DELETE CASCADE,
  crew_id UUID NOT NULL REFERENCES moving_crew(id),
  
  assigned_role TEXT,
  hourly_rate NUMERIC(10,2),
  
  -- Time tracking
  check_in_time TIMESTAMPTZ,
  check_out_time TIMESTAMPTZ,
  hours_worked NUMERIC(4,2),
  
  -- Payment
  total_pay NUMERIC(10,2),
  is_paid BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(moving_id, crew_id)
);

CREATE INDEX IF NOT EXISTS idx_job_assignments_moving ON moving_job_assignments(moving_id);

-- =====================================================
-- 4. Moving Price Calculator
-- =====================================================
CREATE TABLE IF NOT EXISTS moving_price_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  config_type TEXT NOT NULL, -- 'base_rate', 'distance_rate', 'floor_rate', 'item_rate'
  config_key TEXT NOT NULL,
  config_value NUMERIC(10,2) NOT NULL,
  description TEXT,
  
  is_active BOOLEAN DEFAULT TRUE,
  
  UNIQUE(config_type, config_key)
);

-- Insert default pricing
INSERT INTO moving_price_config (config_type, config_key, config_value, description) VALUES
('base_rate', 'small_truck', 1500, 'Base rate for small truck'),
('base_rate', 'medium_truck', 2500, 'Base rate for medium truck'),
('base_rate', 'large_truck', 4000, 'Base rate for large truck'),
('distance_rate', 'per_km', 15, 'Rate per kilometer'),
('floor_rate', 'per_floor', 200, 'Rate per floor (no elevator)'),
('item_rate', 'furniture', 100, 'Rate per furniture item'),
('item_rate', 'appliance', 150, 'Rate per appliance'),
('item_rate', 'fragile', 200, 'Rate per fragile item'),
('helper_rate', 'per_hour', 150, 'Helper rate per hour')
ON CONFLICT DO NOTHING;

-- =====================================================
-- 5. Add columns to moving_requests
-- =====================================================
ALTER TABLE moving_requests
ADD COLUMN IF NOT EXISTS inventory_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_volume_cbm NUMERIC(6,2),
ADD COLUMN IF NOT EXISTS total_weight_kg NUMERIC(8,2),
ADD COLUMN IF NOT EXISTS crew_size INTEGER DEFAULT 2,
ADD COLUMN IF NOT EXISTS truck_type TEXT DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS origin_floor INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS destination_floor INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS has_elevator_origin BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS has_elevator_destination BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS packing_service BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS unpacking_service BOOLEAN DEFAULT FALSE;

-- =====================================================
-- 6. Enable RLS
-- =====================================================
ALTER TABLE moving_inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE moving_crew ENABLE ROW LEVEL SECURITY;
ALTER TABLE moving_job_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE moving_price_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own inventory" ON moving_inventory_items
  FOR SELECT TO authenticated USING (
    moving_id IN (SELECT id FROM moving_requests WHERE user_id = auth.uid())
  );

CREATE POLICY "Anyone read price_config" ON moving_price_config
  FOR SELECT TO authenticated USING (is_active = true);

-- =====================================================
-- 7. Functions
-- =====================================================

-- Calculate moving price
CREATE OR REPLACE FUNCTION calculate_moving_price(
  p_truck_type TEXT,
  p_distance_km NUMERIC,
  p_origin_floor INTEGER,
  p_dest_floor INTEGER,
  p_has_elevator_origin BOOLEAN,
  p_has_elevator_dest BOOLEAN,
  p_crew_size INTEGER,
  p_estimated_hours NUMERIC,
  p_inventory_items JSONB DEFAULT '[]'
) RETURNS TABLE (
  base_price NUMERIC,
  distance_price NUMERIC,
  floor_price NUMERIC,
  item_price NUMERIC,
  crew_price NUMERIC,
  total_price NUMERIC,
  breakdown JSONB
) AS $$
DECLARE
  v_base NUMERIC;
  v_distance NUMERIC;
  v_floor NUMERIC := 0;
  v_items NUMERIC := 0;
  v_crew NUMERIC;
  v_total NUMERIC;
  v_breakdown JSONB;
BEGIN
  -- Base rate
  SELECT config_value INTO v_base FROM moving_price_config 
  WHERE config_type = 'base_rate' AND config_key = p_truck_type || '_truck';
  v_base := COALESCE(v_base, 2500);
  
  -- Distance
  SELECT config_value * p_distance_km INTO v_distance FROM moving_price_config 
  WHERE config_type = 'distance_rate' AND config_key = 'per_km';
  v_distance := COALESCE(v_distance, p_distance_km * 15);
  
  -- Floor charges (only if no elevator)
  IF NOT p_has_elevator_origin AND p_origin_floor > 1 THEN
    SELECT config_value * (p_origin_floor - 1) INTO v_floor FROM moving_price_config 
    WHERE config_type = 'floor_rate' AND config_key = 'per_floor';
  END IF;
  IF NOT p_has_elevator_dest AND p_dest_floor > 1 THEN
    v_floor := v_floor + (SELECT COALESCE(config_value, 200) * (p_dest_floor - 1) FROM moving_price_config 
    WHERE config_type = 'floor_rate' AND config_key = 'per_floor');
  END IF;
  
  -- Crew cost
  SELECT config_value * p_crew_size * p_estimated_hours INTO v_crew FROM moving_price_config 
  WHERE config_type = 'helper_rate' AND config_key = 'per_hour';
  v_crew := COALESCE(v_crew, p_crew_size * p_estimated_hours * 150);
  
  v_total := v_base + v_distance + v_floor + v_items + v_crew;
  
  v_breakdown := jsonb_build_object(
    'base', v_base,
    'distance', v_distance,
    'floor', v_floor,
    'items', v_items,
    'crew', v_crew,
    'truck_type', p_truck_type,
    'distance_km', p_distance_km
  );
  
  RETURN QUERY SELECT v_base, v_distance, v_floor, v_items, v_crew, v_total, v_breakdown;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add inventory item
CREATE OR REPLACE FUNCTION add_moving_inventory(
  p_moving_id UUID,
  p_items JSONB
) RETURNS INTEGER AS $$
DECLARE
  v_item JSONB;
  v_count INTEGER := 0;
BEGIN
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO moving_inventory_items (
      moving_id, item_name, category, quantity,
      length_cm, width_cm, height_cm, weight_kg,
      requires_disassembly, is_fragile, special_instructions
    ) VALUES (
      p_moving_id,
      v_item->>'item_name',
      COALESCE(v_item->>'category', 'other'),
      COALESCE((v_item->>'quantity')::INTEGER, 1),
      (v_item->>'length_cm')::INTEGER,
      (v_item->>'width_cm')::INTEGER,
      (v_item->>'height_cm')::INTEGER,
      (v_item->>'weight_kg')::NUMERIC,
      COALESCE((v_item->>'requires_disassembly')::BOOLEAN, false),
      COALESCE((v_item->>'is_fragile')::BOOLEAN, false),
      v_item->>'special_instructions'
    );
    v_count := v_count + 1;
  END LOOP;
  
  -- Update moving request
  UPDATE moving_requests
  SET inventory_count = (SELECT COUNT(*) FROM moving_inventory_items WHERE moving_id = p_moving_id),
      total_weight_kg = (SELECT SUM(COALESCE(weight_kg, 0) * quantity) FROM moving_inventory_items WHERE moving_id = p_moving_id)
  WHERE id = p_moving_id;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE moving_inventory_items IS 'Items to be moved';
COMMENT ON TABLE moving_crew IS 'Moving crew members';
COMMENT ON TABLE moving_job_assignments IS 'Crew assignments to moving jobs';
COMMENT ON TABLE moving_price_config IS 'Moving service pricing configuration';
