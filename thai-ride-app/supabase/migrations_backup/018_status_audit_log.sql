-- Migration: 018_status_audit_log.sql
-- Feature: F30 - Status Change Audit Log
-- Description: บันทึกทุกการเปลี่ยนสถานะพร้อม timestamp และ user ที่ทำ

-- =====================================================
-- STATUS AUDIT LOG TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS status_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Entity reference
  entity_type TEXT NOT NULL CHECK (entity_type IN ('ride', 'delivery', 'shopping', 'provider', 'user', 'withdrawal', 'support_ticket')),
  entity_id UUID NOT NULL,
  tracking_id TEXT,
  
  -- Status change
  old_status TEXT,
  new_status TEXT NOT NULL,
  
  -- Who made the change
  changed_by UUID REFERENCES users(id),
  changed_by_role TEXT CHECK (changed_by_role IN ('customer', 'provider', 'admin', 'system')),
  changed_by_name TEXT,
  
  -- Additional context
  reason TEXT,
  metadata JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX idx_audit_entity ON status_audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_created_at ON status_audit_log(created_at DESC);
CREATE INDEX idx_audit_changed_by ON status_audit_log(changed_by);
CREATE INDEX idx_audit_tracking_id ON status_audit_log(tracking_id);
CREATE INDEX idx_audit_new_status ON status_audit_log(new_status);

-- =====================================================
-- FUNCTION: Log status change
-- =====================================================

