-- Migration: 116_production_deployment.sql
-- Production Deployment Management
-- Features: Deployment tracking, rollback, feature toggles

-- =====================================================
-- Deployment History Table
-- =====================================================
CREATE TABLE IF NOT EXISTS deployment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL,
  environment TEXT NOT NULL DEFAULT 'production',
  status TEXT DEFAULT 'pending', -- pending, deploying, success, failed, rolled_back
  deployed_by UUID REFERENCES users(id),
  commit_hash TEXT,
  release_notes TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  rollback_to UUID REFERENCES deployment_history(id),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deployment_history_env ON deployment_history(environment);
CREATE INDEX IF NOT EXISTS idx_deployment_history_status ON deployment_history(status);
CREATE INDEX IF NOT EXISTS idx_deployment_history_version ON deployment_history(version);

-- =====================================================
-- Environment Configuration
-- =====================================================
CREATE TABLE IF NOT EXISTS environment_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  environment TEXT NOT NULL,
  config_key TEXT NOT NULL,
  config_value TEXT,
  is_secret BOOLEAN DEFAULT false,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(environment, config_key)
);

-- =====================================================
-- Maintenance Windows
-- =====================================================
CREATE TABLE IF NOT EXISTS maintenance_windows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT false,
  affected_services TEXT[],
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_maintenance_windows_active ON maintenance_windows(is_active);
CREATE INDEX IF NOT EXISTS idx_maintenance_windows_time ON maintenance_windows(start_time, end_time);

-- =====================================================
-- Function: Start Deployment
-- =====================================================
CREATE OR REPLACE FUNCTION start_deployment(
  p_version TEXT,
  p_environment TEXT,
  p_deployed_by UUID,
  p_commit_hash TEXT DEFAULT NULL,
  p_release_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deployment_id UUID;
BEGIN
  INSERT INTO deployment_history (
    version, environment, deployed_by, commit_hash, release_notes, status
  ) VALUES (
    p_version, p_environment, p_deployed_by, p_commit_hash, p_release_notes, 'deploying'
  )
  RETURNING id INTO v_deployment_id;
  
  RETURN v_deployment_id;
END;
$$;

-- =====================================================
-- Function: Complete Deployment
-- =====================================================
CREATE OR REPLACE FUNCTION complete_deployment(
  p_deployment_id UUID,
  p_success BOOLEAN,
  p_error_message TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE deployment_history
  SET status = CASE WHEN p_success THEN 'success' ELSE 'failed' END,
      completed_at = NOW(),
      error_message = p_error_message
  WHERE id = p_deployment_id;
  
  RETURN FOUND;
END;
$$;

-- =====================================================
-- Function: Rollback Deployment
-- =====================================================
CREATE OR REPLACE FUNCTION rollback_deployment(
  p_deployment_id UUID,
  p_rollback_to UUID,
  p_admin_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_target RECORD;
  v_new_deployment_id UUID;
BEGIN
  -- Get target deployment
  SELECT * INTO v_target FROM deployment_history WHERE id = p_rollback_to;
  
  IF v_target IS NULL THEN
    RAISE EXCEPTION 'Target deployment not found';
  END IF;
  
  -- Mark current as rolled back
  UPDATE deployment_history
  SET status = 'rolled_back'
  WHERE id = p_deployment_id;
  
  -- Create new deployment for rollback
  INSERT INTO deployment_history (
    version, environment, deployed_by, commit_hash, 
    release_notes, status, rollback_to
  ) VALUES (
    v_target.version, v_target.environment, p_admin_id, v_target.commit_hash,
    'Rollback to ' || v_target.version, 'deploying', p_rollback_to
  )
  RETURNING id INTO v_new_deployment_id;
  
  RETURN v_new_deployment_id;
END;
$$;

-- =====================================================
-- Function: Check Maintenance Mode
-- =====================================================
CREATE OR REPLACE FUNCTION is_maintenance_mode()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM maintenance_windows
    WHERE is_active = true
      AND NOW() BETWEEN start_time AND end_time
  );
END;
$$;

-- =====================================================
-- Function: Get Current Deployment
-- =====================================================
CREATE OR REPLACE FUNCTION get_current_deployment(
  p_environment TEXT DEFAULT 'production'
)
RETURNS TABLE (
  id UUID,
  version TEXT,
  status TEXT,
  deployed_at TIMESTAMPTZ,
  commit_hash TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dh.id,
    dh.version,
    dh.status,
    dh.completed_at as deployed_at,
    dh.commit_hash
  FROM deployment_history dh
  WHERE dh.environment = p_environment
    AND dh.status = 'success'
  ORDER BY dh.completed_at DESC
  LIMIT 1;
END;
$$;

-- Enable RLS
ALTER TABLE deployment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE environment_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_windows ENABLE ROW LEVEL SECURITY;

-- Admin policies
CREATE POLICY "Admin can manage deployment_history" ON deployment_history
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admin can manage environment_config" ON environment_config
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admin can manage maintenance_windows" ON maintenance_windows
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
