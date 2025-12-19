-- Migration: 078_external_notification_queue.sql
-- Feature: External Email/SMS Notification System
-- Description: Queue table for sending Email/SMS notifications via Edge Functions

-- =====================================================
-- CREATE EXTERNAL NOTIFICATION QUEUE TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS external_notification_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  channel varchar(10) NOT NULL CHECK (channel IN ('email', 'sms')),
  recipient text NOT NULL,
  subject text,
  body text NOT NULL,
  template_id varchar(100),
  metadata jsonb DEFAULT '{}'::jsonb,
  status varchar(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
  attempts int DEFAULT 0,
  max_attempts int DEFAULT 3,
  error_message text,
  sent_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Comments
COMMENT ON TABLE external_notification_queue IS 'Queue for Email/SMS notifications to be processed by Edge Functions';
COMMENT ON COLUMN external_notification_queue.channel IS 'Notification channel: email or sms';
COMMENT ON COLUMN external_notification_queue.recipient IS 'Email address or phone number';
COMMENT ON COLUMN external_notification_queue.template_id IS 'Template identifier for tracking';

-- =====================================================
-- CREATE INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_external_notif_status 
ON external_notification_queue(status) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_external_notif_user 
ON external_notification_queue(user_id);

CREATE INDEX IF NOT EXISTS idx_external_notif_created 
ON external_notification_queue(created_at DESC);

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE external_notification_queue ENABLE ROW LEVEL SECURITY;

-- Admin can view all
CREATE POLICY "Admin can view all external notifications"
ON external_notification_queue FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);

-- System can insert (via service role or triggers)
CREATE POLICY "Authenticated can insert notifications"
ON external_notification_queue FOR INSERT
TO authenticated
WITH CHECK (true);

-- Admin can update status
CREATE POLICY "Admin can update notifications"
ON external_notification_queue FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);

-- =====================================================
-- NOTIFICATION SETTINGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS user_notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) UNIQUE,
  email_enabled boolean DEFAULT true,
  sms_enabled boolean DEFAULT true,
  push_enabled boolean DEFAULT true,
  -- Notification types
  provider_status_email boolean DEFAULT true,
  provider_status_sms boolean DEFAULT true,
  order_updates_email boolean DEFAULT true,
  order_updates_sms boolean DEFAULT false,
  promotions_email boolean DEFAULT true,
  promotions_sms boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

COMMENT ON TABLE user_notification_settings IS 'User preferences for notification channels';

-- RLS for notification settings
ALTER TABLE user_notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own settings"
ON user_notification_settings FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
ON user_notification_settings FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
ON user_notification_settings FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- FUNCTION: Queue Email/SMS on Provider Status Change
-- =====================================================

CREATE OR REPLACE FUNCTION queue_provider_status_notification()
RETURNS TRIGGER AS $$
DECLARE
  user_record RECORD;
  user_settings RECORD;
  email_body text;
  sms_body text;
  email_subject text;
