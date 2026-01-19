-- Create storage bucket for provider documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'provider-documents',
  'provider-documents',
  false, -- Private bucket for security
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- RLS policies for provider documents bucket
CREATE POLICY "Users can upload their own documents" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'provider-documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'provider-documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own documents" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'provider-documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own documents" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'provider-documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Admin can view all documents
CREATE POLICY "Admins can view all provider documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'provider-documents' AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admin can update document status (for approval/rejection)
CREATE POLICY "Admins can update provider documents" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'provider-documents' AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create function to validate document uploads
CREATE OR REPLACE FUNCTION validate_document_upload()
RETURNS TRIGGER AS $$
BEGIN
  -- Check file size (max 10MB)
  IF NEW.metadata->>'size' IS NOT NULL AND 
     (NEW.metadata->>'size')::bigint > 10485760 THEN
    RAISE EXCEPTION 'File size exceeds 10MB limit';
  END IF;

  -- Check file type
  IF NEW.metadata->>'mimetype' IS NOT NULL AND 
     NEW.metadata->>'mimetype' NOT IN (
       'image/jpeg', 'image/png', 'image/jpg', 'application/pdf'
     ) THEN
    RAISE EXCEPTION 'Invalid file type. Only JPEG, PNG, and PDF files are allowed';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for document validation
DROP TRIGGER IF EXISTS validate_document_upload_trigger ON storage.objects;
CREATE TRIGGER validate_document_upload_trigger
  BEFORE INSERT OR UPDATE ON storage.objects
  FOR EACH ROW
  WHEN (NEW.bucket_id = 'provider-documents')
  EXECUTE FUNCTION validate_document_upload();

-- Create function to get provider documents with status
CREATE OR REPLACE FUNCTION get_provider_documents(provider_user_id UUID)
RETURNS TABLE (
  document_type TEXT,
  file_name TEXT,
  file_url TEXT,
  uploaded_at TIMESTAMPTZ,
  file_size BIGINT,
  status TEXT,
  rejection_reason TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (doc.value->>'type')::TEXT as document_type,
    (doc.value->>'fileName')::TEXT as file_name,
    (doc.value->>'fileUrl')::TEXT as file_url,
    (doc.value->>'uploadedAt')::TIMESTAMPTZ as uploaded_at,
    (doc.value->>'fileSize')::BIGINT as file_size,
    COALESCE((doc.value->>'status')::TEXT, 'pending') as status,
    (doc.value->>'rejectionReason')::TEXT as rejection_reason
  FROM providers_v2 p,
       jsonb_each(p.documents) as doc(key, value)
  WHERE p.user_id = provider_user_id
    AND p.documents IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_provider_documents(UUID) TO authenticated;

-- Create function to update document status (admin only)
CREATE OR REPLACE FUNCTION update_document_status(
  provider_user_id UUID,
  document_type TEXT,
  new_status TEXT,
  rejection_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  current_documents JSONB;
  updated_documents JSONB;
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can update document status';
  END IF;

  -- Validate status
  IF new_status NOT IN ('pending', 'approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid status. Must be pending, approved, or rejected';
  END IF;

  -- Get current documents
  SELECT documents INTO current_documents
  FROM providers_v2
  WHERE user_id = provider_user_id;

  IF current_documents IS NULL OR NOT current_documents ? document_type THEN
    RAISE EXCEPTION 'Document not found';
  END IF;

  -- Update document status
  updated_documents := jsonb_set(
    current_documents,
    ARRAY[document_type, 'status'],
    to_jsonb(new_status)
  );

  -- Add rejection reason if provided
  IF rejection_reason IS NOT NULL THEN
    updated_documents := jsonb_set(
      updated_documents,
      ARRAY[document_type, 'rejectionReason'],
      to_jsonb(rejection_reason)
    );
  END IF;

  -- Update provider record
  UPDATE providers_v2
  SET 
    documents = updated_documents,
    updated_at = NOW()
  WHERE user_id = provider_user_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users (function handles admin check)
GRANT EXECUTE ON FUNCTION update_document_status(UUID, TEXT, TEXT, TEXT) TO authenticated;