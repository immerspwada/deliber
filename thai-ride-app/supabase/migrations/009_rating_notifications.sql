-- Migration: 009_rating_notifications.sql
-- Feature: F07, F26 - Rating Reminder Notifications
-- Description: Auto-send notification when delivery/shopping is completed to remind user to rate

-- Function to send rating reminder notification
CREATE OR REPLACE FUNCTION send_rating_reminder_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_provider_name TEXT;
  v_service_type TEXT;
  v_title TEXT;
  v_message TEXT;
BEGIN
  -- Only trigger when status changes to 'delivered' or 'completed'
  IF (TG_TABLE_NAME = 'delivery_requests' AND NEW.status = 'delivered' AND OLD.status != 'delivered') THEN
    v_service_type := 'delivery';
    v_title := 'ให้คะแนนการส่งของ';
    
    -- Get provider name
    SELECT COALESCE(u.name, 'ไรเดอร์') INTO v_provider_name
    FROM service_providers sp
    LEFT JOIN users u ON sp.user_id = u.id
    WHERE sp.id = NEW.provider_id;
    
    v_message := 'พัสดุถึงแล้ว! ให้คะแนน ' || v_provider_name || ' เพื่อช่วยปรับปรุงบริการ';
    
  ELSIF (TG_TABLE_NAME = 'shopping_requests' AND NEW.status = 'completed' AND OLD.status != 'completed') THEN
    v_service_type := 'shopping';
    v_title := 'ให้คะแนนบริการซื้อของ';
    
    -- Get provider name
    SELECT COALESCE(u.name, 'ผู้ช่วยซื้อของ') INTO v_provider_name
    FROM service_providers sp
    LEFT JOIN users u ON sp.user_id = u.id
    WHERE sp.id = NEW.provider_id;
    
    v_message := 'ของถึงแล้ว! ให้คะแนน ' || v_provider_name || ' เพื่อช่วยปรับปรุงบริการ';
    
  ELSE
    RETURN NEW;
  END IF;

  -- Insert notification
  INSERT INTO user_notifications (
    user_id,
    type,
    title,
    message,
    data,
    action_url
  ) VALUES (
    NEW.user_id,
    'rating',
    v_title,
    v_message,
    jsonb_build_object(
      'service_type', v_service_type,
      'service_id', NEW.id,
      'provider_name', v_provider_name,
      'tracking_id', NEW.tracking_id
    ),
    '/history'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Trigger for delivery_requests
DROP TRIGGER IF EXISTS trigger_delivery_rating_reminder ON delivery_requests;
CREATE TRIGGER trigger_delivery_rating_reminder
  AFTER UPDATE ON delivery_requests
  FOR EACH ROW
  EXECUTE FUNCTION send_rating_reminder_notification();

-- Trigger for shopping_requests
DROP TRIGGER IF EXISTS trigger_shopping_rating_reminder ON shopping_requests;
CREATE TRIGGER trigger_shopping_rating_reminder
  AFTER UPDATE ON shopping_requests
  FOR EACH ROW
  EXECUTE FUNCTION send_rating_reminder_notification();

-- Also add trigger for ride_requests completion
CREATE OR REPLACE FUNCTION send_ride_rating_reminder()
RETURNS TRIGGER AS $$
DECLARE
  v_driver_name TEXT;
BEGIN
  -- Only trigger when status changes to 'completed'
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Get driver name
    SELECT COALESCE(u.name, 'คนขับ') INTO v_driver_name
    FROM service_providers sp
    LEFT JOIN users u ON sp.user_id = u.id
    WHERE sp.id = NEW.provider_id;

    -- Insert notification
    INSERT INTO user_notifications (
      user_id,
      type,
      title,
      message,
      data,
      action_url
    ) VALUES (
      NEW.user_id,
      'rating',
      'ให้คะแนนการเดินทาง',
      'คุณพอใจกับบริการของ ' || v_driver_name || ' หรือไม่? แตะเพื่อให้คะแนน',
      jsonb_build_object(
        'service_type', 'ride',
        'service_id', NEW.id,
        'provider_name', v_driver_name,
        'tracking_id', NEW.tracking_id
      ),
      '/history'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for ride_requests
DROP TRIGGER IF EXISTS trigger_ride_rating_reminder ON ride_requests;
CREATE TRIGGER trigger_ride_rating_reminder
  AFTER UPDATE ON ride_requests
  FOR EACH ROW
  EXECUTE FUNCTION send_ride_rating_reminder();

-- Add 'rating' to notification type enum if using enum
-- (Skip if using text type)

COMMENT ON FUNCTION send_rating_reminder_notification() IS 'Auto-sends rating reminder notification when delivery/shopping is completed';
COMMENT ON FUNCTION send_ride_rating_reminder() IS 'Auto-sends rating reminder notification when ride is completed';
