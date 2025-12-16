-- Migration: 012_provider_documents_storage.sql
-- Feature: F14 - Provider Documents Storage
-- Description: Create storage bucket for provider documents (ID card, license, vehicle photos)

-- =====================================================
-- STORAGE BUCKET FOR PROVIDER DOCUMENTS
-- =====================================================

-- Create storage bucket for provider documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'provider-documents',
  'provider-documents',
  false,  -- Private bucket (requires auth)
  5242880,  -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- =====================================================
-- STORAGE POLICIES
-- =====================================================

-- Policy: Users can upload their own documents
CREATE POLICY "Users can upload own documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'provider-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can view their own documents
CREATE POLICY "Users can view own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'provider-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can update their own documents
CREATE POLICY "Users can update own documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'provider-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can delete their own documents
CREATE POLICY "Users can delete own documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'provider-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Admins can view all documents
CREATE POLICY "Admins can view all documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'provider-documents' AND
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- =====================================================
-- ADD DOCUMENT FIELDS TO SERVICE_PROVIDERS (if not exists)
-- =====================================================

-- Add documents column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'service_providers'
    AND column_name = 'documents'
  ) THEN
    ALTER TABLE public.service_providers
    ADD COLUMN documents JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Add rejection_reason column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'service_providers'
    AND column_name = 'rejection_reason'
  ) THEN
    ALTER TABLE public.service_providers
    ADD COLUMN rejection_reason TEXT;
  END IF;
END $$;

-- Add status column if not exists (with proper enum values)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'service_providers'
    AND column_name = 'status'
  ) THEN
    ALTER TABLE public.service_providers
    ADD COLUMN status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'suspended'));
  END IF;
END $$;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON COLUMN public.service_providers.documents IS 'JSON object containing document URLs: {id_card, license, vehicle}';
COMMENT ON COLUMN public.service_providers.rejection_reason IS 'Reason for rejection if status is rejected';
COMMENT ON COLUMN public.service_providers.status IS 'Application status: pending, approved, rejected, suspended';
