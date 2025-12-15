-- Advanced Features Migration
-- Scheduled Rides, Multi-stop, Fare Splitting, Driver Preferences,
-- Voice Call, Ride Insurance, Corporate Account, Subscription Plans

-- =====================================================
-- 1. SCHEDULED RIDES (Enhanced)
-- =====================================================

-- Scheduled rides table (for advance booking)
CREATE TABLE IF NOT EXISTS public.scheduled_rides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tracking_id VARCHAR(25) UNIQUE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  pickup_lat DECIMAL(10,8) NOT NULL,
  pickup_lng DECIMAL(11,8) NOT NULL,
  pickup_address TEXT NOT NULL,
  destination_lat DECIMAL(10,8) NOT NULL,
  destination_lng DECIMAL(11,8) NOT NULL,
  destination_address TEXT NOT NULL,
  scheduled_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  ride_type VARCHAR(20) DEFAULT 'standard',
  estimated_fare DECIMAL(10,2),
  notes TEXT,
  reminder_sent BOOLEAN DEFAULT false,
  status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'cancelled', 'completed', 'expired')),
  ride_request_id UUID REFERENCES public.ride_requests(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. MULTI-STOP RIDES
-- =====================================================

-- Ride stops table (for multi-stop rides)
CREATE TABLE IF NOT EXISTS public.ride_stops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ride_id UUID REFERENCES public.ride_requests(id) ON DELETE CASCADE,
  stop_order INTEGER NOT NULL,
  lat DECIMAL(10,8) NOT NULL,
  lng DECIMAL(11,8) NOT NULL,
  address TEXT NOT NULL,
  contact_name VARCHAR(100),
  contact_phone VARCHAR(15),
  notes TEXT,
  wait_time_minutes INTEGER DEFAULT 5,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'arrived', 'completed', 'skipped')),
  arrived_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 3. FARE SPLITTING
-- =====================================================

-- Fare split table
CREATE TABLE IF NOT EXISTS public.fare_splits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ride_id UUID REFERENCES public.ride_requests(id) ON DELETE CASCADE,
  initiated_by UUID REFERENCES public.users(id),
  total_amount DECIMAL(10,2) NOT NULL,
  split_type VARCHAR(20) DEFAULT 'equal' CHECK (split_type IN ('equal', 'custom', 'percentage')),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'completed', 'cancelled')),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fare split participants
CREATE TABLE IF NOT EXISTS public.fare_split_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  split_id UUID REFERENCES public.fare_splits(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id),
  phone_number VARCHAR(15),
  email VARCHAR(255),
  amount DECIMAL(10,2) NOT NULL,
  percentage DECIMAL(5,2),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'paid', 'declined')),
  payment_id UUID REFERENCES public.payments(id),
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  responded_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE
);

-- =====================================================
-- 4. DRIVER PREFERENCES (Favorite Drivers)
-- =====================================================

-- Favorite drivers table
CREATE TABLE IF NOT EXISTS public.favorite_drivers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES public.service_providers(id) ON DELETE CASCADE,
  nickname VARCHAR(50),
  notes TEXT,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, provider_id)
);

-- Blocked drivers table
CREATE TABLE IF NOT EXISTS public.blocked_drivers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES public.service_providers(id) ON DELETE CASCADE,
  reason TEXT,
  blocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, provider_id)
);

-- Driver preferences settings
CREATE TABLE IF NOT EXISTS public.driver_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  prefer_female_driver BOOLEAN DEFAULT false,
  prefer_high_rated BOOLEAN DEFAULT true,
  min_rating DECIMAL(2,1) DEFAULT 4.0,
  prefer_experienced BOOLEAN DEFAULT false,
  min_trips INTEGER DEFAULT 0,
  prefer_same_language BOOLEAN DEFAULT false,
  vehicle_preferences JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 5. IN-APP VOICE CALL
-- =====================================================

