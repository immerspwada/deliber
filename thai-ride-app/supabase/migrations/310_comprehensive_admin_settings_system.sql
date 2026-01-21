-- Migration: 310_comprehensive_admin_settings_system.sql
-- Description: Comprehensive Admin Settings System
-- Author: Admin Settings Team
-- Date: 2026-01-18

BEGIN;

-- =====================================================
-- 1. SYSTEM SETTINGS TABLE (Enhanced)
-- =====================================================

-- Drop old table if exists and recreate with better structure
DROP TABLE IF EXISTS system_settings CASCADE;

CREATE TABLE system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  setting_key TEXT NOT NULL,
  setting_value TEXT NOT NULL,
  data_type TEXT NOT NULL DEFAULT 'string', -- string, number, boolean, json
  display_name TEXT NOT NULL,
  display_name_th TEXT,
  description TEXT,
  description_th TEXT,
  is_public BOOLEAN DEFAULT false, -- Can customers/providers see this?
  is_editable BOOLEAN DEFAULT true,
  validation_rules JSONB, -- { min: 0, max: 100, pattern: "regex" }
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  
  UNIQUE(category, setting_key)
);

-- Enable RLS
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "admin_full_access_settings" ON system_settings
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Public settings readable by all authenticated users
CREATE POLICY "public_settings_read" ON system_settings
  FOR SELECT TO authenticated
  USING (is_public = true);

-- =====================================================
-- 2. INSERT DEFAULT SETTINGS
-- =====================================================

-- General System Settings
INSERT INTO system_settings (category, setting_key, setting_value, data_type, display_name, display_name_th, description, description_th, is_public, display_order) VALUES
('general', 'app_name', 'Thai Ride App', 'string', 'Application Name', 'ชื่อแอปพลิเคชัน', 'Main application name', 'ชื่อหลักของแอปพลิเคชัน', true, 1),
('general', 'app_version', '2.0.0', 'string', 'App Version', 'เวอร์ชันแอป', 'Current application version', 'เวอร์ชันปัจจุบันของแอป', true, 2),
('general', 'maintenance_mode', 'false', 'boolean', 'Maintenance Mode', 'โหมดปิดปรับปรุง', 'Enable maintenance mode', 'เปิดโหมดปิดปรับปรุงระบบ', true, 3),
('general', 'support_phone', '02-123-4567', 'string', 'Support Phone', 'เบอร์ติดต่อ', 'Customer support phone number', 'เบอร์โทรศัพท์ฝ่ายสนับสนุน', true, 4),
('general', 'support_email', 'support@thairideapp.com', 'string', 'Support Email', 'อีเมลติดต่อ', 'Customer support email', 'อีเมลฝ่ายสนับสนุน', true, 5),
('general', 'support_line_id', '@thairideapp', 'string', 'LINE ID', 'ไลน์ไอดี', 'LINE official account ID', 'ไลน์ไอดีทางการ', true, 6),

-- Ride Settings
('ride', 'base_fare', '35', 'number', 'Base Fare', 'ค่าโดยสารขั้นต่ำ', 'Minimum ride fare in THB', 'ค่าโดยสารขั้นต่ำ (บาท)', true, 10),
('ride', 'per_km_rate', '8', 'number', 'Per KM Rate', 'ค่าระยะทางต่อกม.', 'Rate per kilometer in THB', 'ค่าระยะทางต่อกิโลเมตร (บาท)', true, 11),
('ride', 'per_minute_rate', '2', 'number', 'Per Minute Rate', 'ค่าเวลาต่อนาที', 'Rate per minute in THB', 'ค่าเวลาต่อนาที (บาท)', true, 12),
('ride', 'booking_fee', '5', 'number', 'Booking Fee', 'ค่าบริการจอง', 'Service booking fee in THB', 'ค่าบริการการจอง (บาท)', true, 13),
('ride', 'cancellation_fee', '20', 'number', 'Cancellation Fee', 'ค่ายกเลิก', 'Fee for cancelling after match', 'ค่าธรรมเนียมการยกเลิกหลังจับคู่', true, 14),
('ride', 'max_waiting_time_minutes', '5', 'number', 'Max Waiting Time', 'เวลารอสูงสุด', 'Maximum waiting time before auto-cancel', 'เวลารอสูงสุดก่อนยกเลิกอัตโนมัติ (นาที)', false, 15),
('ride', 'surge_multiplier_peak', '1.5', 'number', 'Peak Surge Multiplier', 'ตัวคูณช่วงเร่งด่วน', 'Price multiplier during peak hours', 'ตัวคูณราคาช่วงเวลาเร่งด่วน', true, 16),
('ride', 'min_provider_rating', '3.5', 'number', 'Min Provider Rating', 'เรตติ้งขั้นต่ำผู้ให้บริการ', 'Minimum rating to accept rides', 'เรตติ้งขั้นต่ำเพื่อรับงาน', false, 17),

