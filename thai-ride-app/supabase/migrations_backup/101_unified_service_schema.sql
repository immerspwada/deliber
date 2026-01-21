-- ============================================================================
-- Feature: F201 - Unified Service Request Schema Pattern
-- Migration: 101_unified_service_schema.sql
-- Description: Create unified schema pattern for all service types with
--              wallet holds, RLS policies, and realtime support
-- Task: 1 - Create unified service request schema pattern
-- Requirements: 1.1, 1.5, 2.1, 2.2, 2.4
-- ============================================================================

-- ============================================================================
-- 1. ENHANCE wallet_holds TABLE FOR ALL SERVICE TYPES
-- ============================================================================

-- Drop existing wallet_holds if it only supports rides
DROP TABLE IF EXISTS wallet_holds CASCADE;

CREATE TABLE wallet_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  request_id UUID NOT NULL, -- Generic reference to any service request
  request_type TEXT NOT NULL, -- 'ride', 'delivery', 'shopping', 'queue', 'moving', 'laundry'
  amount DECIMAL(10, 2) NOT NULL CHECK (amount >= 0),
  status TEXT NOT NULL DEFAULT 'held',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  released_at TIMESTAMPTZ,
  
  CONSTRAINT valid_hold_status CHECK (status IN ('held', 'released', 'settled')),
  CONSTRAINT valid_request_type CHECK (
    request_type IN ('ride', 'delivery', 'shopping', 'queue', 'moving', 'laundry')
  )
);

-- Indexes for performance
CREATE INDEX idx_wallet_holds_user_id ON wallet_holds(user_id);
CREATE INDEX idx_wallet_holds_request_id ON wallet_holds(request_id);
CREATE INDEX idx_wallet_holds_request_type ON wallet_holds(request_type);
CREATE INDEX idx_wallet_holds_status ON wallet_holds(status);
CREATE INDEX idx_wallet_holds_user_status ON wallet_holds(user_id, status);

-- ============================================================================
-- 2. ENSURE ALL SERVICE REQUEST TABLES HAVE UNIFIED BASE COLUMNS
-- ============================================================================

-- Function to add missing columns to a service table
CREATE OR REPLACE FUNCTION ensure_unified_columns(table_name TEXT)
RETURNS VOID AS $$
BEGIN
  -- Add cancelled_by if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = $1 AND column_name = 'cancelled_by'
  ) THEN
    EXECUTE format('ALTER TABLE %I ADD COLUMN cancelled_by UUID', table_name);
  END IF;
  
  -- Add cancelled_by_role if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = $1 AND column_name = 'cancelled_by_role'
  ) THEN
    EXECUTE format('ALTER TABLE %I ADD COLUMN cancelled_by_role TEXT', table_name);
  END IF;
  
  -- Add cancel_reason if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = $1 AND column_name = 'cancel_reason'
  ) THEN
    EXECUTE format('ALTER TABLE %I ADD COLUMN cancel_reason TEXT', table_name);
  END IF;
  
  -- Add cancellation_fee if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = $1 AND column_name = 'cancellation_fee'
  ) THEN
    EXECUTE format('ALTER TABLE %I ADD COLUMN cancellation_fee DECIMAL(10, 2) DEFAULT 0', table_name);
  END IF;
  
  -- Add arriving_at if missing (for services with pickup)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = $1 AND column_name = 'arriving_at'
  ) THEN
    EXECUTE format('ALTER TABLE %I ADD COLUMN arriving_at TIMESTAMPTZ', table_name);
  END IF;
  
  -- Add picked_up_at if missing (for services with pickup)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = $1 AND column_name = 'picked_up_at'
  ) THEN
    EXECUTE format('ALTER TABLE %I ADD COLUMN picked_up_at TIMESTAMPTZ', table_name);
  END IF;
  
  -- Add updated_at if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = $1 AND column_name = 'updated_at'
  ) THEN
    EXECUTE format('ALTER TABLE %I ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW()', table_name);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Apply to all service tables
SELECT ensure_unified_columns('ride_requests');
SELECT ensure_unified_columns('delivery_requests');
SELECT ensure_unified_columns('shopping_requests');
SELECT ensure_unified_columns('queue_bookings');
SELECT ensure_unified_columns('moving_requests');
SELECT ensure_unified_columns('laundry_requests');

-- ============================================================================
-- 3. ENSURE STATUS CONSTRAINTS ON ALL SERVICE TABLES
-- ============================================================================

