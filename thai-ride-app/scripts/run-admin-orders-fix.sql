-- =====================================================
-- ADMIN ORDERS FIX - Run this in Supabase SQL Editor
-- =====================================================
-- วิธีใช้:
-- 1. ไปที่ Supabase Dashboard > SQL Editor
-- 2. Copy ทั้งหมดนี้ไป paste
-- 3. กด Run
-- =====================================================

-- =====================================================
-- PART 1: Grant anon access to admin RPC functions
-- =====================================================

-- Check if functions exist first, then grant
DO $$
BEGIN
  -- Grant to anon role
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_all_orders_for_admin') THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION get_all_orders_for_admin TO anon';
    RAISE NOTICE '✓ Granted get_all_orders_for_admin to anon';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'count_all_orders_for_admin') THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION count_all_orders_for_admin TO anon';
    RAISE NOTICE '✓ Granted count_all_orders_for_admin to anon';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_admin_dashboard_stats') THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION get_admin_dashboard_stats TO anon';
    RAISE NOTICE '✓ Granted get_admin_dashboard_stats to anon';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_all_users_for_admin') THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION get_all_users_for_admin TO anon';
    RAISE NOTICE '✓ Granted get_all_users_for_admin to anon';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_all_providers_for_admin') THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION get_all_providers_for_admin TO anon';
    RAISE NOTICE '✓ Granted get_all_providers_for_admin to anon';
  END IF;
END $$;

-- =====================================================
-- PART 2: Add public read policies for order tables
-- =====================================================

-- ride_requests
DROP POLICY IF EXISTS "public_read_ride_requests" ON ride_requests;
CREATE POLICY "public_read_ride_requests" ON ride_requests FOR SELECT USING (true);

-- delivery_requests
DROP POLICY IF EXISTS "public_read_delivery_requests" ON delivery_requests;
CREATE POLICY "public_read_delivery_requests" ON delivery_requests FOR SELECT USING (true);

-- shopping_requests
DROP POLICY IF EXISTS "public_read_shopping_requests" ON shopping_requests;
CREATE POLICY "public_read_shopping_requests" ON shopping_requests FOR SELECT USING (true);

-- queue_bookings (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'queue_bookings') THEN
    EXECUTE 'DROP POLICY IF EXISTS "public_read_queue_bookings" ON queue_bookings';
    EXECUTE 'CREATE POLICY "public_read_queue_bookings" ON queue_bookings FOR SELECT USING (true)';
    RAISE NOTICE '✓ Created policy for queue_bookings';
  END IF;
END $$;

-- moving_requests (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'moving_requests') THEN
    EXECUTE 'DROP POLICY IF EXISTS "public_read_moving_requests" ON moving_requests';
    EXECUTE 'CREATE POLICY "public_read_moving_requests" ON moving_requests FOR SELECT USING (true)';
    RAISE NOTICE '✓ Created policy for moving_requests';
  END IF;
END $$;

-- laundry_requests (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'laundry_requests') THEN
    EXECUTE 'DROP POLICY IF EXISTS "public_read_laundry_requests" ON laundry_requests';
    EXECUTE 'CREATE POLICY "public_read_laundry_requests" ON laundry_requests FOR SELECT USING (true)';
    RAISE NOTICE '✓ Created policy for laundry_requests';
  END IF;
END $$;

-- users (needed for joins)
DROP POLICY IF EXISTS "public_read_users" ON users;
CREATE POLICY "public_read_users" ON users FOR SELECT USING (true);

-- service_providers
DROP POLICY IF EXISTS "public_read_service_providers" ON service_providers;
CREATE POLICY "public_read_service_providers" ON service_providers FOR SELECT USING (true);

-- =====================================================
-- PART 3: Create demo data for testing
-- =====================================================

DO $$
DECLARE
  v_customer_id uuid;
  v_provider_id uuid;
  v_provider_user_id uuid;
