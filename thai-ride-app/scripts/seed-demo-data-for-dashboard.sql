-- =====================================================
-- SEED DEMO DATA FOR ADMIN DASHBOARD
-- Run this AFTER fix-admin-dashboard-v7.sql if data is empty
-- =====================================================

-- Check current data counts
SELECT 'Current data counts:' as info;
SELECT 'Users: ' || COUNT(*)::TEXT FROM users;
SELECT 'Providers: ' || COUNT(*)::TEXT FROM service_providers;
SELECT 'Rides: ' || COUNT(*)::TEXT FROM ride_requests;

-- =====================================================
-- STEP 1: Create demo users if none exist
-- =====================================================
DO $$
DECLARE
  v_user_count INT;
  v_user_id UUID;
  v_provider_id UUID;
BEGIN
  SELECT COUNT(*) INTO v_user_count FROM users;
  
  IF v_user_count = 0 THEN
    RAISE NOTICE 'No users found, creating demo users...';
    
    -- Create 5 demo customers
    FOR i IN 1..5 LOOP
      INSERT INTO users (id, email, first_name, last_name, phone_number, verification_status, created_at)
      VALUES (
        gen_random_uuid(),
        'customer' || i || '@demo.com',
        'Customer',
        'Demo ' || i,
        '08' || LPAD((1000000 + i)::TEXT, 8, '0'),
        'verified',
        NOW() - (i || ' days')::INTERVAL
      );
    END LOOP;
    
    RAISE NOTICE 'Created 5 demo customers';
  ELSE
    RAISE NOTICE 'Users already exist: %', v_user_count;
  END IF;
END $$;

-- =====================================================
-- STEP 2: Create demo providers if none exist
-- =====================================================
DO $$
DECLARE
  v_provider_count INT;
  v_user_id UUID;
  v_provider_types TEXT[] := ARRAY['driver', 'rider', 'shopper'];
BEGIN
  SELECT COUNT(*) INTO v_provider_count FROM service_providers;
  
  IF v_provider_count = 0 THEN
    RAISE NOTICE 'No providers found, creating demo providers...';
    
    -- Create 3 demo providers
    FOR i IN 1..3 LOOP
      -- First create a user for the provider
      INSERT INTO users (id, email, first_name, last_name, phone_number, verification_status, created_at)
      VALUES (
        gen_random_uuid(),
        'provider' || i || '@demo.com',
        'Provider',
        'Demo ' || i,
        '09' || LPAD((1000000 + i)::TEXT, 8, '0'),
        'verified',
        NOW() - (i || ' days')::INTERVAL
      )
      RETURNING id INTO v_user_id;
      
      -- Then create the provider record
      INSERT INTO service_providers (
        id, user_id, provider_type, status, is_available, is_online, 
        rating, total_rides, created_at
      )
      VALUES (
        gen_random_uuid(),
        v_user_id,
        v_provider_types[i],
        CASE WHEN i = 1 THEN 'pending' ELSE 'approved' END,
        i != 1, -- First one is pending, others are available
        i != 1,
        4.5 + (random() * 0.5),
        floor(random() * 100)::INT,
        NOW() - (i || ' days')::INTERVAL
      );
    END LOOP;
    
    RAISE NOTICE 'Created 3 demo providers';
  ELSE
    RAISE NOTICE 'Providers already exist: %', v_provider_count;
  END IF;
END $$;

-- =====================================================
-- STEP 3: Create demo ride requests if none exist
-- =====================================================
DO $$
DECLARE
  v_ride_count INT;
  v_user_id UUID;
  v_provider_id UUID;
  v_statuses TEXT[] := ARRAY['pending', 'matched', 'in_progress', 'completed', 'cancelled'];
