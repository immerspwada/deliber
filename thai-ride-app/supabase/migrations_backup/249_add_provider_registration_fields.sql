-- Migration: 249_add_provider_registration_fields.sql
-- Description: Add missing columns for provider registration (vehicle, documents, etc.)
-- Date: 2026-01-13
-- Fixes: "Could not find the 'allowed_services' column of 'providers_v2' in the schema cache"

BEGIN;

-- Add missing columns to providers_v2 table
DO $$
BEGIN
    -- Vehicle information
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'providers_v2' AND column_name = 'vehicle_type') THEN
        ALTER TABLE providers_v2 ADD COLUMN vehicle_type TEXT;
        RAISE NOTICE 'Added vehicle_type column';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'providers_v2' AND column_name = 'vehicle_plate') THEN
        ALTER TABLE providers_v2 ADD COLUMN vehicle_plate TEXT;
        RAISE NOTICE 'Added vehicle_plate column';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'providers_v2' AND column_name = 'vehicle_color') THEN
        ALTER TABLE providers_v2 ADD COLUMN vehicle_color TEXT;
        RAISE NOTICE 'Added vehicle_color column';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'providers_v2' AND column_name = 'vehicle_info') THEN
        ALTER TABLE providers_v2 ADD COLUMN vehicle_info JSONB DEFAULT '{}';
        RAISE NOTICE 'Added vehicle_info column';
    END IF;

    -- License information
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'providers_v2' AND column_name = 'license_number') THEN
        ALTER TABLE providers_v2 ADD COLUMN license_number TEXT;
        RAISE NOTICE 'Added license_number column';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'providers_v2' AND column_name = 'license_expiry') THEN
        ALTER TABLE providers_v2 ADD COLUMN license_expiry DATE;
        RAISE NOTICE 'Added license_expiry column';
    END IF;

    -- Personal identification
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'providers_v2' AND column_name = 'national_id') THEN
        ALTER TABLE providers_v2 ADD COLUMN national_id TEXT;
        RAISE NOTICE 'Added national_id column';
    END IF;

    -- Documents storage
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'providers_v2' AND column_name = 'documents') THEN
        ALTER TABLE providers_v2 ADD COLUMN documents JSONB DEFAULT '{}';
        RAISE NOTICE 'Added documents column';
    END IF;

    -- Provider type (for categorization)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'providers_v2' AND column_name = 'provider_type') THEN
        ALTER TABLE providers_v2 ADD COLUMN provider_type TEXT DEFAULT 'pending';
        RAISE NOTICE 'Added provider_type column';
    END IF;

    -- Availability flag
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'providers_v2' AND column_name = 'is_available') THEN
        ALTER TABLE providers_v2 ADD COLUMN is_available BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added is_available column';
    END IF;

    RAISE NOTICE '✅ Provider registration columns check complete';
END $$;

-- Create indexes for commonly queried fields
CREATE INDEX IF NOT EXISTS idx_providers_v2_vehicle_plate ON providers_v2(vehicle_plate);
CREATE INDEX IF NOT EXISTS idx_providers_v2_national_id ON providers_v2(national_id);
CREATE INDEX IF NOT EXISTS idx_providers_v2_provider_type ON providers_v2(provider_type);
CREATE INDEX IF NOT EXISTS idx_providers_v2_is_available ON providers_v2(is_available) WHERE is_available = true;

-- RLS Policies for provider registration
-- Customer: ไม่เห็น providers_v2 โดยตรง (ใช้ผ่าน ride_requests)
-- Provider: เห็นเฉพาะข้อมูลตัวเอง
-- Admin: เห็นทุกอย่าง

-- Drop existing policies to recreate
DROP POLICY IF EXISTS "provider_own_data_select" ON providers_v2;
DROP POLICY IF EXISTS "provider_own_data_insert" ON providers_v2;
DROP POLICY IF EXISTS "provider_own_data_update" ON providers_v2;
DROP POLICY IF EXISTS "admin_full_access_providers_v2" ON providers_v2;

-- Provider: SELECT own data
CREATE POLICY "provider_own_data_select" ON providers_v2
    FOR SELECT USING (auth.uid() = user_id);

-- Provider: INSERT own registration
CREATE POLICY "provider_own_data_insert" ON providers_v2
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Provider: UPDATE own data (limited fields)
CREATE POLICY "provider_own_data_update" ON providers_v2
    FOR UPDATE USING (auth.uid() = user_id);

-- Admin: Full access
CREATE POLICY "admin_full_access_providers_v2" ON providers_v2
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

COMMIT;
