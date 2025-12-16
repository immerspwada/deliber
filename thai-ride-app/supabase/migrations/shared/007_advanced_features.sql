-- =============================================
-- SHARED MODULE: Advanced Features
-- =============================================
-- Features: F15-F22 (Scheduled, Multi-Stop, Fare Split, etc.)
-- Used by: Customer, Provider, Admin
-- Depends on: core/001_users_auth.sql, customer/001_rides.sql
-- =============================================

-- =====================================================
-- F15: Scheduled Rides
-- =====================================================
CREATE TABLE IF NOT EXISTS scheduled_rides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  pickup_lat DECIMAL(10,8) NOT NULL,
  pickup_lng DECIMAL(11,8) NOT NULL,
  pickup_address TEXT NOT NULL,
  destination_lat DECIMAL(10,8) NOT NULL,
  destination_lng DECIMAL(11,8) NOT NULL,
  destination_address TEXT NOT NULL,
  ride_type VARCHAR(20) DEFAULT 'standard',
  scheduled_time TIMESTAMPTZ NOT NULL,
  reminder_sent BOOLEAN DEFAULT false,
  ride_id UUID REFERENCES ride_requests(id),
  status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'cancelled', 'completed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- F16: Multi-Stop Rides
-- =====================================================
CREATE TABLE IF NOT EXISTS ride_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID REFERENCES ride_requests(id) ON DELETE CASCADE,
  stop_order INTEGER NOT NULL,
  lat DECIMAL(10,8) NOT NULL,
  lng DECIMAL(11,8) NOT NULL,
  address TEXT NOT NULL,
  stop_type VARCHAR(20) DEFAULT 'dropoff' CHECK (stop_type IN ('pickup', 'dropoff', 'wait')),
  wait_time INTEGER DEFAULT 0,
  arrived_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- F17: Fare Splitting
-- =====================================================
CREATE TABLE IF NOT EXISTS fare_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID REFERENCES ride_requests(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id),
  total_fare DECIMAL(10,2) NOT NULL,
  split_type VARCHAR(20) DEFAULT 'equal' CHECK (split_type IN ('equal', 'custom')),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fare_split_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fare_split_id UUID REFERENCES fare_splits(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  phone VARCHAR(15),
  name VARCHAR(100),
  amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'paid', 'declined')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- F18: Favorite/Blocked Drivers
-- =====================================================
CREATE TABLE IF NOT EXISTS favorite_drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES service_providers(id) ON DELETE CASCADE,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, provider_id)
);

CREATE TABLE IF NOT EXISTS blocked_drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES service_providers(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, provider_id)
);

CREATE TABLE IF NOT EXISTS driver_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  prefer_female_driver BOOLEAN DEFAULT false,
  prefer_quiet_ride BOOLEAN DEFAULT false,
  prefer_ac_on BOOLEAN DEFAULT true,
  music_preference VARCHAR(20) DEFAULT 'no_preference',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- F19: Voice Calls
-- =====================================================
CREATE TABLE IF NOT EXISTS voice_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID REFERENCES ride_requests(id) ON DELETE CASCADE,
  caller_id UUID REFERENCES users(id),
  receiver_id UUID REFERENCES users(id),
  call_type VARCHAR(20) DEFAULT 'voice' CHECK (call_type IN ('voice', 'video')),
  status VARCHAR(20) DEFAULT 'initiated' CHECK (status IN ('initiated', 'ringing', 'connected', 'ended', 'missed', 'declined')),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- F20: Insurance
-- =====================================================
CREATE TABLE IF NOT EXISTS insurance_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  coverage_amount DECIMAL(12,2) NOT NULL,
  premium_per_ride DECIMAL(10,2) NOT NULL,
  coverage_details JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_insurance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES insurance_plans(id),
  is_active BOOLEAN DEFAULT true,
  auto_apply BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS insurance_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES insurance_plans(id),
  ride_id UUID REFERENCES ride_requests(id),
  claim_amount DECIMAL(12,2) NOT NULL,
  description TEXT NOT NULL,
  evidence_urls TEXT[],
  status VARCHAR(20) DEFAULT 'submitted' CHECK (status IN ('submitted', 'reviewing', 'approved', 'rejected', 'paid')),
  reviewed_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- F21: Subscriptions
-- =====================================================
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  duration_days INTEGER NOT NULL,
  discount_percentage DECIMAL(5,2) DEFAULT 0,
  free_rides INTEGER DEFAULT 0,
  priority_matching BOOLEAN DEFAULT false,
  features JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES subscription_plans(id),
  starts_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  auto_renew BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subscription_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES user_subscriptions(id) ON DELETE CASCADE,
  ride_id UUID REFERENCES ride_requests(id),
  discount_applied DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- F22: Corporate Accounts
-- =====================================================
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  tax_id VARCHAR(20),
  address TEXT,
  contact_name VARCHAR(100),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(15),
  billing_email VARCHAR(255),
  credit_limit DECIMAL(12,2) DEFAULT 0,
  current_balance DECIMAL(12,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS company_employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  employee_id VARCHAR(50),
  department VARCHAR(100),
  role VARCHAR(50) DEFAULT 'employee',
  monthly_limit DECIMAL(10,2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, user_id)
);

CREATE TABLE IF NOT EXISTS corporate_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  max_fare DECIMAL(10,2),
  allowed_ride_types TEXT[],
  allowed_hours JSONB,
  require_approval BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS corporate_ride_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID REFERENCES ride_requests(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id),
  employee_id UUID REFERENCES company_employees(id),
  policy_id UUID REFERENCES corporate_policies(id),
  purpose TEXT,
  approval_status VARCHAR(20) DEFAULT 'auto_approved',
  approved_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for all tables
ALTER TABLE scheduled_rides ENABLE ROW LEVEL SECURITY;
ALTER TABLE ride_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE fare_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE fare_split_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorite_drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_insurance ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE corporate_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE corporate_ride_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies (permissive for dev)
CREATE POLICY "Allow all" ON scheduled_rides FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON ride_stops FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON fare_splits FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON fare_split_participants FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON favorite_drivers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON blocked_drivers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON driver_preferences FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON voice_calls FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON insurance_plans FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON user_insurance FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON insurance_claims FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON subscription_plans FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON user_subscriptions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON subscription_usage FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON companies FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON company_employees FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON corporate_policies FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON corporate_ride_requests FOR ALL USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_scheduled_rides_user ON scheduled_rides(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_rides_time ON scheduled_rides(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_ride_stops_ride ON ride_stops(ride_id);
CREATE INDEX IF NOT EXISTS idx_fare_splits_ride ON fare_splits(ride_id);
CREATE INDEX IF NOT EXISTS idx_favorite_drivers_user ON favorite_drivers(user_id);
CREATE INDEX IF NOT EXISTS idx_blocked_drivers_user ON blocked_drivers(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_company_employees_company ON company_employees(company_id);
