-- =====================================================
-- SEED DEMO DATA FOR ADMIN DASHBOARD
-- =====================================================
-- Run this AFTER running ADMIN_DASHBOARD_FIX_FINAL.sql
-- This creates demo data if your database is empty
-- =====================================================

DO $$
DECLARE
  v_user_count INT;
  v_user_id UUID;
  v_provider_id UUID;
BEGIN
  SELECT COUNT(*) INTO v_user_count FROM users;
  
  IF v_user_count = 0 THEN
    RAISE NOTICE 'Creating demo data...';
    
    -- Create demo users
    FOR i IN 1..5 LOOP
      INSERT INTO users (id, email, first_name, last_name, phone_number, verification_status, created_at)
      VALUES (gen_random_uuid(), 'customer' || i || '@demo.com', 'Customer', 'Demo ' || i, 
        '08' || LPAD((1000000 + i)::TEXT, 8, '0'), 'verified', NOW() - (i || ' days')::INTERVAL);
    END LOOP;
    
    -- Get first user
    SELECT id INTO v_user_id FROM users LIMIT 1;
    
    -- Create demo provider
    IF v_user_id IS NOT NULL THEN
      INSERT INTO service_providers (id, user_id, provider_type, status, is_available, is_verified, created_at)
      VALUES (gen_random_uuid(), v_user_id, 'driver', 'approved', true, true, NOW())
      RETURNING id INTO v_provider_id;
    END IF;
    
    -- Create demo rides
    IF v_user_id IS NOT NULL THEN
      FOR i IN 1..10 LOOP
        INSERT INTO ride_requests (id, user_id, provider_id, status, pickup_address, destination_address,
          pickup_lat, pickup_lng, destination_lat, destination_lng, estimated_fare, final_fare, created_at)
        VALUES (gen_random_uuid(), v_user_id, 
          CASE WHEN i <= 3 THEN NULL ELSE v_provider_id END,
          CASE WHEN i <= 3 THEN 'pending' WHEN i <= 6 THEN 'completed' ELSE 'cancelled' END,
          'Pickup Location ' || i, 'Destination ' || i, 13.7563, 100.5018, 13.7663, 100.5118,
          50 + (random() * 200), 
          CASE WHEN i > 3 AND i <= 6 THEN 50 + (random() * 200) ELSE NULL END,
          NOW() - ((i * 2) || ' hours')::INTERVAL);
      END LOOP;
    END IF;
    
    RAISE NOTICE 'Demo data created successfully!';
  ELSE
    RAISE NOTICE 'Data already exists (% users found), skipping demo data creation', v_user_count;
  END IF;
END $$;

-- =====================================================
-- TEST: Verify data was created
-- =====================================================
SELECT '=== DATA VERIFICATION ===' as step;
SELECT 'Users: ' || COUNT(*)::TEXT as count FROM users;
SELECT 'Providers: ' || COUNT(*)::TEXT as count FROM service_providers;
SELECT 'Rides: ' || COUNT(*)::TEXT as count FROM ride_requests;

-- =====================================================
-- TEST: Run dashboard functions
-- =====================================================
SELECT '=== TESTING DASHBOARD FUNCTIONS ===' as step;
SELECT get_admin_dashboard_stats() as dashboard_stats;
SELECT get_realtime_order_stats() as realtime_stats;
SELECT get_live_provider_stats() as provider_stats;

SELECT '=== ALL DONE! Refresh your admin dashboard ===' as result;
