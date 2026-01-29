-- =====================================================
-- Admin Customer History Functions
-- =====================================================
-- Date: 2026-01-29
-- Purpose: ดูประวัติออเดอร์และการเปลี่ยนแปลงข้อมูลของลูกค้า
-- =====================================================

-- =====================================================
-- 1. Function: admin_get_customer_orders
-- =====================================================
-- Purpose: ดึงประวัติออเดอร์ทั้งหมดของลูกค้า (Ride, Queue, Shopping, Delivery)
-- Returns: รายการออเดอร์พร้อมข้อมูลสำคัญ

CREATE OR REPLACE FUNCTION admin_get_customer_orders(
  p_customer_id UUID,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  order_type TEXT,
  order_number TEXT,
  status TEXT,
  total_fare NUMERIC,
  pickup_address TEXT,
  dropoff_address TEXT,
  provider_name TEXT,
  created_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_role TEXT;
BEGIN
  -- Check admin role
  SELECT role INTO v_user_role
  FROM users
  WHERE id = auth.uid();

  IF v_user_role IS NULL OR v_user_role != 'admin' THEN
    RETURN; -- Not authorized
  END IF;

  -- Return combined orders from all service types
  RETURN QUERY
  (
    -- Ride Requests
    SELECT 
      rr.id,
      'ride'::TEXT as order_type,
      COALESCE(rr.tracking_id, rr.id::TEXT) as order_number,
      rr.status,
      COALESCE(rr.total_fare, 0) as total_fare,
      COALESCE(rr.pickup_address, '-') as pickup_address,
      COALESCE(rr.dropoff_address, '-') as dropoff_address,
      COALESCE(u.full_name, 'ไม่ระบุ') as provider_name,
      rr.created_at,
      rr.completed_at
    FROM ride_requests rr
    LEFT JOIN providers_v2 p ON p.id = rr.provider_id
    LEFT JOIN users u ON u.id = p.user_id
    WHERE rr.customer_id = p_customer_id

    UNION ALL

    -- Queue Bookings
    SELECT 
      qb.id,
      'queue'::TEXT as order_type,
      COALESCE(qb.tracking_id, qb.id::TEXT) as order_number,
      qb.status,
      COALESCE(qb.total_fare, 0) as total_fare,
      COALESCE(qb.pickup_address, '-') as pickup_address,
      COALESCE(qb.dropoff_address, '-') as dropoff_address,
      COALESCE(u.full_name, 'ไม่ระบุ') as provider_name,
      qb.created_at,
      qb.completed_at
    FROM queue_bookings qb
    LEFT JOIN providers_v2 p ON p.id = qb.provider_id
    LEFT JOIN users u ON u.id = p.user_id
    WHERE qb.customer_id = p_customer_id

    UNION ALL

    -- Shopping Requests
    SELECT 
      sr.id,
      'shopping'::TEXT as order_type,
      COALESCE(sr.tracking_id, sr.id::TEXT) as order_number,
      sr.status,
      COALESCE(sr.total_fare, 0) as total_fare,
      COALESCE(sr.store_address, '-') as pickup_address,
      COALESCE(sr.delivery_address, '-') as dropoff_address,
      COALESCE(u.full_name, 'ไม่ระบุ') as provider_name,
      sr.created_at,
      sr.completed_at
    FROM shopping_requests sr
    LEFT JOIN providers_v2 p ON p.id = sr.provider_id
    LEFT JOIN users u ON u.id = p.user_id
    WHERE sr.customer_id = p_customer_id

    UNION ALL

    -- Delivery Requests
    SELECT 
      dr.id,
      'delivery'::TEXT as order_type,
      COALESCE(dr.tracking_id, dr.id::TEXT) as order_number,
      dr.status,
      COALESCE(dr.total_fare, 0) as total_fare,
      COALESCE(dr.pickup_address, '-') as pickup_address,
      COALESCE(dr.dropoff_address, '-') as dropoff_address,
      COALESCE(u.full_name, 'ไม่ระบุ') as provider_name,
      dr.created_at,
      dr.completed_at
    FROM delivery_requests dr
    LEFT JOIN providers_v2 p ON p.id = dr.provider_id
    LEFT JOIN users u ON u.id = p.user_id
    WHERE dr.customer_id = p_customer_id
  )
  ORDER BY created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION admin_get_customer_orders TO authenticated;

-- Add comment
COMMENT ON FUNCTION admin_get_customer_orders IS 'Admin: ดึงประวัติออเดอร์ทั้งหมดของลูกค้า';

-- =====================================================
-- 2. Function: admin_get_customer_history
-- =====================================================
-- Purpose: ดึงประวัติการเปลี่ยนแปลงข้อมูลของลูกค้า (ชื่อ, เบอร์โทร, อีเมล)
-- Returns: รายการการเปลี่ยนแปลงพร้อมข้อมูลผู้ทำการเปลี่ยนแปลง

CREATE OR REPLACE FUNCTION admin_get_customer_history(
  p_customer_id UUID,
  p_limit INT DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  change_type TEXT,
  field_name TEXT,
  old_value TEXT,
  new_value TEXT,
  changed_by UUID,
  changed_by_name TEXT,
  changed_at TIMESTAMPTZ,
  reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_role TEXT;
BEGIN
  -- Check admin role
  SELECT role INTO v_user_role
  FROM users
  WHERE id = auth.uid();

  IF v_user_role IS NULL OR v_user_role != 'admin' THEN
    RETURN; -- Not authorized
  END IF;

  -- Return customer history changes
  RETURN QUERY
  SELECT 
    ch.id,
    ch.change_type,
    ch.field_name,
    ch.old_value,
    ch.new_value,
    ch.changed_by,
    COALESCE(u.full_name, u.email, 'System') as changed_by_name,
    ch.changed_at,
    ch.reason
  FROM customer_history ch
  LEFT JOIN users u ON u.id = ch.changed_by
  WHERE ch.customer_id = p_customer_id
  ORDER BY ch.changed_at DESC
  LIMIT p_limit;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION admin_get_customer_history TO authenticated;

-- Add comment
COMMENT ON FUNCTION admin_get_customer_history IS 'Admin: ดึงประวัติการเปลี่ยนแปลงข้อมูลของลูกค้า';

-- =====================================================
-- 3. Table: customer_history
-- =====================================================
-- Purpose: เก็บประวัติการเปลี่ยนแปลงข้อมูลของลูกค้า

CREATE TABLE IF NOT EXISTS customer_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  change_type TEXT NOT NULL CHECK (change_type IN ('profile_update', 'phone_change', 'email_change', 'suspension', 'unsuspension')),
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_by UUID REFERENCES users(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_customer_history_customer_id ON customer_history(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_history_changed_at ON customer_history(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_history_change_type ON customer_history(change_type);

-- Enable RLS
ALTER TABLE customer_history ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Admin can view all
CREATE POLICY "admin_view_customer_history" ON customer_history
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policy: System can insert
CREATE POLICY "system_insert_customer_history" ON customer_history
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Add comment
COMMENT ON TABLE customer_history IS 'เก็บประวัติการเปลี่ยนแปลงข้อมูลของลูกค้า';

-- =====================================================
-- 4. Trigger: Log profile changes
-- =====================================================
-- Purpose: บันทึกการเปลี่ยนแปลงข้อมูลโปรไฟล์ลูกค้าอัตโนมัติ

CREATE OR REPLACE FUNCTION log_customer_profile_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Log full_name change
  IF OLD.full_name IS DISTINCT FROM NEW.full_name THEN
    INSERT INTO customer_history (
      customer_id,
      change_type,
      field_name,
      old_value,
      new_value,
      changed_by
    ) VALUES (
      NEW.id,
      'profile_update',
      'full_name',
      OLD.full_name,
      NEW.full_name,
      auth.uid()
    );
  END IF;

  -- Log phone_number change
  IF OLD.phone_number IS DISTINCT FROM NEW.phone_number THEN
    INSERT INTO customer_history (
      customer_id,
      change_type,
      field_name,
      old_value,
      new_value,
      changed_by
    ) VALUES (
      NEW.id,
      'phone_change',
      'phone_number',
      OLD.phone_number,
      NEW.phone_number,
      auth.uid()
    );
  END IF;

  -- Log email change
  IF OLD.email IS DISTINCT FROM NEW.email THEN
    INSERT INTO customer_history (
      customer_id,
      change_type,
      field_name,
      old_value,
      new_value,
      changed_by
    ) VALUES (
      NEW.id,
      'email_change',
      'email',
      OLD.email,
      NEW.email,
      auth.uid()
    );
  END IF;

  -- Log status change (suspension/unsuspension)
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'suspended' THEN
      INSERT INTO customer_history (
        customer_id,
        change_type,
        field_name,
        old_value,
        new_value,
        changed_by,
        reason
      ) VALUES (
        NEW.id,
        'suspension',
        'status',
        OLD.status,
        NEW.status,
        auth.uid(),
        NEW.suspension_reason
      );
    ELSIF OLD.status = 'suspended' AND NEW.status = 'active' THEN
      INSERT INTO customer_history (
        customer_id,
        change_type,
        field_name,
        old_value,
        new_value,
        changed_by
      ) VALUES (
        NEW.id,
        'unsuspension',
        'status',
        OLD.status,
        NEW.status,
        auth.uid()
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_log_customer_profile_changes ON users;

-- Create trigger
CREATE TRIGGER trigger_log_customer_profile_changes
  AFTER UPDATE ON users
  FOR EACH ROW
  WHEN (OLD.role = 'customer' AND NEW.role = 'customer')
  EXECUTE FUNCTION log_customer_profile_changes();

-- Add comment
COMMENT ON FUNCTION log_customer_profile_changes IS 'บันทึกการเปลี่ยนแปลงข้อมูลโปรไฟล์ลูกค้าอัตโนมัติ';

-- =====================================================
-- 5. Verification Queries
-- =====================================================

-- Test admin_get_customer_orders
-- SELECT * FROM admin_get_customer_orders('<customer_id>', 10, 0);

-- Test admin_get_customer_history
-- SELECT * FROM admin_get_customer_history('<customer_id>', 10);

-- Check customer_history table
-- SELECT * FROM customer_history ORDER BY changed_at DESC LIMIT 10;

-- =====================================================
-- Migration Complete
-- =====================================================
