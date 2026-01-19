-- ============================================================================
-- Admin Audit Log System
-- Migration: 228
-- Description: Create audit logging system for admin actions
-- ============================================================================

-- Create admin audit logs table
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID REFERENCES auth.users(id) NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  changes JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_id ON admin_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_target ON admin_audit_logs(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON admin_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action ON admin_audit_logs(action);

-- Enable RLS
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admin users can view audit logs"
  ON admin_audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "System can insert audit logs"
  ON admin_audit_logs FOR INSERT
  WITH CHECK (true); -- Allow system inserts

-- Grant permissions
GRANT SELECT ON admin_audit_logs TO authenticated;
GRANT INSERT ON admin_audit_logs TO service_role;

-- Add comments
COMMENT ON TABLE admin_audit_logs IS 'Audit trail for all admin actions';
COMMENT ON COLUMN admin_audit_logs.admin_id IS 'ID of admin user who performed the action';
COMMENT ON COLUMN admin_audit_logs.action IS 'Type of action performed (e.g., APPROVE_PROVIDER, REJECT_PROVIDER)';
COMMENT ON COLUMN admin_audit_logs.target_type IS 'Type of target entity (e.g., provider, user, job)';
COMMENT ON COLUMN admin_audit_logs.target_id IS 'ID of target entity';
COMMENT ON COLUMN admin_audit_logs.changes IS 'JSON object containing details of the changes made';
COMMENT ON COLUMN admin_audit_logs.ip_address IS 'IP address of admin user';
COMMENT ON COLUMN admin_audit_logs.user_agent IS 'User agent string of admin user';

-- Create function to get admin audit logs with pagination
CREATE OR REPLACE FUNCTION get_admin_audit_logs(
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_admin_id UUID DEFAULT NULL,
  p_action TEXT DEFAULT NULL,
  p_target_type TEXT DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  admin_id UUID,
  admin_email TEXT,
  admin_name TEXT,
  action TEXT,
  target_type TEXT,
  target_id UUID,
  changes JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND raw_user_meta_data->>'role' = 'admin'
  ) THEN
    RAISE EXCEPTION 'PERMISSION_DENIED: Only admin users can access audit logs';
  END IF;

  RETURN QUERY
  SELECT 
    al.id,
    al.admin_id,
    au.email as admin_email,
    COALESCE(au.raw_user_meta_data->>'name', au.email) as admin_name,
    al.action,
    al.target_type,
    al.target_id,
    al.changes,
    al.ip_address,
    al.user_agent,
    al.created_at
  FROM admin_audit_logs al
  LEFT JOIN auth.users au ON al.admin_id = au.id
  WHERE 
    (p_admin_id IS NULL OR al.admin_id = p_admin_id)
    AND (p_action IS NULL OR al.action = p_action)
    AND (p_target_type IS NULL OR al.target_type = p_target_type)
    AND (p_start_date IS NULL OR al.created_at >= p_start_date)
    AND (p_end_date IS NULL OR al.created_at <= p_end_date)
  ORDER BY al.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_admin_audit_logs TO authenticated;

COMMENT ON FUNCTION get_admin_audit_logs IS 'Get admin audit logs with filtering and pagination';