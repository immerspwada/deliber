-- Migration: 083_add_rider_provider_type.sql
-- Feature: F14 - Provider Registration
-- Description: เพิ่ม 'rider' และ provider types อื่นๆ เข้าไปใน constraint
-- เพื่อรองรับการสมัครไรเดอร์ (ส่งอาหาร/พัสดุ)

-- ลบ constraint เดิม
ALTER TABLE service_providers 
DROP CONSTRAINT IF EXISTS service_providers_provider_type_check;

-- สร้าง constraint ใหม่ที่รองรับทุก provider types
ALTER TABLE service_providers 
ADD CONSTRAINT service_providers_provider_type_check 
CHECK (provider_type IN ('driver', 'delivery', 'shopper', 'rider', 'mover', 'laundry', 'both'));

-- Comment อธิบาย provider types
COMMENT ON COLUMN service_providers.provider_type IS 
'ประเภทผู้ให้บริการ:
- driver: คนขับรถรับส่งผู้โดยสาร
- rider: ไรเดอร์ส่งอาหาร/พัสดุ (มอเตอร์ไซค์)
- delivery: ผู้ให้บริการส่งของ (legacy)
- shopper: ผู้ให้บริการซื้อของ
- mover: ผู้ให้บริการขนย้าย
- laundry: ผู้ให้บริการซักรีด
- both: ทำได้ทั้งขับรถและส่งของ';