-- Payment Settings
('payment', 'commission_rate', '15', 'number', 'Commission Rate %', 'ค่าคอมมิชชั่น %', 'Platform commission percentage', 'เปอร์เซ็นต์ค่าคอมมิชชั่นแพลตฟอร์ม', false, 20),
('payment', 'vat_rate', '7', 'number', 'VAT Rate %', 'อัตราภาษี %', 'VAT percentage', 'เปอร์เซ็นต์ภาษีมูลค่าเพิ่ม', false, 21),
('payment', 'min_topup_amount', '50', 'number', 'Min Top-up Amount', 'ยอดเติมเงินขั้นต่ำ', 'Minimum wallet top-up amount', 'ยอดเติมเงินขั้นต่ำ (บาท)', true, 22),
('payment', 'max_topup_amount', '10000', 'number', 'Max Top-up Amount', 'ยอดเติมเงินสูงสุด', 'Maximum wallet top-up amount', 'ยอดเติมเงินสูงสุด (บาท)', true, 23),
('payment', 'min_withdrawal_amount', '100', 'number', 'Min Withdrawal Amount', 'ยอดถอนขั้นต่ำ', 'Minimum withdrawal amount', 'ยอดถอนเงินขั้นต่ำ (บาท)', true, 24),
('payment', 'max_withdrawal_amount', '50000', 'number', 'Max Withdrawal Amount', 'ยอดถอนสูงสุด', 'Maximum withdrawal amount per transaction', 'ยอดถอนเงินสูงสุดต่อครั้ง (บาท)', true, 25),
('payment', 'withdrawal_fee', '10', 'number', 'Withdrawal Fee', 'ค่าธรรมเนียมถอน', 'Fee for withdrawal transactions', 'ค่าธรรมเนียมการถอนเงิน (บาท)', true, 26),
('payment', 'topup_expiry_hours', '24', 'number', 'Top-up Expiry Hours', 'เวลาหมดอายุคำขอเติมเงิน', 'Hours before top-up request expires', 'จำนวนชั่วโมงก่อนคำขอเติมเงินหมดอายุ', false, 27),

-- Provider Settings
('provider', 'approval_required', 'true', 'boolean', 'Approval Required', 'ต้องอนุมัติ', 'Require admin approval for new providers', 'ต้องการการอนุมัติจากแอดมินสำหรับผู้ให้บริการใหม่', false, 30),
('provider', 'min_age', '20', 'number', 'Minimum Age', 'อายุขั้นต่ำ', 'Minimum age for providers', 'อายุขั้นต่ำสำหรับผู้ให้บริการ', false, 31),
('provider', 'max_active_jobs', '3', 'number', 'Max Active Jobs', 'งานพร้อมกันสูงสุด', 'Maximum concurrent active jobs', 'จำนวนงานที่ทำพร้อมกันได้สูงสุด', false, 32),
('provider', 'auto_offline_minutes', '30', 'number', 'Auto Offline Minutes', 'ออฟไลน์อัตโนมัติ', 'Minutes of inactivity before auto-offline', 'นาทีที่ไม่มีกิจกรรมก่อนออฟไลน์อัตโนมัติ', false, 33),
('provider', 'daily_earnings_limit', '5000', 'number', 'Daily Earnings Limit', 'รายได้สูงสุดต่อวัน', 'Maximum daily earnings (0 = unlimited)', 'รายได้สูงสุดต่อวัน (0 = ไม่จำกัด)', false, 34),

-- Notification Settings
('notification', 'push_enabled', 'true', 'boolean', 'Push Notifications', 'การแจ้งเตือนแบบพุช', 'Enable push notifications', 'เปิดใช้งานการแจ้งเตือนแบบพุช', false, 40),
('notification', 'sms_enabled', 'false', 'boolean', 'SMS Notifications', 'การแจ้งเตือน SMS', 'Enable SMS notifications', 'เปิดใช้งานการแจ้งเตือน SMS', false, 41),
('notification', 'email_enabled', 'true', 'boolean', 'Email Notifications', 'การแจ้งเตือนอีเมล', 'Enable email notifications', 'เปิดใช้งานการแจ้งเตือนอีเมล', false, 42),
('notification', 'new_ride_sound', 'true', 'boolean', 'New Ride Sound', 'เสียงแจ้งเตือนงานใหม่', 'Play sound for new ride requests', 'เล่นเสียงเมื่อมีงานใหม่', true, 43),