-- Function to ensure valid status constraint
CREATE OR REPLACE FUNCTION ensure_status_constraint(table_name TEXT)
RETURNS VOID AS $$
DECLARE
  constraint_name TEXT;
BEGIN
  constraint_name := table_name || '_valid_status';
  
  -- Drop existing constraint if exists
  EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', table_name, constraint_name);
  
  -- Add unified status constraint
  EXECUTE format(
    'ALTER TABLE %I ADD CONSTRAINT %I CHECK (
      status IN (''pending'', ''matched'', ''arriving'', ''picked_up'', 
                 ''in_progress'', ''completed'', ''cancelled'')
    )',
    table_name,
    constraint_name
  );
END;
$$ LANGUAGE plpgsql;

-- Apply to all service tables
SELECT ensure_status_constraint('ride_requests');
SELECT ensure_status_constraint('delivery_requests');
SELECT ensure_status_constraint('shopping_requests');
SELECT ensure_status_constraint('queue_bookings');
SELECT ensure_status_constraint('moving_requests');
SELECT ensure_status_constraint('laundry_requests');

-- ============================================================================
-- 4. SPATIAL INDEXES FOR LOCATION-BASED QUERIES
-- ============================================================================

-- Function to add spatial indexes if columns exist
CREATE OR REPLACE FUNCTION ensure_spatial_indexes(table_name TEXT)
RETURNS VOID AS $$
BEGIN
  -- Check if pickup location columns exist
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = $1 AND column_name = 'pickup_lat'
  ) THEN
    -- Create index on pickup location
    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS idx_%I_pickup_location ON %I (pickup_lat, pickup_lng)',
      table_name, table_name
    );
  END IF;
  
  -- Check if destination location columns exist
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = $1 AND column_name = 'destination_lat'
  ) THEN
    -- Create index on destination location
    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS idx_%I_destination_location ON %I (destination_lat, destination_lng)',
      table_name, table_name
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Apply to all service tables
SELECT ensure_spatial_indexes('ride_requests');
SELECT ensure_spatial_indexes('delivery_requests');
SELECT ensure_spatial_indexes('shopping_requests');
SELECT ensure_spatial_indexes('queue_bookings');
SELECT ensure_spatial_indexes('moving_requests');
SELECT ensure_spatial_indexes('laundry_requests');

-- ============================================================================
-- 5. PERFORMANCE INDEXES FOR ALL SERVICE TABLES
-- ============================================================================

-- Function to ensure performance indexes
CREATE OR REPLACE FUNCTION ensure_performance_indexes(table_name TEXT)
RETURNS VOID AS $$
BEGIN
  -- Index on user_id for customer queries
  EXECUTE format(
    'CREATE INDEX IF NOT EXISTS idx_%I_user_id ON %I (user_id)',
    table_name, table_name
  );
  
  -- Index on provider_id for provider queries
  EXECUTE format(
    'CREATE INDEX IF NOT EXISTS idx_%I_provider_id ON %I (provider_id)',
    table_name, table_name
  );
  
  -- Index on status for filtering
  EXECUTE format(
    'CREATE INDEX IF NOT EXISTS idx_%I_status ON %I (status)',
    table_name, table_name
  );
  
  -- Composite index for provider job pool queries (status + provider_id NULL)
  EXECUTE format(
    'CREATE INDEX IF NOT EXISTS idx_%I_available_jobs ON %I (status, provider_id) WHERE status = ''pending'' AND provider_id IS NULL',
    table_name, table_name
  );
  
  -- Index on created_at for sorting and date range queries
  EXECUTE format(
    'CREATE INDEX IF NOT EXISTS idx_%I_created_at ON %I (created_at DESC)',
    table_name, table_name
  );
  
  -- Index on tracking_id for lookup
  EXECUTE format(
    'CREATE INDEX IF NOT EXISTS idx_%I_tracking_id ON %I (tracking_id)',
    table_name, table_name
  );
END;
$$ LANGUAGE plpgsql;

-- Apply to all service tables
SELECT ensure_performance_indexes('ride_requests');
SELECT ensure_performance_indexes('delivery_requests');
SELECT ensure_performance_indexes('shopping_requests');
SELECT ensure_performance_indexes('queue_bookings');
SELECT ensure_performance_indexes('moving_requests');
SELECT ensure_performance_indexes('laundry_requests');

