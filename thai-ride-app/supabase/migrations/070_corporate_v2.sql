-- Migration: 070_corporate_v2.sql
-- Feature: F22 - Corporate Account Features V2
-- Description: Enhanced corporate accounts with departments, budgets, approvals

-- =====================================================
-- 1. Company Departments
-- =====================================================
CREATE TABLE IF NOT EXISTS company_departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  code TEXT, -- 'HR', 'SALES', 'IT'
  description TEXT,
  
  -- Budget
  monthly_budget NUMERIC(12,2),
  current_month_spent NUMERIC(12,2) DEFAULT 0,
  budget_alert_threshold NUMERIC(3,2) DEFAULT 0.8, -- Alert at 80%
  
  -- Manager
  manager_id UUID REFERENCES company_employees(id),
  
  -- Settings
  require_approval BOOLEAN DEFAULT FALSE,
  approval_threshold NUMERIC(10,2), -- Require approval above this amount
  
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_company_depts_company ON company_departments(company_id);

-- =====================================================
-- 2. Corporate Budgets
-- =====================================================
CREATE TABLE IF NOT EXISTS corporate_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  department_id UUID REFERENCES company_departments(id),
  
  budget_type TEXT NOT NULL CHECK (budget_type IN ('monthly', 'quarterly', 'annual', 'project')),
  budget_name TEXT NOT NULL,
  
  -- Amount
  total_amount NUMERIC(12,2) NOT NULL,
  spent_amount NUMERIC(12,2) DEFAULT 0,
  reserved_amount NUMERIC(12,2) DEFAULT 0, -- For pending approvals
  
  -- Period
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  
  -- Settings
  allow_overspend BOOLEAN DEFAULT FALSE,
  overspend_limit_pct NUMERIC(3,2) DEFAULT 0.1, -- 10% overspend allowed
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'exhausted', 'expired', 'suspended')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_corp_budgets_company ON corporate_budgets(company_id);
CREATE INDEX IF NOT EXISTS idx_corp_budgets_dept ON corporate_budgets(department_id);

-- =====================================================
-- 3. Corporate Ride Approvals
-- =====================================================
CREATE TABLE IF NOT EXISTS corporate_ride_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  department_id UUID REFERENCES company_departments(id),
  employee_id UUID NOT NULL REFERENCES company_employees(id),
  
  -- Request details
  ride_request_id UUID REFERENCES ride_requests(id),
  estimated_fare NUMERIC(10,2),
  purpose TEXT,
  destination TEXT,
  
  -- Approval flow
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  approver_id UUID REFERENCES company_employees(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  
  -- Budget allocation
  budget_id UUID REFERENCES corporate_budgets(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_corp_approvals_company ON corporate_ride_approvals(company_id);
CREATE INDEX IF NOT EXISTS idx_corp_approvals_employee ON corporate_ride_approvals(employee_id);
CREATE INDEX IF NOT EXISTS idx_corp_approvals_status ON corporate_ride_approvals(status);

-- =====================================================
-- 4. Corporate Reports
-- =====================================================
CREATE TABLE IF NOT EXISTS corporate_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  report_type TEXT NOT NULL CHECK (report_type IN ('monthly', 'quarterly', 'annual', 'custom')),
  report_name TEXT NOT NULL,
  
  -- Period
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Data
  summary_data JSONB NOT NULL,
  department_breakdown JSONB,
  employee_breakdown JSONB,
  
  -- File
  file_url TEXT,
  file_format TEXT CHECK (file_format IN ('pdf', 'xlsx', 'csv')),
  
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  generated_by UUID
);

CREATE INDEX IF NOT EXISTS idx_corp_reports_company ON corporate_reports(company_id);

-- =====================================================
-- 5. Corporate Billing
-- =====================================================
CREATE TABLE IF NOT EXISTS corporate_billing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,
  
  -- Amounts
  subtotal NUMERIC(12,2) NOT NULL,
  tax_amount NUMERIC(12,2) DEFAULT 0,
  discount_amount NUMERIC(12,2) DEFAULT 0,
  total_amount NUMERIC(12,2) NOT NULL,
  
  -- Rides breakdown
  total_rides INTEGER DEFAULT 0,
  total_deliveries INTEGER DEFAULT 0,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'paid', 'overdue', 'cancelled')),
  
  -- Payment
  invoice_number TEXT UNIQUE,
  invoice_url TEXT,
  due_date DATE,
  paid_at TIMESTAMPTZ,
  payment_method TEXT,
  payment_reference TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_corp_billing_company ON corporate_billing(company_id);
