-- Migration: 128_notification_templates.sql
-- Feature: F07 - Push Notification Templates & Analytics
-- Description: เพิ่มระบบ Notification Templates และ Analytics

-- =====================================================
-- 1. Notification Templates Table
-- =====================================================
CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  name_th VARCHAR(100),
  category VARCHAR(50) NOT NULL DEFAULT 'general',
  title VARCHAR(200) NOT NULL,
  body TEXT NOT NULL,
  icon VARCHAR(255) DEFAULT '/pwa-192x192.png',
  url VARCHAR(255),
  variables JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories: promo, system, order, provider, reminder, marketing
CREATE INDEX idx_notification_templates_category ON notification_templates(category);
CREATE INDEX idx_notification_templates_active ON notification_templates(is_active);

-- =====================================================
-- 2. Scheduled Notifications Table
-- =====================================================
CREATE TABLE IF NOT EXISTS scheduled_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES notification_templates(id),
  title VARCHAR(200) NOT NULL,
  body TEXT NOT NULL,
  icon VARCHAR(255) DEFAULT '/pwa-192x192.png',
  url VARCHAR(255),
  target_type VARCHAR(50) NOT NULL DEFAULT 'all',
  target_filter JSONB DEFAULT '{}'::jsonb,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) DEFAULT 'scheduled',
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- Status: scheduled, processing, completed, cancelled
CREATE INDEX idx_scheduled_notifications_status ON scheduled_notifications(status);
CREATE INDEX idx_scheduled_notifications_scheduled_at ON scheduled_notifications(scheduled_at);

-- =====================================================
-- 3. Push Notification Analytics Table
-- =====================================================
CREATE TABLE IF NOT EXISTS push_notification_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID,
  queue_id UUID REFERENCES push_notification_queue(id),
  user_id UUID REFERENCES auth.users(id),
  event_type VARCHAR(50) NOT NULL,
  event_data JSONB DEFAULT '{}'::jsonb,
  device_type VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Event types: sent, delivered, clicked, dismissed, failed
CREATE INDEX idx_push_analytics_event_type ON push_notification_analytics(event_type);
CREATE INDEX idx_push_analytics_created_at ON push_notification_analytics(created_at);
CREATE INDEX idx_push_analytics_user_id ON push_notification_analytics(user_id);

-- =====================================================
-- 4. Daily Push Stats Table (Aggregated)
-- =====================================================
CREATE TABLE IF NOT EXISTS push_notification_daily_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  total_sent INTEGER DEFAULT 0,
  total_delivered INTEGER DEFAULT 0,
  total_clicked INTEGER DEFAULT 0,
  total_dismissed INTEGER DEFAULT 0,
  total_failed INTEGER DEFAULT 0,
  delivery_rate DECIMAL(5,2) DEFAULT 0,
  click_rate DECIMAL(5,2) DEFAULT 0,
  by_category JSONB DEFAULT '{}'::jsonb,
  by_device JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_push_daily_stats_date ON push_notification_daily_stats(date);

-- =====================================================
-- 5. Functions
-- =====================================================

-- Function: Get template by ID with variable substitution
CREATE OR REPLACE FUNCTION get_notification_template(
  p_template_id UUID,
  p_variables JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  title TEXT,
  body TEXT,
  icon TEXT,
  url TEXT
) AS $$
DECLARE
  v_template notification_templates%ROWTYPE;
  v_title TEXT;
  v_body TEXT;
  v_key TEXT;
  v_value TEXT;
BEGIN
  SELECT * INTO v_template FROM notification_templates WHERE id = p_template_id AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  v_title := v_template.title;
  v_body := v_template.body;
  
  -- Replace variables in title and body
  FOR v_key, v_value IN SELECT * FROM jsonb_each_text(p_variables)
  LOOP
    v_title := REPLACE(v_title, '{{' || v_key || '}}', v_value);
    v_body := REPLACE(v_body, '{{' || v_key || '}}', v_value);
  END LOOP;
  
  -- Update usage count
  UPDATE notification_templates SET usage_count = usage_count + 1 WHERE id = p_template_id;
  
  RETURN QUERY SELECT v_title, v_body, v_template.icon, v_template.url;