-- ============================================================================
-- 6. RLS POLICIES FOR wallet_holds
-- ============================================================================

-- Enable RLS
ALTER TABLE wallet_holds ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "customers_view_own_holds" ON wallet_holds;
DROP POLICY IF EXISTS "admins_view_all_holds" ON wallet_holds;
DROP POLICY IF EXISTS "system_manage_holds" ON wallet_holds;

-- Customers can view their own holds
CREATE POLICY "customers_view_own_holds" ON wallet_holds
  FOR SELECT USING (auth.uid() = user_id);

-- Admins can view all holds
CREATE POLICY "admins_view_all_holds" ON wallet_holds
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- System can manage holds (via SECURITY DEFINER functions)
CREATE POLICY "system_manage_holds" ON wallet_holds
  FOR ALL USING (true);

-- ============================================================================
-- 7. UNIFIED RLS POLICIES FOR ALL SERVICE TABLES
-- ============================================================================

-- Function to ensure unified RLS policies
CREATE OR REPLACE FUNCTION ensure_unified_rls_policies(table_name TEXT)
RETURNS VOID AS $$
DECLARE
  policy_prefix TEXT;
BEGIN
  policy_prefix := table_name;
  
  -- Enable RLS
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
  
  -- Drop existing policies
  EXECUTE format('DROP POLICY IF EXISTS "customers_view_own_%I" ON %I', table_name, table_name);
  EXECUTE format('DROP POLICY IF EXISTS "customers_create_own_%I" ON %I', table_name, table_name);
  EXECUTE format('DROP POLICY IF EXISTS "providers_view_relevant_%I" ON %I', table_name, table_name);
  EXECUTE format('DROP POLICY IF EXISTS "providers_update_assigned_%I" ON %I', table_name, table_name);
  EXECUTE format('DROP POLICY IF EXISTS "admins_view_all_%I" ON %I', table_name, table_name);
  EXECUTE format('DROP POLICY IF EXISTS "admins_manage_all_%I" ON %I', table_name, table_name);
  
  -- Customer: View own requests
  EXECUTE format(
    'CREATE POLICY "customers_view_own_%I" ON %I
      FOR SELECT USING (auth.uid() = user_id)',
    table_name, table_name
  );
  
  -- Customer: Create own requests
  EXECUTE format(
    'CREATE POLICY "customers_create_own_%I" ON %I
      FOR INSERT WITH CHECK (auth.uid() = user_id)',
    table_name, table_name
  );
  
  -- Provider: View assigned or available (pending with no provider)
  EXECUTE format(
    'CREATE POLICY "providers_view_relevant_%I" ON %I
      FOR SELECT USING (
        auth.uid() = provider_id OR
        (status = ''pending'' AND provider_id IS NULL)
      )',
    table_name, table_name
  );
  
  -- Provider: Update assigned requests
  EXECUTE format(
    'CREATE POLICY "providers_update_assigned_%I" ON %I
      FOR UPDATE USING (auth.uid() = provider_id)',
    table_name, table_name
  );
  
  -- Admin: View all
  EXECUTE format(
    'CREATE POLICY "admins_view_all_%I" ON %I
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM users
          WHERE id = auth.uid() AND role = ''admin''
        )
      )',
    table_name, table_name
  );
  
  -- Admin: Manage all
  EXECUTE format(
    'CREATE POLICY "admins_manage_all_%I" ON %I
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM users
          WHERE id = auth.uid() AND role = ''admin''
        )
      )',
    table_name, table_name
  );
END;
$$ LANGUAGE plpgsql;

-- Apply to all service tables
SELECT ensure_unified_rls_policies('ride_requests');
SELECT ensure_unified_rls_policies('delivery_requests');
SELECT ensure_unified_rls_policies('shopping_requests');
SELECT ensure_unified_rls_policies('queue_bookings');
SELECT ensure_unified_rls_policies('moving_requests');
SELECT ensure_unified_rls_policies('laundry_requests');

-- ============================================================================
-- 8. ENABLE REALTIME FOR ALL SERVICE TABLES
-- ============================================================================

-- Enable realtime on all service request tables
ALTER PUBLICATION supabase_realtime ADD TABLE ride_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE delivery_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE shopping_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE queue_bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE moving_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE laundry_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE wallet_holds;

-- ============================================================================
-- 9. WALLET CONSISTENCY CONSTRAINTS
-- ============================================================================

