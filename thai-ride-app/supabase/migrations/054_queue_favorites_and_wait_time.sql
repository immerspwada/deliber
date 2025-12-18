-- Migration: 054_queue_favorites_and_wait_time.sql
-- Feature: F158a - Queue Favorite Places & Estimated Wait Time
-- Description: เพิ่มระบบสถานที่โปรดสำหรับ Queue Booking และ Estimated Wait Time

-- =====================================================
-- 1. QUEUE FAVORITE PLACES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS queue_favorite_places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category VARCHAR(20) NOT NULL CHECK (category IN ('hospital', 'bank', 'government', 'restaurant', 'salon', 'other')),
  place_name VARCHAR(255) NOT NULL,
  place_address TEXT,
  place_phone VARCHAR(20),
  place_lat DECIMAL(10, 8),
  place_lng DECIMAL(11, 8),
  default_details TEXT,
  avg_wait_time_minutes INTEGER, -- Average wait time from user's experience
  last_visit_at TIMESTAMPTZ,
  visit_count INTEGER DEFAULT 0,
  is_favorite BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate places for same user
  UNIQUE(user_id, place_name, category)
);

-- Index for fast lookup
CREATE INDEX idx_queue_favorite_places_user ON queue_favorite_places(user_id);
CREATE INDEX idx_queue_favorite_places_category ON queue_favorite_places(user_id, category);
CREATE INDEX idx_queue_favorite_places_visit ON queue_favorite_places(user_id, visit_count DESC);

-- =====================================================
-- 2. QUEUE PLACE STATISTICS TABLE (for estimated wait time)
-- =====================================================

CREATE TABLE IF NOT EXISTS queue_place_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_name VARCHAR(255) NOT NULL,
  category VARCHAR(20) NOT NULL CHECK (category IN ('hospital', 'bank', 'government', 'restaurant', 'salon', 'other')),
  
  -- Wait time statistics
  avg_wait_time_minutes INTEGER DEFAULT 30,
  min_wait_time_minutes INTEGER DEFAULT 10,
  max_wait_time_minutes INTEGER DEFAULT 60,
  
  -- Time-based statistics
  morning_avg_wait INTEGER DEFAULT 30, -- 06:00-12:00
  afternoon_avg_wait INTEGER DEFAULT 45, -- 12:00-18:00
  evening_avg_wait INTEGER DEFAULT 20, -- 18:00-22:00
  
  -- Day-based statistics
  weekday_avg_wait INTEGER DEFAULT 40,
  weekend_avg_wait INTEGER DEFAULT 25,
  
  -- Popularity
  total_bookings INTEGER DEFAULT 0,
  completed_bookings INTEGER DEFAULT 0,
  avg_rating DECIMAL(3, 2) DEFAULT 0,
  
  -- Metadata
  last_updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(place_name, category)
);

-- Index for lookup
CREATE INDEX idx_queue_place_stats_name ON queue_place_stats(place_name);
CREATE INDEX idx_queue_place_stats_category ON queue_place_stats(category);

-- =====================================================
-- 3. ADD COLUMNS TO QUEUE_BOOKINGS
-- =====================================================

-- Add estimated wait time to bookings
ALTER TABLE queue_bookings 
ADD COLUMN IF NOT EXISTS estimated_wait_minutes INTEGER,
ADD COLUMN IF NOT EXISTS actual_wait_minutes INTEGER,
ADD COLUMN IF NOT EXISTS queue_position INTEGER,
ADD COLUMN IF NOT EXISTS favorite_place_id UUID REFERENCES queue_favorite_places(id) ON DELETE SET NULL;

-- =====================================================
-- 4. RLS POLICIES
-- =====================================================

ALTER TABLE queue_favorite_places ENABLE ROW LEVEL SECURITY;
ALTER TABLE queue_place_stats ENABLE ROW LEVEL SECURITY;

-- Queue Favorite Places: Users can manage their own
CREATE POLICY "Users can view own favorite places"
  ON queue_favorite_places FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own favorite places"
  ON queue_favorite_places FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own favorite places"
  ON queue_favorite_places FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorite places"
  ON queue_favorite_places FOR DELETE
  USING (auth.uid() = user_id);

-- Queue Place Stats: Everyone can read, only system can write
CREATE POLICY "Anyone can view place stats"
  ON queue_place_stats FOR SELECT
  USING (true);

-- Admin can manage place stats
CREATE POLICY "Admin can manage place stats"
  ON queue_place_stats FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );


-- =====================================================
-- 5. FUNCTIONS
-- =====================================================

