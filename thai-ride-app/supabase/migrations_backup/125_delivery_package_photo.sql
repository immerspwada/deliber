-- =============================================
-- Migration: 125_delivery_package_photo.sql
-- Feature: F03a - Package Photo Upload for Delivery
-- Description: Add package_photo column for customers to upload package photos
-- =============================================

-- Add package_photo column to delivery_requests
ALTER TABLE delivery_requests 
ADD COLUMN IF NOT EXISTS package_photo TEXT;

-- Add special_instructions column if not exists
ALTER TABLE delivery_requests 
ADD COLUMN IF NOT EXISTS special_instructions TEXT;

-- Add distance_km column if not exists
ALTER TABLE delivery_requests 
ADD COLUMN IF NOT EXISTS distance_km DECIMAL(10,2);

-- Comments
COMMENT ON COLUMN delivery_requests.package_photo IS 'Customer uploaded photo of the package before delivery';
COMMENT ON COLUMN delivery_requests.special_instructions IS 'Special delivery instructions from customer';
COMMENT ON COLUMN delivery_requests.distance_km IS 'Estimated distance in kilometers';

-- Create storage bucket for package photos
-- Note: Run this in Supabase Dashboard SQL Editor or via API
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'package-photos', 
  'package-photos', 
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: Allow authenticated users to upload their own photos
CREATE POLICY "Users can upload package photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'package-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Storage policy: Allow public read access
CREATE POLICY "Public can view package photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'package-photos');

-- Storage policy: Allow users to delete their own photos
CREATE POLICY "Users can delete own package photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'package-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