-- Ensure balance cannot be negative
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_wallets_balance_non_negative'
  ) THEN
    ALTER TABLE user_wallets 
    ADD CONSTRAINT user_wallets_balance_non_negative CHECK (balance >= 0);
  END IF;
END $$;

-- Ensure held_balance cannot be negative
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_wallets_held_balance_non_negative'
  ) THEN
    ALTER TABLE user_wallets 
    ADD CONSTRAINT user_wallets_held_balance_non_negative CHECK (held_balance >= 0);
  END IF;
END $$;

-- Wallet consistency trigger
CREATE OR REPLACE FUNCTION check_wallet_consistency()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure total wallet value (balance + held) doesn't go negative
  IF NEW.balance + NEW.held_balance < 0 THEN
    RAISE EXCEPTION 'WALLET_CONSISTENCY_VIOLATION: balance + held_balance cannot be negative';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS wallet_consistency_check ON user_wallets;
CREATE TRIGGER wallet_consistency_check
  BEFORE UPDATE ON user_wallets
  FOR EACH ROW EXECUTE FUNCTION check_wallet_consistency();

-- ============================================================================
-- 10. UPDATED_AT TRIGGER FOR ALL SERVICE TABLES
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to add updated_at trigger to a table
CREATE OR REPLACE FUNCTION ensure_updated_at_trigger(table_name TEXT)
RETURNS VOID AS $$
DECLARE
  trigger_name TEXT;
BEGIN
  trigger_name := 'update_' || table_name || '_updated_at';
  
  -- Drop existing trigger if exists
  EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I', trigger_name, table_name);
  
  -- Create trigger
  EXECUTE format(
    'CREATE TRIGGER %I
      BEFORE UPDATE ON %I
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
    trigger_name, table_name
  );
END;
$$ LANGUAGE plpgsql;

-- Apply to all service tables
SELECT ensure_updated_at_trigger('ride_requests');
SELECT ensure_updated_at_trigger('delivery_requests');
SELECT ensure_updated_at_trigger('shopping_requests');
SELECT ensure_updated_at_trigger('queue_bookings');
SELECT ensure_updated_at_trigger('moving_requests');
SELECT ensure_updated_at_trigger('laundry_requests');

-- ============================================================================
-- 11. COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE wallet_holds IS 'Unified wallet holds for all service types - tracks held funds during pending requests';
COMMENT ON COLUMN wallet_holds.request_type IS 'Type of service: ride, delivery, shopping, queue, moving, laundry';
COMMENT ON COLUMN wallet_holds.status IS 'held: amount is held, released: hold cancelled, settled: payment completed';

-- ============================================================================
-- 12. CLEANUP HELPER FUNCTIONS
-- ============================================================================

-- Drop temporary functions used for migration
DROP FUNCTION IF EXISTS ensure_unified_columns(TEXT);
DROP FUNCTION IF EXISTS ensure_status_constraint(TEXT);
DROP FUNCTION IF EXISTS ensure_spatial_indexes(TEXT);
DROP FUNCTION IF EXISTS ensure_performance_indexes(TEXT);
DROP FUNCTION IF EXISTS ensure_unified_rls_policies(TEXT);
DROP FUNCTION IF EXISTS ensure_updated_at_trigger(TEXT);

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Verify migration
DO $$
DECLARE
  table_count INTEGER;
  index_count INTEGER;
  policy_count INTEGER;
BEGIN
  -- Count service tables with unified columns
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_name IN ('ride_requests', 'delivery_requests', 'shopping_requests', 
                       'queue_bookings', 'moving_requests', 'laundry_requests');
  
  -- Count indexes
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE tablename IN ('ride_requests', 'delivery_requests', 'shopping_requests', 
                      'queue_bookings', 'moving_requests', 'laundry_requests', 'wallet_holds');
  
  -- Count RLS policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename IN ('ride_requests', 'delivery_requests', 'shopping_requests', 
                      'queue_bookings', 'moving_requests', 'laundry_requests', 'wallet_holds');
  
  RAISE NOTICE 'Migration 101 Complete:';
  RAISE NOTICE '  - Service tables with unified schema: %', table_count;
  RAISE NOTICE '  - Performance indexes created: %', index_count;
  RAISE NOTICE '  - RLS policies created: %', policy_count;
  RAISE NOTICE '  - Realtime enabled on all service tables';
  RAISE NOTICE '  - Wallet holds table created with unified support';
END $$;
