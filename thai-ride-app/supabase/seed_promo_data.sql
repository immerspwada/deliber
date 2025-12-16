-- Seed Data: Promo Codes with Categories
-- Run this in Supabase SQL Editor or via CLI: supabase db execute -f supabase/seed_promo_data.sql

-- First, add category column if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'promo_codes' AND column_name = 'category') THEN
    ALTER TABLE promo_codes ADD COLUMN category TEXT DEFAULT 'all';
  END IF;
END $$;

-- Clear existing promo codes for fresh data
DELETE FROM promo_codes;

-- Insert real promo codes with categories and usage tracking
INSERT INTO promo_codes (code, description, discount_type, discount_value, min_order_amount, max_discount, usage_limit, valid_from, valid_until, is_active, used_count, category) VALUES
-- Ride promos
('RIDE50', 'ส่วนลด ฿50 สำหรับเรียกรถครั้งแรก', 'fixed', 50, 100, NULL, 1000, NOW(), NOW() + INTERVAL '30 days', true, 45, 'ride'),
('RIDEWEEKEND', 'ลด 20% เรียกรถวันหยุด', 'percentage', 20, 80, 100, 500, NOW(), NOW() + INTERVAL '14 days', true, 123, 'ride'),
('NIGHTRIDE', 'ลด ฿30 เรียกรถกลางคืน 22:00-06:00', 'fixed', 30, 50, NULL, 300, NOW(), NOW() + INTERVAL '7 days', true, 67, 'ride'),
('AIRPORT100', 'ลด ฿100 เดินทางไป-กลับสนามบิน', 'fixed', 100, 300, NULL, 200, NOW(), NOW() + INTERVAL '60 days', true, 89, 'ride'),

-- Delivery promos (DELFREE almost sold out!)
('DELFREE', 'ส่งฟรี! ไม่มีขั้นต่ำ', 'fixed', 40, 0, NULL, 500, NOW(), NOW() + INTERVAL '3 days', true, 492, 'delivery'),
('DEL15', 'ลด 15% ค่าส่งของ', 'percentage', 15, 50, 80, 1000, NOW(), NOW() + INTERVAL '21 days', true, 156, 'delivery'),
('FASTDEL', 'ลด ฿25 ส่งด่วนภายใน 1 ชม.', 'fixed', 25, 100, NULL, 400, NOW(), NOW() + INTERVAL '14 days', true, 78, 'delivery'),

-- Shopping promos
('SHOP100', 'ลด ฿100 ซื้อของครบ ฿500', 'fixed', 100, 500, NULL, 300, NOW(), NOW() + INTERVAL '30 days', true, 45, 'shopping'),
('SHOPNEW', 'ลด 25% สำหรับผู้ใช้ใหม่', 'percentage', 25, 200, 150, 500, NOW(), NOW() + INTERVAL '45 days', true, 112, 'shopping'),
('GROCERY20', 'ลด 20% ซื้อของสด', 'percentage', 20, 150, 100, 600, NOW(), NOW() + INTERVAL '10 days', true, 89, 'shopping'),

-- All categories promos
('NEWYEAR2025', 'ฉลองปีใหม่ ลด ฿150', 'fixed', 150, 300, NULL, 2000, NOW(), NOW() + INTERVAL '45 days', true, 567, 'all'),
('THAIRIDE10', 'ลด 10% ทุกบริการ', 'percentage', 10, 50, 200, NULL, NOW(), NOW() + INTERVAL '90 days', true, 1234, 'all'),
('WELCOME', 'ยินดีต้อนรับ ลด ฿80', 'fixed', 80, 150, NULL, NULL, NOW(), NOW() + INTERVAL '365 days', true, 3456, 'all'),
('RAINY30', 'หน้าฝน ลด ฿30', 'fixed', 30, 80, NULL, 800, NOW(), NOW() + INTERVAL '2 days', true, 792, 'all'),

-- Expiring soon promos (almost sold out for urgency!)
('LASTCHANCE', 'โอกาสสุดท้าย! ลด 30%', 'percentage', 30, 100, 200, 100, NOW(), NOW() + INTERVAL '1 day', true, 92, 'all'),
('FLASH50', 'Flash Sale ลด ฿50', 'fixed', 50, 100, NULL, 50, NOW(), NOW() + INTERVAL '2 days', true, 47, 'ride');

-- Verify inserted data
SELECT code, description, discount_type, discount_value, category, valid_until::date as expires, is_active 
FROM promo_codes 
ORDER BY category, code;
