-- Migration: 055_provider_application_notifications.sql
-- Feature: F14 - Provider Registration Notifications
-- Description: Trigger notifications when provider application status changes

-- Function to notify provider when application status changes
CREATE OR REPLACE FUNCTION notify_provider_application_status()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_title TEXT;
  v_message TEXT;
  v_notification_type TEXT;
BEGIN
  -- Only trigger on status change
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    v_user_id := NEW.user_id;
    
    -- Determine notification based on new status
    CASE NEW.status
      WHEN 'approved' THEN
        v_title := 'ยินดีด้วย! ใบสมัครผ่านการอนุมัติ';
        v_message := 'คุณสามารถเริ่มรับงานได้แล้ว เปิดแอปและกดออนไลน์เพื่อเริ่มหารายได้';
        v_notification_type := 'provider_approved';
      WHEN 'active' THEN
        v_title := 'ยินดีด้วย! ใบสมัครผ่านการอนุมัติ';
        v_message := 'คุณสามารถเริ่มรับงานได้แล้ว เปิดแอปและกดออนไลน์เพื่อเริ่มหารายได้';
        v_notification_type := 'provider_approved';
      WHEN 'rejected' THEN
        v_title := 'ใบสมัครไม่ผ่านการอนุมัติ';
        v_message := 'กรุณาตรวจสอบเอกสารและลองสมัครใหม่อีกครั้ง';
        v_notification_type := 'provider_rejected';
      WHEN 'suspended' THEN
        v_title := 'บัญชีถูกระงับชั่วคราว';
        v_message := 'กรุณาติดต่อฝ่ายสนับสนุนเพื่อขอข้อมูลเพิ่มเติม';
        v_notification_type := 'provider_suspended';
      ELSE
        -- No notification for other statuses
        RETURN NEW;
    END CASE;
    
    -- Insert notification
    INSERT INTO user_notifications (
      user_id,
      title,
      message,
      type,
      data,
      is_read,
      created_at
    ) VALUES (
      v_user_id,
      v_title,
      v_message,
      v_notification_type,
      jsonb_build_object(
        'provider_id', NEW.id,
        'old_status', OLD.status,
        'new_status', NEW.status,
        'provider_type', NEW.provider_type
      ),
      false,
      NOW()
    );
    
    -- Queue push notification
    INSERT INTO push_notification_queue (
      user_id,
      title,
      body,
      data,
      status,
      created_at
    ) VALUES (
      v_user_id,
      v_title,
      v_message,
      jsonb_build_object(
        'type', v_notification_type,
        'provider_id', NEW.id,
        'click_action', '/provider'
      ),
      'pending',
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for provider status changes
DROP TRIGGER IF EXISTS trigger_provider_application_status ON service_providers;
CREATE TRIGGER trigger_provider_application_status
  AFTER UPDATE ON service_providers
  FOR EACH ROW
  EXECUTE FUNCTION notify_provider_application_status();

-- Add comment
COMMENT ON FUNCTION notify_provider_application_status() IS 'Sends notification when provider application status changes (approved/rejected/suspended)';
