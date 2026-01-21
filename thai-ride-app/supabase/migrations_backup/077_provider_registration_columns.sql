-- Migration: 077_provider_registration_columns.sql
-- Feature: F14 - Provider Registration Complete Flow
-- Description: Add missing columns for provider registration form
-- Required by: ProviderRegisterView.vue

-- =====================================================
-- ADD MISSING COLUMNS TO service_providers TABLE
-- =====================================================

-- 1. vehicle_info - Store vehicle details as JSON
ALTER TABLE service_providers 
ADD COLUMN IF NOT EXISTS vehicle_info jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN service_providers.vehicle_info IS 'Vehicle details: brand, model, year, license_plate, color';

-- 2. license_expiry - Driver license expiry date
ALTER TABLE service_providers 
ADD COLUMN IF NOT EXISTS license_expiry date;

COMMENT ON COLUMN service_providers.license_expiry IS 'Driver license expiry date';

-- 3. national_id - Thai National ID (13 digits)
ALTER TABLE service_providers 
ADD COLUMN IF NOT EXISTS national_id varchar(13);

COMMENT ON COLUMN service_providers.national_id IS 'Thai National ID (13 digits)';

-- 4. documents - Store document URLs as JSON
ALTER TABLE service_providers 
ADD COLUMN IF NOT EXISTS documents jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN service_providers.documents IS 'Document URLs: id_card, license, vehicle photos';

-- 5. status - Application status
ALTER TABLE service_providers 
ADD COLUMN IF NOT EXISTS status varchar(20) DEFAULT 'pending';

-- Add check constraint for status values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'service_providers_status_check'
  ) THEN
    ALTER TABLE service_providers 
    ADD CONSTRAINT service_providers_status_check 
    CHECK (status IN ('pending', 'approved', 'rejected', 'suspended'));
  END IF;
END $$;

COMMENT ON COLUMN service_providers.status IS 'Application status: pending, approved, rejected, suspended';

-- 6. rejection_reason - Reason for rejection
ALTER TABLE service_providers 
ADD COLUMN IF NOT EXISTS rejection_reason text;

COMMENT ON COLUMN service_providers.rejection_reason IS 'Reason for rejection if status is rejected';

-- 7. approved_at - Timestamp when approved
ALTER TABLE service_providers 
ADD COLUMN IF NOT EXISTS approved_at timestamptz;

COMMENT ON COLUMN service_providers.approved_at IS 'Timestamp when provider was approved';

-- 8. approved_by - Admin who approved
ALTER TABLE service_providers 
ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES users(id);

COMMENT ON COLUMN service_providers.approved_by IS 'Admin user who approved the provider';

-- =====================================================
-- UPDATE EXISTING PROVIDERS
-- =====================================================

-- Set status based on is_verified for existing providers
UPDATE service_providers 
SET status = CASE 
  WHEN is_verified = true THEN 'approved'
  ELSE 'pending'
END
WHERE status IS NULL OR status = 'pending';

-- =====================================================
-- CREATE INDEX FOR FASTER QUERIES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_service_providers_status 
ON service_providers(status);

CREATE INDEX IF NOT EXISTS idx_service_providers_national_id 
ON service_providers(national_id);

-- =====================================================
-- UPDATE RLS POLICIES
-- =====================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Providers can view own data" ON service_providers;
DROP POLICY IF EXISTS "Providers can update own data" ON service_providers;
DROP POLICY IF EXISTS "Authenticated users can insert provider" ON service_providers;
DROP POLICY IF EXISTS "Admin can view all providers" ON service_providers;
DROP POLICY IF EXISTS "Admin can update all providers" ON service_providers;

-- Allow authenticated users to insert their own provider record
CREATE POLICY "Authenticated users can insert provider"
ON service_providers FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow providers to view their own data
CREATE POLICY "Providers can view own data"
ON service_providers FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id 
  OR EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);

-- Allow providers to update their own data (limited fields)
CREATE POLICY "Providers can update own data"
ON service_providers FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow admin to view all providers
CREATE POLICY "Admin can view all providers"
ON service_providers FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);

