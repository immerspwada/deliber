-- ============================================
-- Migration: 269_ride_evidence_storage.sql
-- Feature: Storage Bucket for Ride Evidence Photos
-- Date: 2026-01-15
-- Description: Create storage bucket for pickup/dropoff photos
-- ============================================

-- =====================================================
-- 1. STORAGE BUCKET FOR RIDE EVIDENCE
-- =====================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ride-evidence',
  'ride-evidence',
  true,  -- Public read access
  5242880, -- 5MB limit (after resize, images will be ~500KB)
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

-- =====================================================
-- 2. STORAGE POLICIES
-- =====================================================

-- Allow public read access (for customer to view evidence)
DROP POLICY IF EXISTS "public_read_ride_evidence" ON storage.objects;
CREATE POLICY "public_read_ride_evidence" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'ride-evidence');

-- Allow providers to upload evidence for their assigned rides
DROP POLICY IF EXISTS "provider_upload_ride_evidence" ON storage.objects;
CREATE POLICY "provider_upload_ride_evidence" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'ride-evidence' AND
    -- Check if provider is assigned to this ride
    EXISTS (
      SELECT 1 FROM ride_requests
      WHERE id::text = (string_to_array(name, '/'))[1]
      AND provider_id = auth.uid()
    )
  );

-- Allow providers to update evidence for their assigned rides
DROP POLICY IF EXISTS "provider_update_ride_evidence" ON storage.objects;
CREATE POLICY "provider_update_ride_evidence" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'ride-evidence' AND
    EXISTS (
      SELECT 1 FROM ride_requests
      WHERE id::text = (string_to_array(name, '/'))[1]
      AND provider_id = auth.uid()
    )
  )
  WITH CHECK (
    bucket_id = 'ride-evidence' AND
    EXISTS (
      SELECT 1 FROM ride_requests
      WHERE id::text = (string_to_array(name, '/'))[1]
      AND provider_id = auth.uid()
    )
  );

-- Allow providers to delete evidence for their assigned rides
DROP POLICY IF EXISTS "provider_delete_ride_evidence" ON storage.objects;
CREATE POLICY "provider_delete_ride_evidence" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'ride-evidence' AND
    EXISTS (
      SELECT 1 FROM ride_requests
      WHERE id::text = (string_to_array(name, '/'))[1]
      AND provider_id = auth.uid()
    )
  );

-- Allow admin full access
DROP POLICY IF EXISTS "admin_manage_ride_evidence" ON storage.objects;
CREATE POLICY "admin_manage_ride_evidence" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'ride-evidence' AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  )
  WITH CHECK (
    bucket_id = 'ride-evidence' AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- =====================================================
-- 3. COMMENTS
-- =====================================================

COMMENT ON POLICY "public_read_ride_evidence" ON storage.objects IS 
  'Allow public read access to ride evidence photos';

COMMENT ON POLICY "provider_upload_ride_evidence" ON storage.objects IS 
  'Allow providers to upload evidence photos for their assigned rides';

COMMENT ON POLICY "provider_update_ride_evidence" ON storage.objects IS 
  'Allow providers to update evidence photos for their assigned rides';

COMMENT ON POLICY "provider_delete_ride_evidence" ON storage.objects IS 
  'Allow providers to delete evidence photos for their assigned rides';

COMMENT ON POLICY "admin_manage_ride_evidence" ON storage.objects IS 
  'Allow admin full access to all ride evidence photos';
