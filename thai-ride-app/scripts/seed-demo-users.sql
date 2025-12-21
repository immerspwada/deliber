-- ============================================================================
-- SEED DEMO USERS FOR CROSS-ROLE INTEGRATION
-- ============================================================================
-- Run this script in Supabase SQL Editor to enable demo mode testing
-- This creates demo users that match the frontend demo accounts
-- ============================================================================

-- 1. Customer Demo User
INSERT INTO users (id, email, name, first_name, last_name, phone, phone_number, role, is_active, member_uid, created_at, updated_at)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  'customer@demo.com',
  'Customer Demo',
  'Customer',
  'Demo',
  '0812345678',
  '0812345678',
  'customer',
  true,
  'TRD-DEMO0001',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  updated_at = NOW();

-- 2. Admin Demo User
INSERT INTO users (id, email, name, first_name, last_name, phone, phone_number, role, is_active, member_uid, created_at, updated_at)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'admin@demo.com',
  'Admin Demo',
  'Admin',
  'Demo',
  '0800000000',
  '0800000000',
  'admin',
  true,
  'TRD-ADMIN001',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  role = 'admin',
  updated_at = NOW();

-- 3. Driver Demo User
INSERT INTO users (id, email, name, first_name, last_name, phone, phone_number, role, is_active, member_uid, created_at, updated_at)
VALUES (
  'd1111111-1111-1111-1111-111111111111',
  'driver1@demo.com',
  'สมชาย ใจดี',
  'สมชาย',
  'ใจดี',
  '0898765432',
  '0898765432',
  'driver',
  true,
  'TRD-DRV00001',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  updated_at = NOW();

-- 4. Rider Demo User
INSERT INTO users (id, email, name, first_name, last_name, phone, phone_number, role, is_active, member_uid, created_at, updated_at)
VALUES (
  '44444444-4444-4444-4444-444444444444',
  'rider@demo.com',
  'Rider User',
  'Rider',
  'User',
  '0876543210',
  '0876543210',
  'rider',
  true,
  'TRD-RDR00001',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  updated_at = NOW();

-- 5. Driver Provider
INSERT INTO service_providers (
  id, user_id, provider_uid, provider_type, status, is_verified, is_available,
  vehicle_type, vehicle_plate, vehicle_color, rating, total_rides, total_trips,
  current_lat, current_lng, created_at, updated_at
)
VALUES (
  'p1111111-1111-1111-1111-111111111111',
  'd1111111-1111-1111-1111-111111111111',
  'PRV-DRV00001',
  'driver',
  'approved',
  true,
  true,
  'รถยนต์',
  'กข 1234',
  'สีดำ',
  4.8,
  150,
  150,
  6.0296,
  101.9653,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  status = 'approved',
  is_verified = true,
  is_available = true,
  updated_at = NOW();

-- 6. Rider Provider
INSERT INTO service_providers (
  id, user_id, provider_uid, provider_type, status, is_verified, is_available,
  vehicle_type, vehicle_plate, vehicle_color, rating, total_rides, total_trips,
  current_lat, current_lng, created_at, updated_at
)
VALUES (
  'p4444444-4444-4444-4444-444444444444',
  '44444444-4444-4444-4444-444444444444',
  'PRV-RDR00001',
  'rider',
  'approved',
  true,
  true,
  'มอเตอร์ไซค์',
  'ขข 5678',
  'สีแดง',
  4.9,
  200,
  200,
  6.0300,
  101.9660,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  status = 'approved',
  is_verified = true,
  is_available = true,
  updated_at = NOW();

-- 7. Customer Wallet
INSERT INTO user_wallets (user_id, balance, created_at, updated_at)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  1000.00,
  NOW(),
  NOW()
)
ON CONFLICT (user_id) DO UPDATE SET
  balance = 1000.00,
  updated_at = NOW();

-- 8. Verify
SELECT 'Demo Users Created:' as status;
SELECT id, email, name, role, member_uid FROM users 
WHERE id IN (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'd1111111-1111-1111-1111-111111111111',
  '44444444-4444-4444-4444-444444444444'
);

SELECT 'Demo Providers Created:' as status;
SELECT id, user_id, provider_uid, provider_type, status, is_available FROM service_providers
WHERE id IN (
  'p1111111-1111-1111-1111-111111111111',
  'p4444444-4444-4444-4444-444444444444'
);
