-- Migration: 110_production_security.sql
-- Production Security Enhancements
-- Features: Security hardening, audit trails, session management

-- =====================================================
-- 1. Security Audit Log Table
-- =====================================================
CREATE TABLE IF NOT EXISTS security_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL, -- 'login', 'logout', 'password_change', 'role_change', 'suspicious_activity'
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address INET,
  user_agent TEXT,
  details JSONB DEFAULT '{}',
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_audit_user ON security_audit_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_audit_type ON security_audit_log(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_audit_risk ON security_audit_log(risk_level) WHERE risk_level IN ('high', 'critical');

-- =====================================================
-- 2. User Sessions Table (Enhanced)
-- =====================================================
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token TEXT UNIQUE NOT NULL,
  device_info JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at) WHERE is_active = true;

-- =====================================================
-- 3. Failed Login Attempts Table
-- =====================================================
CREATE TABLE IF NOT EXISTS failed_login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT,
  ip_address INET,
  user_agent TEXT,
  attempt_count INTEGER DEFAULT 1,
  last_attempt TIMESTAMPTZ DEFAULT NOW(),
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_failed_logins_email ON failed_login_attempts(email, last_attempt DESC);
CREATE INDEX IF NOT EXISTS idx_failed_logins_ip ON failed_login_attempts(ip_address, last_attempt DESC);

-- =====================================================
-- 4. IP Blacklist Table
-- =====================================================
CREATE TABLE IF NOT EXISTS ip_blacklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address INET NOT NULL,
  reason TEXT,
  blocked_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ,
  is_permanent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ip_blacklist_ip ON ip_blacklist(ip_address);

-- =====================================================
-- 5. Sensitive Data Access Log
-- =====================================================
CREATE TABLE IF NOT EXISTS sensitive_data_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  data_type TEXT NOT NULL, -- 'national_id', 'bank_account', 'personal_info'
  target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- 'view', 'export', 'modify'
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sensitive_access_user ON sensitive_data_access_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sensitive_access_target ON sensitive_data_access_log(target_user_id, created_at DESC);