-- Function: Add/Update favorite place
CREATE OR REPLACE FUNCTION save_queue_favorite_place(
  p_user_id UUID,
  p_category VARCHAR(20),
  p_place_name VARCHAR(255),
  p_place_address TEXT DEFAULT NULL,
  p_place_phone VARCHAR(20) DEFAULT NULL,
  p_default_details TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_place_id UUID;
BEGIN
  INSERT INTO queue_favorite_places (
    user_id, category, place_name, place_address, 
    place_phone, default_details, notes
  )
  VALUES (
    p_user_id, p_category, p_place_name, p_place_address,
    p_place_phone, p_default_details, p_notes
  )
  ON CONFLICT (user_id, place_name, category) 
  DO UPDATE SET
    place_address = COALESCE(EXCLUDED.place_address, queue_favorite_places.place_address),
    place_phone = COALESCE(EXCLUDED.place_phone, queue_favorite_places.place_phone),
    default_details = COALESCE(EXCLUDED.default_details, queue_favorite_places.default_details),
    notes = COALESCE(EXCLUDED.notes, queue_favorite_places.notes),
    is_favorite = true,
    updated_at = NOW()
  RETURNING id INTO v_place_id;
  
  RETURN v_place_id;
END;
$$;

-- Function: Get estimated wait time for a place
CREATE OR REPLACE FUNCTION get_estimated_wait_time(
  p_place_name VARCHAR(255),
  p_category VARCHAR(20),
  p_scheduled_time TIME DEFAULT NULL
)
RETURNS TABLE (
  avg_wait INTEGER,
  min_wait INTEGER,
  max_wait INTEGER,
  time_based_wait INTEGER,
  confidence VARCHAR(10)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stats RECORD;
  v_hour INTEGER;
  v_is_weekend BOOLEAN;
  v_time_wait INTEGER;
  v_confidence VARCHAR(10);
BEGIN
  -- Get place stats
  SELECT * INTO v_stats
  FROM queue_place_stats
  WHERE queue_place_stats.place_name = p_place_name
    AND queue_place_stats.category = p_category;
  
  -- If no stats, return default estimates based on category
  IF v_stats IS NULL THEN
    v_confidence := 'low';
    
    RETURN QUERY SELECT
      CASE p_category
        WHEN 'hospital' THEN 45
        WHEN 'bank' THEN 30
        WHEN 'government' THEN 60
        WHEN 'restaurant' THEN 15
        WHEN 'salon' THEN 20
        ELSE 30
      END AS avg_wait,
      10 AS min_wait,
      90 AS max_wait,
      30 AS time_based_wait,
      v_confidence AS confidence;
    RETURN;
  END IF;
  
  -- Calculate time-based wait
  v_hour := EXTRACT(HOUR FROM COALESCE(p_scheduled_time, CURRENT_TIME));
  v_is_weekend := EXTRACT(DOW FROM CURRENT_DATE) IN (0, 6);
  
  IF v_hour >= 6 AND v_hour < 12 THEN
    v_time_wait := v_stats.morning_avg_wait;
  ELSIF v_hour >= 12 AND v_hour < 18 THEN
    v_time_wait := v_stats.afternoon_avg_wait;
  ELSE
    v_time_wait := v_stats.evening_avg_wait;
  END IF;
  
  -- Adjust for weekend
  IF v_is_weekend THEN
    v_time_wait := LEAST(v_time_wait, v_stats.weekend_avg_wait);
  END IF;
  
  -- Determine confidence based on total bookings
  IF v_stats.total_bookings >= 100 THEN
    v_confidence := 'high';
  ELSIF v_stats.total_bookings >= 20 THEN
    v_confidence := 'medium';
  ELSE
    v_confidence := 'low';
  END IF;
  
  RETURN QUERY SELECT
    v_stats.avg_wait_time_minutes AS avg_wait,
    v_stats.min_wait_time_minutes AS min_wait,
    v_stats.max_wait_time_minutes AS max_wait,
    v_time_wait AS time_based_wait,
    v_confidence AS confidence;
END;
$$;

-- Function: Update place stats after booking completion
CREATE OR REPLACE FUNCTION update_queue_place_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_wait_time INTEGER;
BEGIN
  -- Only process completed bookings with actual wait time
  IF NEW.status = 'completed' AND NEW.actual_wait_minutes IS NOT NULL THEN
    v_wait_time := NEW.actual_wait_minutes;
    
    -- Upsert place stats
    INSERT INTO queue_place_stats (
      place_name, category, avg_wait_time_minutes, 
      min_wait_time_minutes, max_wait_time_minutes,
      total_bookings, completed_bookings
    )
    VALUES (
      NEW.place_name, NEW.category, v_wait_time,
      v_wait_time, v_wait_time, 1, 1
    )
    ON CONFLICT (place_name, category)
    DO UPDATE SET
      avg_wait_time_minutes = (
        (queue_place_stats.avg_wait_time_minutes * queue_place_stats.completed_bookings + v_wait_time) 
        / (queue_place_stats.completed_bookings + 1)
      )::INTEGER,
      min_wait_time_minutes = LEAST(queue_place_stats.min_wait_time_minutes, v_wait_time),
      max_wait_time_minutes = GREATEST(queue_place_stats.max_wait_time_minutes, v_wait_time),
      total_bookings = queue_place_stats.total_bookings + 1,
      completed_bookings = queue_place_stats.completed_bookings + 1,
      last_updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger: Update stats on booking completion
DROP TRIGGER IF EXISTS trg_update_queue_place_stats ON queue_bookings;
CREATE TRIGGER trg_update_queue_place_stats
  AFTER UPDATE ON queue_bookings
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'completed')
  EXECUTE FUNCTION update_queue_place_stats();

-- Function: Update favorite place visit count
CREATE OR REPLACE FUNCTION update_favorite_place_visit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update visit count when booking is created from favorite
  IF NEW.favorite_place_id IS NOT NULL THEN
    UPDATE queue_favorite_places
    SET 
      visit_count = visit_count + 1,
      last_visit_at = NOW(),
      updated_at = NOW()
    WHERE id = NEW.favorite_place_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger: Update favorite visit on booking
DROP TRIGGER IF EXISTS trg_update_favorite_visit ON queue_bookings;
CREATE TRIGGER trg_update_favorite_visit
  AFTER INSERT ON queue_bookings
  FOR EACH ROW
  WHEN (NEW.favorite_place_id IS NOT NULL)
  EXECUTE FUNCTION update_favorite_place_visit();

-- Function: Get user's favorite places with stats
CREATE OR REPLACE FUNCTION get_queue_favorites_with_stats(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  category VARCHAR(20),
  place_name VARCHAR(255),
  place_address TEXT,
  place_phone VARCHAR(20),
  default_details TEXT,
  visit_count INTEGER,
  last_visit_at TIMESTAMPTZ,
  avg_wait_time INTEGER,
  confidence VARCHAR(10)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f.id,
    f.category,
    f.place_name,
    f.place_address,
    f.place_phone,
    f.default_details,
    f.visit_count,
    f.last_visit_at,
    COALESCE(s.avg_wait_time_minutes, 30) AS avg_wait_time,
    CASE 
      WHEN s.total_bookings >= 100 THEN 'high'::VARCHAR(10)
      WHEN s.total_bookings >= 20 THEN 'medium'::VARCHAR(10)
      ELSE 'low'::VARCHAR(10)
    END AS confidence
  FROM queue_favorite_places f
  LEFT JOIN queue_place_stats s 
    ON f.place_name = s.place_name AND f.category = s.category
  WHERE f.user_id = p_user_id AND f.is_favorite = true
  ORDER BY f.visit_count DESC, f.last_visit_at DESC NULLS LAST;
END;
$$;

-- =====================================================
-- 6. SEED DEFAULT PLACE STATS (Popular places in Thailand)
-- =====================================================

INSERT INTO queue_place_stats (place_name, category, avg_wait_time_minutes, min_wait_time_minutes, max_wait_time_minutes, morning_avg_wait, afternoon_avg_wait, evening_avg_wait, weekday_avg_wait, weekend_avg_wait, total_bookings)
VALUES
  -- Hospitals
  ('โรงพยาบาลรามาธิบดี', 'hospital', 60, 20, 120, 45, 75, 40, 65, 50, 50),
  ('โรงพยาบาลศิริราช', 'hospital', 75, 30, 150, 60, 90, 45, 80, 55, 50),
  ('โรงพยาบาลจุฬาลงกรณ์', 'hospital', 55, 20, 100, 40, 70, 35, 60, 45, 50),
  ('โรงพยาบาลบำรุงราษฎร์', 'hospital', 30, 10, 60, 25, 40, 20, 35, 25, 50),
  
  -- Banks
  ('ธนาคารกรุงเทพ', 'bank', 25, 10, 45, 20, 35, 15, 30, 20, 50),
  ('ธนาคารกสิกรไทย', 'bank', 20, 5, 40, 15, 30, 10, 25, 15, 50),
  ('ธนาคารไทยพาณิชย์', 'bank', 22, 8, 40, 18, 32, 12, 28, 18, 50),
  ('ธนาคารกรุงไทย', 'bank', 30, 10, 50, 25, 40, 20, 35, 25, 50),
  
  -- Government
  ('สำนักงานเขต', 'government', 45, 15, 90, 35, 60, 30, 50, 35, 50),
  ('กรมการขนส่งทางบก', 'government', 60, 20, 120, 50, 80, 40, 70, 45, 50),
  ('สำนักงานที่ดิน', 'government', 50, 20, 100, 40, 65, 35, 55, 40, 50),
  ('สำนักงานประกันสังคม', 'government', 40, 15, 80, 30, 55, 25, 45, 30, 50)
ON CONFLICT (place_name, category) DO NOTHING;

-- =====================================================
-- 7. GRANT PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION save_queue_favorite_place TO authenticated;
GRANT EXECUTE ON FUNCTION get_estimated_wait_time TO authenticated;
GRANT EXECUTE ON FUNCTION get_queue_favorites_with_stats TO authenticated;
