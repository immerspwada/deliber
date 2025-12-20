-- =====================================================
-- Migration: 122_dual_role_user_provider_system.sql
-- Description: Robust Dual-Role System (Customer + Provider)
-- 
-- หลักการสำคัญ:
-- 1. 1 User ID สามารถเป็นทั้งลูกค้าและไรเดอร์
-- 2. users.id = service_providers.user_id (FK relationship)
-- 3. ทุกคนเริ่มต้นเป็นลูกค้า (users table)
-- 4. เมื่อสมัครเป็น Provider จะสร้าง record ใน service_providers
-- 5. Provider status แยกจาก User status
-- =====================================================

-- =====================================================
-- PART 1: เพิ่ม Provider UID สำหรับติดตาม Provider
-- =====================================================

-- เพิ่ม provider_uid column (ถ้ายังไม่มี)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'service_providers' AND column_name = 'provider_uid'
  ) THEN
    ALTER TABLE service_providers ADD COLUMN provider_uid VARCHAR(20) UNIQUE;
  END IF;
END $$;

-- Function: สร้าง Provider UID อัตโนมัติ
-- Format: PRV-XXXXXXXX (PRV = Provider, X = ตัวอักษร/ตัวเลขสุ่ม 8 ตัว)
CREATE OR REPLACE FUNCTION generate_provider_uid()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  new_uid TEXT;
  uid_exists BOOLEAN;
BEGIN
  LOOP
    -- สร้าง UID ใหม่
    new_uid := 'PRV-' || upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
    
    -- ตรวจสอบว่าซ้ำหรือไม่
    SELECT EXISTS(SELECT 1 FROM service_providers WHERE provider_uid = new_uid) INTO uid_exists;
    
    -- ถ้าไม่ซ้ำ ออกจาก loop
    EXIT WHEN NOT uid_exists;
  END LOOP;
  
  RETURN new_uid;
END;
$$;

-- Trigger: Auto-generate provider_uid on INSERT
CREATE OR REPLACE FUNCTION trigger_set_provider_uid()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.provider_uid IS NULL THEN
    NEW.provider_uid := generate_provider_uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_provider_uid_trigger ON service_providers;
CREATE TRIGGER set_provider_uid_trigger
  BEFORE INSERT ON service_providers
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_provider_uid();

-- อัพเดท provider_uid สำหรับ records ที่มีอยู่แล้ว
UPDATE service_providers 
SET provider_uid = generate_provider_uid() 
WHERE provider_uid IS NULL;

-- =====================================================
-- PART 2: เพิ่ม columns สำหรับติดตามสถานะการสมัคร
-- =====================================================

-- เพิ่ม application tracking columns
DO $$
BEGIN
  -- วันที่สมัคร
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'service_providers' AND column_name = 'applied_at'
  ) THEN
    ALTER TABLE service_providers ADD COLUMN applied_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
  
  -- วันที่ตรวจสอบล่าสุด
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'service_providers' AND column_name = 'reviewed_at'
  ) THEN
    ALTER TABLE service_providers ADD COLUMN reviewed_at TIMESTAMPTZ;
  END IF;
  
  -- Admin ที่ตรวจสอบ
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'service_providers' AND column_name = 'reviewed_by'
  ) THEN
    ALTER TABLE service_providers ADD COLUMN reviewed_by UUID;
  END IF;
  
  -- หมายเหตุจาก Admin
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'service_providers' AND column_name = 'admin_notes'
  ) THEN
    ALTER TABLE service_providers ADD COLUMN admin_notes TEXT;
  END IF;
  
  -- จำนวนครั้งที่สมัคร (กรณี rejected แล้วสมัครใหม่)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'service_providers' AND column_name = 'application_count'
  ) THEN
    ALTER TABLE service_providers ADD COLUMN application_count INTEGER DEFAULT 1;
  END IF;
  
  -- วันที่ระงับ (ถ้าถูก suspend)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'service_providers' AND column_name = 'suspended_at'
  ) THEN
    ALTER TABLE service_providers ADD COLUMN suspended_at TIMESTAMPTZ;
  END IF;
  
  -- เหตุผลที่ระงับ
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'service_providers' AND column_name = 'suspension_reason'
  ) THEN
    ALTER TABLE service_providers ADD COLUMN suspension_reason TEXT;
  END IF;
