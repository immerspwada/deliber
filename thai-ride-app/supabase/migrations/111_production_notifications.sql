-- Migration: 111_production_notifications.sql
-- Production Notification System Enhancements
-- Features: Notification templates, scheduling, delivery tracking

-- =====================================================
-- 1. Notification Delivery Log
-- =====================================================
CREATE TABLE IF NOT EXISTS notification_delivery_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID REFERENCES user_notifications(id) ON DELETE CASCADE,
  channel TEXT NOT NULL, -- 'push', 'email', 'sms', 'in_app'
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'bounced')),
  provider TEXT, -- 'firebase', 'sendgrid', 'twilio'
  provider_message_id TEXT,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_delivery_notification ON notification_delivery_log(notification_id);
CREATE INDEX IF NOT EXISTS idx_notification_delivery_status ON notification_delivery_log(status, created_at DESC);

-- =====================================================
-- 2. Notification Preferences (Enhanced)
-- =====================================================
CREATE TABLE IF NOT EXISTS notification_preferences_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel TEXT NOT NULL, -- 'push', 'email', 'sms'
  category TEXT NOT NULL, -- 'ride_updates', 'promotions', 'system', 'marketing'
  enabled BOOLEAN DEFAULT TRUE,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, channel, category)
);

CREATE INDEX IF NOT EXISTS idx_notification_prefs_user ON notification_preferences_v2(user_id);

-- =====================================================
-- 3. Notification Templates (Enhanced)
-- =====================================================
CREATE TABLE IF NOT EXISTS notification_templates_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL,
  title_th TEXT NOT NULL,
  title_en TEXT NOT NULL,
  body_th TEXT NOT NULL,
  body_en TEXT NOT NULL,
  action_url TEXT,
  icon TEXT,
  channels TEXT[] DEFAULT ARRAY['push', 'in_app'],
  variables TEXT[], -- List of expected variables like ['user_name', 'order_id']
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default templates
INSERT INTO notification_templates_v2 (template_key, category, title_th, title_en, body_th, body_en, variables, channels) VALUES
  ('ride_matched', 'ride_updates', 'พบคนขับแล้ว', 'Driver Found', 'คนขับ {{driver_name}} กำลังมารับคุณ', 'Driver {{driver_name}} is on the way', ARRAY['driver_name'], ARRAY['push', 'in_app']),
  ('ride_arrived', 'ride_updates', 'คนขับถึงแล้ว', 'Driver Arrived', 'คนขับถึงจุดรับแล้ว กรุณาออกมาขึ้นรถ', 'Driver has arrived at pickup point', ARRAY[]::TEXT[], ARRAY['push', 'in_app']),
  ('ride_completed', 'ride_updates', 'เดินทางเสร็จสิ้น', 'Trip Completed', 'ขอบคุณที่ใช้บริการ ค่าโดยสาร {{fare}} บาท', 'Thank you for riding. Fare: {{fare}} THB', ARRAY['fare'], ARRAY['push', 'in_app']),
  ('ride_cancelled', 'ride_updates', 'การเดินทางถูกยกเลิก', 'Trip Cancelled', 'การเดินทางของคุณถูกยกเลิก', 'Your trip has been cancelled', ARRAY[]::TEXT[], ARRAY['push', 'in_app']),
  ('delivery_matched', 'delivery_updates', 'พบไรเดอร์แล้ว', 'Rider Found', 'ไรเดอร์ {{rider_name}} กำลังมารับพัสดุ', 'Rider {{rider_name}} is picking up your package', ARRAY['rider_name'], ARRAY['push', 'in_app']),
  ('delivery_picked_up', 'delivery_updates', 'รับพัสดุแล้ว', 'Package Picked Up', 'ไรเดอร์รับพัสดุแล้ว กำลังเดินทางไปส่ง', 'Package picked up, on the way to delivery', ARRAY[]::TEXT[], ARRAY['push', 'in_app']),
  ('delivery_completed', 'delivery_updates', 'ส่งพัสดุเรียบร้อย', 'Delivery Completed', 'พัสดุของคุณถูกส่งเรียบร้อยแล้ว', 'Your package has been delivered', ARRAY[]::TEXT[], ARRAY['push', 'in_app']),
  ('promo_new', 'promotions', 'โปรโมชั่นใหม่', 'New Promotion', '{{promo_title}} - ใช้โค้ด {{promo_code}}', '{{promo_title}} - Use code {{promo_code}}', ARRAY['promo_title', 'promo_code'], ARRAY['push', 'in_app', 'email']),
  ('wallet_topup', 'wallet', 'เติมเงินสำเร็จ', 'Top-up Successful', 'เติมเงิน {{amount}} บาท สำเร็จ', 'Top-up of {{amount}} THB successful', ARRAY['amount'], ARRAY['push', 'in_app']),
  ('wallet_low', 'wallet', 'ยอดเงินเหลือน้อย', 'Low Balance', 'ยอดเงินในกระเป๋าเหลือ {{balance}} บาท', 'Your wallet balance is {{balance}} THB', ARRAY['balance'], ARRAY['push', 'in_app']),
  ('provider_new_job', 'provider', 'งานใหม่', 'New Job', 'มีงานใหม่ {{service_type}} ระยะทาง {{distance}} กม.', 'New {{service_type}} job, {{distance}} km away', ARRAY['service_type', 'distance'], ARRAY['push']),
  ('provider_approved', 'provider', 'อนุมัติแล้ว', 'Application Approved', 'ยินดีด้วย! คุณได้รับการอนุมัติเป็นผู้ให้บริการแล้ว', 'Congratulations! Your provider application has been approved', ARRAY[]::TEXT[], ARRAY['push', 'in_app', 'email']),
  ('system_maintenance', 'system', 'แจ้งปิดปรับปรุงระบบ', 'System Maintenance', 'ระบบจะปิดปรับปรุงในวันที่ {{date}}', 'System maintenance scheduled for {{date}}', ARRAY['date'], ARRAY['push', 'in_app', 'email'])