-- Voice calls table
CREATE TABLE IF NOT EXISTS public.voice_calls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tracking_id VARCHAR(25) UNIQUE,
  ride_id UUID REFERENCES public.ride_requests(id) ON DELETE CASCADE,
  caller_type VARCHAR(20) NOT NULL CHECK (caller_type IN ('user', 'provider')),
  caller_id UUID NOT NULL,
  receiver_type VARCHAR(20) NOT NULL CHECK (receiver_type IN ('user', 'provider')),
  receiver_id UUID NOT NULL,
  call_status VARCHAR(20) DEFAULT 'initiated' CHECK (call_status IN ('initiated', 'ringing', 'answered', 'ended', 'missed', 'declined', 'failed')),
  duration_seconds INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  answered_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  end_reason VARCHAR(50),
  quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 6. RIDE INSURANCE
-- =====================================================

-- Insurance plans table
CREATE TABLE IF NOT EXISTS public.insurance_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  name_th VARCHAR(100) NOT NULL,
  description TEXT,
  description_th TEXT,
  coverage_type VARCHAR(50) NOT NULL CHECK (coverage_type IN ('basic', 'standard', 'premium', 'comprehensive')),
  price_per_ride DECIMAL(10,2) NOT NULL,
  max_coverage DECIMAL(12,2) NOT NULL,
  coverage_details JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User insurance subscriptions
CREATE TABLE IF NOT EXISTS public.user_insurance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.insurance_plans(id),
  subscription_type VARCHAR(20) DEFAULT 'per_ride' CHECK (subscription_type IN ('per_ride', 'monthly', 'yearly')),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  valid_until TIMESTAMP WITH TIME ZONE,
  auto_renew BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insurance claims
CREATE TABLE IF NOT EXISTS public.insurance_claims (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tracking_id VARCHAR(25) UNIQUE,
  user_insurance_id UUID REFERENCES public.user_insurance(id),
  ride_id UUID REFERENCES public.ride_requests(id),
  user_id UUID REFERENCES public.users(id),
  claim_type VARCHAR(50) NOT NULL CHECK (claim_type IN ('accident', 'injury', 'property_damage', 'theft', 'medical', 'other')),
  description TEXT NOT NULL,
  incident_date TIMESTAMP WITH TIME ZONE NOT NULL,
  incident_location TEXT,
  evidence_urls TEXT[],
  claimed_amount DECIMAL(12,2) NOT NULL,
  approved_amount DECIMAL(12,2),
  status VARCHAR(20) DEFAULT 'submitted' CHECK (status IN ('submitted', 'reviewing', 'approved', 'rejected', 'paid')),
  reviewer_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 7. CORPORATE ACCOUNTS
-- =====================================================

-- Companies table
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tracking_id VARCHAR(25) UNIQUE,
  name VARCHAR(200) NOT NULL,
  tax_id VARCHAR(20),
  address TEXT,
  contact_name VARCHAR(100),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(15),
  billing_email VARCHAR(255),
  payment_terms INTEGER DEFAULT 30,
  credit_limit DECIMAL(12,2) DEFAULT 0,
  current_balance DECIMAL(12,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'closed')),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Company employees (linked users)
CREATE TABLE IF NOT EXISTS public.company_employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  employee_id VARCHAR(50),
  department VARCHAR(100),
  role VARCHAR(50) DEFAULT 'employee' CHECK (role IN ('admin', 'manager', 'employee')),
  monthly_limit DECIMAL(10,2),
  can_book_for_others BOOLEAN DEFAULT false,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'removed')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, user_id)
);

-- Corporate ride policies
CREATE TABLE IF NOT EXISTS public.corporate_policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  allowed_ride_types TEXT[] DEFAULT ARRAY['standard'],
  max_fare_per_ride DECIMAL(10,2),
  allowed_hours_start TIME,
  allowed_hours_end TIME,
  allowed_days INTEGER[] DEFAULT ARRAY[1,2,3,4,5],
  require_approval_above DECIMAL(10,2),
  allowed_destinations JSONB,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Corporate ride requests (for approval workflow)
