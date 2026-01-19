-- ============================================================================
-- Provider System Redesign - Database Schema
-- Migration: 218
-- Description: Complete provider system redesign with multi-service support
-- ============================================================================

-- ============================================================================
-- PART 1: ENUM TYPES
-- ============================================================================

-- Provider status enum
DO $$ BEGIN
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
END $$;

-- Service type enum (extend existing if needed)
DO $$ BEGIN
  CREATE TYPE service_type AS ENUM (
    'ride',
    'delivery',
    'shopping',
    'moving',
    'laundry'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Document type enum
DO $$ BEGIN
  CREATE TYPE document_type AS ENUM (
    'national_id',
    'driver_license',
    'vehicle_registration',
    'vehicle_insurance',
    'bank_account',
    'criminal_record',
    'health_certificate'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Document status enum
DO $$ BEGIN
  CREATE TYPE document_status AS ENUM (
    'pending',
    'approved',
    'rejected',
    'expired'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Job status enum
DO $$ BEGIN
  CREATE TYPE job_status AS ENUM (
    'pending',
    'offered',
    'accepted',
    'arrived',
    'in_progress',
    'completed',
    'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Withdrawal status enum
DO $$ BEGIN
  CREATE TYPE withdrawal_status AS ENUM (
    'pending',
    'processing',
    'completed',
    'failed',
    'rejected'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Notification type enum (extend existing)
DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM (
    'job_available',
    'job_accepted',
    'application_approved',
    'application_rejected',
    'document_expiring',
    'withdrawal_completed',
    'rating_received',
    'account_suspended',
    'general'
  );
EXCEPTION
  WHEN duplicate_object THEN 
    -- Add new values to existing enum
    ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'job_available';
    ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'job_accepted';
    ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'application_approved';
    ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'application_rejected';
    ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'document_expiring';
    ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'withdrawal_completed';
    ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'rating_received';
    ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'account_suspended';
END $$;

-- ============================================================================
-- PART 2: CORE TABLES
-- ============================================================================

-- Providers table (redesigned)
CREATE TABLE IF NOT EXISTS providers_v2 (
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

-- Provider documents table
CREATE TABLE IF NOT EXISTS provider_documents_v2 (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID REFERENCES providers_v2(id) ON DELETE CASCADE NOT NULL,
  document_type document_type NOT NULL,
  storage_path TEXT NOT NULL,
  status document_status DEFAULT 'pending',
  expiry_date DATE,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES auth.users(id),
  rejection_reason TEXT,
  CONSTRAINT unique_provider_document UNIQUE(provider_id, document_type)
);

-- Provider vehicles table
CREATE TABLE IF NOT EXISTS provider_vehicles_v2 (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID REFERENCES providers_v2(id) ON DELETE CASCADE NOT NULL,
  vehicle_type TEXT NOT NULL,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER NOT NULL CHECK (year >= 1900 AND year <= EXTRACT(YEAR FROM NOW()) + 1),
  plate_number TEXT NOT NULL,
  color TEXT NOT NULL,
  status document_status DEFAULT 'pending',
  is_active BOOLEAN DEFAULT FALSE,
  registration_expiry DATE NOT NULL,
  insurance_expiry DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES auth.users(id),
  CONSTRAINT unique_plate_number UNIQUE(plate_number)
);

-- Jobs table (redesigned for multi-service)
CREATE TABLE IF NOT EXISTS jobs_v2 (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID, -- References various order tables
  service_type service_type NOT NULL,
  status job_status DEFAULT 'pending',
  provider_id UUID REFERENCES providers_v2(id),
  customer_id UUID REFERENCES auth.users(id) NOT NULL,
  
  -- Location data
  pickup_location GEOGRAPHY(POINT) NOT NULL,
  pickup_address TEXT NOT NULL,
  dropoff_location GEOGRAPHY(POINT),
  dropoff_address TEXT,
  
  -- Pricing
  base_fare DECIMAL(10,2) NOT NULL CHECK (base_fare >= 0),
  distance_fare DECIMAL(10,2) DEFAULT 0 CHECK (distance_fare >= 0),
  time_fare DECIMAL(10,2) DEFAULT 0 CHECK (time_fare >= 0),
  surge_multiplier DECIMAL(3,2) DEFAULT 1.0 CHECK (surge_multiplier >= 1.0),
  estimated_earnings DECIMAL(10,2) NOT NULL CHECK (estimated_earnings >= 0),
  actual_earnings DECIMAL(10,2) CHECK (actual_earnings >= 0),
  tip_amount DECIMAL(10,2) DEFAULT 0 CHECK (tip_amount >= 0),
  
  -- Timing
  created_at TIMESTAMPTZ DEFAULT NOW(),
  offered_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  arrived_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  
  -- Metadata
  distance_km DECIMAL(10,2) CHECK (distance_km >= 0),
  duration_minutes INTEGER CHECK (duration_minutes >= 0),
  cancellation_reason TEXT,
  cancelled_by TEXT CHECK (cancelled_by IN ('provider', 'customer', 'system')),
  
  -- Provider location tracking
  provider_location GEOGRAPHY(POINT)
);

-- Earnings table
CREATE TABLE IF NOT EXISTS earnings_v2 (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID REFERENCES providers_v2(id) ON DELETE CASCADE NOT NULL,
  job_id UUID REFERENCES jobs_v2(id) ON DELETE CASCADE NOT NULL,
  
  -- Earnings breakdown
  base_fare DECIMAL(10,2) NOT NULL CHECK (base_fare >= 0),
  distance_fare DECIMAL(10,2) DEFAULT 0 CHECK (distance_fare >= 0),
  time_fare DECIMAL(10,2) DEFAULT 0 CHECK (time_fare >= 0),
  surge_amount DECIMAL(10,2) DEFAULT 0 CHECK (surge_amount >= 0),
  tip_amount DECIMAL(10,2) DEFAULT 0 CHECK (tip_amount >= 0),
  bonus_amount DECIMAL(10,2) DEFAULT 0 CHECK (bonus_amount >= 0),
  
  -- Totals
  gross_earnings DECIMAL(10,2) NOT NULL CHECK (gross_earnings >= 0),
  platform_fee DECIMAL(10,2) NOT NULL CHECK (platform_fee >= 0),
  net_earnings DECIMAL(10,2) NOT NULL CHECK (net_earnings >= 0),
  
  -- Metadata
  service_type service_type NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  paid_out BOOLEAN DEFAULT FALSE,
  payout_id UUID,
  
  CONSTRAINT unique_job_earning UNIQUE(job_id)
);

-- Withdrawals table
CREATE TABLE IF NOT EXISTS withdrawals_v2 (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID REFERENCES providers_v2(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount >= 100),
  status withdrawal_status DEFAULT 'pending',
  bank_account_id UUID, -- References bank accounts table
  
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  processed_by UUID REFERENCES auth.users(id),
  
  transaction_id TEXT,
  rejection_reason TEXT
);

-- Notifications table (if not exists)
CREATE TABLE IF NOT EXISTS notifications_v2 (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  
  sent_push BOOLEAN DEFAULT FALSE,
  sent_email BOOLEAN DEFAULT FALSE,
  sent_sms BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PART 3: INDEXES
-- ============================================================================

-- Providers indexes
CREATE INDEX IF NOT EXISTS idx_providers_v2_user_id ON providers_v2(user_id);
CREATE INDEX IF NOT EXISTS idx_providers_v2_status ON providers_v2(status);
CREATE INDEX IF NOT EXISTS idx_providers_v2_provider_uid ON providers_v2(provider_uid);
CREATE INDEX IF NOT EXISTS idx_providers_v2_online ON providers_v2(is_online) WHERE is_online = TRUE;
CREATE INDEX IF NOT EXISTS idx_providers_v2_location ON providers_v2 USING GIST(current_location) WHERE is_online = TRUE;

-- Documents indexes
CREATE INDEX IF NOT EXISTS idx_provider_documents_v2_provider ON provider_documents_v2(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_documents_v2_status ON provider_documents_v2(status);
CREATE INDEX IF NOT EXISTS idx_provider_documents_v2_expiry ON provider_documents_v2(expiry_date) WHERE status = 'approved';

-- Vehicles indexes
CREATE INDEX IF NOT EXISTS idx_provider_vehicles_v2_provider ON provider_vehicles_v2(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_vehicles_v2_active ON provider_vehicles_v2(provider_id, is_active) WHERE is_active = TRUE;

-- Jobs indexes
CREATE INDEX IF NOT EXISTS idx_jobs_v2_status ON jobs_v2(status);
CREATE INDEX IF NOT EXISTS idx_jobs_v2_provider ON jobs_v2(provider_id);
CREATE INDEX IF NOT EXISTS idx_jobs_v2_customer ON jobs_v2(customer_id);
CREATE INDEX IF NOT EXISTS idx_jobs_v2_service_type ON jobs_v2(service_type);
CREATE INDEX IF NOT EXISTS idx_jobs_v2_pickup_location ON jobs_v2 USING GIST(pickup_location);
CREATE INDEX IF NOT EXISTS idx_jobs_v2_available ON jobs_v2(status, service_type, created_at) WHERE status IN ('pending', 'offered');
CREATE INDEX IF NOT EXISTS idx_jobs_v2_created_at ON jobs_v2(created_at DESC);

-- Earnings indexes
CREATE INDEX IF NOT EXISTS idx_earnings_v2_provider ON earnings_v2(provider_id);
CREATE INDEX IF NOT EXISTS idx_earnings_v2_job ON earnings_v2(job_id);
CREATE INDEX IF NOT EXISTS idx_earnings_v2_earned_at ON earnings_v2(earned_at DESC);
CREATE INDEX IF NOT EXISTS idx_earnings_v2_service_type ON earnings_v2(service_type);
CREATE INDEX IF NOT EXISTS idx_earnings_v2_provider_date ON earnings_v2(provider_id, earned_at DESC);

-- Withdrawals indexes
CREATE INDEX IF NOT EXISTS idx_withdrawals_v2_provider ON withdrawals_v2(provider_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_v2_status ON withdrawals_v2(status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_v2_requested_at ON withdrawals_v2(requested_at DESC);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_v2_recipient ON notifications_v2(recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_v2_unread ON notifications_v2(recipient_id) WHERE read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_v2_type ON notifications_v2(type);

-- ============================================================================
-- PART 4: ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE providers_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_documents_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_vehicles_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE earnings_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications_v2 ENABLE ROW LEVEL SECURITY;

-- Providers RLS policies
CREATE POLICY "Providers can view own profile"
  ON providers_v2 FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Providers can update own profile"
  ON providers_v2 FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can insert provider (registration)"
  ON providers_v2 FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all providers"
  ON providers_v2 FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "Admins can update all providers"
  ON providers_v2 FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Documents RLS policies
CREATE POLICY "Providers can view own documents"
  ON provider_documents_v2 FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM providers_v2
      WHERE providers_v2.id = provider_documents_v2.provider_id
      AND providers_v2.user_id = auth.uid()
    )
  );

CREATE POLICY "Providers can insert own documents"
  ON provider_documents_v2 FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM providers_v2
      WHERE providers_v2.id = provider_documents_v2.provider_id
      AND providers_v2.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all documents"
  ON provider_documents_v2 FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Vehicles RLS policies
CREATE POLICY "Providers can manage own vehicles"
  ON provider_vehicles_v2 FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM providers_v2
      WHERE providers_v2.id = provider_vehicles_v2.provider_id
      AND providers_v2.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all vehicles"
  ON provider_vehicles_v2 FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Jobs RLS policies
CREATE POLICY "Providers can view own jobs"
  ON jobs_v2 FOR SELECT
  USING (
    provider_id IN (
      SELECT id FROM providers_v2 WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Customers can view own jobs"
  ON jobs_v2 FOR SELECT
  USING (customer_id = auth.uid());

CREATE POLICY "Providers can update assigned jobs"
  ON jobs_v2 FOR UPDATE
  USING (
    provider_id IN (
      SELECT id FROM providers_v2 WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all jobs"
  ON jobs_v2 FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Earnings RLS policies
CREATE POLICY "Providers can view own earnings"
  ON earnings_v2 FOR SELECT
  USING (
    provider_id IN (
      SELECT id FROM providers_v2 WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert earnings"
  ON earnings_v2 FOR INSERT
  WITH CHECK (true); -- Controlled by functions

CREATE POLICY "Admins can view all earnings"
  ON earnings_v2 FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Withdrawals RLS policies
CREATE POLICY "Providers can manage own withdrawals"
  ON withdrawals_v2 FOR ALL
  USING (
    provider_id IN (
      SELECT id FROM providers_v2 WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all withdrawals"
  ON withdrawals_v2 FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Notifications RLS policies
CREATE POLICY "Users can view own notifications"
  ON notifications_v2 FOR SELECT
  USING (recipient_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON notifications_v2 FOR UPDATE
  USING (recipient_id = auth.uid());

CREATE POLICY "System can insert notifications"
  ON notifications_v2 FOR INSERT
  WITH CHECK (true); -- Controlled by functions

-- ============================================================================
-- PART 5: UPDATED_AT TRIGGER
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to providers table
DROP TRIGGER IF EXISTS update_providers_v2_updated_at ON providers_v2;
CREATE TRIGGER update_providers_v2_updated_at
  BEFORE UPDATE ON providers_v2
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE providers_v2 IS 'Redesigned providers table with multi-service support';
COMMENT ON TABLE provider_documents_v2 IS 'Provider document verification system';
COMMENT ON TABLE provider_vehicles_v2 IS 'Provider vehicle management';
COMMENT ON TABLE jobs_v2 IS 'Unified jobs table for all service types';
COMMENT ON TABLE earnings_v2 IS 'Provider earnings with detailed breakdown';
COMMENT ON TABLE withdrawals_v2 IS 'Provider withdrawal requests';
COMMENT ON TABLE notifications_v2 IS 'Multi-channel notification system';

