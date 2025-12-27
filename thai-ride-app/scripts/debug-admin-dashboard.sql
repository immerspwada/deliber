-- =====================================================
-- DEBUG: Admin Dashboard Data Issues
-- Run this in Supabase SQL Editor to diagnose
-- =====================================================

-- 1. Check if required tables exist
SELECT 
  'users' as table_name, 
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') as exists;
SELECT 
  'service_providers' as table_name, 
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'service_providers') as exists;
SELECT 
  'ride_requests' as table_name, 
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ride_requests') as exists;
SELECT 
  'delivery_requests' as table_name, 
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'delivery_requests') as exists;
SELECT 
  'shopping_requests' as table_name, 
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'shopping_requests') as exists;
SELECT 
  'support_tickets' as table_name, 
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'support_tickets') as exists;
SELECT 
  'user_subscriptions' as table_name, 
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_subscriptions') as exists;
SELECT 
  'insurance_claims' as table_name, 
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'insurance_claims') as exists;
SELECT 
  'scheduled_rides' as table_name, 
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'scheduled_rides') as exists;
SELECT 
  'companies' as table_name, 
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'companies') as exists;

-- 2. Check data counts
SELECT 'users' as table_name, COUNT(*) as count FROM users;
SELECT 'service_providers' as table_name, COUNT(*) as count FROM service_providers;
SELECT 'ride_requests' as table_name, COUNT(*) as count FROM ride_requests;
SELECT 'delivery_requests' as table_name, COUNT(*) as count FROM delivery_requests;
SELECT 'shopping_requests' as table_name, COUNT(*) as count FROM shopping_requests;

-- 3. Test the dashboard stats function
SELECT * FROM get_admin_dashboard_stats();

-- 4. Test orders function
SELECT * FROM get_all_orders_for_admin(NULL, NULL, 10, 0);
SELECT count_all_orders_for_admin(NULL, NULL) as total_orders;

-- 5. Test providers function
SELECT * FROM get_all_providers_for_admin(NULL, NULL, 10, 0);

-- 6. Check RPC function permissions
SELECT 
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname LIKE '%admin%'
ORDER BY p.proname;