CREATE TABLE IF NOT EXISTS public.corporate_ride_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES public.companies(id),
  employee_id UUID REFERENCES public.company_employees(id),
  ride_id UUID REFERENCES public.ride_requests(id),
  policy_id UUID REFERENCES public.corporate_policies(id),
  purpose TEXT,
  project_code VARCHAR(50),
  cost_center VARCHAR(50),
  requires_approval BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES public.company_employees(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 8. SUBSCRIPTION PLANS
-- =====================================================

-- Subscription plans table
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  name_th VARCHAR(100) NOT NULL,
  description TEXT,
  description_th TEXT,
  plan_type VARCHAR(20) NOT NULL CHECK (plan_type IN ('basic', 'plus', 'premium', 'unlimited')),
  billing_cycle VARCHAR(20) NOT NULL CHECK (billing_cycle IN ('weekly', 'monthly', 'quarterly', 'yearly')),
  price DECIMAL(10,2) NOT NULL,
  original_price DECIMAL(10,2),
  features JSONB NOT NULL DEFAULT '[]',
  ride_credits INTEGER DEFAULT 0,
  discount_percentage DECIMAL(5,2) DEFAULT 0,
  priority_matching BOOLEAN DEFAULT false,
  free_cancellations INTEGER DEFAULT 0,
  free_wait_time_minutes INTEGER DEFAULT 0,
  insurance_included BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User subscriptions
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tracking_id VARCHAR(25) UNIQUE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.subscription_plans(id),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled', 'expired')),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  current_period_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancel_reason TEXT,
  auto_renew BOOLEAN DEFAULT true,
  payment_method_id UUID,
  ride_credits_remaining INTEGER DEFAULT 0,
  free_cancellations_remaining INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subscription usage history
CREATE TABLE IF NOT EXISTS public.subscription_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id UUID REFERENCES public.user_subscriptions(id) ON DELETE CASCADE,
  usage_type VARCHAR(50) NOT NULL CHECK (usage_type IN ('ride_credit', 'discount', 'free_cancellation', 'priority_match', 'free_wait_time')),
  ride_id UUID REFERENCES public.ride_requests(id),
  amount_saved DECIMAL(10,2) DEFAULT 0,
  description TEXT,
  used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_scheduled_rides_user ON public.scheduled_rides(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_rides_datetime ON public.scheduled_rides(scheduled_datetime);
CREATE INDEX IF NOT EXISTS idx_scheduled_rides_status ON public.scheduled_rides(status);

CREATE INDEX IF NOT EXISTS idx_ride_stops_ride ON public.ride_stops(ride_id);
CREATE INDEX IF NOT EXISTS idx_ride_stops_order ON public.ride_stops(ride_id, stop_order);

CREATE INDEX IF NOT EXISTS idx_fare_splits_ride ON public.fare_splits(ride_id);
CREATE INDEX IF NOT EXISTS idx_fare_split_participants_split ON public.fare_split_participants(split_id);
CREATE INDEX IF NOT EXISTS idx_fare_split_participants_user ON public.fare_split_participants(user_id);

CREATE INDEX IF NOT EXISTS idx_favorite_drivers_user ON public.favorite_drivers(user_id);
CREATE INDEX IF NOT EXISTS idx_blocked_drivers_user ON public.blocked_drivers(user_id);
CREATE INDEX IF NOT EXISTS idx_driver_preferences_user ON public.driver_preferences(user_id);

CREATE INDEX IF NOT EXISTS idx_voice_calls_ride ON public.voice_calls(ride_id);
CREATE INDEX IF NOT EXISTS idx_voice_calls_caller ON public.voice_calls(caller_id);

CREATE INDEX IF NOT EXISTS idx_user_insurance_user ON public.user_insurance(user_id);
CREATE INDEX IF NOT EXISTS idx_insurance_claims_user ON public.insurance_claims(user_id);

CREATE INDEX IF NOT EXISTS idx_companies_status ON public.companies(status);
CREATE INDEX IF NOT EXISTS idx_company_employees_company ON public.company_employees(company_id);
CREATE INDEX IF NOT EXISTS idx_company_employees_user ON public.company_employees(user_id);
CREATE INDEX IF NOT EXISTS idx_corporate_policies_company ON public.corporate_policies(company_id);

CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON public.subscription_plans(is_active);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user ON public.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON public.user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscription_usage_subscription ON public.subscription_usage(subscription_id);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.scheduled_rides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ride_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fare_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fare_split_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorite_drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_insurance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corporate_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corporate_ride_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage own scheduled rides" ON public.scheduled_rides
  FOR ALL USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can view ride stops for their rides" ON public.ride_stops
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.ride_requests r WHERE r.id = ride_id AND r.user_id::text = auth.uid()::text)
  );

