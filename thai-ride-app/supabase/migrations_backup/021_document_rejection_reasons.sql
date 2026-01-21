-- Migration: 021_document_rejection_reasons.sql
-- Feature: F14 - Provider Documents
-- Description: Add rejection_reasons and document_timestamps columns

-- Add rejection_reasons column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'service_providers'
    AND column_name = 'rejection_reasons'
  ) THEN
    ALTER TABLE public.service_providers
    ADD COLUMN rejection_reasons JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Add document_timestamps column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'service_providers'
    AND column_name = 'document_timestamps'
  ) THEN
    ALTER TABLE public.service_providers
    ADD COLUMN document_timestamps JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Add comments
COMMENT ON COLUMN public.service_providers.rejection_reasons IS 'JSON object containing rejection reasons per document: {id_card: "reason", license: "reason", vehicle: "reason"}';
COMMENT ON COLUMN public.service_providers.document_timestamps IS 'JSON object containing timestamps when documents were approved/rejected: {id_card: "ISO date", license: "ISO date", vehicle: "ISO date"}';

-- Update documents column to support 'rejected' status
-- Documents can now have values: URL string, 'verified', 'pending', 'rejected'
COMMENT ON COLUMN public.service_providers.documents IS 'JSON object containing document status/URLs: {id_card, license, vehicle}. Values can be: URL string (pending review), "verified", "rejected"';