CREATE OR REPLACE FUNCTION log_status_change(
  p_entity_type TEXT,
  p_entity_id UUID,
  p_old_status TEXT,
  p_new_status TEXT,
  p_changed_by UUID DEFAULT NULL,
  p_changed_by_role TEXT DEFAULT 'system',
  p_reason TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id UUID;
  v_changed_by_name TEXT;
  v_tracking_id TEXT;
BEGIN
  -- Get user name if available
  IF p_changed_by IS NOT NULL THEN
    SELECT name INTO v_changed_by_name FROM users WHERE id = p_changed_by;
  END IF;
  
  -- Try to get tracking_id based on entity type
  CASE p_entity_type
    WHEN 'ride' THEN
      SELECT tracking_id INTO v_tracking_id FROM ride_requests WHERE id = p_entity_id;
    WHEN 'delivery' THEN
      SELECT tracking_id INTO v_tracking_id FROM delivery_requests WHERE id = p_entity_id;
    WHEN 'shopping' THEN
      SELECT tracking_id INTO v_tracking_id FROM shopping_requests WHERE id = p_entity_id;
    ELSE
      v_tracking_id := NULL;
  END CASE;
  
  -- Insert audit log
  INSERT INTO status_audit_log (
    entity_type,
    entity_id,
    tracking_id,
    old_status,
    new_status,
    changed_by,
    changed_by_role,
    changed_by_name,
    reason,
    metadata
  ) VALUES (
    p_entity_type,
    p_entity_id,
    v_tracking_id,
    p_old_status,
    p_new_status,
    p_changed_by,
    p_changed_by_role,
    v_changed_by_name,
    p_reason,
    p_metadata
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- =====================================================
-- TRIGGERS: Auto-log status changes
-- =====================================================

-- Ride requests status change trigger
CREATE OR REPLACE FUNCTION trigger_ride_status_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM log_status_change(
      'ride',
      NEW.id,
      OLD.status,
      NEW.status,
      COALESCE(NEW.provider_id, NEW.user_id),
      CASE 
        WHEN NEW.provider_id IS NOT NULL AND OLD.status = 'pending' THEN 'provider'
        WHEN NEW.status = 'cancelled' THEN 'customer'
        ELSE 'system'
      END,
      NULL,
      jsonb_build_object(
        'pickup_address', NEW.pickup_address,
        'destination_address', NEW.destination_address,
        'estimated_fare', NEW.estimated_fare
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ride_status_audit_trigger ON ride_requests;
CREATE TRIGGER ride_status_audit_trigger
  AFTER UPDATE ON ride_requests
  FOR EACH ROW
  EXECUTE FUNCTION trigger_ride_status_audit();

-- Delivery requests status change trigger
CREATE OR REPLACE FUNCTION trigger_delivery_status_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM log_status_change(
      'delivery',
      NEW.id,
      OLD.status,
      NEW.status,
      COALESCE(NEW.provider_id, NEW.user_id),
      CASE 
        WHEN NEW.provider_id IS NOT NULL AND OLD.status = 'pending' THEN 'provider'
        WHEN NEW.status = 'cancelled' THEN 'customer'
        ELSE 'system'
      END,
      NULL,
      jsonb_build_object(
        'sender_address', NEW.sender_address,
        'recipient_address', NEW.recipient_address,
        'estimated_fee', NEW.estimated_fee
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS delivery_status_audit_trigger ON delivery_requests;
CREATE TRIGGER delivery_status_audit_trigger
  AFTER UPDATE ON delivery_requests
  FOR EACH ROW
  EXECUTE FUNCTION trigger_delivery_status_audit();

-- Shopping requests status change trigger
CREATE OR REPLACE FUNCTION trigger_shopping_status_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM log_status_change(
      'shopping',
      NEW.id,
      OLD.status,
      NEW.status,
      COALESCE(NEW.provider_id, NEW.user_id),
      CASE 
        WHEN NEW.provider_id IS NOT NULL AND OLD.status = 'pending' THEN 'provider'
        WHEN NEW.status = 'cancelled' THEN 'customer'
        ELSE 'system'
      END,
      NULL,
      jsonb_build_object(
        'store_name', NEW.store_name,
        'delivery_address', NEW.delivery_address,
        'estimated_total', NEW.estimated_total
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS shopping_status_audit_trigger ON shopping_requests;
CREATE TRIGGER shopping_status_audit_trigger
  AFTER UPDATE ON shopping_requests
  FOR EACH ROW
  EXECUTE FUNCTION trigger_shopping_status_audit();

-- Provider withdrawals status change trigger
CREATE OR REPLACE FUNCTION trigger_withdrawal_status_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM log_status_change(
      'withdrawal',
      NEW.id,
      OLD.status,
      NEW.status,
      NEW.provider_id,
      CASE 
        WHEN NEW.status IN ('approved', 'rejected') THEN 'admin'
        ELSE 'provider'
      END,
      NEW.rejection_reason,
      jsonb_build_object(
        'amount', NEW.amount,
        'bank_account_id', NEW.bank_account_id
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS withdrawal_status_audit_trigger ON provider_withdrawals;
CREATE TRIGGER withdrawal_status_audit_trigger
  AFTER UPDATE ON provider_withdrawals
  FOR EACH ROW
  EXECUTE FUNCTION trigger_withdrawal_status_audit();

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE status_audit_log ENABLE ROW LEVEL SECURITY;

-- Admin can see all audit logs
CREATE POLICY "Admin can view all audit logs"
  ON status_audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Users can see audit logs for their own entities
CREATE POLICY "Users can view own audit logs"
  ON status_audit_log FOR SELECT
  TO authenticated
  USING (
    changed_by = auth.uid()
    OR entity_id IN (
      SELECT id FROM ride_requests WHERE user_id = auth.uid()
      UNION
      SELECT id FROM delivery_requests WHERE user_id = auth.uid()
      UNION
      SELECT id FROM shopping_requests WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Get audit trail for an entity
CREATE OR REPLACE FUNCTION get_entity_audit_trail(
  p_entity_type TEXT,
  p_entity_id UUID
)
RETURNS TABLE (
  id UUID,
  old_status TEXT,
  new_status TEXT,
  changed_by_name TEXT,
  changed_by_role TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    id,
    old_status,
    new_status,
    changed_by_name,
    changed_by_role,
    reason,
    created_at
  FROM status_audit_log
  WHERE entity_type = p_entity_type
    AND entity_id = p_entity_id
  ORDER BY created_at ASC;
$$;

-- Get recent status changes (for Admin dashboard)
CREATE OR REPLACE FUNCTION get_recent_status_changes(
  p_limit INT DEFAULT 50,
  p_entity_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  entity_type TEXT,
  entity_id UUID,
  tracking_id TEXT,
  old_status TEXT,
  new_status TEXT,
  changed_by_name TEXT,
  changed_by_role TEXT,
  reason TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    id,
    entity_type,
    entity_id,
    tracking_id,
    old_status,
    new_status,
    changed_by_name,
    changed_by_role,
    reason,
    metadata,
    created_at
  FROM status_audit_log
  WHERE (p_entity_type IS NULL OR entity_type = p_entity_type)
  ORDER BY created_at DESC
  LIMIT p_limit;
$$;

-- Get status change statistics
CREATE OR REPLACE FUNCTION get_status_change_stats(
  p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '7 days',
  p_end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  entity_type TEXT,
  status TEXT,
  change_count BIGINT,
  by_customer BIGINT,
  by_provider BIGINT,
  by_admin BIGINT,
  by_system BIGINT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    entity_type,
    new_status as status,
    COUNT(*) as change_count,
    COUNT(*) FILTER (WHERE changed_by_role = 'customer') as by_customer,
    COUNT(*) FILTER (WHERE changed_by_role = 'provider') as by_provider,
    COUNT(*) FILTER (WHERE changed_by_role = 'admin') as by_admin,
    COUNT(*) FILTER (WHERE changed_by_role = 'system') as by_system
  FROM status_audit_log
  WHERE created_at BETWEEN p_start_date AND p_end_date
  GROUP BY entity_type, new_status
  ORDER BY entity_type, change_count DESC;
$$;
