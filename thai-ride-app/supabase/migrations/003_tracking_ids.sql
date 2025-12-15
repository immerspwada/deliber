-- Tracking ID System Migration
-- สร้างระบบ ID ที่อ่านง่ายและติดตามได้ทุก entity

-- =====================================================
-- SEQUENCE TABLES สำหรับ Auto-increment tracking numbers
-- =====================================================

-- Tracking ID sequences table
CREATE TABLE IF NOT EXISTS public.tracking_sequences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sequence_type VARCHAR(50) UNIQUE NOT NULL,
  prefix VARCHAR(10) NOT NULL,
  current_value BIGINT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert initial sequences
INSERT INTO public.tracking_sequences (sequence_type, prefix, current_value) VALUES
  ('customer', 'CUS', 0),
  ('rider', 'RDR', 0),
  ('driver', 'DRV', 0),
  ('order', 'ORD', 0),
  ('ride', 'RID', 0),
  ('delivery', 'DEL', 0),
  ('shopping', 'SHP', 0),
  ('payment', 'PAY', 0),
  ('transaction', 'TXN', 0),
  ('chat', 'CHT', 0),
  ('support', 'SUP', 0),
  ('complaint', 'CMP', 0),
  ('refund', 'RFD', 0),
  ('promo', 'PRM', 0),
  ('notification', 'NTF', 0),
  ('session', 'SES', 0)
ON CONFLICT (sequence_type) DO NOTHING;

-- =====================================================
-- FUNCTION: Generate Human-Readable Tracking ID
-- Format: PREFIX-YYYYMMDD-XXXXXX (6 digit padded number)
-- =====================================================

CREATE OR REPLACE FUNCTION generate_tracking_id(p_sequence_type VARCHAR(50))
RETURNS VARCHAR(25) AS $$
DECLARE
  v_prefix VARCHAR(10);
  v_next_val BIGINT;
  v_date_part VARCHAR(8);
  v_tracking_id VARCHAR(25);
BEGIN
  -- Get and increment sequence
  UPDATE public.tracking_sequences 
  SET current_value = current_value + 1
  WHERE sequence_type = p_sequence_type
  RETURNING prefix, current_value INTO v_prefix, v_next_val;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown sequence type: %', p_sequence_type;
  END IF;
  
  -- Generate date part
  v_date_part := TO_CHAR(NOW(), 'YYYYMMDD');
  
  -- Combine: PREFIX-YYYYMMDD-XXXXXX
  v_tracking_id := v_prefix || '-' || v_date_part || '-' || LPAD(v_next_val::TEXT, 6, '0');
  
  RETURN v_tracking_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ADD TRACKING ID COLUMNS TO EXISTING TABLES
-- =====================================================

-- Users table - Customer tracking ID
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS tracking_id VARCHAR(25) UNIQUE;

-- Service providers - Rider/Driver tracking ID  
ALTER TABLE public.service_providers
ADD COLUMN IF NOT EXISTS tracking_id VARCHAR(25) UNIQUE;

-- Ride requests - Order tracking ID
ALTER TABLE public.ride_requests
ADD COLUMN IF NOT EXISTS tracking_id VARCHAR(25) UNIQUE;

-- Delivery requests - Delivery tracking ID
ALTER TABLE public.delivery_requests
ADD COLUMN IF NOT EXISTS tracking_id VARCHAR(25) UNIQUE;

-- Shopping requests - Shopping order tracking ID
ALTER TABLE public.shopping_requests
ADD COLUMN IF NOT EXISTS tracking_id VARCHAR(25) UNIQUE;

-- Payments - Payment tracking ID
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS tracking_id VARCHAR(25) UNIQUE;

-- =====================================================
-- NEW TABLES WITH TRACKING IDs
-- =====================================================

-- Chat sessions table
CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tracking_id VARCHAR(25) UNIQUE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES public.service_providers(id),
  request_type VARCHAR(20) NOT NULL CHECK (request_type IN ('ride', 'delivery', 'shopping')),
  request_id UUID NOT NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'closed', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  closed_at TIMESTAMP WITH TIME ZONE
);

