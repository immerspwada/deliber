-- Feature: F10 - Promo Codes Enhancement (Favorites & Categories)
-- Tables: promo_codes, favorite_promos

-- Add category column to promo_codes if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'promo_codes' AND column_name = 'category') THEN
    ALTER TABLE promo_codes ADD COLUMN category TEXT DEFAULT 'all' CHECK (category IN ('all', 'ride', 'delivery', 'shopping'));
  END IF;
END $$;

-- Create favorite_promos table
CREATE TABLE IF NOT EXISTS favorite_promos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  promo_id UUID NOT NULL REFERENCES promo_codes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, promo_id)
);

-- Enable RLS
ALTER TABLE favorite_promos ENABLE ROW LEVEL SECURITY;

-- RLS Policies for favorite_promos
DROP POLICY IF EXISTS "Users can view own favorites" ON favorite_promos;
CREATE POLICY "Users can view own favorites" ON favorite_promos
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can add favorites" ON favorite_promos;
CREATE POLICY "Users can add favorites" ON favorite_promos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can remove favorites" ON favorite_promos;
CREATE POLICY "Users can remove favorites" ON favorite_promos
  FOR DELETE USING (auth.uid() = user_id);

-- Function to check promo expiry and send notifications
CREATE OR REPLACE FUNCTION check_promo_expiry_notifications()
RETURNS void AS $$
DECLARE
  promo RECORD;
  fav RECORD;
BEGIN
  -- Find promos expiring in 1 day
  FOR promo IN 
    SELECT * FROM promo_codes 
    WHERE is_active = true 
    AND valid_until BETWEEN NOW() AND NOW() + INTERVAL '1 day'
  LOOP
    -- Notify users who favorited this promo
    FOR fav IN SELECT user_id FROM favorite_promos WHERE promo_id = promo.id LOOP
      INSERT INTO user_notifications (user_id, type, title, message, data)
      VALUES (
        fav.user_id,
        'promo',
        'โปรโมชั่นใกล้หมดอายุ',
        'โค้ด ' || promo.code || ' จะหมดอายุภายใน 24 ชั่วโมง',
        jsonb_build_object('promo_id', promo.id, 'code', promo.code)
      );
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function for new promo notifications
CREATE OR REPLACE FUNCTION notify_new_promo()
RETURNS TRIGGER AS $$
BEGIN
  -- Only notify for active promos
  IF NEW.is_active = true THEN
    -- Insert notification for all active users (limit to recent users)
    INSERT INTO user_notifications (user_id, type, title, message, data)
    SELECT 
      id,
      'promo',
      'โปรโมชั่นใหม่!',
      'ใช้โค้ด ' || NEW.code || ' รับส่วนลด' || 
        CASE WHEN NEW.discount_type = 'fixed' THEN ' ฿' || NEW.discount_value 
        ELSE ' ' || NEW.discount_value || '%' END,
      jsonb_build_object('promo_id', NEW.id, 'code', NEW.code)
    FROM users
    WHERE created_at > NOW() - INTERVAL '90 days'
    LIMIT 1000;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new promos (drop if exists first)
DROP TRIGGER IF EXISTS on_new_promo ON promo_codes;
CREATE TRIGGER on_new_promo
  AFTER INSERT ON promo_codes
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_promo();

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_favorite_promos_user ON favorite_promos(user_id);
CREATE INDEX IF NOT EXISTS idx_favorite_promos_promo ON favorite_promos(promo_id);
CREATE INDEX IF NOT EXISTS idx_promo_codes_category ON promo_codes(category);
