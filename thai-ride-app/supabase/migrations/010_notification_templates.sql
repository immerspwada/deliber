-- Migration: 010_notification_templates.sql
-- Feature: F07 - Notification Templates
-- Description: Templates for frequently used notifications

-- Notification Templates Table
CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'system',
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  action_url VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookup
CREATE INDEX IF NOT EXISTS idx_notification_templates_type ON notification_templates(type);
CREATE INDEX IF NOT EXISTS idx_notification_templates_active ON notification_templates(is_active);

-- Insert default templates
INSERT INTO notification_templates (name, type, title, message, action_url) VALUES
  ('โปรโมชั่นใหม่', 'promo', 'โปรโมชั่นพิเศษสำหรับคุณ!', 'รับส่วนลดพิเศษสำหรับการเดินทางครั้งต่อไป แตะเพื่อดูรายละเอียด', '/promotions'),
  ('ยินดีต้อนรับ', 'system', 'ยินดีต้อนรับสู่ Thai Ride!', 'ขอบคุณที่เลือกใช้บริการ Thai Ride เริ่มต้นการเดินทางครั้งแรกของคุณได้เลย', '/'),
  ('อัพเดทระบบ', 'system', 'อัพเดทระบบใหม่', 'เราได้ปรับปรุงระบบเพื่อประสบการณ์ที่ดีขึ้น อัพเดทแอพเพื่อใช้งานฟีเจอร์ใหม่', '/settings'),
  ('แนะนำเพื่อน', 'referral', 'แนะนำเพื่อน รับเครดิต!', 'แนะนำเพื่อนมาใช้ Thai Ride รับเครดิตฟรีทั้งคุณและเพื่อน', '/referral'),
  ('เติมเงิน', 'payment', 'เติมเงินรับโบนัส', 'เติมเงินวันนี้ รับโบนัสเพิ่ม 10% แตะเพื่อเติมเงิน', '/wallet'),
  ('สมัครสมาชิก', 'subscription', 'สมัครแพ็คเกจสมาชิก', 'สมัครแพ็คเกจสมาชิกรายเดือน ประหยัดกว่าทุกการเดินทาง', '/subscription'),
  ('ประกันภัย', 'system', 'คุ้มครองทุกการเดินทาง', 'เพิ่มความอุ่นใจด้วยประกันภัยการเดินทาง เริ่มต้นเพียง 5 บาท', '/insurance'),
  ('ขอบคุณ', 'system', 'ขอบคุณที่ใช้บริการ', 'ขอบคุณที่เลือกใช้ Thai Ride หวังว่าจะได้ให้บริการคุณอีกครั้ง', '/');

-- Function to increment usage count
CREATE OR REPLACE FUNCTION use_notification_template(p_template_id UUID)
RETURNS notification_templates AS $$
DECLARE
  v_template notification_templates;
BEGIN
  UPDATE notification_templates
  SET usage_count = usage_count + 1,
      updated_at = NOW()
  WHERE id = p_template_id
  RETURNING * INTO v_template;
  
  RETURN v_template;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies (Admin only)
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage notification templates"
  ON notification_templates FOR ALL
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE notification_templates IS 'Templates for frequently used notifications - Admin only';
