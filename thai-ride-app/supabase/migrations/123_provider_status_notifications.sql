-- =====================================================
-- Migration: 123_provider_status_notifications.sql
-- Description: Auto-send notifications when provider status changes
-- Feature: F07, F14 - Notifications + Provider Dashboard
-- =====================================================

-- Function: Send notification when provider status changes
CREATE OR REPLACE FUNCTION notify_provider_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_title TEXT;
  v_message TEXT;
  v_notification_type TEXT;
BEGIN
  -- Only trigger on status change
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  v_user_id := NEW.user_id;
  
  -- Determine notification content based on new status
  CASE NEW.status
    WHEN 'approved' THEN
      v_title := 'ยินดีด้วย! คุณได้รับการอนุมัติแล้ว';
      v_message := 'ใบสมัครของคุณได้รับการอนุมัติแล้ว คุณสามารถเริ่มรับงานได้ทันที';
      v_notification_type := 'provider_approved';
      
    WHEN 'rejected' THEN
      v_title := 'ใบสมัครไม่ผ่านการอนุมัติ';
      v_message := COALESCE(
        'เหตุผล: ' || NEW.rejection_reason,
        'กรุณาตรวจสอบเอกสารและลองสมัครใหม่อีกครั้ง'
      );
      v_notification_type := 'provider_rejected';
      
    WHEN 'suspended' THEN
      v_title := 'บัญชีถูกระงับชั่วคราว';
      v_message := COALESCE(
        'เหตุผล: ' || NEW.suspension_reason,
        'กรุณาติดต่อฝ่ายสนับสนุนเพื่อขอข้อมูลเพิ่มเติม'
      );
      v_notification_type := 'provider_suspended';
      
    WHEN 'active' THEN
      v_title := 'บัญชีของคุณเปิดใช้งานแล้ว';
      v_message := 'คุณสามารถรับงานได้ตามปกติ';
      v_notification_type := 'provider_activated';
      
    ELSE
      -- No notification for other status changes
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
      'provider_uid', NEW.provider_uid,
      'old_status', OLD.status,
      'new_status', NEW.status,
      'changed_at', NOW()
    ),
    false,
    NOW()
  );
  
  -- Also queue push notification if user has push subscription
  INSERT INTO push_notification_queue (
    user_id,
    title,
    body,
    data,
    status,
    created_at
  )
  SELECT 
    v_user_id,
    v_title,
    v_message,
    jsonb_build_object(
      'type', v_notification_type,
      'provider_id', NEW.id::text,
      'url', CASE 
        WHEN NEW.status = 'approved' THEN '/provider'
        ELSE '/provider/onboarding'
      END
    ),
    'pending',
    NOW()
  WHERE EXISTS (
    SELECT 1 FROM push_subscriptions WHERE user_id = v_user_id
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS provider_status_change_notification ON service_providers;
CREATE TRIGGER provider_status_change_notification
  AFTER UPDATE OF status ON service_providers
  FOR EACH ROW
  EXECUTE FUNCTION notify_provider_status_change();

-- =====================================================
-- Function: Get pending provider applications count
-- =====================================================

CREATE OR REPLACE FUNCTION get_pending_provider_count()
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COUNT(*)::INTEGER
  FROM service_providers
  WHERE status = 'pending';
$$;

GRANT EXECUTE ON FUNCTION get_pending_provider_count() TO authenticated;

-- =====================================================
-- Function: Get provider application stats for Admin
-- =====================================================

CREATE OR REPLACE FUNCTION get_provider_application_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_stats JSON;
BEGIN
  SELECT json_build_object(
    'pending', COUNT(*) FILTER (WHERE status = 'pending'),
    'approved', COUNT(*) FILTER (WHERE status = 'approved'),
    'rejected', COUNT(*) FILTER (WHERE status = 'rejected'),
    'suspended', COUNT(*) FILTER (WHERE status = 'suspended'),
    'total', COUNT(*),
    'today_applications', COUNT(*) FILTER (WHERE applied_at >= CURRENT_DATE),
    'this_week_applications', COUNT(*) FILTER (WHERE applied_at >= CURRENT_DATE - INTERVAL '7 days')
  ) INTO v_stats
  FROM service_providers;
  
  RETURN v_stats;
END;
$$;

GRANT EXECUTE ON FUNCTION get_provider_application_stats() TO authenticated;

-- Comments
COMMENT ON FUNCTION notify_provider_status_change() IS 'Auto-send notification when provider status changes';
COMMENT ON FUNCTION get_pending_provider_count() IS 'Get count of pending provider applications';
COMMENT ON FUNCTION get_provider_application_stats() IS 'Get provider application statistics for Admin dashboard';
