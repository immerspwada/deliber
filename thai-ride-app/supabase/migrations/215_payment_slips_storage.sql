-- =====================================================
-- Payment Slips Storage Bucket
-- =====================================================
-- Description: Storage bucket for payment slip uploads
-- Version: 1.0.0
-- Last Updated: 2025-01-08
-- =====================================================

-- Create storage bucket for payment slips
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-slips',
  'payment-slips',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- Storage Policies
-- =====================================================

-- Allow authenticated users to upload their own payment slips
CREATE POLICY "Users can upload payment slips"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'payment-slips' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to view their own payment slips
CREATE POLICY "Users can view their own payment slips"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'payment-slips' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow admins to view all payment slips
CREATE POLICY "Admins can view all payment slips"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'payment-slips' AND
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- Allow users to delete their own payment slips
CREATE POLICY "Users can delete their own payment slips"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'payment-slips' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow admins to delete any payment slip
CREATE POLICY "Admins can delete any payment slip"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'payment-slips' AND
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);
