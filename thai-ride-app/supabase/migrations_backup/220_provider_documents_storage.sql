-- ============================================================================
-- Provider System Redesign - Storage Setup
-- Migration: 220
-- Description: Set up Supabase Storage for provider documents
-- ============================================================================

-- ============================================================================
-- PART 1: CREATE STORAGE BUCKET
-- ============================================================================

-- Create provider-documents bucket if not exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'provider-documents',
  'provider-documents',
  false, -- Private bucket
  10485760, -- 10MB limit
  ARRAY[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'application/pdf'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'application/pdf'
  ];

-- ============================================================================
-- PART 2: STORAGE POLICIES
-- ============================================================================

-- Policy: Providers can upload their own documents
CREATE POLICY "Providers can upload own documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'provider-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM providers_v2 WHERE user_id = auth.uid()
  )
);

-- Policy: Providers can view their own documents
CREATE POLICY "Providers can view own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'provider-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM providers_v2 WHERE user_id = auth.uid()
  )
);

-- Policy: Providers can update their own documents
CREATE POLICY "Providers can update own documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'provider-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM providers_v2 WHERE user_id = auth.uid()
  )
);

-- Policy: Providers can delete their own documents
CREATE POLICY "Providers can delete own documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'provider-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM providers_v2 WHERE user_id = auth.uid()
  )
);

-- Policy: Admins can view all documents
CREATE POLICY "Admins can view all provider documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'provider-documents'
  AND EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.raw_user_meta_data->>'role' = 'admin'
  )
);

-- Policy: Admins can update all documents
CREATE POLICY "Admins can update all provider documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'provider-documents'
  AND EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.raw_user_meta_data->>'role' = 'admin'
  )
);

-- Policy: Admins can delete all documents
CREATE POLICY "Admins can delete all provider documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'provider-documents'
  AND EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.raw_user_meta_data->>'role' = 'admin'
  )
);

-- ============================================================================
-- PART 3: HELPER FUNCTIONS
-- ============================================================================

-- Function to generate document storage path
CREATE OR REPLACE FUNCTION generate_document_storage_path(
  p_provider_id UUID,
  p_document_type TEXT,
  p_file_extension TEXT
) RETURNS TEXT AS $$
BEGIN
  RETURN p_provider_id::text || '/' || 
         p_document_type || '_' || 
         EXTRACT(EPOCH FROM NOW())::bigint || 
         '.' || p_file_extension;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get document public URL (for admins)
CREATE OR REPLACE FUNCTION get_document_url(
  p_storage_path TEXT
) RETURNS TEXT AS $$
DECLARE
  v_supabase_url TEXT;
BEGIN
  -- Get Supabase URL from environment or config
  -- This is a placeholder - actual implementation depends on your setup
  v_supabase_url := current_setting('app.supabase_url', true);
  
  IF v_supabase_url IS NULL THEN
    RETURN NULL;
  END IF;
  
  RETURN v_supabase_url || '/storage/v1/object/provider-documents/' || p_storage_path;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if document file exists in storage
CREATE OR REPLACE FUNCTION document_file_exists(
  p_storage_path TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM storage.objects
    WHERE bucket_id = 'provider-documents'
    AND name = p_storage_path
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 4: AUTOMATIC THUMBNAIL GENERATION (Placeholder)
-- ============================================================================

-- Note: Actual thumbnail generation would be handled by Edge Functions
-- This is a placeholder for the database structure

CREATE TABLE IF NOT EXISTS document_thumbnails (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID REFERENCES provider_documents_v2(id) ON DELETE CASCADE,
  thumbnail_path TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookup
CREATE INDEX IF NOT EXISTS idx_document_thumbnails_document 
  ON document_thumbnails(document_id);

-- RLS for thumbnails
ALTER TABLE document_thumbnails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers can view own document thumbnails"
  ON document_thumbnails FOR SELECT
  USING (
    document_id IN (
      SELECT id FROM provider_documents_v2 pd
      JOIN providers_v2 p ON p.id = pd.provider_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all document thumbnails"
  ON document_thumbnails FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- ============================================================================
-- PART 5: DOCUMENT CLEANUP TRIGGER
-- ============================================================================

-- Function to delete storage file when document record is deleted
CREATE OR REPLACE FUNCTION cleanup_document_storage()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete file from storage
  DELETE FROM storage.objects
  WHERE bucket_id = 'provider-documents'
  AND name = OLD.storage_path;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to cleanup storage on document deletion
DROP TRIGGER IF EXISTS trigger_cleanup_document_storage ON provider_documents_v2;
CREATE TRIGGER trigger_cleanup_document_storage
  BEFORE DELETE ON provider_documents_v2
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_document_storage();

-- ============================================================================
-- PART 6: GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION generate_document_storage_path TO authenticated;
GRANT EXECUTE ON FUNCTION get_document_url TO authenticated;
GRANT EXECUTE ON FUNCTION document_file_exists TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION generate_document_storage_path IS 'Generate unique storage path for provider document';
COMMENT ON FUNCTION get_document_url IS 'Get public URL for document (admin only)';
COMMENT ON FUNCTION document_file_exists IS 'Check if document file exists in storage';
COMMENT ON TABLE document_thumbnails IS 'Thumbnail images for provider documents';