CREATE INDEX IF NOT EXISTS idx_corp_billing_status ON corporate_billing(status);

-- =====================================================
-- 6. Corporate Settings
-- =====================================================
CREATE TABLE IF NOT EXISTS corporate_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Booking settings
  allow_personal_rides BOOLEAN DEFAULT FALSE,
  require_purpose BOOLEAN DEFAULT TRUE,
  require_project_code BOOLEAN DEFAULT FALSE,
  max_fare_without_approval NUMERIC(10,2) DEFAULT 500,
  
  -- Vehicle restrictions
  allowed_vehicle_types TEXT[] DEFAULT ARRAY['car', 'premium'],
  
  -- Time restrictions
  allowed_booking_hours JSONB, -- {"start": "06:00", "end": "22:00"}
  allowed_days TEXT[] DEFAULT ARRAY['mon', 'tue', 'wed', 'thu', 'fri'],
  
  -- Notifications
  notify_manager_on_booking BOOLEAN DEFAULT FALSE,
  notify_on_budget_threshold BOOLEAN DEFAULT TRUE,
  
  -- Billing
  billing_email TEXT,
  billing_cycle TEXT DEFAULT 'monthly' CHECK (billing_cycle IN ('weekly', 'biweekly', 'monthly')),
  payment_terms_days INTEGER DEFAULT 30,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(company_id)
);

-- =====================================================
-- 7. Update company_employees with department
-- =====================================================
ALTER TABLE company_employees 
ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES company_departments(id),
ADD COLUMN IF NOT EXISTS can_approve BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS approval_limit NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS monthly_limit NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS current_month_spent NUMERIC(10,2) DEFAULT 0;

-- =====================================================
-- 8. Enable RLS
-- =====================================================
ALTER TABLE company_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE corporate_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE corporate_ride_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE corporate_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE corporate_billing ENABLE ROW LEVEL SECURITY;
ALTER TABLE corporate_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies (company employees can read their company data)
CREATE POLICY "Company employees read departments" ON company_departments
  FOR SELECT TO authenticated USING (
    company_id IN (SELECT company_id FROM company_employees WHERE user_id = auth.uid())
  );

CREATE POLICY "Company employees read budgets" ON corporate_budgets
  FOR SELECT TO authenticated USING (
    company_id IN (SELECT company_id FROM company_employees WHERE user_id = auth.uid())
  );

CREATE POLICY "Employees manage own approvals" ON corporate_ride_approvals
  FOR ALL TO authenticated USING (
    employee_id IN (SELECT id FROM company_employees WHERE user_id = auth.uid())
    OR approver_id IN (SELECT id FROM company_employees WHERE user_id = auth.uid())
  );

CREATE POLICY "Company employees read reports" ON corporate_reports
  FOR SELECT TO authenticated USING (
    company_id IN (SELECT company_id FROM company_employees WHERE user_id = auth.uid())
  );

CREATE POLICY "Company employees read billing" ON corporate_billing
  FOR SELECT TO authenticated USING (
    company_id IN (SELECT company_id FROM company_employees WHERE user_id = auth.uid())
  );

CREATE POLICY "Company employees read settings" ON corporate_settings
  FOR SELECT TO authenticated USING (
    company_id IN (SELECT company_id FROM company_employees WHERE user_id = auth.uid())
  );

-- =====================================================
-- 9. Functions
-- =====================================================

-- Check if ride needs approval
CREATE OR REPLACE FUNCTION check_corporate_approval_required(
  p_employee_id UUID,
  p_estimated_fare NUMERIC
) RETURNS TABLE (
  requires_approval BOOLEAN,
  reason TEXT,
  approver_id UUID
) AS $$
DECLARE
  v_employee company_employees%ROWTYPE;
  v_dept company_departments%ROWTYPE;
  v_settings corporate_settings%ROWTYPE;
