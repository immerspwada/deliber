-- Feature: F10 - Promo Alerts (Favorite Promo Notifications)
-- Tables: user_notifications, favorite_promos, promo_codes

-- Function to check and send alerts for favorite promos
-- Checks for: 1) Expiring soon (within 1 day), 2) Low stock (<=10 remaining)
CREATE OR REPLACE FUNCTION check_favorite_promo_alerts()
RETURNS void AS $$
DECLARE
  promo RECORD;
  fav RECORD;
  remaining INT;
BEGIN
  -- Check promos expiring within 1 day
  FOR promo IN 
    SELECT * FROM promo_codes 
    WHERE is_active = true 
    AND valid_until BETWEEN NOW() AND NOW() + INTERVAL '1 day'
  LOOP
    FOR fav IN SELECT user_id FROM favorite_promos WHERE promo_id = promo.id LOOP
      -- Check if notification already sent today
      IF NOT EXISTS (
        SELECT 1 FROM user_notifications 
        WHERE user_id = fav.user_id 
        AND type = 'promo' 
        AND data->>'promo_id' = promo.id::text
        AND data->>'alert_type' = 'expiring'
        AND created_at > NOW() - INTERVAL '1 day'
      ) THEN
        INSERT INTO user_notifications (user_id, type, title, message, data)
        VALUES (
          fav.user_id,
          'promo',
          'โปรโปรดใกล้หมดอายุ!',
          'โค้ด ' || promo.code || ' จะหมดอายุภายใน 24 ชั่วโมง รีบใช้เลย!',
          jsonb_build_object(
            'promo_id', promo.id, 
            'code', promo.code, 
            'alert_type', 'expiring',
            'action_url', '/promotions'
          )
        );
      END IF;
    END LOOP;
  END LOOP;

  -- Check promos with low stock (<=10 remaining)
  FOR promo IN 
    SELECT * FROM promo_codes 
    WHERE is_active = true 
    AND usage_limit IS NOT NULL
    AND (usage_limit - COALESCE(used_count, 0)) <= 10
    AND (usage_limit - COALESCE(used_count, 0)) > 0
  LOOP
    remaining := promo.usage_limit - COALESCE(promo.used_count, 0);
    
    FOR fav IN SELECT user_id FROM favorite_promos WHERE promo_id = promo.id LOOP
      -- Check if notification already sent for this stock level
      IF NOT EXISTS (
        SELECT 1 FROM user_notifications 
        WHERE user_id = fav.user_id 
        AND type = 'promo' 
        AND data->>'promo_id' = promo.id::text
        AND data->>'alert_type' = 'low_stock'
        AND created_at > NOW() - INTERVAL '6 hours'
      ) THEN
        INSERT INTO user_notifications (user_id, type, title, message, data)
        VALUES (
          fav.user_id,
          'promo',
          'โปรโปรดใกล้หมด!',
          'โค้ด ' || promo.code || ' เหลือเพียง ' || remaining || ' สิทธิ์ รีบใช้ก่อนหมด!',
          jsonb_build_object(
            'promo_id', promo.id, 
            'code', promo.code, 
            'alert_type', 'low_stock',
            'remaining', remaining,
            'action_url', '/promotions'
          )
        );
      END IF;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function when promo usage increases
CREATE OR REPLACE FUNCTION notify_promo_low_stock()
RETURNS TRIGGER AS $$
DECLARE
  remaining INT;
  fav RECORD;
BEGIN
  -- Only check if usage_limit exists and stock is getting low
  IF NEW.usage_limit IS NOT NULL THEN
    remaining := NEW.usage_limit - COALESCE(NEW.used_count, 0);
    
    -- Notify when reaching 10, 5, or 3 remaining
    IF remaining IN (10, 5, 3) THEN
      FOR fav IN SELECT user_id FROM favorite_promos WHERE promo_id = NEW.id LOOP
        INSERT INTO user_notifications (user_id, type, title, message, data)
        VALUES (
          fav.user_id,
          'promo',
          CASE 
            WHEN remaining <= 3 THEN 'ด่วน! โปรโปรดเหลือน้อยมาก!'
            ELSE 'โปรโปรดใกล้หมด!'
          END,
          'โค้ด ' || NEW.code || ' เหลือเพียง ' || remaining || ' สิทธิ์',
          jsonb_build_object(
            'promo_id', NEW.id, 
            'code', NEW.code, 
            'alert_type', 'low_stock',
            'remaining', remaining,
            'action_url', '/promotions'
          )
        );
      END LOOP;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for promo usage updates
DROP TRIGGER IF EXISTS on_promo_usage_update ON promo_codes;
CREATE TRIGGER on_promo_usage_update
  AFTER UPDATE OF used_count ON promo_codes
  FOR EACH ROW
  WHEN (OLD.used_count IS DISTINCT FROM NEW.used_count)
  EXECUTE FUNCTION notify_promo_low_stock();

-- Add index for faster favorite promo lookups
CREATE INDEX IF NOT EXISTS idx_favorite_promos_promo_user ON favorite_promos(promo_id, user_id);
