-- ============================================================================
-- Fix Missing providers_v2 Table - Migration 231
-- ============================================================================

-- Check if providers_v2 table exists, if not create it
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'providers_v2') THEN
        RAISE NOTICE 'providers_v2 table does not exist, creating it...';
        
        -- Create enum types if they don't exist
        DO $enum$ BEGIN
          CREATE TYPE provider_status AS ENUM (
            'pending',
            'pending_verification',
            'approved',
            'active',
            'suspended',
            'rejected'
          );
        EXCEPTION
          WHEN duplicate_object THEN NULL;
        END $enum$;

        DO $enum$ BEGIN
          CREATE TYPE service_type AS ENUM (
            'ride',
            'delivery',
            'shopping',
            'moving',
            'laundry'
          );
        EXCEPTION
          WHEN duplicate_object THEN NULL;
        END $enum$;

        -- Create providers_v2 table
        CREATE TABLE providers_v2 (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
          provider_uid TEXT UNIQUE,
          first_name TEXT NOT NULL,
          last_name TEXT NOT NULL,
          email TEXT NOT NULL,
          phone_number TEXT NOT NULL,
          status provider_status NOT NULL DEFAULT 'pending',
          service_types service_type[] NOT NULL DEFAULT '{}',
          is_online BOOLEAN DEFAULT FALSE,
          current_location GEOGRAPHY(POINT),
          rating DECIMAL(3,2) DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
          total_trips INTEGER DEFAULT 0 CHECK (total_trips >= 0),
          total_earnings DECIMAL(10,2) DEFAULT 0 CHECK (total_earnings >= 0),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          approved_at TIMESTAMPTZ,
          suspended_at TIMESTAMPTZ,
          suspension_reason TEXT,
          CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
          CONSTRAINT valid_phone CHECK (phone_number ~* '^\d{10}$')
        );

        -- Create indexes
        CREATE INDEX idx_providers_v2_user_id ON providers_v2(user_id);
        CREATE INDEX idx_providers_v2_status ON providers_v2(status);
        CREATE INDEX idx_providers_v2_provider_uid ON providers_v2(provider_uid);
        CREATE INDEX idx_providers_v2_online ON providers_v2(is_online) WHERE is_online = TRUE;

        -- Enable RLS
        ALTER TABLE providers_v2 ENABLE ROW LEVEL SECURITY;

        -- Create RLS policies
        CREATE POLICY "Providers can view own profile"
          ON providers_v2 FOR SELECT
          USING (auth.uid() = user_id);

        CREATE POLICY "Providers can update own profile"
          ON providers_v2 FOR UPDATE
          USING (auth.uid() = user_id);

        CREATE POLICY "Anyone can insert provider (registration)"
          ON providers_v2 FOR INSERT
          WITH CHECK (auth.uid() = user_id);

        -- Admin policies (check both role column and metadata)
        CREATE POLICY "Admins can view all providers"
          ON providers_v2 FOR SELECT
          USING (
            EXISTS (
              SELECT 1 FROM users
              WHERE users.id = auth.uid()
              AND users.role IN ('admin', 'super_admin')
            )
            OR
            EXISTS (
              SELECT 1 FROM auth.users
              WHERE auth.users.id = auth.uid()
              AND auth.users.raw_user_meta_data->>'role' IN ('admin', 'super_admin')
            )
          );

        CREATE POLICY "Admins can update all providers"
          ON providers_v2 FOR UPDATE
          USING (
            EXISTS (
              SELECT 1 FROM users
              WHERE users.id = auth.uid()
              AND users.role IN ('admin', 'super_admin')
            )
            OR
            EXISTS (
              SELECT 1 FROM auth.users
              WHERE auth.users.id = auth.uid()
              AND auth.users.raw_user_meta_data->>'role' IN ('admin', 'super_admin')
            )
          );

        -- Create updated_at trigger function if not exists
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $func$
        BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
        END;
        $func$ LANGUAGE plpgsql;

        -- Create trigger
        CREATE TRIGGER update_providers_v2_updated_at
          BEFORE UPDATE ON providers_v2
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();

        RAISE NOTICE 'providers_v2 table created successfully!';
    ELSE
        RAISE NOTICE 'providers_v2 table already exists';
    END IF;
