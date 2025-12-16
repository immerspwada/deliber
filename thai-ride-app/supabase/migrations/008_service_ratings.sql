-- =====================================================
-- Feature: F26 - Delivery/Shopping Ratings
-- Tables: delivery_ratings, shopping_ratings
-- Description: Rating system for delivery and shopping services
-- =====================================================

-- =====================================================
-- 1. DELIVERY RATINGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.delivery_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  delivery_id UUID REFERENCES public.delivery_requests(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES public.service_providers(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  -- Specific rating categories
  speed_rating INTEGER CHECK (speed_rating >= 1 AND speed_rating <= 5),
  care_rating INTEGER CHECK (care_rating >= 1 AND care_rating <= 5),
  communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
  -- Feedback
  comment TEXT,
  tip_amount DECIMAL(10,2) DEFAULT 0,
  -- Tags for quick feedback
  tags TEXT[] DEFAULT '{}',
  -- Photos (proof of delivery condition)
  photos TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(delivery_id, user_id)
);

-- =====================================================
-- 2. SHOPPING RATINGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.shopping_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shopping_id UUID REFERENCES public.shopping_requests(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES public.service_providers(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  -- Specific rating categories
  item_selection_rating INTEGER CHECK (item_selection_rating >= 1 AND item_selection_rating <= 5),
  freshness_rating INTEGER CHECK (freshness_rating >= 1 AND freshness_rating <= 5),
  communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
  delivery_rating INTEGER CHECK (delivery_rating >= 1 AND delivery_rating <= 5),
  -- Feedback
  comment TEXT,
  tip_amount DECIMAL(10,2) DEFAULT 0,
  -- Tags for quick feedback
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(shopping_id, user_id)
);

-- =====================================================
-- 3. INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_delivery_ratings_delivery ON public.delivery_ratings(delivery_id);
CREATE INDEX IF NOT EXISTS idx_delivery_ratings_user ON public.delivery_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_delivery_ratings_provider ON public.delivery_ratings(provider_id);
CREATE INDEX IF NOT EXISTS idx_delivery_ratings_rating ON public.delivery_ratings(rating);

CREATE INDEX IF NOT EXISTS idx_shopping_ratings_shopping ON public.shopping_ratings(shopping_id);
CREATE INDEX IF NOT EXISTS idx_shopping_ratings_user ON public.shopping_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_shopping_ratings_provider ON public.shopping_ratings(provider_id);
CREATE INDEX IF NOT EXISTS idx_shopping_ratings_rating ON public.shopping_ratings(rating);

-- =====================================================
-- 4. ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.delivery_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_ratings ENABLE ROW LEVEL SECURITY;

-- Permissive policies for development
DROP POLICY IF EXISTS "Allow all delivery_ratings" ON public.delivery_ratings;
CREATE POLICY "Allow all delivery_ratings" ON public.delivery_ratings 
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all shopping_ratings" ON public.shopping_ratings;
CREATE POLICY "Allow all shopping_ratings" ON public.shopping_ratings 
  FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- 5. FUNCTIONS
-- =====================================================

-- Submit delivery rating
CREATE OR REPLACE FUNCTION submit_delivery_rating(
  p_delivery_id UUID,
  p_user_id UUID,
  p_rating INTEGER,
  p_speed_rating INTEGER DEFAULT NULL,
  p_care_rating INTEGER DEFAULT NULL,
  p_communication_rating INTEGER DEFAULT NULL,
  p_comment TEXT DEFAULT NULL,
  p_tip_amount DECIMAL(10,2) DEFAULT 0,
  p_tags TEXT[] DEFAULT '{}'
)
RETURNS UUID AS $
DECLARE
  v_provider_id UUID;
  v_rating_id UUID;
BEGIN
  -- Get provider from delivery
  SELECT provider_id INTO v_provider_id 
  FROM public.delivery_requests 
  WHERE id = p_delivery_id;
  
  IF v_provider_id IS NULL THEN
    RAISE EXCEPTION 'Delivery not found or no provider assigned';
  END IF;
  
  -- Insert rating
  INSERT INTO public.delivery_ratings (
    delivery_id, user_id, provider_id, rating,
    speed_rating, care_rating, communication_rating,
    comment, tip_amount, tags
  ) VALUES (
    p_delivery_id, p_user_id, v_provider_id, p_rating,
    p_speed_rating, p_care_rating, p_communication_rating,
    p_comment, p_tip_amount, p_tags
  )
  ON CONFLICT (delivery_id, user_id) DO UPDATE SET
    rating = EXCLUDED.rating,
    speed_rating = EXCLUDED.speed_rating,
    care_rating = EXCLUDED.care_rating,
    communication_rating = EXCLUDED.communication_rating,
    comment = EXCLUDED.comment,
    tip_amount = EXCLUDED.tip_amount,
    tags = EXCLUDED.tags
  RETURNING id INTO v_rating_id;
  
  -- Update provider average rating
  UPDATE public.service_providers SET
    rating = (
      SELECT ROUND(AVG(rating)::NUMERIC, 2)
      FROM (
        SELECT rating FROM public.ride_ratings WHERE provider_id = v_provider_id
        UNION ALL
        SELECT rating FROM public.delivery_ratings WHERE provider_id = v_provider_id
        UNION ALL
        SELECT rating FROM public.shopping_ratings WHERE provider_id = v_provider_id
      ) all_ratings
    )
  WHERE id = v_provider_id;
  
  -- Add tip to wallet if provided
  IF p_tip_amount > 0 THEN
    PERFORM add_wallet_transaction(
      (SELECT user_id FROM public.service_providers WHERE id = v_provider_id),
      'cashback',
      p_tip_amount,
      'ทิปจากการส่งของ'
    );
  END IF;
  
  RETURN v_rating_id;
END;
$ LANGUAGE plpgsql;

-- Submit shopping rating
CREATE OR REPLACE FUNCTION submit_shopping_rating(
  p_shopping_id UUID,
  p_user_id UUID,
  p_rating INTEGER,
  p_item_selection_rating INTEGER DEFAULT NULL,
  p_freshness_rating INTEGER DEFAULT NULL,
  p_communication_rating INTEGER DEFAULT NULL,
  p_delivery_rating INTEGER DEFAULT NULL,
  p_comment TEXT DEFAULT NULL,
  p_tip_amount DECIMAL(10,2) DEFAULT 0,
  p_tags TEXT[] DEFAULT '{}'
)
RETURNS UUID AS $
DECLARE
  v_provider_id UUID;
  v_rating_id UUID;
BEGIN
  -- Get provider from shopping request
  SELECT provider_id INTO v_provider_id 
  FROM public.shopping_requests 
  WHERE id = p_shopping_id;
  
  IF v_provider_id IS NULL THEN
    RAISE EXCEPTION 'Shopping request not found or no provider assigned';
  END IF;
  
  -- Insert rating
  INSERT INTO public.shopping_ratings (
    shopping_id, user_id, provider_id, rating,
    item_selection_rating, freshness_rating, communication_rating, delivery_rating,
    comment, tip_amount, tags
  ) VALUES (
    p_shopping_id, p_user_id, v_provider_id, p_rating,
    p_item_selection_rating, p_freshness_rating, p_communication_rating, p_delivery_rating,
    p_comment, p_tip_amount, p_tags
  )
  ON CONFLICT (shopping_id, user_id) DO UPDATE SET
    rating = EXCLUDED.rating,
    item_selection_rating = EXCLUDED.item_selection_rating,
    freshness_rating = EXCLUDED.freshness_rating,
    communication_rating = EXCLUDED.communication_rating,
    delivery_rating = EXCLUDED.delivery_rating,
    comment = EXCLUDED.comment,
    tip_amount = EXCLUDED.tip_amount,
    tags = EXCLUDED.tags
  RETURNING id INTO v_rating_id;
  
  -- Update provider average rating
  UPDATE public.service_providers SET
    rating = (
      SELECT ROUND(AVG(rating)::NUMERIC, 2)
      FROM (
        SELECT rating FROM public.ride_ratings WHERE provider_id = v_provider_id
        UNION ALL
        SELECT rating FROM public.delivery_ratings WHERE provider_id = v_provider_id
        UNION ALL
        SELECT rating FROM public.shopping_ratings WHERE provider_id = v_provider_id
      ) all_ratings
    )
  WHERE id = v_provider_id;
  
  -- Add tip to wallet if provided
  IF p_tip_amount > 0 THEN
    PERFORM add_wallet_transaction(
      (SELECT user_id FROM public.service_providers WHERE id = v_provider_id),
      'cashback',
      p_tip_amount,
      'ทิปจากการซื้อของ'
    );
  END IF;
  
  RETURN v_rating_id;
END;
$ LANGUAGE plpgsql;

-- Get provider ratings summary
CREATE OR REPLACE FUNCTION get_provider_ratings_summary(p_provider_id UUID)
RETURNS TABLE (
  total_ratings INTEGER,
  average_rating DECIMAL(3,2),
  ride_ratings INTEGER,
  ride_avg DECIMAL(3,2),
  delivery_ratings INTEGER,
  delivery_avg DECIMAL(3,2),
  shopping_ratings INTEGER,
  shopping_avg DECIMAL(3,2),
  five_star INTEGER,
  four_star INTEGER,
  three_star INTEGER,
  two_star INTEGER,
  one_star INTEGER
) AS $
BEGIN
  RETURN QUERY
  WITH all_ratings AS (
    SELECT rating, 'ride' as type FROM public.ride_ratings WHERE provider_id = p_provider_id
    UNION ALL
    SELECT rating, 'delivery' as type FROM public.delivery_ratings WHERE provider_id = p_provider_id
    UNION ALL
    SELECT rating, 'shopping' as type FROM public.shopping_ratings WHERE provider_id = p_provider_id
  )
  SELECT
    COUNT(*)::INTEGER as total_ratings,
    ROUND(AVG(rating)::NUMERIC, 2)::DECIMAL(3,2) as average_rating,
    COUNT(*) FILTER (WHERE type = 'ride')::INTEGER as ride_ratings,
    ROUND(AVG(rating) FILTER (WHERE type = 'ride')::NUMERIC, 2)::DECIMAL(3,2) as ride_avg,
    COUNT(*) FILTER (WHERE type = 'delivery')::INTEGER as delivery_ratings,
    ROUND(AVG(rating) FILTER (WHERE type = 'delivery')::NUMERIC, 2)::DECIMAL(3,2) as delivery_avg,
    COUNT(*) FILTER (WHERE type = 'shopping')::INTEGER as shopping_ratings,
    ROUND(AVG(rating) FILTER (WHERE type = 'shopping')::NUMERIC, 2)::DECIMAL(3,2) as shopping_avg,
    COUNT(*) FILTER (WHERE rating = 5)::INTEGER as five_star,
    COUNT(*) FILTER (WHERE rating = 4)::INTEGER as four_star,
    COUNT(*) FILTER (WHERE rating = 3)::INTEGER as three_star,
    COUNT(*) FILTER (WHERE rating = 2)::INTEGER as two_star,
    COUNT(*) FILTER (WHERE rating = 1)::INTEGER as one_star
  FROM all_ratings;
END;
$ LANGUAGE plpgsql;

-- =====================================================
-- 6. GRANT PERMISSIONS
-- =====================================================

GRANT ALL ON public.delivery_ratings TO anon;
GRANT ALL ON public.delivery_ratings TO authenticated;
GRANT ALL ON public.shopping_ratings TO anon;
GRANT ALL ON public.shopping_ratings TO authenticated;
GRANT EXECUTE ON FUNCTION submit_delivery_rating TO anon;
GRANT EXECUTE ON FUNCTION submit_delivery_rating TO authenticated;
GRANT EXECUTE ON FUNCTION submit_shopping_rating TO anon;
GRANT EXECUTE ON FUNCTION submit_shopping_rating TO authenticated;
GRANT EXECUTE ON FUNCTION get_provider_ratings_summary TO anon;
GRANT EXECUTE ON FUNCTION get_provider_ratings_summary TO authenticated;
