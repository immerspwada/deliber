-- =============================================
-- CUSTOMER MODULE: Ratings
-- =============================================
-- Feature: F11 - Ride History, F26 - Service Ratings
-- Used by: Customer App
-- Depends on: customer/001_rides.sql, customer/002_delivery.sql, customer/003_shopping.sql
-- =============================================

-- Ride ratings table
CREATE TABLE IF NOT EXISTS ride_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID REFERENCES ride_requests(id) ON DELETE CASCADE UNIQUE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES service_providers(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Delivery ratings table
CREATE TABLE IF NOT EXISTS delivery_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID REFERENCES delivery_requests(id) ON DELETE CASCADE UNIQUE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES service_providers(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Shopping ratings table
CREATE TABLE IF NOT EXISTS shopping_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shopping_id UUID REFERENCES shopping_requests(id) ON DELETE CASCADE UNIQUE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES service_providers(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE ride_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_ratings ENABLE ROW LEVEL SECURITY;

-- RLS Policies (permissive for dev)
CREATE POLICY "Allow all ride_ratings" ON ride_ratings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all delivery_ratings" ON delivery_ratings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all shopping_ratings" ON shopping_ratings FOR ALL USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ride_ratings_ride ON ride_ratings(ride_id);
CREATE INDEX IF NOT EXISTS idx_ride_ratings_provider ON ride_ratings(provider_id);
CREATE INDEX IF NOT EXISTS idx_delivery_ratings_delivery ON delivery_ratings(delivery_id);
CREATE INDEX IF NOT EXISTS idx_delivery_ratings_provider ON delivery_ratings(provider_id);
CREATE INDEX IF NOT EXISTS idx_shopping_ratings_shopping ON shopping_ratings(shopping_id);
CREATE INDEX IF NOT EXISTS idx_shopping_ratings_provider ON shopping_ratings(provider_id);

-- Submit ride rating
CREATE OR REPLACE FUNCTION submit_ride_rating(
  p_ride_id UUID,
  p_user_id UUID,
  p_rating INTEGER,
  p_comment TEXT DEFAULT NULL,
  p_tags TEXT[] DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_provider_id UUID;
  v_rating_id UUID;
BEGIN
  SELECT provider_id INTO v_provider_id FROM ride_requests WHERE id = p_ride_id;
  
  INSERT INTO ride_ratings (ride_id, user_id, provider_id, rating, comment, tags)
  VALUES (p_ride_id, p_user_id, v_provider_id, p_rating, p_comment, p_tags)
  ON CONFLICT (ride_id) DO UPDATE SET
    rating = p_rating,
    comment = p_comment,
    tags = p_tags
  RETURNING id INTO v_rating_id;
  
  -- Update provider rating
  UPDATE service_providers
  SET rating = (
    SELECT ROUND(AVG(rating)::DECIMAL, 2)
    FROM ride_ratings
    WHERE provider_id = v_provider_id
  )
  WHERE id = v_provider_id;
  
  RETURN v_rating_id;
END;
$$ LANGUAGE plpgsql;

-- Submit delivery rating
CREATE OR REPLACE FUNCTION submit_delivery_rating(
  p_delivery_id UUID,
  p_user_id UUID,
  p_rating INTEGER,
  p_comment TEXT DEFAULT NULL,
  p_tags TEXT[] DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_provider_id UUID;
  v_rating_id UUID;
BEGIN
  SELECT provider_id INTO v_provider_id FROM delivery_requests WHERE id = p_delivery_id;
  
  INSERT INTO delivery_ratings (delivery_id, user_id, provider_id, rating, comment, tags)
  VALUES (p_delivery_id, p_user_id, v_provider_id, p_rating, p_comment, p_tags)
  ON CONFLICT (delivery_id) DO UPDATE SET
    rating = p_rating,
    comment = p_comment,
    tags = p_tags
  RETURNING id INTO v_rating_id;
  
  RETURN v_rating_id;
END;
$$ LANGUAGE plpgsql;

-- Submit shopping rating
CREATE OR REPLACE FUNCTION submit_shopping_rating(
  p_shopping_id UUID,
  p_user_id UUID,
  p_rating INTEGER,
  p_comment TEXT DEFAULT NULL,
  p_tags TEXT[] DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_provider_id UUID;
  v_rating_id UUID;
BEGIN
  SELECT provider_id INTO v_provider_id FROM shopping_requests WHERE id = p_shopping_id;
  
  INSERT INTO shopping_ratings (shopping_id, user_id, provider_id, rating, comment, tags)
  VALUES (p_shopping_id, p_user_id, v_provider_id, p_rating, p_comment, p_tags)
  ON CONFLICT (shopping_id) DO UPDATE SET
    rating = p_rating,
    comment = p_comment,
    tags = p_tags
  RETURNING id INTO v_rating_id;
  
  RETURN v_rating_id;
END;
$$ LANGUAGE plpgsql;

-- Get provider ratings summary
CREATE OR REPLACE FUNCTION get_provider_ratings_summary(p_provider_id UUID)
RETURNS TABLE (
  total_ratings BIGINT,
  average_rating DECIMAL(3,2),
  rating_5 BIGINT,
  rating_4 BIGINT,
  rating_3 BIGINT,
  rating_2 BIGINT,
  rating_1 BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH all_ratings AS (
    SELECT rating FROM ride_ratings WHERE provider_id = p_provider_id
    UNION ALL
    SELECT rating FROM delivery_ratings WHERE provider_id = p_provider_id
    UNION ALL
    SELECT rating FROM shopping_ratings WHERE provider_id = p_provider_id
  )
  SELECT
    COUNT(*)::BIGINT as total_ratings,
    COALESCE(ROUND(AVG(rating)::DECIMAL, 2), 0)::DECIMAL(3,2) as average_rating,
    COUNT(*) FILTER (WHERE rating = 5)::BIGINT as rating_5,
    COUNT(*) FILTER (WHERE rating = 4)::BIGINT as rating_4,
    COUNT(*) FILTER (WHERE rating = 3)::BIGINT as rating_3,
    COUNT(*) FILTER (WHERE rating = 2)::BIGINT as rating_2,
    COUNT(*) FILTER (WHERE rating = 1)::BIGINT as rating_1
  FROM all_ratings;
END;
$$ LANGUAGE plpgsql;