BEGIN
  -- Get or create demo customer
  SELECT id INTO v_customer_id FROM users WHERE email = 'somchai@demo.com' LIMIT 1;
  
  IF v_customer_id IS NULL THEN
    INSERT INTO users (id, email, first_name, last_name, phone_number, role, is_active, verification_status, member_uid, created_at)
    VALUES (gen_random_uuid(), 'somchai@demo.com', 'สมชาย', 'ใจดี', '0812345678', 'customer', true, 'verified', 'TRD-DEMO0001', NOW())
    RETURNING id INTO v_customer_id;
    RAISE NOTICE '✓ Created demo customer: %', v_customer_id;
  ELSE
    RAISE NOTICE '✓ Found existing demo customer: %', v_customer_id;
  END IF;

  -- Get or create demo provider
  SELECT sp.id, sp.user_id INTO v_provider_id, v_provider_user_id 
  FROM service_providers sp 
  JOIN users u ON sp.user_id = u.id 
  WHERE u.email = 'driver1@demo.com' 
  LIMIT 1;

  IF v_provider_id IS NULL THEN
    INSERT INTO users (id, email, first_name, last_name, phone_number, role, is_active, verification_status, member_uid, created_at)
    VALUES (gen_random_uuid(), 'driver1@demo.com', 'ประยุทธ์', 'ขับดี', '0867890123', 'provider', true, 'verified', 'TRD-PROV0001', NOW())
    RETURNING id INTO v_provider_user_id;
    
    INSERT INTO service_providers (user_id, provider_type, status, vehicle_type, vehicle_plate, rating, is_available, is_verified, allowed_services, created_at)
    VALUES (v_provider_user_id, 'driver', 'approved', 'Toyota Vios', 'กข 1234', 4.8, true, true, ARRAY['ride'], NOW())
    RETURNING id INTO v_provider_id;
    RAISE NOTICE '✓ Created demo provider: %', v_provider_id;
  ELSE
    RAISE NOTICE '✓ Found existing demo provider: %', v_provider_id;
  END IF;

  -- Insert demo ride requests
  INSERT INTO ride_requests (
    id, user_id, provider_id, tracking_id, status,
    pickup_lat, pickup_lng, pickup_address,
    destination_lat, destination_lng, destination_address,
    estimated_fare, final_fare, payment_method,
    created_at, updated_at
  ) VALUES
    (gen_random_uuid(), v_customer_id, NULL, 'RID-' || to_char(NOW(), 'YYYYMMDD') || '-000001', 'pending',
     13.7563, 100.5018, 'สยามพารากอน กรุงเทพฯ',
     13.7307, 100.5418, 'เอ็มควอเทียร์ สุขุมวิท',
     85, NULL, 'cash', NOW() - INTERVAL '10 minutes', NOW() - INTERVAL '10 minutes'),
    
    (gen_random_uuid(), v_customer_id, v_provider_id, 'RID-' || to_char(NOW(), 'YYYYMMDD') || '-000002', 'matched',
     13.7248, 100.5310, 'สีลม กรุงเทพฯ',
     13.7997, 100.5504, 'จตุจักร กรุงเทพฯ',
     120, NULL, 'wallet', NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '25 minutes'),
    
    (gen_random_uuid(), v_customer_id, v_provider_id, 'RID-' || to_char(NOW(), 'YYYYMMDD') || '-000003', 'in_progress',
     13.7563, 100.5018, 'เซ็นทรัลเวิลด์ กรุงเทพฯ',
     13.7400, 100.5600, 'ทองหล่อ กรุงเทพฯ',
     95, NULL, 'cash', NOW() - INTERVAL '1 hour', NOW() - INTERVAL '45 minutes'),
    
    (gen_random_uuid(), v_customer_id, v_provider_id, 'RID-' || to_char(NOW(), 'YYYYMMDD') || '-000004', 'completed',
     13.7307, 100.5418, 'อโศก กรุงเทพฯ',
     13.7563, 100.5018, 'สยาม กรุงเทพฯ',
     75, 78, 'cash', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour 30 minutes'),
    
    (gen_random_uuid(), v_customer_id, NULL, 'RID-' || to_char(NOW(), 'YYYYMMDD') || '-000005', 'cancelled',
     13.7997, 100.5504, 'จตุจักร กรุงเทพฯ',
     13.7248, 100.5310, 'สีลม กรุงเทพฯ',
     150, NULL, 'wallet', NOW() - INTERVAL '3 hours', NOW() - INTERVAL '2 hours 50 minutes')
  ON CONFLICT DO NOTHING;

  RAISE NOTICE '✓ Demo ride requests created';

  -- Insert demo delivery requests
  INSERT INTO delivery_requests (
    id, user_id, provider_id, tracking_id, status,
    sender_name, sender_phone, sender_address,
    recipient_name, recipient_phone, recipient_address,
    package_description, estimated_fee, payment_method,
    created_at, updated_at
  ) VALUES
    (gen_random_uuid(), v_customer_id, NULL, 'DEL-' || to_char(NOW(), 'YYYYMMDD') || '-000001', 'pending',
     'สมชาย ใจดี', '0812345678', 'สยามพารากอน กรุงเทพฯ',
     'สมหญิง รักดี', '0823456789', 'เอ็มควอเทียร์ สุขุมวิท',
     'เอกสารสำคัญ', 50, 'cash', NOW() - INTERVAL '15 minutes', NOW() - INTERVAL '15 minutes'),
    
    (gen_random_uuid(), v_customer_id, v_provider_id, 'DEL-' || to_char(NOW(), 'YYYYMMDD') || '-000002', 'in_transit',
     'สมชาย ใจดี', '0812345678', 'สีลม กรุงเทพฯ',
     'วิชัย มั่งมี', '0834567890', 'จตุจักร กรุงเทพฯ',
     'พัสดุขนาดเล็ก', 65, 'wallet', NOW() - INTERVAL '45 minutes', NOW() - INTERVAL '30 minutes'),
    
    (gen_random_uuid(), v_customer_id, v_provider_id, 'DEL-' || to_char(NOW(), 'YYYYMMDD') || '-000003', 'delivered',
     'สมชาย ใจดี', '0812345678', 'เซ็นทรัลเวิลด์ กรุงเทพฯ',
     'นภา สวยงาม', '0845678901', 'ทองหล่อ กรุงเทพฯ',
     'อาหาร', 45, 'cash', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour')
  ON CONFLICT DO NOTHING;

  RAISE NOTICE '✓ Demo delivery requests created';

  -- Insert demo shopping requests
  INSERT INTO shopping_requests (
    id, user_id, provider_id, tracking_id, status,
    store_name, store_address, delivery_address,
    items, estimated_total, service_fee, payment_method,
    created_at, updated_at
  ) VALUES
    (gen_random_uuid(), v_customer_id, NULL, 'SHP-' || to_char(NOW(), 'YYYYMMDD') || '-000001', 'pending',
     'Big C', 'บิ๊กซี สุขุมวิท', 'คอนโด ABC สุขุมวิท 21',
     '[{"name": "นม", "quantity": 2}, {"name": "ขนมปัง", "quantity": 1}]'::jsonb, 150, 30, 'cash',
     NOW() - INTERVAL '20 minutes', NOW() - INTERVAL '20 minutes'),
    
    (gen_random_uuid(), v_customer_id, v_provider_id, 'SHP-' || to_char(NOW(), 'YYYYMMDD') || '-000002', 'shopping',
     'Tops', 'ท็อปส์ เซ็นทรัลเวิลด์', 'คอนโด XYZ ราชดำริ',
     '[{"name": "ผัก", "quantity": 3}, {"name": "เนื้อหมู", "quantity": 1}]'::jsonb, 350, 50, 'wallet',
     NOW() - INTERVAL '1 hour', NOW() - INTERVAL '40 minutes'),
    
    (gen_random_uuid(), v_customer_id, v_provider_id, 'SHP-' || to_char(NOW(), 'YYYYMMDD') || '-000003', 'completed',
     'Lotus', 'โลตัส พระราม 4', 'บ้าน 123 ซอยสุขุมวิท 55',
     '[{"name": "น้ำดื่ม", "quantity": 6}, {"name": "ขนม", "quantity": 4}]'::jsonb, 280, 40, 'cash',
     NOW() - INTERVAL '3 hours', NOW() - INTERVAL '2 hours')
  ON CONFLICT DO NOTHING;

  RAISE NOTICE '✓ Demo shopping requests created';
END $$;

-- =====================================================
-- PART 4: Verify results
-- =====================================================

DO $$
DECLARE
  ride_count INT;
  delivery_count INT;
  shopping_count INT;
  user_count INT;
  provider_count INT;
BEGIN
  SELECT COUNT(*) INTO ride_count FROM ride_requests;
  SELECT COUNT(*) INTO delivery_count FROM delivery_requests;
  SELECT COUNT(*) INTO shopping_count FROM shopping_requests;
  SELECT COUNT(*) INTO user_count FROM users;
  SELECT COUNT(*) INTO provider_count FROM service_providers;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ ADMIN ORDERS FIX COMPLETED!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Database counts:';
  RAISE NOTICE '  - Users: %', user_count;
  RAISE NOTICE '  - Providers: %', provider_count;
  RAISE NOTICE '  - Rides: %', ride_count;
  RAISE NOTICE '  - Deliveries: %', delivery_count;
  RAISE NOTICE '  - Shopping: %', shopping_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Go to http://localhost:5173/admin/login';
  RAISE NOTICE '2. Login with admin@demo.com / admin1234';
  RAISE NOTICE '3. Navigate to /admin/orders';
  RAISE NOTICE '4. You should see the demo orders!';
  RAISE NOTICE '========================================';
END $$;