END $$;

-- Migrate existing data from service_providers if it exists and providers_v2 is empty
DO $$
DECLARE
    migration_count INTEGER := 0;
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'service_providers') 
       AND EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'providers_v2') THEN
        
        -- Check if providers_v2 is empty
        SELECT COUNT(*) INTO migration_count FROM providers_v2;
        
        IF migration_count = 0 THEN
            RAISE NOTICE 'Migrating data from service_providers to providers_v2...';
            
            INSERT INTO providers_v2 (
                user_id,
                first_name,
                last_name,
                email,
                phone_number,
                status,
                service_types,
                created_at,
                updated_at,
                approved_at
            )
            SELECT 
                sp.user_id,
                COALESCE(sp.first_name, u.first_name, 'Unknown'),
                COALESCE(sp.last_name, u.last_name, 'Provider'),
                COALESCE(sp.email, u.email, 'unknown@example.com'),
                COALESCE(sp.phone_number, u.phone_number, '0000000000'),
                CASE 
                    WHEN sp.status = 'approved' THEN 'approved'::provider_status
                    WHEN sp.status = 'pending' THEN 'pending'::provider_status
                    WHEN sp.status = 'rejected' THEN 'rejected'::provider_status
                    ELSE 'pending'::provider_status
                END,
                CASE 
                    WHEN sp.provider_type = 'rider' THEN ARRAY['ride']::service_type[]
                    WHEN sp.provider_type = 'driver' THEN ARRAY['ride']::service_type[]
                    ELSE ARRAY['ride']::service_type[]
                END,
                sp.created_at,
                sp.updated_at,
                sp.approved_at
            FROM service_providers sp
            LEFT JOIN users u ON u.id = sp.user_id
            ON CONFLICT (user_id) DO NOTHING;
            
            GET DIAGNOSTICS migration_count = ROW_COUNT;
            RAISE NOTICE 'Data migration completed! Migrated % records', migration_count;
        ELSE
            RAISE NOTICE 'providers_v2 already has data (% records), skipping migration', migration_count;
        END IF;
    END IF;
END $$;

-- Create helper functions
CREATE OR REPLACE FUNCTION is_user_provider(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM providers_v2 
        WHERE user_id = user_uuid 
        AND status IN ('approved', 'active')
    );
END;
$$;

-- Create function to get provider by user_id
CREATE OR REPLACE FUNCTION get_provider_by_user_id(user_uuid UUID)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    provider_uid TEXT,
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    phone_number TEXT,
    status provider_status,
    service_types service_type[],
    is_online BOOLEAN,
    rating DECIMAL,
    total_trips INTEGER,
    total_earnings DECIMAL,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.user_id,
        p.provider_uid,
        p.first_name,
        p.last_name,
        p.email,
        p.phone_number,
        p.status,
        p.service_types,
        p.is_online,
        p.rating,
        p.total_trips,
        p.total_earnings,
        p.created_at,
        p.updated_at,
        p.approved_at
    FROM providers_v2 p
    WHERE p.user_id = user_uuid;
END;
$$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON providers_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION is_user_provider(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_provider_by_user_id(UUID) TO authenticated;

-- Add comment
COMMENT ON TABLE providers_v2 IS 'Provider system v2 - Multi-service provider management';

-- Final verification
DO $$
DECLARE
    table_exists BOOLEAN;
    record_count INTEGER;
BEGIN
    -- Check if table exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'providers_v2'
    ) INTO table_exists;
    
    IF table_exists THEN
        SELECT COUNT(*) INTO record_count FROM providers_v2;
        RAISE NOTICE '✅ providers_v2 table setup completed successfully!';
        RAISE NOTICE '📊 Current record count: %', record_count;
    ELSE
        RAISE EXCEPTION '❌ Failed to create providers_v2 table';
    END IF;
END $$;