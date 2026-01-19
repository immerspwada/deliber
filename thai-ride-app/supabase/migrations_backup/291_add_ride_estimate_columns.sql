-- ============================================================================
-- Migration: Add estimated_distance and estimated_duration to ride_requests
-- Purpose: Add columns for ride distance and duration estimates
-- Affected Tables: ride_requests
-- ============================================================================
-- 
-- Role Impact Analysis (3 บริบท):
-- 
-- 👤 Customer:
--   - Can see estimated distance/duration when booking
--   - Better trip planning with accurate estimates
--   - No additional permissions needed (existing RLS covers)
-- 
-- 🚗 Provider:
--   - Can see estimated distance/duration for job decisions
--   - Better job selection based on distance
--   - Helps calculate earnings per km
-- 
-- 👑 Admin:
--   - Can analyze average distances/durations
--   - Better reporting and analytics
--   - Performance monitoring capabilities
-- ============================================================================

-- Add estimated_distance column (in kilometers)
-- Used for: fare calculation, provider job preview, analytics
alter table public.ride_requests
add column if not exists estimated_distance numeric(10, 2) null;

comment on column public.ride_requests.estimated_distance is 
  'Estimated trip distance in kilometers, calculated at booking time';

-- Add estimated_duration column (in minutes)
-- Used for: ETA display, provider scheduling, analytics
alter table public.ride_requests
add column if not exists estimated_duration integer null;

comment on column public.ride_requests.estimated_duration is 
  'Estimated trip duration in minutes, calculated at booking time';

-- Add index for analytics queries (admin reports)
create index if not exists idx_ride_requests_estimated_distance 
  on public.ride_requests(estimated_distance) 
  where estimated_distance is not null;

create index if not exists idx_ride_requests_estimated_duration 
  on public.ride_requests(estimated_duration) 
  where estimated_duration is not null;

-- ============================================================================
-- No RLS changes needed - existing policies already cover these columns
-- as they are part of the ride_requests table
-- ============================================================================
