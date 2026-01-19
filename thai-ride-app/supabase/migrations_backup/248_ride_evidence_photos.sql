-- Migration: 248_ride_evidence_photos.sql
-- Feature: Photo Evidence for Ride Requests
-- Description: Add pickup/dropoff photo columns for provider evidence
-- Date: 2026-01-13

BEGIN;

-- =====================================================
-- 1. Add photo evidence columns to ride_requests
-- =====================================================
ALTER TABLE ride_requests 
ADD COLUMN IF NOT EXISTS pickup_photo TEXT,
ADD COLUMN IF NOT EXISTS dropoff_photo TEXT,
ADD COLUMN IF NOT EXISTS pickup_photo_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS dropoff_photo_at TIMESTAMPTZ;

COMMENT ON COLUMN ride_requests.pickup_photo IS 'Provider photo evidence at pickup location';
COMMENT ON COLUMN ride_requests.dropoff_photo IS 'Provider photo evidence at dropoff location';
COMMENT ON COLUMN ride_requests.pickup_photo_at IS 'Timestamp when pickup photo was taken';
COMMENT ON COLUMN ride_requests.dropoff_photo_at IS 'Timestamp when dropoff photo was taken';

-- =====================================================
-- 2. Create storage bucket for ride evidence photos
-- =====================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ride-evidence', 
  'ride-evidence', 
  false,  -- Private bucket
  5242880,  -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 3. Storage RLS Policies
-- =====================================================

-- Policy: Providers can upload evidence for their rides
CREATE POLICY "provider_upload_evidence" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'ride-evidence'
    AND EXISTS (
      SELECT 1 FROM ride_requests r
      JOIN providers_v2 p ON r.provider_id = p.id
      WHERE p.user_id = auth.uid()
      AND r.id::text = (storage.foldername(name))[1]
    )
  );

-- Policy: Providers and customers can view evidence for their rides
CREATE POLICY "view_ride_evidence" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'ride-evidence'
    AND EXISTS (
      SELECT 1 FROM ride_requests r
      LEFT JOIN providers_v2 p ON r.provider_id = p.id
      WHERE (r.user_id = auth.uid() OR p.user_id = auth.uid())
      AND r.id::text = (storage.foldername(name))[1]
    )
  );

-- Policy: Admin can view all evidence
CREATE POLICY "admin_view_all_evidence" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'ride-evidence'
    AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- =====================================================
-- 4. Index for performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_ride_requests_photos 
  ON ride_requests(id) 
  WHERE pickup_photo IS NOT NULL OR dropoff_photo IS NOT NULL;

COMMIT;
