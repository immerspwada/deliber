-- Migration: 061_rating_system_v2.sql
-- Feature: F26 - Enhanced Rating & Review System
-- Description: Multi-criteria ratings, review responses, and rating analytics

-- =====================================================
-- 1. Rating Criteria Templates
-- =====================================================
CREATE TABLE IF NOT EXISTS rating_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type TEXT NOT NULL CHECK (service_type IN ('ride', 'delivery', 'shopping', 'queue', 'moving', 'laundry')),
  criteria_key TEXT NOT NULL,
  criteria_name TEXT NOT NULL,
  criteria_name_th TEXT NOT NULL,
  description TEXT,
  weight NUMERIC(3,2) DEFAULT 1.0,
  is_required BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(service_type, criteria_key)
);

-- Insert default criteria
INSERT INTO rating_criteria (service_type, criteria_key, criteria_name, criteria_name_th, weight, is_required, sort_order) VALUES
-- Ride criteria
('ride', 'overall', 'Overall', 'ภาพรวม', 1.0, true, 0),
('ride', 'driving', 'Driving Skills', 'ทักษะการขับขี่', 0.8, false, 1),
('ride', 'punctuality', 'Punctuality', 'ตรงเวลา', 0.7, false, 2),
('ride', 'vehicle_condition', 'Vehicle Condition', 'สภาพรถ', 0.6, false, 3),
('ride', 'communication', 'Communication', 'การสื่อสาร', 0.5, false, 4),
-- Delivery criteria
('delivery', 'overall', 'Overall', 'ภาพรวม', 1.0, true, 0),
('delivery', 'speed', 'Delivery Speed', 'ความเร็ว', 0.8, false, 1),
('delivery', 'package_condition', 'Package Condition', 'สภาพพัสดุ', 0.9, false, 2),
('delivery', 'communication', 'Communication', 'การสื่อสาร', 0.5, false, 3),
-- Shopping criteria
('shopping', 'overall', 'Overall', 'ภาพรวม', 1.0, true, 0),
('shopping', 'item_selection', 'Item Selection', 'การเลือกสินค้า', 0.8, false, 1),
('shopping', 'freshness', 'Freshness', 'ความสด', 0.7, false, 2),
('shopping', 'communication', 'Communication', 'การสื่อสาร', 0.5, false, 3)
ON CONFLICT (service_type, criteria_key) DO NOTHING;

-- =====================================================
-- 2. Detailed Ratings (Multi-criteria)
-- =====================================================
CREATE TABLE IF NOT EXISTS detailed_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rating_id UUID NOT NULL, -- Reference to ride_ratings, delivery_ratings, etc.
  rating_type TEXT NOT NULL CHECK (rating_type IN ('ride', 'delivery', 'shopping', 'queue', 'moving', 'laundry')),
  criteria_key TEXT NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 1 AND score <= 5),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_detailed_ratings_rating ON detailed_ratings(rating_id, rating_type);

-- =====================================================
-- 3. Review Tags (Quick feedback options)
-- =====================================================
CREATE TABLE IF NOT EXISTS review_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type TEXT NOT NULL,
  tag_key TEXT NOT NULL,
  tag_name TEXT NOT NULL,
  tag_name_th TEXT NOT NULL,
  is_positive BOOLEAN DEFAULT TRUE,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(service_type, tag_key)
);

-- Insert default tags
INSERT INTO review_tags (service_type, tag_key, tag_name, tag_name_th, is_positive, sort_order) VALUES
-- Positive tags
('ride', 'safe_driving', 'Safe Driving', 'ขับปลอดภัย', true, 1),
('ride', 'friendly', 'Friendly', 'เป็นมิตร', true, 2),
('ride', 'clean_car', 'Clean Car', 'รถสะอาด', true, 3),
('ride', 'good_route', 'Good Route', 'เส้นทางดี', true, 4),
('ride', 'on_time', 'On Time', 'ตรงเวลา', true, 5),
-- Negative tags
('ride', 'reckless', 'Reckless Driving', 'ขับประมาท', false, 10),
('ride', 'unfriendly', 'Unfriendly', 'ไม่เป็นมิตร', false, 11),
('ride', 'dirty_car', 'Dirty Car', 'รถไม่สะอาด', false, 12),
('ride', 'bad_route', 'Bad Route', 'เส้นทางไม่ดี', false, 13),
('ride', 'late', 'Late', 'มาช้า', false, 14),
-- Delivery tags
('delivery', 'fast', 'Fast Delivery', 'ส่งเร็ว', true, 1),
('delivery', 'careful', 'Careful Handling', 'ระวังของ', true, 2),
('delivery', 'polite', 'Polite', 'สุภาพ', true, 3),
('delivery', 'damaged', 'Package Damaged', 'ของเสียหาย', false, 10),
('delivery', 'slow', 'Slow Delivery', 'ส่งช้า', false, 11)
ON CONFLICT (service_type, tag_key) DO NOTHING;

