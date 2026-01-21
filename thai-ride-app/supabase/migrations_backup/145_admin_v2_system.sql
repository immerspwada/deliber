-- =====================================================
-- Migration: 145_admin_v2_system.sql
-- Description: Admin Dashboard V2 - RBAC, Sessions, Audit
-- Feature: F23 - Admin Dashboard V2
-- =====================================================

-- =====================================================
-- 1. Admin Roles Table
-- =====================================================
CREATE TABLE IF NOT EXISTS admin_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE CHECK (name IN ('super_admin', 'admin', 'manager', 'support', 'viewer')),
  display_name TEXT NOT NULL,
  display_name_th TEXT NOT NULL,
  level INTEGER NOT NULL CHECK (level >= 0 AND level <= 100),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default roles
INSERT INTO admin_roles (name, display_name, display_name_th, level, description) VALUES
  ('super_admin', 'Super Admin', 'ผู้ดูแลระบบสูงสุด', 100, 'Full system access and configuration'),
  ('admin', 'Admin', 'ผู้ดูแลระบบ', 80, 'All operations except system config'),
  ('manager', 'Manager', 'ผู้จัดการ', 60, 'View all, edit orders/users, limited settings'),
  ('support', 'Support', 'ฝ่ายสนับสนุน', 40, 'View all, respond to tickets, limited edit'),
  ('viewer', 'Viewer', 'ผู้ดู', 20, 'Read-only access')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- 2. Admin Permissions Table
-- =====================================================
CREATE TABLE IF NOT EXISTS admin_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_name TEXT NOT NULL REFERENCES admin_roles(name) ON DELETE CASCADE,
  module TEXT NOT NULL,
  actions TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role_name, module)
);

-- Insert default permissions
INSERT INTO admin_permissions (role_name, module, actions) VALUES
  -- Super Admin - Full access
  ('super_admin', '*', ARRAY['view', 'create', 'edit', 'delete']),
  
  -- Admin - All modules except system config
  ('admin', 'dashboard', ARRAY['view']),
  ('admin', 'users', ARRAY['view', 'create', 'edit', 'delete']),
  ('admin', 'orders', ARRAY['view', 'create', 'edit', 'delete']),
  ('admin', 'finance', ARRAY['view', 'create', 'edit', 'delete']),
  ('admin', 'marketing', ARRAY['view', 'create', 'edit', 'delete']),
  ('admin', 'support', ARRAY['view', 'create', 'edit', 'delete']),
  ('admin', 'analytics', ARRAY['view']),
  ('admin', 'settings', ARRAY['view', 'edit']),
  
  -- Manager - Limited access
  ('manager', 'dashboard', ARRAY['view']),
  ('manager', 'users', ARRAY['view', 'edit']),
  ('manager', 'orders', ARRAY['view', 'edit']),
  ('manager', 'finance', ARRAY['view']),
  ('manager', 'marketing', ARRAY['view', 'edit']),
  ('manager', 'support', ARRAY['view', 'edit']),
  ('manager', 'analytics', ARRAY['view']),
  
  -- Support - View and respond
  ('support', 'dashboard', ARRAY['view']),
  ('support', 'users', ARRAY['view']),
  ('support', 'orders', ARRAY['view', 'edit']),
  ('support', 'support', ARRAY['view', 'create', 'edit']),
  
  -- Viewer - Read only
  ('viewer', 'dashboard', ARRAY['view']),
  ('viewer', 'users', ARRAY['view']),
  ('viewer', 'orders', ARRAY['view']),
  ('viewer', 'finance', ARRAY['view']),
  ('viewer', 'marketing', ARRAY['view']),
  ('viewer', 'support', ARRAY['view']),
  ('viewer', 'analytics', ARRAY['view'])
ON CONFLICT (role_name, module) DO NOTHING;

-- =====================================================
-- 3. Admin Sessions Table
-- =====================================================
CREATE TABLE IF NOT EXISTS admin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  login_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  is_demo BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for session lookup
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(token);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_user_id ON admin_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires_at ON admin_sessions(expires_at);

-- =====================================================
-- 4. Admin Audit Log Enhancement
-- =====================================================
-- Extend existing admin_audit_log table if needed
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'admin_audit_log' AND column_name = 'session_id') THEN
    ALTER TABLE admin_audit_log ADD COLUMN session_id UUID REFERENCES admin_sessions(id) ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'admin_audit_log' AND column_name = 'ip_address') THEN
    ALTER TABLE admin_audit_log ADD COLUMN ip_address TEXT;
  END IF;
END $$;

-- =====================================================
-- 5. Helper Functions
-- =====================================================

-- Check if user has admin permission
CREATE OR REPLACE FUNCTION has_admin_permission(
  p_user_id UUID,
  p_module TEXT,
  p_action TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_role TEXT;
  v_has_permission BOOLEAN;
BEGIN
  -- Get user role
  SELECT role INTO v_role
  FROM users
  WHERE id = p_user_id;
  
  IF v_role IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Super admin has all permissions
  IF v_role = 'super_admin' THEN
    RETURN TRUE;
  END IF;
  
  -- Check specific permission
  SELECT EXISTS (
    SELECT 1
    FROM admin_permissions
    WHERE role_name = v_role
      AND (module = p_module OR module = '*')
      AND p_action = ANY(actions)
  ) INTO v_has_permission;
  
  RETURN v_has_permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get admin role level
CREATE OR REPLACE FUNCTION get_admin_role_level(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_role TEXT;
  v_level INTEGER;
BEGIN
  SELECT role INTO v_role
  FROM users
  WHERE id = p_user_id;
  
  IF v_role IS NULL THEN
    RETURN 0;
  END IF;
  
  SELECT level INTO v_level
  FROM admin_roles
  WHERE name = v_role;
  
  RETURN COALESCE(v_level, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Clean expired sessions
CREATE OR REPLACE FUNCTION clean_expired_admin_sessions()
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM admin_sessions
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. RLS Policies
-- =====================================================

-- Enable RLS
ALTER TABLE admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;

-- Admin roles - Read only for all admins
CREATE POLICY "admin_roles_read" ON admin_roles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role IN ('super_admin', 'admin', 'manager', 'support', 'viewer')
    )
  );

-- Admin permissions - Read only for all admins
CREATE POLICY "admin_permissions_read" ON admin_permissions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role IN ('super_admin', 'admin', 'manager', 'support', 'viewer')
    )
  );

-- Admin sessions - Users can only see their own sessions
CREATE POLICY "admin_sessions_own" ON admin_sessions
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Super admins can see all sessions
CREATE POLICY "admin_sessions_super_admin" ON admin_sessions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'super_admin'
    )
  );

-- =====================================================
-- 7. Scheduled Job to Clean Sessions (Optional)
-- =====================================================
-- Note: This requires pg_cron extension
-- Run daily at 2 AM to clean expired sessions
-- SELECT cron.schedule('clean-admin-sessions', '0 2 * * *', 'SELECT clean_expired_admin_sessions()');

-- =====================================================
-- 8. Comments
-- =====================================================
COMMENT ON TABLE admin_roles IS 'Admin role definitions with hierarchy levels';
COMMENT ON TABLE admin_permissions IS 'Module-level permissions for each admin role';
COMMENT ON TABLE admin_sessions IS 'Active admin sessions with TTL';
COMMENT ON FUNCTION has_admin_permission IS 'Check if user has specific admin permission';
COMMENT ON FUNCTION get_admin_role_level IS 'Get numeric level of admin role';
COMMENT ON FUNCTION clean_expired_admin_sessions IS 'Remove expired admin sessions';
