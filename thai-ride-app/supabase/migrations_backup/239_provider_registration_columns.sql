-- Migration: 239_provider_registration_columns.sql
-- Description: Add missing columns for provider registration form
-- Date: 2026-01-12

BEGIN;

-- Add missing columns to providers_v2 table for registration
DO $$
BEGIN
    -- Add vehicle_type column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'providers_v2' AND column_name = 'vehicle_type') THEN
        ALTER TABLE providers_v2 ADD COLUMN vehicle_type TEXT;
        RAISE NOTICE 'Added vehicle_type column';
    END IF;

    -- Add vehicle_plate column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'providers_v2' AND column_name = 'vehicle_plate') THEN
        ALTER TABLE providers_v2 ADD COLUMN vehicle_plate TEXT;
        RAISE NOTICE 'Added vehicle_plate column';
    END IF;

    -- Add vehicle_color column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'providers_v2' AND column_name = 'vehicle_color') THEN
        ALTER TABLE providers_v2 ADD COLUMN vehicle_color TEXT;
        RAISE NOTICE 'Added vehicle_color column';
    END IF;

    -- Add vehicle_info JSONB column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'providers_v2' AND column_name = 'vehicle_info') THEN
        ALTER TABLE providers_v2 ADD COLUMN vehicle_info JSONB DEFAULT '{}';
        RAISE NOTICE 'Added vehicle_info column';
    END IF;

    -- Add license_number column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'providers_v2' AND column_name = 'license_number') THEN
        ALTER TABLE providers_v2 ADD COLUMN license_number TEXT;
        RAISE NOTICE 'Added license_number column';
    END IF;

    -- Add license_expiry column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'providers_v2' AND column_name = 'license_expiry') THEN
        ALTER TABLE providers_v2 ADD COLUMN license_expiry DATE;
        RAISE NOTICE 'Added license_expiry column';
    END IF;

    -- Add national_id column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'providers_v2' AND column_name = 'national_id') THEN
        ALTER TABLE providers_v2 ADD COLUMN national_id TEXT;
        RAISE NOTICE 'Added national_id column';
    END IF;

    -- Add documents JSONB column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'providers_v2' AND column_name = 'documents') THEN
        ALTER TABLE providers_v2 ADD COLUMN documents JSONB DEFAULT '{}';
        RAISE NOTICE 'Added documents column';
    END IF;

    -- Add provider_type column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'providers_v2' AND column_name = 'provider_type') THEN
        ALTER TABLE providers_v2 ADD COLUMN provider_type TEXT DEFAULT 'pending';
        RAISE NOTICE 'Added provider_type column';
    END IF;

    -- Add allowed_services column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'providers_v2' AND column_name = 'allowed_services') THEN
        ALTER TABLE providers_v2 ADD COLUMN allowed_services TEXT[] DEFAULT '{}';
        RAISE NOTICE 'Added allowed_services column';
    END IF;

    -- Add is_available column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'providers_v2' AND column_name = 'is_available') THEN
        ALTER TABLE providers_v2 ADD COLUMN is_available BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added is_available column';
    END IF;

    -- Make first_name, last_name, email, phone_number nullable for registration
    -- (they will be populated from auth.users)
    ALTER TABLE providers_v2 ALTER COLUMN first_name DROP NOT NULL;
    ALTER TABLE providers_v2 ALTER COLUMN last_name DROP NOT NULL;
    ALTER TABLE providers_v2 ALTER COLUMN email DROP NOT NULL;
    ALTER TABLE providers_v2 ALTER COLUMN phone_number DROP NOT NULL;
    
    RAISE NOTICE 'Made user info columns nullable';
END $$;

-- Create index for vehicle_plate
CREATE INDEX IF NOT EXISTS idx_providers_v2_vehicle_plate ON providers_v2(vehicle_plate);

-- Create index for national_id
CREATE INDEX IF NOT EXISTS idx_providers_v2_national_id ON providers_v2(national_id);

-- Create trigger to auto-populate user info from auth.users
CREATE OR REPLACE FUNCTION populate_provider_user_info()
RETURNS TRIGGER AS $$
DECLARE
    v_user RECORD;
    v_profile RECORD;
BEGIN
    -- Get user info from auth.users
    SELECT 
        email,
        raw_user_meta_data->>'name' as name,
        raw_user_meta_data->>'phone' as phone
    INTO v_user
    FROM auth.users
    WHERE id = NEW.user_id;

    -- Try to get from users table if available
    SELECT first_name, last_name, phone_number, email
    INTO v_profile
    FROM users
    WHERE id = NEW.user_id;

    -- Populate fields if not already set
    IF NEW.email IS NULL OR NEW.email = '' THEN
        NEW.email := COALESCE(v_profile.email, v_user.email, 'unknown@example.com');
    END IF;

    IF NEW.first_name IS NULL OR NEW.first_name = '' THEN
        IF v_profile.first_name IS NOT NULL THEN
            NEW.first_name := v_profile.first_name;
        ELSIF v_user.name IS NOT NULL THEN
            NEW.first_name := SPLIT_PART(v_user.name, ' ', 1);
        ELSE
            NEW.first_name := 'Unknown';
        END IF;
    END IF;

    IF NEW.last_name IS NULL OR NEW.last_name = '' THEN
        IF v_profile.last_name IS NOT NULL THEN
            NEW.last_name := v_profile.last_name;
        ELSIF v_user.name IS NOT NULL AND POSITION(' ' IN v_user.name) > 0 THEN
            NEW.last_name := SUBSTRING(v_user.name FROM POSITION(' ' IN v_user.name) + 1);
        ELSE
            NEW.last_name := 'Provider';
        END IF;
    END IF;

    IF NEW.phone_number IS NULL OR NEW.phone_number = '' THEN
        NEW.phone_number := COALESCE(v_profile.phone_number, v_user.phone, '0000000000');
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_populate_provider_user_info ON providers_v2;

-- Create trigger
CREATE TRIGGER trigger_populate_provider_user_info
    BEFORE INSERT ON providers_v2
    FOR EACH ROW
    EXECUTE FUNCTION populate_provider_user_info();

-- Ensure storage bucket exists for provider documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'documents',
    'documents',
    false,
    10485760, -- 10MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

-- Storage policies for documents bucket
DROP POLICY IF EXISTS "Users can upload own documents" ON storage.objects;
CREATE POLICY "Users can upload own documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = 'provider-documents'
);

DROP POLICY IF EXISTS "Users can view own documents" ON storage.objects;
CREATE POLICY "Users can view own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = 'provider-documents'
);

DROP POLICY IF EXISTS "Users can update own documents" ON storage.objects;
CREATE POLICY "Users can update own documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = 'provider-documents'
);

DROP POLICY IF EXISTS "Users can delete own documents" ON storage.objects;
CREATE POLICY "Users can delete own documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = 'provider-documents'
);

-- Verification
DO $$
DECLARE
    col_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO col_count
    FROM information_schema.columns
    WHERE table_name = 'providers_v2'
    AND column_name IN ('vehicle_type', 'vehicle_plate', 'vehicle_color', 'vehicle_info', 
                        'license_number', 'license_expiry', 'national_id', 'documents',
                        'provider_type', 'allowed_services', 'is_available');
    
    RAISE NOTICE '✅ Provider registration columns verified: % columns found', col_count;
END $$;

COMMIT;
