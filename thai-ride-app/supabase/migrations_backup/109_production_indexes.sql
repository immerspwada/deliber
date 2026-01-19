-- Migration: 109_production_indexes.sql
-- Production Performance Indexes
-- Optimize query performance for production workloads

-- =====================================================
-- 1. Ride Requests Indexes
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_ride_requests_status_created 
  ON ride_requests(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ride_requests_customer_status 
  ON ride_requests(customer_id, status);

CREATE INDEX IF NOT EXISTS idx_ride_requests_provider_status 
  ON ride_requests(provider_id, status) WHERE provider_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ride_requests_pending_location 
  ON ride_requests(status, pickup_lat, pickup_lng) 
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_ride_requests_active 
  ON ride_requests(status, created_at) 
  WHERE status IN ('pending', 'matched', 'arrived', 'in_progress');

-- =====================================================
-- 2. Delivery Requests Indexes
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_delivery_requests_status_created 
  ON delivery_requests(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_delivery_requests_customer_status 
  ON delivery_requests(customer_id, status);

CREATE INDEX IF NOT EXISTS idx_delivery_requests_provider_status 
  ON delivery_requests(provider_id, status) WHERE provider_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_delivery_requests_pending 
  ON delivery_requests(status, created_at) 
  WHERE status = 'pending';

-- =====================================================
-- 3. Shopping Requests Indexes
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_shopping_requests_status_created 
  ON shopping_requests(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_shopping_requests_customer_status 
  ON shopping_requests(customer_id, status);

CREATE INDEX IF NOT EXISTS idx_shopping_requests_pending 
  ON shopping_requests(status, created_at) 
  WHERE status = 'pending';

-- =====================================================
-- 4. Service Providers Indexes
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_providers_available_location 
  ON service_providers(is_available, current_lat, current_lng) 
  WHERE is_available = true AND status = 'approved';

CREATE INDEX IF NOT EXISTS idx_providers_status_type 
  ON service_providers(status, provider_type);

CREATE INDEX IF NOT EXISTS idx_providers_user_id 
  ON service_providers(user_id);

CREATE INDEX IF NOT EXISTS idx_providers_online_status 
  ON service_providers(is_available, status) 
  WHERE status = 'approved';

-- =====================================================
-- 5. Users Indexes
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_users_role 
  ON users(role);

CREATE INDEX IF NOT EXISTS idx_users_member_uid 
  ON users(member_uid) WHERE member_uid IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_phone 
  ON users(phone_number) WHERE phone_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_email 
  ON users(email) WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_created 
  ON users(created_at DESC);

-- =====================================================
-- 6. Wallet Transactions Indexes
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_created 
  ON wallet_transactions(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_type 
  ON wallet_transactions(transaction_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_reference 
  ON wallet_transactions(reference_type, reference_id) 
  WHERE reference_id IS NOT NULL;

-- =====================================================
-- 7. Notifications Indexes
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_notifications_user_read 
  ON user_notifications(user_id, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_unread 
  ON user_notifications(user_id, created_at DESC) 
  WHERE is_read = false;

-- =====================================================
-- 8. Ratings Indexes
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_ride_ratings_provider 
  ON ride_ratings(provider_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ride_ratings_customer 
  ON ride_ratings(customer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_delivery_ratings_provider 
  ON delivery_ratings(provider_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_shopping_ratings_provider 
  ON shopping_ratings(provider_id, created_at DESC);

-- =====================================================
-- 9. Chat Messages Indexes
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_chat_messages_session 
  ON chat_messages(session_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_participants 
  ON chat_sessions(customer_id, provider_id);

-- =====================================================
-- 10. Promo Codes Indexes
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_promo_codes_active 
  ON promo_codes(is_active, valid_from, valid_until) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_promo_usage_user 
  ON user_promo_usage(user_id, promo_id);

-- =====================================================
-- 11. Loyalty Indexes
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_user_loyalty_user 
  ON user_loyalty(user_id);

CREATE INDEX IF NOT EXISTS idx_points_transactions_user 
  ON points_transactions(user_id, created_at DESC);

-- =====================================================
-- 12. Queue/Moving/Laundry Indexes
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_queue_bookings_status 
  ON queue_bookings(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_queue_bookings_customer 
  ON queue_bookings(customer_id, status);

CREATE INDEX IF NOT EXISTS idx_moving_requests_status 
  ON moving_requests(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_moving_requests_customer 
  ON moving_requests(customer_id, status);

CREATE INDEX IF NOT EXISTS idx_laundry_requests_status 
  ON laundry_requests(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_laundry_requests_customer 
  ON laundry_requests(customer_id, status);

-- =====================================================
-- 13. Analytics Indexes
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_analytics_events_session 
  ON analytics_events(session_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_name 
  ON analytics_events(event_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_user 
  ON analytics_events(user_id, created_at DESC) 
  WHERE user_id IS NOT NULL;

-- =====================================================
-- 14. Admin Audit Log Indexes
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_admin_audit_admin 
  ON admin_audit_log(admin_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_audit_action 
  ON admin_audit_log(action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_audit_entity 
  ON admin_audit_log(entity_type, entity_id);

-- =====================================================
-- 15. Scheduled Rides Indexes
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_scheduled_rides_user_date 
  ON scheduled_rides(user_id, scheduled_date);

CREATE INDEX IF NOT EXISTS idx_scheduled_rides_upcoming 
  ON scheduled_rides(status, scheduled_date) 
  WHERE status = 'scheduled';

-- =====================================================
-- 16. Support Tickets Indexes
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_support_tickets_status 
  ON support_tickets(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_support_tickets_user 
  ON support_tickets(user_id, status);

-- =====================================================
-- 17. Partial Indexes for Common Queries
-- =====================================================

-- Active rides only
CREATE INDEX IF NOT EXISTS idx_active_rides 
  ON ride_requests(customer_id, created_at DESC) 
  WHERE status NOT IN ('completed', 'cancelled');

-- Pending provider applications
CREATE INDEX IF NOT EXISTS idx_pending_providers 
  ON service_providers(created_at DESC) 
  WHERE status = 'pending';

-- Unread notifications
CREATE INDEX IF NOT EXISTS idx_unread_notifications_count 
  ON user_notifications(user_id) 
  WHERE is_read = false;

-- =====================================================
-- 18. Composite Indexes for Complex Queries
-- =====================================================

-- Provider search with location and availability
CREATE INDEX IF NOT EXISTS idx_provider_search 
  ON service_providers(provider_type, is_available, status, current_lat, current_lng);

-- Order history with date range
CREATE INDEX IF NOT EXISTS idx_ride_history 
  ON ride_requests(customer_id, status, created_at DESC);

-- Admin dashboard queries
CREATE INDEX IF NOT EXISTS idx_admin_rides_overview 
  ON ride_requests(status, created_at DESC, customer_id, provider_id);

-- =====================================================
-- 19. GiST Indexes for Geospatial Queries (if PostGIS)
-- =====================================================
-- Note: These require PostGIS extension
-- CREATE INDEX IF NOT EXISTS idx_providers_location_gist 
--   ON service_providers USING GIST (
--     ST_SetSRID(ST_MakePoint(current_lng, current_lat), 4326)
--   );

-- =====================================================
-- 20. Analyze Tables for Query Planner
-- =====================================================
ANALYZE ride_requests;
ANALYZE delivery_requests;
ANALYZE shopping_requests;
ANALYZE service_providers;
ANALYZE users;
ANALYZE wallet_transactions;
ANALYZE user_notifications;