CREATE POLICY "Users can manage fare splits they initiated" ON public.fare_splits
  FOR ALL USING (auth.uid()::text = initiated_by::text);

CREATE POLICY "Users can view fare splits they participate in" ON public.fare_split_participants
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can manage own favorite drivers" ON public.favorite_drivers
  FOR ALL USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can manage own blocked drivers" ON public.blocked_drivers
  FOR ALL USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can manage own driver preferences" ON public.driver_preferences
  FOR ALL USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can view own voice calls" ON public.voice_calls
  FOR SELECT USING (caller_id::text = auth.uid()::text OR receiver_id::text = auth.uid()::text);

CREATE POLICY "Anyone can view active insurance plans" ON public.insurance_plans
  FOR SELECT USING (is_active = true);

CREATE POLICY "Users can manage own insurance" ON public.user_insurance
  FOR ALL USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can manage own insurance claims" ON public.insurance_claims
  FOR ALL USING (auth.uid()::text = user_id::text);

CREATE POLICY "Anyone can view active subscription plans" ON public.subscription_plans
  FOR SELECT USING (is_active = true);

CREATE POLICY "Users can manage own subscriptions" ON public.user_subscriptions
  FOR ALL USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can view own subscription usage" ON public.subscription_usage
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.user_subscriptions s WHERE s.id = subscription_id AND s.user_id::text = auth.uid()::text)
  );

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Scheduled rides tracking ID
CREATE OR REPLACE FUNCTION set_scheduled_ride_tracking_id()
RETURNS TRIGGER AS $
BEGIN
  IF NEW.tracking_id IS NULL THEN
    NEW.tracking_id := generate_tracking_id('ride');
  END IF;
  RETURN NEW;
END;
$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_scheduled_ride_tracking_id
  BEFORE INSERT ON public.scheduled_rides
  FOR EACH ROW EXECUTE FUNCTION set_scheduled_ride_tracking_id();

-- Voice calls tracking ID
CREATE OR REPLACE FUNCTION set_voice_call_tracking_id()
RETURNS TRIGGER AS $
BEGIN
  IF NEW.tracking_id IS NULL THEN
    NEW.tracking_id := generate_tracking_id('chat');
  END IF;
  RETURN NEW;
END;
$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_voice_call_tracking_id
  BEFORE INSERT ON public.voice_calls
  FOR EACH ROW EXECUTE FUNCTION set_voice_call_tracking_id();

-- Insurance claims tracking ID
CREATE OR REPLACE FUNCTION set_insurance_claim_tracking_id()
RETURNS TRIGGER AS $
BEGIN
  IF NEW.tracking_id IS NULL THEN
    NEW.tracking_id := generate_tracking_id('support');
  END IF;
  RETURN NEW;
END;
$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_insurance_claim_tracking_id
  BEFORE INSERT ON public.insurance_claims
  FOR EACH ROW EXECUTE FUNCTION set_insurance_claim_tracking_id();

-- Company tracking ID
CREATE OR REPLACE FUNCTION set_company_tracking_id()
RETURNS TRIGGER AS $
BEGIN
  IF NEW.tracking_id IS NULL THEN
    NEW.tracking_id := generate_tracking_id('customer');
  END IF;
  RETURN NEW;
END;
$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_company_tracking_id
  BEFORE INSERT ON public.companies
  FOR EACH ROW EXECUTE FUNCTION set_company_tracking_id();

-- User subscription tracking ID
CREATE OR REPLACE FUNCTION set_user_subscription_tracking_id()
RETURNS TRIGGER AS $
BEGIN
  IF NEW.tracking_id IS NULL THEN
    NEW.tracking_id := generate_tracking_id('order');
  END IF;
  RETURN NEW;
END;
$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_user_subscription_tracking_id
  BEFORE INSERT ON public.user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION set_user_subscription_tracking_id();

-- Updated at triggers
CREATE TRIGGER update_scheduled_rides_updated_at BEFORE UPDATE ON public.scheduled_rides
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fare_splits_updated_at BEFORE UPDATE ON public.fare_splits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_driver_preferences_updated_at BEFORE UPDATE ON public.driver_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_insurance_updated_at BEFORE UPDATE ON public.user_insurance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_insurance_claims_updated_at BEFORE UPDATE ON public.insurance_claims
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_corporate_policies_updated_at BEFORE UPDATE ON public.corporate_policies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_subscriptions_updated_at BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- =====================================================
-- SAMPLE DATA
-- =====================================================