-- =====================================================
-- 4. Rating Tags Junction
-- =====================================================
CREATE TABLE IF NOT EXISTS rating_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rating_id UUID NOT NULL,
  rating_type TEXT NOT NULL,
  tag_key TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rating_tags_rating ON rating_tags(rating_id, rating_type);

-- =====================================================
-- 5. Provider Responses to Reviews
-- =====================================================
CREATE TABLE IF NOT EXISTS review_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rating_id UUID NOT NULL,
  rating_type TEXT NOT NULL,
  provider_id UUID NOT NULL REFERENCES service_providers(id),
  response_text TEXT NOT NULL,
  is_approved BOOLEAN DEFAULT FALSE,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_review_responses_rating ON review_responses(rating_id, rating_type);
CREATE INDEX IF NOT EXISTS idx_review_responses_provider ON review_responses(provider_id);

-- =====================================================
-- 6. Rating Analytics (Aggregated)
-- =====================================================
CREATE TABLE IF NOT EXISTS provider_rating_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL,
  period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly', 'all_time')),
  period_start DATE,
  
  -- Counts
  total_ratings INTEGER DEFAULT 0,
  five_star_count INTEGER DEFAULT 0,
  four_star_count INTEGER DEFAULT 0,
  three_star_count INTEGER DEFAULT 0,
  two_star_count INTEGER DEFAULT 0,
  one_star_count INTEGER DEFAULT 0,
  
  -- Averages
  avg_rating NUMERIC(3,2),
  avg_criteria_scores JSONB DEFAULT '{}',
  
  -- Tags
  positive_tags_count INTEGER DEFAULT 0,
  negative_tags_count INTEGER DEFAULT 0,
  top_positive_tags JSONB DEFAULT '[]',
  top_negative_tags JSONB DEFAULT '[]',
  
  -- Trends
  rating_trend NUMERIC(4,2), -- Change from previous period
  
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider_id, service_type, period_type, period_start)
);

CREATE INDEX IF NOT EXISTS idx_rating_analytics_provider ON provider_rating_analytics(provider_id);

-- =====================================================
-- 7. Enable RLS
-- =====================================================
ALTER TABLE rating_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE detailed_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE rating_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_rating_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone read rating_criteria" ON rating_criteria FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Anyone read review_tags" ON review_tags FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "Users insert detailed_ratings" ON detailed_ratings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Anyone read detailed_ratings" ON detailed_ratings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users insert rating_tags" ON rating_tags FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Anyone read rating_tags" ON rating_tags FOR SELECT TO authenticated USING (true);

CREATE POLICY "Provider manage own responses" ON review_responses
  FOR ALL TO authenticated
  USING (provider_id IN (SELECT id FROM service_providers WHERE user_id = auth.uid()));

CREATE POLICY "Anyone read approved responses" ON review_responses
  FOR SELECT TO authenticated USING (is_approved = true);

CREATE POLICY "Admin manage responses" ON review_responses
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Provider read own analytics" ON provider_rating_analytics
  FOR SELECT TO authenticated
  USING (provider_id IN (SELECT id FROM service_providers WHERE user_id = auth.uid()));

CREATE POLICY "Admin read all analytics" ON provider_rating_analytics
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- =====================================================
-- 8. Functions
-- =====================================================

-- Submit detailed rating
CREATE OR REPLACE FUNCTION submit_detailed_rating(
  p_rating_id UUID,
  p_rating_type TEXT,
  p_criteria_scores JSONB, -- {"overall": 5, "driving": 4, ...}
  p_tags TEXT[] DEFAULT ARRAY[]::TEXT[]
) RETURNS VOID AS $$
DECLARE
  v_key TEXT;
  v_score INTEGER;
BEGIN
  -- Insert criteria scores
  FOR v_key, v_score IN SELECT * FROM jsonb_each_text(p_criteria_scores)
  LOOP
    INSERT INTO detailed_ratings (rating_id, rating_type, criteria_key, score)
    VALUES (p_rating_id, p_rating_type, v_key, v_score::INTEGER);
  END LOOP;
  
  -- Insert tags
  IF array_length(p_tags, 1) > 0 THEN
    INSERT INTO rating_tags (rating_id, rating_type, tag_key)
    SELECT p_rating_id, p_rating_type, unnest(p_tags);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get rating criteria for service
