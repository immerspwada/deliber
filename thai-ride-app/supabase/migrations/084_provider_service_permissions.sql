-- Migration: 084_provider_service_permissions.sql
-- Feature: F14 - Provider Service Permissions
-- Description: ระบบจัดการสิทธิ์การเห็นงานของ Provider โดย Admin

-- เพิ่ม columns สำหรับ service permissions ใน service_providers
ALTER TABLE service_providers 
ADD COLUMN IF NOT EXISTS allowed_services JSONB DEFAULT '[]'::jsonb;

-- allowed_services จะเก็บ array ของ service types ที่ provider เห็นได้
-- เช่น: ["ride", "delivery", "shopping", "queue", "moving", "laundry"]

-- อัพเดท constraint ให้รองรับ 'pending' และ 'multi'
ALTER TABLE service_providers 
DROP CONSTRAINT IF EXISTS service_providers_provider_type_check;

ALTER TABLE service_providers 
ADD CONSTRAINT service_providers_provider_type_check 
CHECK (provider_type IN ('driver', 'delivery', 'shopper', 'rider', 'mover', 'laundry', 'both', 'pending', 'multi'));

-- สร้างตารางสำหรับ service types reference
CREATE TABLE IF NOT EXISTS service_types (
  id VARCHAR(20) PRIMARY KEY,
  name_th VARCHAR(100) NOT NULL,
  name_en VARCHAR(100) NOT NULL,
  icon VARCHAR(50),
  description_th TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default service types
INSERT INTO service_types (id, name_th, name_en, icon, sort_order) VALUES
  ('ride', 'รับส่งผู้โดยสาร', 'Ride', 'car', 1),
  ('delivery', 'ส่งพัสดุ/อาหาร', 'Delivery', 'package', 2),
  ('shopping', 'ซื้อของ', 'Shopping', 'shopping-bag', 3),
  ('queue', 'จองคิว', 'Queue Booking', 'clock', 4),
  ('moving', 'ขนย้าย', 'Moving', 'truck', 5),
  ('laundry', 'ซักรีด', 'Laundry', 'shirt', 6)
ON CONFLICT (id) DO NOTHING;

-- Function: Admin เปิด/ปิด service สำหรับ provider
CREATE OR REPLACE FUNCTION update_provider_services(
  p_provider_id UUID,
  p_services TEXT[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  UPDATE service_providers
  SET 
    allowed_services = to_jsonb(p_services),
    updated_at = NOW()
  WHERE id = p_provider_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Provider not found');
  END IF;
  
  -- อัพเดท provider_type ตาม services ที่เปิด
  UPDATE service_providers
  SET provider_type = CASE
    WHEN array_length(p_services, 1) IS NULL OR array_length(p_services, 1) = 0 THEN 'pending'
    WHEN array_length(p_services, 1) = 1 THEN 
      CASE p_services[1]
        WHEN 'ride' THEN 'driver'
        WHEN 'delivery' THEN 'rider'
        WHEN 'shopping' THEN 'shopper'
        WHEN 'moving' THEN 'mover'
        WHEN 'laundry' THEN 'laundry'
        ELSE 'multi'
      END
    ELSE 'multi'
  END
  WHERE id = p_provider_id;
  
  SELECT jsonb_build_object(
    'success', true,
    'provider_id', p_provider_id,
    'allowed_services', allowed_services,
    'provider_type', provider_type
  ) INTO v_result
  FROM service_providers
  WHERE id = p_provider_id;
  
  RETURN v_result;
END;
$$;

-- Function: ดึงงานที่ provider มีสิทธิ์เห็น
CREATE OR REPLACE FUNCTION get_provider_allowed_services(p_provider_id UUID)
RETURNS TEXT[]
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_services TEXT[];
BEGIN
  SELECT ARRAY(SELECT jsonb_array_elements_text(COALESCE(allowed_services, '[]'::jsonb)))
  INTO v_services
  FROM service_providers
  WHERE id = p_provider_id;
  
  RETURN COALESCE(v_services, ARRAY[]::TEXT[]);
END;
$$;

-- Comment
COMMENT ON COLUMN service_providers.allowed_services IS 
'Array ของ service types ที่ provider มีสิทธิ์เห็นและรับงาน เช่น ["ride", "delivery"]
Admin เป็นคนกำหนดว่า provider แต่ละคนเห็นงานอะไรได้บ้าง';
