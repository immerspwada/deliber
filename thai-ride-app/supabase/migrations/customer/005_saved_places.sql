-- =============================================
-- CUSTOMER MODULE: Saved Places
-- =============================================
-- Feature: F09 - Saved Places
-- Used by: Customer App
-- Depends on: core/001_users_auth.sql
-- =============================================

-- Saved places table
CREATE TABLE IF NOT EXISTS saved_places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  address TEXT NOT NULL,
  lat DECIMAL(10,8) NOT NULL,
  lng DECIMAL(11,8) NOT NULL,
  place_type VARCHAR(20) DEFAULT 'other' CHECK (place_type IN ('home', 'work', 'other')),
  icon VARCHAR(50),
  is_favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Recent places table
CREATE TABLE IF NOT EXISTS recent_places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  address TEXT NOT NULL,
  lat DECIMAL(10,8) NOT NULL,
  lng DECIMAL(11,8) NOT NULL,
  place_name VARCHAR(200),
  visit_count INTEGER DEFAULT 1,
  last_visited_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE saved_places ENABLE ROW LEVEL SECURITY;
ALTER TABLE recent_places ENABLE ROW LEVEL SECURITY;

-- RLS Policies (permissive for dev)
CREATE POLICY "Allow all saved_places" ON saved_places FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all recent_places" ON recent_places FOR ALL USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_saved_places_user ON saved_places(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_places_type ON saved_places(place_type);
CREATE INDEX IF NOT EXISTS idx_recent_places_user ON recent_places(user_id);
CREATE INDEX IF NOT EXISTS idx_recent_places_visited ON recent_places(last_visited_at DESC);

-- Add or update recent place
CREATE OR REPLACE FUNCTION add_recent_place(
  p_user_id UUID,
  p_address TEXT,
  p_lat DECIMAL(10,8),
  p_lng DECIMAL(11,8),
  p_place_name VARCHAR(200) DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_place_id UUID;
BEGIN
  -- Check if place already exists (within ~100m)
  SELECT id INTO v_place_id FROM recent_places
  WHERE user_id = p_user_id
    AND ABS(lat - p_lat) < 0.001
    AND ABS(lng - p_lng) < 0.001;
  
  IF v_place_id IS NOT NULL THEN
    UPDATE recent_places
    SET visit_count = visit_count + 1,
        last_visited_at = NOW()
    WHERE id = v_place_id;
  ELSE
    INSERT INTO recent_places (user_id, address, lat, lng, place_name)
    VALUES (p_user_id, p_address, p_lat, p_lng, p_place_name)
    RETURNING id INTO v_place_id;
    
    -- Keep only last 20 recent places
    DELETE FROM recent_places
    WHERE user_id = p_user_id
      AND id NOT IN (
        SELECT id FROM recent_places
        WHERE user_id = p_user_id
        ORDER BY last_visited_at DESC
        LIMIT 20
      );
  END IF;
  
  RETURN v_place_id;
END;
$$ LANGUAGE plpgsql;

-- Get user places (saved + recent)
CREATE OR REPLACE FUNCTION get_user_places(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  name VARCHAR(100),
  address TEXT,
  lat DECIMAL(10,8),
  lng DECIMAL(11,8),
  place_type VARCHAR(20),
  is_saved BOOLEAN,
  visit_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sp.id,
    sp.name,
    sp.address,
    sp.lat,
    sp.lng,
    sp.place_type,
    true as is_saved,
    0 as visit_count
  FROM saved_places sp
  WHERE sp.user_id = p_user_id
  
  UNION ALL
  
  SELECT 
    rp.id,
    COALESCE(rp.place_name, 'สถานที่ล่าสุด')::VARCHAR(100) as name,
    rp.address,
    rp.lat,
    rp.lng,
    'recent'::VARCHAR(20) as place_type,
    false as is_saved,
    rp.visit_count
  FROM recent_places rp
  WHERE rp.user_id = p_user_id
  ORDER BY is_saved DESC, visit_count DESC
  LIMIT 30;
END;
$$ LANGUAGE plpgsql;