END $$;

-- =====================================================
-- PART 3: สร้างตาราง Provider Application History
-- =====================================================

CREATE TABLE IF NOT EXISTS provider_application_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  
  -- Application details
  application_number INTEGER NOT NULL DEFAULT 1,
  previous_status VARCHAR(20),
  new_status VARCHAR(20) NOT NULL,
  
  -- Review info
  reviewed_by UUID,
  review_notes TEXT,
  rejection_reason TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_provider_app_history_provider ON provider_application_history(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_app_history_user ON provider_application_history(user_id);

-- =====================================================
-- PART 4: Function ตรวจสอบ User Role
-- =====================================================

-- Function: ตรวจสอบว่า User มี Role อะไรบ้าง
CREATE OR REPLACE FUNCTION get_user_roles(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_exists BOOLEAN;
  v_provider_record RECORD;
  v_roles JSON;
BEGIN
  -- ตรวจสอบว่า user มีอยู่จริง
  SELECT EXISTS(SELECT 1 FROM users WHERE id = p_user_id) INTO v_user_exists;
  
  IF NOT v_user_exists THEN
    RETURN json_build_object(
      'user_id', p_user_id,
      'exists', false,
      'is_customer', false,
      'is_provider', false,
      'provider_status', null,
      'provider_uid', null
    );
  END IF;
  
  -- ตรวจสอบ provider status
  SELECT 
    id,
    provider_uid,
    provider_type,
    status,
    is_verified,
    is_available
  INTO v_provider_record
  FROM service_providers 
  WHERE user_id = p_user_id
  LIMIT 1;
  
  -- สร้าง response
  RETURN json_build_object(
    'user_id', p_user_id,
    'exists', true,
    'is_customer', true,  -- ทุกคนเป็นลูกค้าได้
    'is_provider', v_provider_record.id IS NOT NULL,
    'provider_id', v_provider_record.id,
    'provider_uid', v_provider_record.provider_uid,
    'provider_type', v_provider_record.provider_type,
    'provider_status', v_provider_record.status,
    'is_verified', COALESCE(v_provider_record.is_verified, false),
    'is_available', COALESCE(v_provider_record.is_available, false),
    'can_access_provider_dashboard', 
      v_provider_record.status IN ('approved', 'active') OR v_provider_record.is_verified = true
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_user_roles(UUID) TO authenticated;

-- =====================================================
-- PART 5: Function สมัครเป็น Provider
-- =====================================================

CREATE OR REPLACE FUNCTION apply_as_provider(
  p_user_id UUID,
  p_provider_type VARCHAR(20) DEFAULT 'rider',
  p_vehicle_type VARCHAR(50) DEFAULT NULL,
  p_vehicle_plate VARCHAR(20) DEFAULT NULL,
  p_license_number VARCHAR(50) DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing_provider RECORD;
  v_new_provider_id UUID;
  v_provider_uid TEXT;
BEGIN
  -- ตรวจสอบว่ามี provider record อยู่แล้วหรือไม่
  SELECT * INTO v_existing_provider
  FROM service_providers
  WHERE user_id = p_user_id;
  
  IF v_existing_provider.id IS NOT NULL THEN
    -- มี record อยู่แล้ว
    IF v_existing_provider.status = 'approved' OR v_existing_provider.status = 'active' THEN
      RETURN json_build_object(
        'success', false,
        'error', 'already_approved',
        'message', 'คุณได้รับการอนุมัติเป็นผู้ให้บริการแล้ว',
        'provider_uid', v_existing_provider.provider_uid
      );
    ELSIF v_existing_provider.status = 'pending' THEN
      RETURN json_build_object(
        'success', false,
        'error', 'already_pending',
        'message', 'ใบสมัครของคุณอยู่ระหว่างการตรวจสอบ',
        'provider_uid', v_existing_provider.provider_uid
      );
    ELSIF v_existing_provider.status = 'rejected' THEN
      -- อนุญาตให้สมัครใหม่
      UPDATE service_providers
      SET 
        status = 'pending',
        provider_type = p_provider_type,
        vehicle_type = COALESCE(p_vehicle_type, vehicle_type),
        vehicle_plate = COALESCE(p_vehicle_plate, vehicle_plate),
        license_number = COALESCE(p_license_number, license_number),
        rejection_reason = NULL,
        application_count = application_count + 1,
        applied_at = NOW(),
        updated_at = NOW()
      WHERE id = v_existing_provider.id
      RETURNING provider_uid INTO v_provider_uid;
      
      -- บันทึกประวัติ
      INSERT INTO provider_application_history (
        provider_id, user_id, application_number, 
        previous_status, new_status
      ) VALUES (
        v_existing_provider.id, p_user_id, v_existing_provider.application_count + 1,
        'rejected', 'pending'
      );
      
      RETURN json_build_object(
        'success', true,
        'message', 'สมัครใหม่สำเร็จ รอการตรวจสอบ',
        'provider_id', v_existing_provider.id,
        'provider_uid', v_provider_uid,
        'is_reapplication', true
      );
    END IF;
  END IF;
  
  -- สร้าง provider record ใหม่
  INSERT INTO service_providers (
    user_id,
    provider_type,
    vehicle_type,
    vehicle_plate,
    license_number,
    status,
    applied_at
  ) VALUES (
    p_user_id,
    p_provider_type,
    p_vehicle_type,
    p_vehicle_plate,
    p_license_number,
    'pending',
    NOW()
  )
  RETURNING id, provider_uid INTO v_new_provider_id, v_provider_uid;
  
  -- บันทึกประวัติ
  INSERT INTO provider_application_history (
    provider_id, user_id, application_number, 
    previous_status, new_status
  ) VALUES (
    v_new_provider_id, p_user_id, 1,
    NULL, 'pending'
  );
  
  RETURN json_build_object(
    'success', true,
    'message', 'สมัครสำเร็จ รอการตรวจสอบ',
    'provider_id', v_new_provider_id,
    'provider_uid', v_provider_uid,
    'is_reapplication', false
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION apply_as_provider(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR) TO authenticated;

-- =====================================================
-- PART 6: Function อนุมัติ/ปฏิเสธ Provider (Admin)
-- =====================================================

CREATE OR REPLACE FUNCTION admin_review_provider(
  p_provider_id UUID,
  p_action VARCHAR(20),  -- 'approve', 'reject', 'suspend', 'unsuspend'
  p_admin_id UUID,
  p_reason TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_provider RECORD;
  v_new_status VARCHAR(20);
  v_user_id UUID;
BEGIN
  -- ดึงข้อมูล provider
  SELECT * INTO v_provider
  FROM service_providers
  WHERE id = p_provider_id;
  
  IF v_provider.id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'not_found',
      'message', 'ไม่พบข้อมูลผู้ให้บริการ'
    );
  END IF;
  
  v_user_id := v_provider.user_id;
  
  -- กำหนด status ใหม่ตาม action
  CASE p_action
    WHEN 'approve' THEN
      v_new_status := 'approved';
    WHEN 'reject' THEN
      v_new_status := 'rejected';
    WHEN 'suspend' THEN
      v_new_status := 'suspended';
    WHEN 'unsuspend' THEN
      v_new_status := 'approved';
    ELSE
      RETURN json_build_object(
        'success', false,
        'error', 'invalid_action',
        'message', 'Action ไม่ถูกต้อง'
      );
  END CASE;
  
  -- อัพเดท provider
  UPDATE service_providers
  SET 
    status = v_new_status,
    is_verified = (v_new_status = 'approved'),
    reviewed_at = NOW(),
    reviewed_by = p_admin_id,
    admin_notes = COALESCE(p_notes, admin_notes),
    rejection_reason = CASE WHEN p_action = 'reject' THEN p_reason ELSE rejection_reason END,
    approved_at = CASE WHEN p_action = 'approve' THEN NOW() ELSE approved_at END,
    approved_by = CASE WHEN p_action = 'approve' THEN p_admin_id ELSE approved_by END,
    suspended_at = CASE WHEN p_action = 'suspend' THEN NOW() ELSE NULL END,
    suspension_reason = CASE WHEN p_action = 'suspend' THEN p_reason ELSE NULL END,
    updated_at = NOW()
  WHERE id = p_provider_id;
  
  -- บันทึกประวัติ
  INSERT INTO provider_application_history (
    provider_id, user_id, application_number,
    previous_status, new_status, reviewed_by, 
    review_notes, rejection_reason
  ) VALUES (
    p_provider_id, v_user_id, v_provider.application_count,
    v_provider.status, v_new_status, p_admin_id,
    p_notes, CASE WHEN p_action = 'reject' THEN p_reason ELSE NULL END
  );
  
  RETURN json_build_object(
    'success', true,
    'message', 'อัพเดทสถานะสำเร็จ',
    'provider_id', p_provider_id,
    'provider_uid', v_provider.provider_uid,
    'previous_status', v_provider.status,
    'new_status', v_new_status,
    'user_id', v_user_id
  );
END;
$$;

-- Grant to admin only (via RLS)
GRANT EXECUTE ON FUNCTION admin_review_provider(UUID, VARCHAR, UUID, TEXT, TEXT) TO authenticated;

-- =====================================================
-- PART 7: View สำหรับ Admin ดูข้อมูล Dual-Role
-- =====================================================

CREATE OR REPLACE VIEW admin_user_provider_view AS
SELECT 
  u.id AS user_id,
  u.member_uid,
  u.first_name,
  u.last_name,
  u.phone_number,
  u.email,
  u.created_at AS user_created_at,
  
  -- Provider info (ถ้ามี)
  sp.id AS provider_id,
  sp.provider_uid,
  sp.provider_type,
  sp.status AS provider_status,
  sp.is_verified,
  sp.is_available,
  sp.rating AS provider_rating,
  sp.total_trips,
  sp.applied_at,
  sp.approved_at,
  sp.rejection_reason,
  sp.application_count,
  
  -- Role flags
  TRUE AS is_customer,
  sp.id IS NOT NULL AS is_provider,
  sp.status IN ('approved', 'active') AS is_active_provider
  
FROM users u
LEFT JOIN service_providers sp ON u.id = sp.user_id;

-- =====================================================
-- PART 8: Comments และ Documentation
-- =====================================================

COMMENT ON TABLE service_providers IS 
'ตาราง Provider - เชื่อมกับ users ผ่าน user_id
- 1 user สามารถมี 1 provider record
- ทุกคนเริ่มต้นเป็นลูกค้า (users table)
- เมื่อสมัครเป็น Provider จะสร้าง record ที่นี่
- status: pending → approved/rejected → suspended (ถ้าถูกระงับ)';

COMMENT ON COLUMN service_providers.provider_uid IS 'รหัสผู้ให้บริการ Format: PRV-XXXXXXXX';
COMMENT ON COLUMN service_providers.user_id IS 'FK ไปยัง users.id - ใช้เชื่อมโยง Customer กับ Provider';
COMMENT ON COLUMN service_providers.status IS 'สถานะ: pending, approved, rejected, suspended, active';
COMMENT ON COLUMN service_providers.application_count IS 'จำนวนครั้งที่สมัคร (กรณี rejected แล้วสมัครใหม่)';

COMMENT ON FUNCTION get_user_roles(UUID) IS 'ตรวจสอบว่า User มี Role อะไรบ้าง (Customer/Provider)';
COMMENT ON FUNCTION apply_as_provider IS 'สมัครเป็น Provider - สร้าง record ใน service_providers';
COMMENT ON FUNCTION admin_review_provider IS 'Admin อนุมัติ/ปฏิเสธ/ระงับ Provider';
COMMENT ON FUNCTION can_access_provider_routes IS 'ตรวจสอบสิทธิ์เข้าถึง Provider routes';
