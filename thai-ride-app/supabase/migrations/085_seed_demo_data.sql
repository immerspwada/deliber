-- Migration: 085_seed_demo_data.sql
-- Description: Seed demo data for development/testing (replaces mock data)
-- Created: 2025-12-19

-- ============================================================================
-- SEED DEMO USERS
-- ============================================================================

-- Insert demo customers
INSERT INTO users (
  id,
  email,
  first_name,
  last_name,
  phone_number,
  role,
  is_active,
  verification_status,
  verified_at,
  member_uid,
  created_at
) VALUES
  (gen_random_uuid(), 'somchai@demo.com', 'สมชาย', 'ใจดี', '0812345678', 'customer', true, 'verified', NOW(), 'TRD-DEMO0001', NOW() - INTERVAL '30 days'),
  (gen_random_uuid(), 'somying@demo.com', 'สมหญิง', 'รักดี', '0823456789', 'customer', true, 'verified', NOW(), 'TRD-DEMO0002', NOW() - INTERVAL '25 days'),
  (gen_random_uuid(), 'wichai@demo.com', 'วิชัย', 'มั่งมี', '0834567890', 'customer', true, 'verified', NOW(), 'TRD-DEMO0003', NOW() - INTERVAL '20 days'),
  (gen_random_uuid(), 'napa@demo.com', 'นภา', 'สวยงาม', '0845678901', 'customer', false, 'pending', NULL, 'TRD-DEMO0004', NOW() - INTERVAL '15 days'),
  (gen_random_uuid(), 'thana@demo.com', 'ธนา', 'รวยมาก', '0856789012', 'customer', true, 'verified', NOW(), 'TRD-DEMO0005', NOW() - INTERVAL '10 days')
ON CONFLICT (email) DO NOTHING;

-- ============================================================================
-- SEED DEMO PROVIDERS
-- ============================================================================

-- Insert demo providers (drivers, riders, etc.)
DO $$
DECLARE
  v_user_id_1 uuid;
  v_user_id_2 uuid;
  v_user_id_3 uuid;
  v_user_id_4 uuid;
  v_user_id_5 uuid;
BEGIN
  -- Create provider users
  INSERT INTO users (email, first_name, last_name, phone_number, role, is_active, verification_status, verified_at, member_uid, created_at)
  VALUES 
    ('driver1@demo.com', 'ประยุทธ์', 'ขับดี', '0867890123', 'provider', true, 'verified', NOW(), 'TRD-PROV0001', NOW() - INTERVAL '60 days'),
    ('driver2@demo.com', 'สมศักดิ์', 'เร็วมาก', '0878901234', 'provider', true, 'verified', NOW(), 'TRD-PROV0002', NOW() - INTERVAL '55 days'),
    ('rider1@demo.com', 'วีระ', 'ส่งไว', '0889012345', 'provider', true, 'verified', NOW(), 'TRD-PROV0003', NOW() - INTERVAL '50 days'),
    ('pending1@demo.com', 'อนุชา', 'ใหม่มาก', '0890123456', 'provider', false, 'pending', NULL, 'TRD-PROV0004', NOW() - INTERVAL '2 days'),
    ('rejected1@demo.com', 'สมบัติ', 'ไม่ผ่าน', '0891234567', 'provider', false, 'rejected', NULL, 'TRD-PROV0005', NOW() - INTERVAL '5 days')
  ON CONFLICT (email) DO NOTHING
  RETURNING id INTO v_user_id_1, v_user_id_2, v_user_id_3, v_user_id_4, v_user_id_5;

  -- Get user IDs if already exist
  IF v_user_id_1 IS NULL THEN
    SELECT id INTO v_user_id_1 FROM users WHERE email = 'driver1@demo.com';
    SELECT id INTO v_user_id_2 FROM users WHERE email = 'driver2@demo.com';
    SELECT id INTO v_user_id_3 FROM users WHERE email = 'rider1@demo.com';
    SELECT id INTO v_user_id_4 FROM users WHERE email = 'pending1@demo.com';
    SELECT id INTO v_user_id_5 FROM users WHERE email = 'rejected1@demo.com';
  END IF;

  -- Insert service providers
  INSERT INTO service_providers (
    user_id,
    provider_type,
    status,
    vehicle_type,
    vehicle_plate,
    vehicle_year,
    rating,
    total_trips,
    is_available,
    is_verified,
    allowed_services,
    created_at
  ) VALUES
    (v_user_id_1, 'driver', 'approved', 'Toyota Vios', 'กข 1234', 2020, 4.8, 234, true, true, ARRAY['ride'], NOW() - INTERVAL '60 days'),
    (v_user_id_2, 'multi', 'approved', 'Honda City', 'ขค 5678', 2021, 4.5, 156, true, true, ARRAY['ride', 'delivery'], NOW() - INTERVAL '55 days'),
    (v_user_id_3, 'rider', 'approved', 'Honda PCX', 'คง 9012', 2022, 4.9, 892, true, true, ARRAY['delivery', 'shopping'], NOW() - INTERVAL '50 days'),
    (v_user_id_4, 'pending', 'pending', 'Nissan Almera', 'งจ 3456', 2019, 0, 0, false, false, ARRAY[]::text[], NOW() - INTERVAL '2 days'),
    (v_user_id_5, 'rejected', 'rejected', 'Honda Wave', 'ซฌ 1357', 2018, 0, 0, false, false, ARRAY[]::text[], NOW() - INTERVAL '5 days')
  ON CONFLICT (user_id) DO NOTHING;