BEGIN
  SELECT * INTO v_employee FROM company_employees WHERE id = p_employee_id;
  SELECT * INTO v_dept FROM company_departments WHERE id = v_employee.department_id;
  SELECT * INTO v_settings FROM corporate_settings WHERE company_id = v_employee.company_id;
  
  -- Check settings threshold
  IF v_settings.max_fare_without_approval IS NOT NULL 
     AND p_estimated_fare > v_settings.max_fare_without_approval THEN
    RETURN QUERY SELECT TRUE, 'Fare exceeds auto-approval limit'::TEXT, v_dept.manager_id;
    RETURN;
  END IF;
  
  -- Check department approval requirement
  IF v_dept.require_approval AND p_estimated_fare > COALESCE(v_dept.approval_threshold, 0) THEN
    RETURN QUERY SELECT TRUE, 'Department requires approval'::TEXT, v_dept.manager_id;
    RETURN;
  END IF;
  
  -- Check employee monthly limit
  IF v_employee.monthly_limit IS NOT NULL 
     AND (v_employee.current_month_spent + p_estimated_fare) > v_employee.monthly_limit THEN
    RETURN QUERY SELECT TRUE, 'Would exceed monthly limit'::TEXT, v_dept.manager_id;
    RETURN;
  END IF;
  
  RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::UUID;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Request ride approval
