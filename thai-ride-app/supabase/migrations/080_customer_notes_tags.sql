-- Migration: 080_customer_notes_tags.sql
-- Feature: Customer Notes & Tags System for Admin
-- Tables: customer_notes, customer_tags, customer_tag_assignments

-- =====================================================
-- CUSTOMER TAGS (Predefined tags like VIP, Regular, Caution)
-- =====================================================

CREATE TABLE IF NOT EXISTS customer_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE,
  name_th VARCHAR(100),
  color VARCHAR(7) NOT NULL DEFAULT '#00A86B', -- Hex color
  bg_color VARCHAR(7) NOT NULL DEFAULT '#E8F5EF',
  icon VARCHAR(50), -- Icon name for UI
  description TEXT,
  is_system BOOLEAN DEFAULT false, -- System tags cannot be deleted
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default system tags
INSERT INTO customer_tags (name, name_th, color, bg_color, icon, description, is_system, sort_order) VALUES
  ('vip', 'VIP', '#FFD700', '#FFF8DC', 'star', 'ลูกค้า VIP - ให้บริการพิเศษ', true, 1),
  ('regular', 'ลูกค้าประจำ', '#00A86B', '#E8F5EF', 'heart', 'ลูกค้าประจำที่ใช้บริการบ่อย', true, 2),
  ('new', 'ลูกค้าใหม่', '#2196F3', '#E3F2FD', 'sparkle', 'ลูกค้าใหม่ที่เพิ่งสมัคร', true, 3),
  ('caution', 'ต้องระวัง', '#E53935', '#FFEBEE', 'alert', 'ลูกค้าที่ต้องระวังเป็นพิเศษ', true, 4),
  ('corporate', 'องค์กร', '#9C27B0', '#F3E5F5', 'building', 'ลูกค้าจากบัญชีองค์กร', true, 5),
  ('inactive', 'ไม่ใช้งาน', '#666666', '#F5F5F5', 'pause', 'ลูกค้าที่ไม่ได้ใช้งานนาน', true, 6)
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- CUSTOMER TAG ASSIGNMENTS (Many-to-many)
-- =====================================================

