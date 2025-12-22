-- Run Admin Service Views Fix
-- Run this in Supabase SQL Editor

-- Test each function after running migration 161

-- Test Deliveries
SELECT * FROM get_all_deliveries_for_admin(NULL, 5, 0);

-- Test Shopping  
SELECT * FROM get_all_shopping_for_admin(NULL, 5, 0);

-- Test Queue Bookings
SELECT * FROM get_all_queues_for_admin(NULL, 5, 0);

-- Test Moving
SELECT * FROM get_all_moving_for_admin(NULL, 5, 0);

-- Test Laundry
SELECT * FROM get_all_laundry_for_admin(NULL, 5, 0);

-- Test Cancellations
SELECT * FROM get_all_cancellations_for_admin(NULL, 5, 0);

-- Test Driver Tracking
SELECT * FROM get_active_providers_locations();
