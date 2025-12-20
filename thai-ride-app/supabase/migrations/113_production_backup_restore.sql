-- Migration: 113_production_backup_restore.sql
-- Production Backup & Data Management
-- Features: Data export, soft delete, archiving

-- =====================================================
-- 1. Archived Data Tables
-- =====================================================

-- Archived ride requests
CREATE TABLE IF NOT EXISTS archived_ride_requests (
  LIKE ride_requests INCLUDING ALL,
  archived_at TIMESTAMPTZ DEFAULT NOW(),
  archived_by UUID REFERENCES auth.users(id),
  archive_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_archived_rides_date ON archived_ride_requests(archived_at DESC);

-- Archived delivery requests
CREATE TABLE IF NOT EXISTS archived_delivery_requests (
  LIKE delivery_requests INCLUDING ALL,
  archived_at TIMESTAMPTZ DEFAULT NOW(),
  archived_by UUID REFERENCES auth.users(id),
  archive_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_archived_deliveries_date ON archived_delivery_requests(archived_at DESC);

-- =====================================================
-- 2. Data Export Log
-- =====================================================
CREATE TABLE IF NOT EXISTS data_export_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  export_type TEXT NOT NULL, -- 'users', 'rides', 'transactions', 'full'
  requested_by UUID NOT NULL REFERENCES auth.users(id),
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  file_path TEXT,
  file_size_bytes BIGINT,
  record_count INTEGER,
  filters JSONB DEFAULT '{}',
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_export_log_user ON data_export_log(requested_by, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_export_log_status ON data_export_log(status);

-- =====================================================
-- 3. Soft Delete Support
-- =====================================================

-- Add soft delete columns to main tables if not exists
DO $$ 
BEGIN
  -- Users
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'deleted_at') THEN
    ALTER TABLE users ADD COLUMN deleted_at TIMESTAMPTZ;
    ALTER TABLE users ADD COLUMN deleted_by UUID REFERENCES auth.users(id);
  END IF;
  
  -- Service Providers
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_providers' AND column_name = 'deleted_at') THEN
    ALTER TABLE service_providers ADD COLUMN deleted_at TIMESTAMPTZ;
    ALTER TABLE service_providers ADD COLUMN deleted_by UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- =====================================================
-- 4. Archive Old Rides Function
-- =====================================================
CREATE OR REPLACE FUNCTION archive_old_rides(
  p_days_old INTEGER DEFAULT 365,
  p_admin_id UUID DEFAULT NULL
)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Move old completed/cancelled rides to archive
  WITH moved AS (
    DELETE FROM ride_requests
    WHERE status IN ('completed', 'cancelled')
      AND created_at < NOW() - (p_days_old || ' days')::INTERVAL
    RETURNING *
  )
  INSERT INTO archived_ride_requests 
  SELECT *, NOW(), p_admin_id, 'Auto-archived after ' || p_days_old || ' days'
  FROM moved;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  -- Log the operation
  INSERT INTO admin_audit_log (admin_id, action, entity_type, details)
  VALUES (p_admin_id, 'archive', 'ride_requests', 
    jsonb_build_object('count', v_count, 'days_old', p_days_old));
  
  RETURN v_count;
END;
$$;

-- =====================================================
-- 5. Soft Delete User Function
-- =====================================================
CREATE OR REPLACE FUNCTION soft_delete_user(
  p_user_id UUID,
  p_admin_id UUID
)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Soft delete user
  UPDATE users
  SET deleted_at = NOW(),
      deleted_by = p_admin_id,
      email = 'deleted_' || id || '@deleted.local',
      phone_number = NULL,
      first_name = 'Deleted',
      last_name = 'User'
  WHERE id = p_user_id AND deleted_at IS NULL;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Soft delete provider if exists
  UPDATE service_providers
  SET deleted_at = NOW(),
      deleted_by = p_admin_id,
      status = 'suspended'
  WHERE user_id = p_user_id AND deleted_at IS NULL;
  
  -- Log the operation
  INSERT INTO admin_audit_log (admin_id, action, entity_type, entity_id, details)
  VALUES (p_admin_id, 'soft_delete', 'users', p_user_id, 
    jsonb_build_object('reason', 'Admin soft delete'));
  
  RETURN TRUE;
END;
$$;

-- =====================================================
-- 6. Restore Soft Deleted User Function
-- =====================================================
CREATE OR REPLACE FUNCTION restore_deleted_user(
  p_user_id UUID,
  p_admin_id UUID
)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE users
  SET deleted_at = NULL,
      deleted_by = NULL
  WHERE id = p_user_id AND deleted_at IS NOT NULL;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Log the operation
  INSERT INTO admin_audit_log (admin_id, action, entity_type, entity_id, details)
  VALUES (p_admin_id, 'restore', 'users', p_user_id, 
    jsonb_build_object('reason', 'Admin restore'));
  
  RETURN TRUE;
END;
$$;

-- =====================================================
-- 7. Export User Data Function (GDPR)
-- =====================================================
CREATE OR REPLACE FUNCTION export_user_data(p_user_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'user', (SELECT row_to_json(u.*) FROM users u WHERE u.id = p_user_id),
    'rides', (SELECT COALESCE(jsonb_agg(row_to_json(r.*)), '[]'::jsonb) 
              FROM ride_requests r WHERE r.customer_id = p_user_id),
    'deliveries', (SELECT COALESCE(jsonb_agg(row_to_json(d.*)), '[]'::jsonb) 
                   FROM delivery_requests d WHERE d.customer_id = p_user_id),
    'wallet', (SELECT row_to_json(w.*) FROM user_wallets w WHERE w.user_id = p_user_id),
    'transactions', (SELECT COALESCE(jsonb_agg(row_to_json(t.*)), '[]'::jsonb) 
                     FROM wallet_transactions t WHERE t.user_id = p_user_id),
    'ratings_given', (SELECT COALESCE(jsonb_agg(row_to_json(rr.*)), '[]'::jsonb) 
                      FROM ride_ratings rr WHERE rr.customer_id = p_user_id),
    'notifications', (SELECT COALESCE(jsonb_agg(row_to_json(n.*)), '[]'::jsonb) 
                      FROM user_notifications n WHERE n.user_id = p_user_id),
    'exported_at', NOW()
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;

-- =====================================================
-- 8. Request Data Export Function
-- =====================================================
CREATE OR REPLACE FUNCTION request_data_export(
  p_export_type TEXT,
  p_admin_id UUID,
  p_filters JSONB DEFAULT '{}'
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_export_id UUID;
BEGIN
  INSERT INTO data_export_log (export_type, requested_by, status, filters, expires_at)
  VALUES (p_export_type, p_admin_id, 'pending', p_filters, NOW() + INTERVAL '7 days')
  RETURNING id INTO v_export_id;
  
  RETURN v_export_id;
END;
$$;

-- =====================================================
-- 9. Get Data Statistics Function
-- =====================================================
CREATE OR REPLACE FUNCTION get_data_statistics()
RETURNS TABLE (
  table_name TEXT,
  row_count BIGINT,
  size_bytes BIGINT,
  oldest_record TIMESTAMPTZ,
  newest_record TIMESTAMPTZ
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'users'::TEXT,
    (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL),
    pg_relation_size('users'),
    (SELECT MIN(created_at) FROM users),
    (SELECT MAX(created_at) FROM users)
  UNION ALL
  SELECT 
    'ride_requests'::TEXT,
    (SELECT COUNT(*) FROM ride_requests),
    pg_relation_size('ride_requests'),
    (SELECT MIN(created_at) FROM ride_requests),
    (SELECT MAX(created_at) FROM ride_requests)
  UNION ALL
  SELECT 
    'delivery_requests'::TEXT,
    (SELECT COUNT(*) FROM delivery_requests),
    pg_relation_size('delivery_requests'),
    (SELECT MIN(created_at) FROM delivery_requests),
    (SELECT MAX(created_at) FROM delivery_requests)
  UNION ALL
  SELECT 
    'wallet_transactions'::TEXT,
    (SELECT COUNT(*) FROM wallet_transactions),
    pg_relation_size('wallet_transactions'),
    (SELECT MIN(created_at) FROM wallet_transactions),
    (SELECT MAX(created_at) FROM wallet_transactions)
  UNION ALL
  SELECT 
    'service_providers'::TEXT,
    (SELECT COUNT(*) FROM service_providers WHERE deleted_at IS NULL),
    pg_relation_size('service_providers'),
    (SELECT MIN(created_at) FROM service_providers),
    (SELECT MAX(created_at) FROM service_providers);
END;
$$;

-- =====================================================
-- 10. Cleanup Expired Exports Function
-- =====================================================
CREATE OR REPLACE FUNCTION cleanup_expired_exports()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  DELETE FROM data_export_log
  WHERE expires_at < NOW() AND status = 'completed';
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- =====================================================
-- 11. RLS Policies
-- =====================================================
ALTER TABLE archived_ride_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE archived_delivery_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_export_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin read archived_ride_requests" ON archived_ride_requests
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admin read archived_delivery_requests" ON archived_delivery_requests
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admin manage data_export_log" ON data_export_log
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION archive_old_rides(INTEGER, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION soft_delete_user(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION restore_deleted_user(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION export_user_data(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION request_data_export(TEXT, UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION get_data_statistics() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_exports() TO authenticated;
