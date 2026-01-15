-- ============================================
-- Migration: 271_provider_avatar_vehicle_storage.sql
-- Feature: Provider Avatar & Vehicle Photo Upload
-- Date: 2026-01-15
-- Description: Add avatar_url and vehicle_photo_url columns to providers_v2
--              Create storage buckets with role-based RLS policies
-- ============================================

-- =====================================================
-- 1. Add columns to providers_v2
-- =====================================================

DO $$
BEGIN
  -- Add avatar_url column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'providers_v2' 
    AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE providers_v2 ADD COLUMN avatar_url TEXT;
    RAISE NOTICE 'Added avatar_url column to providers_v2';
  END IF;

  -- Add vehicle_photo_url column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'providers_v2' 
    AND column_name = 'vehicle_photo_url'
  ) THEN
    ALTER TABLE providers_v2 ADD COLUMN vehicle_photo_url TEXT;
    RAISE NOTICE 'Added vehicle_photo_url column to providers_v2';
  END IF;
END $$;

-- =====================================================
-- 2. Create storage bucket for provider avatars
-- =====================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'provider-avatars',
  'provider-avatars',
  true,  -- Public so customers can view
  2097152,  -- 2MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- =====================================================
-- 3. Create storage bucket for vehicle photos
-- =====================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'provider-vehicles',
  'provider-vehicles',
  true,  -- Public so customers can view
  5242880,  -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- =====================================================
-- 4. RLS Policies for provider-avatars bucket
-- =====================================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "provider_avatar_select" ON storage.objects;
DROP POLICY IF EXISTS "provider_avatar_insert" ON storage.objects;
DROP POLICY IF EXISTS "provider_avatar_update" ON storage.objects;
DROP POLICY IF EXISTS "provider_avatar_delete" ON storage.objects;

-- SELECT: Anyone can view avatars (public bucket)
CREATE POLICY "provider_avatar_select" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'provider-avatars');

-- INSERT: Provider can upload their own avatar
-- Path format: {provider_id}/avatar.{ext}
CREATE POLICY "provider_avatar_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'provider-avatars' AND
    EXISTS (
      SELECT 1 FROM providers_v2 p
      WHERE p.user_id = (SELECT auth.uid())
      AND p.id::text = (string_to_array(name, '/'))[1]
    )
  );

-- UPDATE: Provider can update their own avatar
CREATE POLICY "provider_avatar_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'provider-avatars' AND
    EXISTS (
      SELECT 1 FROM providers_v2 p
      WHERE p.user_id = (SELECT auth.uid())
      AND p.id::text = (string_to_array(name, '/'))[1]
    )
  )
  WITH CHECK (
    bucket_id = 'provider-avatars' AND
    EXISTS (
      SELECT 1 FROM providers_v2 p
      WHERE p.user_id = (SELECT auth.uid())
      AND p.id::text = (string_to_array(name, '/'))[1]
    )
  );

-- DELETE: Provider can delete their own avatar
CREATE POLICY "provider_avatar_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'provider-avatars' AND
    EXISTS (
      SELECT 1 FROM providers_v2 p
      WHERE p.user_id = (SELECT auth.uid())
      AND p.id::text = (string_to_array(name, '/'))[1]
    )
  );

-- =====================================================
-- 5. RLS Policies for provider-vehicles bucket
-- =====================================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "provider_vehicle_select" ON storage.objects;
DROP POLICY IF EXISTS "provider_vehicle_insert" ON storage.objects;
DROP POLICY IF EXISTS "provider_vehicle_update" ON storage.objects;
DROP POLICY IF EXISTS "provider_vehicle_delete" ON storage.objects;

-- SELECT: Anyone can view vehicle photos (public bucket)
CREATE POLICY "provider_vehicle_select" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'provider-vehicles');

-- INSERT: Provider can upload their own vehicle photo
-- Path format: {provider_id}/vehicle.{ext}
CREATE POLICY "provider_vehicle_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'provider-vehicles' AND
    EXISTS (
      SELECT 1 FROM providers_v2 p
      WHERE p.user_id = (SELECT auth.uid())
      AND p.id::text = (string_to_array(name, '/'))[1]
    )
  );

-- UPDATE: Provider can update their own vehicle photo
CREATE POLICY "provider_vehicle_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'provider-vehicles' AND
    EXISTS (
      SELECT 1 FROM providers_v2 p
      WHERE p.user_id = (SELECT auth.uid())
      AND p.id::text = (string_to_array(name, '/'))[1]
    )
  )
  WITH CHECK (
    bucket_id = 'provider-vehicles' AND
    EXISTS (
      SELECT 1 FROM providers_v2 p
      WHERE p.user_id = (SELECT auth.uid())
      AND p.id::text = (string_to_array(name, '/'))[1]
    )
  );

-- DELETE: Provider can delete their own vehicle photo
CREATE POLICY "provider_vehicle_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'provider-vehicles' AND
    EXISTS (
      SELECT 1 FROM providers_v2 p
      WHERE p.user_id = (SELECT auth.uid())
      AND p.id::text = (string_to_array(name, '/'))[1]
    )
  );

-- =====================================================
-- 6. Admin policies for both buckets
-- =====================================================

-- Admin can manage all avatars
CREATE POLICY "admin_avatar_all" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'provider-avatars' AND
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = (SELECT auth.uid())
      AND auth.users.raw_user_meta_data->>'role' IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    bucket_id = 'provider-avatars' AND
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = (SELECT auth.uid())
      AND auth.users.raw_user_meta_data->>'role' IN ('admin', 'super_admin')
    )
  );

-- Admin can manage all vehicle photos
CREATE POLICY "admin_vehicle_all" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'provider-vehicles' AND
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = (SELECT auth.uid())
      AND auth.users.raw_user_meta_data->>'role' IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    bucket_id = 'provider-vehicles' AND
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = (SELECT auth.uid())
      AND auth.users.raw_user_meta_data->>'role' IN ('admin', 'super_admin')
    )
  );

-- =====================================================
-- 7. Create indexes for performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_providers_v2_avatar_url 
  ON providers_v2(avatar_url) WHERE avatar_url IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_providers_v2_vehicle_photo_url 
  ON providers_v2(vehicle_photo_url) WHERE vehicle_photo_url IS NOT NULL;

-- =====================================================
-- 8. Verification
-- =====================================================

DO $$
DECLARE
  avatar_bucket_exists BOOLEAN;
  vehicle_bucket_exists BOOLEAN;
BEGIN
  SELECT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'provider-avatars') INTO avatar_bucket_exists;
  SELECT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'provider-vehicles') INTO vehicle_bucket_exists;
  
  IF avatar_bucket_exists AND vehicle_bucket_exists THEN
    RAISE NOTICE '✅ Storage buckets created successfully';
    RAISE NOTICE '  - provider-avatars (2MB, public)';
    RAISE NOTICE '  - provider-vehicles (5MB, public)';
  ELSE
    RAISE WARNING '⚠️ Some buckets may not have been created';
  END IF;
END $$;