END;
$$ LANGUAGE plpgsql;

-- Function: Track push notification event
CREATE OR REPLACE FUNCTION track_push_event(
  p_queue_id UUID,
  p_user_id UUID,
  p_event_type VARCHAR(50),
  p_event_data JSONB DEFAULT '{}'::jsonb,
  p_device_type VARCHAR(50) DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_analytics_id UUID;
BEGIN
  INSERT INTO push_notification_analytics (
    queue_id, user_id, event_type, event_data, device_type
  ) VALUES (
    p_queue_id, p_user_id, p_event_type, p_event_data, p_device_type
  ) RETURNING id INTO v_analytics_id;
  
  RETURN v_analytics_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Get push notification stats for date range
CREATE OR REPLACE FUNCTION get_push_stats(
  p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  date DATE,
  total_sent BIGINT,
  total_delivered BIGINT,
  total_clicked BIGINT,
  total_failed BIGINT,
  delivery_rate DECIMAL,
  click_rate DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE(pna.created_at) as date,
    COUNT(*) FILTER (WHERE pna.event_type = 'sent') as total_sent,
    COUNT(*) FILTER (WHERE pna.event_type = 'delivered') as total_delivered,
    COUNT(*) FILTER (WHERE pna.event_type = 'clicked') as total_clicked,
    COUNT(*) FILTER (WHERE pna.event_type = 'failed') as total_failed,
    CASE 
      WHEN COUNT(*) FILTER (WHERE pna.event_type = 'sent') > 0 
      THEN ROUND(COUNT(*) FILTER (WHERE pna.event_type = 'delivered')::DECIMAL / 
           COUNT(*) FILTER (WHERE pna.event_type = 'sent') * 100, 2)
      ELSE 0 
    END as delivery_rate,
    CASE 
      WHEN COUNT(*) FILTER (WHERE pna.event_type = 'delivered') > 0 
      THEN ROUND(COUNT(*) FILTER (WHERE pna.event_type = 'clicked')::DECIMAL / 
           COUNT(*) FILTER (WHERE pna.event_type = 'delivered') * 100, 2)
      ELSE 0 
    END as click_rate
  FROM push_notification_analytics pna
  WHERE DATE(pna.created_at) BETWEEN p_start_date AND p_end_date
  GROUP BY DATE(pna.created_at)
  ORDER BY DATE(pna.created_at) DESC;
END;
$$ LANGUAGE plpgsql;

-- Function: Aggregate daily stats (run via cron)
CREATE OR REPLACE FUNCTION aggregate_push_daily_stats()
RETURNS void AS $$
DECLARE
  v_date DATE := CURRENT_DATE - INTERVAL '1 day';
  v_stats RECORD;
BEGIN
  SELECT 
    COUNT(*) FILTER (WHERE event_type = 'sent') as sent,
    COUNT(*) FILTER (WHERE event_type = 'delivered') as delivered,
    COUNT(*) FILTER (WHERE event_type = 'clicked') as clicked,
    COUNT(*) FILTER (WHERE event_type = 'dismissed') as dismissed,
    COUNT(*) FILTER (WHERE event_type = 'failed') as failed
  INTO v_stats
  FROM push_notification_analytics
  WHERE DATE(created_at) = v_date;
  
  INSERT INTO push_notification_daily_stats (
    date, total_sent, total_delivered, total_clicked, total_dismissed, total_failed,
    delivery_rate, click_rate
  ) VALUES (
    v_date,
    COALESCE(v_stats.sent, 0),
    COALESCE(v_stats.delivered, 0),
    COALESCE(v_stats.clicked, 0),
    COALESCE(v_stats.dismissed, 0),
    COALESCE(v_stats.failed, 0),
    CASE WHEN v_stats.sent > 0 THEN ROUND(v_stats.delivered::DECIMAL / v_stats.sent * 100, 2) ELSE 0 END,
    CASE WHEN v_stats.delivered > 0 THEN ROUND(v_stats.clicked::DECIMAL / v_stats.delivered * 100, 2) ELSE 0 END
  )
  ON CONFLICT (date) DO UPDATE SET
    total_sent = EXCLUDED.total_sent,
    total_delivered = EXCLUDED.total_delivered,
    total_clicked = EXCLUDED.total_clicked,
    total_dismissed = EXCLUDED.total_dismissed,
    total_failed = EXCLUDED.total_failed,
    delivery_rate = EXCLUDED.delivery_rate,
    click_rate = EXCLUDED.click_rate,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. Seed Default Templates
-- =====================================================
INSERT INTO notification_templates (name, name_th, category, title, body, url, variables) VALUES
('new_promo', 'โปรโมชั่นใหม่', 'promo', '🎉 โปรโมชั่นพิเศษ!', '{{promo_name}} - ลด {{discount}}% เฉพาะวันนี้เท่านั้น!', '/customer/promotions', '["promo_name", "discount"]'),
('order_confirmed', 'ยืนยันออเดอร์', 'order', 'ออเดอร์ได้รับการยืนยัน', 'ออเดอร์ #{{order_id}} ได้รับการยืนยันแล้ว กำลังหาคนขับให้คุณ', '/customer/history', '["order_id"]'),
('driver_assigned', 'พบคนขับแล้ว', 'order', 'พบคนขับแล้ว!', '{{driver_name}} กำลังเดินทางมารับคุณ ประมาณ {{eta}} นาที', '/customer/ride', '["driver_name", "eta"]'),
('ride_completed', 'เดินทางสำเร็จ', 'order', 'เดินทางสำเร็จ!', 'ขอบคุณที่ใช้บริการ กรุณาให้คะแนนคนขับของคุณ', '/customer/history', '[]'),
('provider_new_job', 'งานใหม่', 'provider', 'มีงานใหม่!', 'มีลูกค้าต้องการบริการ {{service_type}} ระยะทาง {{distance}} กม.', '/provider', '["service_type", "distance"]'),
('wallet_topup', 'เติมเงินสำเร็จ', 'system', 'เติมเงินสำเร็จ', 'เติมเงิน ฿{{amount}} สำเร็จ ยอดคงเหลือ ฿{{balance}}', '/customer/wallet', '["amount", "balance"]'),
('system_maintenance', 'แจ้งปิดปรับปรุง', 'system', 'แจ้งปิดปรับปรุงระบบ', 'ระบบจะปิดปรับปรุงในวันที่ {{date}} เวลา {{time}}', '/', '["date", "time"]'),
('rating_reminder', 'เตือนให้คะแนน', 'reminder', 'อย่าลืมให้คะแนน!', 'คุณยังไม่ได้ให้คะแนนการเดินทางล่าสุด กรุณาให้คะแนนเพื่อช่วยปรับปรุงบริการ', '/customer/history', '[]')
ON CONFLICT DO NOTHING;

-- =====================================================
-- 7. RLS Policies
-- =====================================================
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_notification_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_notification_daily_stats ENABLE ROW LEVEL SECURITY;

-- Admin can manage all
CREATE POLICY "Admin can manage notification_templates" ON notification_templates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin can manage scheduled_notifications" ON scheduled_notifications
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin can view push_notification_analytics" ON push_notification_analytics
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin can view push_notification_daily_stats" ON push_notification_daily_stats
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- System can insert analytics
CREATE POLICY "System can insert analytics" ON push_notification_analytics
  FOR INSERT WITH CHECK (true);

COMMENT ON TABLE notification_templates IS 'Feature: F07 - Notification Templates for reusable push messages';
COMMENT ON TABLE scheduled_notifications IS 'Feature: F07 - Scheduled push notifications';
COMMENT ON TABLE push_notification_analytics IS 'Feature: F07 - Push notification event tracking';
COMMENT ON TABLE push_notification_daily_stats IS 'Feature: F07 - Aggregated daily push stats';