-- Allow admin to update all providers
CREATE POLICY "Admin can update all providers"
ON service_providers FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);

-- =====================================================
-- FUNCTION: Auto-set status when is_verified changes
-- =====================================================

CREATE OR REPLACE FUNCTION sync_provider_status()
RETURNS TRIGGER AS $$
BEGIN
  -- When is_verified changes, update status accordingly
  IF NEW.is_verified = true AND OLD.is_verified = false THEN
    NEW.status := 'approved';
    NEW.approved_at := NOW();
  ELSIF NEW.is_verified = false AND OLD.is_verified = true THEN
    -- Don't change status if manually set to suspended
    IF NEW.status != 'suspended' THEN
      NEW.status := 'rejected';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_sync_provider_status ON service_providers;
CREATE TRIGGER trigger_sync_provider_status
BEFORE UPDATE ON service_providers
FOR EACH ROW
WHEN (OLD.is_verified IS DISTINCT FROM NEW.is_verified)
EXECUTE FUNCTION sync_provider_status();

-- =====================================================
-- FUNCTION: Notify admin on new provider registration
-- =====================================================

CREATE OR REPLACE FUNCTION notify_admin_new_provider()
RETURNS TRIGGER AS $$
DECLARE
  admin_user RECORD;
BEGIN
  -- Notify all admin users about new provider registration
  FOR admin_user IN 
    SELECT id FROM users WHERE role = 'admin' AND is_active = true
  LOOP
    INSERT INTO user_notifications (
      user_id,
      type,
      title,
      message,
      data,
      action_url
    ) VALUES (
      admin_user.id,
      'system',
      'ใบสมัครผู้ให้บริการใหม่',
      'มีผู้สมัครเป็นผู้ให้บริการใหม่ รอการตรวจสอบ',
      jsonb_build_object(
        'provider_id', NEW.id,
        'provider_type', NEW.provider_type,
        'vehicle_type', NEW.vehicle_type
      ),
      '/admin/providers'
    );
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new provider notification
DROP TRIGGER IF EXISTS trigger_notify_admin_new_provider ON service_providers;
CREATE TRIGGER trigger_notify_admin_new_provider
AFTER INSERT ON service_providers
FOR EACH ROW
EXECUTE FUNCTION notify_admin_new_provider();

-- =====================================================
-- FUNCTION: Notify provider on status change
-- =====================================================

CREATE OR REPLACE FUNCTION notify_provider_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only notify if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO user_notifications (
      user_id,
      type,
      title,
      message,
      data,
      action_url
    ) VALUES (
      NEW.user_id,
      'system',
      CASE NEW.status
        WHEN 'approved' THEN 'ยินดีด้วย! ใบสมัครได้รับการอนุมัติ'
        WHEN 'rejected' THEN 'ใบสมัครถูกปฏิเสธ'
        WHEN 'suspended' THEN 'บัญชีถูกระงับชั่วคราว'
        ELSE 'สถานะใบสมัครเปลี่ยนแปลง'
      END,
      CASE NEW.status
        WHEN 'approved' THEN 'คุณสามารถเริ่มรับงานได้แล้ว!'
        WHEN 'rejected' THEN COALESCE(NEW.rejection_reason, 'กรุณาติดต่อทีมงานเพื่อขอข้อมูลเพิ่มเติม')
        WHEN 'suspended' THEN 'กรุณาติดต่อทีมงานเพื่อขอข้อมูลเพิ่มเติม'
        ELSE 'สถานะใบสมัครของคุณมีการเปลี่ยนแปลง'
      END,
      jsonb_build_object(
        'provider_id', NEW.id,
        'old_status', OLD.status,
        'new_status', NEW.status,
        'rejection_reason', NEW.rejection_reason
      ),
      '/provider/dashboard'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for provider status notification
DROP TRIGGER IF EXISTS trigger_notify_provider_status_change ON service_providers;
CREATE TRIGGER trigger_notify_provider_status_change
AFTER UPDATE ON service_providers
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION notify_provider_status_change();

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT SELECT, INSERT, UPDATE ON service_providers TO authenticated;
GRANT SELECT, INSERT ON user_notifications TO authenticated;
