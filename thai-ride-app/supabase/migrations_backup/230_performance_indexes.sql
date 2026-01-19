-- =====================================================
-- PERFORMANCE OPTIMIZATION: Critical Database Indexes
-- This migration adds missing indexes that cause slow queries
-- =====================================================

-- =====================================================
-- 1. WALLET TRANSACTIONS - Critical for transaction history
-- =====================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wallet_transactions_user_created 
ON wallet_transactions (user_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wallet_transactions_type_status 
ON wallet_transactions (type, status) WHERE status IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wallet_transactions_reference 
ON wallet_transactions (reference_type, reference_id) WHERE reference_id IS NOT NULL;

-- =====================================================
-- 2. TOPUP REQUESTS - Critical for admin dashboard
-- =====================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_topup_requests_status_created 
ON topup_requests (status, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_topup_requests_user_status 
ON topup_requests (user_id, status);

-- =====================================================
-- 3. CUSTOMER WITHDRAWALS - Critical for financial operations
-- =====================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customer_withdrawals_status_created 
ON customer_withdrawals (status, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customer_withdrawals_user_status 
ON customer_withdrawals (user_id, status);

-- =====================================================
-- 4. PROVIDER DOCUMENTS - Critical for verification queue
-- =====================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_provider_documents_provider_status 
ON provider_documents (provider_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_provider_documents_status_created 
ON provider_documents (status, created_at DESC) WHERE status = 'pending';

-- =====================================================
-- 5. RIDE REQUESTS - Critical for matching and history
-- =====================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ride_requests_status_created 
ON ride_requests (status, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ride_requests_customer_status 
ON ride_requests (customer_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ride_requests_provider_status 
ON ride_requests (provider_id, status) WHERE provider_id IS NOT NULL;

-- Geospatial index for location-based matching
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ride_requests_pickup_location 
ON ride_requests USING GIST (pickup_location) WHERE status = 'pending';

-- =====================================================
-- 6. SERVICE PROVIDERS - Critical for job matching
-- =====================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_service_providers_status_location 
ON service_providers (status, current_location) USING GIST 
WHERE status = 'online' AND current_location IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_service_providers_user_status 
ON service_providers (user_id, status);

-- =====================================================
-- 7. USER NOTIFICATIONS - Critical for real-time updates
-- =====================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_notifications_user_read 
ON user_notifications (user_id, is_read, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_notifications_type_created 
ON user_notifications (notification_type, created_at DESC);

-- =====================================================
-- 8. AUDIT LOG - Critical for admin queries
-- =====================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_table_timestamp 
ON audit_log (table_name, timestamp DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_user_timestamp 
ON audit_log (user_id, timestamp DESC) WHERE user_id IS NOT NULL;

-- =====================================================
-- 9. EMAIL VERIFICATION OTPS - Critical for auth flow
-- =====================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_email_verification_otps_user_expires 
ON email_verification_otps (user_id, expires_at DESC) WHERE NOT verified;

-- =====================================================
-- 10. SCHEDULED RIDES - Critical for scheduling system
-- =====================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_scheduled_rides_customer_scheduled 
ON scheduled_rides (customer_id, scheduled_for);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_scheduled_rides_status_scheduled 
ON scheduled_rides (status, scheduled_for) WHERE status = 'scheduled';

-- =====================================================
-- 11. PAYMENTS - Critical for financial reporting
-- =====================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_user_created 
ON payments (user_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_status_method 
ON payments (status, payment_method);

-- =====================================================
-- 12. REFERRALS - Critical for referral system
-- =====================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_referrals_referrer_status 
ON referrals (referrer_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_referrals_referred_created 
ON referrals (referred_id, created_at DESC);

-- =====================================================
-- ANALYZE TABLES for better query planning
-- =====================================================
ANALYZE wallet_transactions;
ANALYZE topup_requests;
ANALYZE customer_withdrawals;
ANALYZE provider_documents;
ANALYZE ride_requests;
ANALYZE service_providers;
ANALYZE user_notifications;
ANALYZE audit_log;
ANALYZE email_verification_otps;
ANALYZE scheduled_rides;
ANALYZE payments;
ANALYZE referrals;

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON INDEX idx_wallet_transactions_user_created IS 
'PERFORMANCE: Optimizes wallet transaction history queries';

COMMENT ON INDEX idx_provider_documents_status_created IS 
'PERFORMANCE: Optimizes verification queue queries';

COMMENT ON INDEX idx_ride_requests_pickup_location IS 
'PERFORMANCE: Optimizes location-based ride matching';

-- =====================================================
-- AUDIT LOG
-- =====================================================
INSERT INTO public.audit_log (
  table_name,
  operation,
  old_data,
  new_data,
  user_id,
  timestamp
) VALUES (
  'database_indexes',
  'PERFORMANCE_OPTIMIZATION',
  '{"indexes": "missing_critical_indexes"}',
  '{"indexes": "added_performance_indexes"}',
  '00000000-0000-0000-0000-000000000000',
  NOW()
);