BEGIN
  SELECT COUNT(*) INTO v_ride_count FROM ride_requests;
  
  IF v_ride_count = 0 THEN
    RAISE NOTICE 'No rides found, creating demo rides...';
    
    -- Get a user and provider
    SELECT id INTO v_user_id FROM users LIMIT 1;
    SELECT id INTO v_provider_id FROM service_providers WHERE status = 'approved' LIMIT 1;
    
    IF v_user_id IS NOT NULL THEN
      -- Create 10 demo rides
      FOR i IN 1..10 LOOP
        INSERT INTO ride_requests (
          id, user_id, provider_id, status, 
          pickup_address, destination_address,
          pickup_lat, pickup_lng, destination_lat, destination_lng,
          estimated_fare, final_fare,
          created_at
        )
        VALUES (
          gen_random_uuid(),
          v_user_id,
          CASE WHEN v_statuses[1 + (i % 5)] IN ('matched', 'in_progress', 'completed') THEN v_provider_id ELSE NULL END,
          v_statuses[1 + (i % 5)],
          'Pickup Location ' || i,
          'Destination ' || i,
          13.7563 + (random() * 0.1),
          100.5018 + (random() * 0.1),
          13.7563 + (random() * 0.1),
          100.5018 + (random() * 0.1),
          50 + (random() * 200),
          CASE WHEN v_statuses[1 + (i % 5)] = 'completed' THEN 50 + (random() * 200) ELSE NULL END,
          NOW() - ((i * 2) || ' hours')::INTERVAL
        );
      END LOOP;
      
      RAISE NOTICE 'Created 10 demo rides';
    ELSE
      RAISE NOTICE 'No users found to create rides';
    END IF;
  ELSE
    RAISE NOTICE 'Rides already exist: %', v_ride_count;
  END IF;
END $$;

-- =====================================================
-- STEP 4: Create demo delivery requests if none exist
-- =====================================================
DO $$
DECLARE
  v_delivery_count INT;
  v_user_id UUID;
BEGIN
  SELECT COUNT(*) INTO v_delivery_count FROM delivery_requests;
  
  IF v_delivery_count = 0 THEN
    RAISE NOTICE 'No deliveries found, creating demo deliveries...';
    
    SELECT id INTO v_user_id FROM users LIMIT 1;
    
    IF v_user_id IS NOT NULL THEN
      FOR i IN 1..5 LOOP
        INSERT INTO delivery_requests (
          id, user_id, status,
          pickup_address, destination_address,
          delivery_fee,
          created_at
        )
        VALUES (
          gen_random_uuid(),
          v_user_id,
          CASE WHEN i <= 2 THEN 'pending' WHEN i <= 4 THEN 'completed' ELSE 'cancelled' END,
          'Pickup ' || i,
          'Destination ' || i,
          30 + (random() * 50),
          NOW() - ((i * 3) || ' hours')::INTERVAL
        );
      END LOOP;
      
      RAISE NOTICE 'Created 5 demo deliveries';
    END IF;
  ELSE
    RAISE NOTICE 'Deliveries already exist: %', v_delivery_count;
  END IF;
END $$;

-- =====================================================
-- STEP 5: Create demo shopping requests if none exist
-- =====================================================
DO $$
DECLARE
  v_shopping_count INT;
  v_user_id UUID;
BEGIN
  SELECT COUNT(*) INTO v_shopping_count FROM shopping_requests;
  
  IF v_shopping_count = 0 THEN
    RAISE NOTICE 'No shopping found, creating demo shopping...';
    
    SELECT id INTO v_user_id FROM users LIMIT 1;
    
    IF v_user_id IS NOT NULL THEN
      FOR i IN 1..3 LOOP
        INSERT INTO shopping_requests (
          id, user_id, status,
          delivery_address,
          service_fee,
          created_at
        )
        VALUES (
          gen_random_uuid(),
          v_user_id,
          CASE WHEN i = 1 THEN 'pending' WHEN i = 2 THEN 'completed' ELSE 'cancelled' END,
          'Delivery Address ' || i,
          50 + (random() * 100),
          NOW() - ((i * 4) || ' hours')::INTERVAL
        );
      END LOOP;
      
      RAISE NOTICE 'Created 3 demo shopping requests';
    END IF;
  ELSE
    RAISE NOTICE 'Shopping already exist: %', v_shopping_count;
  END IF;
END $$;

-- =====================================================
-- FINAL: Verify data and test functions
-- =====================================================
SELECT 'Final data counts:' as info;
SELECT 'Users: ' || COUNT(*)::TEXT FROM users;
SELECT 'Providers: ' || COUNT(*)::TEXT FROM service_providers;
SELECT 'Rides: ' || COUNT(*)::TEXT FROM ride_requests;
SELECT 'Deliveries: ' || COUNT(*)::TEXT FROM delivery_requests;
SELECT 'Shopping: ' || COUNT(*)::TEXT FROM shopping_requests;

SELECT 'Testing dashboard stats:' as info;
SELECT get_admin_dashboard_stats() as dashboard_stats;

SELECT 'Demo data seeded successfully!' as result;