ON CONFLICT (template_key) DO NOTHING;

-- =====================================================
-- 4. Send Notification with Template Function
-- =====================================================
CREATE OR REPLACE FUNCTION send_notification_with_template(
  p_user_id UUID,
  p_template_key TEXT,
  p_variables JSONB DEFAULT '{}',
  p_data JSONB DEFAULT '{}'
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_template RECORD;
  v_title TEXT;
  v_body TEXT;
  v_notification_id UUID;
  v_user_locale TEXT := 'th';
BEGIN
  -- Get template
  SELECT * INTO v_template
  FROM notification_templates_v2
  WHERE template_key = p_template_key AND is_active = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template not found: %', p_template_key;
  END IF;
  
  -- Get user locale preference (default to Thai)
  SELECT COALESCE(
    (SELECT value->>'language' FROM user_preferences WHERE user_id = p_user_id),
    'th'
  ) INTO v_user_locale;
  
  -- Select title and body based on locale
  IF v_user_locale = 'en' THEN
    v_title := v_template.title_en;
    v_body := v_template.body_en;
  ELSE
    v_title := v_template.title_th;
    v_body := v_template.body_th;
  END IF;
  
  -- Replace variables in title and body
  FOR key, value IN SELECT * FROM jsonb_each_text(p_variables) LOOP
    v_title := REPLACE(v_title, '{{' || key || '}}', value);
    v_body := REPLACE(v_body, '{{' || key || '}}', value);
  END LOOP;
  
  -- Check user preferences
  IF NOT EXISTS (
    SELECT 1 FROM notification_preferences_v2
    WHERE user_id = p_user_id 
      AND category = v_template.category
      AND enabled = false
  ) THEN
    -- Insert notification
    INSERT INTO user_notifications (
      user_id, title, message, type, data
    ) VALUES (
      p_user_id, v_title, v_body, v_template.category,
      p_data || jsonb_build_object('template_key', p_template_key)
    ) RETURNING id INTO v_notification_id;
    
    -- Log delivery attempt for each channel
    IF 'push' = ANY(v_template.channels) THEN
      INSERT INTO notification_delivery_log (notification_id, channel, status)
      VALUES (v_notification_id, 'push', 'pending');
    END IF;
    
    RETURN v_notification_id;
  END IF;
  
  RETURN NULL;
END;
$$;

-- =====================================================
-- 5. Batch Send Notifications Function
-- =====================================================
CREATE OR REPLACE FUNCTION send_batch_notifications(
  p_user_ids UUID[],
  p_template_key TEXT,
  p_variables JSONB DEFAULT '{}'
)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID;
  v_count INTEGER := 0;
BEGIN
  FOREACH v_user_id IN ARRAY p_user_ids LOOP
    PERFORM send_notification_with_template(v_user_id, p_template_key, p_variables);
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$;

-- =====================================================
-- 6. Get Notification Stats Function
-- =====================================================
CREATE OR REPLACE FUNCTION get_notification_stats(p_hours INTEGER DEFAULT 24)
RETURNS TABLE (
  total_sent BIGINT,
  total_delivered BIGINT,
  total_failed BIGINT,
  delivery_rate NUMERIC,
  by_channel JSONB
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT 
      COUNT(*) FILTER (WHERE status IN ('sent', 'delivered')) as sent,
      COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
      COUNT(*) FILTER (WHERE status = 'failed') as failed,
      channel
    FROM notification_delivery_log
    WHERE created_at > NOW() - (p_hours || ' hours')::INTERVAL
    GROUP BY channel
  )
  SELECT 
    SUM(sent)::BIGINT,
    SUM(delivered)::BIGINT,
    SUM(failed)::BIGINT,
    CASE WHEN SUM(sent) > 0 
      THEN ROUND((SUM(delivered)::NUMERIC / SUM(sent)::NUMERIC) * 100, 2)
      ELSE 0 
    END,
    jsonb_object_agg(channel, jsonb_build_object(
      'sent', sent,
      'delivered', delivered,
      'failed', failed
    ))
  FROM stats;
END;
$$;

-- =====================================================
-- 7. Update Notification Delivery Status Function
-- =====================================================
CREATE OR REPLACE FUNCTION update_notification_delivery(
  p_notification_id UUID,
  p_channel TEXT,
  p_status TEXT,
  p_provider_message_id TEXT DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL
)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE notification_delivery_log
  SET 
    status = p_status,
    provider_message_id = COALESCE(p_provider_message_id, provider_message_id),
    error_message = p_error_message,
    sent_at = CASE WHEN p_status = 'sent' THEN NOW() ELSE sent_at END,
    delivered_at = CASE WHEN p_status = 'delivered' THEN NOW() ELSE delivered_at END,
    retry_count = CASE WHEN p_status = 'failed' THEN retry_count + 1 ELSE retry_count END
  WHERE notification_id = p_notification_id AND channel = p_channel;
  
  RETURN FOUND;
END;
$$;

-- =====================================================
-- 8. RLS Policies
-- =====================================================
ALTER TABLE notification_delivery_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates_v2 ENABLE ROW LEVEL SECURITY;

-- Users can manage their own preferences
CREATE POLICY "Users manage own notification preferences" ON notification_preferences_v2
  FOR ALL TO authenticated
  USING (user_id = auth.uid());

-- Admin can read all delivery logs
CREATE POLICY "Admin read notification_delivery_log" ON notification_delivery_log
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Admin can manage templates
CREATE POLICY "Admin manage notification_templates" ON notification_templates_v2
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION send_notification_with_template(UUID, TEXT, JSONB, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION send_batch_notifications(UUID[], TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION get_notification_stats(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION update_notification_delivery(UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;
