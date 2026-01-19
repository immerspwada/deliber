-- =====================================================
-- Payment Slips Storage Bucket (Simplified)
-- =====================================================
-- Description: Storage bucket for payment slip uploads
-- Version: 2.0.0
-- Last Updated: 2025-01-08
-- =====================================================

-- Create storage bucket for payment slips
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-slips',
  'payment-slips',
  true,
  10485760, -- 10MB limit (after resize should be much smaller)
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- Storage Policies (Simplified - No folder structure)
-- =====================================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can upload payment slips" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own payment slips" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all payment slips" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own payment slips" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete any payment slip" ON storage.objects;

-- Allow authenticated users to upload payment slips
CREATE POLICY "Users can upload payment slips"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'payment-slips');

-- Allow authenticated users to view payment slips
CREATE POLICY "Users can view payment slips"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'payment-slips');

-- Allow authenticated users to delete payment slips
CREATE POLICY "Users can delete payment slips"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'payment-slips');

-- Allow public access to view payment slips (since bucket is public)
CREATE POLICY "Public can view payment slips"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'payment-slips');
