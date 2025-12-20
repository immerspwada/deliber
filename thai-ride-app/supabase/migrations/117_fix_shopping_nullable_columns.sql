-- =====================================================
-- Migration: 117_fix_shopping_nullable_columns.sql
-- Description: Allow store info to be nullable in shopping_requests
-- Feature: F04 - Shopping Service
-- =====================================================

-- Allow store_name to be nullable (user might not know store name)
ALTER TABLE public.shopping_requests 
ALTER COLUMN store_name DROP NOT NULL;

-- Allow store_address to be nullable
ALTER TABLE public.shopping_requests 
ALTER COLUMN store_address DROP NOT NULL;

-- Allow store_lat to be nullable
ALTER TABLE public.shopping_requests 
ALTER COLUMN store_lat DROP NOT NULL;

-- Allow store_lng to be nullable
ALTER TABLE public.shopping_requests 
ALTER COLUMN store_lng DROP NOT NULL;

-- Add items column if not exists (for structured items array)
ALTER TABLE public.shopping_requests 
ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;

-- Add comment
COMMENT ON TABLE public.shopping_requests IS 'Shopping requests - store info is optional, customer can just specify delivery location and items';
