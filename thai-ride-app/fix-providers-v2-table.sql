-- ============================================================================
-- Fix Missing providers_v2 Table
-- ============================================================================

-- Check if providers_v2 table exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'providers_v2') THEN
        RAISE NOTICE 'providers_v2 table does not exist, creating it...';
        
        -- Create enum types if they don't exist
        DO $ BEGIN
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
        END $;

        DO $ BEGIN
          CREATE TYPE service_type AS ENUM (
            'ride',
            'delivery',
            'shopping',
            'moving',
            'laundry'
          );
        EXCEPTION
          WHEN duplicate_object THEN NULL;
        END $;

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

        -- Create updated_at trigger
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $func$
        BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
        END;
        $func$ LANGUAGE plpgsql;

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
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'service_providers') 
       AND EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'providers_v2')
       AND NOT EXISTS (SELECT 1 FROM providers_v2 LIMIT 1) THEN
        
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
            user_id,
            COALESCE(first_name, 'Unknown'),
            COALESCE(last_name, 'Provider'),
            COALESCE(email, users.email, 'unknown@example.com'),
            COALESCE(phone_number, '0000000000'),
            CASE 
                WHEN status = 'approved' THEN 'approved'::provider_status
                WHEN status = 'pending' THEN 'pending'::provider_status
                WHEN status = 'rejected' THEN 'rejected'::provider_status
                ELSE 'pending'::provider_status
            END,
            CASE 
                WHEN provider_type = 'rider' THEN ARRAY['ride']::service_type[]
                WHEN provider_type = 'driver' THEN ARRAY['ride']::service_type[]
                ELSE ARRAY['ride']::service_type[]
            END,
            created_at,
            updated_at,
            approved_at
        FROM service_providers sp
        LEFT JOIN users ON users.id = sp.user_id
        ON CONFLICT (user_id) DO NOTHING;
        
        RAISE NOTICE 'Data migration completed!';
    END IF;
END $$;

-- Create helper function to check if user is provider
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

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON providers_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION is_user_provider(UUID) TO authenticated;

SELECT 'providers_v2 table setup completed!' as result;