-- Migration: 283_add_matched_at_column.sql
-- Author: AI Assistant
-- Date: 2026-01-15
-- Description: Add matched_at column to ride_requests for provider response time analytics
-- Applied to hosted Supabase: onsflqhkgqhydeupiqyt (delivery project)

-- Add matched_at column to ride_requests
ALTER TABLE ride_requests ADD COLUMN IF NOT EXISTS matched_at TIMESTAMPTZ;

-- Create index for analytics
CREATE INDEX IF NOT EXISTS idx_ride_requests_matched_at ON ride_requests(matched_at) WHERE matched_at IS NOT NULL;

-- Add comment
COMMENT ON COLUMN ride_requests.matched_at IS 'Timestamp when provider accepted/matched the ride';