BEGIN
  -- Only trigger on status change
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;
  
  -- Get user info
  SELECT email, phone, phone_number, name, first_name, last_name
  INTO user_record
  FROM users
  WHERE id = NEW.user_id;
  
  -- Get notification settings (default to enabled if not set)
  SELECT * INTO user_settings
  FROM user_notification_settings
  WHERE user_id = NEW.user_id;
  
  -- Set notification content based on status
  CASE NEW.status
    WHEN 'approved' THEN
      email_subject := 'ยินดีด้วย! ใบสมัครของคุณได้รับการอนุมัติแล้ว - GOBEAR';
      email_body := format(
        '<h2>ยินดีด้วย!</h2><p>สวัสดีคุณ %s,</p><p>ใบสมัครเป็นผู้ให้บริการของคุณได้รับการอนุมัติแล้ว!</p><p>คุณสามารถเริ่มรับงานได้ทันที</p><p>ทีมงาน GOBEAR</p>',
        COALESCE(user_record.name, user_record.first_name, 'ผู้ใช้')
      );
      sms_body := 'GOBEAR: ยินดีด้วย! ใบสมัครของคุณได้รับการอนุมัติแล้ว เปิดแอปเพื่อเริ่มรับงานได้เลย';
      
    WHEN 'rejected' THEN
      email_subject := 'แจ้งผลการพิจารณาใบสมัคร - GOBEAR';
      email_body := format(
        '<h2>แจ้งผลการพิจารณา</h2><p>สวัสดีคุณ %s,</p><p>ขออภัย ใบสมัครของคุณไม่ผ่านการอนุมัติในครั้งนี้</p>%s<p>คุณสามารถแก้ไขเอกสารและส่งใหม่ได้</p><p>ทีมงาน GOBEAR</p>',
        COALESCE(user_record.name, user_record.first_name, 'ผู้ใช้'),
        CASE WHEN NEW.rejection_reason IS NOT NULL THEN format('<p><strong>เหตุผล:</strong> %s</p>', NEW.rejection_reason) ELSE '' END
      );
      sms_body := format('GOBEAR: ใบสมัครของคุณไม่ผ่านการอนุมัติ %s กรุณาแก้ไขเอกสารและส่งใหม่ในแอป', COALESCE(NEW.rejection_reason, ''));
      
    WHEN 'suspended' THEN
      email_subject := 'แจ้งการระงับบัญชีชั่วคราว - GOBEAR';
      email_body := format(
        '<h2>แจ้งการระงับบัญชี</h2><p>สวัสดีคุณ %s,</p><p>บัญชีผู้ให้บริการของคุณถูกระงับชั่วคราว</p><p>กรุณาติดต่อฝ่ายสนับสนุน</p><p>ทีมงาน GOBEAR</p>',
        COALESCE(user_record.name, user_record.first_name, 'ผู้ใช้')
      );
      sms_body := 'GOBEAR: บัญชีของคุณถูกระงับชั่วคราว กรุณาติดต่อฝ่ายสนับสนุน';
      
    ELSE
      RETURN NEW;
  END CASE;
  
  -- Queue email notification
  IF user_record.email IS NOT NULL AND (user_settings IS NULL OR user_settings.provider_status_email = true) THEN
    INSERT INTO external_notification_queue (
      user_id, channel, recipient, subject, body, template_id, metadata
    ) VALUES (
      NEW.user_id, 'email', user_record.email, email_subject, email_body, 
      'provider_' || NEW.status,
      jsonb_build_object('provider_id', NEW.id, 'status', NEW.status)
    );
  END IF;
  
  -- Queue SMS notification
  IF COALESCE(user_record.phone, user_record.phone_number) IS NOT NULL 
     AND (user_settings IS NULL OR user_settings.provider_status_sms = true) THEN
    INSERT INTO external_notification_queue (
      user_id, channel, recipient, body, template_id, metadata
    ) VALUES (
      NEW.user_id, 'sms', COALESCE(user_record.phone, user_record.phone_number), sms_body,
      'provider_' || NEW.status,
      jsonb_build_object('provider_id', NEW.id, 'status', NEW.status)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_queue_provider_status_notification ON service_providers;
CREATE TRIGGER trigger_queue_provider_status_notification
AFTER UPDATE ON service_providers
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION queue_provider_status_notification();

-- =====================================================
-- FUNCTION: Get pending notifications for processing
-- =====================================================

CREATE OR REPLACE FUNCTION get_pending_external_notifications(batch_size int DEFAULT 10)
RETURNS SETOF external_notification_queue AS $$
BEGIN
  RETURN QUERY
  UPDATE external_notification_queue
  SET status = 'processing', updated_at = now()
  WHERE id IN (
    SELECT id FROM external_notification_queue
    WHERE status = 'pending'
    AND attempts < max_attempts
    ORDER BY created_at
    LIMIT batch_size
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCTION: Mark notification as sent/failed
-- =====================================================

CREATE OR REPLACE FUNCTION mark_notification_sent(notification_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE external_notification_queue
  SET status = 'sent', sent_at = now(), updated_at = now()
  WHERE id = notification_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION mark_notification_failed(notification_id uuid, error_msg text)
RETURNS void AS $$
BEGIN
  UPDATE external_notification_queue
  SET 
    status = CASE WHEN attempts + 1 >= max_attempts THEN 'failed' ELSE 'pending' END,
    attempts = attempts + 1,
    error_message = error_msg,
    updated_at = now()
  WHERE id = notification_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT SELECT, INSERT, UPDATE ON external_notification_queue TO authenticated;
GRANT SELECT, INSERT, UPDATE ON user_notification_settings TO authenticated;
