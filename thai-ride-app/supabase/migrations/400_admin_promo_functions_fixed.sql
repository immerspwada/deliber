-- ============================================
-- Admin Promo Management Functions
-- ============================================
-- Feature: F10 - Complete Promo System (Admin)
-- Created: 2026-01-22
-- Purpose: Database functions for admin promo management

-- ============================================
-- 1. Get All Promos for Admin
-- ============================================
CREATE OR REPLACE FUNCTION get_all_promos_for_admin(
  p_status TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  code TEXT,
  description TEXT,
  discount_type TEXT,
  discount_value DECIMAL,
  max_discount DECIMAL,
  min_order_amount DECIMAL,
  category TEXT,
  service_types TEXT[],
  user_type TEXT,
  usage_limit INT,
  used_count INT,
  per_user_limit INT,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN,
  campaign_id UUID,
  campaign_name TEXT,
  total_discount_given DECIMAL,
  unique_users INT,
  created_at TIMESTAMPTZ,
  created_by_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$$
BEGIN
  -- Check admin role
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() AND users.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  RETURN QUERY
  SELECT 
    pc.id,
    pc.code,
    pc.description,
    pc.discount_type,
    pc.discount_value,
    pc.max_discount,
    pc.min_order_amount,
    pc.category,
    pc.service_types,
    pc.user_type,
    pc.usage_limit,
    pc.used_count,
    pc.per_user_limit,
    pc.valid_from,
    pc.valid_until,
    pc.is_active,
    pc.campaign_id,
    pcamp.name as campaign_name,
    COALESCE(
      (SELECT SUM(discount_amount) FROM promo_usage_analytics WHERE promo_id = pc.id),
      0
    ) as total_discount_given,
    COALESCE(
      (SELECT COUNT(DISTINCT user_id) FROM promo_usage_analytics WHERE promo_id = pc.id),
      0
    ) as unique_users,
    pc.created_at,
    u.full_name as created_by_name
  FROM promo_codes pc
  LEFT JOIN promo_campaigns pcamp ON pcamp.id = pc.campaign_id
  LEFT JOIN users u ON u.id = pc.created_by
  WHERE 
    (p_status IS NULL OR 
      (p_status = 'active' AND pc.is_active = true) OR
      (p_status = 'inactive' AND pc.is_active = false)
    )
    AND (p_category IS NULL OR pc.category = p_category)
  ORDER BY pc.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- ============================================
-- 2. Count Promos for Admin
-- ============================================
CREATE OR REPLACE FUNCTION count_promos_for_admin(
  p_status TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$$
DECLARE
  v_count INT;
BEGIN
  -- Check admin role
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() AND users.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  SELECT COUNT(*)::INT INTO v_count
  FROM promo_codes pc
  WHERE 
    (p_status IS NULL OR 
      (p_status = 'active' AND pc.is_active = true) OR
      (p_status = 'inactive' AND pc.is_active = false)
    )
    AND (p_category IS NULL OR pc.category = p_category);

  RETURN v_count;
END;
$$;

-- ============================================
-- 3. Create Promo Code
-- ============================================
CREATE OR REPLACE FUNCTION create_promo_code(
  p_code TEXT,
  p_description TEXT DEFAULT NULL,
  p_discount_type TEXT DEFAULT 'fixed',
  p_discount_value DECIMAL DEFAULT 50,
  p_max_discount DECIMAL DEFAULT NULL,
  p_min_order_amount DECIMAL DEFAULT 0,
  p_category TEXT DEFAULT 'all',
  p_service_types TEXT[] DEFAULT ARRAY['ride', 'delivery', 'shopping'],
  p_user_type TEXT DEFAULT 'all',
  p_usage_limit INT DEFAULT NULL,
  p_per_user_limit INT DEFAULT 1,
  p_valid_from TIMESTAMPTZ DEFAULT NOW(),
  p_valid_until TIMESTAMPTZ DEFAULT NULL,
  p_campaign_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$$
DECLARE
  v_promo_id UUID;
BEGIN
  -- Check admin role
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() AND users.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Check if code already exists
  IF EXISTS (SELECT 1 FROM promo_codes WHERE code = UPPER(p_code)) THEN
    RAISE EXCEPTION 'Promo code already exists';
  END IF;

  -- Insert promo code
  INSERT INTO promo_codes (
    code,
    description,
    discount_type,
    discount_value,
    max_discount,
    min_order_amount,
    category,
    service_types,
    user_type,
    usage_limit,
    per_user_limit,
    valid_from,
    valid_until,
    campaign_id,
    is_active,
    created_by
  ) VALUES (
    UPPER(p_code),
    p_description,
    p_discount_type,
    p_discount_value,
    p_max_discount,
    p_min_order_amount,
    p_category,
    p_service_types,
    p_user_type,
    p_usage_limit,
    p_per_user_limit,
    p_valid_from,
    p_valid_until,
    p_campaign_id,
    true,
    auth.uid()
  )
  RETURNING id INTO v_promo_id;

  RETURN v_promo_id;
END;
$$;

-- ============================================
-- 4. Toggle Promo Status
-- ============================================
CREATE OR REPLACE FUNCTION toggle_promo_status(
  p_promo_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$$
BEGIN
  -- Check admin role
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() AND users.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  UPDATE promo_codes
  SET 
    is_active = NOT is_active,
    updated_at = NOW()
  WHERE id = p_promo_id;

  RETURN FOUND;
END;
$$;

-- ============================================
-- 5. Delete Promo
-- ============================================
CREATE OR REPLACE FUNCTION delete_promo(
  p_promo_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$$
BEGIN
  -- Check admin role
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() AND users.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Soft delete by setting is_active to false
  UPDATE promo_codes
  SET 
    is_active = false,
    updated_at = NOW()
  WHERE id = p_promo_id;

  RETURN FOUND;
END;
$$;

-- ============================================
-- 6. Get All Campaigns for Admin
-- ============================================
CREATE OR REPLACE FUNCTION get_all_campaigns_for_admin(
  p_status TEXT DEFAULT NULL,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  start_date DATE,
  end_date DATE,
  budget DECIMAL,
  spent DECIMAL,
  target_users INT,
  reached_users INT,
  status TEXT,
  promo_count INT,
  total_uses INT,
  created_by_name TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$$
BEGIN
  -- Check admin role
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() AND users.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  RETURN QUERY
  SELECT 
    pcamp.id,
    pcamp.name,
    pcamp.description,
    pcamp.start_date,
    pcamp.end_date,
    pcamp.budget,
    pcamp.spent,
    pcamp.target_users,
    pcamp.reached_users,
    pcamp.status,
    COALESCE(
      (SELECT COUNT(*)::INT FROM promo_codes WHERE campaign_id = pcamp.id),
      0
    ) as promo_count,
    COALESCE(
      (SELECT SUM(used_count)::INT FROM promo_codes WHERE campaign_id = pcamp.id),
      0
    ) as total_uses,
    u.full_name as created_by_name,
    pcamp.created_at
  FROM promo_campaigns pcamp
  LEFT JOIN users u ON u.id = pcamp.created_by
  WHERE 
    (p_status IS NULL OR pcamp.status = p_status)
  ORDER BY pcamp.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- ============================================
-- 7. Create Promo Campaign
-- ============================================
CREATE OR REPLACE FUNCTION create_promo_campaign(
  p_name TEXT,
  p_description TEXT DEFAULT NULL,
  p_start_date DATE DEFAULT CURRENT_DATE,
  p_end_date DATE DEFAULT CURRENT_DATE + INTERVAL '30 days',
  p_budget DECIMAL DEFAULT NULL,
  p_target_users INT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$$
DECLARE
  v_campaign_id UUID;
BEGIN
  -- Check admin role
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() AND users.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Insert campaign
  INSERT INTO promo_campaigns (
    name,
    description,
    start_date,
    end_date,
    budget,
    target_users,
    status,
    created_by
  ) VALUES (
    p_name,
    p_description,
    p_start_date,
    p_end_date,
    p_budget,
    p_target_users,
    'draft',
    auth.uid()
  )
  RETURNING id INTO v_campaign_id;

  RETURN v_campaign_id;
END;
$$;

-- ============================================
-- 8. Update Campaign Status
-- ============================================
CREATE OR REPLACE FUNCTION update_campaign_status(
  p_campaign_id UUID,
  p_status TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$$
BEGIN
  -- Check admin role
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() AND users.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  UPDATE promo_campaigns
  SET 
    status = p_status,
    updated_at = NOW()
  WHERE id = p_campaign_id;

  RETURN FOUND;
END;
$$;

-- ============================================
-- 9. Get Campaign Details
-- ============================================
CREATE OR REPLACE FUNCTION get_campaign_details(
  p_campaign_id UUID
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  start_date DATE,
  end_date DATE,
  budget DECIMAL,
  spent DECIMAL,
  target_users INT,
  reached_users INT,
  status TEXT,
  promo_count INT,
  total_uses INT,
  total_discount DECIMAL,
  created_by_name TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$$
BEGIN
  -- Check admin role
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() AND users.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  RETURN QUERY
  SELECT 
    pcamp.id,
    pcamp.name,
    pcamp.description,
    pcamp.start_date,
    pcamp.end_date,
    pcamp.budget,
    pcamp.spent,
    pcamp.target_users,
    pcamp.reached_users,
    pcamp.status,
    COALESCE(
      (SELECT COUNT(*)::INT FROM promo_codes WHERE campaign_id = pcamp.id),
      0
    ) as promo_count,
    COALESCE(
      (SELECT SUM(used_count)::INT FROM promo_codes WHERE campaign_id = pcamp.id),
      0
    ) as total_uses,
    COALESCE(
      (SELECT SUM(discount_amount) FROM promo_usage_analytics pua
       INNER JOIN promo_codes pc ON pc.id = pua.promo_id
       WHERE pc.campaign_id = pcamp.id),
      0
    ) as total_discount,
    u.full_name as created_by_name,
    pcamp.created_at
  FROM promo_campaigns pcamp
  LEFT JOIN users u ON u.id = pcamp.created_by
  WHERE pcamp.id = p_campaign_id;
END;
$$;

-- ============================================
-- 10. Get Promo Dashboard Stats
-- ============================================
CREATE OR REPLACE FUNCTION get_promo_dashboard_stats()
RETURNS TABLE (
  total_promos INT,
  active_promos INT,
  total_campaigns INT,
  active_campaigns INT,
  total_uses_today INT,
  total_discount_today DECIMAL,
  total_uses_month INT,
  total_discount_month DECIMAL,
  top_promos JSONB,
  recent_usage JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$$
BEGIN
  -- Check admin role
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() AND users.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  RETURN QUERY
  SELECT 
    (SELECT COUNT(*)::INT FROM promo_codes) as total_promos,
    (SELECT COUNT(*)::INT FROM promo_codes WHERE is_active = true) as active_promos,
    (SELECT COUNT(*)::INT FROM promo_campaigns) as total_campaigns,
    (SELECT COUNT(*)::INT FROM promo_campaigns WHERE status = 'active') as active_campaigns,
    
    -- Today's stats
    COALESCE(
      (SELECT SUM(used_count)::INT FROM promo_codes 
       WHERE DATE(updated_at) = CURRENT_DATE),
      0
    ) as total_uses_today,
    COALESCE(
      (SELECT SUM(discount_amount) FROM promo_usage_analytics 
       WHERE DATE(used_at) = CURRENT_DATE),
      0
    ) as total_discount_today,
    
    -- Month's stats
    COALESCE(
      (SELECT SUM(used_count)::INT FROM promo_codes 
       WHERE DATE_TRUNC('month', updated_at) = DATE_TRUNC('month', CURRENT_DATE)),
      0
    ) as total_uses_month,
    COALESCE(
      (SELECT SUM(discount_amount) FROM promo_usage_analytics 
       WHERE DATE_TRUNC('month', used_at) = DATE_TRUNC('month', CURRENT_DATE)),
      0
    ) as total_discount_month,
    
    -- Top promos
    COALESCE(
      (SELECT jsonb_agg(row_to_json(t))
       FROM (
         SELECT code, used_count, discount_type, discount_value
         FROM promo_codes
         WHERE is_active = true
         ORDER BY used_count DESC NULLS LAST
         LIMIT 5
       ) t),
      '[]'::jsonb
    ) as top_promos,
    
    -- Recent usage
    COALESCE(
      (SELECT jsonb_agg(row_to_json(t))
       FROM (
         SELECT 
           pc.code,
           pua.discount_amount,
           pua.service_type,
           pua.used_at,
           u.full_name as user_name
         FROM promo_usage_analytics pua
         INNER JOIN promo_codes pc ON pc.id = pua.promo_id
         LEFT JOIN users u ON u.id = pua.user_id
         ORDER BY pua.used_at DESC
         LIMIT 10
       ) t),
      '[]'::jsonb
    ) as recent_usage;
END;
$$;

-- ============================================
-- 11. Get Promo Analytics
-- ============================================
CREATE OR REPLACE FUNCTION get_promo_analytics(
  p_promo_id UUID DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  date DATE,
  total_uses INT,
  unique_users INT,
  total_discount DECIMAL,
  total_orders INT,
  avg_order_value DECIMAL,
  by_service JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$$
BEGIN
  -- Check admin role
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() AND users.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  RETURN QUERY
  SELECT 
    DATE(pua.used_at) as date,
    COUNT(*)::INT as total_uses,
    COUNT(DISTINCT pua.user_id)::INT as unique_users,
    SUM(pua.discount_amount) as total_discount,
    COUNT(DISTINCT pua.order_id)::INT as total_orders,
    AVG(pua.order_amount) as avg_order_value,
    jsonb_object_agg(
      pua.service_type,
      COUNT(*)
    ) as by_service
  FROM promo_usage_analytics pua
  WHERE 
    (p_promo_id IS NULL OR pua.promo_id = p_promo_id)
    AND pua.used_at BETWEEN p_start_date AND p_end_date
  GROUP BY DATE(pua.used_at)
  ORDER BY DATE(pua.used_at) DESC;
END;
$$;

-- ============================================
-- Grant Permissions
-- ============================================
GRANT EXECUTE ON FUNCTION get_all_promos_for_admin TO authenticated;
GRANT EXECUTE ON FUNCTION count_promos_for_admin TO authenticated;
GRANT EXECUTE ON FUNCTION create_promo_code TO authenticated;
GRANT EXECUTE ON FUNCTION toggle_promo_status TO authenticated;
GRANT EXECUTE ON FUNCTION delete_promo TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_campaigns_for_admin TO authenticated;
GRANT EXECUTE ON FUNCTION create_promo_campaign TO authenticated;
GRANT EXECUTE ON FUNCTION update_campaign_status TO authenticated;
GRANT EXECUTE ON FUNCTION get_campaign_details TO authenticated;
GRANT EXECUTE ON FUNCTION get_promo_dashboard_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_promo_analytics TO authenticated;

-- ============================================
-- Comments
-- ============================================
COMMENT ON FUNCTION get_all_promos_for_admin IS 'Get all promo codes with filters and pagination for admin';
COMMENT ON FUNCTION count_promos_for_admin IS 'Count total promos matching filters';
COMMENT ON FUNCTION create_promo_code IS 'Create a new promo code (admin only)';
COMMENT ON FUNCTION toggle_promo_status IS 'Toggle promo active/inactive status';
COMMENT ON FUNCTION delete_promo IS 'Soft delete a promo code';
COMMENT ON FUNCTION get_all_campaigns_for_admin IS 'Get all campaigns with stats for admin';
COMMENT ON FUNCTION create_promo_campaign IS 'Create a new promo campaign (admin only)';
COMMENT ON FUNCTION update_campaign_status IS 'Update campaign status';
COMMENT ON FUNCTION get_campaign_details IS 'Get detailed campaign information';
COMMENT ON FUNCTION get_promo_dashboard_stats IS 'Get dashboard statistics for promo management';
COMMENT ON FUNCTION get_promo_analytics IS 'Get analytics data for promos';