-- =====================================================
-- 6. Log Security Event Function
-- =====================================================
CREATE OR REPLACE FUNCTION log_security_event(
  p_event_type TEXT,
  p_user_id UUID DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_details JSONB DEFAULT '{}',
  p_risk_level TEXT DEFAULT 'low'
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO security_audit_log (
    event_type, user_id, ip_address, user_agent, details, risk_level
  ) VALUES (
    p_event_type, p_user_id, p_ip_address, p_user_agent, p_details, p_risk_level
  ) RETURNING id INTO v_event_id;
  
  -- Alert on high/critical risk events
  IF p_risk_level IN ('high', 'critical') THEN
    -- Could trigger notification here
    RAISE NOTICE 'High risk security event: % for user %', p_event_type, p_user_id;
  END IF;
  
  RETURN v_event_id;
END;
$$;

-- =====================================================
-- 7. Check Login Attempts Function
-- =====================================================
CREATE OR REPLACE FUNCTION check_login_attempts(
  p_email TEXT,
  p_ip_address INET,
  p_max_attempts INTEGER DEFAULT 5,
  p_lockout_minutes INTEGER DEFAULT 15
)
RETURNS TABLE (
  is_locked BOOLEAN,
  attempts_remaining INTEGER,
  locked_until TIMESTAMPTZ
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_record RECORD;
  v_is_locked BOOLEAN := FALSE;
  v_attempts_remaining INTEGER := p_max_attempts;
  v_locked_until TIMESTAMPTZ := NULL;
BEGIN
  -- Check by email
  SELECT * INTO v_record
  FROM failed_login_attempts
  WHERE email = p_email
    AND last_attempt > NOW() - INTERVAL '1 hour'
  ORDER BY last_attempt DESC
  LIMIT 1;
  
  IF FOUND THEN
    IF v_record.locked_until IS NOT NULL AND v_record.locked_until > NOW() THEN
      v_is_locked := TRUE;
      v_locked_until := v_record.locked_until;
      v_attempts_remaining := 0;
    ELSE
      v_attempts_remaining := GREATEST(0, p_max_attempts - v_record.attempt_count);
    END IF;
  END IF;
  
  RETURN QUERY SELECT v_is_locked, v_attempts_remaining, v_locked_until;
END;
$$;

-- =====================================================
-- 8. Record Failed Login Function
-- =====================================================
CREATE OR REPLACE FUNCTION record_failed_login(
  p_email TEXT,
  p_ip_address INET,
  p_user_agent TEXT DEFAULT NULL,
  p_max_attempts INTEGER DEFAULT 5,
  p_lockout_minutes INTEGER DEFAULT 15
)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_record RECORD;
  v_new_count INTEGER;
  v_should_lock BOOLEAN := FALSE;
BEGIN
  -- Get existing record
  SELECT * INTO v_record
  FROM failed_login_attempts
  WHERE email = p_email
    AND last_attempt > NOW() - INTERVAL '1 hour'
  ORDER BY last_attempt DESC
  LIMIT 1;
  
  IF FOUND THEN
    v_new_count := v_record.attempt_count + 1;
    v_should_lock := v_new_count >= p_max_attempts;
    
    UPDATE failed_login_attempts
    SET attempt_count = v_new_count,
        last_attempt = NOW(),
        locked_until = CASE WHEN v_should_lock 
          THEN NOW() + (p_lockout_minutes || ' minutes')::INTERVAL 
          ELSE NULL END
    WHERE id = v_record.id;
  ELSE
    INSERT INTO failed_login_attempts (email, ip_address, user_agent)
    VALUES (p_email, p_ip_address, p_user_agent);
    v_new_count := 1;
  END IF;
  
  -- Log security event
  PERFORM log_security_event(
    'failed_login',
    NULL,
    p_ip_address,
    p_user_agent,
    jsonb_build_object('email', p_email, 'attempt_count', v_new_count),
    CASE WHEN v_should_lock THEN 'high' ELSE 'medium' END
  );
  
  RETURN v_should_lock;
END;
$$;

-- =====================================================
-- 9. Clear Failed Logins Function
-- =====================================================
CREATE OR REPLACE FUNCTION clear_failed_logins(p_email TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM failed_login_attempts WHERE email = p_email;
END;
$$;

-- =====================================================
-- 10. Check IP Blacklist Function
-- =====================================================
CREATE OR REPLACE FUNCTION is_ip_blacklisted(p_ip_address INET)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM ip_blacklist
    WHERE ip_address = p_ip_address
      AND (is_permanent = true OR expires_at > NOW())
  );
END;
$$;

-- =====================================================
-- 11. Create User Session Function
-- =====================================================
CREATE OR REPLACE FUNCTION create_user_session(
  p_user_id UUID,
  p_device_info JSONB DEFAULT '{}',
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_expires_hours INTEGER DEFAULT 24
)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_session_token TEXT;
BEGIN
  -- Generate secure token
  v_session_token := encode(gen_random_bytes(32), 'hex');
  
  -- Invalidate old sessions (keep max 5 active)
  UPDATE user_sessions
  SET is_active = false
  WHERE user_id = p_user_id
    AND is_active = true
    AND id NOT IN (
      SELECT id FROM user_sessions
      WHERE user_id = p_user_id AND is_active = true
      ORDER BY last_activity DESC
      LIMIT 4
    );
  
  -- Create new session
  INSERT INTO user_sessions (
    user_id, session_token, device_info, ip_address, user_agent, expires_at
  ) VALUES (
    p_user_id, v_session_token, p_device_info, p_ip_address, p_user_agent,
    NOW() + (p_expires_hours || ' hours')::INTERVAL
  );
  
  -- Log security event
  PERFORM log_security_event(
    'login',
    p_user_id,
    p_ip_address,
    p_user_agent,
    p_device_info,
    'low'
  );
  
  RETURN v_session_token;
END;
$$;

-- =====================================================
-- 12. Validate Session Function
-- =====================================================
CREATE OR REPLACE FUNCTION validate_session(p_session_token TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT user_id INTO v_user_id
  FROM user_sessions
  WHERE session_token = p_session_token
    AND is_active = true
    AND expires_at > NOW();
  
  IF FOUND THEN
    -- Update last activity
    UPDATE user_sessions
    SET last_activity = NOW()
    WHERE session_token = p_session_token;
  END IF;
  
  RETURN v_user_id;
END;
$$;

-- =====================================================
-- 13. Invalidate Session Function
-- =====================================================
CREATE OR REPLACE FUNCTION invalidate_session(
  p_session_token TEXT,
  p_user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE user_sessions
  SET is_active = false
  WHERE session_token = p_session_token
    OR (p_user_id IS NOT NULL AND user_id = p_user_id);
  
  IF FOUND AND p_user_id IS NOT NULL THEN
    PERFORM log_security_event('logout', p_user_id, NULL, NULL, '{}', 'low');
  END IF;
  
  RETURN FOUND;
END;
$$;

-- =====================================================
-- 14. Log Sensitive Data Access Function
-- =====================================================
CREATE OR REPLACE FUNCTION log_sensitive_access(
  p_user_id UUID,
  p_data_type TEXT,
  p_target_user_id UUID,
  p_action TEXT,
  p_ip_address INET DEFAULT NULL
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO sensitive_data_access_log (
    user_id, data_type, target_user_id, action, ip_address
  ) VALUES (
    p_user_id, p_data_type, p_target_user_id, p_action, p_ip_address
  );
  
  -- Log as security event if viewing others' data
  IF p_user_id != p_target_user_id THEN
    PERFORM log_security_event(
      'sensitive_data_access',
      p_user_id,
      p_ip_address,
      NULL,
      jsonb_build_object(
        'data_type', p_data_type,
        'target_user_id', p_target_user_id,
        'action', p_action
      ),
      'medium'
    );
  END IF;
END;
$$;

-- =====================================================
-- 15. Get Security Summary Function
-- =====================================================
CREATE OR REPLACE FUNCTION get_security_summary(p_hours INTEGER DEFAULT 24)
RETURNS TABLE (
  total_logins BIGINT,
  failed_logins BIGINT,
  high_risk_events BIGINT,
  active_sessions BIGINT,
  blocked_ips BIGINT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY SELECT
    (SELECT COUNT(*) FROM security_audit_log 
     WHERE event_type = 'login' AND created_at > NOW() - (p_hours || ' hours')::INTERVAL),
    (SELECT COUNT(*) FROM security_audit_log 
     WHERE event_type = 'failed_login' AND created_at > NOW() - (p_hours || ' hours')::INTERVAL),
    (SELECT COUNT(*) FROM security_audit_log 
     WHERE risk_level IN ('high', 'critical') AND created_at > NOW() - (p_hours || ' hours')::INTERVAL),
    (SELECT COUNT(*) FROM user_sessions WHERE is_active = true AND expires_at > NOW()),
    (SELECT COUNT(*) FROM ip_blacklist WHERE is_permanent = true OR expires_at > NOW());
END;
$$;

-- =====================================================
-- 16. RLS Policies
-- =====================================================
ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE failed_login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ip_blacklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensitive_data_access_log ENABLE ROW LEVEL SECURITY;

-- Admin only policies
CREATE POLICY "Admin read security_audit_log" ON security_audit_log
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admin read failed_login_attempts" ON failed_login_attempts
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admin manage ip_blacklist" ON ip_blacklist
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admin read sensitive_data_access_log" ON sensitive_data_access_log
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Users can see their own sessions
CREATE POLICY "Users read own sessions" ON user_sessions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION log_security_event(TEXT, UUID, INET, TEXT, JSONB, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION check_login_attempts(TEXT, INET, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION record_failed_login(TEXT, INET, TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION clear_failed_logins(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION is_ip_blacklisted(INET) TO authenticated;
GRANT EXECUTE ON FUNCTION create_user_session(UUID, JSONB, INET, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_session(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION invalidate_session(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION log_sensitive_access(UUID, TEXT, UUID, TEXT, INET) TO authenticated;
GRANT EXECUTE ON FUNCTION get_security_summary(INTEGER) TO authenticated;
