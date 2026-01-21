-- Fix Provider Job Matching System
-- Migration: 259_fix_provider_job_matching_system.sql
-- Description: Ensure proper foreign key relationships and indexes for provider job matching
-- Date: 2026-01-13

BEGIN;

-- Ensure ride_requests.provider_id references providers_v2.id (not user_id)
-- First check if the constraint exists and drop it if it's wrong
DO $$
BEGIN
    -- Check if there's an existing foreign key constraint
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name LIKE '%ride_requests_provider_id%' 
        AND table_name = 'ride_requests'
    ) THEN
        -- Drop existing constraint if it exists
        ALTER TABLE ride_requests DROP CONSTRAINT IF EXISTS ride_requests_provider_id_fkey;
        ALTER TABLE ride_requests DROP CONSTRAINT IF EXISTS fk_ride_requests_provider_id;
    END IF;
END $$;

-- Add correct foreign key constraint
ALTER TABLE ride_requests 
ADD CONSTRAINT fk_ride_requests_provider_id 
FOREIGN KEY (provider_id) REFERENCES providers_v2(id) ON DELETE SET NULL;

-- Ensure proper indexes for job matching performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ride_requests_status_pending 
ON ride_requests(status) WHERE status = 'pending';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ride_requests_provider_status 
ON ride_requests(provider_id, status) WHERE status IN ('accepted', 'arrived', 'in_progress');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ride_requests_pickup_location 
ON ride_requests(pickup_lat, pickup_lng) WHERE status = 'pending';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_providers_v2_online_available 
ON providers_v2(is_online, is_available, status) WHERE is_online = true AND is_available = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_providers_v2_location 
ON providers_v2(current_lat, current_lng) WHERE is_online = true;

-- Ensure ride_requests has all necessary columns with proper types
DO $$
BEGIN
    -- Add tracking_id if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ride_requests' AND column_name = 'tracking_id') THEN
        ALTER TABLE ride_requests ADD COLUMN tracking_id TEXT;
    END IF;
    
    -- Add final_fare if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ride_requests' AND column_name = 'final_fare') THEN
        ALTER TABLE ride_requests ADD COLUMN final_fare DECIMAL(10,2);
    END IF;
    
    -- Add notes if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ride_requests' AND column_name = 'notes') THEN
        ALTER TABLE ride_requests ADD COLUMN notes TEXT;
    END IF;
    
    -- Add accepted_at if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ride_requests' AND column_name = 'accepted_at') THEN
        ALTER TABLE ride_requests ADD COLUMN accepted_at TIMESTAMPTZ;
    END IF;
    
    -- Add arrived_at if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ride_requests' AND column_name = 'arrived_at') THEN
        ALTER TABLE ride_requests ADD COLUMN arrived_at TIMESTAMPTZ;
    END IF;
    
    -- Add started_at if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ride_requests' AND column_name = 'started_at') THEN
        ALTER TABLE ride_requests ADD COLUMN started_at TIMESTAMPTZ;
    END IF;
    
    -- Add completed_at if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ride_requests' AND column_name = 'completed_at') THEN
        ALTER TABLE ride_requests ADD COLUMN completed_at TIMESTAMPTZ;
    END IF;
END $$;

-- Update tracking_id for existing records that don't have one
UPDATE ride_requests 
SET tracking_id = 'RID-' || UPPER(SUBSTRING(id::text FROM 1 FOR 8))
WHERE tracking_id IS NULL;

-- Make tracking_id NOT NULL after updating existing records
ALTER TABLE ride_requests ALTER COLUMN tracking_id SET NOT NULL;

-- Add unique constraint on tracking_id
ALTER TABLE ride_requests ADD CONSTRAINT uk_ride_requests_tracking_id UNIQUE (tracking_id);

-- Ensure proper RLS policies for ride_requests
DROP POLICY IF EXISTS "customers_own_rides" ON ride_requests;
DROP POLICY IF EXISTS "providers_assigned_rides" ON ride_requests;

-- Customer can see their own rides
CREATE POLICY "customers_own_rides" ON ride_requests
    FOR ALL USING (auth.uid() = user_id);

-- Providers can see rides assigned to them
CREATE POLICY "providers_assigned_rides" ON ride_requests
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM providers_v2 
            WHERE providers_v2.id = ride_requests.provider_id 
            AND providers_v2.user_id = auth.uid()
        )
    );

-- Providers can see pending rides for job matching (read-only)
CREATE POLICY "providers_view_pending_rides" ON ride_requests
    FOR SELECT USING (
        status = 'pending' 
        AND provider_id IS NULL
        AND EXISTS (
            SELECT 1 FROM providers_v2 
            WHERE providers_v2.user_id = auth.uid() 
            AND providers_v2.status IN ('approved', 'active')
            AND providers_v2.is_online = true
        )
    );

-- Function to get nearby pending rides for providers
CREATE OR REPLACE FUNCTION get_nearby_pending_rides(
    provider_lat DECIMAL,
    provider_lng DECIMAL,
    radius_km DECIMAL DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    tracking_id TEXT,
    user_id UUID,
    pickup_lat DECIMAL,
    pickup_lng DECIMAL,
    pickup_address TEXT,
    destination_lat DECIMAL,
    destination_lng DECIMAL,
    destination_address TEXT,
    estimated_fare DECIMAL,
    created_at TIMESTAMPTZ,
    distance_km DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.id,
        r.tracking_id,
        r.user_id,
        r.pickup_lat,
        r.pickup_lng,
        r.pickup_address,
        r.destination_lat,
        r.destination_lng,
        r.destination_address,
        r.estimated_fare,
        r.created_at,
        -- Calculate distance using Haversine formula (approximate)
        (
            6371 * acos(
                cos(radians(provider_lat)) * 
                cos(radians(r.pickup_lat)) * 
                cos(radians(r.pickup_lng) - radians(provider_lng)) + 
                sin(radians(provider_lat)) * 
                sin(radians(r.pickup_lat))
            )
        )::DECIMAL as distance_km
    FROM ride_requests r
    WHERE r.status = 'pending'
        AND r.provider_id IS NULL
        AND r.pickup_lat IS NOT NULL
        AND r.pickup_lng IS NOT NULL
        -- Pre-filter by approximate bounding box for performance
        AND r.pickup_lat BETWEEN provider_lat - (radius_km / 111.0) AND provider_lat + (radius_km / 111.0)
        AND r.pickup_lng BETWEEN provider_lng - (radius_km / (111.0 * cos(radians(provider_lat)))) AND provider_lng + (radius_km / (111.0 * cos(radians(provider_lat))))
    HAVING (
        6371 * acos(
            cos(radians(provider_lat)) * 
            cos(radians(r.pickup_lat)) * 
            cos(radians(r.pickup_lng) - radians(provider_lng)) + 
            sin(radians(provider_lat)) * 
            sin(radians(r.pickup_lat))
        )
    ) <= radius_km
    ORDER BY distance_km ASC, r.created_at ASC
    LIMIT 20;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_nearby_pending_rides(DECIMAL, DECIMAL, DECIMAL) TO authenticated;

COMMIT;

-- Comments
COMMENT ON FUNCTION get_nearby_pending_rides IS 'Get nearby pending ride requests for provider job matching with distance calculation';