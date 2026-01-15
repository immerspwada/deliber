-- =====================================================
-- Migration: Provider Performance Indexes
-- Purpose: Add indexes to improve provider job queries
-- =====================================================

-- Index for job pool queries (pending jobs without provider)
CREATE INDEX IF NOT EXISTS idx_ride_requests_pending_pool 
ON ride_requests (status, provider_id, created_at DESC)
WHERE status = 'pending' AND provider_id IS NULL;

-- Index for provider's active jobs
CREATE INDEX IF NOT EXISTS idx_ride_requests_provider_active 
ON ride_requests (provider_id, status, accepted_at DESC)
WHERE status IN ('matched', 'pickup', 'in_progress');

-- Index for provider's completed jobs (earnings queries)
CREATE INDEX IF NOT EXISTS idx_ride_requests_provider_completed 
ON ride_requests (provider_id, completed_at DESC)
WHERE status = 'completed';

-- Index for provider location updates
CREATE INDEX IF NOT EXISTS idx_provider_locations_provider_updated 
ON provider_locations (provider_id, updated_at DESC);

-- Index for providers_v2 online status
CREATE INDEX IF NOT EXISTS idx_providers_v2_online 
ON providers_v2 (is_online, is_available, status)
WHERE is_online = true;

-- Index for providers_v2 user lookup
CREATE INDEX IF NOT EXISTS idx_providers_v2_user_id 
ON providers_v2 (user_id);

-- =====================================================
-- Comments
-- =====================================================
COMMENT ON INDEX idx_ride_requests_pending_pool IS 'Optimizes job pool queries for available jobs';
COMMENT ON INDEX idx_ride_requests_provider_active IS 'Optimizes active job lookups for providers';
COMMENT ON INDEX idx_ride_requests_provider_completed IS 'Optimizes earnings and history queries';
COMMENT ON INDEX idx_provider_locations_provider_updated IS 'Optimizes location tracking queries';
COMMENT ON INDEX idx_providers_v2_online IS 'Optimizes online provider lookups';
COMMENT ON INDEX idx_providers_v2_user_id IS 'Optimizes provider lookup by user_id';
