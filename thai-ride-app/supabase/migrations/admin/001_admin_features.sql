-- =============================================
-- ADMIN MODULE: Admin Features
-- =============================================
-- Feature: F23 - Admin Dashboard, F24 - Support Tickets
-- Used by: Admin App
-- Depends on: core/001_users_auth.sql
-- =============================================

-- Support tickets table
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_id VARCHAR(25) UNIQUE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES service_providers(id),
  request_type VARCHAR(20) CHECK (request_type IN ('ride', 'delivery', 'shopping')),
  request_id UUID,
  category VARCHAR(50) NOT NULL,
  subject VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  assigned_to UUID,
  resolution TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Complaints table
CREATE TABLE IF NOT EXISTS complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_id VARCHAR(25) UNIQUE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES service_providers(id),
  request_type VARCHAR(20) CHECK (request_type IN ('ride', 'delivery', 'shopping')),
  request_id UUID,
  complaint_type VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  evidence_urls TEXT[],
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'investigating', 'resolved', 'dismissed')),
  resolution TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Refunds table
CREATE TABLE IF NOT EXISTS refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_id VARCHAR(25) UNIQUE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES payments(id),
  request_type VARCHAR(20) CHECK (request_type IN ('ride', 'delivery', 'shopping')),
  request_id UUID,
  amount DECIMAL(10,2) NOT NULL,
  reason TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'processed')),
  approved_by UUID,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Admin activity log
CREATE TABLE IF NOT EXISTS admin_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,
  details JSONB,
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_activity_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies (permissive for dev)
CREATE POLICY "Allow all support_tickets" ON support_tickets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all complaints" ON complaints FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all refunds" ON refunds FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all admin_activity_log" ON admin_activity_log FOR ALL USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON support_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_complaints_user ON complaints(user_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_refunds_user ON refunds(user_id);
CREATE INDEX IF NOT EXISTS idx_refunds_status ON refunds(status);
CREATE INDEX IF NOT EXISTS idx_admin_activity_admin ON admin_activity_log(admin_id);

-- Tracking ID triggers
CREATE OR REPLACE FUNCTION set_support_tracking_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tracking_id IS NULL THEN
    NEW.tracking_id := 'SUP-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_support_tracking_id ON support_tickets;
CREATE TRIGGER trigger_support_tracking_id
  BEFORE INSERT ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION set_support_tracking_id();

CREATE OR REPLACE FUNCTION set_complaint_tracking_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tracking_id IS NULL THEN
    NEW.tracking_id := 'CMP-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_complaint_tracking_id ON complaints;
CREATE TRIGGER trigger_complaint_tracking_id
  BEFORE INSERT ON complaints
  FOR EACH ROW EXECUTE FUNCTION set_complaint_tracking_id();

CREATE OR REPLACE FUNCTION set_refund_tracking_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tracking_id IS NULL THEN
    NEW.tracking_id := 'RFD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_refund_tracking_id ON refunds;
CREATE TRIGGER trigger_refund_tracking_id
  BEFORE INSERT ON refunds
  FOR EACH ROW EXECUTE FUNCTION set_refund_tracking_id();

-- Log admin activity
CREATE OR REPLACE FUNCTION log_admin_activity(
  p_admin_id UUID,
  p_action VARCHAR(100),
  p_entity_type VARCHAR(50) DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_details JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO admin_activity_log (admin_id, action, entity_type, entity_id, details)
  VALUES (p_admin_id, p_action, p_entity_type, p_entity_id, p_details)
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

-- Admin dashboard stats
CREATE OR REPLACE FUNCTION get_admin_dashboard_stats()
RETURNS TABLE (
  total_users BIGINT,
  total_providers BIGINT,
  total_rides BIGINT,
  total_deliveries BIGINT,
  total_shopping BIGINT,
  pending_providers BIGINT,
  open_tickets BIGINT,
  pending_refunds BIGINT,
  today_rides BIGINT,
  today_revenue DECIMAL(12,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM users)::BIGINT as total_users,
    (SELECT COUNT(*) FROM service_providers)::BIGINT as total_providers,
    (SELECT COUNT(*) FROM ride_requests)::BIGINT as total_rides,
    (SELECT COUNT(*) FROM delivery_requests)::BIGINT as total_deliveries,
    (SELECT COUNT(*) FROM shopping_requests)::BIGINT as total_shopping,
    (SELECT COUNT(*) FROM service_providers WHERE is_verified = false)::BIGINT as pending_providers,
    (SELECT COUNT(*) FROM support_tickets WHERE status = 'open')::BIGINT as open_tickets,
    (SELECT COUNT(*) FROM refunds WHERE status = 'pending')::BIGINT as pending_refunds,
    (SELECT COUNT(*) FROM ride_requests WHERE DATE(created_at) = CURRENT_DATE)::BIGINT as today_rides,
    COALESCE((SELECT SUM(actual_fare) FROM ride_requests WHERE DATE(completed_at) = CURRENT_DATE AND status = 'completed'), 0)::DECIMAL(12,2) as today_revenue;
END;
$$ LANGUAGE plpgsql;
