-- =============================================
-- Migration: 050_delivery_package_photo.sql
-- Feature: Package Photo Upload for Delivery
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

-- Comment
COMMENT ON COLUMN delivery_requests.package_photo IS 'Customer uploaded photo of the package before delivery';
COMMENT ON COLUMN delivery_requests.special_instructions IS 'Special delivery instructions from customer';
COMMENT ON COLUMN delivery_requests.distance_km IS 'Estimated distance in kilometers';

-- Create storage bucket for package photos (if using Supabase Storage)
-- Note: This needs to be done via Supabase Dashboard or API
-- INSERT INTO storage.buckets (id, name, public) VALUES ('package-photos', 'package-photos', true);