-- Insurance Plans
INSERT INTO public.insurance_plans (name, name_th, description, description_th, coverage_type, price_per_ride, max_coverage, coverage_details) VALUES
  ('Basic Protection', 'คุ้มครองพื้นฐาน', 'Basic accident coverage', 'คุ้มครองอุบัติเหตุพื้นฐาน', 'basic', 5.00, 50000, '{"accident": 50000, "medical": 10000}'),
  ('Standard Protection', 'คุ้มครองมาตรฐาน', 'Standard coverage with medical', 'คุ้มครองมาตรฐานพร้อมค่ารักษา', 'standard', 15.00, 200000, '{"accident": 200000, "medical": 50000, "property": 20000}'),
  ('Premium Protection', 'คุ้มครองพรีเมียม', 'Premium comprehensive coverage', 'คุ้มครองครอบคลุมระดับพรีเมียม', 'premium', 29.00, 500000, '{"accident": 500000, "medical": 100000, "property": 50000, "theft": 30000}'),
  ('Comprehensive', 'คุ้มครองสูงสุด', 'Full comprehensive coverage', 'คุ้มครองครบทุกกรณี', 'comprehensive', 49.00, 1000000, '{"accident": 1000000, "medical": 200000, "property": 100000, "theft": 50000, "legal": 50000}')
ON CONFLICT DO NOTHING;

-- Subscription Plans
INSERT INTO public.subscription_plans (name, name_th, description, description_th, plan_type, billing_cycle, price, original_price, features, ride_credits, discount_percentage, priority_matching, free_cancellations, free_wait_time_minutes, insurance_included, sort_order) VALUES
  ('ThaiRide Basic', 'แพ็คเกจเบสิค', 'Perfect for occasional riders', 'เหมาะสำหรับผู้ใช้ทั่วไป', 'basic', 'monthly', 99, 149, '["5% discount on all rides", "2 free cancellations/month", "Basic support"]', 0, 5, false, 2, 0, false, 1),
  ('ThaiRide Plus', 'แพ็คเกจพลัส', 'Great value for regular riders', 'คุ้มค่าสำหรับผู้ใช้ประจำ', 'plus', 'monthly', 299, 399, '["10% discount on all rides", "5 free cancellations/month", "Priority support", "5 mins free wait time"]', 0, 10, false, 5, 5, false, 2),
  ('ThaiRide Premium', 'แพ็คเกจพรีเมียม', 'Best for frequent travelers', 'ดีที่สุดสำหรับนักเดินทาง', 'premium', 'monthly', 599, 799, '["15% discount on all rides", "Unlimited cancellations", "Priority matching", "10 mins free wait time", "Basic insurance included"]', 0, 15, true, 99, 10, true, 3),
  ('ThaiRide Unlimited', 'แพ็คเกจไม่จำกัด', 'Ultimate ride experience', 'ประสบการณ์การเดินทางสูงสุด', 'unlimited', 'monthly', 1299, 1599, '["20% discount on all rides", "Unlimited cancellations", "VIP priority matching", "15 mins free wait time", "Premium insurance included", "Dedicated support line"]', 10, 20, true, 99, 15, true, 4),
  ('ThaiRide Basic Yearly', 'แพ็คเกจเบสิครายปี', 'Save 20% with yearly plan', 'ประหยัด 20% กับแพ็คเกจรายปี', 'basic', 'yearly', 950, 1188, '["5% discount on all rides", "2 free cancellations/month", "Basic support"]', 0, 5, false, 2, 0, false, 5),
  ('ThaiRide Plus Yearly', 'แพ็คเกจพลัสรายปี', 'Save 20% with yearly plan', 'ประหยัด 20% กับแพ็คเกจรายปี', 'plus', 'yearly', 2870, 3588, '["10% discount on all rides", "5 free cancellations/month", "Priority support", "5 mins free wait time"]', 0, 10, false, 5, 5, false, 6)