-- Chat messages table
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('user', 'provider', 'system')),
  sender_id UUID,
  message TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'location', 'system')),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Support tickets table
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tracking_id VARCHAR(25) UNIQUE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  related_request_type VARCHAR(20) CHECK (related_request_type IN ('ride', 'delivery', 'shopping')),
  related_request_id UUID,
  category VARCHAR(50) NOT NULL CHECK (category IN ('payment', 'service', 'driver', 'app', 'safety', 'other')),
  subject VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  assigned_to UUID,
  resolution TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Complaints table
CREATE TABLE IF NOT EXISTS public.complaints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tracking_id VARCHAR(25) UNIQUE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES public.service_providers(id),
  request_type VARCHAR(20) NOT NULL CHECK (request_type IN ('ride', 'delivery', 'shopping')),
  request_id UUID NOT NULL,
  complaint_type VARCHAR(50) NOT NULL CHECK (complaint_type IN ('behavior', 'safety', 'pricing', 'quality', 'delay', 'damage', 'other')),
  description TEXT NOT NULL,
  evidence_urls TEXT[],
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'investigating', 'resolved', 'dismissed')),
  resolution TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Refunds table
CREATE TABLE IF NOT EXISTS public.refunds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tracking_id VARCHAR(25) UNIQUE,
  payment_id UUID REFERENCES public.payments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  reason VARCHAR(100) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'processing', 'completed', 'rejected')),
  processed_by UUID,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tracking_id VARCHAR(25) UNIQUE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN ('ride', 'delivery', 'shopping', 'payment', 'promo', 'system', 'safety')),
  related_id UUID,
  is_read BOOLEAN DEFAULT false,
  is_push_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User sessions (login tracking)
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tracking_id VARCHAR(25) UNIQUE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  device_info JSONB,
  ip_address INET,
  location_lat DECIMAL(10,8),
  location_lng DECIMAL(11,8),
  is_active BOOLEAN DEFAULT true,
  login_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  logout_at TIMESTAMP WITH TIME ZONE,
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Safety incidents table
CREATE TABLE IF NOT EXISTS public.safety_incidents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tracking_id VARCHAR(25) UNIQUE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES public.service_providers(id),
  request_type VARCHAR(20) NOT NULL CHECK (request_type IN ('ride', 'delivery', 'shopping')),
  request_id UUID NOT NULL,
  incident_type VARCHAR(50) NOT NULL CHECK (incident_type IN ('sos', 'accident', 'harassment', 'theft', 'other')),
  description TEXT,
  location_lat DECIMAL(10,8),
  location_lng DECIMAL(11,8),
  emergency_contacted BOOLEAN DEFAULT false,
  status VARCHAR(20) DEFAULT 'reported' CHECK (status IN ('reported', 'responding', 'resolved', 'closed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- =====================================================
-- TRIGGERS: Auto-generate tracking IDs
-- =====================================================

-- Users tracking ID trigger
CREATE OR REPLACE FUNCTION set_user_tracking_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tracking_id IS NULL THEN
    NEW.tracking_id := generate_tracking_id('customer');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_user_tracking_id
  BEFORE INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION set_user_tracking_id();

-- Service providers tracking ID trigger
CREATE OR REPLACE FUNCTION set_provider_tracking_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tracking_id IS NULL THEN
    IF NEW.provider_type = 'driver' THEN
      NEW.tracking_id := generate_tracking_id('driver');
    ELSE
      NEW.tracking_id := generate_tracking_id('rider');
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_provider_tracking_id
  BEFORE INSERT ON public.service_providers
  FOR EACH ROW EXECUTE FUNCTION set_provider_tracking_id();

-- Ride requests tracking ID trigger
CREATE OR REPLACE FUNCTION set_ride_tracking_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tracking_id IS NULL THEN
    NEW.tracking_id := generate_tracking_id('ride');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ride_tracking_id
  BEFORE INSERT ON public.ride_requests
  FOR EACH ROW EXECUTE FUNCTION set_ride_tracking_id();

-- Delivery requests tracking ID trigger
CREATE OR REPLACE FUNCTION set_delivery_tracking_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tracking_id IS NULL THEN
    NEW.tracking_id := generate_tracking_id('delivery');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_delivery_tracking_id
  BEFORE INSERT ON public.delivery_requests
  FOR EACH ROW EXECUTE FUNCTION set_delivery_tracking_id();

-- Shopping requests tracking ID trigger
CREATE OR REPLACE FUNCTION set_shopping_tracking_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tracking_id IS NULL THEN
    NEW.tracking_id := generate_tracking_id('shopping');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_shopping_tracking_id
  BEFORE INSERT ON public.shopping_requests
  FOR EACH ROW EXECUTE FUNCTION set_shopping_tracking_id();

-- Payments tracking ID trigger
CREATE OR REPLACE FUNCTION set_payment_tracking_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tracking_id IS NULL THEN
    NEW.tracking_id := generate_tracking_id('payment');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_payment_tracking_id
  BEFORE INSERT ON public.payments
  FOR EACH ROW EXECUTE FUNCTION set_payment_tracking_id();

-- Chat sessions tracking ID trigger
CREATE OR REPLACE FUNCTION set_chat_tracking_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tracking_id IS NULL THEN
    NEW.tracking_id := generate_tracking_id('chat');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_chat_tracking_id
  BEFORE INSERT ON public.chat_sessions
  FOR EACH ROW EXECUTE FUNCTION set_chat_tracking_id();

-- Support tickets tracking ID trigger
CREATE OR REPLACE FUNCTION set_support_tracking_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tracking_id IS NULL THEN
    NEW.tracking_id := generate_tracking_id('support');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_support_tracking_id
  BEFORE INSERT ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION set_support_tracking_id();

-- Complaints tracking ID trigger
CREATE OR REPLACE FUNCTION set_complaint_tracking_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tracking_id IS NULL THEN
    NEW.tracking_id := generate_tracking_id('complaint');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_complaint_tracking_id
  BEFORE INSERT ON public.complaints
  FOR EACH ROW EXECUTE FUNCTION set_complaint_tracking_id();

-- Refunds tracking ID trigger
CREATE OR REPLACE FUNCTION set_refund_tracking_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tracking_id IS NULL THEN
    NEW.tracking_id := generate_tracking_id('refund');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_refund_tracking_id
  BEFORE INSERT ON public.refunds
  FOR EACH ROW EXECUTE FUNCTION set_refund_tracking_id();

-- Notifications tracking ID trigger
CREATE OR REPLACE FUNCTION set_notification_tracking_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tracking_id IS NULL THEN
    NEW.tracking_id := generate_tracking_id('notification');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notification_tracking_id
  BEFORE INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION set_notification_tracking_id();

-- User sessions tracking ID trigger
CREATE OR REPLACE FUNCTION set_session_tracking_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tracking_id IS NULL THEN
    NEW.tracking_id := generate_tracking_id('session');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_session_tracking_id
  BEFORE INSERT ON public.user_sessions
  FOR EACH ROW EXECUTE FUNCTION set_session_tracking_id();

-- Safety incidents tracking ID trigger  
CREATE OR REPLACE FUNCTION set_safety_tracking_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tracking_id IS NULL THEN
    NEW.tracking_id := generate_tracking_id('support');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_safety_tracking_id
  BEFORE INSERT ON public.safety_incidents
  FOR EACH ROW EXECUTE FUNCTION set_safety_tracking_id();

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_users_tracking ON public.users(tracking_id);
CREATE INDEX IF NOT EXISTS idx_providers_tracking ON public.service_providers(tracking_id);
CREATE INDEX IF NOT EXISTS idx_rides_tracking ON public.ride_requests(tracking_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_tracking ON public.delivery_requests(tracking_id);
CREATE INDEX IF NOT EXISTS idx_shopping_tracking ON public.shopping_requests(tracking_id);
CREATE INDEX IF NOT EXISTS idx_payments_tracking ON public.payments(tracking_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_tracking ON public.chat_sessions(tracking_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON public.chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON public.chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_support_tracking ON public.support_tickets(tracking_id);
CREATE INDEX IF NOT EXISTS idx_support_user ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_complaints_tracking ON public.complaints(tracking_id);
CREATE INDEX IF NOT EXISTS idx_complaints_user ON public.complaints(user_id);
CREATE INDEX IF NOT EXISTS idx_refunds_tracking ON public.refunds(tracking_id);
CREATE INDEX IF NOT EXISTS idx_refunds_user ON public.refunds(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_tracking ON public.notifications(tracking_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_tracking ON public.user_sessions(tracking_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_safety_tracking ON public.safety_incidents(tracking_id);
CREATE INDEX IF NOT EXISTS idx_safety_user ON public.safety_incidents(user_id);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_incidents ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own chat sessions" ON public.chat_sessions
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can view own chat messages" ON public.chat_messages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.chat_sessions cs WHERE cs.id = session_id AND cs.user_id::text = auth.uid()::text)
  );

CREATE POLICY "Users can send chat messages" ON public.chat_messages
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.chat_sessions cs WHERE cs.id = session_id AND cs.user_id::text = auth.uid()::text)
  );

CREATE POLICY "Users can manage own support tickets" ON public.support_tickets
  FOR ALL USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can manage own complaints" ON public.complaints
  FOR ALL USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can view own refunds" ON public.refunds
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can manage own notifications" ON public.notifications
  FOR ALL USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can view own sessions" ON public.user_sessions
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can manage own safety incidents" ON public.safety_incidents
  FOR ALL USING (auth.uid()::text = user_id::text);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to lookup any entity by tracking ID
CREATE OR REPLACE FUNCTION lookup_by_tracking_id(p_tracking_id VARCHAR(25))
RETURNS TABLE (
  entity_type VARCHAR(50),
  entity_id UUID,
  tracking_id VARCHAR(25),
  status VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  -- Check users
  RETURN QUERY SELECT 'customer'::VARCHAR(50), u.id, u.tracking_id, u.verification_status::VARCHAR(50), u.created_at
  FROM public.users u WHERE u.tracking_id = p_tracking_id;
  
  -- Check providers
  RETURN QUERY SELECT 'provider'::VARCHAR(50), sp.id, sp.tracking_id, sp.background_check_status::VARCHAR(50), sp.created_at
  FROM public.service_providers sp WHERE sp.tracking_id = p_tracking_id;
  
  -- Check rides
  RETURN QUERY SELECT 'ride'::VARCHAR(50), r.id, r.tracking_id, r.status::VARCHAR(50), r.created_at
  FROM public.ride_requests r WHERE r.tracking_id = p_tracking_id;
  
  -- Check deliveries
  RETURN QUERY SELECT 'delivery'::VARCHAR(50), d.id, d.tracking_id, d.status::VARCHAR(50), d.created_at
  FROM public.delivery_requests d WHERE d.tracking_id = p_tracking_id;
  
  -- Check shopping
  RETURN QUERY SELECT 'shopping'::VARCHAR(50), s.id, s.tracking_id, s.status::VARCHAR(50), s.created_at
  FROM public.shopping_requests s WHERE s.tracking_id = p_tracking_id;
  
  -- Check payments
  RETURN QUERY SELECT 'payment'::VARCHAR(50), p.id, p.tracking_id, p.status::VARCHAR(50), p.created_at
  FROM public.payments p WHERE p.tracking_id = p_tracking_id;
  
  -- Check support tickets
  RETURN QUERY SELECT 'support'::VARCHAR(50), st.id, st.tracking_id, st.status::VARCHAR(50), st.created_at
  FROM public.support_tickets st WHERE st.tracking_id = p_tracking_id;
  
  -- Check complaints
  RETURN QUERY SELECT 'complaint'::VARCHAR(50), c.id, c.tracking_id, c.status::VARCHAR(50), c.created_at
  FROM public.complaints c WHERE c.tracking_id = p_tracking_id;
  
  -- Check refunds
  RETURN QUERY SELECT 'refund'::VARCHAR(50), rf.id, rf.tracking_id, rf.status::VARCHAR(50), rf.created_at
  FROM public.refunds rf WHERE rf.tracking_id = p_tracking_id;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_chat_sessions_updated_at BEFORE UPDATE ON public.chat_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_support_tickets_updated_at BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_complaints_updated_at BEFORE UPDATE ON public.complaints
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_refunds_updated_at BEFORE UPDATE ON public.refunds
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_safety_incidents_updated_at BEFORE UPDATE ON public.safety_incidents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
