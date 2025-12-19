-- Migration: 068_offline_sync.sql
-- Feature: F157 - Offline Mode Improvements
-- Description: Sync queue and conflict resolution for offline operations

-- =====================================================
-- 1. Sync Queue (for offline operations)
-- =====================================================
CREATE TABLE IF NOT EXISTS sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  
  -- Operation details
  operation_type TEXT NOT NULL CHECK (operation_type IN ('create', 'update', 'delete')),
  entity_type TEXT NOT NULL, -- 'ride_request', 'saved_place', 'rating', etc.
  entity_id UUID,
  
  -- Data
  payload JSONB NOT NULL,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'conflict')),
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  
  -- Conflict resolution
  conflict_data JSONB,
  resolved_at TIMESTAMPTZ,
  resolution_type TEXT CHECK (resolution_type IN ('client_wins', 'server_wins', 'merged', 'manual'))
);

CREATE INDEX IF NOT EXISTS idx_sync_queue_user ON sync_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status);
CREATE INDEX IF NOT EXISTS idx_sync_queue_device ON sync_queue(device_id);

-- =====================================================
-- 2. Device Sync State
-- =====================================================
CREATE TABLE IF NOT EXISTS device_sync_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  device_name TEXT,
  device_type TEXT, -- 'ios', 'android', 'web'
  
  -- Sync state
  last_sync_at TIMESTAMPTZ,
  last_sync_version BIGINT DEFAULT 0,
  pending_changes INTEGER DEFAULT 0,
  
  -- Connection
  is_online BOOLEAN DEFAULT TRUE,
  last_online_at TIMESTAMPTZ DEFAULT NOW(),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, device_id)
);

CREATE INDEX IF NOT EXISTS idx_device_sync_user ON device_sync_state(user_id);

