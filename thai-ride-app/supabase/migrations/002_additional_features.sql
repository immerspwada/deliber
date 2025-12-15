-- Additional Features Schema
-- Promo codes, saved places, ratings, tips

-- Promo codes table
CREATE TABLE IF NOT EXISTS public.promo_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('fixed', 'percentage')),
  discount_value DECIMAL(10,2) NOT NULL,
  max_discount DECIMAL(10,2),
  min_order_amount DECIMAL(10,2) DEFAULT 0,
  usage_limit INTEGER,
  used_count INTEGER DEFAULT 0,
  valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  valid_until TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User promo usage tracking
CREATE TABLE IF NOT EXISTS public.user_promo_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  promo_id UUID REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, promo_id)
);

-- Saved places table
CREATE TABLE IF NOT EXISTS public.saved_places (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  address TEXT NOT NULL,
  lat DECIMAL(10,8) NOT NULL,
  lng DECIMAL(11,8) NOT NULL,
  place_type VARCHAR(20) DEFAULT 'other' CHECK (place_type IN ('home', 'work', 'other')),
  icon VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ride history with more details
CREATE TABLE IF NOT EXISTS public.ride_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ride_id UUID REFERENCES public.ride_requests(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES public.service_providers(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  tip_amount DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recent searches/places
CREATE TABLE IF NOT EXISTS public.recent_places (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  address TEXT NOT NULL,
  lat DECIMAL(10,8) NOT NULL,
  lng DECIMAL(11,8) NOT NULL,
  search_count INTEGER DEFAULT 1,
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON public.promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_codes_active ON public.promo_codes(is_active);
CREATE INDEX IF NOT EXISTS idx_saved_places_user ON public.saved_places(user_id);
CREATE INDEX IF NOT EXISTS idx_recent_places_user ON public.recent_places(user_id);
CREATE INDEX IF NOT EXISTS idx_ride_ratings_ride ON public.ride_ratings(ride_id);

-- RLS
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_promo_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_places ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ride_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recent_places ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view active promos" ON public.promo_codes
  FOR SELECT USING (is_active = true AND (valid_until IS NULL OR valid_until > NOW()));

CREATE POLICY "Users can view own promo usage" ON public.user_promo_usage
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can use promos" ON public.user_promo_usage
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can manage own saved places" ON public.saved_places
  FOR ALL USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can manage own ratings" ON public.ride_ratings
  FOR ALL USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can manage own recent places" ON public.recent_places
  FOR ALL USING (auth.uid()::text = user_id::text);

-- Insert sample promo codes
INSERT INTO public.promo_codes (code, description, discount_type, discount_value, max_discount, valid_until) VALUES
  ('FIRST50', 'ส่วนลดสำหรับผู้ใช้ใหม่', 'fixed', 50, NULL, NOW() + INTERVAL '1 year'),
  ('SAVE20', 'ลด 20 บาท', 'fixed', 20, NULL, NOW() + INTERVAL '6 months'),
  ('RIDE10', 'ลด 10%', 'percentage', 10, 100, NOW() + INTERVAL '3 months'),
  ('WEEKEND', 'ส่วนลดวันหยุด', 'percentage', 15, 80, NOW() + INTERVAL '1 month')
ON CONFLICT (code) DO NOTHING;

-- Function to validate and apply promo code
CREATE OR REPLACE FUNCTION validate_promo_code(
  p_code VARCHAR(50),
  p_user_id UUID,
  p_order_amount DECIMAL(10,2)
)
RETURNS TABLE (
  is_valid BOOLEAN,
  discount_amount DECIMAL(10,2),
  message TEXT,
  promo_id UUID
) AS $$
DECLARE
  v_promo RECORD;
  v_used BOOLEAN;
  v_discount DECIMAL(10,2);
BEGIN
  -- Find promo code
  SELECT * INTO v_promo FROM public.promo_codes
  WHERE UPPER(code) = UPPER(p_code)
    AND is_active = true
    AND (valid_from IS NULL OR valid_from <= NOW())
    AND (valid_until IS NULL OR valid_until > NOW())
    AND (usage_limit IS NULL OR used_count < usage_limit);
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0::DECIMAL(10,2), 'โค้ดไม่ถูกต้องหรือหมดอายุ'::TEXT, NULL::UUID;
    RETURN;
  END IF;
  
  -- Check if user already used this promo
  SELECT EXISTS(
    SELECT 1 FROM public.user_promo_usage
    WHERE user_id = p_user_id AND promo_id = v_promo.id
  ) INTO v_used;
  
  IF v_used THEN
    RETURN QUERY SELECT false, 0::DECIMAL(10,2), 'คุณใช้โค้ดนี้แล้ว'::TEXT, NULL::UUID;
    RETURN;
  END IF;
  
  -- Check minimum order amount
  IF p_order_amount < v_promo.min_order_amount THEN
    RETURN QUERY SELECT false, 0::DECIMAL(10,2), 
      ('ยอดขั้นต่ำ ฿' || v_promo.min_order_amount)::TEXT, NULL::UUID;
    RETURN;
  END IF;
  
  -- Calculate discount
  IF v_promo.discount_type = 'fixed' THEN
    v_discount := v_promo.discount_value;
  ELSE
    v_discount := p_order_amount * (v_promo.discount_value / 100);
    IF v_promo.max_discount IS NOT NULL AND v_discount > v_promo.max_discount THEN
      v_discount := v_promo.max_discount;
    END IF;
  END IF;
  
  RETURN QUERY SELECT true, v_discount, v_promo.description, v_promo.id;
END;
$$ LANGUAGE plpgsql;

-- Function to use promo code
CREATE OR REPLACE FUNCTION use_promo_code(
  p_code VARCHAR(50),
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_promo_id UUID;
BEGIN
  SELECT id INTO v_promo_id FROM public.promo_codes
  WHERE UPPER(code) = UPPER(p_code) AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Record usage
  INSERT INTO public.user_promo_usage (user_id, promo_id)
  VALUES (p_user_id, v_promo_id)
  ON CONFLICT DO NOTHING;
  
  -- Update usage count
  UPDATE public.promo_codes SET used_count = used_count + 1
  WHERE id = v_promo_id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Trigger for recent places updated_at
CREATE TRIGGER update_saved_places_updated_at BEFORE UPDATE ON public.saved_places
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