END $$;

-- ============================================================================
-- SEED DEMO PROMO CODES
-- ============================================================================

INSERT INTO promo_codes (
  code,
  description,
  discount_type,
  discount_value,
  max_discount,
  min_order_value,
  usage_limit,
  used_count,
  is_active,
  valid_from,
  valid_until,
  applicable_services,
  created_at
) VALUES
  ('FIRST50', 'ส่วนลดผู้ใช้ใหม่ 50 บาท', 'fixed', 50, NULL, 0, 1000, 234, true, NOW() - INTERVAL '30 days', NOW() + INTERVAL '180 days', ARRAY['ride', 'delivery', 'shopping'], NOW() - INTERVAL '30 days'),
  ('SAVE20', 'ลด 20 บาท ทุกเที่ยว', 'fixed', 20, NULL, 0, NULL, 567, true, NOW() - INTERVAL '60 days', NOW() + INTERVAL '90 days', ARRAY['ride'], NOW() - INTERVAL '60 days'),
  ('RIDE10', 'ลด 10% สูงสุด 100 บาท', 'percentage', 10, 100, 50, 500, 123, true, NOW() - INTERVAL '15 days', NOW() + INTERVAL '45 days', ARRAY['ride'], NOW() - INTERVAL '15 days'),
  ('WEEKEND', 'โปรวันหยุด ลด 15%', 'percentage', 15, 80, 100, 200, 89, false, NOW() - INTERVAL '90 days', NOW() - INTERVAL '30 days', ARRAY['ride', 'delivery'], NOW() - INTERVAL '90 days')
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- SEED DEMO NOTIFICATION TEMPLATES
-- ============================================================================

INSERT INTO notification_templates (
  name,
  type,
  title,
  message,
  action_url,
  is_active,
  usage_count,
  created_at
) VALUES
  ('โปรโมชั่นใหม่', 'promo', 'โปรโมชั่นพิเศษสำหรับ {{user_name}}!', 'รับส่วนลด {{discount}}% สำหรับการเดินทางครั้งต่อไป ใช้โค้ด {{promo_code}}', '/promotions', true, 45, NOW() - INTERVAL '30 days'),
  ('ยินดีต้อนรับ', 'system', 'ยินดีต้อนรับ {{user_name}} สู่ Thai Ride!', 'ขอบคุณที่เลือกใช้บริการ Thai Ride เริ่มต้นการเดินทางของคุณได้เลย', '/', true, 120, NOW() - INTERVAL '60 days'),
  ('เตือนให้คะแนน', 'rating', 'ให้คะแนนการเดินทางของคุณ', 'บอกเราว่าคุณพอใจกับการบริการหรือไม่ เพื่อช่วยให้เราพัฒนาต่อไป', '/history', true, 89, NOW() - INTERVAL '45 days')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- SEED DEMO LOYALTY TIERS
-- ============================================================================

