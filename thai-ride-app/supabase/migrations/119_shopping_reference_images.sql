-- =====================================================
-- Migration: 119_shopping_reference_images.sql
-- Description: Add reference_images column to shopping_requests
-- Feature: F04 - Shopping Service
-- =====================================================

-- Add reference_images column for storing image URLs
ALTER TABLE public.shopping_requests 
ADD COLUMN IF NOT EXISTS reference_images TEXT[] DEFAULT NULL;

-- Add comment
COMMENT ON COLUMN public.shopping_requests.reference_images IS 'Array of reference image URLs for shopping items';