ON CONFLICT DO NOTHING;

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to check if user has active subscription
CREATE OR REPLACE FUNCTION check_user_subscription(p_user_id UUID)
RETURNS TABLE (
  has_subscription BOOLEAN,
  plan_name VARCHAR(100),
  discount_percentage DECIMAL(5,2),
  priority_matching BOOLEAN,
  free_cancellations_remaining INTEGER,
  free_wait_time_minutes INTEGER,
  insurance_included BOOLEAN
) AS $
BEGIN
  RETURN QUERY
  SELECT 
    true,
    sp.name,
    sp.discount_percentage,
    sp.priority_matching,
    us.free_cancellations_remaining,
    sp.free_wait_time_minutes,
    sp.insurance_included
  FROM public.user_subscriptions us
  JOIN public.subscription_plans sp ON sp.id = us.plan_id
  WHERE us.user_id = p_user_id
    AND us.status = 'active'
    AND (us.current_period_end IS NULL OR us.current_period_end > NOW())
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::VARCHAR(100), 0::DECIMAL(5,2), false, 0, 0, false;
  END IF;
END;
$ LANGUAGE plpgsql;

-- Function to apply subscription discount
CREATE OR REPLACE FUNCTION apply_subscription_discount(p_user_id UUID, p_original_fare DECIMAL(10,2))
RETURNS TABLE (
  final_fare DECIMAL(10,2),
  discount_amount DECIMAL(10,2),
  subscription_applied BOOLEAN
) AS $
DECLARE
  v_discount_pct DECIMAL(5,2);
  v_discount DECIMAL(10,2);
BEGIN
  SELECT sp.discount_percentage INTO v_discount_pct
  FROM public.user_subscriptions us
  JOIN public.subscription_plans sp ON sp.id = us.plan_id
  WHERE us.user_id = p_user_id
    AND us.status = 'active'
    AND (us.current_period_end IS NULL OR us.current_period_end > NOW());
  
  IF v_discount_pct IS NOT NULL AND v_discount_pct > 0 THEN
    v_discount := p_original_fare * (v_discount_pct / 100);
    RETURN QUERY SELECT (p_original_fare - v_discount), v_discount, true;
  ELSE
    RETURN QUERY SELECT p_original_fare, 0::DECIMAL(10,2), false;
  END IF;
END;
$ LANGUAGE plpgsql;

-- Function to get user's favorite drivers
CREATE OR REPLACE FUNCTION get_favorite_drivers(p_user_id UUID)
RETURNS TABLE (
  provider_id UUID,
  nickname VARCHAR(50),
  driver_name VARCHAR(200),
  rating DECIMAL(3,2),
  total_trips INTEGER,
  vehicle_type VARCHAR(50),
  vehicle_plate VARCHAR(20)
) AS $
BEGIN
  RETURN QUERY
  SELECT 
    fd.provider_id,
    fd.nickname,
    u.first_name || ' ' || u.last_name,
    sp.rating,
    sp.total_trips,
    sp.vehicle_type,
    sp.vehicle_plate
  FROM public.favorite_drivers fd
  JOIN public.service_providers sp ON sp.id = fd.provider_id
  JOIN public.users u ON u.id = sp.user_id
  WHERE fd.user_id = p_user_id
  ORDER BY fd.priority DESC, fd.created_at DESC;
END;
$ LANGUAGE plpgsql;

-- Function to check if driver is blocked
CREATE OR REPLACE FUNCTION is_driver_blocked(p_user_id UUID, p_provider_id UUID)
RETURNS BOOLEAN AS $
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.blocked_drivers
    WHERE user_id = p_user_id AND provider_id = p_provider_id
  );
END;
$ LANGUAGE plpgsql;

-- Function to calculate fare with multi-stops
CREATE OR REPLACE FUNCTION calculate_multistop_fare(
  p_base_fare DECIMAL(10,2),
  p_stop_count INTEGER,
  p_total_wait_minutes INTEGER DEFAULT 0
)
RETURNS DECIMAL(10,2) AS $
DECLARE
  v_stop_fee DECIMAL(10,2) := 20; -- 20 baht per stop
  v_wait_fee_per_min DECIMAL(10,2) := 2; -- 2 baht per minute wait
BEGIN
  RETURN p_base_fare + (p_stop_count * v_stop_fee) + (p_total_wait_minutes * v_wait_fee_per_min);
END;
$ LANGUAGE plpgsql;
