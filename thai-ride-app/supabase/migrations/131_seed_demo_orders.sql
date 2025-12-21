-- Migration: 131_seed_demo_orders.sql
-- Description: Seed demo orders for admin dashboard testing
-- Created: 2025-12-21

-- ============================================================================
-- SEED DEMO RIDE REQUESTS
-- ============================================================================

DO $$
DECLARE
  v_customer_id uuid;
  v_provider_id uuid;
  v_provider_user_id uuid;
BEGIN
  -- Get a demo customer
  SELECT id INTO v_customer_id FROM users WHERE email = 'somchai@demo.com' LIMIT 1;
  
  -- Get a demo provider
  SELECT sp.id, sp.user_id INTO v_provider_id, v_provider_user_id 
  FROM service_providers sp 
  JOIN users u ON sp.user_id = u.id 
  WHERE u.email = 'driver1@demo.com' 
  LIMIT 1;

  -- If no demo users exist, create them
  IF v_customer_id IS NULL THEN
    INSERT INTO users (id, email, first_name, last_name, phone_number, role, is_active, verification_status, member_uid, created_at)
    VALUES (gen_random_uuid(), 'somchai@demo.com', 'สมชาย', 'ใจดี', '0812345678', 'customer', true, 'verified', 'TRD-DEMO0001', NOW())
    RETURNING id INTO v_customer_id;
  END IF;

  IF v_provider_id IS NULL THEN
    INSERT INTO users (id, email, first_name, last_name, phone_number, role, is_active, verification_status, member_uid, created_at)
    VALUES (gen_random_uuid(), 'driver1@demo.com', 'ประยุทธ์', 'ขับดี', '0867890123', 'provider', true, 'verified', 'TRD-PROV0001', NOW())
    RETURNING id INTO v_provider_user_id;
    
    INSERT INTO service_providers (user_id, provider_type, status, vehicle_type, vehicle_plate, rating, is_available, is_verified, allowed_services, created_at)
    VALUES (v_provider_user_id, 'driver', 'approved', 'Toyota Vios', 'กข 1234', 4.8, true, true, ARRAY['ride'], NOW())
    RETURNING id INTO v_provider_id;
  END IF;

  -- Insert demo ride requests
  INSERT INTO ride_requests (
    id, user_id, provider_id, tracking_id, status,
    pickup_lat, pickup_lng, pickup_address,
    destination_lat, destination_lng, destination_address,
    estimated_fare, final_fare, payment_method,
    created_at, updated_at
  ) VALUES
    -- Pending ride
    (gen_random_uuid(), v_customer_id, NULL, 'RID-20251221-000001', 'pending',
     13.7563, 100.5018, 'สยามพารากอน กรุงเทพฯ',
     13.7307, 100.5418, 'เอ็มควอเทียร์ สุขุมวิท',
     85, NULL, 'cash',
     NOW() - INTERVAL '10 minutes', NOW() - INTERVAL '10 minutes'),
    
    -- Matched ride
    (gen_random_uuid(), v_customer_id, v_provider_id, 'RID-20251221-000002', 'matched',
     13.7248, 100.5310, 'สีลม กรุงเทพฯ',
     13.7997, 100.5504, 'จตุจักร กรุงเทพฯ',
     120, NULL, 'wallet',
     NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '25 minutes'),
    
    -- In progress ride
    (gen_random_uuid(), v_customer_id, v_provider_id, 'RID-20251221-000003', 'in_progress',
     13.7563, 100.5018, 'เซ็นทรัลเวิลด์ กรุงเทพฯ',
     13.7400, 100.5600, 'ทองหล่อ กรุงเทพฯ',
     95, NULL, 'cash',
     NOW() - INTERVAL '1 hour', NOW() - INTERVAL '45 minutes'),
    
    -- Completed ride
    (gen_random_uuid(), v_customer_id, v_provider_id, 'RID-20251221-000004', 'completed',
     13.7307, 100.5418, 'อโศก กรุงเทพฯ',
     13.7563, 100.5018, 'สยาม กรุงเทพฯ',
     75, 78, 'cash',
     NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour 30 minutes'),
    
    -- Cancelled ride
    (gen_random_uuid(), v_customer_id, NULL, 'RID-20251221-000005', 'cancelled',
     13.7997, 100.5504, 'จตุจักร กรุงเทพฯ',
     13.7248, 100.5310, 'สีลม กรุงเทพฯ',
     150, NULL, 'wallet',
     NOW() - INTERVAL '3 hours', NOW() - INTERVAL '2 hours 50 minutes')
  ON CONFLICT DO NOTHING;

  -- Insert demo delivery requests
  INSERT INTO delivery_requests (
    id, user_id, provider_id, tracking_id, status,
    sender_name, sender_phone, sender_address,
    recipient_name, recipient_phone, recipient_address,
    package_description, estimated_fee, payment_method,
    created_at, updated_at
  ) VALUES
    -- Pending delivery
    (gen_random_uuid(), v_customer_id, NULL, 'DEL-20251221-000001', 'pending',
     'สมชาย ใจดี', '0812345678', 'สยามพารากอน กรุงเทพฯ',
     'สมหญิง รักดี', '0823456789', 'เอ็มควอเทียร์ สุขุมวิท',
     'เอกสารสำคัญ', 50, 'cash',
     NOW() - INTERVAL '15 minutes', NOW() - INTERVAL '15 minutes'),
    
    -- In transit delivery
    (gen_random_uuid(), v_customer_id, v_provider_id, 'DEL-20251221-000002', 'in_transit',
     'สมชาย ใจดี', '0812345678', 'สีลม กรุงเทพฯ',
     'วิชัย มั่งมี', '0834567890', 'จตุจักร กรุงเทพฯ',
     'พัสดุขนาดเล็ก', 65, 'wallet',
     NOW() - INTERVAL '45 minutes', NOW() - INTERVAL '30 minutes'),
    
    -- Delivered
    (gen_random_uuid(), v_customer_id, v_provider_id, 'DEL-20251221-000003', 'delivered',
     'สมชาย ใจดี', '0812345678', 'เซ็นทรัลเวิลด์ กรุงเทพฯ',
     'นภา สวยงาม', '0845678901', 'ทองหล่อ กรุงเทพฯ',
     'อาหาร', 45, 'cash',
     NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour')
  ON CONFLICT DO NOTHING;

  -- Insert demo shopping requests
  INSERT INTO shopping_requests (
    id, user_id, provider_id, tracking_id, status,
    store_name, store_address, delivery_address,
    items, estimated_total, service_fee, payment_method,
    created_at, updated_at
  ) VALUES
    -- Pending shopping
    (gen_random_uuid(), v_customer_id, NULL, 'SHP-20251221-000001', 'pending',
     'Big C', 'บิ๊กซี สุขุมวิท', 'คอนโด ABC สุขุมวิท 21',
     '[{"name": "นม", "quantity": 2}, {"name": "ขนมปัง", "quantity": 1}]'::jsonb, 150, 30, 'cash',
     NOW() - INTERVAL '20 minutes', NOW() - INTERVAL '20 minutes'),
    
    -- Shopping in progress
    (gen_random_uuid(), v_customer_id, v_provider_id, 'SHP-20251221-000002', 'shopping',
     'Tops', 'ท็อปส์ เซ็นทรัลเวิลด์', 'คอนโด XYZ ราชดำริ',
     '[{"name": "ผัก", "quantity": 3}, {"name": "เนื้อหมู", "quantity": 1}]'::jsonb, 350, 50, 'wallet',
     NOW() - INTERVAL '1 hour', NOW() - INTERVAL '40 minutes'),
    
    -- Completed shopping
    (gen_random_uuid(), v_customer_id, v_provider_id, 'SHP-20251221-000003', 'completed',
     'Lotus', 'โลตัส พระราม 4', 'บ้าน 123 ซอยสุขุมวิท 55',
     '[{"name": "น้ำดื่ม", "quantity": 6}, {"name": "ขนม", "quantity": 4}]'::jsonb, 280, 40, 'cash',
     NOW() - INTERVAL '3 hours', NOW() - INTERVAL '2 hours')
  ON CONFLICT DO NOTHING;

  RAISE NOTICE '✓ Demo orders created successfully';
  RAISE NOTICE '  - Customer ID: %', v_customer_id;
  RAISE NOTICE '  - Provider ID: %', v_provider_id;
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  ride_count INT;
  delivery_count INT;
  shopping_count INT;
BEGIN
  SELECT COUNT(*) INTO ride_count FROM ride_requests;
  SELECT COUNT(*) INTO delivery_count FROM delivery_requests;
  SELECT COUNT(*) INTO shopping_count FROM shopping_requests;
  
  RAISE NOTICE '✓ Order counts:';
  RAISE NOTICE '  - Rides: %', ride_count;
  RAISE NOTICE '  - Deliveries: %', delivery_count;
  RAISE NOTICE '  - Shopping: %', shopping_count;
END $$;