-- Security Settings
('security', 'max_login_attempts', '5', 'number', 'Max Login Attempts', 'จำนวนครั้งเข้าสู่ระบบสูงสุด', 'Maximum failed login attempts before lockout', 'จำนวนครั้งที่พยายามเข้าสู่ระบบล้มเหลวก่อนล็อค', false, 50),
('security', 'lockout_duration_minutes', '30', 'number', 'Lockout Duration', 'ระยะเวลาล็อค', 'Account lockout duration in minutes', 'ระยะเวลาล็อคบัญชี (นาที)', false, 51),
('security', 'session_timeout_hours', '24', 'number', 'Session Timeout', 'หมดเวลาเซสชัน', 'Session timeout in hours', 'เวลาหมดอายุเซสชัน (ชั่วโมง)', false, 52),
('security', 'require_phone_verification', 'true', 'boolean', 'Phone Verification', 'ยืนยันเบอร์โทร', 'Require phone number verification', 'ต้องยืนยันเบอร์โทรศัพท์', false, 53),
('security', 'require_email_verification', 'false', 'boolean', 'Email Verification', 'ยืนยันอีเมล', 'Require email verification', 'ต้องยืนยันอีเมล', false, 54),

-- Feature Flags
('features', 'scheduled_rides_enabled', 'true', 'boolean', 'Scheduled Rides', 'จองล่วงหน้า', 'Enable scheduled ride bookings', 'เปิดใช้งานการจองล่วงหน้า', true, 60),
('features', 'delivery_enabled', 'true', 'boolean', 'Delivery Service', 'บริการส่งของ', 'Enable delivery service', 'เปิดใช้งานบริการส่งของ', true, 61),
('features', 'shopping_enabled', 'true', 'boolean', 'Shopping Service', 'บริการช้อปปิ้ง', 'Enable shopping service', 'เปิดใช้งานบริการช้อปปิ้ง', true, 62),
('features', 'queue_booking_enabled', 'true', 'boolean', 'Queue Booking', 'จองคิว', 'Enable queue booking service', 'เปิดใช้งานบริการจองคิว', true, 63),
('features', 'moving_enabled', 'true', 'boolean', 'Moving Service', 'บริการขนย้าย', 'Enable moving service', 'เปิดใช้งานบริการขนย้าย', true, 64),
('features', 'laundry_enabled', 'false', 'boolean', 'Laundry Service', 'บริการซักรีด', 'Enable laundry service', 'เปิดใช้งานบริการซักรีด', true, 65),
('features', 'referral_program_enabled', 'true', 'boolean', 'Referral Program', 'โปรแกรมแนะนำเพื่อน', 'Enable referral program', 'เปิดใช้งานโปรแกรมแนะนำเพื่อน', true, 66),
('features', 'loyalty_points_enabled', 'true', 'boolean', 'Loyalty Points', 'คะแนนสะสม', 'Enable loyalty points system', 'เปิดใช้งานระบบคะแนนสะสม', true, 67),

-- Map Settings
('map', 'default_zoom', '13', 'number', 'Default Zoom Level', 'ระดับซูมเริ่มต้น', 'Default map zoom level', 'ระดับซูมแผนที่เริ่มต้น', true, 70),
('map', 'max_search_radius_km', '50', 'number', 'Max Search Radius', 'รัศมีค้นหาสูงสุด', 'Maximum provider search radius in km', 'รัศมีการค้นหาผู้ให้บริการสูงสุด (กม.)', false, 71),
('map', 'location_update_interval_seconds', '10', 'number', 'Location Update Interval', 'ช่วงอัพเดทตำแหน่ง', 'Provider location update interval', 'ช่วงเวลาอัพเดทตำแหน่งผู้ให้บริการ (วินาที)', false, 72),

-- Analytics Settings
('analytics', 'tracking_enabled', 'true', 'boolean', 'Analytics Tracking', 'ติดตามการใช้งาน', 'Enable analytics tracking', 'เปิดใช้งานการติดตามการใช้งาน', false, 80),
('analytics', 'crash_reporting_enabled', 'true', 'boolean', 'Crash Reporting', 'รายงานข้อผิดพลาด', 'Enable crash reporting', 'เปิดใช้งานการรายงานข้อผิดพลาด', false, 81),
('analytics', 'performance_monitoring', 'true', 'boolean', 'Performance Monitoring', 'ติดตามประสิทธิภาพ', 'Enable performance monitoring', 'เปิดใช้งานการติดตามประสิทธิภาพ', false, 82)