CREATE TABLE IF NOT EXISTS customer_tag_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES customer_tags(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES users(id), -- Admin who assigned
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_customer_tag_assignments_user ON customer_tag_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_tag_assignments_tag ON customer_tag_assignments(tag_id);

-- =====================================================
-- CUSTOMER NOTES (Admin notes about customers)
-- =====================================================

CREATE TABLE IF NOT EXISTS customer_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES users(id),
  note TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  is_important BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_notes_user ON customer_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_notes_admin ON customer_notes(admin_id);
CREATE INDEX IF NOT EXISTS idx_customer_notes_pinned ON customer_notes(user_id, is_pinned) WHERE is_pinned = true;

-- =====================================================
-- CUSTOMER QUICK STATS VIEW
-- =====================================================

CREATE OR REPLACE VIEW customer_quick_stats AS
SELECT 
  u.id as user_id,
  -- This month stats
  COALESCE(rides_month.count, 0) as rides_this_month,
  COALESCE(rides_month.total_spent, 0) as spent_this_month,
  COALESCE(deliveries_month.count, 0) as deliveries_this_month,
  COALESCE(shopping_month.count, 0) as shopping_this_month,
  -- All time stats
  COALESCE(rides_all.count, 0) as total_rides,
  COALESCE(rides_all.total_spent, 0) as total_spent,
  COALESCE(rides_all.avg_fare, 0) as avg_ride_fare,
  -- Activity stats
  rides_all.last_ride_at,
  rides_all.first_ride_at,
  -- Calculated fields
  CASE 
    WHEN rides_all.count > 0 THEN 
      EXTRACT(DAY FROM NOW() - rides_all.last_ride_at)
    ELSE NULL 
  END as days_since_last_ride,
  CASE 
    WHEN rides_all.count >= 20 THEN 'high'
    WHEN rides_all.count >= 5 THEN 'medium'
    ELSE 'low'
  END as activity_level
FROM users u
LEFT JOIN (
  SELECT 
    user_id,
    COUNT(*) as count,
    SUM(COALESCE(final_fare, estimated_fare, 0)) as total_spent
  FROM ride_requests
  WHERE status = 'completed'
    AND created_at >= DATE_TRUNC('month', NOW())
  GROUP BY user_id
) rides_month ON u.id = rides_month.user_id
LEFT JOIN (
  SELECT 
    user_id,
    COUNT(*) as count
  FROM delivery_requests
  WHERE status = 'completed'
    AND created_at >= DATE_TRUNC('month', NOW())
  GROUP BY user_id
) deliveries_month ON u.id = deliveries_month.user_id
LEFT JOIN (
  SELECT 
    user_id,
    COUNT(*) as count
  FROM shopping_requests
  WHERE status = 'completed'
    AND created_at >= DATE_TRUNC('month', NOW())
  GROUP BY user_id
) shopping_month ON u.id = shopping_month.user_id
LEFT JOIN (
  SELECT 
    user_id,
    COUNT(*) as count,
    SUM(COALESCE(final_fare, estimated_fare, 0)) as total_spent,
    AVG(COALESCE(final_fare, estimated_fare, 0)) as avg_fare,
    MAX(created_at) as last_ride_at,
    MIN(created_at) as first_ride_at
  FROM ride_requests
  WHERE status = 'completed'
  GROUP BY user_id
) rides_all ON u.id = rides_all.user_id;

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Get customer tags
CREATE OR REPLACE FUNCTION get_customer_tags(p_user_id UUID)
RETURNS TABLE (
  tag_id UUID,
  name VARCHAR(50),
  name_th VARCHAR(100),
  color VARCHAR(7),
  bg_color VARCHAR(7),
  icon VARCHAR(50),
  assigned_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ct.id,
    ct.name,
    ct.name_th,
    ct.color,
    ct.bg_color,
    ct.icon,
    cta.assigned_at
  FROM customer_tag_assignments cta
  JOIN customer_tags ct ON ct.id = cta.tag_id
  WHERE cta.user_id = p_user_id
  ORDER BY ct.sort_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Assign tag to customer
CREATE OR REPLACE FUNCTION assign_customer_tag(
  p_user_id UUID,
  p_tag_id UUID,
  p_admin_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO customer_tag_assignments (user_id, tag_id, assigned_by)
  VALUES (p_user_id, p_tag_id, p_admin_id)
  ON CONFLICT (user_id, tag_id) DO NOTHING;
  
  RETURN true;
EXCEPTION WHEN OTHERS THEN
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remove tag from customer
CREATE OR REPLACE FUNCTION remove_customer_tag(
  p_user_id UUID,
  p_tag_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  DELETE FROM customer_tag_assignments
  WHERE user_id = p_user_id AND tag_id = p_tag_id;
  
  RETURN true;
EXCEPTION WHEN OTHERS THEN
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get customer quick stats
CREATE OR REPLACE FUNCTION get_customer_quick_stats(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'rides_this_month', COALESCE(rides_this_month, 0),
    'spent_this_month', COALESCE(spent_this_month, 0),
    'deliveries_this_month', COALESCE(deliveries_this_month, 0),
    'shopping_this_month', COALESCE(shopping_this_month, 0),
    'total_rides', COALESCE(total_rides, 0),
    'total_spent', COALESCE(total_spent, 0),
    'avg_ride_fare', COALESCE(avg_ride_fare, 0),
    'last_ride_at', last_ride_at,
    'first_ride_at', first_ride_at,
    'days_since_last_ride', days_since_last_ride,
    'activity_level', activity_level
  ) INTO result
  FROM customer_quick_stats
  WHERE user_id = p_user_id;
  
  RETURN COALESCE(result, '{}'::JSON);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE customer_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_tag_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_notes ENABLE ROW LEVEL SECURITY;

-- Tags: Admin can read all, only admin can modify
CREATE POLICY "Admin can read tags" ON customer_tags
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin can manage tags" ON customer_tags
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Tag assignments: Admin only
CREATE POLICY "Admin can manage tag assignments" ON customer_tag_assignments
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Notes: Admin only
CREATE POLICY "Admin can manage notes" ON customer_notes
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_customer_notes_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_customer_notes_updated
  BEFORE UPDATE ON customer_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_notes_timestamp();

CREATE TRIGGER trigger_customer_tags_updated
  BEFORE UPDATE ON customer_tags
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_notes_timestamp();