CREATE OR REPLACE FUNCTION request_corporate_approval(
  p_employee_id UUID,
  p_estimated_fare NUMERIC,
  p_purpose TEXT,
  p_destination TEXT,
  p_budget_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_employee company_employees%ROWTYPE;
  v_approval_id UUID;
  v_approver_id UUID;
BEGIN
  SELECT * INTO v_employee FROM company_employees WHERE id = p_employee_id;
  
  -- Get approver
  SELECT manager_id INTO v_approver_id 
  FROM company_departments 
  WHERE id = v_employee.department_id;
  
  INSERT INTO corporate_ride_approvals (
    company_id, department_id, employee_id,
    estimated_fare, purpose, destination,
    budget_id, expires_at
  ) VALUES (
    v_employee.company_id, v_employee.department_id, p_employee_id,
    p_estimated_fare, p_purpose, p_destination,
    p_budget_id, NOW() + INTERVAL '24 hours'
  ) RETURNING id INTO v_approval_id;
  
  -- Notify approver
  IF v_approver_id IS NOT NULL THEN
    INSERT INTO user_notifications (user_id, type, title, message, data)
    SELECT 
      ce.user_id, 'corporate', 'Ride Approval Request',
      format('%s requests approval for ride to %s (฿%s)', 
        (SELECT first_name FROM users WHERE id = v_employee.user_id),
        p_destination, p_estimated_fare),
      jsonb_build_object('approval_id', v_approval_id)
    FROM company_employees ce WHERE ce.id = v_approver_id;
  END IF;
  
  RETURN v_approval_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Approve/reject ride
CREATE OR REPLACE FUNCTION process_corporate_approval(
  p_approval_id UUID,
  p_approver_id UUID,
  p_approved BOOLEAN,
  p_rejection_reason TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_approval corporate_ride_approvals%ROWTYPE;
BEGIN
  SELECT * INTO v_approval FROM corporate_ride_approvals WHERE id = p_approval_id;
  
  IF v_approval.id IS NULL OR v_approval.status != 'pending' THEN
    RETURN FALSE;
  END IF;
  
  UPDATE corporate_ride_approvals
  SET status = CASE WHEN p_approved THEN 'approved' ELSE 'rejected' END,
      approver_id = p_approver_id,
      approved_at = CASE WHEN p_approved THEN NOW() ELSE NULL END,
      rejection_reason = p_rejection_reason
  WHERE id = p_approval_id;
  
  -- Notify employee
  INSERT INTO user_notifications (user_id, type, title, message, data)
  SELECT 
    ce.user_id, 'corporate',
    CASE WHEN p_approved THEN 'Ride Approved' ELSE 'Ride Rejected' END,
    CASE WHEN p_approved 
      THEN 'Your ride request has been approved'
      ELSE format('Your ride request was rejected: %s', COALESCE(p_rejection_reason, 'No reason provided'))
    END,
    jsonb_build_object('approval_id', p_approval_id, 'approved', p_approved)
  FROM company_employees ce WHERE ce.id = v_approval.employee_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get company dashboard stats
CREATE OR REPLACE FUNCTION get_corporate_dashboard(p_company_id UUID)
RETURNS TABLE (
  total_employees INTEGER,
  active_employees INTEGER,
  total_rides_this_month INTEGER,
  total_spent_this_month NUMERIC,
  budget_remaining NUMERIC,
  pending_approvals INTEGER,
  departments_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*)::INTEGER FROM company_employees WHERE company_id = p_company_id),
    (SELECT COUNT(*)::INTEGER FROM company_employees WHERE company_id = p_company_id AND status = 'active'),
    (SELECT COUNT(*)::INTEGER FROM corporate_ride_requests 
     WHERE company_id = p_company_id 
     AND created_at >= DATE_TRUNC('month', CURRENT_DATE)),
    (SELECT COALESCE(SUM(final_fare), 0) FROM corporate_ride_requests 
     WHERE company_id = p_company_id 
     AND created_at >= DATE_TRUNC('month', CURRENT_DATE)
     AND status = 'completed'),
    (SELECT COALESCE(SUM(total_amount - spent_amount), 0) FROM corporate_budgets 
     WHERE company_id = p_company_id AND status = 'active'),
    (SELECT COUNT(*)::INTEGER FROM corporate_ride_approvals 
     WHERE company_id = p_company_id AND status = 'pending'),
    (SELECT COUNT(*)::INTEGER FROM company_departments WHERE company_id = p_company_id AND is_active = true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Generate monthly report
CREATE OR REPLACE FUNCTION generate_corporate_report(
  p_company_id UUID,
  p_month DATE
) RETURNS UUID AS $$
DECLARE
  v_report_id UUID;
  v_summary JSONB;
  v_dept_breakdown JSONB;
BEGIN
  -- Calculate summary
  SELECT jsonb_build_object(
    'total_rides', COUNT(*),
    'total_spent', COALESCE(SUM(final_fare), 0),
    'avg_fare', COALESCE(AVG(final_fare), 0),
    'completed_rides', COUNT(*) FILTER (WHERE status = 'completed'),
    'cancelled_rides', COUNT(*) FILTER (WHERE status = 'cancelled')
  ) INTO v_summary
  FROM corporate_ride_requests
  WHERE company_id = p_company_id
    AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', p_month);
  
  -- Department breakdown
  SELECT jsonb_agg(jsonb_build_object(
    'department_id', cd.id,
    'department_name', cd.name,
    'rides', COALESCE(r.ride_count, 0),
    'spent', COALESCE(r.total_spent, 0)
  )) INTO v_dept_breakdown
  FROM company_departments cd
  LEFT JOIN (
    SELECT ce.department_id, COUNT(*) as ride_count, SUM(crr.final_fare) as total_spent
    FROM corporate_ride_requests crr
    JOIN company_employees ce ON crr.employee_id = ce.id
    WHERE crr.company_id = p_company_id
      AND DATE_TRUNC('month', crr.created_at) = DATE_TRUNC('month', p_month)
    GROUP BY ce.department_id
  ) r ON cd.id = r.department_id
  WHERE cd.company_id = p_company_id;
  
  INSERT INTO corporate_reports (
    company_id, report_type, report_name,
    period_start, period_end,
    summary_data, department_breakdown
  ) VALUES (
    p_company_id, 'monthly', 
    format('Monthly Report - %s', TO_CHAR(p_month, 'YYYY-MM')),
    DATE_TRUNC('month', p_month),
    (DATE_TRUNC('month', p_month) + INTERVAL '1 month - 1 day')::DATE,
    v_summary, v_dept_breakdown
  ) RETURNING id INTO v_report_id;
  
  RETURN v_report_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON TABLE company_departments IS 'Departments within companies';
COMMENT ON TABLE corporate_budgets IS 'Budget allocations for corporate accounts';
COMMENT ON TABLE corporate_ride_approvals IS 'Ride approval workflow';
COMMENT ON TABLE corporate_reports IS 'Generated corporate reports';
COMMENT ON TABLE corporate_billing IS 'Corporate billing and invoices';
COMMENT ON TABLE corporate_settings IS 'Corporate account settings';