INSERT INTO loyalty_tiers (
  name,
  name_th,
  min_points,
  benefits,
  icon,
  color,
  created_at
) VALUES
  ('Bronze', 'สมาชิกทองแดง', 0, '{"discount": 0, "priority_support": false}', '🥉', '#CD7F32', NOW()),
  ('Silver', 'สมาชิกเงิน', 1000, '{"discount": 5, "priority_support": false}', '🥈', '#C0C0C0', NOW()),
  ('Gold', 'สมาชิกทอง', 5000, '{"discount": 10, "priority_support": true}', '🥇', '#FFD700', NOW()),
  ('Platinum', 'สมาชิกแพลทินัม', 10000, '{"discount": 15, "priority_support": true, "free_cancellation": true}', '💎', '#E5E4E2', NOW())
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- SEED DEMO LOYALTY REWARDS
-- ============================================================================

INSERT INTO loyalty_rewards (
  name,
  name_th,
  description,
  points_required,
  reward_type,
  reward_value,
  stock_quantity,
  is_active,
  created_at
) VALUES
  ('ส่วนลด 50 บาท', 'ส่วนลด 50 บาท', 'รับส่วนลด 50 บาท สำหรับการเดินทางครั้งต่อไป', 500, 'discount', 50, 1000, true, NOW()),
  ('ส่วนลด 100 บาท', 'ส่วนลด 100 บาท', 'รับส่วนลด 100 บาท สำหรับการเดินทางครั้งต่อไป', 1000, 'discount', 100, 500, true, NOW()),
  ('เที่ยวฟรี', 'เที่ยวฟรี 1 เที่ยว', 'รับเที่ยวฟรี 1 เที่ยว มูลค่าสูงสุด 200 บาท', 2000, 'free_ride', 200, 100, true, NOW())
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- SEED DEMO CUSTOMER TAGS
-- ============================================================================

INSERT INTO customer_tags (
  name,
  name_th,
  color,
  bg_color,
  icon,
  is_system,
  created_at
) VALUES
  ('VIP', 'ลูกค้า VIP', '#FFD700', '#FFF9E6', '⭐', true, NOW()),
  ('High Value', 'มูลค่าสูง', '#00A86B', '#E8F5EF', '💰', true, NOW()),
  ('Frequent', 'ใช้บ่อย', '#4A90E2', '#E8F4FF', '🔄', true, NOW()),
  ('New', 'ลูกค้าใหม่', '#9B59B6', '#F4E8FF', '🆕', true, NOW()),
  ('Problem', 'มีปัญหา', '#E53935', '#FFE8E8', '⚠️', true, NOW())
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- SEED DEMO APP SETTINGS
-- ============================================================================

INSERT INTO app_settings (key, value, description, updated_at)
VALUES
  ('base_fare', '35', 'ค่าโดยสารขั้นต่ำ (บาท)', NOW()),
  ('per_km_rate', '8', 'ค่าโดยสารต่อกิโลเมตร (บาท)', NOW()),
  ('per_minute_rate', '2', 'ค่าโดยสารต่อนาที (บาท)', NOW()),
  ('booking_fee', '5', 'ค่าธรรมเนียมการจอง (บาท)', NOW()),
  ('cancellation_fee', '20', 'ค่าธรรมเนียมยกเลิก (บาท)', NOW()),
  ('surge_multiplier', '1.5', 'ตัวคูณราคาช่วงเร่งด่วน', NOW()),
  ('max_search_radius', '5000', 'รัศมีค้นหาคนขับสูงสุด (เมตร)', NOW()),
  ('provider_commission', '20', 'ค่าคอมมิชชั่นผู้ให้บริการ (%)', NOW())
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = EXCLUDED.updated_at;

-- ============================================================================
-- SEED DEMO SERVICE AREAS
-- ============================================================================

INSERT INTO service_areas (
  name,
  name_th,
  center_lat,
  center_lng,
  radius_km,
  is_active,
  surge_multiplier,
  created_at
) VALUES
  ('Bangkok Central', 'กรุงเทพกลาง', 13.7563, 100.5018, 10, true, 1.0, NOW()),
  ('Sukhumvit', 'สุขุมวิท', 13.7307, 100.5418, 5, true, 1.2, NOW()),
  ('Silom', 'สีลม', 13.7248, 100.5310, 3, true, 1.3, NOW()),
  ('Chatuchak', 'จตุจักร', 13.7997, 100.5504, 4, true, 1.0, NOW())
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- NOTES
-- ============================================================================

-- This migration creates demo/seed data for development and testing
-- All demo data uses @demo.com email addresses
-- Demo users have member_uid starting with TRD-DEMO or TRD-PROV
-- This data should be used instead of mock data in composables