CREATE OR REPLACE FUNCTION get_rating_criteria(p_service_type TEXT)
RETURNS TABLE (
  criteria_key TEXT,
  criteria_name TEXT,
  criteria_name_th TEXT,
  is_required BOOLEAN,
  sort_order INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rc.criteria_key,
    rc.criteria_name,
    rc.criteria_name_th,
    rc.is_required,
    rc.sort_order
  FROM rating_criteria rc
  WHERE rc.service_type = p_service_type AND rc.is_active = true
  ORDER BY rc.sort_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get review tags for service
CREATE OR REPLACE FUNCTION get_review_tags(p_service_type TEXT)
RETURNS TABLE (
  tag_key TEXT,
  tag_name TEXT,
  tag_name_th TEXT,
  is_positive BOOLEAN,
  icon TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rt.tag_key,
    rt.tag_name,
    rt.tag_name_th,
    rt.is_positive,
    rt.icon
  FROM review_tags rt
  WHERE rt.service_type = p_service_type AND rt.is_active = true
  ORDER BY rt.is_positive DESC, rt.sort_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Submit provider response
CREATE OR REPLACE FUNCTION submit_review_response(
  p_rating_id UUID,
  p_rating_type TEXT,
  p_provider_id UUID,
  p_response_text TEXT
) RETURNS UUID AS $$
DECLARE
  v_response_id UUID;
BEGIN
  INSERT INTO review_responses (rating_id, rating_type, provider_id, response_text)
  VALUES (p_rating_id, p_rating_type, p_provider_id, p_response_text)
  RETURNING id INTO v_response_id;
  
  RETURN v_response_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Approve review response (Admin)
CREATE OR REPLACE FUNCTION approve_review_response(
  p_response_id UUID,
  p_admin_id UUID,
  p_approved BOOLEAN
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE review_responses
  SET 
    is_approved = p_approved,
    approved_by = p_admin_id,
    approved_at = CASE WHEN p_approved THEN NOW() ELSE NULL END,
    updated_at = NOW()
  WHERE id = p_response_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update provider rating analytics
CREATE OR REPLACE FUNCTION update_provider_rating_analytics(p_provider_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Update all-time stats for ride ratings
  INSERT INTO provider_rating_analytics (
    provider_id, service_type, period_type, period_start,
    total_ratings, five_star_count, four_star_count, three_star_count,
    two_star_count, one_star_count, avg_rating
  )
  SELECT 
    p_provider_id,
    'ride',
    'all_time',
    NULL,
    COUNT(*),
    COUNT(*) FILTER (WHERE rating = 5),
    COUNT(*) FILTER (WHERE rating = 4),
    COUNT(*) FILTER (WHERE rating = 3),
    COUNT(*) FILTER (WHERE rating = 2),
    COUNT(*) FILTER (WHERE rating = 1),
    AVG(rating)
  FROM ride_ratings
  WHERE provider_id = p_provider_id
  ON CONFLICT (provider_id, service_type, period_type, period_start)
  DO UPDATE SET
    total_ratings = EXCLUDED.total_ratings,
    five_star_count = EXCLUDED.five_star_count,
    four_star_count = EXCLUDED.four_star_count,
    three_star_count = EXCLUDED.three_star_count,
    two_star_count = EXCLUDED.two_star_count,
    one_star_count = EXCLUDED.one_star_count,
    avg_rating = EXCLUDED.avg_rating,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get provider rating summary
CREATE OR REPLACE FUNCTION get_provider_rating_summary(p_provider_id UUID)
RETURNS TABLE (
  service_type TEXT,
  total_ratings BIGINT,
  avg_rating NUMERIC,
  five_star_pct NUMERIC,
  top_tags JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'ride'::TEXT as service_type,
    COUNT(*) as total_ratings,
    AVG(rating)::NUMERIC(3,2) as avg_rating,
    (COUNT(*) FILTER (WHERE rating = 5)::NUMERIC / NULLIF(COUNT(*), 0) * 100)::NUMERIC(5,2) as five_star_pct,
    (
      SELECT jsonb_agg(jsonb_build_object('tag', tag_key, 'count', cnt))
      FROM (
        SELECT rt.tag_key, COUNT(*) as cnt
        FROM rating_tags rt
        JOIN ride_ratings rr ON rt.rating_id = rr.id AND rt.rating_type = 'ride'
        WHERE rr.provider_id = p_provider_id
        GROUP BY rt.tag_key
        ORDER BY cnt DESC
        LIMIT 5
      ) t
    ) as top_tags
  FROM ride_ratings
  WHERE provider_id = p_provider_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON TABLE rating_criteria IS 'Multi-criteria rating definitions';
COMMENT ON TABLE detailed_ratings IS 'Individual criteria scores for ratings';
COMMENT ON TABLE review_tags IS 'Quick feedback tag options';
COMMENT ON TABLE rating_tags IS 'Tags selected for each rating';
COMMENT ON TABLE review_responses IS 'Provider responses to reviews';
COMMENT ON TABLE provider_rating_analytics IS 'Aggregated rating analytics';