-- =====================================================
-- 3. Sync Versions (for incremental sync)
-- =====================================================
CREATE TABLE IF NOT EXISTS sync_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  version BIGINT NOT NULL DEFAULT 1,
  checksum TEXT, -- For conflict detection
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID,
  
  UNIQUE(entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_sync_versions_entity ON sync_versions(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_sync_versions_updated ON sync_versions(updated_at);

-- =====================================================
-- 4. Offline Cache Metadata
-- =====================================================
CREATE TABLE IF NOT EXISTS offline_cache_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cache_key TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  
  -- Cache info
  cached_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  size_bytes INTEGER,
  
  -- Validation
  etag TEXT,
  last_modified TIMESTAMPTZ,
  
  UNIQUE(user_id, cache_key)
);

-- =====================================================
-- 5. Enable RLS
-- =====================================================
ALTER TABLE sync_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_sync_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE offline_cache_metadata ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users manage own sync_queue" ON sync_queue
  FOR ALL TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users manage own device_sync" ON device_sync_state
  FOR ALL TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Anyone read sync_versions" ON sync_versions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users manage own cache_metadata" ON offline_cache_metadata
  FOR ALL TO authenticated USING (user_id = auth.uid());

-- =====================================================
-- 6. Functions
-- =====================================================

-- Queue offline operation
CREATE OR REPLACE FUNCTION queue_offline_operation(
  p_user_id UUID,
  p_device_id TEXT,
  p_operation TEXT,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_payload JSONB
) RETURNS UUID AS $$
DECLARE
  v_queue_id UUID;
BEGIN
  INSERT INTO sync_queue (
    user_id, device_id, operation_type, entity_type, entity_id, payload
  ) VALUES (
    p_user_id, p_device_id, p_operation, p_entity_type, p_entity_id, p_payload
  ) RETURNING id INTO v_queue_id;
  
  -- Update device pending count
  UPDATE device_sync_state
  SET pending_changes = pending_changes + 1, updated_at = NOW()
  WHERE user_id = p_user_id AND device_id = p_device_id;
  
  RETURN v_queue_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Process sync queue item
CREATE OR REPLACE FUNCTION process_sync_item(p_queue_id UUID)
RETURNS TABLE (
  success BOOLEAN,
  conflict BOOLEAN,
  error_message TEXT,
  server_data JSONB
) AS $$
DECLARE
  v_item sync_queue%ROWTYPE;
  v_server_version BIGINT;
  v_client_version BIGINT;
  v_result BOOLEAN := FALSE;
  v_conflict BOOLEAN := FALSE;
  v_error TEXT;
  v_server_data JSONB;
BEGIN
  -- Get queue item
  SELECT * INTO v_item FROM sync_queue WHERE id = p_queue_id;
  
  IF v_item.id IS NULL THEN
    RETURN QUERY SELECT FALSE, FALSE, 'Item not found'::TEXT, NULL::JSONB;
    RETURN;
  END IF;
  
  -- Update status to processing
  UPDATE sync_queue SET status = 'processing' WHERE id = p_queue_id;
  
  -- Check for conflicts (version mismatch)
  SELECT version INTO v_server_version
  FROM sync_versions
  WHERE entity_type = v_item.entity_type AND entity_id = v_item.entity_id;
  
  v_client_version := (v_item.payload->>'_version')::BIGINT;
  
  IF v_server_version IS NOT NULL AND v_client_version IS NOT NULL 
     AND v_server_version > v_client_version THEN
    -- Conflict detected
    v_conflict := TRUE;
    
    -- Get server data for conflict resolution
    EXECUTE format(
      'SELECT row_to_json(t) FROM %I t WHERE id = $1',
      v_item.entity_type
    ) INTO v_server_data USING v_item.entity_id;
    
    UPDATE sync_queue 
    SET status = 'conflict', conflict_data = v_server_data
    WHERE id = p_queue_id;
    
    RETURN QUERY SELECT FALSE, TRUE, 'Version conflict'::TEXT, v_server_data;
    RETURN;
  END IF;
  
  -- Process operation
  BEGIN
    CASE v_item.operation_type
      WHEN 'create' THEN
        EXECUTE format(
          'INSERT INTO %I SELECT * FROM jsonb_populate_record(null::%I, $1)',
          v_item.entity_type, v_item.entity_type
        ) USING v_item.payload;
        
      WHEN 'update' THEN
        EXECUTE format(
          'UPDATE %I SET %s WHERE id = $1',
          v_item.entity_type,
          (SELECT string_agg(format('%I = $2->>%L', key, key), ', ') 
           FROM jsonb_object_keys(v_item.payload - '_version') AS key)
        ) USING v_item.entity_id, v_item.payload;
        
      WHEN 'delete' THEN
        EXECUTE format('DELETE FROM %I WHERE id = $1', v_item.entity_type)
        USING v_item.entity_id;
    END CASE;
    
    v_result := TRUE;
    
    -- Update sync version
    INSERT INTO sync_versions (entity_type, entity_id, version, updated_by)
    VALUES (v_item.entity_type, v_item.entity_id, COALESCE(v_server_version, 0) + 1, v_item.user_id)
    ON CONFLICT (entity_type, entity_id) DO UPDATE SET
      version = sync_versions.version + 1,
      updated_at = NOW(),
      updated_by = v_item.user_id;
    
    -- Mark as completed
    UPDATE sync_queue SET status = 'completed', processed_at = NOW() WHERE id = p_queue_id;
    
    -- Update device pending count
    UPDATE device_sync_state
    SET pending_changes = GREATEST(0, pending_changes - 1), 
        last_sync_at = NOW(),
        updated_at = NOW()
    WHERE user_id = v_item.user_id AND device_id = v_item.device_id;
    
  EXCEPTION WHEN OTHERS THEN
    v_error := SQLERRM;
    UPDATE sync_queue 
    SET status = 'failed', 
        error_message = v_error,
        retry_count = retry_count + 1
    WHERE id = p_queue_id;
  END;
  
  RETURN QUERY SELECT v_result, v_conflict, v_error, v_server_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Resolve conflict
CREATE OR REPLACE FUNCTION resolve_sync_conflict(
  p_queue_id UUID,
  p_resolution TEXT, -- 'client_wins', 'server_wins', 'merged'
  p_merged_data JSONB DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_item sync_queue%ROWTYPE;
BEGIN
  SELECT * INTO v_item FROM sync_queue WHERE id = p_queue_id AND status = 'conflict';
  
  IF v_item.id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  CASE p_resolution
    WHEN 'client_wins' THEN
      -- Force client data
      UPDATE sync_queue SET payload = v_item.payload, status = 'pending' WHERE id = p_queue_id;
      PERFORM process_sync_item(p_queue_id);
      
    WHEN 'server_wins' THEN
      -- Discard client changes
      UPDATE sync_queue 
      SET status = 'completed', 
          resolved_at = NOW(), 
          resolution_type = 'server_wins'
      WHERE id = p_queue_id;
      
    WHEN 'merged' THEN
      -- Use merged data
      IF p_merged_data IS NULL THEN
        RETURN FALSE;
      END IF;
      UPDATE sync_queue SET payload = p_merged_data, status = 'pending' WHERE id = p_queue_id;
      PERFORM process_sync_item(p_queue_id);
  END CASE;
  
  UPDATE sync_queue SET resolution_type = p_resolution, resolved_at = NOW() WHERE id = p_queue_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get changes since version
CREATE OR REPLACE FUNCTION get_changes_since(
  p_user_id UUID,
  p_entity_type TEXT,
  p_since_version BIGINT
) RETURNS TABLE (
  entity_id UUID,
  version BIGINT,
  data JSONB,
  operation TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sv.entity_id,
    sv.version,
    (SELECT row_to_json(t) FROM (
      SELECT * FROM ride_requests WHERE id = sv.entity_id
      UNION ALL SELECT * FROM saved_places WHERE id = sv.entity_id
      -- Add more entity types as needed
    ) t LIMIT 1)::JSONB as data,
    CASE WHEN sv.version = 1 THEN 'create' ELSE 'update' END as operation
  FROM sync_versions sv
  WHERE sv.entity_type = p_entity_type
    AND sv.version > p_since_version
  ORDER BY sv.version;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Register device
CREATE OR REPLACE FUNCTION register_device(
  p_user_id UUID,
  p_device_id TEXT,
  p_device_name TEXT,
  p_device_type TEXT
) RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO device_sync_state (user_id, device_id, device_name, device_type)
  VALUES (p_user_id, p_device_id, p_device_name, p_device_type)
  ON CONFLICT (user_id, device_id) DO UPDATE SET
    device_name = p_device_name,
    device_type = p_device_type,
    is_online = TRUE,
    last_online_at = NOW(),
    updated_at = NOW()
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update device online status
CREATE OR REPLACE FUNCTION update_device_status(
  p_user_id UUID,
  p_device_id TEXT,
  p_is_online BOOLEAN
) RETURNS void AS $$
BEGIN
  UPDATE device_sync_state
  SET is_online = p_is_online,
      last_online_at = CASE WHEN p_is_online THEN NOW() ELSE last_online_at END,
      updated_at = NOW()
  WHERE user_id = p_user_id AND device_id = p_device_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON TABLE sync_queue IS 'Queue for offline operations pending sync';
COMMENT ON TABLE device_sync_state IS 'Sync state per device';
COMMENT ON TABLE sync_versions IS 'Version tracking for conflict detection';
COMMENT ON TABLE offline_cache_metadata IS 'Metadata for offline cached data';