ON CONFLICT (category, setting_key) DO NOTHING;

-- =====================================================
-- 3. SETTINGS AUDIT LOG
-- =====================================================

CREATE TABLE IF NOT EXISTS settings_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_id UUID REFERENCES system_settings(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  setting_key TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

-- Enable RLS
ALTER TABLE settings_audit_log ENABLE ROW LEVEL SECURITY;

-- Admin can view audit logs
CREATE POLICY "admin_view_audit_log" ON settings_audit_log
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- =====================================================
-- 4. FUNCTIONS
-- =====================================================

-- Function to get settings by category
CREATE OR REPLACE FUNCTION get_settings_by_category(p_category TEXT)
RETURNS TABLE (
  id UUID,
  category TEXT,
  setting_key TEXT,
  setting_value TEXT,
  data_type TEXT,
  display_name TEXT,
  display_name_th TEXT,
  description TEXT,
  description_th TEXT,
  is_public BOOLEAN,
  is_editable BOOLEAN,
  validation_rules JSONB,
  display_order INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  RETURN QUERY
  SELECT 
    s.id,
    s.category,
    s.setting_key,
    s.setting_value,
    s.data_type,
    s.display_name,
    s.display_name_th,
    s.description,
    s.description_th,
    s.is_public,
    s.is_editable,
    s.validation_rules,
    s.display_order
  FROM system_settings s
  WHERE s.category = p_category
  ORDER BY s.display_order, s.setting_key;
END;
$$;

-- Function to update setting with audit log
CREATE OR REPLACE FUNCTION update_setting(
  p_setting_key TEXT,
  p_new_value TEXT,
  p_category TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_setting_id UUID;
  v_old_value TEXT;
  v_category TEXT;
  v_admin_id UUID;
BEGIN
  -- Get admin user
  SELECT auth.uid() INTO v_admin_id;
  
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = v_admin_id 
    AND profiles.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  -- Get current setting
  SELECT id, setting_value, category 
  INTO v_setting_id, v_old_value, v_category
  FROM system_settings
  WHERE setting_key = p_setting_key
    AND (p_category IS NULL OR category = p_category)
    AND is_editable = true
  LIMIT 1;

  IF v_setting_id IS NULL THEN
    RAISE EXCEPTION 'Setting not found or not editable: %', p_setting_key;
  END IF;

  -- Update setting
  UPDATE system_settings
  SET 
    setting_value = p_new_value,
    updated_at = NOW(),
    updated_by = v_admin_id
  WHERE id = v_setting_id;

  -- Log the change
  INSERT INTO settings_audit_log (
    setting_id,
    category,
    setting_key,
    old_value,
    new_value,
    changed_by
  ) VALUES (
    v_setting_id,
    v_category,
    p_setting_key,
    v_old_value,
    p_new_value,
    v_admin_id
  );

  RETURN TRUE;
END;
$$;

-- Function to get all categories
CREATE OR REPLACE FUNCTION get_settings_categories()
RETURNS TABLE (
  category TEXT,
  setting_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  RETURN QUERY
  SELECT 
    s.category,
    COUNT(*) as setting_count
  FROM system_settings s
  GROUP BY s.category
  ORDER BY s.category;
END;
$$;

-- =====================================================
-- 5. INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(category);
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_system_settings_public ON system_settings(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_settings_audit_log_setting ON settings_audit_log(setting_id);
CREATE INDEX IF NOT EXISTS idx_settings_audit_log_changed_at ON settings_audit_log(changed_at DESC);

-- =====================================================
-- 6. GRANT PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION get_settings_by_category(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_setting(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_settings_categories() TO authenticated;

-- =====================================================
-- 7. COMMENTS
-- =====================================================

COMMENT ON TABLE system_settings IS 'Comprehensive system settings for admin configuration';
COMMENT ON TABLE settings_audit_log IS 'Audit trail for all settings changes';
COMMENT ON FUNCTION get_settings_by_category IS 'Get all settings for a specific category - Admin only';
COMMENT ON FUNCTION update_setting IS 'Update a setting value with audit logging - Admin only';
COMMENT ON FUNCTION get_settings_categories IS 'Get list of all setting categories with counts - Admin only';

COMMIT;
